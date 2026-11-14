import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';

// Relative "x min ago" label from an ISO date.
function relTime(iso) {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function toRow(n) {
  return {
    id: n._id,
    title: n.title,
    message: n.body || "",
    type: n.type || "system",
    icon: n.icon || "",
    time: relTime(n.createdAt),
    read: !!n.read,
  };
}

// Filters (mirrors the pharmacy notifications screen). "Updates" = anything
// that is not an admin announcement.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "system", label: "Announcements" },
  { key: "updates", label: "Updates" },
];

export default function NotificationScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try { const res = await laboratoryService.getNotifications(); setNotifications((res?.notifications || []).map(toRow)); }
    catch (e) { /* offline */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const visible = notifications.filter((n) =>
    filter === "all"
      ? true
      : filter === "system"
      ? n.type === "system"
      : n.type !== "system"
  );

  /* ================================================= */
  /* NOTIFICATION ICON */
  /* ================================================= */

  const getNotificationIcon = (type) => {
    switch (type) {
      case "requisition":
        return "document-text-outline";

      case "sample":
        return "flask-outline";

      case "report":
        return "cloud-upload-outline";

      case "inventory":
        return "cube-outline";

      case "completed":
        return "checkmark-circle-outline";

      default:
        return "notifications-outline";
    }
  };

  /* ================================================= */
  /* NOTIFICATION COLOR */
  /* ================================================= */

  const getNotificationColor = (type) => {
    switch (type) {
      case "requisition":
        return colors.primary;

      case "sample":
        return colors.blue;

      case "report":
        return colors.success;

      case "inventory":
        return colors.warning;

      case "completed":
        return colors.success;

      default:
        return colors.primary;
    }
  };

  /* ================================================= */
  /* MARK AS READ */
  /* ================================================= */

  const markAsRead = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    laboratoryService.markNotificationRead(id).catch(() => {});
  };

  /* ================================================= */
  /* MARK ALL AS READ */
  /* ================================================= */

  const markAllAsRead = () => {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, read: true }))
    );
    laboratoryService.markAllNotificationsRead().catch(() => {});
  };

  /* ================================================= */
  /* NOTIFICATION CARD */
  /* ================================================= */

  const renderNotification = ({ item }) => {
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => markAsRead(item.id)}
        style={[
          styles.notificationCard,
          {
            backgroundColor: item.read
              ? colors.surface
              : colors.mint,

            borderColor: colors.border,
          },
        ]}
      >
        {/* ICON */}

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={24}
            color={iconColor}
          />
        </View>

        {/* CONTENT */}

        <View style={styles.notificationContent}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              {item.title}
            </Text>

            {!item.read && (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            )}
          </View>

          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {item.message}
          </Text>

          <Text
            style={[
              styles.time,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {item.time}
          </Text>
        </View>

        {/* ARROW */}

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* HEADER */}

<GradientHeader title="Notifications" subtitle="Laboratory updates and alerts" />

      {/* TOOLBAR: filter dropdown + mark-all-read */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.filterChip} activeOpacity={0.7} onPress={() => setFilterOpen(true)}>
          <Ionicons name="funnel-outline" size={15} color={colors.primary} />
          <Text style={[styles.filterChipText, { color: colors.text }]}>
            {FILTERS.find((f) => f.key === filter)?.label || "All"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={markAllAsRead}
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.markAllRow}
        >
          <Ionicons name="checkmark-done" size={20} color={unreadCount ? colors.primary : colors.textSecondary} />
          <Text style={[styles.markAllText, { color: unreadCount ? colors.primary : colors.textSecondary }]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* NOTIFICATION LIST */}

<FlatList
  data={visible}
  keyExtractor={(item) => item.id}
  renderItem={renderNotification}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.list}
  ListEmptyComponent={
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name="notifications-off-outline"
          size={40}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color: colors.text,
          },
        ]}
      >
        {notifications.length === 0 ? "No Notifications" : "Nothing here"}
      </Text>

      <Text
        style={[
          styles.emptyText,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {notifications.length === 0
          ? "You're all caught up. New laboratory updates will appear here."
          : "No notifications match this filter."}
      </Text>
    </View>
  }
/>

      {/* FILTER DROPDOWN */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.filterSheetTitle, { color: colors.text }]}>Filter</Text>
            {FILTERS.map((f, idx) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterRow, { borderBottomColor: colors.border, borderBottomWidth: idx === FILTERS.length - 1 ? 0 : 1 }]}
                  onPress={() => { setFilter(f.key); setFilterOpen(false); }}
                >
                  <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? "800" : "500" }}>{f.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
header: {
  height: topPad(100),
  paddingHorizontal: 18,
  paddingTop: topPad(35),
  flexDirection: "row",
  alignItems: "center",

},

headerButton: {
  width: 42,
  height: 42,
  justifyContent: "center",
  alignItems: "center",
},

headerTextContainer: {
  flex: 1,
  marginLeft: 8,
},

headerTitle: {
  color: "#FFFFFF",
  fontSize: 21,
  fontWeight: "800",
},

headerSubtitle: {
  color: "#E6FFFB",
  fontSize: 12,
  fontWeight: "600",
  marginTop: 3,
},

headerSpacer: {
  width: 42,
},

  
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  filterChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterChipText: { fontSize: 13.5, fontWeight: "700" },

  markAllRow: { flexDirection: "row", alignItems: "center", gap: 5 },

  markAllText: {
    fontSize: 12.5,
    fontWeight: "800",
  },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 28 },
  filterSheet: { borderRadius: 18, paddingVertical: 6 },
  filterSheetTitle: { fontSize: 16, fontWeight: "800", paddingHorizontal: 20, paddingVertical: 12 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15 },

  list: {
  paddingHorizontal: 18,
  paddingTop: 15,
  paddingBottom: 30,
},

  notificationCard: {
    minHeight: 105,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 5,
  },

  message: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },

  time: {
    fontSize: 10,
    marginTop: 6,
  },

  

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 100,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
});