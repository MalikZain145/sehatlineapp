// AdminSystemScreen — the live operations monitor. Shows, in real time, the
// queue-model figures the app runs on (M/M/s utilization, average wait,
// expected queue length per department), today's throughput, live traffic and
// app health, plus the algorithm record. Auto-refreshes every few seconds while
// on screen, and immediately on any admin socket event. Also exports the data.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  StatusBar, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../../context/ThemeContext';
import adminService from '../services/adminService';
import { onAdminUpdate } from '../../../services/socket';
import { API_BASE_URL } from '../../../config/api.config';
import { showInfo, showConfirm } from '../../../components/confirm';
import { reloadApp } from '../../../utils/appReload';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const REFRESH_MS = 5000; // live poll cadence

const HEALTH_COLOR = { healthy: '#10B981', busy: '#F59E0B', degraded: '#EF4444' };
const utilColor = (u) => (u >= 90 ? '#EF4444' : u >= 70 ? '#F59E0B' : '#10B981');

function fmtUptime(sec) {
  if (!sec && sec !== 0) return '—';
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AdminSystemScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timer = useRef(null);

  const [cache, setCache] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const loadCache = useCallback(async () => {
    try { const res = await adminService.getSystemCache(); if (res?.success) setCache(res.cache); } catch (e) { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getSystemMetrics();
      if (res?.success) { setData(res); setUpdatedAt(new Date()); }
    } catch (e) { /* keep last snapshot */ }
    finally { setLoading(false); setRefreshing(false); }
    loadCache();
  }, [loadCache]);

  const handleClearCache = () => {
    showConfirm({
      title: 'Clear System Cache',
      message: `Remove ${cache?.itemCount || 0} cached item(s) to optimize the system? This only clears ended sessions and old read notifications — active users are never affected.`,
      confirmLabel: 'Clear & Optimize', icon: 'sparkles-outline',
      onConfirm: async () => {
        setClearing(true);
        try {
          const res = await adminService.clearSystemCache();
          await loadCache();
          showInfo({ title: 'System Optimized', message: res?.message || 'Cache cleared.', icon: 'checkmark-circle' });
        } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not clear cache.', icon: 'alert-circle' }); }
        finally { setClearing(false); }
      },
    });
  };

  const handleRestart = () => {
    showConfirm({
      title: 'Restart System',
      message: 'This restarts the backend server and reloads the app automatically. It takes a few seconds — you do not need to run any commands. Continue?',
      confirmLabel: 'Restart', destructive: true, icon: 'power-outline',
      onConfirm: async () => {
        setRestarting(true);
        try { await adminService.restartSystem(); } catch (e) { /* connection drops as it restarts — expected */ }
        showInfo({ title: 'Restarting…', message: 'The system is restarting and the app will reload shortly.', icon: 'refresh' });
        // Give the backend a few seconds to come back, then reload the app.
        setTimeout(async () => {
          const ok = await reloadApp();
          if (!ok) { setRestarting(false); navigation.getParent?.()?.reset?.({ index: 0, routes: [{ name: 'Login' }] }); }
        }, 6000);
      },
    });
  };

  // Poll live only while the screen is focused.
  useFocusEffect(useCallback(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    const unsub = onAdminUpdate(() => load());
    return () => { if (timer.current) clearInterval(timer.current); unsub && unsub(); };
  }, [load]));

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const exportData = async () => {
    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const target = (FileSystem.cacheDirectory || '') + `sehatline-backup-${Date.now()}.xlsx`;
      const { uri, status } = await FileSystem.downloadAsync(`${API_BASE_URL}${adminService.dataExportPath}`, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (status >= 400) throw new Error(`Server returned ${status}`);
      const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: 'Save / share backup', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
      } else {
        showInfo({ title: 'Downloaded', message: `Saved to:\n${uri}`, icon: 'checkmark-circle' });
      }
    } catch (e) {
      showInfo({ title: 'Export failed', message: e?.message || 'Could not export the data.', icon: 'alert-circle' });
    } finally { setExporting(false); }
  };

  const health = data?.health;
  const traffic = data?.traffic;
  const tp = data?.throughput;
  const statusColor = HEALTH_COLOR[health?.status] || COLORS.textLight;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      {/* Header with sidebar + live dot */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={styles.headerTitle}>System Monitor</Text>
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
              <Text style={styles.liveText}>
                Live · {updatedAt ? updatedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRestart} disabled={restarting}>
            {restarting ? <ActivityIndicator size="small" color={COLORS.danger} /> : <Ionicons name="power" size={23} color={COLORS.danger} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={exportData} disabled={exporting}>
            {exporting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="download-outline" size={24} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <SkeletonScreen cards={2} topInset={false} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} progressViewOffset={80} />}
        >
          {/* System cache — accumulates over time; red when it hits the critical line */}
          {cache && (
            <View style={[styles.cacheCard, cache.critical && styles.cacheCardCritical]}>
              <View style={styles.cacheTop}>
                <Ionicons name={cache.critical ? 'warning' : 'server-outline'} size={20} color={cache.critical ? COLORS.danger : COLORS.primary} />
                <Text style={styles.cacheTitle}>System Cache</Text>
                <Text style={[styles.cacheSize, cache.critical && { color: COLORS.danger }]}>{cache.sizeMB} MB · {cache.itemCount} items</Text>
              </View>
              <View style={styles.cacheTrack}>
                <View style={[styles.cacheFill, { width: `${cache.pct}%`, backgroundColor: cache.critical ? COLORS.danger : COLORS.primary }]} />
              </View>
              {cache.critical ? (
                <Text style={styles.cacheWarn}>⚠ Cache is {cache.sizeMB} MB ({cache.itemCount} items) — remove it to optimize the system.</Text>
              ) : (
                <Text style={styles.cacheHint}>{cache.pct}% of the critical limit · RAM in use {cache.memoryRssMB} MB</Text>
              )}
              <TouchableOpacity
                style={[styles.cacheBtn, cache.critical ? { backgroundColor: COLORS.danger } : { backgroundColor: COLORS.primary }, cache.itemCount === 0 && { opacity: 0.5 }]}
                onPress={handleClearCache} disabled={clearing || cache.itemCount === 0} activeOpacity={0.85}
              >
                {clearing ? <ActivityIndicator color="#FFF" /> : (
                  <><Ionicons name="sparkles-outline" size={16} color="#FFF" /><Text style={styles.cacheBtnText}>{cache.itemCount === 0 ? 'System Optimized' : 'Clear Cache & Optimize'}</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* App health */}
          <View style={[styles.healthCard, { borderLeftColor: statusColor }]}>
            <View style={styles.healthTop}>
              <View style={[styles.healthPill, { backgroundColor: statusColor + '18' }]}>
                <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.healthStatus, { color: statusColor }]}>{(health?.status || 'unknown').toUpperCase()}</Text>
              </View>
              <Text style={styles.healthDb}>{health?.dbConnected ? 'Database connected' : 'Database offline'}</Text>
            </View>
            <View style={styles.healthGrid}>
              <Mini label="Uptime" value={fmtUptime(health?.uptimeSec)} styles={styles} />
              <Mini label="Memory" value={`${health?.memoryMB ?? '—'} MB`} styles={styles} />
              <Mini label="Load" value={health?.loadAvg?.[0] != null ? String(health.loadAvg[0]) : '—'} styles={styles} />
              <Mini label="Node" value={health?.node || '—'} styles={styles} />
            </View>
            {!!health?.overloadedDepartments?.length && (
              <Text style={styles.overloadWarn}>⚠ Overloaded: {health.overloadedDepartments.join(', ')} — consider adding doctors/hours.</Text>
            )}
          </View>

          {/* Live traffic */}
          <Text style={styles.sectionTitle}>Live Traffic</Text>
          <View style={styles.row}>
            <Stat label="In System" value={traffic?.activeInSystem ?? 0} icon="pulse-outline" color={COLORS.primary} styles={styles} />
            <Stat label="Doctors On Duty" value={traffic?.doctorsOnDuty ?? 0} icon="medkit-outline" color="#10B981" styles={styles} />
          </View>
          <View style={styles.row}>
            <Stat label="Total Patients" value={traffic?.totalPatients ?? 0} icon="people-outline" color="#0EA5E9" styles={styles} />
            <Stat label="Total Doctors" value={traffic?.totalDoctors ?? 0} icon="people-circle-outline" color="#8B5CF6" styles={styles} />
          </View>

          {/* Today's throughput */}
          <Text style={styles.sectionTitle}>Today's Throughput</Text>
          <View style={styles.row}>
            <Stat label="Tokens Issued" value={tp?.tokensToday ?? 0} icon="ticket-outline" color={COLORS.primary} styles={styles} />
            <Stat label="Served" value={tp?.completedToday ?? 0} icon="checkmark-done-outline" color="#10B981" styles={styles} />
          </View>
          <View style={styles.row}>
            <Stat label="Appointments" value={tp?.appointmentsToday ?? 0} icon="calendar-outline" color="#0EA5E9" styles={styles} />
            <Stat label="Dispensed" value={tp?.dispensedToday ?? 0} icon="medkit-outline" color="#F59E0B" styles={styles} />
          </View>

          {/* Queue models per department */}
          <Text style={styles.sectionTitle}>Queue Model (M/M/s · live)</Text>
          {(data?.departments || []).map((d) => (
            <View key={d.department} style={styles.depCard}>
              <View style={styles.depHead}>
                <Text style={styles.depName}>{d.label}</Text>
                <Text style={styles.depServers}>{d.servers} server{d.servers === 1 ? '' : 's'} · {d.avgServiceMin} min/patient</Text>
              </View>

              {/* Utilization bar */}
              <View style={styles.utilRow}>
                <Text style={styles.utilLabel}>Utilization</Text>
                <Text style={[styles.utilValue, { color: utilColor(d.utilization) }]}>{d.utilization}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, d.utilization)}%`, backgroundColor: utilColor(d.utilization) }]} />
              </View>

              <View style={styles.depMetrics}>
                <DepMini label="Avg Wait" value={d.avgWaitMin != null ? `${d.avgWaitMin} min` : '—'} styles={styles} />
                <DepMini label="Waiting" value={d.waiting} styles={styles} />
                <DepMini label="In Service" value={d.inProgress} styles={styles} />
                <DepMini label="Exp. Queue" value={d.expectedInQueue != null ? d.expectedInQueue : '—'} styles={styles} />
                <DepMini label="Arrivals/hr" value={d.arrivalsPerHour} styles={styles} />
                <DepMini label="Status" value={d.overloaded ? 'Overloaded' : 'Stable'} danger={d.overloaded} styles={styles} />
              </View>
            </View>
          ))}

          {/* Algorithm record */}
          {!!data?.algorithm && (
            <>
              <Text style={styles.sectionTitle}>Algorithm</Text>
              <View style={styles.algoCard}>
                <Text style={styles.algoModel}>{data.algorithm.model}</Text>
                <Text style={styles.algoNote}>{data.algorithm.note}</Text>
                <Text style={styles.algoLadderTitle}>Priority ladder</Text>
                {data.algorithm.priorityLadder.map((p, i) => (
                  <View key={i} style={styles.ladderRow}>
                    <View style={styles.ladderDot} />
                    <Text style={styles.ladderText}>{p}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.exportBtn} onPress={exportData} disabled={exporting} activeOpacity={0.85}>
            {exporting ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                <Text style={styles.exportBtnText}>Download Excel Backup</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Mini({ label, value, styles }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}
function Stat({ label, value, icon, color, styles }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function DepMini({ label, value, danger, styles }) {
  return (
    <View style={styles.depMini}>
      <Text style={[styles.depMiniValue, danger && { color: '#EF4444' }]}>{value}</Text>
      <Text style={styles.depMiniLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 12,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  scroll: { paddingHorizontal: 14, paddingBottom: 10 },

  cacheCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', marginBottom: 14 },
  cacheCardCritical: { borderColor: COLORS.danger + '80', backgroundColor: COLORS.danger + '0C' },
  cacheTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cacheTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cacheSize: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  cacheTrack: { height: 8, borderRadius: 5, backgroundColor: COLORS.primary + '18', overflow: 'hidden', marginTop: 12 },
  cacheFill: { height: '100%', borderRadius: 5 },
  cacheWarn: { fontSize: 12.5, color: COLORS.danger, fontWeight: '700', marginTop: 10, lineHeight: 18 },
  cacheHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },
  cacheBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, marginTop: 14 },
  cacheBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  healthCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderLeftWidth: 5 },
  healthTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  healthPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  healthStatus: { fontSize: 12, fontWeight: '800' },
  healthDb: { fontSize: 12, color: COLORS.textSecondary },
  healthGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  mini: { alignItems: 'center', flex: 1 },
  miniValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  miniLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  overloadWarn: { marginTop: 12, fontSize: 12, color: COLORS.danger, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 20, marginBottom: 10, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  depCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', marginBottom: 12 },
  depHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  depName: { fontSize: 15.5, fontWeight: '800', color: COLORS.text },
  depServers: { fontSize: 11.5, color: COLORS.textLight },
  utilRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  utilLabel: { fontSize: 12.5, color: COLORS.textSecondary, fontWeight: '600' },
  utilValue: { fontSize: 18, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.backgroundSecondary, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  depMetrics: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  depMini: { width: '33.3%', marginBottom: 12 },
  depMiniValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  depMiniLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },

  algoCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  algoModel: { fontSize: 14.5, fontWeight: '800', color: COLORS.primary },
  algoNote: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  algoLadderTitle: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  ladderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ladderDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  ladderText: { fontSize: 12.5, color: COLORS.text },

  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, marginTop: 20 },
  exportBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
