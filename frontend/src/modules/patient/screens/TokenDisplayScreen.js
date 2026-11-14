import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';

const TokenDisplayScreen = ({ navigation, route }) => {
  const tokenData = route.params?.tokenData || {
    token: "P-089",
    name: "Fatima Bibi",
    department: "Cardiology",
    doctor: "Dr. Sara Malik",
    type: "Priority",
    estimatedTime: "12 minutes",
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Your Token" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>Your Token Number</Text>
          <Text style={styles.tokenNumber}>{tokenData.token}</Text>
          <Text style={styles.priorityTag}>{tokenData.type} Token</Text>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{tokenData.name}</Text>
          <Text style={styles.details}>{tokenData.department}</Text>
          <Text style={styles.details}>Doctor: {tokenData.doctor}</Text>
        </View>

        <View style={styles.waitInfo}>
          <Ionicons name="time" size={40} color="#00D4FF" />
          <Text style={styles.estimated}>Estimated Wait Time</Text>
          <Text style={styles.time}>{tokenData.estimatedTime}</Text>
        </View>

        <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => navigation.navigate('LiveTokenQueueScreen')}
        >
          <Text style={styles.trackText}>Track Live Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 25, alignItems: 'center' },
  tokenBox: {
    backgroundColor: '#1E3A8A',
    width: '100%',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  tokenLabel: { color: '#00D4FF', fontSize: 16 },
  tokenNumber: { fontSize: 72, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  priorityTag: { color: '#EF4444', fontSize: 18, fontWeight: 'bold' },
  patientInfo: { alignItems: 'center', marginBottom: 40 },
  patientName: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A' },
  details: { fontSize: 17, color: '#64748B', marginTop: 6 },
  waitInfo: { alignItems: 'center', marginBottom: 40 },
  estimated: { fontSize: 18, color: '#64748B', marginTop: 10 },
  time: { fontSize: 32, fontWeight: 'bold', color: '#EF4444' },
  trackButton: {
    backgroundColor: '#00D4FF',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  trackText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
});

export default TokenDisplayScreen;