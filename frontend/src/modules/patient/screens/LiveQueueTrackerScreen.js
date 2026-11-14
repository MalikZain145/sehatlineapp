import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { SIZES, SHADOWS } from '../../../theme';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const QueueTrackerScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.2, {
      duration: 1500
    }), -1, true);
  }, []);
  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{
      scale: pulse.value
    }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.8, 0.3])
  }));
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.7
    }} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>LIVE QUEUE</Text>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              <View style={styles.badgeDot} />
            </TouchableOpacity>
          </View>

          {/* 🏥 Doctor Info Card */}
          <View style={[styles.doctorBrief, styles.cardShadow]}>
            <LinearGradient colors={[COLORS.white, COLORS.backgroundSecondary]} style={styles.doctorCard}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>DS</Text>
              </View>
              <View>
                <Text style={styles.docName}>Dr. Sarah Ahmed</Text>
                <Text style={styles.deptText}>Cardiology Dept | Room 402</Text>
              </View>
            </LinearGradient>
          </View>

          {/* 🔢 Main Queue Display */}
          <View style={styles.mainDisplay}>
            <Animated.View style={[styles.pulseCircle, animatedPulse]} />
            <View style={styles.tokenCircle}>
              <Text style={styles.tokenLabel}>YOUR TOKEN</Text>
              <Text style={styles.tokenNumber}>A-12</Text>
              <Text style={styles.tokenStatus}>In Progress</Text>
            </View>
          </View>

          {/* 📊 Status Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.cardShadow]}>
              <Ionicons name="people-outline" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>04</Text>
              <Text style={styles.statLabel}>Ahead of You</Text>
            </View>
            <View style={[styles.statBox, styles.cardShadow]}>
              <Ionicons name="time-outline" size={22} color={COLORS.warning} />
              <Text style={styles.statValue}>25m</Text>
              <Text style={styles.statLabel}>Est. Wait</Text>
            </View>
          </View>

          {/* 🕒 Timeline of Current Progress */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Queue Progress</Text>
            
            <TimelineItem token="A-09" status="Currently with Doctor" isCurrent={true} isDone={false} />
            <TimelineItem token="A-10" status="At the Door" isCurrent={false} isDone={false} />
            <TimelineItem token="A-11" status="Waiting" isCurrent={false} isDone={false} />
            
            <View style={styles.yourTurnMarker}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.yourTurnGradient}>
                <Text style={styles.yourTurnText}>YOUR TURN NEXT</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </LinearGradient>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
            <Text style={styles.footerSub}>Live Queue Tracking</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>;
};

// --- Helper Components ---

const TimelineItem = ({
  token,
  status,
  isCurrent,
  isDone
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      <View style={[styles.dot, isCurrent && styles.activeDot]} />
      {!isCurrent && <View style={styles.line} />}
    </View>
    <View style={[styles.timelineCard, isCurrent && styles.activeCard, styles.cardShadow]}>
      <Text style={[styles.timelineToken, isCurrent && styles.activeText]}>{token}</Text>
      <Text style={[styles.timelineStatus, isCurrent && styles.activeText]}>{status}</Text>
      {isCurrent && <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>}
    </View>
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
    height: '100%'
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    padding: wp(5),
    paddingBottom: hp(4)
  },
  // Card Shadow
  cardShadow: {
    ...SHADOWS.medium
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2)
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: '900',
    letterSpacing: 2
  },
  notifBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.white
  },
  // Doctor Card
  doctorBrief: {
    marginBottom: hp(2)
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: wp(3)
  },
  doctorAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  doctorAvatarText: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: 'bold'
  },
  docName: {
    color: COLORS.text,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  deptText: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    marginTop: hp(0.2)
  },
  // Main Display
  mainDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(28),
    marginBottom: hp(1)
  },
  pulseCircle: {
    position: 'absolute',
    width: wp(45),
    height: wp(45),
    borderRadius: wp(22.5),
    backgroundColor: COLORS.primary + '30'
  },
  tokenCircle: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    borderWidth: 2,
    borderColor: COLORS.primary + '40'
  },
  tokenLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '900',
    opacity: 0.6,
    letterSpacing: 1
  },
  tokenNumber: {
    color: COLORS.primary,
    fontSize: wp(12),
    fontWeight: '900'
  },
  tokenStatus: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '500',
    marginTop: hp(0.2)
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1),
    marginBottom: hp(2)
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.card,
    padding: wp(3.5),
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statValue: {
    color: COLORS.text,
    fontSize: wp(6),
    fontWeight: 'bold',
    marginVertical: hp(0.3)
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(3)
  },
  // Timeline Section
  timelineSection: {
    marginTop: hp(2)
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: wp(4.5),
    fontWeight: 'bold',
    marginBottom: hp(1.5)
  },
  timelineItem: {
    flexDirection: 'row',
    height: hp(8)
  },
  timelineLeft: {
    alignItems: 'center',
    width: wp(8)
  },
  dot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: COLORS.border
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: wp(1.75),
    ...SHADOWS.small
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border
  },
  timelineCard: {
    flex: 1,
    marginLeft: wp(3.5),
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: wp(3.5),
    justifyContent: 'center',
    height: hp(6.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative'
  },
  activeCard: {
    borderColor: COLORS.primary,
    borderWidth: 2
  },
  timelineToken: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: wp(4)
  },
  timelineStatus: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    marginTop: hp(0.1)
  },
  activeText: {
    color: COLORS.primary
  },
  liveBadge: {
    position: 'absolute',
    top: hp(0.5),
    right: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.2),
    borderRadius: 8
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger
  },
  liveText: {
    color: COLORS.danger,
    fontSize: wp(2),
    fontWeight: '700'
  },
  yourTurnMarker: {
    marginTop: hp(1.5),
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.medium
  },
  yourTurnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    gap: 10
  },
  yourTurnText: {
    color: COLORS.white,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: wp(3.5)
  },
  // Footer
  footer: {
    marginTop: hp(3),
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  footerText: {
    color: COLORS.primary,
    fontSize: wp(3.2),
    fontWeight: '700'
  },
  footerSub: {
    color: COLORS.textSecondary,
    fontSize: wp(2.5),
    marginTop: hp(0.2)
  }
});
export default QueueTrackerScreen;