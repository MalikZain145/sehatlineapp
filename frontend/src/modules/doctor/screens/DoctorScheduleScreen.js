// src/screens/doctor/DoctorScheduleScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, StatusBar, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DoctorHeader from '../components/DoctorHeader';
import doctorService from '../services/doctorService';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const USER_DATA_KEY = '@sehatline_userData';
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';
const QUEUE_KEY = '@sehatline_queue';
const DoctorScheduleScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [todayWaiting, setTodayWaiting] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayDate, setTodayDate] = useState('');
  const [todayDay, setTodayDay] = useState('');
  const [shiftEnded, setShiftEnded] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  useEffect(() => {
    loadData();
    getTodayInfo();
    // Refresh when returning to the screen so the On/Off-Duty badge is current.
    const unsub = navigation.addListener('focus', () => {
      loadData();
      getTodayInfo();
    });
    return () => unsub && unsub();
  }, []);
  const getTodayInfo = () => {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[today.getDay()];
    const dateStr = today.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    setTodayDay(dayName);
    setTodayDate(dateStr);
    const hours = today.getHours();
    const minutes = today.getMinutes();
    const currentTime = hours * 60 + minutes;
    const shiftEndTime = 14 * 60;
    setShiftEnded(currentTime >= shiftEndTime);
  };

  // ─── MOCK COMPLETED PATIENTS (For Demo) ────────────────────────────
  const generateMockCompleted = () => {
    // Simulate 15-25 patients completed today
    return Math.floor(Math.random() * 15) + 10;
  };
  const generateMockWaiting = () => {
    // Simulate 2-8 patients waiting
    return Math.floor(Math.random() * 7) + 2;
  };
  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        setDoctor(JSON.parse(userData));
      } else {
        setDoctor({
          name: 'Dr. Ahmed Hassan',
          specialty: 'Cardiologist',
          shift: '08:30 AM – 02:00 PM',
          room: 'Room 12',
          hospital: 'Capital Hospital CDA'
        });
      }
      // On/Off-Duty comes from the doctor's REAL availability (backend), not
      // local storage — so the badge follows the availability toggle.
      try {
        const av = await doctorService.getAvailability();
        if (av && typeof av.active === 'boolean') {
          setDoctor(prev => ({ ...(prev || {}), isOnline: av.active }));
        }
      } catch (e) { /* offline — keep last known */ }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load completed patients
      const completedData = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      let completed = [];
      if (completedData) {
        completed = JSON.parse(completedData);
      }
      const todayCompletedList = completed.filter(item => {
        if (!item.completedAt) return false;
        const itemDate = new Date(item.completedAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
      });

      // Real count only — no fabricated demo numbers.
      const completedCount = todayCompletedList.length;
      setTodayCompleted(completedCount);

      // Load queue
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      let queue = [];
      if (queueData) {
        queue = JSON.parse(queueData);
      }
      const todayWaitingList = queue.filter(item => {
        if (!item.date && !item.createdAt) return false;
        const itemDate = new Date(item.date || item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
      });
      const waitingCount = todayWaitingList.length;
      setTodayWaiting(waitingCount);

      // ✅ Total = Completed + Waiting
      const total = completedCount + waitingCount;
      setTodayTotal(total);

      // ✅ Progress percentage
      const percent = total > 0 ? Math.round(completedCount / total * 100) : 0;
      setProgressPercent(percent);
    } catch (error) {
      console.error('Error loading data:', error);
      // On error, show real zeros — never fabricated demo numbers.
      setTodayCompleted(0);
      setTodayWaiting(0);
      setTodayTotal(0);
      setProgressPercent(0);
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    getTodayInfo();
    setRefreshing(false);
  };
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  const todayIndex = new Date().getDay();
  const isWorkingDay = todayIndex >= 1 && todayIndex <= 5;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        <DoctorHeader title="My Schedule" navigation={navigation} right={
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        } />

        {/* ─── DOCTOR NAME ────────────────────────────────────────────── */}
        <View style={styles.doctorNameCard}>
          <Text style={styles.doctorName}>{doctor?.name || 'Dr. Ahmed Hassan'}</Text>
          <Text style={styles.doctorSpecialty}>{doctor?.specialty || 'Cardiologist'}</Text>
          <Text style={styles.doctorRoom}>
            <Ionicons name="location-outline" size={14} color={COLORS.textLight} /> {doctor?.room || 'Room 12'}
          </Text>
        </View>

        {/* ─── TODAY'S SUMMARY ────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryDate}>{todayDay}, {todayDate}</Text>
              <Text style={styles.summaryShift}>
                {doctor?.shift || '08:30 AM – 02:00 PM'}
              </Text>
            </View>
            <View style={[styles.shiftBadge, shiftEnded ? styles.shiftEnded : styles.shiftActive]}>
              <Text style={[styles.shiftBadgeText, shiftEnded ? styles.shiftEndedText : styles.shiftActiveText]}>
                {shiftEnded ? '✓ Shift Done' : '● Active'}
              </Text>
            </View>
          </View>

          {/* ─── PROGRESS CIRCLE ───────────────────────────────────────── */}
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressCircleNumber}>{progressPercent}%</Text>
              <Text style={styles.progressCircleLabel}>Complete</Text>
            </View>
            <View style={styles.progressStats}>
              <View style={styles.progressStatItem}>
                <Text style={[styles.progressStatNumber, {
                color: COLORS.success
              }]}>{todayCompleted}</Text>
                <Text style={styles.progressStatLabel}>Completed</Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStatItem}>
                <Text style={[styles.progressStatNumber, {
                color: COLORS.warning
              }]}>{todayWaiting}</Text>
                <Text style={styles.progressStatLabel}>Waiting</Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStatItem}>
                <Text style={[styles.progressStatNumber, {
                color: COLORS.primary
              }]}>{todayTotal}</Text>
                <Text style={styles.progressStatLabel}>Total</Text>
              </View>
            </View>
          </View>

          {/* ─── PROGRESS BAR ──────────────────────────────────────────── */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
              width: `${Math.min(100, progressPercent)}%`,
              backgroundColor: progressPercent >= 80 ? COLORS.success : COLORS.primary
            }]} />
            </View>
            <Text style={styles.progressBarText}>
              {todayCompleted} of {todayTotal} patients attended
              {todayTotal === 0 && ' — No patients today'}
            </Text>
          </View>
        </View>

        {/* ─── TODAY'S BREAKDOWN ────────────────────────────────────── */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Today's Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownItem, styles.breakdownCompleted]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <View>
                <Text style={styles.breakdownNumber}>{todayCompleted}</Text>
                <Text style={styles.breakdownLabel}>Completed</Text>
              </View>
            </View>
            <View style={[styles.breakdownItem, styles.breakdownWaiting]}>
              <Ionicons name="hourglass" size={20} color={COLORS.warning} />
              <View>
                <Text style={styles.breakdownNumber}>{todayWaiting}</Text>
                <Text style={styles.breakdownLabel}>Waiting</Text>
              </View>
            </View>
            <View style={[styles.breakdownItem, styles.breakdownTotal]}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.breakdownNumber}>{todayTotal}</Text>
                <Text style={styles.breakdownLabel}>Total</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── WORKING HOURS ──────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Working Hours</Text>
              <Text style={styles.infoValue}>{doctor?.shift || '08:30 AM – 02:00 PM'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, {
            backgroundColor: COLORS.warning + '15'
          }]}>
              <Ionicons name="cafe-outline" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Break</Text>
              <Text style={styles.infoValue}>12:30 PM – 01:00 PM</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, {
            backgroundColor: COLORS.info + '15'
          }]}>
              <Ionicons name="business-outline" size={20} color={COLORS.info} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hospital</Text>
              <Text style={styles.infoValue}>{doctor?.hospital || 'Capital Hospital CDA'}</Text>
            </View>
          </View>
        </View>

        {/* ─── WEEKLY SCHEDULE ────────────────────────────────────────── */}
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>Weekly Schedule</Text>
          {WEEK_DAYS.map((day, index) => {
          const isToday = index === todayIndex - 1;
          const isWeekend = day === 'Saturday' || day === 'Sunday';
          const isWorking = !isWeekend;
          return <View key={index} style={[styles.weekItem, isToday && styles.weekItemToday]}>
                <View style={styles.weekDayContainer}>
                  <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>
                    {day}
                  </Text>
                  {isToday && <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>}
                </View>
                <View style={[styles.weekStatus, isWorking ? styles.weekStatusWorking : styles.weekStatusOff]}>
                  <Text style={[styles.weekStatusText, isWorking ? styles.weekStatusTextWorking : styles.weekStatusTextOff]}>
                    {isWorking ? 'Working' : 'Off'}
                  </Text>
                </View>
              </View>;
        })}
        </View>

        {/* ─── STATUS ────────────────────────────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, doctor?.isOnline !== false && styles.statusOnline]}>
            <View style={[styles.statusDot, doctor?.isOnline !== false && styles.statusDotOnline]} />
            <Text style={[styles.statusText, doctor?.isOnline !== false && styles.statusTextOnline]}>
              {doctor?.isOnline !== false ? 'On Duty' : 'Off Duty'}
            </Text>
          </View>
          <Text style={styles.statusSubText}>
            {shiftEnded ? 'Shift completed for today' : 'Available for consultations'}
          </Text>
        </View>

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerSub}>{todayDay}, {todayDate}</Text>
        </View>
      </ScrollView>
    </View>;
};

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: BOTTOM_SPACE
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary
  },
  scrollContent: {
    paddingBottom: 20
  },
  // ── HEADER ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18,
    backgroundColor: COLORS.background
  },
  iconBtn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 24
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16
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
    marginBottom: 8,
    overflow: 'hidden'
  },
  logoImage: {
    width: 40,
    height: 40,
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
  // ─── Doctor Name ──────────────────────────────────────────────────
  doctorNameCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 4,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  doctorSpecialty: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  doctorRoom: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4
  },
  // ─── Summary Card ────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  summaryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  summaryShift: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  shiftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  shiftActive: {
    backgroundColor: COLORS.success + '15'
  },
  shiftEnded: {
    backgroundColor: COLORS.surface
  },
  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  shiftActiveText: {
    color: COLORS.success
  },
  shiftEndedText: {
    color: COLORS.textLight
  },
  // ─── Progress Circle ─────────────────────────────────────────────
  progressCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary
  },
  progressCircleNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary
  },
  progressCircleLabel: {
    fontSize: 9,
    color: COLORS.textLight
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16
  },
  progressStatItem: {
    alignItems: 'center'
  },
  progressStatNumber: {
    fontSize: 18,
    fontWeight: '700'
  },
  progressStatLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 2
  },
  progressStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border
  },
  // ─── Progress Bar ─────────────────────────────────────────────────
  progressBarContainer: {
    marginTop: 12
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  progressBarText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center'
  },
  // ─── Breakdown Card ──────────────────────────────────────────────
  breakdownCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 4
  },
  breakdownCompleted: {
    backgroundColor: COLORS.success + '10'
  },
  breakdownWaiting: {
    backgroundColor: COLORS.warning + '10'
  },
  breakdownTotal: {
    backgroundColor: COLORS.primary + '10'
  },
  breakdownNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  breakdownLabel: {
    fontSize: 9,
    color: COLORS.textLight
  },
  // ─── Info Card ────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoContent: {
    flex: 1,
    marginLeft: 12
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6
  },
  // ─── Schedule Card ──────────────────────────────────────────────
  scheduleCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10
  },
  weekItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  weekItemToday: {
    backgroundColor: COLORS.primary + '05',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8
  },
  weekDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  weekDay: {
    fontSize: 13,
    color: COLORS.text
  },
  weekDayToday: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  todayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.white
  },
  weekStatus: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12
  },
  weekStatusWorking: {
    backgroundColor: COLORS.success + '15'
  },
  weekStatusOff: {
    backgroundColor: COLORS.surface
  },
  weekStatusText: {
    fontSize: 10,
    fontWeight: '600'
  },
  weekStatusTextWorking: {
    color: COLORS.success
  },
  weekStatusTextOff: {
    color: COLORS.textLight
  },
  // ─── Status ──────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    gap: 6
  },
  statusOnline: {
    backgroundColor: COLORS.success + '15'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight
  },
  statusDotOnline: {
    backgroundColor: COLORS.success
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  statusTextOnline: {
    color: COLORS.success
  },
  statusSubText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4
  },
  // ─── Footer ──────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: 20
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight
  },
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 8
  },
  footerSub: {
    fontSize: 10,
    color: COLORS.textLight
  }
});
export default DoctorScheduleScreen;