// src/screens/doctor/PrescriptionScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Platform, StatusBar, SafeAreaView, Image, Modal, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { showConfirm } from '../../../components/confirm';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const QUEUE_KEY = '@sehatline_queue';
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';
const PRESCRIPTION_HISTORY_KEY = '@sehatline_prescription_history';

// ─── MEDICINES DATABASE (A-Z) ──────────────────────────────────────────
const MEDICINES = ['Amiodarone 100mg', 'Amiodarone 200mg', 'Amlodipine 5mg', 'Amlodipine 10mg', 'Apixaban 2.5mg', 'Apixaban 5mg', 'Aspirin 75mg', 'Aspirin 150mg', 'Atenolol 25mg', 'Atenolol 50mg', 'Atenolol 100mg', 'Atorvastatin 10mg', 'Atorvastatin 20mg', 'Atorvastatin 40mg', 'Atorvastatin 80mg', 'Bisoprolol 2.5mg', 'Bisoprolol 5mg', 'Captopril 25mg', 'Captopril 50mg', 'Carvedilol 3.125mg', 'Carvedilol 6.25mg', 'Carvedilol 12.5mg', 'Carvedilol 25mg', 'Clopidogrel 75mg', 'Digoxin 0.125mg', 'Digoxin 0.25mg', 'Diltiazem 30mg', 'Diltiazem 60mg', 'Enalapril 5mg', 'Enalapril 10mg', 'Empagliflozin 10mg', 'Empagliflozin 25mg', 'Furosemide 20mg', 'Furosemide 40mg', 'Hydrochlorothiazide 12.5mg', 'Hydrochlorothiazide 25mg', 'Isosorbide Mononitrate 10mg', 'Isosorbide Mononitrate 20mg', 'Ivabradine 5mg', 'Ivabradine 7.5mg', 'Lisinopril 5mg', 'Lisinopril 10mg', 'Losartan 25mg', 'Losartan 50mg', 'Losartan 100mg', 'Metoprolol 25mg', 'Metoprolol 50mg', 'Metoprolol 100mg', 'Nitroglycerin 0.4mg (SL)', 'Ramipril 2.5mg', 'Ramipril 5mg', 'Ramipril 10mg', 'Rivaroxaban 15mg', 'Rivaroxaban 20mg', 'Rosuvastatin 10mg', 'Rosuvastatin 20mg', 'Sacubitril/Valsartan 49/51mg', 'Sacubitril/Valsartan 97/103mg', 'Spironolactone 25mg', 'Spironolactone 50mg', 'Telmisartan 40mg', 'Telmisartan 80mg', 'Ticagrelor 90mg', 'Valsartan 80mg', 'Valsartan 160mg', 'Warfarin 2mg', 'Warfarin 5mg'];

