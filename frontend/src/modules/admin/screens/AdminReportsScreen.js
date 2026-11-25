// Admin → Doctor Reports. Read the notes doctors sent, mark them resolved.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal,
  StatusBar, Platform, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

function when(iso) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) { return ''; }
}

// How each sender role is shown (label, icon, colour).
const ROLE_META = {
  doctor: { label: 'Doctor', icon: 'medkit', color: '#0EA5E9' },
  pharmacy: { label: 'Pharmacy', icon: 'flask', color: '#8B5CF6' },
  laboratory: { label: 'Laboratory', icon: 'beaker', color: '#F59E0B' },
};
const roleMeta = (r) => ROLE_META[r] || { label: r || 'Staff', icon: 'person', color: '#64748B' };
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'laboratory', label: 'Lab' },
];

export default function AdminReportsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);  // opened report (detail + reply)
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminService.listReports(); setReports(res?.reports || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const unsub = onAdminUpdate((p) => { if (!p || p.type === 'reports') load(); });
    return () => unsub && unsub();
  }, [load]);

  const open = (r) => { setSelected(r); setReplyText(''); };

  const resolve = (r) => {
    showConfirm({
      title: 'Resolve Report', message: 'Mark this report as resolved without a reply?', confirmLabel: 'Resolve', icon: 'checkmark-done-outline',
      onConfirm: async () => { try { await adminService.resolveReport(r._id); setSelected(null); load(); } catch (e) { showInfo({ title: 'Error', message: e?.message, icon: 'alert-circle' }); } },
    });
  };

  const sendReply = async () => {
    const msg = replyText.trim();
    if (!msg) { showInfo({ title: 'Empty', message: 'Please write a reply.', icon: 'alert-circle' }); return; }
    setSending(true);
    try {
      await adminService.replyReport(selected._id, msg);
      setSelected(null); setReplyText('');
      showInfo({ title: 'Reply Sent', message: 'The sender has been notified and the report is resolved.', icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Failed', message: e?.message || 'Could not send reply.', icon: 'alert-circle' }); }
    finally { setSending(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Staff Reports</Text></View>
        <View style={{ width: 40 }} />
      </View>

      {/* Role filter */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity key={f.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
              <Text style={[styles.filterText, active && { color: '#FFF' }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? <SkeletonList count={5} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {(() => { const shown = reports.filter((r) => filter === 'all' || (r.fromRole || 'doctor') === filter); return shown.length === 0; })() && (
            <View style={styles.emptyBox}>
              <Ionicons name="megaphone-outline" size={44} color={COLORS.textLight} />
              <Text style={styles.empty}>No reports yet</Text>
            </View>
          )}
          {reports.filter((r) => filter === 'all' || (r.fromRole || 'doctor') === filter).map((r) => {
            const rm = roleMeta(r.fromRole || 'doctor');
            return (
            <TouchableOpacity key={r._id} activeOpacity={0.85} onPress={() => open(r)} style={[styles.card, r.status === 'open' && styles.cardOpen]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: rm.color + '18' }]}><Ionicons name={rm.icon} size={16} color={rm.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.from}>{r.fromName || rm.label}</Text>
                  <View style={styles.rolePill}>
                    <Text style={[styles.rolePillText, { color: rm.color }]}>{rm.label}</Text>
                    <Text style={styles.time}> · {when(r.createdAt)}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: (r.status === 'open' ? COLORS.warning : COLORS.success) + '20' }]}>
                  <Text style={[styles.badgeText, { color: r.status === 'open' ? COLORS.warning : COLORS.success }]}>{r.status === 'open' ? 'Open' : 'Resolved'}</Text>
                </View>
              </View>
              <Text style={styles.message} numberOfLines={3}>{r.message}</Text>

              {!!r.reply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Your reply</Text>
                  <Text style={styles.replyText} numberOfLines={2}>{r.reply}</Text>
                </View>
              )}

              <View style={styles.cardFoot}>
                <Text style={styles.openHint}>{r.status === 'open' ? 'Tap to reply' : 'Tap to view'}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          ); })}
        </ScrollView>
      )}

      {/* ── Detail + reply modal ── */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <View style={styles.sheet}>
            {selected && (() => {
              const rm = roleMeta(selected.fromRole || 'doctor');
              const isOpen = selected.status === 'open';
              return (
                <>
                  <View style={styles.sheetHead}>
                    <View style={[styles.avatar, { backgroundColor: rm.color + '18' }]}><Ionicons name={rm.icon} size={16} color={rm.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.from}>{selected.fromName || rm.label}</Text>
                      <Text style={[styles.rolePillText, { color: rm.color }]}>{rm.label} · {when(selected.createdAt)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sheetLabel}>Message</Text>
                  <ScrollView style={{ maxHeight: 140 }}><Text style={styles.sheetMessage}>{selected.message}</Text></ScrollView>

                  {!!selected.reply && (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyLabel}>Your reply · {when(selected.repliedAt)}</Text>
                      <Text style={styles.replyText}>{selected.reply}</Text>
                    </View>
                  )}

                  {isOpen ? (
                    <>
                      <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Reply to {rm.label.toLowerCase()}</Text>
                      <TextInput
                        style={styles.replyInput}
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write your reply (e.g. Resolved — restocked today)…"
                        placeholderTextColor={COLORS.textLight}
                        multiline
                        textAlignVertical="top"
                      />
                      <TouchableOpacity style={[styles.sendBtn, { opacity: sending ? 0.6 : 1 }]} onPress={sendReply} disabled={sending} activeOpacity={0.85}>
                        {sending ? <ActivityIndicator color="#FFF" /> : (
                          <><Ionicons name="send" size={17} color="#FFF" /><Text style={styles.sendBtnText}>Send Reply & Resolve</Text></>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.resolveOnly} onPress={() => resolve(selected)}>
                        <Text style={styles.resolveText}>Just mark resolved (no reply)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: COLORS.success + '20', alignSelf: 'flex-start', marginTop: 14 }]}>
                      <Text style={[styles.badgeText, { color: COLORS.success }]}>Resolved</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', backgroundColor: COLORS.card },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  rolePill: { flexDirection: 'row', alignItems: 'center' },
  rolePillText: { fontSize: 11, fontWeight: '800' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  empty: { color: COLORS.textLight, marginTop: 10, fontSize: 14 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  cardOpen: { borderColor: COLORS.warning + '55' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  from: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  time: { fontSize: 11, color: COLORS.textLight },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  message: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  resolveText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  openHint: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  // Reply highlight
  replyBox: { marginTop: 12, backgroundColor: COLORS.primary + '14', borderLeftWidth: 3, borderLeftColor: COLORS.primary, borderRadius: 8, padding: 10 },
  replyLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 3 },
  replyText: { fontSize: 13.5, color: COLORS.text, lineHeight: 20 },
  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: COLORS.card, borderRadius: 20, padding: 18 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sheetLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  sheetMessage: { fontSize: 14.5, color: COLORS.text, lineHeight: 22 },
  replyInput: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 90, fontSize: 14.5, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  sendBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14.5 },
  resolveOnly: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
