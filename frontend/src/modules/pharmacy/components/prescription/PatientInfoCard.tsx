import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface PatientInfoCardProps {
  name: string;
  cardNumber: string;
  age: number;
  gender: string;
  phone: string;
}

const PatientInfoCard = ({
  name,
  cardNumber,
  age,
  gender,
  phone,
}: PatientInfoCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="person-circle"
          size={50}
          color={Colors.blueIcon}
        />

        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.cardNo}>Card #{cardNumber}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.purpleIcon}
        />
        <Text style={styles.label}>Age</Text>
        <Text style={styles.value}>{age} Years</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="male-female-outline"
          size={20}
          color={Colors.redIcon}
        />
        <Text style={styles.label}>Gender</Text>
        <Text style={styles.value}>{gender}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="call-outline"
          size={20}
          color={Colors.primary}
        />
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{phone}</Text>
      </View>
    </View>
  );
};

export default PatientInfoCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 3.4, elevation: 3,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerText: {
    marginLeft: 15,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },

  cardNo: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 15,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  label: {
    marginLeft: 10,
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
});