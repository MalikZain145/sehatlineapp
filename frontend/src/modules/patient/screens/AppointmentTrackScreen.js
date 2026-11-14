// AppointmentTrackScreen — the live "you are in the queue" screen for a
// booked appointment (cardiology / specialist). It mirrors the chronic token
// journey's lock behaviour:
//
//   • Shows how many patients are ahead of you, live (socket + poll).
//   • When it's your turn (nobody ahead), the card turns green and a
//     high-priority notification fires.
//   • The BACK button is LOCKED until the appointment is over, so the
//     patient can't accidentally leave the queue view.
//
// NOTE: truly force-opening the app from a killed state needs a native
// full-screen-intent notification (Android) in a dev/APK build — not
// possible inside Expo Go. The high-priority local notification here is the
// portable stand-in and upgrades to full-screen automatically in the APK.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler, Dimensions, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import { useFocusEffect } from '@react-navigation/native';
import appointmentService from '../services/appointmentService';
import { onQueueUpdate, connectSocket } from '../../../services/socket';
import { setupNotifications, notify } from '../../../services/notifications';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import { useTheme } from "../../../context/ThemeContext";
import { topPad } from '../../../utils/safeArea';
const {
  width
} = Dimensions.get('window');
export default function AppointmentTrackScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [loading, setLoading] = useMinLoading(true);
  const [appt, setAppt] = useState(null);
  const [ahead, setAhead] = useState(0);
  const [isNext, setIsNext] = useState(false);
  const [done, setDone] = useState(false);
  const lastNextRef = useRef(false);
  const hadApptRef = useRef(false);
  const load = useCallback(async () => {
    try {
      const res = await appointmentService.getActive();
      if (res?.appointment) {
        setAppt(res.appointment);
        setAhead(res.ahead ?? 0);
        setIsNext(!!res.isNext);
        hadApptRef.current = true;
        // Fire the "you are next" alert once, on the transition.
        if (res.isNext && !lastNextRef.current) {
          notify('It is your turn', `${res.appointment.doctorName || 'Your doctor'} is ready to see you now.`);
        } else if (res.ahead === 1 && lastNextRef.current === false) {
          notify('You are almost up', 'Just one patient ahead of you. Please be ready.');
        }
        lastNextRef.current = !!res.isNext;
      } else {
        // Appointment cleared (completed / passed) → show thank-you.
        if (hadApptRef.current && !done) {
          hadApptRef.current = false;
          setDone(true);
        }
        setAppt(null);
      }
    } catch (e) {
      // keep last state
    } finally {
      setLoading(false);
    }
  }, [done]);
  useEffect(() => {
    setupNotifications();
    connectSocket();
    load();
    const unsub = onQueueUpdate(() => load());
    const poll = setInterval(load, 20000);
    return () => {
      unsub && unsub();
      clearInterval(poll);
    };
  }, [load]);

  // Lock the hardware back button while the appointment is still active.
  useFocusEffect(useCallback(() => {
    const onBack = () => {
      if (appt && !done) return true; // swallow back
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [appt, done]));
  if (loading) {
    return <View style={styles.container}><SkeletonScreen cards={2} /></View>;
  }

  // No active appointment (and not just-completed) → gentle empty state.
  if (!appt && !done) {
    return <View style={styles.center}>
        <Ionicons name="calendar-outline" size={72} color={COLORS.primary} />
        <Text style={styles.noTitle}>No Active Appointment</Text>
        <Text style={styles.noSub}>Book an appointment to see your live queue here.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('BookAppointmentScreen')}>
          <Text style={styles.primaryBtnText}>Book Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} />
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Appointment Queue</Text>
        <Text style={styles.headerSub}>Back is locked until you're seen</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {appt && <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>YOUR APPOINTMENT</Text>
              <Text style={styles.docName}>{appt.doctorName || 'Specialist'}</Text>
              <Text style={styles.deptText}>{(appt.department || 'cardiology').replace(/^\w/, c => c.toUpperCase())} • {appt.time}</Text>
            </View>

            {isNext ? <View style={[styles.statusCard, {
          backgroundColor: '#ECFDF5'
        }]}>
                <Ionicons name="walk" size={44} color="#10B981" />
                <Text style={[styles.statusBig, {
            color: '#065F46'
          }]}>It's your turn</Text>
                <Text style={styles.statusSub}>Please proceed to {appt.doctorName || 'the doctor'}.</Text>
              </View> : <View style={styles.statusCard}>
                <Text style={styles.statusNum}>{ahead}</Text>
                <Text style={styles.statusSub}>{ahead === 1 ? 'patient ahead of you' : 'patients ahead of you'}</Text>
              </View>}

            <View style={styles.hintCard}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
              <Text style={styles.hintText}>
                Keep this open — you'll be alerted the moment it's your turn. You can't go back until your appointment is done.
              </Text>
            </View>
          </>}
      </ScrollView>

      {/* Escape hatch: back is locked, but the patient can move this
          appointment to another slot/doctor instead of being stuck here. */}
      {appt && !done && <View style={styles.footer}>
        <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.8} onPress={() => navigation.navigate('BookAppointmentScreen', {
        rescheduleId: appt._id,
        currentLabel: `${appt.doctorName || 'Specialist'} • ${appt.time}`
      })}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.rescheduleText}>Reschedule Appointment?</Text>
        </TouchableOpacity>
      </View>}

      {/* Thank-you when the appointment is over */}
      <ThemedPrompt visible={done} variant="success" icon="checkmark-circle" title="Thank You!" message="Thank You for choosing CDA Hospital. We wish you good health." primaryLabel="Back to Home" onPrimary={() => {
      setDone(false);
      navigation.reset({
        index: 0,
        routes: [{
          name: 'HomeScreen'
        }]
      });
    }} />
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
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
  cardLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2
  },
  docName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center'
  },
  deptText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600'
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginTop: 16
  },
  statusNum: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.primary
  },
  statusBig: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8
  },
  statusSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center'
  },
  hintCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16
  },
  hintText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  noTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16
  },
  noSub: {
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
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 20 : 14,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10'
  },
  rescheduleText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14
  }
});