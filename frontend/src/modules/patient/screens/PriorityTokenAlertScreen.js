import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const PriorityTokenAlertScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <CustomHeader title="Critical Alert" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.alertIconContainer}>
          <Ionicons name="alert-circle" size={120} color="#EF4444" />
        </View>

        <Text style={styles.alertTitle}>CRITICAL PATIENT ALERT</Text>
        <Text style={styles.alertSubtitle}>High Priority Token Generated</Text>

        <View style={styles.patientInfoCard}>
          <Text style={styles.patientName}>Fatima Bibi</Text>
          <Text style={styles.patientDetail}>Age: 67 • Token: P-089</Text>
          <Text style={styles.severity}>Severity: Critical</Text>
          <Text style={styles.symptoms}>Symptoms: Severe chest pain, shortness of breath</Text>
        </View>

        <Text style={styles.message}>
          Please attend this patient immediately.{"\n"}
          Emergency protocols activated.
        </Text>

        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => {
            Alert.alert("Alert Acknowledged", "Patient added to your queue as Priority #1");
            navigation.navigate('RealTimeQueueScreen');
          }}
        >
          <Text style={styles.acceptText}>Accept & Call Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryText}>Dismiss Alert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { flex: 1, padding: 25, alignItems: 'center', justifyContent: 'center' },
  alertIconContainer: { marginBottom: 20 },
  alertTitle: { fontSize: 28, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 },
  alertSubtitle: { fontSize: 18, color: '#64748B', marginBottom: 30 },
  patientInfoCard: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5.8, elevation: 6,
    borderLeftWidth: 8,
    borderLeftColor: '#EF4444',
    marginBottom: 30,
  },
  patientName: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A' },
  patientDetail: { fontSize: 16, color: '#334155', marginVertical: 6 },
  severity: { fontSize: 18, fontWeight: 'bold', color: '#EF4444', marginVertical: 8 },
  symptoms: { fontSize: 16, color: '#334155', textAlign: 'center', lineHeight: 24 },
  message: { 
    fontSize: 17, 
    color: '#1E3A8A', 
    textAlign: 'center', 
    marginBottom: 40,
    lineHeight: 26 
  },
  acceptButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 18,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
  },
  acceptText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  secondaryButton: {
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryText: { color: '#64748B', fontSize: 17 },
});

export default PriorityTokenAlertScreen;