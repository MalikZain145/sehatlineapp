import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  FlatList,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Text,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import GradientHeader from "../components/common/GradientHeader";
import MedicineCard from "../components/inventory/medicineCard";
import QueueFilter from "../components/queue/QueueFilter";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE, BOTTOM_INSET } from '../../../utils/bottomInset';

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load the full inventory once; searching + status filtering happen locally
  // so results update instantly as the pharmacist types.
  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.listInventory({} as any);
      setMedicines(res?.medicines || []);
    } catch (e) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Instant client-side filter (name, generic, strength, category) + status.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (activeFilter !== "All" && m.status !== activeFilter) return false;
      if (!q) return true;
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.genericName || "").toLowerCase().includes(q) ||
        (m.strength || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q)
      );
    });
  }, [medicines, search, activeFilter]);

  const confirmDelete = useCallback((item: any) => {
    pharmAlert("Delete Medicine", `Remove ${item.name} from inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Optimistic removal, then sync with the server.
          setMedicines((prev) => prev.filter((m) => m.id !== item.id));
          try {
            await pharmacyService.deleteMedicine(item.id);
          } catch (e: any) {
            pharmAlert("Error", e?.message || "Could not delete. Restoring.");
            load();
          }
        },
      },
    ]);
  }, [load]);

  useEffect(() => {
    load();
    const unsubFocus = navigation.addListener("focus", load);
    const unsub = onPharmacyUpdate((p: any) => {
      if (!p || p.type === "inventory") load();
    });
    return () => {
      unsubFocus && unsubFocus();
      unsub && unsub();
    };
  }, [load, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Medicine Inventory" subtitle="Manage medicine stock" />

      {/* Pinned search + filter (kept out of the list so typing never loses focus) */}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by name, generic, strength…"
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[styles.search, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["All", "In Stock", "Low Stock", "Out of Stock"].map((f) => (
            <QueueFilter key={f} title={f} active={activeFilter === f} onPress={() => setActiveFilter(f)} />
          ))}
        </ScrollView>
      </View>

      {/* Virtualized list — fast even with hundreds of medicines. */}
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MedicineCard
            medicine={item}
            onPress={() => navigation.navigate("MedicineDetails", { medicine: item })}
            onEdit={() => navigation.navigate("EditMedicine", { medicine: item })}
            onDelete={() => confirmDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={6} dark={theme.dark} />
          ) : (
            <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.textSecondary }}>
              {medicines.length === 0 ? "No medicines found. Tap + to add one." : "No medicines match your search."}
            </Text>
          )
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("AddMedicine")}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  searchWrap: { paddingHorizontal: 20, paddingTop: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 2 },
  search: {
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 18, fontSize: 16, elevation: 2,
  },
  fab: {
    position: "absolute", bottom: 30 + BOTTOM_INSET, right: 25, width: 64, height: 64, borderRadius: 32,
    justifyContent: "center", alignItems: "center", elevation: 8,
  },
});
