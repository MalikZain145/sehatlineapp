import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const MedicineReminderScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([
    { id: '1', medicine: 'Amoxicillin 500mg', time: '8:00 AM', dose: '1 tablet', active: true },
    { id: '2', medicine: 'Panadol Extra', time: 'SOS', dose: '1 tablet', active: true },
    { id: '3', medicine: 'Omeprazole 20mg', time: 'Before Breakfast', dose: '1 capsule', active: true },
  ]);

  const toggleReminder = (id) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, active: !r.active } : r
    ));
  };

  const saveReminders = () => {
    Alert.alert("Success", "All medicine reminders have been set successfully!");
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Medicine Reminders" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Set Daily Reminders</Text>
        <Text style={styles.subtitle}>AI has extracted these medicines from your prescription</Text>

        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={styles.leftSection}>
              <Ionicons name="pill" size={32} color="#00D4FF" />
              <View style={styles.medInfo}>
                <Text style={styles.medicineName}>{reminder.medicine}</Text>
                <Text style={styles.dose}>{reminder.dose}</Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <Text style={styles.time}>{reminder.time}</Text>
              <TouchableOpacity 
                style={[styles.toggleButton, reminder.active ? styles.activeToggle : styles.inactiveToggle]}
                onPress={() => toggleReminder(reminder.id)}
              >
                <Text style={styles.toggleText}>
                  {reminder.active ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={saveReminders}>
          <Text style={styles.saveButtonText}>Save All Reminders</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { padding: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 30 },
  reminderCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  medInfo: { marginLeft: 15 },
  medicineName: { fontSize: 18, fontWeight: '600', color: '#1E3A8A' },
  dose: { fontSize: 15, color: '#64748B' },
  rightSection: { alignItems: 'flex-end' },
  time: { fontSize: 16, color: '#00D4FF', fontWeight: '600', marginBottom: 8 },
  toggleButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeToggle: { backgroundColor: '#10B981' },
  inactiveToggle: { backgroundColor: '#94A3B8' },
  toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  saveButton: {
    backgroundColor: '#00D4FF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
});

export default MedicineReminderScreen;