import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';

const AIPrescriptionAnalysisScreen = ({ navigation, route }) => {
  const { image } = route.params || {};

  const extractedMedicines = [
    { name: "Amoxicillin 500mg", dosage: "1 tablet", timing: "Every 8 hours", days: "7 days" },
    { name: "Panadol Extra", dosage: "1 tablet", timing: "SOS for pain/fever", days: "As needed" },
    { name: "Omeprazole 20mg", dosage: "1 capsule", timing: "Before breakfast", days: "14 days" },
  ];

  return (
    <View style={styles.container}>
      <CustomHeader title="AI Prescription Analysis" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="checkmark-circle" size={90} color="#10B981" style={styles.successIcon} />

        <Text style={styles.title}>Analysis Complete</Text>
        <Text style={styles.subtitle}>AI successfully read your prescription</Text>

        {image && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Uploaded Prescription</Text>
            {/* In real app, show the image here */}
          </View>
        )}

        <Text style={styles.sectionTitle}>Extracted Medicines</Text>

        {extractedMedicines.map((med, index) => (
          <View key={index} style={styles.medicineCard}>
            <View style={styles.medHeader}>
              <Ionicons name="pill" size={28} color="#00D4FF" />
              <Text style={styles.medName}>{med.name}</Text>
            </View>
            <Text style={styles.dosage}>Dosage: {med.dosage}</Text>
            <Text style={styles.timing}>Timing: {med.timing}</Text>
            <Text style={styles.days}>Duration: {med.days}</Text>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.setReminderButton}
          onPress={() => navigation.navigate('MedicineReminderScreen')}
        >
          <Text style={styles.setReminderText}>Set Medicine Reminders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dietButton}
          onPress={() => navigation.navigate('DietPrecautionScreen')}
        >
          <Text style={styles.dietButtonText}>View Diet & Precautions</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 25, alignItems: 'center' },
  successIcon: { marginBottom: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1E3A8A', alignSelf: 'flex-start', marginBottom: 15 },
  medicineCard: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  medHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  medName: { fontSize: 18, fontWeight: 'bold', color: '#1E3A8A', marginLeft: 12 },
  dosage: { fontSize: 16, color: '#334155', marginVertical: 4 },
  timing: { fontSize: 16, color: '#334155', marginVertical: 4 },
  days: { fontSize: 16, color: '#10B981', fontWeight: '600' },
  setReminderButton: {
    backgroundColor: '#00D4FF',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 25,
  },
  setReminderText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  dietButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dietButtonText: { color: '#1E3A8A', fontSize: 17, fontWeight: '600' },
});

export default AIPrescriptionAnalysisScreen;