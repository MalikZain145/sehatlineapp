import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface PrescriptionCardProps {
  patientName: string;
  cardNo: string;
  doctor: string;
  medicines: number;
  time: string;
  onPress?: () => void;
}

const PrescriptionCard = ({
  patientName,
  cardNo,
  doctor,
  medicines,
  time,
  onPress,
}: PrescriptionCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.patient}>{patientName}</Text>
          <Text style={styles.cardNumber}>Card #{cardNo}</Text>
        </View>

        <Ionicons
          name="document-text"
          size={26}
          color={Colors.purpleIcon}
        />
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="person"
          size={16}
          color={Colors.blueIcon}
        />
        <Text style={styles.infoText}>Dr. {doctor}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="medkit"
          size={16}
          color={Colors.green}
        />
        <Text style={styles.infoText}>
          {medicines} Medicines
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="time"
          size={16}
          color={Colors.redIcon}
        />
        <Text style={styles.infoText}>{time}</Text>
      </View>

      <TouchableOpacity
  style={styles.button}
  onPress={onPress}
></TouchableOpacity>
    </View>
  );
};

export default PrescriptionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  patient: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },

  cardNumber: {
    marginTop: 3,
    color: Colors.textSecondary,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  infoText: {
    marginLeft: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },

  button: {
    marginTop: 18,
    backgroundColor: "#F4B942",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});