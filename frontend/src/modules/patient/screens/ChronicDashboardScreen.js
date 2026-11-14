// screens/dashboard/ChronicDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Platform, Alert, Image } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const ChronicDashboard = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [userData, setUserData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0
  });

  // Live queue for Chronic OPD
  const [queueStats] = useState({
    currentToken: 'A-038',
    yourToken: 'A-045',
    ahead: 7,
    estWait: '21 min',
    doctorsOnDuty: 3,
    totalDoctors: 4
  });

  // AI Insight
  const [aiInsight] = useState({
    predictedWait: '21 min',
    bestTime: '11:00 AM',
    offPeakTime: '02:30 PM',
    savingsMin: 15,
    congestion: 'Moderate',
    tip: 'Visit at 11 AM or after 2 PM to reduce wait by ~40%',
    accuracy: 91,
    nextAvailSlot: 'Today 11:30 AM'
  });

  // Care tips
  const careTips = [{
    id: 1,
    title: 'Medication Reminder',
    description: 'Take your medications at the same time daily',
    icon: 'medkit-outline',
    color: '#10B981'
  }, {
    id: 2,
    title: 'Diet Plan',
    description: 'Follow your prescribed low-sugar diet',
    icon: 'restaurant-outline',
    color: '#F59E0B'
  }, {
    id: 3,
    title: 'Exercise Routine',
    description: '30 min light walk every morning',
    icon: 'fitness-outline',
    color: COLORS.primary
  }, {
    id: 4,
    title: 'Monitor Symptoms',
    description: 'Track BP and blood sugar daily',
    icon: 'pulse-outline',
    color: '#EF4444'
  }];

  // Quick actions
  const quickActions = [{
    id: 'book',
    title: 'Book Appointment',
    icon: 'calendar-outline',
    color: COLORS.primary,
    route: 'BookAppointmentScreen'
  }, {
    id: 'queue',
    title: 'View Queue',
    icon: 'timer-outline',
    color: '#10B981',
    route: 'LiveTokenQueueScreen'
  }, {
    id: 'doctors',
    title: 'Find Doctor',
    icon: 'people-outline',
    color: '#F59E0B',
    route: 'DoctorListScreen'
  }, {
    id: 'reports',
    title: 'My Reports',
    icon: 'document-text-outline',
    color: '#EF4444',
    route: 'ReportsListScreen'
  }, {
    id: 'token',
    title: 'Generate Token',
    icon: 'ticket-outline',
    color: '#8B5CF6',
    route: 'GenerateTokenScreen'
  }, {
    id: 'history',
    title: 'History',
    icon: 'list-outline',
    color: '#06B6D4',
    route: 'AppointmentList'
  }];

  // Chronic doctors
  const doctors = [{
    id: 1,
    name: 'Dr. Sarah Ahmed',
    specialty: 'Cardiologist',
    status: 'Available',
    tokens: 8,
    color: COLORS.primary
  }, {
    id: 2,
    name: 'Dr. Muhammad Khan',
    specialty: 'Endocrinologist',
    status: 'Busy',
    tokens: 12,
    color: '#8B5CF6'
  }, {
    id: 3,
    name: 'Dr. Fatima Ali',
    specialty: 'Pulmonologist',
    status: 'Available',
    tokens: 5,
    color: '#10B981'
  }];
  useEffect(() => {
    loadUserData();
  }, []);
  useFocusEffect(useCallback(() => {
    loadAppointments();
  }, []));
  const loadUserData = async () => {
    try {
      let data = route?.params?.userData || null;
      if (!data) {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) data = JSON.parse(stored);
      }
      if (data) setUserData(data);
    } catch (e) {
      console.log('loadUserData error:', e);
    }
  };
  const loadAppointments = async () => {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      if (stored) {
        const all = JSON.parse(stored);
        const now = new Date();
        const chronic = all.filter(a => a.department === 'Chronic OPD');
        setAppointments(chronic);
        const isUpcoming = a => {
          if (a.status === 'Cancelled' || a.status === 'Completed') return false;
          if (a.dateTimeISO) return new Date(a.dateTimeISO) > now;
          try {
            const d = new Date(a.date);
            if (!isNaN(d)) {
              if (a.time) {
                const [tp, mer] = a.time.split(' ');
                let [h, m] = tp.split(':').map(Number);
                if (mer === 'PM' && h !== 12) h += 12;
                if (mer === 'AM' && h === 12) h = 0;
                d.setHours(h, m, 0, 0);
              }
              return d > now;
            }
          } catch (_) {}
          return a.status === 'Confirmed' || a.status === 'Pending';
        };
        const total = chronic.length;
        const upcoming = chronic.filter(isUpcoming).length;
        const completed = chronic.filter(a => a.status === 'Completed').length;
        const cancelled = chronic.filter(a => a.status === 'Cancelled').length;
        setStats({
          total,
          completed,
          upcoming,
          cancelled
        });
        const upcomingList = chronic.filter(isUpcoming).sort((a, b) => {
          const da = a.dateTimeISO ? new Date(a.dateTimeISO) : new Date(a.date);
          const db = b.dateTimeISO ? new Date(b.dateTimeISO) : new Date(b.date);
          return da - db;
        }).slice(0, 3);
        setUpcomingAppointments(upcomingList);
      } else {
        setAppointments([]);
        setUpcomingAppointments([]);
        setStats({
          total: 0,
          completed: 0,
          upcoming: 0,
          cancelled: 0
        });
      }
    } catch (e) {
      console.log('loadAppointments error:', e);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    await loadUserData();
    setRefreshing(false);
  };
  const getStatusColor = status => {
    switch (status) {
      case 'Confirmed':
        return '#10B981';
      case 'Pending':
        return '#F59E0B';
      case 'Completed':
        return COLORS.primary;
      case 'Cancelled':
        return '#EF4444';
      default:
        return COLORS.textSecondary;
    }
  };
  const getStatusIcon = status => {
    switch (status) {
      case 'Confirmed':
        return 'checkmark-circle-outline';
      case 'Pending':
        return 'time-outline';
      case 'Completed':
        return 'checkmark-done-circle-outline';
      case 'Cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };
  const navigateTo = (screen, params = {}) => {
    try {
      navigation.navigate(screen, {
        ...params,
        userData
      });
    } catch (e) {
      Alert.alert('Coming Soon', 'This feature is being updated.');
    }
  };

  // ── RENDERS ──────────────────────────────────────────────────────────

  const renderHeader = () => <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 0
  }}>
      <SafeAreaView>
        {/* Top bar */}
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Chronic OPD</Text>
            <Text style={styles.headerSub}>Chronic Disease Care</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('ProfileScreen')}>
            <Ionicons name="person-circle-outline" size={26} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingHello}>Welcome back,</Text>
            <Text style={styles.greetingName}>{userData?.name || 'Patient'} 👋</Text>
            {userData?.cdaCard && <Text style={styles.greetingCard}>CDA Card: {userData.cdaCard}</Text>}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[{
          label: 'Total',
          value: stats.total,
          color: 'rgba(255,255,255,0.9)'
        }, {
          label: 'Upcoming',
          value: stats.upcoming,
          color: '#34D399'
        }, {
          label: 'Completed',
          value: stats.completed,
          color: '#93C5FD'
        }, {
          label: 'Cancelled',
          value: stats.cancelled,
          color: '#FCA5A5'
        }].map((item, i) => <View key={i} style={styles.statCard}>
              <Text style={[styles.statNumber, {
            color: item.color
          }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>)}
        </View>
      </SafeAreaView>
    </LinearGradient>;
  const renderQueueStatus = () => <View style={[styles.queueCard, SHADOWS.medium]}>
      <View style={styles.queueCardHeader}>
        <View style={styles.queueCardLeft}>
          <View style={[styles.queueIconBox, {
          backgroundColor: COLORS.primary + '15'
        }]}>
            <Ionicons name="timer-outline" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.queueCardTitle}>Live Queue – Chronic OPD</Text>
            <View style={styles.queueDoctorRow}>
              <View style={styles.liveDot} />
              <Text style={styles.queueDoctorText}>{queueStats.doctorsOnDuty}/{queueStats.totalDoctors} doctors on duty</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.queueViewBtn} onPress={() => navigateTo('LiveTokenQueueScreen', {
        department: 'Chronic OPD'
      })}>
          <Text style={styles.queueViewBtnText}>View Live</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.queueStatsRow}>
        {[{
        label: 'Now Serving',
        value: queueStats.currentToken,
        color: COLORS.primary
      }, {
        label: 'Your Token',
        value: queueStats.yourToken,
        color: '#F59E0B'
      }, {
        label: 'Ahead',
        value: `${queueStats.ahead}`,
        color: COLORS.text
      }, {
        label: 'Est. Wait',
        value: queueStats.estWait,
        color: '#10B981'
      }].map((item, i) => <View key={i} style={styles.queueStatItem}>
            <Text style={[styles.queueStatValue, {
          color: item.color
        }]}>{item.value}</Text>
            <Text style={styles.queueStatLabel}>{item.label}</Text>
          </View>)}
      </View>
    </View>;
  const renderAIInsight = () => <View style={[styles.aiCard, SHADOWS.medium]}>
      <View style={styles.aiHeader}>
        <View style={styles.aiLeft}>
          <View style={[styles.aiIconBox, {
          backgroundColor: COLORS.primary + '12'
        }]}>
            <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.aiTitle}>AI Queue Insight</Text>
            <Text style={styles.aiAccuracy}>{aiInsight.accuracy}% accuracy</Text>
          </View>
        </View>
        <View style={styles.aiLiveBadge}>
          <View style={styles.aiLiveDot} />
          <Text style={styles.aiLiveText}>Live</Text>
        </View>
      </View>

      <View style={styles.aiStatsRow}>
        {[{
        label: 'Predicted Wait',
        value: aiInsight.predictedWait,
        color: COLORS.primary
      }, {
        label: 'Best Time',
        value: aiInsight.bestTime,
        color: '#34D399'
      }, {
        label: 'Congestion',
        value: aiInsight.congestion,
        color: '#F59E0B'
      }, {
        label: 'You Save',
        value: `${aiInsight.savingsMin}m`,
        color: '#10B981'
      }].map((item, i, arr) => <React.Fragment key={i}>
            <View style={styles.aiStatItem}>
              <Text style={[styles.aiStatValue, {
            color: item.color
          }]}>{item.value}</Text>
              <Text style={styles.aiStatLabel}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.aiDivider} />}
          </React.Fragment>)}
      </View>

      <View style={styles.aiTipRow}>
        <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
        <Text style={styles.aiTip}>{aiInsight.tip}</Text>
      </View>

      <View style={styles.aiNextSlot}>
        <Ionicons name="calendar-outline" size={14} color="#34D399" />
        <Text style={styles.aiNextSlotText}>Next available slot: <Text style={{
          fontWeight: '700',
          color: '#34D399'
        }}>{aiInsight.nextAvailSlot}</Text></Text>
      </View>
    </View>;
  const renderQuickActions = () => <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        {quickActions.map(action => <TouchableOpacity key={action.id} style={[styles.quickCard, SHADOWS.small, {
        borderColor: action.color + '30'
      }]} onPress={() => navigateTo(action.route)} activeOpacity={0.8}>
            <View style={[styles.quickIcon, {
          backgroundColor: action.color + '15'
        }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.quickTitle}>{action.title}</Text>
          </TouchableOpacity>)}
      </View>
    </View>;
  const renderUpcomingAppointments = () => <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity onPress={() => navigateTo('AppointmentList', {
        filter: 'Chronic OPD'
      })}>
          <Text style={styles.viewAllText}>View All →</Text>
        </TouchableOpacity>
      </View>

      {upcomingAppointments.length > 0 ? upcomingAppointments.map((appt, idx) => <TouchableOpacity key={idx} style={[styles.appointmentCard, SHADOWS.small]} onPress={() => navigateTo('AppointmentDetail', {
      appointment: appt
    })} activeOpacity={0.85}>
            <View style={[styles.apptStatusIcon, {
        backgroundColor: getStatusColor(appt.status) + '15'
      }]}>
              <Ionicons name={getStatusIcon(appt.status)} size={20} color={getStatusColor(appt.status)} />
            </View>
            <View style={styles.apptInfo}>
              <Text style={styles.apptDoctor}>
                {appt.departmentData?.doctor || 'Dr. Sarah Ahmed'}
              </Text>
              <Text style={styles.apptDate}>{appt.date} at {appt.time}</Text>
              <View style={styles.apptTokenRow}>
                <Ionicons name="ticket-outline" size={12} color={COLORS.primary} />
                <Text style={styles.apptToken}>Token: {appt.token}</Text>
              </View>
            </View>
            <View style={styles.apptRight}>
              <Text style={[styles.apptStatus, {
          color: getStatusColor(appt.status)
        }]}>
                {appt.status}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>) : <View style={[styles.emptyCard, SHADOWS.small]}>
          <Ionicons name="calendar-outline" size={52} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
          <Text style={styles.emptySubtitle}>Schedule your next consultation below</Text>
          <TouchableOpacity style={styles.bookNowBtn} onPress={() => navigateTo('BookAppointmentScreen')}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.bookNowGradient}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
              <Text style={styles.bookNowText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>}
    </View>;
  const renderDoctors = () => <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>OPD Doctors Today</Text>
        <TouchableOpacity onPress={() => navigateTo('DoctorListScreen')}>
          <Text style={styles.viewAllText}>View All →</Text>
        </TouchableOpacity>
      </View>
      {doctors.map(doc => <TouchableOpacity key={doc.id} style={[styles.doctorCard, SHADOWS.small]} onPress={() => navigateTo('BookAppointmentScreen')} activeOpacity={0.85}>
          <View style={[styles.doctorAvatar, {
        backgroundColor: doc.color + '20'
      }]}>
            <Text style={[styles.doctorAvatarText, {
          color: doc.color
        }]}>
              {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doc.name}</Text>
            <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>
          </View>
          <View style={styles.doctorRight}>
            <View style={[styles.docStatusBadge, {
          backgroundColor: doc.status === 'Available' ? '#10B98115' : '#F59E0B15'
        }]}>
              <Text style={[styles.docStatusText, {
            color: doc.status === 'Available' ? '#10B981' : '#F59E0B'
          }]}>
                {doc.status}
              </Text>
            </View>
            <Text style={styles.docTokens}>{doc.tokens} tokens</Text>
          </View>
        </TouchableOpacity>)}
    </View>;
  const renderCareTips = () => <View style={styles.section}>
      <Text style={styles.sectionTitle}>Chronic Care Tips</Text>
      <View style={styles.tipsGrid}>
        {careTips.map(tip => <View key={tip.id} style={[styles.tipCard, SHADOWS.small, {
        borderColor: tip.color + '30'
      }]}>
            <View style={[styles.tipIcon, {
          backgroundColor: tip.color + '15'
        }]}>
              <Ionicons name={tip.icon} size={22} color={tip.color} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.description}</Text>
            </View>
          </View>)}
      </View>
    </View>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {renderHeader()}

        <View style={styles.content}>
          {renderQueueStatus()}
          {renderAIInsight()}
          {renderQuickActions()}
          {renderUpcomingAppointments()}
          {renderDoctors()}
          {renderCareTips()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>CDA Hospital Islamabad</Text>
            <Text style={styles.footerSub}>Chronic Care Management</Text>
          </View>
          <View style={{
          height: hp(10)
        }} />
        </View>
      </ScrollView>

      {/* FAB – Book Appointment */}
      <TouchableOpacity style={styles.fab} onPress={() => navigateTo('BookAppointmentScreen')} activeOpacity={0.85}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabGradient}>
          <Ionicons name="add" size={30} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2)
  },
  // Header
  header: {
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
    paddingBottom: hp(2.5),
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp(1.5),
    marginBottom: hp(1.5)
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-start'
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(5),
    fontWeight: '800'
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: wp(2.8),
    marginTop: hp(0.1)
  },
  greetingRow: {
    marginBottom: hp(1.5)
  },
  greetingHello: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: wp(3.2)
  },
  greetingName: {
    color: COLORS.white,
    fontSize: wp(5.5),
    fontWeight: '800',
    marginTop: hp(0.1)
  },
  greetingCard: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: wp(2.8),
    marginTop: hp(0.1)
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: wp(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)'
  },
  statNumber: {
    fontSize: wp(4.5),
    fontWeight: '800'
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: wp(2.3),
    marginTop: hp(0.1)
  },
  // Queue card
  queueCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: wp(3.5),
    marginTop: hp(1.8),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  queueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.2)
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  queueIconBox: {
    width: wp(10),
    height: wp(10),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  queueCardTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  queueDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: hp(0.15)
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399'
  },
  queueDoctorText: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  queueViewBtn: {
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: 20
  },
  queueViewBtnText: {
    color: COLORS.primary,
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  queueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  queueStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  queueStatValue: {
    fontSize: wp(4),
    fontWeight: '800'
  },
  queueStatLabel: {
    fontSize: wp(2.3),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  // AI
  aiCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: wp(3.5),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1)
  },
  aiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  aiIconBox: {
    width: wp(10),
    height: wp(10),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  aiTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  aiAccuracy: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  aiLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34D39918',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: 10
  },
  aiLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399'
  },
  aiLiveText: {
    fontSize: wp(2.2),
    color: '#34D399',
    fontWeight: '700'
  },
  aiStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.8)
  },
  aiStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  aiDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border
  },
  aiStatValue: {
    fontSize: wp(3.2),
    fontWeight: '800'
  },
  aiStatLabel: {
    fontSize: wp(2.3),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  aiTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '08',
    padding: wp(2.5),
    borderRadius: 10,
    marginBottom: hp(0.5)
  },
  aiTip: {
    flex: 1,
    fontSize: wp(2.7),
    color: COLORS.textSecondary,
    fontStyle: 'italic'
  },
  aiNextSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: hp(0.3)
  },
  aiNextSlotText: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  // Section
  section: {
    marginTop: hp(1.5),
    marginBottom: hp(0.3)
  },
  sectionTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1)
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1)
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5)
  },
  quickCard: {
    width: (width - wp(8) - wp(2.5) * 2) / 3,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(3),
    alignItems: 'center',
    borderWidth: 1
  },
  quickIcon: {
    width: wp(11),
    height: wp(11),
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.4)
  },
  quickTitle: {
    fontSize: wp(2.6),
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center'
  },
  // Appointments
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(3.5),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  apptStatusIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2.5)
  },
  apptInfo: {
    flex: 1
  },
  apptDoctor: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: COLORS.text
  },
  apptDate: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  apptTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: hp(0.2)
  },
  apptToken: {
    fontSize: wp(2.6),
    color: COLORS.primary,
    fontWeight: '600'
  },
  apptRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  apptStatus: {
    fontSize: wp(2.8),
    fontWeight: '700'
  },
  // Empty state
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: wp(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1)
  },
  emptySubtitle: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary,
    marginTop: hp(0.3),
    textAlign: 'center'
  },
  bookNowBtn: {
    marginTop: hp(1.5),
    borderRadius: 20,
    overflow: 'hidden'
  },
  bookNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.9)
  },
  bookNowText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: wp(3.5)
  },
  // Doctors
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(0.7),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  doctorAvatar: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3)
  },
  doctorAvatarText: {
    fontSize: wp(4),
    fontWeight: '800'
  },
  doctorInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: COLORS.text
  },
  doctorSpecialty: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  doctorRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  docStatusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.25),
    borderRadius: 8
  },
  docStatusText: {
    fontSize: wp(2.5),
    fontWeight: '700'
  },
  docTokens: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  // Care tips
  tipsGrid: {
    gap: hp(0.8)
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(3.5),
    borderWidth: 1
  },
  tipIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3)
  },
  tipContent: {
    flex: 1
  },
  tipTitle: {
    fontSize: wp(3.3),
    fontWeight: '600',
    color: COLORS.text
  },
  tipDesc: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: hp(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: hp(1)
  },
  footerText: {
    fontSize: wp(3.5),
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  footerSub: {
    fontSize: wp(2.8),
    color: COLORS.textLight,
    marginTop: hp(0.2)
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: hp(3),
    right: wp(5),
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.4,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  fabGradient: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    justifyContent: 'center',
    alignItems: 'center'
  }
});
export default ChronicDashboard;