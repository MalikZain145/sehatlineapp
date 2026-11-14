import React, { useState, useEffect } from 'react';
import BrandLogo from '../../../components/ui/BrandLogo';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Platform, Image } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const HospitalTimingsScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // ✅ State for real-time updates
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timings, setTimings] = useState([{
    id: 1,
    dept: 'OPD Services',
    time: '08:00 AM - 02:00 PM',
    color: '#10B981',
    icon: 'people-outline',
    bg: '#10B98115'
  }, {
    id: 2,
    dept: 'Pharmacy',
    time: '08:00 AM - 08:00 PM',
    color: '#10B981',
    icon: 'medkit-outline',
    bg: '#10B98115'
  }, {
    id: 3,
    dept: 'Radiology (X-Ray/MRI)',
    time: '08:00 AM - 08:00 PM',
    color: '#10B981',
    icon: 'scan-outline',
    bg: '#10B98115'
  }, {
    id: 4,
    dept: 'Laboratory',
    time: '07:00 AM - 10:00 PM',
    color: '#10B981',
    icon: 'flask-outline',
    bg: '#10B98115'
  }, {
    id: 5,
    dept: 'Cardiology OPD',
    time: '09:00 AM - 03:00 PM',
    color: '#10B981',
    icon: 'heart-outline',
    bg: '#10B98115'
  }, {
    id: 6,
    dept: 'Chronic Disease Clinic',
    time: '09:00 AM - 02:00 PM',
    color: '#10B981',
    icon: 'medical-outline',
    bg: '#10B98115'
  }]);

  // ✅ Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // ✅ Get current status based on time
  const getCurrentStatus = timeRange => {
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Handle 24-hour services
    if (timeRange.includes('24 Hours')) return 'Open Now';
    const parseTime = timeStr => {
      const [time, meridian] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (meridian === 'PM' && hours !== 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    const [startStr, endStr] = timeRange.split(' - ');
    const startMinutes = parseTime(startStr);
    const endMinutes = parseTime(endStr);
    const isOpen = currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes;
    const isClosingSoon = isOpen && endMinutes - currentTotalMinutes <= 60;
    if (isClosingSoon) return 'Closing Soon';
    if (isOpen) return 'Open Now';
    return 'Closed';
  };
  const getStatusStyle = status => {
    switch (status) {
      case 'Open Now':
        return {
          bg: '#10B98115',
          color: '#10B981',
          dot: '#10B981'
        };
      case 'Closing Soon':
        return {
          bg: '#F59E0B15',
          color: '#F59E0B',
          dot: '#F59E0B'
        };
      case 'Closed':
        return {
          bg: '#EF444415',
          color: '#EF4444',
          dot: '#EF4444'
        };
      default:
        return {
          bg: '#64748B15',
          color: '#64748B',
          dot: '#64748B'
        };
    }
  };
  const renderHeader = () => <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.headerGradient} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 0
  }}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.logoContainer}>
              <BrandLogo style={styles.logoImage} />
            </View>
            <Text style={styles.headerTitle}>Hospital Timings</Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('HomeScreen')} activeOpacity={0.7}>
            <Ionicons name="home-outline" size={wp(5.5)} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>;
  const renderTimingCard = item => {
    const currentStatus = getCurrentStatus(item.time);
    const statusStyle = getStatusStyle(currentStatus);
    return <View key={item.id} style={[styles.timingCard, SHADOWS.small]}>
        <LinearGradient colors={[COLORS.primary + '08', 'transparent']} style={styles.timingGradient}>
          <View style={styles.timingLeft}>
            <View style={[styles.timingIcon, {
            backgroundColor: item.bg
          }]}>
              <Ionicons name={item.icon} size={wp(5)} color={item.color} />
            </View>
            <View style={styles.timingInfo}>
              <Text style={styles.deptName}>{item.dept}</Text>
              <Text style={styles.timeVal}>
                <Ionicons name="time-outline" size={wp(3)} color={COLORS.textSecondary} />
                {' '}{item.time}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, {
          backgroundColor: statusStyle.bg
        }]}>
            <View style={[styles.statusDot, {
            backgroundColor: statusStyle.dot
          }]} />
            <Text style={[styles.statusText, {
            color: statusStyle.color
          }]}>
              {currentStatus}
            </Text>
          </View>
        </LinearGradient>
      </View>;
  };

  // ✅ Format current date and time
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.primary} translucent={true} />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.2
    }} style={styles.gradientBackground} />

      {renderHeader()}

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Today's Date and Time - Live Update */}
          <View style={styles.todaySection}>
            <Text style={styles.todayTitle}>Today's Schedule</Text>
            <Text style={styles.todayDate}>{formattedDate}</Text>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={wp(4)} color={COLORS.primary} />
              <Text style={styles.todayTime}>{formattedTime}</Text>
              
            </View>
            <Text style={styles.todaySub}>CDA Hospital • Islamabad</Text>
          </View>

          {timings.map(item => renderTimingCard(item))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine • CDA Hospital Islamabad</Text>
            <Text style={styles.footerSub}>Timings subject to change on public holidays</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(25)
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
    paddingTop: hp(0.5)
  },
  // ─── Header ────────────────────────────────────────────────────────────
  headerGradient: {
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(0.5) : hp(0.8),
    paddingBottom: hp(1.5),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.medium
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  logoImage: {
    width: 19,
    height: 19
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  // ─── Today Section ────────────────────────────────────────────────────
  todaySection: {
    marginBottom: hp(2),
    marginTop: hp(0.5)
  },
  todayTitle: {
    fontSize: wp(5),
    fontWeight: 'bold',
    color: COLORS.text
  },
  todayDate: {
    fontSize: wp(3.8),
    color: COLORS.textSecondary,
    marginTop: hp(0.2)
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.1),
    gap: wp(1.5)
  },
  todayTime: {
    fontSize: wp(3.5),
    color: COLORS.primary,
    fontWeight: '600'
  },
  liveDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#EF4444',
    marginLeft: wp(1)
  },
  liveText: {
    fontSize: wp(2.5),
    color: '#EF4444',
    fontWeight: '700'
  },
  todaySub: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  // ─── Timing Card ──────────────────────────────────────────────────────
  timingCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  timingGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(3.5)
  },
  timingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: wp(3)
  },
  timingIcon: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(2.8),
    alignItems: 'center',
    justifyContent: 'center'
  },
  timingInfo: {
    flex: 1
  },
  deptName: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: COLORS.text
  },
  timeVal: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(4),
    gap: wp(1)
  },
  statusDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75)
  },
  statusText: {
    fontSize: wp(2.5),
    fontWeight: '600'
  },
  // ─── Footer ──────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: hp(2),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  footerText: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  footerSub: {
    fontSize: wp(2.5),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  }
});
export default HospitalTimingsScreen;