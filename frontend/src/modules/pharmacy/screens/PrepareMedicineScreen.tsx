import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import Colors from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { usePharmacy } from "../context/PharmacyContext";
import PatientSummaryCard from "../components/preparation/patientSummaryCard";
import PreparationProgress from "../components/preparation/PreparationProgress";
import MedicineChecklist from "../components/preparation/MedicineChecklist";
import { useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import GradientHeader from "../components/common/GradientHeader";
import { pharmAlert } from "../components/common/PharmAlert";
import { topPad } from '../../../utils/safeArea';


export default function PrepareMedicineScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
const { patient } = route.params;

    const { markPatientReady } = usePharmacy();
  const [medicines, setMedicines] = useState([
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
      available: false,
      checked: false,
    },
  ]);

  const completed = medicines.filter((m) => m.checked).length;

  const toggleMedicine = (id: number) => {
    setMedicines((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  

 const handleComplete = () => {
  if (completed !== medicines.length) {
    pharmAlert(
      "Preparation Incomplete",
      "Please prepare all medicines before notifying the patient."
    );
      return;
    }
pharmAlert(
  "Patient Notified",
  "The patient has been notified.\nPlease collect your medicines from Counter 3.",
  [
    {
      text: "OK",
      onPress: () => {

       markPatientReady(patient.id, "Counter 3");

        navigation.navigate("Queue");

      },
    },
  ]
);
};

return (
  <SafeAreaView style={styles.container}>

    {/* Header */}
    <GradientHeader
  title="Prepare Medicines"
  subtitle="Verify and prepare prescribed medicines"
/>

    {/* Screen Content */}
  <ScrollView
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >

      <PatientSummaryCard
        patientName={patient.patientName}
        cardNumber={patient.cardNo}
        doctorName={patient.doctorName}
        priority="Normal"
        totalMedicines={medicines.length}
      />

      <PreparationProgress
        completed={completed}
        total={medicines.length}
      />

      <Text style={styles.section}>
        Medicine Checklist
      </Text>

      {medicines.map((item) => (
        <MedicineChecklist
          key={item.id}
          medicineName={item.medicineName}
          dosage={item.dosage}
          quantity={item.quantity}
          available={item.available}
          checked={item.checked}
          onPress={() => toggleMedicine(item.id)}
        />
      ))}

      <TouchableOpacity
        style={[
          styles.button,
          completed !== medicines.length &&
            styles.disabledButton,
        ]}
        onPress={handleComplete}
      >
        <Ionicons
          name="notifications-outline"
          size={22}
          color="#FFFFFF"
        />

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
  },

  section: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 15,
  },
button: {
  backgroundColor: "#0BAA9D",

  paddingVertical: 16,

  borderRadius: 18,

  flexDirection: "row",

  justifyContent: "center",

  alignItems: "center",

  marginTop: 24,
},

  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
buttonText: {
  color: "#FFFFFF",

  fontWeight: "700",

  fontSize: 17,

  marginLeft: 10,
},
headerRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingTop: 8,
},
header: {
  paddingTop: topPad(60),
  paddingBottom: 30,
  paddingHorizontal: 20,
  borderBottomLeftRadius: 30,
  borderBottomRightRadius: 30,
  overflow: "hidden",
},

title: {
  fontSize: 26,
  fontWeight: "800",
    color:"#1F2937",
},

subtitle: {
  marginTop: 4,
  fontSize: 14,
   color:"#6B7280",
},

content: {
  paddingHorizontal: 20,
  paddingVertical: 20,
  paddingBottom: 40,
},
});