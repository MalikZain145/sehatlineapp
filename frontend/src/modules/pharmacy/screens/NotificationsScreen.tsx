import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

// The pharmacist's real notifications (admin announcements + any updates), read
// from the role-neutral /api/notifications endpoint. Tap one to open it (marks
// it read); the header shows the unread count and a mark-all-read action.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "system", label: "Announcements" },
  { key: "order", label: "Updates" },
] as const;

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getMyNotifications();
      setItems(res?.notifications || []);
    } catch (e) {
      // offline — keep what we have
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = onPharmacyUpdate(() => load());
    return () => unsub && unsub();
  }, [load]);

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = items.filter((n) => filter === "all" || n.type === filter);

  const openItem = async (item: any) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
      try { await pharmacyService.markNotificationRead(item._id); } catch (e) {}
    }
    setSelected({ ...item, read: true });
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await pharmacyService.markAllNotificationsRead(); } catch (e) {}
  };

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  };
  const cleanTitle = (t: string) => String(t || "").replace(/^📢\s*/, "");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Notifications" />

      {/* Toolbar: filter dropdown + mark-all-read */}
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.countRow} activeOpacity={0.7} onPress={() => setFilterOpen(true)}>
          <Ionicons name="funnel-outline" size={15} color={theme.colors.primary} />
          <Text style={[styles.countText, { color: theme.colors.text }]}>
            {FILTERS.find((f) => f.key === filter)?.label || "All"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={markAllRead}
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="checkmark-done" size={24} color={unreadCount ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />
        }
      >
        {loading ? (
          <SkeletonList count={6} dark={theme.dark} />
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={54} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{items.length === 0 ? "No notifications yet." : "Nothing in this filter."}</Text>
          </View>
        ) : (
          visible.map((n) => {
            const unread = !n.read;
            return (
              <TouchableOpacity
                key={n._id}
                activeOpacity={0.8}
                onPress={() => openItem(n)}
                style={[
                  styles.card,
                  {
                    backgroundColor: unread ? theme.colors.primary + "18" : theme.colors.card,
                    borderColor: unread ? theme.colors.primary + "55" : theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.colors.primary + "22" }]}>
                  <Ionicons name={n.icon === "megaphone" ? "megaphone" : (n.icon || "notifications")} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.colors.text, fontWeight: unread ? "800" : "600" }]} numberOfLines={1}>
                    {cleanTitle(n.title)}
                  </Text>
                  <Text style={[styles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>{n.body}</Text>
                  <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{fmt(n.createdAt)}</Text>
                </View>
                {unread && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.primary + "22", alignSelf: "center", marginBottom: 12 }]}>
              <Ionicons name={selected?.icon === "megaphone" ? "megaphone" : (selected?.icon || "notifications")} size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{cleanTitle(selected?.title)}</Text>
            <Text style={[styles.sheetTime, { color: theme.colors.textSecondary }]}>{fmt(selected?.createdAt)}</Text>
            <Text style={[styles.sheetBody, { color: theme.colors.text }]}>{selected?.body}</Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter dropdown */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={[styles.filterSheet, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.filterSheetTitle, { color: theme.colors.text }]}>Filter</Text>
            {FILTERS.map((f, idx) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterRow, { borderBottomColor: theme.colors.border, borderBottomWidth: idx === FILTERS.length - 1 ? 0 : 1 }]}
                  onPress={() => { setFilter(f.key); setFilterOpen(false); }}
                >
                  <Text style={{ color: active ? theme.colors.primary : theme.colors.text, fontSize: 15, fontWeight: active ? "800" : "500" }}>{f.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  toolbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  countRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  countText: { fontSize: 13.5, fontWeight: "700" },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  markAllText: { fontSize: 12.5, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14.5 },
  body: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  empty: { alignItems: "center", marginTop: 70 },
  emptyText: { fontSize: 14, marginTop: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 28 },
  sheet: { borderRadius: 20, padding: 22, elevation: 8 },
  sheetTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  sheetTime: { fontSize: 12, textAlign: "center", marginTop: 4 },
  sheetBody: { fontSize: 14.5, lineHeight: 22, marginTop: 14 },
  closeBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  closeBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  filterSheet: { borderRadius: 18, paddingVertical: 6 },
  filterSheetTitle: { fontSize: 16, fontWeight: "800", paddingHorizontal: 20, paddingVertical: 12 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15 },
});
