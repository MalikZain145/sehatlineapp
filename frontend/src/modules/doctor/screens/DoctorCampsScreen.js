// Doctor → Awareness Camps. A doctor (chronic or OPD/department) creates free
// awareness/screening camps here. Anything they publish shows to patients in
// the "Awareness Camps" tab automatically.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, Modal, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import doctorService from '../services/doctorService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE, BOTTOM_INSET } from '../../../utils/bottomInset';

const CATEGORIES = ['General', 'Diabetes', 'Blood Pressure', 'Heart', 'Eye', 'Hepatitis', 'Dental', 'Women Health'];
const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const EMPTY = { title: '', category: 'General', description: '', date: '', startTime: '09:00', endTime: '13:00', venue: 'Capital Hospital, G-6/2', capacity: '' };

export default function DoctorCampsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const load = useCallback(async () => {
    try { const res = await doctorService.listMyCamps(); setCamps(res?.camps || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim()) { showInfo({ title: 'Required', message: 'Enter a camp title.', icon: 'alert-circle' }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { showInfo({ title: 'Pick a date', message: 'Please choose the camp date.', icon: 'calendar' }); return; }
    setSaving(true);
    try {
      await doctorService.createCamp({ ...form, capacity: Number(form.capacity) || 0 });
      setShowForm(false);
      showInfo({ title: 'Camp Published', message: 'Patients can now see this camp in their Awareness Camps tab.', icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not publish the camp.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const remove = (c) => {
    showConfirm({
      title: 'Remove Camp', message: `Delete "${c.title}"? Patients will no longer see it.`,
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => { try { await doctorService.deleteCamp(c.id); load(); } catch (e) {} },
    });
  };

  const onPickDate = (event, selected) => {
    // iOS spinner fires on every wheel tick — keep it open (closed via Done).
    if (Platform.OS !== 'ios') setShowDate(false);
    if ((event.type === 'set' || Platform.OS === 'ios') && selected) setForm((f) => ({ ...f, date: toDateStr(selected) }));
  };

  const fmtDate = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Awareness Camps</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? <SkeletonList count={5} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} progressViewOffset={40} />}
        >
          <Text style={styles.intro}>Camps you publish here appear to patients in their Awareness Camps tab.</Text>
          {camps.length === 0 && <Text style={styles.empty}>No camps yet. Tap + to create your first awareness camp.</Text>}
          {camps.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardIcon}><Ionicons name="megaphone" size={20} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
                  <View style={styles.catBadge}><Text style={styles.catBadgeText}>{c.category}</Text></View>
                </View>
                <Text style={styles.cardMeta}>{fmtDate(c.date)} · {c.startTime}–{c.endTime}</Text>
                <Text style={styles.cardMeta}>{c.venue}</Text>
                <Text style={styles.cardRegs}>{c.registrants} registered{c.capacity ? ` · ${c.capacity} capacity` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(c)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAdd}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabInner}><Ionicons name="add" size={28} color={COLORS.white} /></LinearGradient>
      </TouchableOpacity>

      {/* Create form */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Awareness Camp</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} placeholder="e.g. Free Diabetes Screening" placeholderTextColor={COLORS.textLight} />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => {
                  const active = form.category === c;
                  return (
                    <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, category: c }))} activeOpacity={0.8}>
                      <Text style={[styles.chipText, active && { color: '#FFF' }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)} activeOpacity={0.7}>
                <Text style={{ color: form.date ? COLORS.text : COLORS.textLight, fontSize: 14 }}>{form.date ? fmtDate(form.date) + `  (${form.date})` : 'Tap to pick a date'}</Text>
              </TouchableOpacity>
              {showDate && <DateTimePicker value={form.date ? new Date(form.date + 'T00:00:00') : new Date()} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onPickDate} />}
              {showDate && Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowDate(false)} style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              )}

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Start</Text>
                  <TextInput style={styles.input} value={form.startTime} onChangeText={(t) => setForm((f) => ({ ...f, startTime: t }))} placeholder="09:00" placeholderTextColor={COLORS.textLight} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End</Text>
                  <TextInput style={styles.input} value={form.endTime} onChangeText={(t) => setForm((f) => ({ ...f, endTime: t }))} placeholder="13:00" placeholderTextColor={COLORS.textLight} />
                </View>
              </View>

              <Text style={styles.label}>Venue</Text>
              <TextInput style={styles.input} value={form.venue} onChangeText={(t) => setForm((f) => ({ ...f, venue: t }))} placeholder="e.g. Capital Hospital, G-6/2" placeholderTextColor={COLORS.textLight} />

              <Text style={styles.label}>Capacity (optional)</Text>
              <TextInput style={styles.input} value={form.capacity} onChangeText={(t) => setForm((f) => ({ ...f, capacity: t.replace(/[^0-9]/g, '') }))} placeholder="0 = unlimited" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} placeholder="What the camp offers…" placeholderTextColor={COLORS.textLight} multiline />

              <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={save} disabled={saving}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Publish Camp</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 12, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border || '#E5E7EB',
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  intro: { fontSize: 12.5, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 18 },
  empty: { color: COLORS.textLight, textAlign: 'center', marginTop: 24 },

  card: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  cardIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
  catBadge: { backgroundColor: COLORS.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary },
  cardMeta: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  cardRegs: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 4 },

  fab: { position: 'absolute', right: 20, bottom: 26 + BOTTOM_INSET, borderRadius: 30, overflow: 'hidden', elevation: 6 },
  fabInner: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center' },
  row2: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '10' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700' },
  saveBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
