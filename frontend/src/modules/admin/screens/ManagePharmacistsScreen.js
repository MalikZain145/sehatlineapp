// Admin → Manage Pharmacists. Create pharmacist accounts (empty profile — the
// pharmacist fills their own details on first login), bulk-import from Excel
// (Email + optional Phone), and remove accounts. Every new account gets the
// default password (pharmacy123) and is forced to change it on first login.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, Modal, RefreshControl, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import BottomSheet from '../../../components/ui/BottomSheet';
import { showConfirm, showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const EMPTY = { name: '', email: '', phone: '' };

export default function ManagePharmacistsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | suspended
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const load = useCallback(async () => {
    try { const res = await adminService.listPharmacists(); setList(res?.pharmacists || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setShowForm(true); };

  const save = async () => {
    if (!form.email.trim()) { showInfo({ title: 'Required', message: 'Enter the email.', icon: 'alert-circle' }); return; }
    setSaving(true);
    try {
      const res = await adminService.addPharmacist({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      setShowForm(false);
      showInfo({ title: 'Pharmacist Added', message: `Login: ${res?.pharmacist?.email}\nPassword: ${res?.pharmacist?.password}\nThey must change it on first login.`, icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not add pharmacist.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  // Bulk paste: one email per line (optionally "email, phone").
  const submitBulk = async () => {
    const pharmacists = bulkText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [email, phone] = l.split(',').map((x) => (x || '').trim());
      return { email, phone: phone || '' };
    }).filter((p) => /@/.test(p.email));
    if (!pharmacists.length) { showInfo({ title: 'Empty', message: 'Add at least one email (one per line).', icon: 'alert-circle' }); return; }
    setSaving(true);
    try {
      const res = await adminService.addPharmacistsBulk(pharmacists);
      setShowBulk(false); setBulkText('');
      const errs = res?.errors?.length ? `\n${res.errors.length} row(s) skipped.` : '';
      showInfo({ title: 'Added', message: `${res?.created?.length || 0} pharmacist(s) added. Default password: pharmacy123.${errs}`, icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not add.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const importExcel = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (pick.canceled) return;
      const file = pick.assets?.[0];
      if (!file) return;
      if (!/\.xlsx?$/i.test(file.name || '')) { showInfo({ title: 'Wrong file', message: 'Please choose an Excel (.xlsx) file.', icon: 'alert-circle' }); return; }
      setSaving(true);
      const res = await adminService.importPharmacistsExcel({ uri: file.uri, name: file.name });
      setShowBulk(false);
      const errs = res?.errors?.length ? `\n${res.errors.length} row(s) skipped.` : '';
      showInfo({ title: 'Import Complete', message: `${res?.created?.length || 0} pharmacist(s) imported. Default password: pharmacy123 (they must change it on first login).${errs}`, icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Import failed', message: e?.message || 'Could not import the file.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const remove = (p) => {
    showConfirm({
      title: 'Remove Pharmacist', message: `Delete ${p.name || p.email}'s account?`,
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => { try { await adminService.deletePharmacist(p._id); load(); } catch (e) {} },
    });
  };

  const isActive = (p) => (p.accountStatus || 'active') === 'active';
  const term = q.trim().toLowerCase();
  const filtered = list.filter((p) => {
    if (filter === 'active' && !isActive(p)) return false;
    if (filter === 'suspended' && isActive(p)) return false;
    if (!term) return true;
    return [p.name, p.email, p.phone].some((x) => (x || '').toLowerCase().includes(term));
  });
  const activeCount = list.filter(isActive).length;
  const chips = [
    { key: 'all', label: `All (${list.length})` },
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'suspended', label: `Suspended (${list.length - activeCount})` },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Manage Pharmacists</Text></View>
        <TouchableOpacity style={styles.hBtn} onPress={() => setShowBulk(true)}><Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} /></TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textLight} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Search name, email, phone…" placeholderTextColor={COLORS.textLight} autoCapitalize="none" returnKeyType="search" />
          {q ? <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={COLORS.textLight} /></TouchableOpacity> : null}
        </View>
      </View>
      <View style={styles.chipsRow}>
        {chips.map((c) => (
          <TouchableOpacity key={c.key} style={[styles.chip, filter === c.key && styles.chipActive]} onPress={() => setFilter(c.key)}>
            <Text style={[styles.chipText, filter === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <SkeletonList count={6} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} progressViewOffset={80} />}
        >
          {filtered.length === 0 && <Text style={styles.empty}>{list.length ? 'No pharmacists match.' : 'No pharmacists yet. Tap + to add one.'}</Text>}
          {filtered.map((p) => {
            const active = isActive(p);
            return (
            <View key={p._id} style={styles.card}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(p.name || p.email || 'P').charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name || '—'}</Text>
                <Text style={styles.email}>{p.email}</Text>
                {!!p.phone && <Text style={styles.meta}>{p.phone}</Text>}
                <View style={[styles.statusPill, { backgroundColor: (active ? COLORS.success : COLORS.warning || '#F59E0B') + '18' }]}>
                  <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : (COLORS.warning || '#F59E0B') }]} />
                  <Text style={[styles.statusText, { color: active ? COLORS.success : (COLORS.warning || '#F59E0B') }]}>{active ? 'Active' : 'Suspended'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.rowBtn} onPress={() => remove(p)}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></TouchableOpacity>
            </View>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAdd}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabInner}><Ionicons name="add" size={28} color={COLORS.white} /></LinearGradient>
      </TouchableOpacity>

      {/* Add form */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Pharmacist</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            <Text style={styles.note}>Only an email is required — the pharmacist sets their own name, photo and counter on first login.</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm((f) => ({ ...f, email: t }))} placeholder="e.g. ali.raza@sehatline.pk" placeholderTextColor={COLORS.textLight} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Phone (optional)</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} placeholder="e.g. 3001234567" placeholderTextColor={COLORS.textLight} keyboardType="phone-pad" />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Name (optional)</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="left blank → pharmacist sets it" placeholderTextColor={COLORS.textLight} />
            </View>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={save} disabled={saving}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Add Pharmacist</Text>}
              </LinearGradient>
            </TouchableOpacity>
      </BottomSheet>

      {/* Bulk / Import */}
      <BottomSheet visible={showBulk} onClose={() => setShowBulk(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Import Pharmacists</Text>
              <TouchableOpacity onPress={() => setShowBulk(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.excelBtn} activeOpacity={0.85} onPress={importExcel} disabled={saving}>
              <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
              <Text style={styles.excelBtnText}>Choose Excel file (.xlsx) — needs an "Email" column</Text>
            </TouchableOpacity>
            <Text style={styles.note}>…or paste one email per line (optionally "email, phone"):</Text>
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              value={bulkText} onChangeText={setBulkText} multiline
              placeholder={'ali.raza@sehatline.pk, 3001234567\nsara.khan@sehatline.pk'}
              placeholderTextColor={COLORS.textLight} autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={submitBulk} disabled={saving}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Add Pasted List</Text>}
              </LinearGradient>
            </TouchableOpacity>
      </BottomSheet>
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
  searchRow: { paddingHorizontal: 14, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  empty: { color: COLORS.textLight, textAlign: 'center', marginTop: 30 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  rowBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 26, borderRadius: 30, overflow: 'hidden', elevation: 6 },
  fabInner: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  note: { fontSize: 12.5, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  excelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary + '77', borderRadius: 12, padding: 14, marginBottom: 14 },
  excelBtnText: { fontSize: 12.5, color: COLORS.primary, fontWeight: '700', flex: 1 },
  saveBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
