// src/screens/doctor/ConsultationScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Platform, StatusBar, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const ConsultationScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const patient = route?.params?.patient || null;
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState({
    medicines: [],
    instructions: ''
  });
  const [isSending, setIsSending] = useState(false);
  const handleSendToPharmacy = () => {
    if (prescription.medicines.length === 0) {
      Alert.alert('Error', 'Please add medicines to the prescription');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      Alert.alert('Prescription Sent', 'Prescription has been sent to the pharmacy successfully.', [{
        text: 'OK',
        onPress: () => navigation.goBack()
      }]);
    }, 1500);
  };
  const handleCompleteConsultation = () => {
    Alert.alert('Complete Consultation', 'Mark this consultation as complete?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Complete',
      onPress: () => {
        Alert.alert('Success', 'Consultation completed successfully.');
        navigation.goBack();
      }
    }]);
  };
  if (!patient) {
    return <View style={styles.emptyContainer}>
        <Ionicons name="medkit-outline" size={wp(15)} color={COLORS.border || '#e0e0e0'} />
        <Text style={styles.emptyText}>No Patient Selected</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary || '#1a73e8', COLORS.secondary || '#0d47a1']} style={styles.headerGradient} start={{
      x: 0,
      y: 0
    }} end={{
      x: 1,
      y: 1
    }} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consultation</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Patient Info */}
          <View style={[styles.patientCard, SHADOWS?.medium || {}]}>
            <View style={styles.patientHeader}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patient.name?.split(' ').map(n => n[0]).join('') || 'P'}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientDetail}>
                  {patient.age} yrs • {patient.gender || 'Male'} • Token #{patient.token || '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Diagnosis */}
          <View style={[styles.section, SHADOWS?.medium || {}]}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <TextInput style={styles.diagnosisInput} placeholder="Enter diagnosis..." placeholderTextColor={COLORS.textLight || '#999'} value={diagnosis} onChangeText={setDiagnosis} multiline />
          </View>

          {/* Prescription */}
          <View style={[styles.section, SHADOWS?.medium || {}]}>
            <Text style={styles.sectionTitle}>Prescription</Text>
            
            <TouchableOpacity style={styles.addMedicineBtn} onPress={() => {
            Alert.alert('Add Medicine', 'This feature will open medicine search.');
          }}>
              <Ionicons name="add-circle-outline" size={wp(4)} color={COLORS.primary || '#1a73e8'} />
              <Text style={styles.addMedicineText}>Add Medicine</Text>
            </TouchableOpacity>

            <TextInput style={styles.instructionsInput} placeholder="Additional instructions..." placeholderTextColor={COLORS.textLight || '#999'} value={prescription.instructions} onChangeText={text => setPrescription({
            ...prescription,
            instructions: text
          })} multiline />

            <TouchableOpacity style={[styles.sendButton, isSending && styles.sendButtonDisabled]} onPress={handleSendToPharmacy} disabled={isSending}>
              <LinearGradient colors={[COLORS.success || '#4CAF50', '#2E7D32']} style={styles.sendGradient}>
                <Ionicons name="send-outline" size={wp(4.5)} color="#fff" />
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : 'Send to Pharmacy'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Clinical Notes */}
          <View style={[styles.section, SHADOWS?.medium || {}]}>
            <Text style={styles.sectionTitle}>Clinical Notes</Text>
            <TextInput style={styles.notesInput} placeholder="Enter clinical notes..." placeholderTextColor={COLORS.textLight || '#999'} value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
          </View>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={handleCompleteConsultation}>
              <Ionicons name="checkmark-done-outline" size={wp(4.5)} color="#fff" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => navigation.goBack()}>
              <Ionicons name="close-outline" size={wp(4.5)} color="#fff" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#f5f7fa'
  },
  safeArea: {
    flex: 1
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 64 : 80
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? 10 : 40, // iOS: SafeAreaView already pads the notch
    paddingBottom: 12
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#fff'
  },
  headerRight: {
    width: wp(8)
  },
  scrollView: {
    flex: 1,
    padding: wp(4)
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5)
  },
  emptyText: {
    fontSize: wp(4.5),
    fontWeight: '600',
    color: COLORS.text || '#1a1a1a',
    marginTop: hp(1)
  },
  backButton: {
    marginTop: hp(2),
    backgroundColor: COLORS.primary || '#1a73e8',
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.2),
    borderRadius: wp(3)
  },
  backButtonText: {
    color: '#fff',
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  patientCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border || '#e0e0e0'
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  patientAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: COLORS.primary || '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3)
  },
  patientAvatarText: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#fff'
  },
  patientInfo: {
    flex: 1
  },
  patientName: {
    fontSize: wp(4.2),
    fontWeight: 'bold',
    color: COLORS.text || '#1a1a1a'
  },
  patientDetail: {
    fontSize: wp(3),
    color: COLORS.textSecondary || '#666',
    marginTop: hp(0.1)
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border || '#e0e0e0'
  },
  sectionTitle: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: COLORS.text || '#1a1a1a',
    marginBottom: hp(1)
  },
  diagnosisInput: {
    fontSize: wp(3.5),
    color: COLORS.text || '#1a1a1a',
    padding: wp(3),
    backgroundColor: COLORS.background || '#f5f7fa',
    borderRadius: wp(2),
    minHeight: hp(6),
    textAlignVertical: 'top'
  },
  addMedicineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(0.5)
  },
  addMedicineText: {
    fontSize: wp(3.2),
    color: COLORS.primary || '#1a73e8',
    fontWeight: '500'
  },
  instructionsInput: {
    fontSize: wp(3.2),
    color: COLORS.text || '#1a1a1a',
    padding: wp(3),
    backgroundColor: COLORS.background || '#f5f7fa',
    borderRadius: wp(2),
    minHeight: hp(5),
    textAlignVertical: 'top',
    marginTop: hp(0.5)
  },
  sendButton: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginTop: hp(1)
  },
  sendButtonDisabled: {
    opacity: 0.6
  },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    gap: wp(2)
  },
  sendButtonText: {
    fontSize: wp(3.5),
    fontWeight: 'bold',
    color: '#fff'
  },
  notesInput: {
    fontSize: wp(3.2),
    color: COLORS.text || '#1a1a1a',
    padding: wp(3),
    backgroundColor: COLORS.background || '#f5f7fa',
    borderRadius: wp(2),
    minHeight: hp(10),
    textAlignVertical: 'top'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2)
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    borderRadius: wp(3),
    gap: wp(2)
  },
  completeButton: {
    backgroundColor: COLORS.success || '#4CAF50'
  },
  cancelButton: {
    backgroundColor: COLORS.danger || '#F44336'
  },
  actionButtonText: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: '#fff'
  }
});
export default ConsultationScreen;