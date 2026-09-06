import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SideMenu from "../components/profile/sideMenu";
import { useNavigation } from "@react-navigation/native";
import Colors from "../constants/colors";
import AppHeader from "../components/common/AppHeader";
import { useTheme } from "../Theme/themeContext";
import StatCard from "../components/dashboard/statCard";
import ActionCard from "../components/dashboard/actionCard";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live-ish clock for the Today's Queue strip (updates every 30s).
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Everyone still in the pharmacy queue (waiting + being prepared + ready).
  const queueTotal =
    (stats.waiting ?? 0) + (stats.preparing ?? 0) + (stats.ready ?? 0);
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getDashboard();
      if (res?.stats) setStats(res.stats);
    } catch (e) {
      // offline
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubFocus = navigation.addListener("focus", load);
    const unsub = onPharmacyUpdate(() => load());
    return () => {
      unsubFocus && unsubFocus();
      unsub && unsub();
    };
  }, [load, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.colors.background }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressViewOffset={80}
          />
        }
      >
        <AppHeader onMenuPress={() => setMenuVisible(true)} />

        {/* Today's Queue strip — tap to open the live queue (same as sidebar). */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Queue")}
          style={[styles.queueStrip, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.queueStripTop}>
            <Ionicons name="list-outline" size={20} color="#FFFFFF" />
            <Text style={styles.queueStripTitle}>Today's Queue</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" style={{ marginLeft: "auto" }} />
          </View>
          <View style={styles.queueStripBottom}>
            <View style={styles.queueStripDate}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.queueStripDateText}>{dateStr} · {timeStr}</Text>
            </View>
            <View style={styles.queueStripCount}>
              <Text style={styles.queueStripCountNum}>{queueTotal}</Text>
              <Text style={styles.queueStripCountLabel}>{queueTotal === 1 ? "patient in queue" : "patients in queue"}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Completed Orders — how many patients got their medicines today. */}
        <View style={[styles.completedCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-done-outline" size={24} color="#22C55E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.completedLabel, { color: theme.colors.text }]}>Completed Orders</Text>
            <Text style={[styles.completedSub, { color: theme.colors.textSecondary }]}>Patients whose medicines were dispensed today</Text>
          </View>
          <Text style={styles.completedNum}>{stats.dispensedToday ?? 0}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard title="Waiting" count={stats.waiting ?? 0} icon="time-outline" iconColor="#F59E0B" />
          <StatCard title="Preparing" count={stats.preparing ?? 0} icon="flask-outline" iconColor="#3B82F6" />
          <StatCard title="Ready Pickup" count={stats.ready ?? 0} icon="checkmark-circle-outline" iconColor="#22C55E" />
          <StatCard title="Dispensed Today" count={stats.dispensedToday ?? 0} icon="medkit-outline" iconColor="#0BAA9D" />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Inventory Status</Text>
        <View style={styles.statsGrid}>
          <StatCard title="In Stock" count={stats.inStock ?? 0} icon="cube-outline" iconColor="#22C55E" />
          <StatCard title="Low Stock" count={stats.lowStock ?? 0} icon="alert-circle-outline" iconColor="#F59E0B" />
          <StatCard title="Out of Stock" count={stats.outOfStock ?? 0} icon="close-circle-outline" iconColor="#EF4444" />
          <StatCard title="Inventory" count={(stats.inStock ?? 0) + (stats.lowStock ?? 0) + (stats.outOfStock ?? 0)} icon="albums-outline" iconColor="#8B5CF6" />
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 18, marginTop: 10 },

  // Today's Queue strip (patti)
  queueStrip: {
    borderRadius: 20,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  queueStripTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  queueStripTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  queueStripBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 },
  queueStripDate: { flexDirection: "row", alignItems: "center", gap: 6 },
  queueStripDateText: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "600" },
  queueStripCount: { alignItems: "flex-end" },
  queueStripCountNum: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", lineHeight: 32 },
  queueStripCountLabel: { color: "rgba(255,255,255,0.92)", fontSize: 11.5, fontWeight: "600" },

  // Completed Orders card
  completedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  completedIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#22C55E20",
    justifyContent: "center",
    alignItems: "center",
  },
  completedLabel: { fontSize: 16, fontWeight: "800" },
  completedSub: { fontSize: 12, marginTop: 2 },
  completedNum: { fontSize: 30, fontWeight: "900", color: "#22C55E" },
});
