import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface Props {
  medicineName: string;
  dosage: string;
  quantity: string;
  available: boolean;
  checked: boolean;
  onPress: () => void;
}

export default function MedicineChecklist({
  medicineName,
  dosage,
  quantity,
  available,
  checked,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.row}>

        <TouchableOpacity onPress={onPress}>
          <MaterialCommunityIcons
            name={
              checked
                ? "checkbox-marked-circle"
                : "checkbox-blank-circle-outline"
            }
            size={30}
            color={
              checked
                ? "#22C55E"
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>

        <View style={styles.content}>

          <View style={styles.topRow}>
            <Text style={styles.name}>
              {medicineName}
            </Text>

            <MaterialCommunityIcons
              name="pill"
              size={24}
              color={Colors.purpleIcon}
            />
          </View>

          <Text style={styles.subtitle}>
            {dosage}
          </Text>

          <Text style={styles.info}>
            Quantity: {quantity}
          </Text>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: available
                  ? "#DCFCE7"
                  : "#FEE2E2",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: available
                    ? "#16A34A"
                    : "#DC2626",
                },
              ]}
            >
              {available
                ? "Available"
                : "Out of Stock"}
            </Text>
          </View>

        </View>

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  content: {
    flex: 1,
    marginLeft: 15,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
    marginRight: 10,
  },

  subtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14,
  },

  info: {
    marginTop: 10,
    fontWeight: "600",
    color: Colors.text,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  location: {
    marginLeft: 6,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  badge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
});