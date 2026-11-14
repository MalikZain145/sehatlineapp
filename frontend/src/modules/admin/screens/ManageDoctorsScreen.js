// Admin → Manage Doctors. List, add (single + bulk), edit, delete.

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
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const EMPTY = { name: '', specialization: '', category: 'opd', department: 'cardiology', email: '', phone: '', password: '', room: '', qualifications: '', experienceYears: '' };
// OPD clinics a doctor can be assigned to. Currently only Cardiology runs a
// bookable OPD; add more here as they come online.
const OPD_DEPARTMENTS = [{ key: 'cardiology', label: 'Cardiology' }];

export default function ManageDoctorsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [doctors, setDoctors] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | inactive
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // doctorId when editing
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const load = useCallback(async () => {
    try { const res = await adminService.listDoctors(); setDoctors(res?.doctors || []); }
    catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const unsub = onAdminUpdate((p) => { if (!p || p.type === 'doctors') load(); });
    return () => unsub && unsub();
  }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (d) => {
    setEditing(d.doctorId);
    setForm({ name: d.name || '', specialization: d.specialization || '', category: d.category || (d.department === 'chronic_opd' ? 'chronic' : 'opd'), department: d.department === 'chronic_opd' ? 'cardiology' : (d.department || 'cardiology'), email: d.loginEmail || '', password: '', room: d.room || '', qualifications: d.qualifications || '', experienceYears: String(d.experienceYears || '') });
    setShowForm(true);
  };

  const save = async () => {
    // A doctor's login email is mandatory — it's their account identity.
    if (!editing) {
      const email = form.email.trim();
      if (!email) {
        showInfo({ title: 'Email Required', message: "Enter the doctor's login email.", icon: 'alert-circle' }); return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showInfo({ title: 'Invalid Email', message: 'Please enter a valid email address.', icon: 'alert-circle' }); return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...form, experienceYears: Number(form.experienceYears) || 0 };
      if (editing) {
        await adminService.updateDoctor(editing, payload);
        showInfo({ title: 'Saved', message: 'Doctor updated.', icon: 'checkmark-circle' });
      } else {
        const res = await adminService.addDoctor(payload);
        showInfo({ title: 'Doctor Added', message: `Login: ${res?.doctor?.loginEmail}\nPassword: ${res?.doctor?.password}`, icon: 'checkmark-circle' });
      }
      setShowForm(false);
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not save doctor.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const remove = (d) => {
    showConfirm({
      title: 'Remove Doctor', message: `Delete ${d.name} and their login? This cannot be undone.`,
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => {
        try { await adminService.deleteDoctor(d.doctorId); load(); }
        catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not delete.', icon: 'alert-circle' }); }
      },
    });
  };

  const submitBulk = async () => {
    // Each line: Name, Specialization, Department
    const list = bulkText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, specialization, department] = l.split(',').map((x) => (x || '').trim());
      // "chronic" in the department column marks a Chronic-OPD doctor; anything
      // else is an OPD clinic doctor (department defaults to cardiology).
      const isChronic = /chronic/i.test(department || '');
      return isChronic
        ? { name, specialization: specialization || 'General Physician', category: 'chronic' }
        : { name, specialization: specialization || 'General Physician', category: 'opd', department: department || 'cardiology' };
    }).filter((d) => d.name);
    if (!list.length) { showInfo({ title: 'Empty', message: 'Add at least one line: Name, Specialization, Department', icon: 'alert-circle' }); return; }
    setSaving(true);
    try {
      const res = await adminService.addDoctorsBulk(list);
      setShowBulk(false); setBulkText('');
      showInfo({ title: 'Bulk Add', message: `${res?.created?.length || 0} added${res?.errors?.length ? `, ${res.errors.length} failed` : ''}.`, icon: 'checkmark-circle' });
      load();
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Bulk add failed.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  // Pick an .xlsx and import doctors from it. Columns (row 1 header): Name,
  // Specialization, Department, Room, Experience, Email, Password. Each new
  // doctor gets the default password (doctor123) and is forced to change it.
  const importExcel = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (pick.canceled) return;
      const file = pick.assets?.[0];
      if (!file) return;
      if (!/\.xlsx?$/i.test(file.name || '')) {
        showInfo({ title: 'Wrong file', message: 'Please choose an Excel (.xlsx) file.', icon: 'alert-circle' });
        return;
      }
      setSaving(true);
      const res = await adminService.importDoctorsExcel({ uri: file.uri, name: file.name });
      setShowBulk(false);
      const errs = res?.errors?.length ? `\n${res.errors.length} row(s) skipped.` : '';
      showInfo({
        title: 'Import Complete',
        message: `${res?.created?.length || 0} doctor(s) imported. Default password: doctor123 (they must change it on first login).${errs}`,
        icon: 'checkmark-circle',
      });
      load();
    } catch (e) {
      showInfo({ title: 'Import failed', message: e?.message || 'Could not import the file.', icon: 'alert-circle' });
    } finally { setSaving(false); }
  };

  const field = (label, key, opts = {}) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[key]}
        onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
        placeholder={opts.placeholder || label}
        placeholderTextColor={COLORS.textLight}
        autoCapitalize={opts.autoCapitalize || 'words'}
        keyboardType={opts.keyboardType || 'default'}
        secureTextEntry={opts.secure}
      />
    </View>
  );

  const term = q.trim().toLowerCase();
  const filtered = doctors.filter((d) => {
    if (filter === 'active' && !d.active) return false;
    if (filter === 'inactive' && d.active) return false;
    if (!term) return true;
    return [d.name, d.specialization, d.department, d.loginEmail].some((x) => (x || '').toLowerCase().includes(term));
  });
  const activeCount = doctors.filter((d) => d.active).length;
  const chips = [
    { key: 'all', label: `All (${doctors.length})` },
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'inactive', label: `Inactive (${doctors.length - activeCount})` },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Manage Doctors</Text></View>
        <TouchableOpacity style={styles.hBtn} onPress={() => setShowBulk(true)}><Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} /></TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textLight} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Search name, specialization…" placeholderTextColor={COLORS.textLight} returnKeyType="search" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {filtered.length === 0 && <Text style={styles.empty}>{doctors.length ? 'No doctors match.' : 'No doctors yet. Tap + to add one.'}</Text>}
          {filtered.map((d) => (
            <View key={d.doctorId} style={styles.card}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(d.name || 'D').charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.meta}>{d.specialization} · {d.department}</Text>
                <Text style={styles.email}>{d.loginEmail}</Text>
                <View style={[styles.statusPill, { backgroundColor: (d.active ? COLORS.success : COLORS.textLight) + '18' }]}>
                  <View style={[styles.statusDot, { backgroundColor: d.active ? COLORS.success : COLORS.textLight }]} />
                  <Text style={[styles.statusText, { color: d.active ? COLORS.success : COLORS.textLight }]}>{d.active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.rowBtn} onPress={() => openEdit(d)}><Ionicons name="create-outline" size={20} color={COLORS.primary} /></TouchableOpacity>
              <TouchableOpacity style={styles.rowBtn} onPress={() => remove(d)}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAdd}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabInner}><Ionicons name="add" size={28} color={COLORS.white} /></LinearGradient>
      </TouchableOpacity>

      {/* Add / Edit form */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editing ? 'Edit Doctor' : 'Add Doctor'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!editing && <Text style={styles.formNote}>A login email is required. The doctor can fill their specialization, days and photo on first login. Added doctors are active right away.</Text>}
              {field('Full Name (optional)', 'name')}
              {field('Specialization (optional)', 'specialization', { placeholder: 'doctor can set this themselves' })}

              {/* Category — Chronic (token queue) vs OPD (bookable clinic) */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.pickRow}>
                  {[{ key: 'opd', label: 'OPD (Appointments)' }, { key: 'chronic', label: 'Chronic OPD' }].map((c) => {
                    const active = form.category === c.key;
                    return (
                      <TouchableOpacity key={c.key} style={[styles.pickChip, active && styles.pickChipActive]} onPress={() => setForm((f) => ({ ...f, category: c.key }))} activeOpacity={0.8}>
                        <Text style={[styles.pickChipText, active && { color: '#FFF' }]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* OPD department dropdown (only when OPD) */}
              {form.category === 'opd' ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>OPD Department</Text>
                  <View style={styles.pickRow}>
                    {OPD_DEPARTMENTS.map((d) => {
                      const active = form.department === d.key;
                      return (
                        <TouchableOpacity key={d.key} style={[styles.pickChip, active && styles.pickChipActive]} onPress={() => setForm((f) => ({ ...f, department: d.key }))} activeOpacity={0.8}>
                          <Text style={[styles.pickChipText, active && { color: '#FFF' }]}>{d.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <Text style={[styles.fieldLabel, { marginBottom: 12, fontWeight: '500', color: COLORS.textSecondary }]}>
                  This doctor will serve the Chronic OPD token queue.
                </Text>
              )}
              {!editing && field('Login Email (required)', 'email', { placeholder: 'doctor@example.com', autoCapitalize: 'none', keyboardType: 'email-address' })}
              {field('Phone (optional)', 'phone', { placeholder: 'e.g. 3001234567', autoCapitalize: 'none', keyboardType: 'phone-pad' })}
              {field(editing ? 'New Password (optional)' : 'Password (optional)', 'password', { placeholder: 'defaults to doctor@123', autoCapitalize: 'none', secure: false })}
              {field('Room', 'room', { placeholder: 'e.g. C-101' })}
              {field('Qualifications', 'qualifications', { placeholder: 'e.g. MBBS, FCPS' })}
              {field('Experience (years)', 'experienceYears', { keyboardType: 'numeric', autoCapitalize: 'none' })}
              <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={save} disabled={saving}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>{editing ? 'Save Changes' : 'Add Doctor'}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
      </BottomSheet>

      {/* Bulk add */}
      <BottomSheet visible={showBulk} onClose={() => setShowBulk(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bulk Add Doctors</Text>
              <TouchableOpacity onPress={() => setShowBulk(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            {/* Import from an Excel file */}
            <TouchableOpacity style={styles.excelBtn} activeOpacity={0.85} onPress={importExcel} disabled={saving}>
              <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.excelTitle}>Import from Excel (.xlsx)</Text>
                <Text style={styles.excelHint}>Columns: Name, Specialization, Department, Room, Experience, Email</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} /><Text style={styles.orText}>or paste rows</Text><View style={styles.orLine} />
            </View>

            <Text style={styles.bulkHint}>One doctor per line:{'\n'}Name, Specialization, Department</Text>
            <TextInput
              style={styles.bulkInput}
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={'Dr. Ayesha Khan, Cardiologist, cardiology\nDr. Bilal Ahmed, Endocrinologist, chronic'}
              placeholderTextColor={COLORS.textLight}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.defaultPwNote}>New doctors get password <Text style={{ fontWeight: '800' }}>doctor123</Text> and must change it on first login.</Text>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={submitBulk} disabled={saving}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Add All</Text>}
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
  excelBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.primary + '10', borderWidth: 1, borderColor: COLORS.primary + '40', borderRadius: 12, padding: 14, marginBottom: 14 },
  excelTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  excelHint: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border || '#E5E7EB' },
  orText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  defaultPwNote: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 10, marginBottom: 4 },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border || '#E5E7EB',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  email: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  rowBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 20, borderRadius: 30, overflow: 'hidden' },
  fabInner: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 5 },
  formNote: { fontSize: 12.5, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '10' },
  pickChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  saveBtn: { marginTop: 8, marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { paddingVertical: 15, alignItems: 'center' },
  saveText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  bulkHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  bulkInput: { minHeight: 160, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
});
