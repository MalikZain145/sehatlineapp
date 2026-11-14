import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';

const SOSScreen = ({ navigation }) => {
  const [sosActivated, setSosActivated] = useState(false);

  const activateSOS = () => {
    setSosActivated(true);
    Alert.alert(
      "🚨 SOS ACTIVATED",
      "Emergency services have been notified.\nAmbulance dispatched to your location.\nYour family has been alerted.",
      [{ text: "OK", onPress: () => navigation.navigate('AmbulanceTrackingScreen') }]
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="SOS Emergency" navigation={navigation} />

      <View style={styles.content}>
        {!sosActivated ? (
          <>
            <Ionicons name="warning-outline" size={140} color="#EF4444" style={styles.icon} />
            <Text style={styles.title}>Emergency SOS</Text>
            <Text style={styles.subtitle}>
              Press the button below only in real emergency.{'\n'}
              This will alert hospital, ambulance and your family.
            </Text>

            <TouchableOpacity style={styles.sosBigButton} onPress={activateSOS}>
              <Text style={styles.sosButtonText}>SOS</Text>
              <Text style={styles.sosButtonSub}>TAP FOR HELP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.activatedContainer}>
            <Ionicons name="checkmark-circle" size={100} color="#10B981" />
            <Text style={styles.activatedTitle}>SOS Sent Successfully</Text>
            <Text style={styles.activatedText}>Help is on the way</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  icon: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#EF4444', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 26 },
  sosBigButton: {
    width: 220,
    height: 220,
    backgroundColor: '#EF4444',
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 13.0, elevation: 15,
  },
  sosButtonText: { color: '#fff', fontSize: 52, fontWeight: 'bold' },
  sosButtonSub: { color: '#fff', fontSize: 16, marginTop: 8, letterSpacing: 2 },
  activatedContainer: { alignItems: 'center' },
  activatedTitle: { fontSize: 26, fontWeight: 'bold', color: '#10B981', marginTop: 20 },
  activatedText: { fontSize: 18, color: '#334155', marginTop: 10 },
});

export default SOSScreen;