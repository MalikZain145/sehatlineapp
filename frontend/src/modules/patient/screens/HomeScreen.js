// HomeScreen — patient home, teal/mint design.
//
// Layout: borderless menu + bell flanking the centred brand mark, a
// horizontally scrolling ambient stat strip, then the patient's LIVE
// QUEUES (only rendered when they actually have one in flight — a chronic
// token and/or a cardiology appointment for today), a spotlight on the
// Blood Donor Network, and finally the essential "Hospital Services" grid.
//
// Lab / Pharmacy / Doctors quick-tiles were removed: a chronic-care queue
// app doesn't need a patient poking at pharmacy/lab tiles directly — those
// stages happen automatically inside the token journey.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import BrandLogo from '../../../components/ui/BrandLogo';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Platform, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useBottomInset from '../../../hooks/useBottomInset';
import tokenService from '../services/tokenService';
import appointmentService from '../services/appointmentService';
import bloodDonorService from '../services/bloodDonorService';
import reportsService from '../services/reportsService';
import healthCampsService from '../services/healthCampsService';
import notificationService from '../services/notificationService';
import { onQueueUpdate, onBloodUpdate } from '../../../services/socket';
import Sidebar from '../../../components/ui/Sidebar';
import FadeInView from '../../../components/ui/FadeInView';
import { useSession } from '../../../context/SessionContext';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
const {
  width
} = Dimensions.get('window');
const CARD_W = (width - 40 - 14) / 2; // two columns, 20px page pad, 14px gutter

