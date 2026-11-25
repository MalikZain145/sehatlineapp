// Admin → System Ratings. Patient-submitted ratings/feedback about the app,
// queue, staff and facilities — with a summary (average + star distribution)
// and a filterable list. Admin can mark each as reviewed.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'app', label: 'App' },
  { key: 'queue', label: 'Queue' },
  { key: 'staff', label: 'Staff' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'other', label: 'Other' },
];
const CAT_LABEL = { app: 'App', queue: 'Queue', staff: 'Staff', facilities: 'Facilities', other: 'Other' };

export default function AdminRatingsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ average: 0, count: 0, distribution: {}, ratings: [] });
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat = filter) => {
    try { const res = await adminService.getRatings(cat); if (res?.success) setData(res); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { load(filter); }, [filter, load]);

  const markReviewed = async (id) => {
    try {
      await adminService.markRatingReviewed(id);
      setData((d) => ({ ...d, ratings: d.ratings.map((r) => (r.id === id ? { ...r, reviewed: true } : r)) }));
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not update.', icon: 'alert-circle' }); }
  };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  const Stars = ({ n, size = 14 }) => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= n ? 'star' : 'star-outline'} size={size} color={s <= n ? '#F59E0B' : COLORS.textLight} />
      ))}
    </View>
  );

  const dist = data.distribution || {};
  const maxDist = Math.max(1, ...[5, 4, 3, 2, 1].map((s) => dist[s] || 0));

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>System Ratings</Text></View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} progressViewOffset={80} />}
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.avgNum}>{data.average || 0}</Text>
              <Stars n={Math.round(data.average || 0)} size={16} />
              <Text style={styles.totalText}>{data.count || 0} rating{data.count === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.summaryRight}>
              {[5, 4, 3, 2, 1].map((s) => (
                <View key={s} style={styles.distRow}>
                  <Text style={styles.distStar}>{s}★</Text>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${((dist[s] || 0) / maxDist) * 100}%` }]} />
                  </View>
                  <Text style={styles.distCount}>{dist[s] || 0}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Category filter */}
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = filter === c.key;
              return (
                <TouchableOpacity key={c.key} style={[styles.chip, active && styles.chipActive]} onPress={() => { setLoading(true); setFilter(c.key); }} activeOpacity={0.8}>
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* List */}
          {data.ratings.length === 0 ? (
            <Text style={styles.empty}>No ratings in this category yet.</Text>
          ) : data.ratings.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Stars n={r.rating} />
                <View style={styles.catBadge}><Text style={styles.catBadgeText}>{CAT_LABEL[r.category] || 'Other'}</Text></View>
                {r.reviewed
                  ? <View style={styles.reviewedTag}><Ionicons name="checkmark-done" size={13} color={COLORS.primary} /><Text style={styles.reviewedText}>Reviewed</Text></View>
                  : <TouchableOpacity style={styles.reviewBtn} onPress={() => markReviewed(r.id)}><Text style={styles.reviewBtnText}>Mark reviewed</Text></TouchableOpacity>}
              </View>
              {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
              <Text style={styles.meta}>{r.userName} · {fmt(r.createdAt)}{r.platform ? ` · ${r.platform}` : ''}{r.appVersion ? ` · v${r.appVersion}` : ''}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 14, paddingBottom: 12, backgroundColor: COLORS.background,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  summaryCard: {
    flexDirection: 'row', gap: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', marginBottom: 14,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 14, borderRightWidth: 1, borderRightColor: COLORS.border || '#E5E7EB' },
  avgNum: { fontSize: 40, fontWeight: '900', color: COLORS.text, lineHeight: 44 },
  totalText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  summaryRight: { flex: 1, justifyContent: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  distStar: { fontSize: 11, color: COLORS.textSecondary, width: 22 },
  distTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: COLORS.primary + '18', overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  distCount: { fontSize: 11, color: COLORS.textSecondary, width: 22, textAlign: 'right' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '10' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700' },

  empty: { color: COLORS.textLight, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { backgroundColor: COLORS.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary },
  reviewedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  reviewedText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  reviewBtn: { marginLeft: 'auto', backgroundColor: COLORS.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  reviewBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.primary },
  comment: { fontSize: 13.5, color: COLORS.text, marginTop: 8, lineHeight: 19 },
  meta: { fontSize: 11, color: COLORS.textLight, marginTop: 8 },
});
