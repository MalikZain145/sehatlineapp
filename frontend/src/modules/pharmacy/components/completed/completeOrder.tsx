import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  patientName: string;
  cardNumber: string;
  collectedTime: string;
  collectedDate?: string;
  doctorName?: string;
  counter?: string;
  medicines?: string[];
}

// One completed patient. Tap to expand → doctor, counter and the medicines
// that were dispensed.
export default function CompletedOrderCard({
  patientName,
  cardNumber,
  collectedTime,
  collectedDate,
  doctorName,
  counter,
  medicines = [],
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const hasDetails = !!doctorName || !!counter || medicines.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={hasDetails ? 0.85 : 1}
      onPress={() => hasDetails && setOpen((o) => !o)}
      style={[styles.card, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.row}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="check-circle" size={34} color="#22C55E" />
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
              {patientName}
            </Text>
            {!!cardNumber && (
              <Text style={[styles.cardNo, { color: theme.colors.textSecondary }]}>
                Card #{cardNumber}
              </Text>
            )}
            <Text style={[styles.time, { color: theme.colors.primary }]}>
              Collected {collectedDate ? `${collectedDate}, ` : "at "}{collectedTime}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Completed</Text>
          </View>
          {hasDetails && (
            <Ionicons
              name={open ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textSecondary}
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </View>

      {open && (
        <View style={[styles.details, { borderTopColor: theme.colors.border }]}>
          {!!doctorName && (
            <Text style={[styles.detailLine, { color: theme.colors.text }]}>
              <Text style={styles.detailLabel}>Doctor: </Text>{doctorName}
            </Text>
          )}
          {!!counter && (
            <Text style={[styles.detailLine, { color: theme.colors.text }]}>
              <Text style={styles.detailLabel}>Counter: </Text>{counter}
            </Text>
          )}
          {medicines.length > 0 && (
            <>
              <Text style={[styles.detailLine, styles.detailLabel, { color: theme.colors.text }]}>
                Medicines ({medicines.length}):
              </Text>
              {medicines.map((m, i) => (
                <Text key={i} style={[styles.med, { color: theme.colors.textSecondary }]}>
                  • {m}
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      default: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  cardNo: {
    marginTop: 4,
    fontSize: 14,
  },
  time: {
    marginTop: 6,
    fontWeight: "600",
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#16A34A",
  },
  details: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailLine: {
    fontSize: 14,
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: "800",
  },
  med: {
    fontSize: 13.5,
    marginLeft: 8,
    marginBottom: 4,
  },
});
