import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const DashboardScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <CustomHeader title="Dashboard" navigation={navigation} showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Health Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Health Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={30} color="#EF4444" />
              <Text style={styles.statValue}>98</Text>
              <Text style={styles.statLabel}>BPM</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="thermometer" size={30} color="#F59E0B" />
              <Text style={styles.statValue}>98.6</Text>
              <Text style={styles.statLabel}>°F</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="water" size={30} color="#00D4FF" />
              <Text style={styles.statValue}>120/80</Text>
              <Text style={styles.statLabel}>BP</Text>
            </View>
          </View>
        </View>

        {/* Today's Appointments */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.time}>11:30 AM</Text>
            <Text style={styles.token}>Token: A-034</Text>
          </View>
          <Text style={styles.doctor}>Dr. Sara Malik - Cardiology</Text>
          <Text style={styles.type}>Follow-up Appointment</Text>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinText}>View Token</Text>
          </TouchableOpacity>
        </View>

        {/* AI Insights */}
        <Text style={styles.sectionTitle}>AI Health Insights</Text>
        <TouchableOpacity 
          style={styles.insightCard}
          onPress={() => navigation.navigate('AIHealthTipsScreen')}
        >
          <Ionicons name="bulb" size={28} color="#F59E0B" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Daily Health Tip</Text>
            <Text style={styles.insightText}>Stay hydrated. Drink at least 8 glasses of water today.</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Navigation Buttons */}
        <View style={styles.quickNav}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('LiveTokenQueueScreen')}
          >
            <Ionicons name="time" size={26} color="#1E3A8A" />
            <Text style={styles.navLabel}>Live Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('FamilyHubScreen')}
          >
            <Ionicons name="people" size={26} color="#1E3A8A" />
            <Text style={styles.navLabel}>Family Hub</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('PrescriptionScannerScreen')}
          >
            <Ionicons name="document-text" size={26} color="#1E3A8A" />
            <Text style={styles.navLabel}>Scan Prescription</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { padding: 20 },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5.0, elevation: 5,
  },
  overviewTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: 'bold', color: '#1E3A8A', marginTop: 8 },
  statLabel: { fontSize: 14, color: '#64748B' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1E3A8A', marginBottom: 12 },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  time: { fontSize: 22, fontWeight: 'bold', color: '#1E3A8A' },
  token: { fontSize: 16, color: '#00D4FF', fontWeight: '600' },
  doctor: { fontSize: 17, color: '#334155' },
  type: { fontSize: 15, color: '#64748B', marginTop: 4 },
  joinButton: {
    backgroundColor: '#00D4FF',
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  joinText: { color: '#fff', fontWeight: '600' },
  insightCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  insightContent: { flex: 1, marginLeft: 15 },
  insightTitle: { fontSize: 17, fontWeight: '600', color: '#1E3A8A' },
  insightText: { fontSize: 15, color: '#64748B', marginTop: 6, lineHeight: 22 },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  navButton: { alignItems: 'center' },
  navLabel: { fontSize: 13, marginTop: 8, color: '#1E3A8A', fontWeight: '500' },
});

export default DashboardScreen;