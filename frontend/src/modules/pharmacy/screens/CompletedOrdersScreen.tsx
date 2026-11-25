import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

import CompleteOrder from "../components/completed/completeOrder";
import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

type Range = "today" | "all";

// Full list of completed (dispensed) patients. Opened from the dashboard's
// "Completed Orders" card. Today / All tabs, search, tap a patient to see the
// doctor and the medicines that were given.
export default function CompletedOrdersScreen() {
  const route = useRoute<any>();
  const [range, setRange] = useState<Range>(route.params?.range === "all" ? "all" : "today");
  const [search, setSearch] = useState("");
  const { theme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState({ today: 0, all: 0 });
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const runBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      const res = await pharmacyService.createBackup();
      pharmAlert(
        "Backup Saved",
        `${res?.count ?? 0} dispensed record(s) saved to a formatted Excel sheet (${res?.fileName || "pharmacy backup"}).\n\nAn automatic backup also runs every day at 2:00 PM when the hospital closes.`
      );
    } catch (e: any) {
      pharmAlert("Backup Failed", e?.message || "Could not create the backup.");
    } finally {
      setBackingUp(false);
    }
  }, []);

  const load = useCallback(async (r: Range) => {
    try {
      const res = await pharmacyService.getCompleted(r);
      setOrders(res?.orders || []);
      setCounts({ today: res?.todayCount ?? 0, all: res?.totalCount ?? 0 });
    } catch (e) {
      // offline — keep what we have
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
    const unsub = onPharmacyUpdate(() => load(range));
    return () => unsub && unsub();
  }, [load, range]);

  const q = search.trim().toLowerCase();
  const filtered = orders.filter(
    (item) =>
      !q ||
      String(item.patientName || "").toLowerCase().includes(q) ||
      String(item.cardNo || "").toLowerCase().includes(q) ||
      String(item.doctorName || "").toLowerCase().includes(q)
  );

  const tabs: { key: Range; label: string; count: number }[] = [
    { key: "today", label: "Today", count: counts.today },
    { key: "all", label: "All", count: counts.all },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Completed Orders" subtitle="Patients whose medicines were dispensed" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.colors.background }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(range);
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Today / All */}
        <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {tabs.map((t) => {
            const active = range === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && { backgroundColor: theme.colors.primary }]}
                onPress={() => setRange(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, { color: active ? "#FFFFFF" : theme.colors.text }]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          placeholder="Search patient, card number or doctor"
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
        />

        <TouchableOpacity
          style={[styles.backupBtn, { backgroundColor: theme.colors.primary, opacity: backingUp ? 0.7 : 1 }]}
          onPress={runBackup}
          disabled={backingUp}
          activeOpacity={0.85}
        >
          {backingUp ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.backupBtnText}>Backup Today's Records (Excel)</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 18, textAlign: "center" }}>
          Auto-backup runs daily at 2:00 PM · Doctor, card no. & medicines recorded
        </Text>

        {!loading && filtered.length > 0 && (
          <Text style={[styles.countLine, { color: theme.colors.textSecondary }]}>
            {filtered.length} patient{filtered.length === 1 ? "" : "s"}
            {range === "today" ? " today" : ""}{q ? " (filtered)" : ""}
          </Text>
        )}

        {loading ? (
          <SkeletonList count={5} dark={theme.dark} />
        ) : filtered.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.textSecondary }}>
            {q ? "No patient matches your search." : range === "today" ? "No completed orders today yet." : "No completed orders yet."}
          </Text>
        ) : (
          filtered.map((item) => (
            <CompleteOrder
              key={item.id}
              patientName={item.patientName}
              cardNumber={item.cardNo}
              collectedTime={item.collectedTime || "—"}
              collectedDate={range === "all" ? item.collectedDate : undefined}
              doctorName={item.doctorName}
              counter={item.counter}
              medicines={item.medicines}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 30 },
  tabs: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "800" },
  search: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 16, fontSize: 16, elevation: 2, borderWidth: 1 },
  backupBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 14, marginBottom: 8, elevation: 2,
  },
  backupBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  countLine: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
});
