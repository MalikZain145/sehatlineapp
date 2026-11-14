// TokenJourneyScreen
// The patient's live token journey, connected to the real backend + sockets.
//
// Flow (matches the hospital process):
//   Chronic OPD (Waiting → Now Serving)
//     → doctor calls next → this patient moves to Pharmacy
//   Pharmacy
//     → pharmacist calls next → app asks "Take a Lab Token?"
//        • Get Lab Token → Laboratory
//        • Mark Complete → "Thank You for choosing CDA Hospital" → Home
//
// While the journey is active the BACK button is LOCKED.
// When the patient becomes "Now Serving", a notification fires:
//   "Token A-001 — Now Serving".

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler, Alert, Dimensions, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import { useFocusEffect } from '@react-navigation/native';
import tokenService from '../services/tokenService';
import { onQueueUpdate, connectSocket } from '../../../services/socket';
import { setupNotifications, notify } from '../../../services/notifications';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import { showConfirm } from '../../../components/confirm';
import { useTheme } from "../../../context/ThemeContext";
import { topPad } from '../../../utils/safeArea';
const {
  width
} = Dimensions.get('window');

// Stage metadata for display.
const STAGE_INFO = {
  'in-queue': {
    label: 'Waiting',
    color: '#F59E0B',
    icon: 'hourglass-outline',
    dept: 'Chronic OPD'
  },
  'in-progress': {
    label: 'Now Serving',
    color: '#10B981',
    icon: 'walk-outline',
    dept: 'Chronic OPD'
  },
  'pharmacy': {
    label: 'At Pharmacy',
    color: '#8B5CF6',
    icon: 'medkit-outline',
    dept: 'Pharmacy'
  },
  'awaiting_lab_choice': {
    label: 'Pharmacy Done',
    color: '#8B5CF6',
    icon: 'help-circle-outline',
    dept: 'Pharmacy'
  },
  'laboratory': {
    label: 'At Laboratory',
    color: '#EF4444',
    icon: 'flask-outline',
    dept: 'Laboratory'
  }
};
export default function TokenJourneyScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [loading, setLoading] = useMinLoading(true);
  const [token, setToken] = useState(null);
  const [ahead, setAhead] = useState(0);
  const [estWait, setEstWait] = useState(0);
  const [nowServing, setNowServing] = useState(null);
  const [busy, setBusy] = useState(false);
  // Themed prompt states (replace plain Alerts)
  const [labPrompt, setLabPrompt] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const lastStatusRef = useRef(null);
  const hadTokenRef = useRef(false);
  const lastServingNotifiedRef = useRef(null);

  // ---- Load active token from backend ----
  const load = useCallback(async () => {
    try {
      const res = await tokenService.getActive();
      if (res?.token) {
        setToken(res.token);
        setAhead(res.ahead ?? 0);
        setEstWait(res.estimatedWaitMin ?? 0);
        setNowServing(res.nowServing || null);

        // Notifications on stage changes.
        const st = res.token.status;
        if (st !== lastStatusRef.current) {
          if (st === 'in-progress') notify('You are being served', `Token ${res.token.tokenNumber} — Now Serving`);else if (st === 'pharmacy') notify('Proceed to Pharmacy', `Token ${res.token.tokenNumber} — Collect your medicine`);else if (st === 'laboratory') notify('Proceed to Laboratory', `Token ${res.token.tokenNumber} — Tests prescribed`);
        }
        if (st === 'in-queue' && res.ahead === 1) {
          notify('You are next', `Token ${res.token.tokenNumber} — Please be ready`);
        }
        lastStatusRef.current = st;
        hadTokenRef.current = true;
      } else {
        // No active token. If we HAD one, the journey just completed → thank you.
        if (hadTokenRef.current && !thankYou) {
          hadTokenRef.current = false;
          setThankYou(true);
        }
        setToken(null);
      }
    } catch (e) {
      // keep whatever we had
    } finally {
      setLoading(false);
    }
  }, [thankYou]);
  useEffect(() => {
    setupNotifications();
    connectSocket();
    load();
    // Live updates: refetch my token whenever the queue changes.
    const unsub = onQueueUpdate(() => load());
    // Safety poll (socket already pushes updates, so this is just a fallback).
    const poll = setInterval(load, 20000);
    return () => {
      unsub && unsub();
      clearInterval(poll);
    };
  }, [load]);

  // ---- LOCK the back button while a journey is active ----
  useFocusEffect(useCallback(() => {
    const onBack = () => {
      if (token && token.status !== 'completed') {
        Alert.alert('Journey in progress', 'You cannot go back until your token journey is complete.', [{
          text: 'OK'
        }]);
        return true; // block back
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [token]));

  // Lab routing is now automatic (based on whether the doctor prescribed
  // tests), so no manual "Take Lab Token?" prompt is needed.

  // ---- Advance actions ----
  const confirmCancelLab = () => {
    showConfirm({
      title: 'Cancel Lab Token',
      message: 'Cancel your laboratory token? Your prescribed tests stay saved, so you can reschedule the lab visit whenever you are ready.',
      confirmLabel: 'Cancel Token',
      cancelLabel: 'Keep It',
      destructive: true,
      icon: 'flask-outline',
      onConfirm: () => advance('cancel_lab')
    });
  };
  const advance = async action => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await tokenService.advance(token._id, action);
      if (action === 'complete') {
        setThankYou(true); // themed thank-you, navigates on dismiss
        return;
      }
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // ---- Simulate staff calling next (doctor/pharmacist/lab) ----
  // These buttons stand in for the doctor/pharmacy/lab modules that don't
  // exist yet, so you can test the whole flow.
  const staffCallNext = async (department, prescribedTests = []) => {
    if (busy) return;
    setBusy(true);
    try {
      await tokenService.callNext(department, prescribedTests);
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not call next.');
    } finally {
      setBusy(false);
    }
  };
  if (loading) {
    return <View style={styles.container}><SkeletonScreen cards={2} /></View>;
  }

  // No active token.
  if (!token) {
    return <View style={styles.center}>
        <Ionicons name="ticket-outline" size={72} color={COLORS.primary} />
        <Text style={styles.noTokenTitle}>No Active Token</Text>
        <Text style={styles.noTokenSub}>Generate a token to start your journey.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ChronicOPDScreen')}>
          <Text style={styles.primaryBtnText}>Generate Token</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>;
  }
  const info = STAGE_INFO[token.status] || STAGE_INFO['in-queue'];
  const isServing = token.status === 'in-progress';
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} />
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>My Token Journey</Text>
        <Text style={styles.headerSub}>Back is locked until completion</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Big token card */}
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>YOUR TOKEN</Text>
          <Text style={styles.tokenNumber}>{token.tokenNumber}</Text>
          <View style={[styles.statusPill, {
          backgroundColor: info.color + '20'
        }]}>
            <Ionicons name={info.icon} size={16} color={info.color} />
            <Text style={[styles.statusPillText, {
            color: info.color
          }]}>{info.label}</Text>
          </View>
          <Text style={styles.deptText}>{info.dept}</Text>

          {token.isFollowUp && <View style={styles.followBadge}>
              <Ionicons name="document-text" size={12} color="#B45309" />
              <Text style={styles.followText}>Follow-up — reports review only</Text>
            </View>}

          {token.priorityLevel && token.priorityLevel !== 'normal' && <View style={styles.priorityBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.priorityText}>{token.priorityReason}</Text>
            </View>}
        </View>

        {/* Assigned doctor + illness */}
        {(token.assignedDoctor?.name || token.chronicIllness) && <View style={styles.docStrip}>
            <View style={styles.docStripIcon}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <View style={{
          flex: 1
        }}>
              <Text style={styles.docStripName}>{token.assignedDoctor?.name || 'Assigned doctor'}</Text>
              <Text style={styles.docStripSub}>
                {[token.assignedDoctor?.specialization, token.assignedDoctor?.room].filter(Boolean).join(' • ')}
                {token.chronicIllness ? `  ·  ${token.chronicIllness}` : ''}
              </Text>
            </View>
          </View>}

        {/* Status detail */}
        {token.status === 'in-queue' && <View style={styles.infoCard}>
            <Text style={styles.infoBig}>{ahead}</Text>
            <Text style={styles.infoLabel}>{ahead === 0 ? 'You are next!' : `patient(s) ahead of you`}</Text>
            <Text style={styles.estWaitText}>{estWait > 0 ? `~${estWait} min estimated wait` : 'Being called shortly'}</Text>
            {nowServing && <Text style={styles.nowServingText}>Now serving: {nowServing}</Text>}
          </View>}
        {isServing && <View style={[styles.infoCard, {
        backgroundColor: '#ECFDF5'
      }]}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            <Text style={[styles.infoLabel, {
          color: '#065F46',
          marginTop: 8
        }]}>It's your turn — please see the doctor.</Text>
          </View>}
        {token.status === 'pharmacy' && <View style={[styles.infoCard, {
        backgroundColor: '#F5F3FF'
      }]}>
            <Ionicons name="medkit" size={40} color="#8B5CF6" />
            <Text style={[styles.infoLabel, {
          color: '#5B21B6',
          marginTop: 8
        }]}>Please collect your medicine at the Pharmacy.</Text>
            {token.prescription?.medicines?.length > 0 && <View style={styles.rxBox}>
                <Text style={styles.rxTitle}>Prescription</Text>
                {token.prescription.medicines.map((m, i) => <View key={i} style={styles.rxRow}>
                    <Ionicons name="ellipse" size={6} color="#8B5CF6" />
                    <Text style={styles.rxItem}>{m}</Text>
                  </View>)}
                {token.prescription.tests?.length > 0 && <Text style={styles.rxTests}>Lab tests to follow: {token.prescription.tests.join(', ')}</Text>}
              </View>}
          </View>}
        {token.status === 'laboratory' && <View style={[styles.infoCard, {
        backgroundColor: '#FEF2F2'
      }]}>
            <Ionicons name="flask" size={40} color="#EF4444" />
            <Text style={[styles.infoLabel, {
          color: '#991B1B',
          marginTop: 8
        }]}>Please proceed to the Laboratory for your tests.</Text>
            <TouchableOpacity style={styles.cancelLabBtn} onPress={confirmCancelLab} disabled={busy} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.cancelLabText}>Cancel Lab Token</Text>
            </TouchableOpacity>
          </View>}
        {token.status === 'awaiting_lab_choice' && <View style={[styles.infoCard, {
        backgroundColor: '#F5F3FF'
      }]}>
            <Ionicons name="flask-outline" size={40} color="#8B5CF6" />
            <Text style={[styles.infoLabel, {
          color: '#5B21B6',
          marginTop: 8
        }]}>
              Your lab token is cancelled. Reschedule it whenever you're ready.
            </Text>
            <TouchableOpacity style={styles.rescheduleBtn} onPress={() => advance('get_lab_token')} disabled={busy} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.rescheduleText}>Reschedule Lab Token</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeLink} onPress={() => advance('complete')} disabled={busy}>
              <Text style={styles.completeLinkText}>Mark journey complete</Text>
            </TouchableOpacity>
          </View>}

        {/* Journey progress bar. A follow-up token ends at the doctor. */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Journey Progress</Text>
          {token.isFollowUp ? <>
              <JourneyStep label="See Doctor (show reports)" done={token.status === 'completed'} active={['in-queue', 'in-progress'].includes(token.status)} />
              <JourneyStep label="Done" done={token.status === 'completed'} active={false} last />
            </> : <>
              <JourneyStep label="Chronic OPD" done={['pharmacy', 'awaiting_lab_choice', 'laboratory', 'completed'].includes(token.status)} active={['in-queue', 'in-progress'].includes(token.status)} />
              <JourneyStep label="Pharmacy" done={['laboratory', 'completed'].includes(token.status)} active={['pharmacy', 'awaiting_lab_choice'].includes(token.status)} />
              <JourneyStep label="Laboratory (optional)" done={token.status === 'completed' && token.labRequested} active={token.status === 'laboratory'} last />
            </>}
        </View>

        {/* ---- DOCTOR STAGE: handled by the REAL Doctor module now ----
            The doctor consults this patient in the Doctor Portal and taps
            "Proceed", which prescribes and moves the token to Pharmacy. The
            patient just waits for their turn — no simulation here. */}
        {(token.status === 'in-queue' || token.status === 'in-progress') && <View style={styles.simCard}>
            <Text style={styles.simTitle}>
              {token.status === 'in-progress' ? '🩺 With the Doctor' : '⏳ Waiting for the Doctor'}
            </Text>
            <Text style={styles.simSub}>
              {token.isFollowUp ? 'The doctor is reviewing your reports. Your journey will update automatically.' : 'The doctor will call your token shortly. Once done, you will be directed to the Pharmacy automatically.'}
            </Text>
          </View>}

        {/* ---- PHARMACY / LAB SIMULATION (temporary until those modules exist) ---- */}
        {(token.status === 'pharmacy' || token.status === 'laboratory') && <View style={styles.simCard}>
            <Text style={styles.simTitle}>⚙️ Staff Simulation (for testing)</Text>
            <Text style={styles.simSub}>These stand in for the pharmacist / lab.</Text>

            {token.status === 'pharmacy' && <TouchableOpacity style={[styles.simBtn, {
          backgroundColor: '#8B5CF6'
        }]} onPress={() => staffCallNext('pharmacy')} disabled={busy}>
                <Ionicons name="medkit-outline" size={16} color="#FFF" />
                <Text style={styles.simBtnText}>Pharmacist: Call Next Patient</Text>
              </TouchableOpacity>}
            {token.status === 'laboratory' && <TouchableOpacity style={[styles.simBtn, {
          backgroundColor: '#EF4444'
        }]} onPress={() => staffCallNext('laboratory')} disabled={busy}>
                <Ionicons name="flask-outline" size={16} color="#FFF" />
                <Text style={styles.simBtnText}>Lab: Call Next Patient</Text>
              </TouchableOpacity>}
          </View>}

        {busy && <ActivityIndicator color={COLORS.primary} style={{
        marginTop: 16
      }} />}
      </ScrollView>

      {/* Themed Lab Token prompt (replaces plain Alert) */}
      <ThemedPrompt visible={labPrompt} variant="default" icon="flask" title="Take a Lab Token?" message="Your pharmacy step is complete. Would you like to take a Laboratory token, or mark your journey as complete?" primaryLabel="Get Lab Token" onPrimary={() => {
      setLabPrompt(false);
      advance('get_lab_token');
    }} secondaryLabel="Mark Complete" onSecondary={() => {
      setLabPrompt(false);
      advance('complete');
    }} />

      {/* Themed Thank You (replaces plain Alert) */}
      <ThemedPrompt visible={thankYou} variant="success" icon="checkmark-circle" title="Thank You!" message="Thank You for choosing CDA Hospital. We wish you good health." primaryLabel="Back to Home" onPrimary={() => {
      setThankYou(false);
      navigation.reset({
        index: 0,
        routes: [{
          name: 'HomeScreen'
        }]
      });
    }} />
    </View>;
}
function JourneyStep({
  label,
  done,
  active,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const color = done ? '#10B981' : active ? COLORS.primary : '#CBD5E1';
  return <View style={styles.stepRow}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepDot, {
        backgroundColor: color
      }]}>
          {done && <Ionicons name="checkmark" size={12} color="#FFF" />}
        </View>
        {!last && <View style={[styles.stepLine, {
        backgroundColor: done ? '#10B981' : '#E2E8F0'
      }]} />}
      </View>
      <Text style={[styles.stepLabel, {
      color: active ? COLORS.text : '#94A3B8',
      fontWeight: active ? '700' : '500'
    }]}>{label}</Text>
      {active && <View style={styles.stepActiveBadge}><Text style={styles.stepActiveText}>Current</Text></View>}
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary
  },
  header: {
    paddingTop: topPad(40),
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900'
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2
  },
  scroll: {
    padding: 20
  },
  tokenCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#089082',
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.12,
        shadowRadius: 14
      },
      android: {
        elevation: 4
      }
    })
  },
  tokenLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2
  },
  tokenNumber: {
    color: COLORS.text,
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
    marginVertical: 6
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4
  },
  statusPillText: {
    fontWeight: '800',
    fontSize: 14
  },
  deptText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600'
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  priorityText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1
  },
  followBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  followText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700'
  },
  docStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 12
  },
  docStripIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  docStripName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.text
  },
  docStripSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  rxBox: {
    alignSelf: 'stretch',
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE'
  },
  rxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5B21B6',
    marginBottom: 8,
    letterSpacing: 0.3
  },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3
  },
  rxItem: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600'
  },
  rxTests: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 8,
    fontStyle: 'italic'
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 16
  },
  cancelLabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444'
  },
  cancelLabText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '700'
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#8B5CF6'
  },
  rescheduleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  completeLink: {
    marginTop: 12
  },
  completeLinkText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  infoBig: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center'
  },
  estWaitText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  },
  nowServingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700'
  },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    marginTop: 16
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48
  },
  stepLeft: {
    alignItems: 'center',
    width: 30
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    minHeight: 20
  },
  stepLabel: {
    fontSize: 15,
    marginLeft: 10,
    marginTop: 2,
    flex: 1
  },
  stepActiveBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10
  },
  stepActiveText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  simCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A3412'
  },
  simSub: {
    fontSize: 12,
    color: '#C2410C',
    marginTop: 2,
    marginBottom: 14
  },
  simDocLabel: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '700',
    marginBottom: 6
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8
  },
  simBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14
  },
  noTokenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16
  },
  noTokenSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center'
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15
  },
  ghostBtn: {
    marginTop: 12,
    paddingVertical: 10
  },
  ghostBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600'
  }
});