// ─── FREQUENCIES & DURATIONS ──────────────────────────────────────────
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Weekly', 'Monthly', 'As needed'];
const DURATIONS = ['1 Day', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '21 Days', '1 Month', '3 Months', '6 Months', '1 Year', 'Lifelong'];
const PrescriptionScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [doctor, setDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [queuePatients, setQueuePatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState(MEDICINES);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [duration, setDuration] = useState('7 Days');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  useEffect(() => {
    loadDoctorData();
    loadQueuePatients();
  }, []);
  useEffect(() => {
    const q = medicineSearch.toLowerCase();
    setFilteredMedicines(MEDICINES.filter(m => m.toLowerCase().includes(q)));
  }, [medicineSearch]);
  const loadDoctorData = async () => {
    try {
      const data = await AsyncStorage.getItem('@sehatline_userData');
      if (data) {
        setDoctor(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading doctor:', error);
    }
  };
  const loadQueuePatients = async () => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Only show waiting patients
        const waiting = parsed.filter(p => p.status === 'Waiting' || p.status === 'Called');
        setQueuePatients(waiting);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueuePatients();
    setRefreshing(false);
  };
  const addMedicine = () => {
    if (!selectedMedicine) {
      Alert.alert('Required', 'Please select a medicine.');
      return;
    }
    if (!dosage) {
      Alert.alert('Required', 'Please enter dosage.');
      return;
    }
    setMedicines([...medicines, {
      id: Date.now().toString(),
      name: selectedMedicine,
      dosage,
      frequency: frequency || 'Once daily',
      duration: duration || '7 Days'
    }]);
    setSelectedMedicine(null);
    setDosage('');
    setFrequency('Once daily');
    setDuration('7 Days');
    setMedicineSearch('');
    setShowMedicineModal(false);
  };
  const removeMedicine = id => {
    setMedicines(medicines.filter(m => m.id !== id));
  };
  const clearAllMedicines = () => {
    if (medicines.length === 0) return;
    showConfirm({
      title: 'Clear All',
      message: 'Remove all medicines?',
      confirmLabel: 'Clear',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: () => setMedicines([])
    });
  };
  const handleSendToPharmacy = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient.');
      return;
    }
    if (medicines.length === 0) {
      Alert.alert('Error', 'Please add at least one medicine.');
      return;
    }
    setIsSubmitting(true);
    try {
      const prescriptionData = {
        id: `presc_${Date.now()}`,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientToken: selectedPatient.token,
        patientAge: selectedPatient.age || 'N/A',
        medicines: medicines,
        instructions: instructions || 'No additional instructions',
        doctorName: doctor?.name || 'Dr. Unknown',
        hospital: doctor?.hospital || 'Capital Hospital CDA',
        department: doctor?.department || 'Cardiology',
        createdAt: new Date().toISOString(),
        status: 'sent'
      };

      // Save to prescription history
      const existingHistory = await AsyncStorage.getItem(PRESCRIPTION_HISTORY_KEY);
      const historyList = existingHistory ? JSON.parse(existingHistory) : [];
      historyList.unshift(prescriptionData);
      await AsyncStorage.setItem(PRESCRIPTION_HISTORY_KEY, JSON.stringify(historyList));

      // Save to completed patients
      const existingCompleted = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      const completedList = existingCompleted ? JSON.parse(existingCompleted) : [];
      completedList.unshift({
        ...prescriptionData,
        id: selectedPatient.id,
        type: 'pharmacy'
      });
      await AsyncStorage.setItem(COMPLETED_PATIENTS_KEY, JSON.stringify(completedList));

      // Remove from queue
      const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
      if (existingQueue) {
        const queueList = JSON.parse(existingQueue);
        const updatedQueue = queueList.filter(p => p.id !== selectedPatient.id);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
      }
      Alert.alert('Prescription Sent', `Prescription for ${selectedPatient.name} has been sent to pharmacy.`, [{
        text: 'OK',
        onPress: () => {
          setMedicines([]);
          setSelectedPatient(null);
          setInstructions('');
          loadQueuePatients();
          navigation.goBack();
        }
      }]);
    } catch (error) {
      console.error('Error sending prescription:', error);
      Alert.alert('Error', 'Failed to send prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── RENDER PATIENT MODAL ──────────────────────────────────────────
  const renderPatientModal = () => <Modal visible={showPatientModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, SHADOWS.large]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <TouchableOpacity onPress={() => setShowPatientModal(false)}>
              <Ionicons name="close" size={wp(5)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.modalBody}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={wp(4.5)} color={COLORS.textLight} />
              <TextInput style={styles.searchInput} placeholder="Search patients..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            {queuePatients.length > 0 ? <FlatList data={queuePatients.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.token?.toString().includes(searchQuery))} keyExtractor={item => item.id} renderItem={({
            item
          }) => <TouchableOpacity style={[styles.patientItem, selectedPatient?.id === item.id && styles.patientItemActive]} onPress={() => {
            setSelectedPatient(item);
            setShowPatientModal(false);
            setSearchQuery('');
          }}>
                    <View style={styles.patientItemLeft}>
                      <View style={[styles.patientItemAvatar, {
                backgroundColor: item.priority === 'Emergency' ? COLORS.danger + '20' : COLORS.primary + '20'
              }]}>
                        <Text style={[styles.patientItemAvatarText, {
                  color: item.priority === 'Emergency' ? COLORS.danger : COLORS.primary
                }]}>
                          {item.name?.charAt(0) || 'P'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.patientItemName}>{item.name}</Text>
                        <Text style={styles.patientItemToken}>Token #{item.token} • {item.age || 'N/A'} yrs</Text>
                      </View>
                    </View>
                    {item.priority === 'Emergency' && <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>Urgent</Text>
                      </View>}
                    {selectedPatient?.id === item.id && <Ionicons name="checkmark-circle" size={wp(4)} color={COLORS.success} />}
                  </TouchableOpacity>} ListEmptyComponent={<View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No patients found</Text>
                  </View>} /> : <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={wp(10)} color={COLORS.textLight} />
                <Text style={styles.modalEmptyText}>No patients in queue</Text>
                <Text style={styles.modalEmptySub}>Add patients to queue first</Text>
              </View>}
          </View>
        </View>
      </View>
    </Modal>;

  // ─── RENDER MEDICINE MODAL ──────────────────────────────────────────
  const renderMedicineModal = () => <Modal visible={showMedicineModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, SHADOWS.large]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medicine</Text>
            <TouchableOpacity onPress={() => setShowMedicineModal(false)}>
              <Ionicons name="close" size={wp(5)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Search Medicine</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={wp(4.5)} color={COLORS.textLight} />
              <TextInput style={styles.searchInput} placeholder="Type to search..." placeholderTextColor={COLORS.textLight} value={medicineSearch} onChangeText={setMedicineSearch} autoFocus />
            </View>

            <FlatList data={filteredMedicines} keyExtractor={item => item} style={styles.medicineList} renderItem={({
            item
          }) => <TouchableOpacity style={[styles.medicineItem, selectedMedicine === item && styles.medicineItemActive]} onPress={() => setSelectedMedicine(item)}>
                  <Text style={[styles.medicineItemText, selectedMedicine === item && styles.medicineItemTextActive]}>
                    {item}
                  </Text>
                  {selectedMedicine === item && <Ionicons name="checkmark" size={wp(4)} color={COLORS.primary} />}
                </TouchableOpacity>} />

            <View style={styles.medicineForm}>
              <View style={styles.medicineFormRow}>
                <View style={[styles.medicineFormField, {
                flex: 1
              }]}>
                  <Text style={styles.medicineFormLabel}>Dosage *</Text>
                  <TextInput style={styles.medicineFormInput} placeholder="e.g., 75mg" placeholderTextColor={COLORS.textLight} value={dosage} onChangeText={setDosage} />
                </View>
              </View>

              <View style={styles.medicineFormRow}>
                <View style={[styles.medicineFormField, {
                flex: 1,
                marginRight: wp(1.5)
              }]}>
                  <Text style={styles.medicineFormLabel}>Frequency</Text>
                  <TouchableOpacity style={styles.medicineFormPicker} onPress={() => setShowFrequencyModal(true)}>
                    <Text style={styles.medicineFormPickerText}>{frequency}</Text>
                    <Ionicons name="chevron-down" size={wp(3.5)} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.medicineFormField, {
                flex: 1,
                marginLeft: wp(1.5)
              }]}>
                  <Text style={styles.medicineFormLabel}>Duration</Text>
                  <TouchableOpacity style={styles.medicineFormPicker} onPress={() => setShowDurationModal(true)}>
                    <Text style={styles.medicineFormPickerText}>{duration}</Text>
                    <Ionicons name="chevron-down" size={wp(3.5)} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.addMedicineBtn, (!selectedMedicine || !dosage) && styles.addMedicineBtnDisabled]} onPress={addMedicine} disabled={!selectedMedicine || !dosage}>
                <LinearGradient colors={selectedMedicine && dosage ? [COLORS.primary, COLORS.secondary] : ['#D1D5DB', '#9CA3AF']} style={styles.addMedicineGradient}>
                  <Ionicons name="add-circle-outline" size={wp(4)} color={COLORS.white} />
                  <Text style={styles.addMedicineText}>Add Medicine</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>;

  // ─── FREQUENCY MODAL ────────────────────────────────────────────────
  const renderFrequencyModal = () => <Modal visible={showFrequencyModal} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFrequencyModal(false)}>
        <View style={[styles.pickerModal, SHADOWS.large]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Frequency</Text>
            <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
              <Ionicons name="close" size={wp(5)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>
          <View style={styles.pickerBody}>
            {FREQUENCIES.map(freq => <TouchableOpacity key={freq} style={[styles.pickerItem, frequency === freq && styles.pickerItemActive]} onPress={() => {
            setFrequency(freq);
            setShowFrequencyModal(false);
          }}>
                <Text style={[styles.pickerItemText, frequency === freq && styles.pickerItemTextActive]}>
                  {freq}
                </Text>
                {frequency === freq && <Ionicons name="checkmark" size={wp(4)} color={COLORS.primary} />}
              </TouchableOpacity>)}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>;

  // ─── DURATION MODAL ──────────────────────────────────────────────────
  const renderDurationModal = () => <Modal visible={showDurationModal} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDurationModal(false)}>
        <View style={[styles.pickerModal, SHADOWS.large]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Duration</Text>
            <TouchableOpacity onPress={() => setShowDurationModal(false)}>
              <Ionicons name="close" size={wp(5)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>
          <View style={styles.pickerBody}>
            {DURATIONS.map(dur => <TouchableOpacity key={dur} style={[styles.pickerItem, duration === dur && styles.pickerItemActive]} onPress={() => {
            setDuration(dur);
            setShowDurationModal(false);
          }}>
                <Text style={[styles.pickerItemText, duration === dur && styles.pickerItemTextActive]}>
                  {dur}
                </Text>
                {duration === dur && <Ionicons name="checkmark" size={wp(4)} color={COLORS.primary} />}
              </TouchableOpacity>)}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Prescription</Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={wp(5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
          {/* ─── PATIENT SELECTOR ──────────────────────────────────────── */}
          <View style={[styles.section, SHADOWS.small]}>
            <Text style={styles.sectionTitle}>Select Patient</Text>
            <TouchableOpacity style={styles.selectPatientBtn} onPress={() => setShowPatientModal(true)} activeOpacity={0.7}>
              {selectedPatient ? <View style={styles.selectedPatient}>
                  <View style={[styles.selectedPatientAvatar, {
                backgroundColor: selectedPatient.priority === 'Emergency' ? COLORS.danger + '20' : COLORS.primary + '20'
              }]}>
                    <Text style={[styles.selectedPatientAvatarText, {
                  color: selectedPatient.priority === 'Emergency' ? COLORS.danger : COLORS.primary
                }]}>
                      {selectedPatient.name?.charAt(0) || 'P'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.selectedPatientName}>{selectedPatient.name}</Text>
                    <Text style={styles.selectedPatientToken}>Token #{selectedPatient.token} • {selectedPatient.age || 'N/A'} yrs</Text>
                  </View>
                </View> : <Text style={styles.selectPatientText}>Tap to select a patient</Text>}
              <Ionicons name="chevron-down" size={wp(4)} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ─── MEDICINE LIST ────────────────────────────────────────── */}
          <View style={[styles.section, SHADOWS.small]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Medicines</Text>
              <View style={styles.sectionHeaderRight}>
                {medicines.length > 0 && <TouchableOpacity style={styles.clearBtn} onPress={clearAllMedicines}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>}
                <TouchableOpacity style={styles.addMedicineBtnSmall} onPress={() => setShowMedicineModal(true)} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.addMedicineBtnSmallText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {medicines.length > 0 ? medicines.map(item => <View key={item.id} style={styles.medicineItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{item.name}</Text>
                    <Text style={styles.medicineDetail}>
                      {item.dosage} • {item.frequency} • {item.duration}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMedicine(item.id)}>
                    <Ionicons name="close-circle" size={wp(4.5)} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>) : <View style={styles.emptyMedicines}>
                <Ionicons name="medkit-outline" size={wp(8)} color={COLORS.textLight} />
                <Text style={styles.emptyMedicinesText}>No medicines added</Text>
                <Text style={styles.emptyMedicinesSub}>Tap "Add" to add medicines</Text>
              </View>}
          </View>

          {/* ─── INSTRUCTIONS ─────────────────────────────────────────── */}
          <View style={[styles.section, SHADOWS.small]}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <TextInput style={styles.instructionsInput} placeholder="Additional instructions for patient..." placeholderTextColor={COLORS.textLight} value={instructions} onChangeText={setInstructions} multiline numberOfLines={3} />
          </View>

          {/* ─── SEND BUTTON ──────────────────────────────────────────── */}
          <TouchableOpacity style={[styles.sendButton, (!selectedPatient || medicines.length === 0 || isSubmitting) && styles.sendButtonDisabled]} onPress={handleSendToPharmacy} disabled={!selectedPatient || medicines.length === 0 || isSubmitting} activeOpacity={0.8}>
            <LinearGradient colors={selectedPatient && medicines.length > 0 ? [COLORS.success, '#059669'] : ['#D1D5DB', '#9CA3AF']} style={styles.sendGradient}>
              {isSubmitting ? <ActivityIndicator color={COLORS.white} size="small" /> : <>
                  <Ionicons name="send-outline" size={wp(4.5)} color={COLORS.white} />
                  <Text style={styles.sendButtonText}>Send to Pharmacy</Text>
                </>}
            </LinearGradient>
          </TouchableOpacity>

          {/* ─── FOOTER ────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
            <View style={styles.footerDivider} />
            <Text style={styles.footerSub}>Capital Hospital CDA</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {renderPatientModal()}
      {renderMedicineModal()}
      {renderFrequencyModal()}
      {renderDurationModal()}
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1
  },
  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1.5) : (StatusBar.currentHeight || 28) + 14,
    paddingBottom: hp(1.5),
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20'
  },
  menuBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2)
  },
  headerLogo: {
    width: wp(10),
    height: wp(10),
    resizeMode: 'contain'
  },
  headerTitle: {
    fontSize: wp(4.8),
    fontWeight: '700',
    color: COLORS.text
  },
  refreshBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  // ── Scroll ────────────────────────────────────────────────────────
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: hp(4)
  },
  // ── Section ──────────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    padding: wp(3.5),
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitle: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: COLORS.text
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5)
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1)
  },
  // ── Patient Selector ─────────────────────────────────────────────
  selectPatientBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(2.5),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(2),
    marginTop: hp(0.5)
  },
  selectPatientText: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary
  },
  selectedPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  selectedPatientAvatar: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedPatientAvatarText: {
    fontSize: wp(3.5),
    fontWeight: '700'
  },
  selectedPatientName: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  selectedPatientToken: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  // ── Medicines ─────────────────────────────────────────────────────
  addMedicineBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(2)
  },
  addMedicineBtnSmallText: {
    fontSize: wp(2.8),
    color: COLORS.primary,
    fontWeight: '600'
  },
  clearBtn: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2)
  },
  clearBtnText: {
    fontSize: wp(2.8),
    color: COLORS.danger,
    fontWeight: '600'
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  medicineInfo: {
    flex: 1
  },
  medicineName: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  medicineDetail: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary
  },
  emptyMedicines: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
    gap: hp(0.2)
  },
  emptyMedicinesText: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary
  },
  emptyMedicinesSub: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  // ── Instructions ──────────────────────────────────────────────────
  instructionsInput: {
    fontSize: wp(3.2),
    color: COLORS.text,
    padding: wp(3),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(2),
    minHeight: hp(8),
    textAlignVertical: 'top'
  },
  // ── Send Button ──────────────────────────────────────────────────
  sendButton: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginHorizontal: wp(4),
    marginTop: hp(1.5)
  },
  sendButtonDisabled: {
    opacity: 0.6
  },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.4),
    gap: wp(2)
  },
  sendButtonText: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.white
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(4)
  },
  footerText: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: wp(2)
  },
  footerSub: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  },
  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    overflow: 'hidden',
    ...SHADOWS.large
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4)
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  modalBody: {
    padding: wp(4)
  },
  modalLabel: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: hp(0.3)
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: hp(1)
  },
  searchInput: {
    flex: 1,
    paddingVertical: hp(0.8),
    fontSize: wp(3.2),
    color: COLORS.text
  },
  // ── Patient Modal ──────────────────────────────────────────────
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  patientItemActive: {
    backgroundColor: COLORS.primary + '08'
  },
  patientItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  patientItemAvatar: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center'
  },
  patientItemAvatarText: {
    fontSize: wp(3.5),
    fontWeight: '700'
  },
  patientItemName: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  patientItemToken: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  emergencyBadge: {
    backgroundColor: COLORS.danger + '15',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(2)
  },
  emergencyBadgeText: {
    fontSize: wp(2.2),
    fontWeight: '600',
    color: COLORS.danger
  },
  // ── Medicine Modal ─────────────────────────────────────────────
  medicineList: {
    maxHeight: hp(20)
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  medicineItemActive: {
    backgroundColor: COLORS.primary + '08'
  },
  medicineItemText: {
    fontSize: wp(3.2),
    color: COLORS.text
  },
  medicineItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  medicineForm: {
    marginTop: hp(1.5)
  },
  medicineFormRow: {
    flexDirection: 'row',
    marginBottom: hp(0.5)
  },
  medicineFormField: {
    flex: 1
  },
  medicineFormLabel: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: hp(0.2)
  },
  medicineFormInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    padding: wp(2.5),
    fontSize: wp(3),
    color: COLORS.text,
    backgroundColor: COLORS.backgroundSecondary
  },
  medicineFormPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    padding: wp(2.5),
    backgroundColor: COLORS.backgroundSecondary
  },
  medicineFormPickerText: {
    fontSize: wp(3),
    color: COLORS.text
  },
  addMedicineBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginTop: hp(0.5)
  },
  addMedicineBtnDisabled: {
    opacity: 0.6
  },
  addMedicineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    gap: wp(2)
  },
  addMedicineText: {
    color: COLORS.white,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  // ── Picker Modal ──────────────────────────────────────────────
  pickerModal: {
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    width: width * 0.85,
    maxHeight: height * 0.6,
    overflow: 'hidden',
    ...SHADOWS.large
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4)
  },
  pickerTitle: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: 'bold'
  },
  pickerBody: {
    padding: wp(2)
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: wp(2)
  },
  pickerItemActive: {
    backgroundColor: COLORS.primary + '08'
  },
  pickerItemText: {
    fontSize: wp(3.2),
    color: COLORS.text
  },
  pickerItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  // ── Modal Empty ─────────────────────────────────────────────────
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: hp(4),
    gap: hp(0.5)
  },
  modalEmptyText: {
    fontSize: wp(3.5),
    color: COLORS.textSecondary
  },
  modalEmptySub: {
    fontSize: wp(2.8),
    color: COLORS.textLight
  }
});
export default PrescriptionScreen;