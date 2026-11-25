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
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { API_BASE_URL } from "../../../config/api.config";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function BackupScreen() {
  const { theme } = useTheme();
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // which item is downloading

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.listBackups();
      const list = res?.days || [];
      setDays(list);
      autoSaveLatest(list);
    } catch (e) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Silently keep a LOCAL copy of the latest day's backup on the device (once a
  // day), so a server failure never means data loss. No dialog — it just saves
  // into the app's document storage.
  const autoSaveLatest = useCallback(async (list: any[]) => {
    try {
      if (!list.length) return;
      const latest = list[0].date;
      const stampKey = "pharmacy_backup_autosaved";
      const already = await AsyncStorage.getItem(stampKey);
      if (already === latest) return; // already saved today's latest
      const token = await AsyncStorage.getItem("auth_token");
      const dir = (FileSystem.documentDirectory || "") + "sehatline-backups/";
      try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch (e) {}
      const url = `${API_BASE_URL}/pharmacy/backup/${latest}/download`;
      const { status } = await FileSystem.downloadAsync(url, `${dir}pharmacy-backup-${latest}.xlsx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (status < 400) await AsyncStorage.setItem(stampKey, latest);
    } catch (e) { /* best-effort; the manual download is always available */ }
  }, []);

  useEffect(() => {
    load();
    const unsub = onPharmacyUpdate(() => load());
    return () => unsub && unsub();
  }, [load]);

  const download = useCallback(async (pathSuffix: string, fileName: string, key: string) => {
    setBusy(key);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const url = `${API_BASE_URL}/pharmacy/backup/${pathSuffix}`;
      const target = (FileSystem.cacheDirectory || "") + fileName;
      const { uri, status } = await FileSystem.downloadAsync(url, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (status >= 400) throw new Error(`Server returned ${status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: "Save / share backup", UTI: "com.microsoft.excel.xlsx" });
      } else {
        pharmAlert("Downloaded", `Saved to:\n${uri}`);
      }
    } catch (e: any) {
      pharmAlert("Download failed", e?.message || "Could not download the backup.");
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Backup" subtitle="Daily dispensing records (Excel)" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />
        }
      >
        {/* Export all → master workbook */}
        <TouchableOpacity
          style={[styles.exportAll, { backgroundColor: theme.colors.primary, opacity: busy === "all" ? 0.7 : 1 }]}
          onPress={() => download("export-all/download", `pharmacy-backup-ALL-${Date.now()}.xlsx`, "all")}
          disabled={!!busy}
          activeOpacity={0.85}
        >
          {busy === "all" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="albums-outline" size={20} color="#FFFFFF" />
              <Text style={styles.exportAllText}>Export All (Master Excel)</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 18, textAlign: "center" }}>
          Auto-backup runs daily at 2:00 PM · Capital Hospital, CDA G-6/2 Islamabad
        </Text>

        {loading ? (
          <SkeletonList count={4} dark={theme.dark} />
        ) : days.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.textSecondary }}>
            No dispensing records to back up yet.
          </Text>
        ) : (
          days.map((d) => (
            <View key={d.date} style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
                <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.date, { color: theme.colors.text }]}>{prettyDate(d.date)}</Text>
                <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
                  {d.count} patient{d.count === 1 ? "" : "s"} dispensed
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.dlBtn, { backgroundColor: theme.colors.primary, opacity: busy === d.date ? 0.7 : 1 }]}
                onPress={() => download(`${d.date}/download`, `pharmacy-backup-${d.date}.xlsx`, d.date)}
                disabled={!!busy}
              >
                {busy === d.date ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  exportAll: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16, marginBottom: 8, elevation: 2,
  },
  exportAllText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14, flexShrink: 1 },
  card: {
    flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2,
  },
  iconWrap: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  date: { fontSize: 15, fontWeight: "700" },
  count: { fontSize: 13, marginTop: 3 },
  dlBtn: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", marginLeft: 10 },
});
