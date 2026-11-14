// MyPrescriptionsScreen — every prescription a doctor has issued to the patient.
// Tap one to open its full detail (medicines, tests, live pharmacy status).

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import prescriptionService from '../services/prescriptionService';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_COLOR = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#22C55E',
  dispensed: '#6B7280',
};

export default function MyPrescriptionsScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await prescriptionService.myPrescriptions();
      setItems(res?.prescriptions || []);
    } catch (e) { /* offline — keep what we have */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => { focus && focus(); };
  }, [load, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Prescriptions" subtitle="Doctor-issued prescriptions" onBack={() => navigation.goBack()} />

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={54} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No prescriptions yet</Text>
              <Text style={styles.emptyText}>Prescriptions your doctor issues will appear here.</Text>
            </View>
          ) : (
            items.map((p) => {
              const color = STATUS_COLOR[p.pharmacyStatus] || COLORS.primary;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PrescriptionDetailScreen', { prescriptionId: p.id })}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                    <Ionicons name="document-text" size={22} color={color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.doctor} numberOfLines={1}>{p.doctor?.name || 'Doctor'}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {(p.chronicIllness || p.doctor?.specialization || 'Consultation')} · {fmtDate(p.createdAt)}
                    </Text>
                    <Text style={styles.meds} numberOfLines={1}>
                      {p.medicines?.length || 0} medicine{(p.medicines?.length || 0) === 1 ? '' : 's'}
                      {p.tests?.length ? ` · ${p.tests.length} test${p.tests.length === 1 ? '' : 's'}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.badgeText, { color }]}>{p.statusLabel}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} style={{ marginTop: 8 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doctor: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  meds: { fontSize: 12.5, color: COLORS.textLight, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 14 },
  emptyText: { fontSize: 13.5, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
