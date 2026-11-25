import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import Colors from "../constants/colors";

import GradientHeader from "../components/common/GradientHeader";
import QueueFilter from "../components/queue/QueueFilter";
import QueuePatientCard from "../components/queue/QueueCard";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function QueueScreen() {
  const [activeFilter, setActiveFilter] = useState("All");
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getQueue();
      setQueue(res?.queue || []);
    } catch (e) {
      // offline — keep what we have
    } finally {
      setLoading(false);
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

  const filtered = queue.filter((item) =>
    activeFilter === "All"
      ? true
      : activeFilter === "Waiting"
      ? item.pharmacyStatus === "pending"
      : activeFilter === "Ready"
      ? item.pharmacyStatus === "ready"
      : true
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <GradientHeader
        title="Today's Queue"
        subtitle="Manage patient prescriptions"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Tab bar (patti) — switch between All / Waiting / Ready.
            Light theme: white track, dark-slate selected pill, white text.
            Dark theme: dark-slate track, white selected pill. */}
        <View
          style={[
            styles.segments,
            theme.dark
              ? { backgroundColor: "#1F2937" }
              : { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: theme.colors.border },
          ]}
        >
          {[
            { k: "All", n: queue.length },
            { k: "Waiting", n: queue.filter((q: any) => q.pharmacyStatus === "pending").length },
            { k: "Ready", n: queue.filter((q: any) => q.pharmacyStatus === "ready").length },
          ].map((t) => {
            const active = activeFilter === t.k;
            // Light mode: teal pill with WHITE text. Dark mode keeps the white
            // pill + dark-slate text (already fine).
            const activePill = theme.dark ? "#FFFFFF" : theme.colors.primary;
            const activeTextColor = theme.dark ? "#1F2937" : "#FFFFFF";
            const idleTextColor = theme.dark ? "#CBD5E1" : "#475569";
            return (
              <TouchableOpacity
                key={t.k}
                onPress={() => setActiveFilter(t.k)}
                activeOpacity={0.85}
                style={[styles.segment, active && { backgroundColor: activePill }]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? activeTextColor : idleTextColor, fontWeight: active ? "800" : "600" },
                  ]}
                >
                  {t.k}{t.n > 0 ? ` (${t.n})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 20 }}>
          {loading ? (
            <SkeletonList count={6} dark={theme.dark} />
          ) : filtered.length === 0 ? (
            <Text
              style={{
                textAlign: "center",
                marginTop: 40,
                color: theme.colors.textSecondary,
              }}
            >
              No prescriptions in the queue.
            </Text>
          ) : (
            filtered.map((item) => (
              <QueuePatientCard
                key={item.id}
                cardNo={item.cardNo}
                patientName={item.patientName}
                doctorName={item.doctorName}
                status={(item.status === "Ready" ? "Ready" : "Waiting") as any}
                time={item.time}
                onPress={() =>
                  navigation.navigate("PrescriptionDetails", {
                    prescriptionId: item.id,
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  segments: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segmentText: { fontSize: 13 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
});
