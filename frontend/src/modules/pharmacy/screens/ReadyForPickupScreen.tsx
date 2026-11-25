import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import Colors from "../constants/colors";

import PatientSummaryCard from "../components/preparation/patientSummaryCard";
import MedicineChecklist from "../components/preparation/MedicineChecklist";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function ReadyForPickupScreen() {
  const navigation = useNavigation<any>();

  const medicines = [
    {
      id: 1,
      medicineName: "Paracetamol 500mg",
      dosage: "1 Tablet after meal",
      quantity: "10 Tablets",
      available: true,
      checked: true,
    },
    {
      id: 2,
      medicineName: "Amoxicillin 250mg",
      dosage: "1 Capsule twice daily",
      quantity: "14 Capsules",
      available: true,
      checked: true,
    },
    {
      id: 3,
      medicineName: "Vitamin D",
      dosage: "Once Daily",
      quantity: "30 Tablets",
      available: true,
      checked: true,
    },
  ];

  const handleNotify = () => {
    pharmAlert(
      "Patient Notified",
      "The patient has been notified to collect the medicines.",
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Ready for Pickup</Text>

        <PatientSummaryCard
          patientName="Ali Khan"
          cardNumber="P023"
          doctorName="Ahmed"
          priority="Normal"
          totalMedicines={3}
        />

        <Text style={styles.sectionTitle}>Prepared Medicines</Text>

        {medicines.map((item) => (
          <MedicineChecklist
            key={item.id}
            medicineName={item.medicineName}
            dosage={item.dosage}
            quantity={item.quantity}
            available={item.available}
            checked={item.checked}
            onPress={() => {}}
          />
        ))}

        <TouchableOpacity
          style={styles.button}
          onPress={handleNotify}
        >
          <Text style={styles.buttonText}>
            Notify Patient
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingBottom: BOTTOM_SPACE
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 15,
  },
  button: {
    marginTop: 25,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});