// The essential services only. Lab/Pharmacy/Doctors were removed on purpose
// (see file header). Chronic Care and Cardiology lead because they're the two
// journeys a patient actually starts from here.
const SERVICES = [{
  id: 1,
  title: 'Chronic Care',
  sub: 'Get Your Monthly Medicines',
  icon: 'medkit',
  screen: 'ChronicOPDScreen'
}, {
  id: 2,
  title: 'Book Appointment',
  sub: 'Get a new appointment',
  icon: 'calendar',
  screen: 'BookAppointmentScreen'
}, {
  id: 3,
  title: 'My Vitals',
  sub: 'Log Readings',
  icon: 'pulse',
  screen: 'VitalsLoggerScreen'
}, {
  id: 4,
  title: 'My Prescriptions',
  sub: "Doctor's Prescriptions",
  icon: 'document-text',
  screen: 'MyPrescriptionsScreen'
}, {
  id: 5,
  title: 'My Reports',
  sub: 'Lab Results',
  icon: 'flask',
  screen: 'ReportsListScreen'
}, {
  id: 6,
  title: 'Awareness Camps',
  sub: 'Free Screening',
  icon: 'people-circle',
  screen: 'HealthCampsScreen'
}, {
  id: 7,
  title: 'Live Queue',
  sub: 'See Who Is Next',
  icon: 'people',
  screen: 'LiveQueueScreen'
}];
export default function HomeScreen({
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
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Every live queue the patient is currently in — chronic token and/or a
  // cardiology appointment today. Empty ⇒ nothing renders (queues vanish the
  // moment the journey/appointment is over).
  const [queues, setQueues] = useState([]);
  const [bloodStats, setBloodStats] = useState({
    totalDonors: 0,
    matchingMe: 0,
    isDonor: false
  });
  // Patient-relevant counts for the stat strip (their appointments/reports/camps).
  const [patientStats, setPatientStats] = useState({
    appointments: 0,
    reports: 0,
    camps: 0
  });
  const [unread, setUnread] = useState(0);
  const prevStatusRef = useRef(null);
  const prevApptNextRef = useRef(false);
  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {/* ignore */}
  }, []);
  const fetchBloodStats = useCallback(async () => {
    try {
      const res = await bloodDonorService.getStats();
      if (res?.stats) setBloodStats(res.stats);
    } catch (e) {/* offline */}
  }, []);

  // Counts that actually matter to the patient (not hospital beds/doctors).
  const fetchPatientStats = useCallback(async () => {
    try {
      const [appts, reports, camps] = await Promise.all([appointmentService.myAppointments().catch(() => null), reportsService.list().catch(() => null), healthCampsService.getStats().catch(() => null)]);
      setPatientStats({
        appointments: appts?.upcoming?.length ?? 0,
        reports: reports?.summary?.total ?? 0,
        camps: camps?.stats?.upcoming ?? 0
      });
    } catch (e) {/* offline */}
  }, []);

  // Also delivers the morning/evening health tip if one is due.
  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationService.unreadCount();
      setUnread(res?.unread ?? 0);
    } catch (e) {/* offline */}
  }, []);

  // Pull BOTH live queues the patient can be in: the chronic OPD token and
  // today's cardiology appointment. Whatever is active becomes a card.
  const fetchQueues = useCallback(async () => {
    const next = [];

    // 1) Chronic OPD token
    try {
      const res = await tokenService.getActive();
      if (res?.token) {
        const deptLabel = {
          chronic_opd: 'Chronic OPD',
          pharmacy: 'Pharmacy',
          laboratory: 'Laboratory',
          done: 'Completed'
        }[res.token.department] || res.token.department;
        next.push({
          key: 'chronic',
          type: 'token',
          label: 'Chronic OPD Token',
          code: res.token.tokenNumber,
          department: deptLabel,
          stage: res.stage,
          ahead: res.ahead ?? 0,
          isNext: res.isNext,
          icon: 'medical',
          screen: 'TokenJourneyScreen'
        });
        // Open the journey the moment the doctor calls this patient.
        if (res.token.status === 'in-progress' && prevStatusRef.current !== 'in-progress') {
          navigation.navigate('TokenJourneyScreen');
        }
        prevStatusRef.current = res.token.status;
      } else {
        prevStatusRef.current = null;
      }
    } catch (e) {/* none */}

    // 2) Cardiology appointment (today)
    try {
      const res = await appointmentService.getActive();
      if (res?.appointment) {
        next.push({
          key: 'cardio',
          type: 'appointment',
          label: 'Cardiology Appointment',
          code: res.appointment.time,
          department: res.appointment.doctorName || 'Cardiology',
          stage: res.isNext ? 'You are next' : 'Scheduled',
          ahead: res.ahead ?? 0,
          isNext: res.isNext,
          icon: 'heart',
          screen: 'AppointmentTrackScreen'
        });
        // Forcefully open the locked tracker the moment it's the patient's
        // turn (same idea as the chronic token auto-opening its journey).
        if (res.isNext && !prevApptNextRef.current) {
          navigation.navigate('AppointmentTrackScreen');
        }
        prevApptNextRef.current = !!res.isNext;
      } else {
        prevApptNextRef.current = false;
      }
    } catch (e) {/* none */}
    setQueues(next);
  }, [navigation]);
  useEffect(() => {
    loadUser();
    fetchQueues();
    fetchUnread();
    fetchBloodStats();
    fetchPatientStats();
    const unsub = onQueueUpdate(() => {
      fetchQueues();
    });
    const unsubBlood = onBloodUpdate(() => {
      fetchBloodStats();
    });
    const focus = navigation.addListener?.('focus', () => {
      loadUser();
      fetchQueues();
      fetchUnread();
      fetchBloodStats();
      fetchPatientStats();
    });
    return () => {
      unsub && unsub();
      unsubBlood && unsubBlood();
      focus && focus();
    };
  }, [loadUser, fetchQueues, fetchUnread, fetchBloodStats, fetchPatientStats, navigation]);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), fetchQueues(), fetchUnread(), fetchBloodStats(), fetchPatientStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  // Patient-facing stats — what the patient cares about, not hospital beds.
  const STAT_ITEMS = [{
    label: 'Upcoming Visits',
    value: patientStats.appointments,
    icon: 'calendar'
  }, {
    label: 'My Reports',
    value: patientStats.reports,
    icon: 'document-text'
  }, {
    label: 'Health Camps',
    value: patientStats.camps,
    icon: 'people-circle'
  }, {
    label: 'Blood Donors',
    value: bloodStats.totalDonors ?? 0,
    icon: 'water'
  }];
  const stageColors = {
    'Waiting': COLORS.warning,
    'Now Serving': COLORS.success,
    'Pharmacy': COLORS.primary,
    'Laboratory': COLORS.danger,
    'Pharmacy Done': COLORS.primary,
    'You are next': COLORS.success,
    'Scheduled': COLORS.warning
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} progressViewOffset={80} />}>
        {/* Header: borderless icons flanking the centred brand mark */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.6} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }}>
            <Ionicons name="menu" size={26} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <BrandLogo style={styles.logoImage} />
            </View>
            <Text style={styles.brand}>
              SEHAT<Text style={styles.brandAccent}>LINE</Text>
            </Text>
            <Text style={styles.tagline}>Capital Hospital Digital Healthcare</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('NotificationsScreen')} activeOpacity={0.6} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }}>
            <Ionicons name="notifications-outline" size={25} color={COLORS.primary} />
            {unread > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
        </View>

        {/* Stat strip — scrolls horizontally, hinting there's more to the right */}
        <FadeInView delay={60}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statStrip}>
            {STAT_ITEMS.map(s => <View key={s.label} style={styles.statCard}>
                <Ionicons name={s.icon} size={26} color={COLORS.primary} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>)}
          </ScrollView>
        </FadeInView>

        {/* Live queues — one card per active queue (chronic token + cardiology
            appointment). Nothing renders when the patient has no queue. */}
        {queues.map((q, i) => <FadeInView key={q.key} delay={100 + i * 60}>
            <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate(q.screen)} style={styles.tokenWrap}>
              <LinearGradient colors={[COLORS.primary, COLORS.tealDark]} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} style={styles.tokenCard}>
                <View style={styles.tokenTop}>
                  <View style={styles.tokenLabelRow}>
                    <Ionicons name={q.icon} size={15} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.tokenLabel}>{q.label}</Text>
                  </View>
                  <View style={styles.tokenStagePill}>
                    <View style={[styles.tokenStageDot, {
                  backgroundColor: stageColors[q.stage] || '#FFF'
                }]} />
                    <Text style={styles.tokenStageText}>{q.stage}</Text>
                  </View>
                </View>
                <Text style={styles.tokenNumber}>{q.code}</Text>
                <View style={styles.tokenBottom}>
                  <Text style={styles.tokenInfo}>
                    {q.department} • {q.isNext ? 'You are next!' : `${q.ahead} ahead of you`}
                  </Text>
                  <View style={styles.tokenTrackBtn}>
                    <Text style={styles.tokenTrackText}>Track</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </FadeInView>)}

        {/* Blood Donor Network — the app's standout feature. A featured banner
            that surfaces requests matching the patient's own blood group. */}
        <FadeInView delay={140}>
          <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate('BloodDonorScreen')} style={styles.bloodWrap}>
            <LinearGradient colors={['#E23744', '#B4232E']} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} style={styles.bloodCard}>
              <View style={styles.bloodIconCircle}>
                <Ionicons name="water" size={26} color="#FFF" />
              </View>
              <View style={styles.bloodBody}>
                <View style={styles.bloodTitleRow}>
                  <Text style={styles.bloodTitle}>Blood Donor Network</Text>
                  {bloodStats.matchingMe > 0 && <View style={styles.bloodPulse}>
                      <Text style={styles.bloodPulseText}>{bloodStats.matchingMe} need you</Text>
                    </View>}
                </View>
                <Text style={styles.bloodSub}>
                  {bloodStats.matchingMe > 0 ? 'Requests match your blood group — tap to help save a life' : bloodStats.isDonor ? `You're a registered donor • ${bloodStats.totalDonors} donors nearby` : 'Find donors or become one — for all of Pakistan'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        </FadeInView>

        {/* Hospital services */}
        <FadeInView delay={180}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hospital Services</Text>
            <View style={styles.sectionRule} />

            <View style={styles.grid}>
              {SERVICES.map(s => <TouchableOpacity key={s.id} style={styles.serviceCard} activeOpacity={0.85} onPress={() => navigation.navigate(s.screen)}>
                  <View style={styles.serviceIconBox}>
                    <Ionicons name={s.icon} size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.serviceTitle}>{s.title}</Text>
                  <View style={styles.serviceFooter}>
                    <Text style={styles.serviceSub}>{s.sub}</Text>
                    <Ionicons name="arrow-forward" size={17} color={COLORS.primary} />
                  </View>
                  {/* Teal underline, as in the reference */}
                  <View style={styles.serviceUnderline} />
                </TouchableOpacity>)}
            </View>
          </View>
        </FadeInView>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} navigation={navigation} user={user} onLogout={() => logout('manual')} />
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scroll: {
    paddingBottom: 20
  },
  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18
  },
  // No border, no background — just the glyph, per the reference.
  iconBtn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 24
  },
  badge: {
    position: 'absolute',
    top: 20,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.white
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center'
  },
  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.6,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  // 52% of the 62px ring. borderRadius removed — a transparent PNG needs
  // no clipping, and rounding it was shaving the mark's corners.
  logoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain'
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4
  },
  brandAccent: {
    color: COLORS.text
  },
  tagline: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  // ---- Stat strip ----
  statStrip: {
    paddingHorizontal: 20,
    gap: 12,
    paddingVertical: 4
  },
  statCard: {
    width: 112,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.06,
        shadowRadius: 8
      },
      android: {
        elevation: 1
      }
    })
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '500'
  },
  // ---- Active queue card ----
  tokenWrap: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.24,
        shadowRadius: 14
      },
      android: {
        elevation: 6
      }
    })
  },
  tokenCard: {
    borderRadius: 20,
    padding: 18
  },
  tokenTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  tokenLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  tokenLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '600'
  },
  tokenStagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 11
  },
  tokenStageDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  tokenStageText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  tokenNumber: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 2
  },
  tokenBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  tokenInfo: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1
  },
  tokenTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 11
  },
  tokenTrackText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12.5
  },
  // ---- Blood Donor Network banner ----
  bloodWrap: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#E23744',
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.28,
        shadowRadius: 14
      },
      android: {
        elevation: 6
      }
    })
  },
  bloodCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  bloodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bloodBody: {
    flex: 1
  },
  bloodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  bloodTitle: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '800'
  },
  bloodPulse: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9
  },
  bloodPulseText: {
    color: '#B4232E',
    fontSize: 10.5,
    fontWeight: '800'
  },
  bloodSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16
  },
  // ---- Services ----
  section: {
    paddingHorizontal: 20,
    marginTop: 28
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3
  },
  sectionRule: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    marginBottom: 18
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  serviceCard: {
    width: CARD_W,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    paddingBottom: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 3
        },
        shadowOpacity: 0.07,
        shadowRadius: 10
      },
      android: {
        elevation: 2
      }
    })
  },
  serviceIconBox: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 5
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  serviceSub: {
    fontSize: 11.5,
    color: COLORS.textLight,
    flex: 1
  },
  serviceUnderline: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary
  }
});