// HealthCampsScreen — Free Health Camps & Screening Drives.
//
// Government hospitals run free screening camps (diabetes, BP, eye,
// hepatitis…) that patients rarely hear about in time. This lists upcoming
// camps and lets a patient register in one tap — uniquely useful, public-
// health focused, and fitting for a government hospital app.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import FadeInView from '../../../components/ui/FadeInView';
import useBottomInset from '../../../hooks/useBottomInset';
import healthCampsService from '../services/healthCampsService';
import { onHealthCampUpdate } from '../../../services/socket';

// Category → icon + accent colour.
import { useTheme } from "../../../context/ThemeContext";
const CAT = {
  'Diabetes': {
    icon: 'water',
    color: '#0BAA9D'
  },
  'Blood Pressure': {
    icon: 'heart',
    color: '#EF4444'
  },
  'Eye': {
    icon: 'eye',
    color: '#8B5CF6'
  },
  'Hepatitis': {
    icon: 'flask',
    color: '#F59E0B'
  },
  'Heart': {
    icon: 'heart-circle',
    color: '#EF4444'
  },
  'General': {
    icon: 'medical',
    color: '#0BAA9D'
  },
  'Dental': {
    icon: 'happy',
    color: '#3B82F6'
  },
  'Women Health': {
    icon: 'female',
    color: '#EC4899'
  }
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FILTERS = [{
  key: 'upcoming',
  label: 'Upcoming'
}, {
  key: 'mine',
  label: 'My Camps'
}];
export default function HealthCampsScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [filter, setFilter] = useState('upcoming');
  const [camps, setCamps] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });
  const load = useCallback(async () => {
    try {
      const [up, my] = await Promise.all([healthCampsService.list(), healthCampsService.mine()]);
      setCamps(up?.camps || []);
      setMine(my?.camps || []);
    } catch (e) {/* offline */} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const unsub = onHealthCampUpdate(() => load());
    const focus = navigation.addListener?.('focus', load);
    return () => {
      unsub && unsub();
      focus && focus();
    };
  }, [load, navigation]);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  };
  const info = (title, message, variant = 'warning', icon = 'alert-circle') => setPrompt({
    visible: true,
    variant,
    icon,
    title,
    message,
    primaryLabel: 'OK',
    onPrimary: closePrompt
  });
  const loadDemo = async () => {
    setBusy(true);
    try {
      const res = await healthCampsService.seedDemo();
      await load();
      info('Camps Loaded', res?.message || 'Upcoming camps added.', 'success', 'checkmark-circle');
    } catch (e) {
      info('Could Not Load', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const register = camp => {
    setPrompt({
      visible: true,
      variant: 'default',
      icon: 'people-circle',
      title: 'Register for this camp?',
      message: `${camp.title}\n${dateLabel(camp.date)} · ${camp.startTime}–${camp.endTime}\n${camp.venue}`,
      primaryLabel: 'Register',
      onPrimary: async () => {
        closePrompt();
        setBusy(true);
        try {
          const res = await healthCampsService.register(camp._id);
          await load();
          info('Registered 💚', res?.message || 'You are registered.', 'success', 'checkmark-circle');
        } catch (e) {
          info('Could Not Register', e.message || 'Please try again.');
        } finally {
          setBusy(false);
        }
      },
      secondaryLabel: 'Cancel',
      onSecondary: closePrompt
    });
  };
  const unregister = camp => {
    setPrompt({
      visible: true,
      variant: 'warning',
      icon: 'close-circle',
      title: 'Cancel Registration?',
      message: `Cancel your spot at "${camp.title}"?`,
      destructive: true,
      primaryLabel: 'Cancel Spot',
      onPrimary: async () => {
        closePrompt();
        try {
          await healthCampsService.unregister(camp._id);
          await load();
        } catch (e) {}
      },
      secondaryLabel: 'Keep',
      onSecondary: closePrompt
    });
  };
  const dateLabel = d => {
    const [y, m, day] = d.split('-').map(Number);
    return `${day} ${MON[m - 1]} ${y}`;
  };
  const daysUntil = d => {
    const [y, m, day] = d.split('-').map(Number);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const target = new Date(y, m - 1, day);
    const n = Math.round((target - t) / 86400000);
    return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`;
  };
  const renderCamp = camp => {
    const meta = CAT[camp.category] || CAT.General;
    const [y, m, day] = camp.date.split('-').map(Number);
    const registered = camp.isRegistered;
    return <View key={camp._id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{day}</Text>
            <Text style={styles.dateMon}>{MON[m - 1]}</Text>
          </View>
          <View style={{
          flex: 1
        }}>
            <View style={styles.catRow}>
              <View style={[styles.catPill, {
              backgroundColor: meta.color + '18'
            }]}>
                <Ionicons name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.catText, {
                color: meta.color
              }]}>{camp.category}</Text>
              </View>
              {camp.free && <View style={styles.freePill}><Text style={styles.freeText}>FREE</Text></View>}
            </View>
            <Text style={styles.campTitle}>{camp.title}</Text>
            <Text style={styles.whenText}>{daysUntil(camp.date)} · {camp.startTime}–{camp.endTime}</Text>
          </View>
        </View>

        {!!camp.description && <Text style={styles.desc}>{camp.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color={COLORS.textLight} /><Text style={styles.metaText}>{camp.venue}</Text></View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="people-outline" size={13} color={COLORS.textLight} /><Text style={styles.metaText}>{camp.registeredCount} registered{camp.seatsLeft != null ? ` · ${camp.seatsLeft} seats left` : ''}</Text></View>
        </View>

        {registered ? <View style={styles.regRow}>
            <View style={styles.regBadge}><Ionicons name="checkmark-circle" size={15} color={COLORS.success} /><Text style={styles.regText}>You're registered</Text></View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => unregister(camp)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View> : <TouchableOpacity style={[styles.regBtn, camp.seatsLeft === 0 && styles.regBtnDisabled]} onPress={() => camp.seatsLeft !== 0 && register(camp)} disabled={camp.seatsLeft === 0} activeOpacity={0.9}>
            <Ionicons name="add-circle" size={16} color="#FFF" />
            <Text style={styles.regBtnText}>{camp.seatsLeft === 0 ? 'Camp Full' : 'Register (Free)'}</Text>
          </TouchableOpacity>}
      </View>;
  };
  const listData = filter === 'mine' ? mine : camps;
  return <View style={styles.container}>
      <ScreenHeader title="Awareness Camps" subtitle="Free screening & awareness" onBack={() => navigation.goBack()} />

      {loading ? <SkeletonList count={5} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 30
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>

          <View style={styles.banner}>
            <Ionicons name="megaphone" size={24} color={COLORS.primary} />
            <Text style={styles.bannerText}>Free screening camps at Capital Hospital & nearby. Get checked early — register in one tap.</Text>
          </View>

          <View style={styles.segments}>
            {FILTERS.map(f => {
          const active = filter === f.key;
          const count = f.key === 'mine' ? mine.length : camps.length;
          return <TouchableOpacity key={f.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => setFilter(f.key)}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{f.label}{count > 0 ? ` (${count})` : ''}</Text>
                </TouchableOpacity>;
        })}
          </View>

          {listData.length === 0 ? <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="people-circle" size={34} color={COLORS.primary} /></View>
              <Text style={styles.emptyTitle}>{filter === 'mine' ? 'No registrations yet' : 'No upcoming camps'}</Text>
              <Text style={styles.emptySub}>{filter === 'mine' ? 'Register for a camp and it will show here.' : 'Free screening camps will be listed here as the hospital schedules them.'}</Text>
              {/* "Load Sample Camps" removed — camps come only from the hospital (admin). */}
            </View> : <FadeInView delay={40}>{listData.map(renderCamp)}</FadeInView>}
        </ScrollView>}

      <ThemedPrompt {...prompt} />
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    // Light teal-tinted banner (was dark slate) — follows the teal/white theme.
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    borderRadius: 16,
    padding: 14
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.text,
    lineHeight: 18
  },
  segments: {
    flexDirection: 'row',
    // Light teal-tinted track (was dark slate).
    backgroundColor: COLORS.primary + '12',
    borderRadius: 12,
    padding: 4,
    marginTop: 16
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center'
  },
  segmentActive: {
    // Active pill is teal with white text.
    backgroundColor: COLORS.primary
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginTop: 12
  },
  cardTop: {
    flexDirection: 'row',
    gap: 14
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dateDay: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900'
  },
  dateMon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700'
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9
  },
  catText: {
    fontSize: 10.5,
    fontWeight: '800'
  },
  freePill: {
    backgroundColor: COLORS.success + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9
  },
  freeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.success
  },
  campTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6
  },
  whenText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '600'
  },
  desc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 18
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    flex: 1
  },
  regBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14
  },
  regBtnDisabled: {
    backgroundColor: COLORS.tealLight
  },
  regBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14
  },
  regBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  regText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.success
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937'
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 10
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 6
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 22
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  }
});