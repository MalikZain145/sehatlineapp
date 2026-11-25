// Admin → Analytics. Real charts from the /admin/analytics endpoint: weekly
// patient-flow bar chart, department-wise donut, and KPI cards. No mock data.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Dimensions, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const SCREEN_W = Dimensions.get('window').width;
const SLICE = ['#0BAA9D', '#8B5CF6', '#0EA5E9', '#F59E0B', '#94A3B8'];

export default function AdminAnalyticsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminService.getAnalytics(); if (res?.success) setData(res); } catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(11, 170, 157, ${o})`,
    labelColor: () => COLORS.textSecondary,
    barPercentage: 0.55,
    propsForBackgroundLines: { stroke: (COLORS.border || '#E5E7EB'), strokeDasharray: '' },
  };

  const weekly = data?.weekly || { labels: [], appointments: [] };
  const depts = data?.departments || [];
  const kpis = data?.kpis || {};

  const kpiCards = [
    { label: 'Total Patients', value: (kpis.totalPatients ?? 0).toLocaleString('en-US'), icon: 'people', color: '#0BAA9D' },
    { label: 'Appointments', value: (kpis.appointments ?? 0).toLocaleString('en-US'), icon: 'calendar', color: '#8B5CF6', sub: 'last 30 days' },
    { label: 'No-Show Rate', value: `${kpis.noShowRate ?? 0}%`, icon: 'git-branch', color: '#F59E0B' },
    { label: 'Avg Wait Time', value: `${kpis.avgWaitMin ?? 0} min`, icon: 'time', color: '#0EA5E9' },
  ];

  const pieData = depts.map((d, i) => ({
    name: d.name, population: d.count, color: SLICE[i % SLICE.length], legendFontColor: COLORS.textSecondary, legendFontSize: 12,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.weekChip}><Text style={styles.weekChipText}>This Week</Text></View>
      </View>

      {loading ? <SkeletonScreen cards={3} topInset={false} /> : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {/* Patient flow */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient Flow</Text>
            <BarChart
              data={{ labels: weekly.labels, datasets: [{ data: weekly.appointments.length ? weekly.appointments : [0] }] }}
              width={SCREEN_W - 52}
              height={200}
              fromZero
              showValuesOnTopOfBars={false}
              withInnerLines
              chartConfig={chartConfig}
              style={{ marginLeft: -8, marginTop: 8 }}
            />
            <Text style={styles.cardHint}>Appointments per day (last 7 days)</Text>
          </View>

          {/* KPI cards */}
          <View style={styles.grid}>
            {kpiCards.map((k) => (
              <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.color + (isDark ? '24' : '12') }]}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                  <View style={[styles.kpiIcon, { backgroundColor: k.color + '26' }]}><Ionicons name={k.icon} size={16} color={k.color} /></View>
                </View>
                <Text style={styles.kpiValue}>{k.value}</Text>
                {!!k.sub && <Text style={styles.kpiSub}>{k.sub}</Text>}
              </View>
            ))}
          </View>

          {/* Department wise */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Department Wise</Text>
            {pieData.length ? (
              <View style={styles.deptRow}>
                <PieChart
                  data={pieData}
                  width={150}
                  height={150}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="30"
                  hasLegend={false}
                  center={[0, 0]}
                  absolute
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  {depts.map((d, i) => (
                    <View key={d.name} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: SLICE[i % SLICE.length] }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>{d.name}</Text>
                      <Text style={styles.legendPct}>{d.pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : <Text style={styles.cardHint}>No visit data yet.</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 12,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border || '#E5E7EB',
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  weekChip: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  weekChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardHint: { fontSize: 11.5, color: COLORS.textLight, marginTop: 6, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  kpiCard: { width: '47.5%', flexGrow: 1, borderRadius: 18, padding: 15 },
  kpiTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', flex: 1, marginRight: 8 },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 10 },
  kpiSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  deptRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  legendPct: { fontSize: 13, fontWeight: '800', color: COLORS.text },
});
