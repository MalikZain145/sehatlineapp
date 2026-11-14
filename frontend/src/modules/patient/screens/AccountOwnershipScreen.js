// AccountOwnershipScreen — deactivate or permanently delete the account.
//
// The two are presented as clearly different weights. Deactivation is offered
// first and framed as reversible, because it is what most people mean when
// they reach for "delete". Deletion sits below a divider, in red, behind a
// typed confirmation.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import accountService from '../services/accountService';
import { useSession } from '../../../context/SessionContext';
import { useTheme } from "../../../context/ThemeContext";
const {
  width
} = Dimensions.get('window');
export default function AccountOwnershipScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const {
    logout
  } = useSession();
  const [loading, setLoading] = useMinLoading(true);
  const [counts, setCounts] = useState({});
  const [sheet, setSheet] = useState(null); // 'deactivate' | 'delete' | null
  const [prompt, setPrompt] = useState(null);
  const load = useCallback(async () => {
    try {
      const res = await accountService.summary();
      if (res?.counts) setCounts(res.counts);
    } catch (e) {/* the screen still works without the numbers */} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (loading) {
    return <View style={styles.container}><SkeletonList count={5} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />
      <ScreenHeader title="Account & Ownership" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* What's in the account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Records</Text>
          <Text style={styles.cardBody}>
            {total > 0 ? 'These are stored against your account and would be removed if you delete it.' : 'You have no records stored yet.'}
          </Text>

          {total > 0 && <View style={styles.stats}>
              <Stat label="Tokens" value={counts.tokens} icon="ticket-outline" />
              <Stat label="Appointments" value={counts.appointments} icon="calendar-outline" />
              <Stat label="Orders" value={counts.orders} icon="medkit-outline" />
              <Stat label="Notifications" value={counts.notifications} icon="notifications-outline" />
            </View>}
        </View>

        {/* Deactivate */}
        <View style={styles.card}>
          <View style={styles.rowHead}>
            <View style={[styles.iconDisc, {
            backgroundColor: '#FEF3E2'
          }]}>
              <Ionicons name="pause-circle-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.cardTitle}>Deactivate Account</Text>
          </View>

          <Text style={styles.cardBody}>
            Your account is hidden and you are signed out everywhere. Nothing is deleted —
            sign in again at any time to restore it exactly as it was.
          </Text>

          <TouchableOpacity style={styles.btnWarn} onPress={() => setSheet('deactivate')} activeOpacity={0.85}>
            <Text style={styles.btnWarnText}>Deactivate</Text>
          </TouchableOpacity>
        </View>

        {/* Delete */}
        <View style={[styles.card, styles.cardDanger]}>
          <View style={styles.rowHead}>
            <View style={[styles.iconDisc, {
            backgroundColor: '#FDECEC'
          }]}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </View>
            <Text style={[styles.cardTitle, {
            color: COLORS.danger
          }]}>Delete Account</Text>
          </View>

          <Text style={styles.cardBody}>
            Permanently erases your account and every record above. This cannot be undone.
          </Text>

          <View style={styles.warnBox}>
            <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
            <Text style={styles.warnText}>
              Your CNIC and CDA card will be released, so you could register again — but
              your history will be gone.
            </Text>
          </View>

          <TouchableOpacity style={styles.btnDanger} onPress={() => setSheet('delete')} activeOpacity={0.85}>
            <Text style={styles.btnDangerText}>Delete Permanently</Text>
          </TouchableOpacity>
        </View>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>

      <ConfirmSheet mode={sheet} onClose={() => setSheet(null)} onDone={message => {
      setSheet(null);
      setPrompt({
        variant: 'success',
        title: sheet === 'delete' ? 'Account Deleted' : 'Account Deactivated',
        message,
        onPrimary: () => {
          setPrompt(null);
          logout('manual');
        }
      });
    }} />

      <ThemedPrompt visible={!!prompt} variant={prompt?.variant} title={prompt?.title} message={prompt?.message} primaryLabel="OK" onPrimary={prompt?.onPrimary || (() => setPrompt(null))} />
    </View>;
}
function Stat({
  label,
  value,
  icon
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>;
}

// One sheet, two modes — the only difference is the typed confirmation.
function ConfirmSheet({
  mode,
  onClose,
  onDone
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isDelete = mode === 'delete';
  const reset = () => {
    setPassword('');
    setConfirm('');
    setShow(false);
    setError('');
  };
  const close = () => {
    if (!busy) {
      reset();
      onClose();
    }
  };
  const submit = async () => {
    setError('');
    if (!password) return setError('Enter your password.');
    if (isDelete && confirm.trim().toUpperCase() !== 'DELETE') {
      return setError('Type DELETE to confirm.');
    }
    setBusy(true);
    try {
      const res = isDelete ? await accountService.remove(password, confirm) : await accountService.deactivate(password);
      setBusy(false);
      reset();
      onDone(res?.message || 'Done.');
    } catch (e) {
      setBusy(false);
      setError(e.message || 'Something went wrong. Please try again.');
    }
  };
  return <Modal visible={!!mode} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.iconDisc, styles.sheetIcon, {
          backgroundColor: isDelete ? '#FDECEC' : '#FEF3E2'
        }]}>
            <Ionicons name={isDelete ? 'trash' : 'pause-circle'} size={24} color={isDelete ? COLORS.danger : COLORS.warning} />
          </View>

          <Text style={styles.sheetTitle}>
            {isDelete ? 'Delete Account' : 'Deactivate Account'}
          </Text>
          <Text style={styles.sheetBody}>
            {isDelete ? 'This permanently erases your account and every record attached to it.' : 'You can restore your account by signing in again.'}
          </Text>

          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={17} color={COLORS.textLight} />
            <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#9CA3AF" secureTextEntry={!show} autoCapitalize="none" value={password} onChangeText={v => {
            setPassword(v);
            setError('');
          }} />
            <TouchableOpacity onPress={() => setShow(!show)} hitSlop={HIT}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {isDelete && <View style={styles.field}>
              <Ionicons name="create-outline" size={17} color={COLORS.textLight} />
              <TextInput style={styles.input} placeholder="Type DELETE to confirm" placeholderTextColor="#9CA3AF" autoCapitalize="characters" value={confirm} onChangeText={v => {
            setConfirm(v);
            setError('');
          }} />
            </View>}

          {!!error && <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnGhost} onPress={close} disabled={busy} activeOpacity={0.7}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirm, {
            backgroundColor: isDelete ? COLORS.danger : COLORS.warning
          }, busy && {
            opacity: 0.65
          }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnConfirmText}>{isDelete ? 'Delete' : 'Deactivate'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>;
}
const HIT = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card
  },
  scroll: {
    padding: 16
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16
  },
  cardDanger: {
    borderColor: '#FECACA'
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 10
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.text
  },
  cardBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 2
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16
  },
  stat: {
    flexGrow: 1,
    minWidth: (width - 32 - 36 - 10) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 11,
    padding: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 5
  },
  statLabel: {
    fontSize: 10.5,
    color: COLORS.textLight,
    marginTop: 1
  },
  warnBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    padding: 11,
    marginTop: 13
  },
  warnText: {
    flex: 1,
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 17
  },
  btnWarn: {
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16
  },
  btnWarnText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13.5
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16
  },
  btnDangerText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13.5
  },
  // ---- Sheet ----
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  sheet: {
    width: Math.min(width - 48, 350),
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8
        },
        shadowOpacity: 0.15,
        shadowRadius: 20
      },
      android: {
        elevation: 10
      }
    })
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: 'center',
    marginBottom: 14
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center'
  },
  sheetBody: {
    fontSize: 12.5,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 18
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    marginBottom: 11
  },
  input: {
    flex: 1,
    paddingVertical: 12.5,
    fontSize: 14,
    color: COLORS.text
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 3
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnGhostText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13.5
  },
  btnConfirm: {
    flex: 1.2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnConfirmText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13.5
  }
});