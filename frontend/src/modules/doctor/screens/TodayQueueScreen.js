// src/screens/doctor/TodayQueueScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Platform, StatusBar, Image, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import doctorService from '../services/doctorService';
import { onQueueUpdate } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { visitTimeLabel } from '../utils/visitTime';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const QUEUE_KEY = '@sehatline_queue';

// ─── Check if Break Time ─────────────────────────────────────────────
const isBreakTime = () => {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const breakStart = 12 * 60 + 30;
  const breakEnd = 13 * 60;
  return currentMinute >= breakStart && currentMinute < breakEnd;
};

// No mock queue — the queue is always the live backend queue (empty when none).

const TodayQueueScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [usingMockData, setUsingMockData] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  useEffect(() => {
    getCurrentDate();
    loadData();
    checkBreakStatus();

    // Live: refetch this doctor's queue whenever the server broadcasts a change.
    const unsubQueue = onQueueUpdate(() => loadData());
    const unsubFocus = navigation.addListener('focus', () => loadData());
    const interval = setInterval(() => {
      checkBreakStatus();
    }, 60000);
    return () => {
      clearInterval(interval);
      if (unsubQueue) unsubQueue();
      unsubFocus();
    };
  }, []);
  const getCurrentDate = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[now.getDay()];
    const dateStr = now.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    setCurrentDate(`${dayName}, ${dateStr}`);
  };
  const checkBreakStatus = () => {
    setIsBreak(isBreakTime());
  };
  const loadData = async () => {
    // 1) LIVE per-doctor queue from the backend (this doctor's own patients).
    try {
      const q = await doctorService.getMyQueue();
      if (Array.isArray(q?.queue)) {
        setQueue(q.queue.map(p => ({
          id: p.tokenId,
          tokenId: p.tokenId,
          name: p.patientName,
          token: p.token || p.tokenNumber,
          age: p.age,
          gender: p.gender || '',
          disease: p.reason || p.chronicIllness || 'Chronic OPD',
          status: p.status,
          priorityLevel: p.priorityLevel,
          estWaitMin: p.estWaitMin,
          slotTime: p.slotTime,
          time: visitTimeLabel(p)
        })));
        setUsingMockData(false);
        setLoading(false);
        return;
      }
    } catch (e) {/* offline — show real empty, never mock */}

    // No mock. If the server is unreachable, show an empty queue (0), so the
    // doctor only ever sees real patients.
    setUsingMockData(false);
    setQueue([]);
    setLoading(false);
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    checkBreakStatus();
    setRefreshing(false);
  };
  const handlePatientPress = item => {
    if (isBreak) {
      Alert.alert('Break Time', 'Consultation is on break from 12:30 PM to 1:00 PM.');
      return;
    }
    Alert.alert('Call Patient', `Call ${item.name} (Token #${item.token})?`, [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Call Now',
      onPress: () => {
        navigation.navigate('CallNextPatientScreen', {
          patient: item
        });
      }
    }]);
  };

  // ─── RENDER QUEUE ITEM ──────────────────────────────────────────
  const QueueItem = ({
    item
  }) => {
    return <TouchableOpacity style={styles.queueItem} onPress={() => handlePatientPress(item)} activeOpacity={0.7} disabled={isBreak}>
        <View style={styles.queueItemLeft}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>{item.token}</Text>
          </View>
          <View style={styles.queueItemInfo}>
            <Text style={styles.queueItemName}>{item.name}</Text>
            <Text style={styles.queueItemDetail}>
              {item.age} yrs | {item.gender} | {item.disease}
            </Text>
          </View>
        </View>
      </TouchableOpacity>;
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Today's Queue</Text>

          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} activeOpacity={0.6}>
            <Ionicons name="refresh-outline" size={25} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── DATE ───────────────────────────────────────────── */}
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={wp(4)} color="#FFFFFF" />
          <Text style={styles.dateText}>{currentDate}</Text>
          {usingMockData && <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Demo</Text>
            </View>}
        </View>

        {/* ─── BREAK TIME BANNER ────────────────────────────────────── */}
        {isBreak && <View style={styles.breakBanner}>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.white} />
            <Text style={styles.breakBannerText}>Break Time (12:30 PM - 1:00 PM)</Text>
          </View>}

        {/* ─── QUEUE LIST ─────────────────────────────────────────────── */}
        <View style={styles.listWrapper}>
          {loading ? <SkeletonList count={6} /> : !isBreak && queue.length > 0 ? queue.map(item => <QueueItem key={item.id} item={item} />) : isBreak ? <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={wp(12)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Break Time</Text>
              <Text style={styles.emptySub}>Consultation will resume at 1:00 PM</Text>
            </View> : <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={wp(12)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No Patients</Text>
              <Text style={styles.emptySub}>Queue is empty</Text>
            </View>}
        </View>

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerSub}>Today's Queue</Text>
        </View>
      </ScrollView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    paddingBottom: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18,
    backgroundColor: COLORS.background
  },
  iconBtn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 0
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 90,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    gap: 8
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1
  },
  mockBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  mockBadgeText: {
    fontSize: 9,
    color: COLORS.warning,
    fontWeight: '600'
  },
  breakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    gap: 10
  },
  breakBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white
  },
  listWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 0
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  tokenBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30'
  },
  tokenText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  queueItemInfo: {
    flex: 1
  },
  queueItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  queueItemDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4
  },
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
export default TodayQueueScreen;