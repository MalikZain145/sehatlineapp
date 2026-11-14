// ChangePasswordSheet — change the password from inside the app.
//
// The current password is required, not because we can't rotate without it,
// but because an unlocked phone shouldn't be enough to lock the real owner
// out of their account.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import settingsService from '../../modules/patient/services/settingsService';
import PasswordStrength, { scorePassword } from './PasswordStrength';
import { useTheme } from "../../context/ThemeContext";
const {
  width
} = Dimensions.get('window');
export default function ChangePasswordSheet({
  visible,
  onClose,
  onDone
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reset = () => {
    setCurrent('');
    setNext('');
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
    if (!current) return setError('Enter your current password.');
    if (scorePassword(next) < 2) return setError('Choose a stronger new password.');
    if (next !== confirm) return setError('The new passwords do not match.');
    if (next === current) return setError('Your new password must be different.');
    setBusy(true);
    try {
      await settingsService.changePassword(current, next);
      setBusy(false);
      reset();
      onDone();
    } catch (e) {
      setBusy(false);
      setError(e.message || 'Could not update your password.');
    }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconDisc}>
            <Ionicons name="key" size={24} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Your other devices will be signed out.</Text>

          <Field icon="lock-closed-outline" placeholder="Current password" value={current} onChangeText={v => {
          setCurrent(v);
          setError('');
        }} secure={!show} />

          <Field icon="key-outline" placeholder="New password" value={next} onChangeText={v => {
          setNext(v);
          setError('');
        }} secure={!show} trailing={<TouchableOpacity onPress={() => setShow(!show)} hitSlop={HIT}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORS.textLight} />
              </TouchableOpacity>} />
          <PasswordStrength password={next} />

          <View style={{
          height: 12
        }} />

          <Field icon="checkmark-circle-outline" placeholder="Confirm new password" value={confirm} onChangeText={v => {
          setConfirm(v);
          setError('');
        }} secure={!show} />

          {confirm.length > 0 && next === confirm && <View style={styles.matchRow}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
              <Text style={styles.matchText}>Passwords match</Text>
            </View>}

          {!!error && <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnGhost} onPress={close} disabled={busy} activeOpacity={0.7}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, busy && styles.btnDisabled]} onPress={submit} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Update</Text>}
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
function Field({
  icon,
  trailing,
  secure,
  ...props
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.field}>
      <Ionicons name={icon} size={17} color={COLORS.textLight} />
      <TextInput style={styles.input} placeholderTextColor="#9CA3AF" secureTextEntry={secure} autoCapitalize="none" {...props} />
      {trailing}
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: Math.min(width - 48, 360),
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
  iconDisc: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignSelf: 'center',
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20
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
    marginBottom: 12
  },
  input: {
    flex: 1,
    paddingVertical: 12.5,
    fontSize: 14,
    color: COLORS.text
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    marginLeft: 3
  },
  matchText: {
    fontSize: 11.5,
    color: COLORS.success,
    fontWeight: '600'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10
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
    marginTop: 18
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnGhostText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13.5
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13.5
  },
  btnDisabled: {
    opacity: 0.65
  }
});