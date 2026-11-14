import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { showConfirm } from '../../../components/confirm';

const { width } = Dimensions.get('window');

const RescheduleScreen = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState('24');
  const [selectedTime, setSelectedTime] = useState(null);

  const dates = [
    { day: 'Mon', date: '24' },
    { day: 'Tue', date: '25' },
    { day: 'Wed', date: '26' },
    { day: 'Thu', date: '27' },
    { day: 'Fri', date: '28' },
  ];

  const timeSlots = [
    { time: '09:00 AM', available: true },
    { time: '10:30 AM', available: false },
    { time: '11:00 AM', available: true },
    { time: '01:30 PM', available: true },
    { time: '03:00 PM', available: false },
    { time: '04:30 PM', available: true },
  ];

  const handleUpdate = () => {
    if (!selectedTime) {
      Alert.alert("Selection Required", "Please pick a new time slot.");
      return;
    }
    showConfirm({
      title: 'Confirm Changes',
      message: `Reschedule to Oct ${selectedDate} at ${selectedTime}?`,
      confirmLabel: 'Confirm',
      icon: 'calendar-outline',
      onConfirm: () => navigation.navigate('Appointments'),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000033', '#000022']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={30} color="#00EAFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RESCHEDULE</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Previous Info Warning */}
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={20} color="#FFD700" />
          <Text style={styles.warningText}>
            Your current slot: Oct 20 | 10:30 AM
          </Text>
        </View>

        {/* 1. Date Selector Strip */}
        <Text style={styles.sectionLabel}>Select New Date</Text>
        <View style={styles.dateStrip}>
          {dates.map((item) => (
            <TouchableOpacity 
              key={item.date} 
              style={[styles.dateCard, selectedDate === item.date && styles.dateCardActive]}
              onPress={() => setSelectedDate(item.date)}
            >
              <Text style={[styles.dayText, selectedDate === item.date && styles.activeText]}>{item.day}</Text>
              <Text style={[styles.dateText, selectedDate === item.date && styles.activeText]}>{item.date}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. Time Slot Grid */}
        <Text style={styles.sectionLabel}>Available Slots</Text>
        <View style={styles.grid}>
          {timeSlots.map((slot, index) => (
            <TouchableOpacity 
              key={index} 
              disabled={!slot.available}
              style={[
                styles.timeSlot, 
                selectedTime === slot.time && styles.timeSlotActive,
                !slot.available && styles.timeSlotDisabled
              ]}
              onPress={() => setSelectedTime(slot.time)}
            >
              <Text style={[
                styles.slotText, 
                selectedTime === slot.time && styles.activeText,
                !slot.available && styles.disabledText
              ]}>
                {slot.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Confirm Button */}
        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
          <LinearGradient colors={['#00EAFF', '#0099AA']} style={styles.btnGradient}>
            <Text style={styles.btnText}>UPDATE APPOINTMENT</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelLinkText}>Keep Original Appointment</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000033' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { padding: 20 },

  warningBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', 
    padding: 15, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' 
  },
  warningText: { color: '#FFD700', marginLeft: 10, fontSize: 13, fontWeight: '600' },

  sectionLabel: { color: '#00EAFF', fontSize: 14, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  
  dateStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  dateCard: { 
    width: width * 0.16, height: 75, justifyContent: 'center', alignItems: 'center', 
    borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
  },
  dateCardActive: { backgroundColor: '#00EAFF', borderColor: '#00EAFF', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.21, shadowRadius: 9.0, elevation: 10 },
  dayText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  dateText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  activeText: { color: '#000033', fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timeSlot: { 
    width: '48%', height: 55, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
  },
  timeSlotActive: { backgroundColor: '#00EAFF', borderColor: '#00EAFF' },
  timeSlotDisabled: { opacity: 0.3, backgroundColor: 'rgba(255,255,255,0.02)' },
  slotText: { color: '#FFF', fontWeight: '600' },
  disabledText: { textDecorationLine: 'line-through' },

  updateBtn: { marginTop: 40, borderRadius: 15, overflow: 'hidden' },
  btnGradient: { height: 60, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#000033', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelLinkText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 }
});

export default RescheduleScreen;