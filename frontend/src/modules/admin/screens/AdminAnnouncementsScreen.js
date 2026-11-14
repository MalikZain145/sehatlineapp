// Admin → Announcements. Compose a broadcast and send it to staff (doctors,
// pharmacists, laboratory or everyone). It lands in each recipient's
// notification bell. Below the composer is the history of sent announcements.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, ActivityIndicator, RefreshControl, KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const AUDIENCES = [
  { key: 'all', label: 'Everyone', icon: 'globe-outline' },
  { key: 'doctor', label: 'Doctors', icon: 'medkit-outline' },
  { key: 'pharmacy', label: 'Pharmacists', icon: 'flask-outline' },
  { key: 'laboratory', label: 'Laboratory', icon: 'beaker-outline' },
];
const AUDIENCE_LABEL = { all: 'Everyone', doctor: 'Doctors', pharmacy: 'Pharmacists', laboratory: 'Laboratory' };

// Kind of notice — carried on each staff notification so they can filter their
// bell (matches the doctor's notification categories).
const TYPES = [
  { key: 'General', label: 'General', icon: 'megaphone-outline' },
  { key: 'Meeting', label: 'Meeting', icon: 'people-outline' },
  { key: 'Circular', label: 'Circular', icon: 'document-text-outline' },
  { key: 'Emergency', label: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'Duty', label: 'Duty', icon: 'briefcase-outline' },
];
const TYPE_ICON = { General: 'megaphone', Meeting: 'people', Circular: 'document-text', Emergency: 'alert-circle', Duty: 'briefcase' };

export default function AdminAnnouncementsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('General');
  const [audience, setAudience] = useState(['all']);
  const [sending, setSending] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminService.listAnnouncements(); setList(res?.announcements || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const unsub = onAdminUpdate((p) => { if (!p || p.type === 'announcements') load(); });
    return () => unsub && unsub();
  }, [load]);

  const toggleAudience = (key) => {
    if (key === 'all') { setAudience(['all']); return; }
    setAudience((prev) => {
      const withoutAll = prev.filter((a) => a !== 'all');
      const has = withoutAll.includes(key);
      const nextSel = has ? withoutAll.filter((a) => a !== key) : [...withoutAll, key];
      return nextSel.length ? nextSel : ['all'];
    });
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) { showInfo({ title: 'Required', message: 'Enter a title and a message.', icon: 'alert-circle' }); return; }
    setSending(true);
    try {
      const res = await adminService.createAnnouncement({ title: title.trim(), body: body.trim(), type, audience });
      setTitle(''); setBody(''); setType('General'); setAudience(['all']);
      showInfo({ title: 'Sent', message: res?.message || 'Announcement sent.', icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not send announcement.', icon: 'alert-circle' }); }
    finally { setSending(false); }
  };

  const remove = (a) => {
    showConfirm({
      title: 'Delete Announcement', message: 'Remove this from your history? Staff who already received it keep their copy.',
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => { try { await adminService.deleteAnnouncement(a._id); load(); } catch (e) {} },
    });
  };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const audienceText = (arr) => (arr || []).map((a) => AUDIENCE_LABEL[a] || a).join(', ');

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Announcements</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {/* Composer */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Announcement</Text>
            <Text style={styles.label}>Send to</Text>
            <View style={styles.chips}>
              {AUDIENCES.map((a) => {
                const active = audience.includes(a.key);
                return (
                  <TouchableOpacity key={a.key} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleAudience(a.key)} activeOpacity={0.8}>
                    <Ionicons name={a.icon} size={15} color={active ? '#FFF' : COLORS.primary} />
                    <Text style={[styles.chipText, active && { color: '#FFF' }]}>{a.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Type</Text>
            <View style={styles.chips}>
              {TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <TouchableOpacity key={t.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(t.key)} activeOpacity={0.8}>
                    <Ionicons name={t.icon} size={15} color={active ? '#FFF' : COLORS.primary} />
                    <Text style={[styles.chipText, active && { color: '#FFF' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Duty roster update" placeholderTextColor={COLORS.textLight} />

            <Text style={[styles.label, { marginTop: 12 }]}>Message</Text>
            <TextInput style={[styles.input, styles.textarea]} value={body} onChangeText={setBody} placeholder="Write your message to staff…" placeholderTextColor={COLORS.textLight} multiline textAlignVertical="top" />

            <TouchableOpacity style={styles.saveBtn} onPress={send} disabled={sending} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                {sending ? <ActivityIndicator color="#FFF" /> : (
                  <><Ionicons name="megaphone" size={18} color="#FFF" /><Text style={styles.saveText}>Send Announcement</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* History */}
          <Text style={styles.sectionTitle}>Sent</Text>
          {loading ? <SkeletonList count={3} /> : list.length === 0 ? (
            <Text style={styles.empty}>No announcements sent yet.</Text>
          ) : list.map((a) => (
            <View key={a._id} style={styles.annCard}>
              <View style={styles.annIcon}><Ionicons name={TYPE_ICON[a.type] || 'megaphone'} size={18} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.annTitleRow}>
                  <Text style={styles.annTitle} numberOfLines={1}>{a.title}</Text>
                  <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{a.type || 'General'}</Text></View>
                </View>
                <Text style={styles.annBody} numberOfLines={3}>{a.body}</Text>
                <Text style={styles.annMeta}>To {audienceText(a.audience)} · {a.recipients} staff · {fmt(a.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(a)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '10' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  textarea: { minHeight: 110 },
  saveBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { flexDirection: 'row', gap: 8, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  empty: { color: COLORS.textLight, textAlign: 'center', marginTop: 16 },
  annCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  annIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  annTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  annTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
  typeBadge: { backgroundColor: COLORS.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary },
  annBody: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },
  annMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 6 },
});
