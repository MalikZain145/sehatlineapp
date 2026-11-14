// ReportsListScreen — the patient's lab reports.
//
// Reports are produced by the laboratory (future module) and land here. The
// patient can search, open a report to see its full analysis (see
// ReportDetailScreen), and download a proper Capital Hospital / CDA PDF.
// Redesigned to match the rest of the app (ScreenHeader, teal/mint cards).

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import FadeInView from '../../../components/ui/FadeInView';
import useBottomInset from '../../../hooks/useBottomInset';
import reportsService from '../services/reportsService';
import { useTheme } from "../../../context/ThemeContext";
const CATEGORY_ICON = {
  'Blood Test': 'water',
  'Lipid Profile': 'heart',
  'Urine Test': 'flask',
  'Liver Function': 'fitness',
  'Thyroid': 'body'
};
export default function ReportsListScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    normal: 0,
    abnormal: 0
  });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });
  const load = useCallback(async () => {
    try {
      const res = await reportsService.list();
      setReports(res?.reports || []);
      setSummary(res?.summary || {
        total: 0,
        normal: 0,
        abnormal: 0
      });
    } catch (e) {/* offline */} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => {
      focus && focus();
    };
  }, [load, navigation]);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  };
  const loadDemo = async () => {
    setBusy(true);
    try {
      const res = await reportsService.seedDemo();
      await load();
      setPrompt({
        visible: true,
        variant: 'success',
        icon: 'flask',
        title: 'Sample Reports Added',
        message: res?.message || 'Sample reports added for you to explore.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
    } catch (e) {
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: 'alert-circle',
        title: 'Could Not Add',
        message: e.message || 'Please try again.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
    } finally {
      setBusy(false);
    }
  };
  const fmt = iso => new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const filtered = reports.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.category || '').toLowerCase().includes(search.toLowerCase()));
  return <View style={styles.container}>
      <ScreenHeader title="My Reports" subtitle="Lab results" onBack={() => navigation.goBack()} />

      {loading ? <SkeletonList count={5} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 30
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
          {reports.length === 0 ? <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="document-text" size={34} color={COLORS.primary} /></View>
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptySub}>Your lab reports from Capital Hospital will appear here once your tests are done. Tap a report to see its analysis and download it.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={loadDemo} disabled={busy} activeOpacity={0.9}>
                {busy ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="flask" size={16} color="#FFF" /><Text style={styles.emptyBtnText}>Load Sample Reports</Text></>}
              </TouchableOpacity>
            </View> : <>
              {/* Summary */}
              <FadeInView delay={40}>
                <View style={styles.statRow}>
                  <View style={styles.statCard}><Text style={styles.statNum}>{summary.total}</Text><Text style={styles.statLabel}>Total</Text></View>
                  <View style={styles.statCard}><Text style={[styles.statNum, {
                color: COLORS.success
              }]}>{summary.normal}</Text><Text style={styles.statLabel}>Normal</Text></View>
                  <View style={styles.statCard}><Text style={[styles.statNum, {
                color: COLORS.danger
              }]}>{summary.abnormal}</Text><Text style={styles.statLabel}>Abnormal</Text></View>
                </View>
              </FadeInView>

              {/* Search */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.textLight} />
                <TextInput style={styles.searchInput} placeholder="Search reports…" placeholderTextColor={COLORS.textLight} value={search} onChangeText={setSearch} />
                {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textLight} /></TouchableOpacity>}
              </View>

              {/* Report cards */}
              {filtered.map(r => {
          const abnormal = r.overall === 'Abnormal';
          const color = abnormal ? COLORS.danger : COLORS.success;
          return <TouchableOpacity key={r._id} style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('ReportDetailScreen', {
            reportId: r._id
          })}>
                    <View style={[styles.cardIcon, {
              backgroundColor: color + '15'
            }]}>
                      <Ionicons name={CATEGORY_ICON[r.category] || 'flask'} size={22} color={color} />
                    </View>
                    <View style={{
              flex: 1
            }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.cardMeta}>{fmt(r.reportedAt)}{r.referredBy ? ` • ${r.referredBy}` : ''}</Text>
                      <Text style={styles.cardSub}>
                        {abnormal ? `${r.abnormalCount} of ${r.total} out of range` : 'All parameters normal'}
                      </Text>
                    </View>
                    <View style={{
              alignItems: 'flex-end',
              gap: 6
            }}>
                      <View style={[styles.pill, {
                backgroundColor: color + '15'
              }]}>
                        <Text style={[styles.pillText, {
                  color
                }]}>{r.overall}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                    </View>
                  </TouchableOpacity>;
        })}
            </>}
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
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
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
  },
  statRow: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text
  },
  statLabel: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '600'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginTop: 18,
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 12
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.text
  },
  cardMeta: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 3
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500'
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800'
  }
});