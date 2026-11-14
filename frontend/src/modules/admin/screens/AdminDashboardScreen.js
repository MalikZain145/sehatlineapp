// Admin Dashboard — the admin's home. Redesigned to match the SehatLine Admin
// design: gradient wave header + welcome, colored overview stat cards, a Quick
// Access row and a Manage list. Live data from the same backend (no mock).

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  StatusBar, Platform, Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const ACCENT = { teal: '#0BAA9D', green: '#10B981', amber: '#F59E0B', purple: '#8B5CF6', blue: '#0EA5E9' };

export default function AdminDashboardScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [unread, setUnread] = useState(0);
  const [admin, setAdmin] = useState({ name: 'Admin' });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useMinLoading(true);

  const load = useCallback(async () => {
    try { const res = await adminService.getDashboard(); if (res?.stats) setStats(res.stats); } catch (e) { /* offline */ }
    try { const a = await adminService.getAnalytics(); if (a?.trends) setTrends(a.trends); } catch (e) { /* offline */ }
    try {
      const n = await adminService.getMyNotifications();
      setUnread(typeof n?.unread === 'number' ? n.unread : (n?.notifications || []).filter((x) => !x.read).length);
    } catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem('userData'); if (raw) { const u = JSON.parse(raw); setAdmin({ name: (u.name || 'Admin').split(' ')[0], profilePic: u.profilePic || '' }); } } catch (e) { /* ignore */ }
    })();
    load();
    const unsubFocus = navigation.addListener('focus', load);
    const unsub = onAdminUpdate(() => load());
    return () => { unsubFocus && unsubFocus(); unsub && unsub(); };
  }, [load, navigation]);

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Trend chip descriptors from the real analytics endpoint. Percent deltas for
  // appts/patients/tokens; a "+N new" count for doctors (this-week hires).
  const pctChip = (d) => (typeof d === 'number' ? { up: d >= 0, text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%`, sub: 'vs prev' } : null);
  const newChip = (n) => (n > 0 ? { up: true, text: `+${n} new`, sub: 'this week' } : null);

  const overview = [
    { key: 'appts', label: "Today's Appointments", value: stats?.apptsToday ?? 0, icon: 'calendar', color: ACCENT.teal, trend: pctChip(trends?.apptsToday?.deltaPct) },
    { key: 'patients', label: 'Active Patients', value: stats?.patients ?? 0, icon: 'people', color: ACCENT.green, trend: pctChip(trends?.patients?.deltaPct) },
    { key: 'tokens', label: 'Pending Tokens', value: stats?.tokensToday ?? 0, icon: 'hourglass', color: ACCENT.amber, trend: pctChip(trends?.tokensToday?.deltaPct) },
    { key: 'doctors', label: 'Total Doctors', value: stats?.doctors ?? 0, icon: 'medkit', color: ACCENT.purple, trend: newChip(trends?.doctors?.deltaNew ?? 0) },
  ];

  const quick = [
    { label: 'Patients', icon: 'people', route: 'AdminPatients', color: ACCENT.teal },
    { label: 'Doctors', icon: 'medkit', route: 'AdminDoctors', color: ACCENT.purple },
    { label: 'Pharmacists', icon: 'flask', route: 'AdminPharmacists', color: ACCENT.blue },
    { label: 'System', icon: 'pulse', route: 'AdminSystem', color: ACCENT.amber },
  ];

  const manage = [
    { label: 'Staff Reports', desc: 'Messages from doctors, pharmacy & lab', icon: 'chatbox-ellipses', route: 'AdminReports', badge: stats?.openReports },
    { label: 'System Ratings', desc: 'What patients think of the system', icon: 'star', route: 'AdminRatings' },
    { label: 'Announcements', desc: 'Broadcast to staff', icon: 'megaphone', route: 'AdminAnnouncements' },
    { label: 'Settings', desc: 'Theme, password & account', icon: 'settings', route: 'AdminSettings' },
  ];

  const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT.teal} translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} tintColor="#FFF" progressViewOffset={90} />}
      >
        {/* ── Gradient header ── */}
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity style={styles.heroIcon} onPress={() => navigation.navigate('AdminMore')} activeOpacity={0.7}>
              <Ionicons name="menu" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity style={styles.heroIcon} onPress={() => navigation.navigate('AdminNotifications')} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={22} color="#FFF" />
                {unread > 0 && <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text></View>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroAvatar} onPress={() => navigation.navigate('AdminProfile')} activeOpacity={0.8}>
                {admin.profilePic ? <Image source={{ uri: admin.profilePic }} style={styles.heroAvatarImg} /> : <Text style={styles.heroAvatarText}>{(admin.name || 'A').charAt(0).toUpperCase()}</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.welcome}>Welcome, {admin.name} 👋</Text>
          <Text style={styles.welcomeSub}>SehatLine Admin Panel</Text>

          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={15} color="#FFF" />
            <Text style={styles.dateChipText}>{today}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? (
            <SkeletonScreen cards={2} topInset={false} />
          ) : (
            <>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.grid}>
                {overview.map((c) => (
                  <View key={c.key} style={[styles.statCard, { backgroundColor: c.color + (isDark ? '24' : '12') }]}>
                    <View style={styles.statTop}>
                      <Text style={styles.statLabel}>{c.label}</Text>
                      <View style={[styles.statIcon, { backgroundColor: c.color + '26' }]}>
                        <Ionicons name={c.icon} size={17} color={c.color} />
                      </View>
                    </View>
                    <View style={styles.statBottom}>
                      <Text style={styles.statValue}>{num(c.value)}</Text>
                      {c.trend && (
                        <View style={[styles.trendChip, { backgroundColor: (c.trend.up ? ACCENT.green : COLORS.danger) + '1E' }]}>
                          <Text style={[styles.trendText, { color: c.trend.up ? ACCENT.green : COLORS.danger }]}>{c.trend.text}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.quickRow}>
                {quick.map((q) => (
                  <TouchableOpacity key={q.label} style={styles.quickItem} activeOpacity={0.8} onPress={() => navigation.navigate(q.route)}>
                    <View style={[styles.quickCircle, { backgroundColor: q.color + (isDark ? '2A' : '16') }]}>
                      <Ionicons name={q.icon} size={24} color={q.color} />
                    </View>
                    <Text style={styles.quickLabel}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Manage</Text>
              {manage.map((m) => (
                <TouchableOpacity key={m.route} style={styles.menuRow} activeOpacity={0.75} onPress={() => navigation.navigate(m.route)}>
                  <View style={styles.menuIcon}><Ionicons name={`${m.icon}-outline`} size={21} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuLabel}>{m.label}</Text>
                    <Text style={styles.menuDesc}>{m.desc}</Text>
                  </View>
                  {m.badge > 0 && <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{m.badge}</Text></View>}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}
            </>
          )}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (COLORS, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 20 },

  hero: {
    paddingTop: (STATUS_BAR_HEIGHT + 16),
    paddingHorizontal: 18, paddingBottom: 26,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  heroAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  welcome: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 14 },
  welcomeSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3, fontWeight: '500' },
  dateChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16 },
  dateChipText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  body: { paddingHorizontal: 14, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 20, marginBottom: 12, marginLeft: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47.5%', flexGrow: 1, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
  statTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', flex: 1, marginRight: 8 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  statValue: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  trendChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4 },
  trendText: { fontSize: 10.5, fontWeight: '800' },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', flex: 1 },
  quickCircle: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, marginBottom: 10,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB',
  },
  menuIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  menuDesc: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  menuBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  menuBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
});
