// Admin → Manage Patients. Search, classify chronic (gates Chronic OPD), delete.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch,
  StatusBar, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import adminService from '../services/adminService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { onAdminUpdate } from '../../../services/socket';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

export default function ManagePatientsScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [patients, setPatients] = useState([]);
  const [meta, setMeta] = useState({ total: 0, chronicCount: 0 });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | chronic | normal
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (filter === 'chronic') params.chronic = 'true';
      if (filter === 'normal') params.chronic = 'false';
      const res = await adminService.listPatients(params);
      setPatients(res?.patients || []);
      setMeta({ total: res?.total ?? 0, chronicCount: res?.chronicCount ?? 0 });
    } catch (e) { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [q, filter]);

  useEffect(() => {
    load();
    const unsub = onAdminUpdate((p) => { if (!p || p.type === 'patients') load(); });
    return () => unsub && unsub();
  }, [load]);

  const toggleChronic = async (p, value) => {
    // optimistic
    setPatients((prev) => prev.map((x) => (x._id === p._id ? { ...x, isChronic: value } : x)));
    try { await adminService.setChronic(p._id, value); }
    catch (e) { load(); showInfo({ title: 'Error', message: e?.message || 'Could not update.', icon: 'alert-circle' }); }
  };

  const remove = (p) => {
    showConfirm({
      title: 'Remove Patient', message: `Delete ${p.name}'s account? This cannot be undone.`,
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => { try { await adminService.deletePatient(p._id); load(); } catch (e) { showInfo({ title: 'Error', message: e?.message, icon: 'alert-circle' }); } },
    });
  };

  const chips = [
    { key: 'all', label: `All (${meta.total})` },
    { key: 'chronic', label: `Chronic (${meta.chronicCount})` },
    { key: 'normal', label: 'Non-chronic' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Manage Patients</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            placeholder="Search name, email, CNIC…"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {q ? <TouchableOpacity onPress={() => { setQ(''); setTimeout(load, 0); }}><Ionicons name="close-circle" size={18} color={COLORS.textLight} /></TouchableOpacity> : null}
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
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
          {patients.length === 0 && <Text style={styles.empty}>No patients found.</Text>}
          {patients.map((p) => (
            <View key={p._id} style={styles.card}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(p.name || 'P').charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>{p.email}</Text>
                {!!p.phone && <Text style={styles.meta2}>{p.phone}</Text>}
                <View style={[styles.statusPill, { backgroundColor: (p.isChronic ? COLORS.primary : COLORS.textLight) + '18' }]}>
                  <View style={[styles.statusDot, { backgroundColor: p.isChronic ? COLORS.primary : COLORS.textLight }]} />
                  <Text style={[styles.statusText, { color: p.isChronic ? COLORS.primary : COLORS.textLight }]}>{p.isChronic ? 'Chronic' : 'Normal'}</Text>
                </View>
              </View>
              <View style={styles.chronicWrap}>
                <Switch
                  value={!!p.isChronic}
                  onValueChange={(v) => toggleChronic(p, v)}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                  thumbColor={COLORS.white}
                />
                <TouchableOpacity onPress={() => remove(p)} style={{ marginTop: 4 }}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 14, paddingBottom: 10, backgroundColor: COLORS.background,
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
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  meta2: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  chronicWrap: { alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
