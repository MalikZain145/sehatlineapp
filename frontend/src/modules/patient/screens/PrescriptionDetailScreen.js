// PrescriptionDetailScreen — one doctor-issued prescription, opened from the
// My Prescriptions list or straight from a pharmacy notification (which passes
// the prescriptionId). Shows the medicines, any lab tests, and the live
// pharmacy status (waiting / preparing / ready @ counter / dispensed).

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import prescriptionService from '../services/prescriptionService';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_COLOR = { pending: '#F59E0B', preparing: '#3B82F6', ready: '#22C55E', dispensed: '#6B7280' };
const STATUS_ICON = { pending: 'time', preparing: 'flask', ready: 'checkmark-circle', dispensed: 'checkmark-done-circle' };

export default function PrescriptionDetailScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const id = route?.params?.prescriptionId || route?.params?.refId || route?.params?.id;
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) { setError('No prescription selected.'); setLoading(false); return; }
    try {
      const res = await prescriptionService.getPrescription(id);
      setP(res?.prescription || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load this prescription.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => { focus && focus(); };
  }, [load, navigation]);

  const onRefresh = async () => { setRefreshing(true); await load(); setTimeout(() => setRefreshing(false), 400); };

  const color = p ? (STATUS_COLOR[p.pharmacyStatus] || COLORS.primary) : COLORS.primary;
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const medParts = (line) => {
    // "Metformin 500mg x 30 Days (Take with food)" → { name, rest }
    const m = String(line).split(/\s+x\s+|—/);
    return { name: (m[0] || line).trim(), rest: line.slice((m[0] || '').length).replace(/^\s*(x|—)\s*/, '').trim() };
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Prescription" subtitle="Doctor-issued" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={{ padding: 16 }}><SkeletonCard /><SkeletonCard style={{ marginTop: 14 }} /></View>
      ) : error || !p ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={54} color={COLORS.border} />
          <Text style={styles.emptyText}>{error || 'Prescription not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* Live pharmacy status */}
          <View style={[styles.statusBar, { backgroundColor: color + '18', borderColor: color + '55' }]}>
            <Ionicons name={STATUS_ICON[p.pharmacyStatus] || 'time'} size={22} color={color} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.statusLabel, { color }]}>{p.statusLabel}</Text>
              {p.pharmacyStatus === 'ready' && !!p.counter && (
                <Text style={styles.statusSub}>Collect from {p.counter}</Text>
              )}
              {p.pharmacyStatus === 'dispensed' && !!p.dispensedAt && (
                <Text style={styles.statusSub}>Dispensed on {fmt(p.dispensedAt)}</Text>
              )}
            </View>
          </View>

          {/* Doctor + meta */}
          <View style={styles.card}>
            <Row icon="person" label="Doctor" value={p.doctor?.name || '—'} COLORS={COLORS} />
            {!!p.doctor?.specialization && <Row icon="medkit" label="Specialization" value={p.doctor.specialization} COLORS={COLORS} />}
            {!!p.chronicIllness && <Row icon="pulse" label="For" value={p.chronicIllness} COLORS={COLORS} />}
            <Row icon="ticket" label="Token" value={p.tokenNumber || '—'} COLORS={COLORS} />
            <Row icon="calendar" label="Issued" value={fmt(p.createdAt)} COLORS={COLORS} last />
          </View>

          {/* Medicines */}
          <Text style={styles.section}>Medicines ({p.medicines?.length || 0})</Text>
          <View style={styles.card}>
            {(p.medicines || []).length === 0 ? (
              <Text style={styles.muted}>No medicines on this prescription.</Text>
            ) : (
              p.medicines.map((line, i) => {
                const mp = medParts(line);
                return (
                  <View key={i} style={[styles.medRow, i === p.medicines.length - 1 && { borderBottomWidth: 0 }]}>
                    <Ionicons name="ellipse" size={8} color={COLORS.primary} style={{ marginTop: 6 }} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.medName}>{mp.name}</Text>
                      {!!mp.rest && <Text style={styles.medRest}>{mp.rest}</Text>}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Lab tests */}
          {(p.tests || []).length > 0 && (
            <>
              <Text style={styles.section}>Lab Tests ({p.tests.length})</Text>
              <View style={styles.card}>
                {p.tests.map((t, i) => (
                  <View key={i} style={[styles.medRow, i === p.tests.length - 1 && { borderBottomWidth: 0 }]}>
                    <Ionicons name="flask" size={16} color="#8B5CF6" />
                    <Text style={[styles.medName, { marginLeft: 10 }]}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Notes */}
          {!!p.notes && (
            <>
              <Text style={styles.section}>Doctor's Notes</Text>
              <View style={styles.card}><Text style={styles.notes}>{p.notes}</Text></View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ icon, label, value, COLORS, last }) {
  const styles = makeStyles(COLORS);
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={16} color={COLORS.textLight} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  scroll: { padding: 16 },
  statusBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  statusLabel: { fontSize: 15, fontWeight: '800' },
  statusSub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  section: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 14, marginBottom: 8, marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 10, width: 110 },
  infoValue: { flex: 1, fontSize: 13.5, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  medName: { fontSize: 14.5, fontWeight: '700', color: COLORS.text },
  medRest: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  muted: { fontSize: 13.5, color: COLORS.textSecondary },
  notes: { fontSize: 13.5, color: COLORS.text, lineHeight: 20 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },
});
