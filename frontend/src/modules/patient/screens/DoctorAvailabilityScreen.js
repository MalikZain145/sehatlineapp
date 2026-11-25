import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const DoctorAvailabilityScreen = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [todaySlots] = useState([
    { time: "09:00 AM", status: "Booked", patient: "Ahmed Khan" },
    { time: "09:30 AM", status: "Available", patient: "" },
    { time: "10:00 AM", status: "Booked", patient: "Sana Malik" },
    { time: "10:30 AM", status: "Available", patient: "" },
  ]);

  return (
    <View style={styles.container}>
      <CustomHeader title="My Availability" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, isAvailable ? styles.available : styles.busy]}>
              {isAvailable ? "AVAILABLE" : "BUSY"}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#EF4444', true: '#10B981' }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        {todaySlots.map((slot, index) => (
          <View key={index} style={styles.slotCard}>
            <Text style={styles.time}>{slot.time}</Text>
            <View style={styles.slotInfo}>
              <Text style={styles.patientName}>
                {slot.patient ? slot.patient : "Slot Open"}
              </Text>
              <Text style={[styles.status, slot.status === "Available" ? styles.availableText : styles.bookedText]}>
                {slot.status}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.updateButton}>
          <Text style={styles.updateText}>Update Schedule</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { padding: 20 },
  statusCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5.0, elevation: 5,
  },
  statusLabel: { fontSize: 16, color: '#64748B' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statusText: { fontSize: 24, fontWeight: 'bold', marginRight: 15 },
  available: { color: '#10B981' },
  busy: { color: '#EF4444' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1E3A8A', marginBottom: 15 },
  slotCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 3.4, elevation: 3,
  },
  time: { fontSize: 18, fontWeight: 'bold', color: '#1E3A8A' },
  slotInfo: { alignItems: 'flex-end' },
  patientName: { fontSize: 16, color: '#334155' },
  status: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  availableText: { color: '#10B981' },
  bookedText: { color: '#F59E0B' },
  updateButton: {
    backgroundColor: '#00D4FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  updateText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default DoctorAvailabilityScreen;