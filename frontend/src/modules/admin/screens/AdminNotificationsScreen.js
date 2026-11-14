// Admin → Notifications. Everything that reaches the administration — staff
// reports, medicine requisitions, and system messages — arrives here as a real
// notification. Tap one to open it (marks it read); the header shows the unread
// count and a mark-all-read action, matching the patient/doctor/pharmacy bells.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  StatusBar, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

// Filter notifications by which module they came from (funnel dropdown).
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'laboratory', label: 'Lab' },
];

export default function AdminNotificationsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminService.getMyNotifications(); setItems(res?.notifications || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    const unsub = onAdminUpdate(() => load());
    return () => { focus && focus(); unsub && unsub(); };
  }, [load, navigation]);

  const unreadCount = items.filter((n) => !n.read).length;

  const openItem = async (item) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
      try { await adminService.markNotificationRead(item._id); } catch (e) {}
    }
    setSelected({ ...item, read: true });
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await adminService.markAllNotificationsRead(); } catch (e) {}
  };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const cleanTitle = (t) => String(t || '').replace(/^📢\s*/, '');

  // The source module: use the stored refRole when present, otherwise infer it
  // from the title/body (older notifications predate the refRole field).
  const notifRole = (n) => {
    if (n.refRole) return n.refRole;
    const t = `${n.title || ''} ${n.body || ''}`;
    if (/\(pharmacy\)/i.test(t) || /requisition/i.test(t)) return 'pharmacy';
    if (/\(lab(oratory)?\)/i.test(t)) return 'laboratory';
    if (/report from/i.test(t)) return 'doctor';
    return '';
  };
  const visible = items.filter((n) => filter === 'all' || notifRole(n) === filter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Notifications</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.countRow} onPress={() => setFilterOpen(true)} activeOpacity={0.7}>
          <Ionicons name="funnel-outline" size={15} color={COLORS.primary} />
          <Text style={styles.countText}>{FILTERS.find((f) => f.key === filter)?.label || 'All'}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="checkmark-done" size={24} color={unreadCount ? COLORS.primary : COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {loading ? <SkeletonList count={6} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={50} color={COLORS.textLight} />
              <Text style={styles.emptyText}>{items.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}</Text>
            </View>
          ) : visible.map((n) => {
            const unread = !n.read;
            return (
              <TouchableOpacity
                key={n._id}
                activeOpacity={0.8}
                onPress={() => openItem(n)}
                style={[styles.card, { backgroundColor: unread ? COLORS.primary + (isDark ? '22' : '14') : COLORS.card, borderColor: unread ? COLORS.primary + '55' : (COLORS.border || '#E5E7EB') }]}
              >
                <View style={[styles.icon, { backgroundColor: COLORS.primary + '22' }]}>
                  <Ionicons name={n.icon || 'notifications'} size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { fontWeight: unread ? '800' : '600' }]} numberOfLines={1}>{cleanTitle(n.title)}</Text>
                  <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.time}>{fmt(n.createdAt)}</Text>
                </View>
                {unread && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={[styles.icon, { backgroundColor: COLORS.primary + '22', alignSelf: 'center', marginBottom: 12 }]}>
              <Ionicons name={selected?.icon || 'notifications'} size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.sheetTitle}>{cleanTitle(selected?.title)}</Text>
            <Text style={styles.sheetTime}>{fmt(selected?.createdAt)}</Text>
            <Text style={styles.sheetBody}>{selected?.body}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter dropdown */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={styles.filterSheet}>
            <Text style={styles.filterSheetTitle}>Filter</Text>
            {FILTERS.map((f, idx) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity key={f.key} style={[styles.filterRow, idx === FILTERS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => { setFilter(f.key); setFilterOpen(false); }}>
                  <Text style={[styles.filterRowText, active && { color: COLORS.primary, fontWeight: '800' }]}>{f.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 14, paddingBottom: 12, backgroundColor: COLORS.background,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border || '#E5E7EB' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countText: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  markAllText: { fontSize: 12.5, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, color: COLORS.text },
  body: { fontSize: 13, marginTop: 3, lineHeight: 18, color: COLORS.textSecondary },
  time: { fontSize: 11, marginTop: 6, color: COLORS.textLight },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, backgroundColor: COLORS.primary },
  empty: { alignItems: 'center', marginTop: 70 },
  emptyText: { fontSize: 14, marginTop: 12, color: COLORS.textLight },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 28 },
  sheet: { borderRadius: 20, padding: 22, backgroundColor: COLORS.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 7.4, elevation: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', color: COLORS.text },
  sheetTime: { fontSize: 12, textAlign: 'center', marginTop: 4, color: COLORS.textLight },
  sheetBody: { fontSize: 14.5, lineHeight: 22, marginTop: 14, color: COLORS.text },
  closeBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.primary },
  closeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  filterSheet: { backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 6 },
  filterSheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 12 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border || '#E5E7EB' },
  filterRowText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
});
