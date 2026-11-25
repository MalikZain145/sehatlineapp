import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import Colors from "../constants/colors";
import pharmacyService from "../services/pharmacyService";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function PrescriptionDetailsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const route = useRoute<any>();
  const prescriptionId = route.params?.prescriptionId;

  const [data, setData] = useState<any>(null);
  const [hasOutOfStock, setHasOutOfStock] = useState(false);
  const [loading, setLoading] = useMinLoading(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getPrescription(prescriptionId);
      setData(res?.prescription || null);
      setHasOutOfStock(!!res?.hasOutOfStock);
    } catch (e: any) {
      pharmAlert("Error", e?.message || "Could not load prescription.");
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (fn: () => Promise<any>, successMsg?: string, goBack = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (successMsg || res?.message) pharmAlert("Done", res?.message || successMsg);
      if (goBack) navigation.goBack();
      else await load();
    } catch (e: any) {
      pharmAlert("Error", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const prepare = () => runAction(() => pharmacyService.prepare(prescriptionId));

  // No counter is asked — the patient is sent to THIS pharmacist's own counter
  // (set on their profile). They were already directed there when "prepared".
  const markReady = () => runAction(() => pharmacyService.markReady(prescriptionId));

  const complete = () =>
    pharmAlert("Complete Order", "Confirm the patient has received all available medicines?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: () => runAction(() => pharmacyService.complete(prescriptionId), undefined, true) },
    ]);

  const createLP = () =>
    pharmAlert(
      "Create Loan Prescription",
      "Generate an LP for the out-of-stock medicines so the patient can purchase them locally?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create LP", onPress: () => runAction(() => pharmacyService.createLP(prescriptionId)) },
      ]
    );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <GradientHeader title="Prescription Details" subtitle="Review patient prescription" />
        <SkeletonScreen cards={2} topInset={false} dark={theme.dark} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <GradientHeader title="Prescription Details" subtitle="Review patient prescription" />
        <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.textSecondary }}>
          Prescription not found.
        </Text>
      </SafeAreaView>
    );
  }

  const isPending = data.pharmacyStatus === "pending";
  const isPreparing = data.pharmacyStatus === "preparing";
  const isReady = data.pharmacyStatus === "ready";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Prescription Details" subtitle="Review patient prescription" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.prescriptionCard, { backgroundColor: theme.colors.card }]}>
          {/* Patient Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Patient Information</Text>
            </View>

            <Row label="Patient Name" value={data.patient?.name} theme={theme} />
            <Row label="Card Number" value={data.patient?.cdaCard || data.patient?.cnic || "—"} theme={theme} />
            <Row label="Token" value={data.tokenNumber} theme={theme} />
            <Row label="Doctor" value={data.doctor?.name ? `Dr. ${data.doctor.name}` : "—"} theme={theme} />
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + "20" }]}>
                <Text style={[styles.statusText, { color: theme.colors.primary }]}>
                  {isPending ? "Waiting" : isPreparing ? "Preparing" : isReady ? `Ready · ${data.counter}` : "Dispensed"}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Medicines */}
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Prescribed Medicines</Text>
          </View>

          {(data.medicines || []).map((m: any, i: number) => (
            <View
              key={i}
              style={[styles.medicineCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.medicineName, { color: theme.colors.primary }]}>{m.name}</Text>
              {m.available ? (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableText}>Available{m.inStock ? ` (${m.inStock})` : ""}</Text>
                </View>
              ) : (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
              {!!m.quantity && (
                <View style={styles.medicineRow}>
                  <Text style={[styles.medicineLabel, { color: theme.colors.textSecondary }]}>Prescribed</Text>
                  <Text style={[styles.medicineValue, { color: theme.colors.text }]}>{m.quantity}</Text>
                </View>
              )}
            </View>
          ))}

          {!!(data.tests || []).length && (
            <Text style={[styles.testsNote, { color: theme.colors.textSecondary }]}>
              Lab tests to follow: {data.tests.join(", ")}
            </Text>
          )}

          {!!data.notes && (
            <View style={[styles.instructionsBox, { backgroundColor: theme.colors.primary + "15" }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>{data.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.buttonContainer, { backgroundColor: theme.colors.background }]}>
        {/* LP button ONLY when a medicine is out of stock */}
        {hasOutOfStock && (
          <TouchableOpacity style={[styles.lpButton, { backgroundColor: theme.colors.warning }]} onPress={createLP} disabled={busy}>
            <Text style={styles.buttonText}>Create LP (out of stock)</Text>
          </TouchableOpacity>
        )}

        {isPending && (
          <TouchableOpacity style={[styles.completeButton, { backgroundColor: theme.colors.primary }]} onPress={prepare} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Preparing</Text>}
          </TouchableOpacity>
        )}
        {isPreparing && (
          <TouchableOpacity style={[styles.completeButton, { backgroundColor: theme.colors.primary }]} onPress={markReady} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark Ready for Pickup</Text>}
          </TouchableOpacity>
        )}
        {(isReady || isPreparing) && (
          <TouchableOpacity style={[styles.completeButton, { backgroundColor: "#22C55E", marginTop: 12 }]} onPress={complete} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete & Dispense</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, theme }: any) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingBottom: BOTTOM_SPACE },
  buttonContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  prescriptionCard: {
    marginHorizontal: 20, marginTop: 24, marginBottom: 24, borderRadius: 24, padding: 22,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sectionHeading: { marginLeft: 8, fontSize: 18, fontWeight: "700" },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: { fontSize: 15 },
  value: { fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: "700" },
  divider: { height: 1, marginVertical: 20 },
  medicineRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8,
  },
  medicineLabel: { fontSize: 14 },
  medicineValue: { fontSize: 15, fontWeight: "700" },
  medicineCard: { borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1 },
  medicineName: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  testsNote: { marginTop: 16, fontSize: 13, fontStyle: "italic" },
  instructionsBox: { flexDirection: "row", alignItems: "flex-start", marginTop: 16, borderRadius: 12, padding: 12 },
  instructionsText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 21 },
  availableBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  availableText: { color: "#16A34A", fontSize: 12, fontWeight: "700" },
  outOfStockBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  outOfStockText: { color: "#DC2626", fontSize: 12, fontWeight: "700" },
  lpButton: { borderRadius: 50, padding: 16, alignItems: "center", marginBottom: 12 },
  completeButton: { borderRadius: 50, padding: 16, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
