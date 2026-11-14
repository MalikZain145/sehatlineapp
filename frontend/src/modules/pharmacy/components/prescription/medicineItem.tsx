import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface MedicineItemProps {
  medicineName: string;
  dosage: string;
  quantity: string;
  available: boolean;
}

const MedicineItem = ({
  medicineName,
  dosage,
  quantity,
  available,
}: MedicineItemProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="medkit"
            size={24}
            color={Colors.purpleIcon}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name}>{medicineName}</Text>
          <Text style={styles.dosage}>{dosage}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <Text style={styles.quantity}>
          Quantity: {quantity}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: available
                ? "#DCFCE7"
                : "#FEE2E2",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: available
                  ? "#16A34A"
                  : "#DC2626",
              },
            ]}
          >
            {available ? "Available" : "Out of Stock"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MedicineItem;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    marginLeft: 15,
    flex: 1,
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },

  dosage: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 15,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  quantity: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },

  statusText: {
    fontWeight: "700",
    fontSize: 12,
  },
});