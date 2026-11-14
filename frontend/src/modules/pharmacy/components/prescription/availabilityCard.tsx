import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

const AvailabilityCard = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Medicine Availability</Text>

      <View style={styles.row}>
        <Ionicons
          name="checkmark-circle"
          size={22}
          color="#22C55E"
        />
        <Text style={styles.text}>Available: 8 Medicines</Text>
      </View>

      <View style={styles.row}>
        <Ionicons
          name="warning"
          size={22}
          color="#F59E0B"
        />
        <Text style={styles.text}>Low Stock: 1 Medicine</Text>
      </View>

      <View style={styles.row}>
        <Ionicons
          name="close-circle"
          size={22}
          color="#EF4444"
        />
        <Text style={styles.text}>Out of Stock: 0</Text>
      </View>
    </View>
  );
};

export default AvailabilityCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 15,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  text: {
    marginLeft: 10,
    fontSize: 15,
    color: Colors.text,
  },
});