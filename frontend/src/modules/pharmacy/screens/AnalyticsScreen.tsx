import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import OverviewCard from "../components/analytics/overViewCard";
import InventoryStatusCard from "../components/analytics/inventoryStatusCard";
import LowStockCard from "../components/analytics/lowStockCard";
import MedicineItem from "../components/analytics/medicineItem";
import SummaryCard from "../components/analytics/summaryCard";
import GradientHeader from "../components/common/GradientHeader";
import { LineChart, PieChart } from "react-native-chart-kit";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const screenWidth = Dimensions.get("window").width;
const PIE_COLORS = ["#0BAA9D", "#6DD5C4", "#AEEFE5", "#4B9B6E", "#B8E9DE", "#F59E0B"];

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getAnalytics();
      if (res?.success) setData(res);
    } catch (e) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh live on inventory/dispense changes AND whenever we return here,
    // so adding a medicine or a new dispense updates the charts immediately.
    const unsubFocus = navigation.addListener("focus", load);
    const unsub = onPharmacyUpdate(() => load());
    return () => {
      unsubFocus && unsubFocus();
      unsub && unsub();
    };
  }, [load, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <GradientHeader title="Analytics" subtitle="Pharmacy performance overview" />
        <SkeletonScreen cards={2} topInset={false} dark={theme.dark} />
      </SafeAreaView>
    );
  }

  const d = data || {};
  const weekly = d.weekly || [];
  const lineData = {
    labels: weekly.length ? weekly.map((w: any) => w.label) : ["—"],
    datasets: [{ data: weekly.length ? weekly.map((w: any) => w.count) : [0] }],
  };
  const cats = d.categories || [];
  const pieData = (cats.length ? cats : [{ name: "No data", count: 1 }]).map((c: any, i: number) => ({
    name: c.name,
    population: c.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
    legendFontColor: theme.colors.text,
    legendFontSize: 13,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />
        }
      >
        <GradientHeader title="Analytics" subtitle="Pharmacy performance overview" />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Summary</Text>
        <View style={styles.grid}>
          <OverviewCard title="Prescriptions" value={String(d.overview?.prescriptions ?? 0)} icon="document-text-outline" />
          <OverviewCard title="Dispensed" value={String(d.overview?.dispensed ?? 0)} icon="medkit-outline" />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Dispensed This Week</Text>
        <View style={[styles.chartCard, { backgroundColor: theme.colors.card }]}>
          <LineChart
            data={lineData}
            width={screenWidth - 80}
            height={200}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            withShadow={false}
            chartConfig={{
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 0,
              color: () => theme.colors.primary,
              labelColor: () => theme.colors.textSecondary,
              propsForDots: { r: "5", strokeWidth: "2", stroke: theme.colors.primary },
            }}
            style={{ borderRadius: 16 }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Medicine Categories</Text>
        <View style={[styles.chartCard, { backgroundColor: theme.colors.card }]}>
          <PieChart
            data={pieData}
            width={screenWidth - 60}
            height={210}
            accessor="population"
            backgroundColor="transparent"
            chartConfig={{ color: () => theme.colors.primary }}
            paddingLeft="20"
            absolute
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Inventory Status</Text>
        <View style={styles.grid}>
          <InventoryStatusCard title="In Stock" value={String(d.inventory?.inStock ?? 0)} type="success" />
          <InventoryStatusCard title="Low Stock" value={String(d.inventory?.lowStock ?? 0)} type="warning" />
          <InventoryStatusCard title="Out of Stock" value={String(d.inventory?.outOfStock ?? 0)} type="danger" />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Low Stock Alerts{(d.lowStockList || []).length ? `  (${d.lowStockList.length})` : ""}
        </Text>
        {(d.lowStockList || []).length === 0 ? (
          <Text style={{ marginHorizontal: 20, color: theme.colors.textSecondary, marginBottom: 20 }}>All medicines are well-stocked.</Text>
        ) : (
          <View style={styles.lowStockBox}>
            <ScrollView
              style={{ maxHeight: 300 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingVertical: 6 }}
            >
              {d.lowStockList.map((m: any, i: number) => (
                <LowStockCard key={i} medicine={m.name} stock={m.stock} />
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Dispensed Medicines</Text>
        {(d.topDispensed || []).length === 0 ? (
          <Text style={{ marginHorizontal: 20, color: theme.colors.textSecondary, marginBottom: 20 }}>No dispensing data yet.</Text>
        ) : (
          <View style={styles.lowStockBox}>
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{ paddingVertical: 4 }}>
              {d.topDispensed.map((m: any, i: number) => <MedicineItem key={i} rank={i + 1} name={m.name} count={String(m.count)} />)}
            </ScrollView>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, marginTop: 8, marginHorizontal: 20 },
  lowStockBox: { marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24, paddingHorizontal: 20, marginTop: 12 },
  chartCard: {
    borderRadius: 22, paddingVertical: 20, marginBottom: 30, marginHorizontal: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
});
