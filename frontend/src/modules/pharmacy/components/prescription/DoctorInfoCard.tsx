import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface DoctorInfoCardProps {
  doctorName: string;
  department: string;
  consultationTime: string;
}

const DoctorInfoCard = ({
  doctorName,
  department,
  consultationTime,
}: DoctorInfoCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="medical"
          size={46}
          color={Colors.primary}
        />

        <View style={styles.headerText}>
          <Text style={styles.title}>Doctor Information</Text>
          <Text style={styles.name}>Dr. {doctorName}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons
          name="business-outline"
          size={20}
          color={Colors.blueIcon}
        />
        <Text style={styles.label}>Department</Text>
        <Text style={styles.value}>{department}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="time-outline"
          size={20}
          color={Colors.purpleIcon}
        />
        <Text style={styles.label}>Consultation</Text>
        <Text style={styles.value}>{consultationTime}</Text>
      </View>
    </View>
  );
};

export default DoctorInfoCard;

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

  title: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 4,
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
    flex: 1,
    marginLeft: 10,
    color: Colors.textSecondary,
    fontSize: 15,
  },

  value: {
    color: Colors.text,
    fontWeight: "600",
    fontSize: 15,
  },
});