// screens/token/GenerateTokenScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, Alert, Modal, TextInput, ActivityIndicator, Share, Image, Platform, Keyboard } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import tokenService from '../services/tokenService';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import * as Sharing from 'expo-sharing';
import { SHADOWS } from '../../../theme';
import * as Print from 'expo-print';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS_CUSTOM = {
  pharmacyLight: '#E8F8F0',
  pharmacyGreen: '#2ECC71',
  pharmacyDark: '#1A8C4A',
  labOrange: '#F39C12',
  labLight: '#FEF5E7',
  labDark: '#D68910',
  primary: '#20D3C2',
  secondary: '#0EA5A4',
  accent: '#5EEAD4',
  success: '#2ECC71',
  white: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#475569',
  textLight: '#94A3B8',
  background: '#F8FAFC',
  border: '#E2E8F0',
  danger: '#EF4444',
  warning: '#F59E0B',
  cardBg: '#FFFFFF'
};

// ─── COMPLETE CHRONIC MEDICINES LIST ──────────────────────────────────────
const getAllChronicMedicines = () => [
// Diabetes
{
  id: '1',
  name: 'Metformin',
  category: 'Diabetes',
  stock: 45
}, {
  id: '2',
  name: 'Insulin (Regular)',
  category: 'Diabetes',
  stock: 8
}, {
  id: '3',
  name: 'Insulin (NPH)',
  category: 'Diabetes',
  stock: 12
}, {
  id: '4',
  name: 'Glipizide',
  category: 'Diabetes',
  stock: 30
}, {
  id: '5',
  name: 'Pioglitazone',
  category: 'Diabetes',
  stock: 25
}, {
  id: '6',
  name: 'Sitagliptin',
  category: 'Diabetes',
  stock: 18
}, {
  id: '7',
  name: 'Empagliflozin',
  category: 'Diabetes',
  stock: 10
}, {
  id: '8',
  name: 'Dapagliflozin',
  category: 'Diabetes',
  stock: 15
},
// Blood Pressure
{
  id: '9',
  name: 'Losartan',
  category: 'Blood Pressure',
  stock: 25
}, {
  id: '10',
  name: 'Amlodipine',
  category: 'Blood Pressure',
  stock: 35
}, {
  id: '11',
  name: 'Enalapril',
  category: 'Blood Pressure',
  stock: 20
}, {
  id: '12',
  name: 'Lisinopril',
  category: 'Blood Pressure',
  stock: 28
}, {
  id: '13',
  name: 'Metoprolol',
  category: 'Blood Pressure',
  stock: 22
}, {
  id: '14',
  name: 'Carvedilol',
  category: 'Blood Pressure',
  stock: 12
}, {
  id: '15',
  name: 'Hydrochlorothiazide',
  category: 'Blood Pressure',
  stock: 40
}, {
  id: '16',
  name: 'Furosemide',
  category: 'Blood Pressure',
  stock: 30
}, {
  id: '17',
  name: 'Spironolactone',
  category: 'Blood Pressure',
  stock: 15
}, {
  id: '18',
  name: 'Clonidine',
  category: 'Blood Pressure',
  stock: 10
},
// Cholesterol
{
  id: '19',
  name: 'Atorvastatin',
  category: 'Cholesterol',
  stock: 15
}, {
  id: '20',
  name: 'Simvastatin',
  category: 'Cholesterol',
  stock: 25
}, {
  id: '21',
  name: 'Rosuvastatin',
  category: 'Cholesterol',
  stock: 20
}, {
  id: '22',
  name: 'Pravastatin',
  category: 'Cholesterol',
  stock: 12
}, {
  id: '23',
  name: 'Fenofibrate',
  category: 'Cholesterol',
  stock: 8
}, {
  id: '24',
  name: 'Gemfibrozil',
  category: 'Cholesterol',
  stock: 10
},
// Pain Relief
{
  id: '25',
  name: 'Paracetamol',
  category: 'Pain Relief',
  stock: 120
}, {
  id: '26',
  name: 'Ibuprofen',
  category: 'Pain Relief',
  stock: 80
}, {
  id: '27',
  name: 'Diclofenac',
  category: 'Pain Relief',
  stock: 45
}, {
  id: '28',
  name: 'Naproxen',
  category: 'Pain Relief',
  stock: 30
}, {
  id: '29',
  name: 'Celecoxib',
  category: 'Pain Relief',
  stock: 15
}, {
  id: '30',
  name: 'Tramadol',
  category: 'Pain Relief',
  stock: 10
},
// Heart Conditions
{
  id: '31',
  name: 'Aspirin',
  category: 'Heart',
  stock: 100
}, {
  id: '32',
  name: 'Clopidogrel',
  category: 'Heart',
  stock: 35
}, {
  id: '33',
  name: 'Digoxin',
  category: 'Heart',
  stock: 8
}, {
  id: '34',
  name: 'Nitroglycerin',
  category: 'Heart',
  stock: 5
}, {
  id: '35',
  name: 'Dabigatran',
  category: 'Heart',
  stock: 6
}, {
  id: '36',
  name: 'Warfarin',
  category: 'Heart',
  stock: 12
},
// Respiratory
{
  id: '37',
  name: 'Salbutamol Inhaler',
  category: 'Respiratory',
  stock: 25
}, {
  id: '38',
  name: 'Budesonide Inhaler',
  category: 'Respiratory',
  stock: 18
}, {
  id: '39',
  name: 'Montelukast',
  category: 'Respiratory',
  stock: 20
}, {
  id: '40',
  name: 'Theophylline',
  category: 'Respiratory',
  stock: 8
}, {
  id: '41',
  name: 'Ipratropium',
  category: 'Respiratory',
  stock: 12
},
// Stomach/Acid Reflux
{
  id: '42',
  name: 'Omeprazole',
  category: 'Acid Reflux',
  stock: 3
}, {
  id: '43',
  name: 'Pantoprazole',
  category: 'Acid Reflux',
  stock: 15
}, {
  id: '44',
  name: 'Ranitidine',
  category: 'Acid Reflux',
  stock: 25
}, {
  id: '45',
  name: 'Esomeprazole',
  category: 'Acid Reflux',
  stock: 10
},
// Antibiotics
{
  id: '46',
  name: 'Amoxicillin',
  category: 'Antibiotic',
  stock: 80
}, {
  id: '47',
  name: 'Ciprofloxacin',
  category: 'Antibiotic',
  stock: 35
}, {
  id: '48',
  name: 'Azithromycin',
  category: 'Antibiotic',
  stock: 20
}, {
  id: '49',
  name: 'Cefixime',
  category: 'Antibiotic',
  stock: 15
}, {
  id: '50',
  name: 'Doxycycline',
  category: 'Antibiotic',
  stock: 12
},
// Thyroid
{
  id: '51',
  name: 'Levothyroxine',
  category: 'Thyroid',
  stock: 30
}, {
  id: '52',
  name: 'Carbimazole',
  category: 'Thyroid',
  stock: 8
},
// Vitamins
{
  id: '53',
  name: 'Vitamin D',
  category: 'Vitamins',
  stock: 65
}, {
  id: '54',
  name: 'Vitamin B12',
  category: 'Vitamins',
  stock: 40
}, {
  id: '55',
  name: 'Folic Acid',
  category: 'Vitamins',
  stock: 50
}, {
  id: '56',
  name: 'Calcium',
  category: 'Vitamins',
  stock: 35
}, {
  id: '57',
  name: 'Iron Supplements',
  category: 'Vitamins',
  stock: 25
}];
const GenerateTokenScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [userData, setUserData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Common fields
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  // Pharmacy fields
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [prescriptionRef, setPrescriptionRef] = useState('');
  const [showMedicineSelector, setShowMedicineSelector] = useState(false);

  // Laboratory fields
  const [testCategory, setTestCategory] = useState('');
  const [testType, setTestType] = useState('');
  const [sampleType, setSampleType] = useState('');

  // Token modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  // Themed prompt for rule messages (already booked, 30-day, cardio clash)
  const [rulePrompt, setRulePrompt] = useState({
    visible: false,
    title: '',
    message: '',
    variant: 'warning',
    icon: 'alert-circle',
    showView: false
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── Config ─────────────────────────────────────────────────────────────────
  const tokenOptions = [{
    id: 'chronic_opd',
    name: 'Chronic OPD Token',
    icon: 'medical-outline',
    color: COLORS_CUSTOM.pharmacyGreen,
    lightColor: COLORS_CUSTOM.pharmacyLight,
    bgColor: COLORS_CUSTOM.pharmacyGreen + '10',
    description: 'Get token for Chronic OPD consultation',
    prefix: 'A',
    route: 'ChronicDashboard',
    gradient: [COLORS_CUSTOM.pharmacyLight, COLORS_CUSTOM.pharmacyGreen]
  }, {
    id: 'lab',
    name: 'Laboratory Token',
    icon: 'flask-outline',
    color: COLORS_CUSTOM.labOrange,
    lightColor: COLORS_CUSTOM.labLight,
    bgColor: COLORS_CUSTOM.labOrange + '10',
    description: 'Get token for lab tests',
    prefix: 'L',
    route: 'LabDashboard',
    gradient: [COLORS_CUSTOM.labLight, COLORS_CUSTOM.labOrange]
  }];

  // Use complete medicine list
  const commonMedicines = getAllChronicMedicines().map(m => m.name);
  const testCategories = {
    'Cardiac Tests': ['ECG', 'Echocardiogram', 'Stress Test', 'Holter Monitoring'],
    'Blood Tests': ['CBC', 'Lipid Profile', 'Blood Sugar', 'HbA1c', 'Thyroid Test'],
    'Hormonal Tests': ['TSH', 'T3', 'T4', 'Cortisol', 'Testosterone'],
    'Infectious Diseases': ['Hepatitis B', 'Hepatitis C', 'HIV Test', 'Dengue Test'],
    'Imaging': ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI'],
    'Other Tests': ['Urine Complete', 'Urine Culture', 'Stool Examination']
  };
  const sampleTypes = ['Blood', 'Urine', 'Stool', 'Sputum', 'Tissue', 'Swab'];
  const timeSlots = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM'];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadUserData();
  }, []);
  const loadUserData = async () => {
    try {
      let data = route?.params?.userData || null;
      if (!data) {
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) data = JSON.parse(storedData);
      }
      if (data) setUserData(data);
    } catch (e) {
      console.log('Error loading user data:', e);
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setPrescriptionImage(null);
    setSelectedMedicines([]);
    setPrescriptionRef('');
    setTestCategory('');
    setTestType('');
    setSampleType('');
    setSelectedTime('');
    setDate(new Date());
  };
  const handleDeptSelect = name => {
    setSelectedDepartment(name);
    setShowForm(true);
    resetForm();
  };
  const goBackToDepts = () => {
    setShowForm(false);
    setSelectedDepartment(null);
    resetForm();
  };
  const toggleMedicine = m => {
    setSelectedMedicines(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  // ─── Prescription Reference Input ──────────────────────────────────────
  const handlePrescriptionRefChange = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setPrescriptionRef(numericText);
  };
  const handlePrescriptionRefSubmit = () => {
    Keyboard.dismiss();
  };

  // ─── Calculate Digital Waiting Time ──────────────────────────────────────
  const calculateWaitingTime = (department, timeSlot) => {
    const timeParts = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!timeParts) return {
      waitingTime: '10 mins',
      queuePosition: 1,
      peopleAhead: 0,
      estimatedTime: timeSlot
    };
    let hours = parseInt(timeParts[1]);
    const mins = parseInt(timeParts[2]);
    const period = timeParts[3];
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const totalMinutes = hours * 60 + mins;
    let baseWait = 0;
    if (department === 'Pharmacy') {
      baseWait = 10;
    } else if (department === 'Laboratory') {
      baseWait = 20;
    }
    let queuePosition = 0;
    if (totalMinutes >= 540 && totalMinutes <= 660) {
      queuePosition = Math.floor(Math.random() * 6) + 3;
    } else if (totalMinutes >= 660 && totalMinutes <= 780) {
      queuePosition = Math.floor(Math.random() * 4) + 1;
    } else {
      queuePosition = Math.floor(Math.random() * 3) + 1;
    }
    const peopleAhead = Math.max(0, queuePosition - 1);
    const avgServiceTime = department === 'Pharmacy' ? 5 : 8;
    const totalWait = baseWait + peopleAhead * avgServiceTime;
    let waitText = '';
    if (totalWait < 10) {
      waitText = `${totalWait} mins`;
    } else if (totalWait < 20) {
      waitText = `${totalWait} mins`;
    } else {
      const minsTotal = Math.floor(totalWait);
      waitText = `${minsTotal} mins`;
    }
    return {
      waitingTime: waitText,
      queuePosition: queuePosition,
      peopleAhead: peopleAhead,
      estimatedTime: calculateEstimatedTime(timeSlot, totalWait)
    };
  };
  const calculateEstimatedTime = (timeSlot, minutesToAdd) => {
    const timeParts = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!timeParts) return timeSlot;
    let hours = parseInt(timeParts[1]);
    const mins = parseInt(timeParts[2]);
    const period = timeParts[3];
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    let totalMinutes = hours * 60 + mins + minutesToAdd;
    let newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    const newPeriod = newHours >= 12 ? 'PM' : 'AM';
    const displayHours = newHours % 12 || 12;
    return `${displayHours}:${String(newMins).padStart(2, '0')} ${newPeriod}`;
  };

  // ── Token generation ───────────────────────────────────────────────────────
  const generateToken = (dept, name) => {
    const prefixMap = {
      'Pharmacy Token': 'P',
      'Laboratory Token': 'L'
    };
    const prefix = prefixMap[dept] || 'X';
    const num = Math.floor(Math.random() * 90) + 10;
    const token = `${prefix}-${String(num).padStart(3, '0')}`;
    let departmentData = {};
    let room = '';
    let purpose = '';
    if (dept === 'Pharmacy Token') {
      departmentData = {
        medicines: selectedMedicines,
        ref: prescriptionRef,
        hasPrescription: !!prescriptionImage
      };
      room = 'Pharmacy Wing - Counter 3, Ground Floor';
      purpose = ''; // No purpose for pharmacy
    }
    if (dept === 'Laboratory Token') {
      departmentData = {
        testCategory,
        testType,
        sampleType
      };
      room = 'Lab 05 - Ground Floor, East Wing';
      purpose = testType || 'Lab Test';
    }
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const waitInfo = calculateWaitingTime(dept === 'Pharmacy Token' ? 'Pharmacy' : 'Laboratory', selectedTime);
    return {
      token,
      prefix,
      number: num,
      department: dept === 'Pharmacy Token' ? 'Pharmacy' : 'Laboratory',
      patientName: name || userData?.name || 'Patient',
      date: formatted,
      time: selectedTime,
      room: room,
      waitingTime: waitInfo.waitingTime,
      queuePosition: waitInfo.queuePosition,
      peopleAhead: waitInfo.peopleAhead,
      estimatedTime: waitInfo.estimatedTime,
      purpose: purpose,
      departmentData,
      bookedAt: new Date().toISOString(),
      status: 'Confirmed',
      id: Date.now()
    };
  };
  const handleGenerateToken = () => {
    if (!selectedDepartment) {
      Alert.alert('Missing Info', 'Please select a department.');
      return;
    }
    if (selectedDepartment === 'Pharmacy Token') {
      if (!selectedMedicines.length) {
        Alert.alert('Missing Info', 'Please select at least one medicine.');
        return;
      }
      if (!prescriptionRef) {
        Alert.alert('Missing Info', 'Please provide prescription reference.');
        return;
      }
    }
    if (selectedDepartment === 'Laboratory Token') {
      if (!testCategory) {
        Alert.alert('Missing Info', 'Please select a test category.');
        return;
      }
      if (!testType) {
        Alert.alert('Missing Info', 'Please select a test type.');
        return;
      }
      if (!sampleType) {
        Alert.alert('Missing Info', 'Please specify sample type.');
        return;
      }
    }
    if (!selectedTime) {
      Alert.alert('Missing Info', 'Please select a time slot.');
      return;
    }
    setLoading(true);
    // Create a REAL token on the backend (atomic A-001 numbering, priority-based).
    (async () => {
      try {
        const res = await tokenService.generate({
          department: selectedDepartment,
          medicines: selectedMedicines,
          testType
        });
        setLoading(false);

        // IMPORTANT: check alreadyActive FIRST — the backend returns the
        // existing token alongside this flag, so we must not treat it as new.
        if (res?.alreadyActive) {
          setRulePrompt({
            visible: true,
            variant: 'warning',
            icon: 'ticket',
            title: 'Token Already Booked',
            message: `You already have an active token (${res.token?.tokenNumber || ''}). Please complete your current journey before taking a new one.`,
            showView: true
          });
          return;
        }
        if (res?.token) {
          const local = generateToken(selectedDepartment, userData?.name);
          setGeneratedToken({
            ...local,
            token: res.token.tokenNumber,
            tokenId: res.token._id,
            priorityLevel: res.token.priorityLevel,
            priorityReason: res.token.priorityReason
          });
          setShowTokenModal(true);
        } else {
          Alert.alert('Error', res?.message || 'Could not generate token.');
        }
      } catch (e) {
        setLoading(false);
        // Backend rule errors (30-day, cardio clash) come as thrown errors.
        const is30Day = e.code === 'TOO_SOON';
        const isCardio = e.code === 'CARDIO_CLASH';
        setRulePrompt({
          visible: true,
          variant: 'warning',
          icon: is30Day ? 'calendar' : isCardio ? 'heart' : 'alert-circle',
          title: is30Day ? 'Come Back Later' : isCardio ? 'Cardiology Appointment Today' : 'Cannot Generate Token',
          message: e.message || 'Could not reach server. Please try again.',
          showView: false
        });
      }
    })();
  };

  // ─── Download Token as PDF ──────────────────────────────────────────────
  const handleDownloadToken = async () => {
    if (!generatedToken) return;
    setDownloading(true);
    try {
      const isPharmacy = generatedToken.department === 'Pharmacy';
      const deptColor = isPharmacy ? COLORS_CUSTOM.pharmacyGreen : COLORS_CUSTOM.labOrange;
      const lightColor = isPharmacy ? COLORS_CUSTOM.pharmacyLight : COLORS_CUSTOM.labLight;
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: 'Helvetica', Arial, sans-serif; 
                padding: 30px; 
                background: #f5f6fa;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
              }
              .token-card {
                max-width: 480px;
                width: 100%;
                background: ${lightColor};
                border-radius: 20px;
                padding: 25px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                border: 3px solid ${deptColor};
              }
              .header {
                text-align: center;
                border-bottom: 2px solid ${deptColor};
                padding-bottom: 12px;
                margin-bottom: 12px;
              }
              .hospital-name {
                font-size: 22px;
                font-weight: 800;
                color: #1E293B;
                letter-spacing: 2px;
              }
              .hospital-sub {
                font-size: 13px;
                color: #475569;
                letter-spacing: 1px;
                margin-top: 2px;
              }
              .token-number {
                text-align: center;
                font-size: 44px;
                font-weight: 900;
                color: ${deptColor};
                margin: 10px 0;
                letter-spacing: 3px;
              }
              .dept-name {
                text-align: center;
                font-size: 17px;
                color: #1E293B;
                font-weight: 600;
                margin-bottom: 12px;
              }
              .qr-section {
                text-align: center;
                margin: 10px 0;
                padding: 12px;
                background: rgba(255,255,255,0.5);
                border-radius: 12px;
              }
              .qr-icon {
                font-size: 48px;
                margin-bottom: 4px;
              }
              .qr-text {
                color: #475569;
                font-size: 11px;
              }
              .details {
                background: white;
                border-radius: 12px;
                padding: 12px 15px;
                margin: 10px 0;
              }
              .row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #f0f0f0;
              }
              .row:last-child {
                border-bottom: none;
              }
              .label {
                color: #475569;
                font-size: 13px;
                font-weight: 500;
              }
              .value {
                color: #1E293B;
                font-size: 13px;
                font-weight: 600;
                text-align: right;
                max-width: 60%;
              }
              .footer {
                text-align: center;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 2px solid ${deptColor};
                font-size: 11px;
                color: #475569;
              }
              .status-badge {
                display: inline-block;
                background: ${deptColor}22;
                color: ${deptColor};
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                margin-top: 4px;
              }
              .wait-time {
                text-align: center;
                background: ${deptColor}15;
                border-radius: 12px;
                padding: 10px;
                margin: 8px 0;
                border: 1px solid ${deptColor}40;
              }
              .wait-time-label {
                font-size: 13px;
                color: #475569;
              }
              .wait-time-value {
                font-size: 24px;
                font-weight: bold;
                color: ${deptColor};
              }
            </style>
          </head>
          <body>
            <div class="token-card">
              <div class="header">
                <div class="hospital-name">CDA HOSPITAL</div>
                <div class="hospital-sub">ISLAMABAD</div>
              </div>
              
              <div class="token-number">${generatedToken.token}</div>
              <div class="dept-name">${generatedToken.department}</div>
              <div style="text-align:center;">
                <span class="status-badge">Confirmed</span>
              </div>
              
              <div class="wait-time">
                <div class="wait-time-label">Estimated Wait Time</div>
                <div class="wait-time-value">${generatedToken.waitingTime}</div>
              </div>
              
              <div class="qr-section">
                <div class="qr-icon">QR</div>
                <div class="qr-text">Scan this code at the hospital counter</div>
              </div>
              
              <div class="details">
                <div class="row">
                  <span class="label">Patient</span>
                  <span class="value">${generatedToken.patientName}</span>
                </div>
                <div class="row">
                  <span class="label">Date</span>
                  <span class="value">${generatedToken.date}</span>
                </div>
                <div class="row">
                  <span class="label">Time</span>
                  <span class="value">${generatedToken.time}</span>
                </div>
                <div class="row">
                  <span class="label">Location</span>
                  <span class="value">${generatedToken.room}</span>
                </div>
                <div class="row">
                  <span class="label">People Ahead</span>
                  <span class="value">${generatedToken.peopleAhead}</span>
                </div>
                <div class="row">
                  <span class="label">Position</span>
                  <span class="value">#${generatedToken.queuePosition}</span>
                </div>
                <div class="row">
                  <span class="label">Estimated Time</span>
                  <span class="value">${generatedToken.estimatedTime}</span>
                </div>
                ${generatedToken.department === 'Pharmacy' ? `
                <div class="row">
                  <span class="label">Medicines</span>
                  <span class="value">${generatedToken.departmentData.medicines.join(', ')}</span>
                </div>
                <div class="row">
                  <span class="label">Prescription</span>
                  <span class="value">${generatedToken.departmentData.ref}</span>
                </div>
                ` : `
                <div class="row">
                  <span class="label">Test</span>
                  <span class="value">${generatedToken.departmentData.testType}</span>
                </div>
                <div class="row">
                  <span class="label">Sample</span>
                  <span class="value">${generatedToken.departmentData.sampleType}</span>
                </div>
                `}
              </div>
              
              <div class="footer">
                CDA Hospital Islamabad • SehatLine Digital Token<br>
                Generated on ${new Date().toLocaleString()}
              </div>
            </div>
          </body>
        </html>
      `;
      const {
        uri
      } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      const fileName = `Token_${generatedToken.token}_${Date.now()}.pdf`;
      if (Platform.OS === 'android') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Token PDF',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Success', 'Token PDF generated successfully!');
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Token PDF',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Success', 'Token PDF generated successfully!');
        }
      }
    } catch (error) {
      console.log('Download error:', error);
      Alert.alert('Error', 'Unable to generate token PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
  const handleSaveToken = async () => {
    if (!generatedToken) return;
    try {
      const existing = await AsyncStorage.getItem('appointments');
      let appts = existing ? JSON.parse(existing) : [];
      appts.push(generatedToken);
      await AsyncStorage.setItem('appointments', JSON.stringify(appts));
      setShowTokenModal(false);
      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        const dept = tokenOptions.find(d => d.name === selectedDepartment);
        if (dept) {
          navigation.navigate(dept.route, {
            userData,
            refresh: true,
            highlightToken: generatedToken.token
          });
        } else {
          navigation.goBack();
        }
      }, 2000);
    } catch (e) {
      console.log('Error saving token:', e);
      Alert.alert('Error', 'Failed to save token');
    }
  };
  const handleShareToken = async () => {
    if (!generatedToken) return;
    let msg = `CDA HOSPITAL - ${generatedToken.department}\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `Patient: ${generatedToken.patientName}\n` + `Token: ${generatedToken.token}\n` + `Date: ${generatedToken.date}\n` + `Time: ${generatedToken.time}\n` + `Location: ${generatedToken.room}\n` + `Wait Time: ${generatedToken.waitingTime}\n` + `People Ahead: ${generatedToken.peopleAhead}\n` + `Position: #${generatedToken.queuePosition}\n` + `Estimated: ${generatedToken.estimatedTime}\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `CDA Hospital Islamabad`;
    if (generatedToken.department === 'Pharmacy') {
      msg += `\nMedicines: ${generatedToken.departmentData.medicines.join(', ')}`;
      msg += `\nPrescription: ${generatedToken.departmentData.ref}`;
    } else if (generatedToken.department === 'Laboratory') {
      msg += `\nTest: ${generatedToken.departmentData.testType}`;
      msg += `\nSample: ${generatedToken.departmentData.sampleType}`;
    }
    try {
      await Share.share({
        message: msg,
        title: 'Token'
      });
    } catch (e) {
      Alert.alert('Error', 'Unable to share token');
    }
  };
  const handleViewQueue = () => {
    if (!generatedToken) return;
    setShowTokenModal(false);
    navigation.navigate('LiveTokenQueueScreen', {
      token: generatedToken.token,
      department: generatedToken.department,
      userData
    });
  };
  const pickPrescriptionImage = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8
      });
      if (!result.canceled) setPrescriptionImage(result.assets[0]);
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // ── Calendar ───────────────────────────────────────────────────────────────
  const renderCustomCalendar = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const m = date.getMonth(),
      y = date.getFullYear();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const changeMonth = inc => {
      const n = new Date(date);
      n.setMonth(n.getMonth() + inc);
      const today = new Date();
      if (n.getFullYear() < today.getFullYear() || n.getFullYear() === today.getFullYear() && n.getMonth() < today.getMonth()) {
        Alert.alert('Invalid Month', 'Cannot go to previous months.');
        return;
      }
      setDate(n);
    };
    const selectDay = d => {
      const sel = new Date(y, m, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sel < today) {
        Alert.alert('Invalid Date', 'Please select today or a future date.');
        return;
      }
      setDate(sel);
      setShowDatePicker(false);
    };
    const isDisabled = d => {
      const s = new Date(y, m, d);
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return s < t;
    };
    const isSelected = d => date.getDate() === d && date.getMonth() === m && date.getFullYear() === y;
    return <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNav}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>{monthNames[m]} {y}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNav}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDaysHeader}>
          {dayNames.map(d => <Text key={d} style={styles.calendarDayName}>{d}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {Array.from({
          length: firstDay
        }).map((_, i) => <View key={`e${i}`} style={styles.calendarEmptyCell} />)}
          {Array.from({
          length: daysInMonth
        }).map((_, i) => {
          const d = i + 1,
            dis = isDisabled(d),
            sel = isSelected(d);
          return <TouchableOpacity key={`d${d}`} style={[styles.calendarCell, sel && styles.calendarCellSelected, dis && styles.calendarCellDisabled]} onPress={() => selectDay(d)} disabled={dis}>
                <Text style={[styles.calendarCellText, sel && styles.calendarCellTextSelected, dis && styles.calendarCellTextDisabled]}>
                  {d}
                </Text>
              </TouchableOpacity>;
        })}
        </View>
      </View>;
  };

  // ── Dept colour helpers ────────────────────────────────────────────────────
  const getDeptColor = () => ({
    'Pharmacy Token': COLORS_CUSTOM.pharmacyGreen,
    'Laboratory Token': COLORS_CUSTOM.labOrange
  })[selectedDepartment] || COLORS.primary;
  const getGradient = () => ({
    'Pharmacy Token': [COLORS_CUSTOM.pharmacyGreen, COLORS_CUSTOM.pharmacyDark],
    'Laboratory Token': [COLORS_CUSTOM.labOrange, COLORS_CUSTOM.labDark]
  })[selectedDepartment] || [COLORS.primary, COLORS.secondary];
  const getDeptInfo = () => {
    if (selectedDepartment === 'Pharmacy Token') {
      return {
        color: COLORS_CUSTOM.pharmacyGreen,
        lightColor: COLORS_CUSTOM.pharmacyLight
      };
    }
    return {
      color: COLORS_CUSTOM.labOrange,
      lightColor: COLORS_CUSTOM.labLight
    };
  };

  // ── Render sections ────────────────────────────────────────────────────────
  const renderDeptSelection = () => <View style={styles.departmentContainer}>
      <Text style={styles.sectionTitle}>Generate Token</Text>
      <Text style={styles.sectionSubtitle}>Get token for pharmacy or laboratory services</Text>
      <View style={styles.departmentButtonsContainer}>
        {tokenOptions.map(d => <TouchableOpacity key={d.id} style={[styles.departmentButton, {
        borderColor: d.color + '40'
      }]} onPress={() => handleDeptSelect(d.name)} activeOpacity={0.7}>
            <View style={[styles.departmentIconContainer, {
          backgroundColor: d.lightColor
        }]}>
              <Ionicons name={d.icon} size={28} color={d.color} />
            </View>
            <View style={styles.departmentInfo}>
              <Text style={[styles.departmentName, {
            color: d.color
          }]}>{d.name}</Text>
              <Text style={styles.departmentDesc}>{d.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={d.color} />
          </TouchableOpacity>)}
      </View>
    </View>;
  const renderPharmacyForm = () => <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={goBackToDepts} style={styles.backBtnSmall}>
          <Ionicons name="arrow-back" size={24} color={COLORS_CUSTOM.white} />
        </TouchableOpacity>
        <Text style={[styles.formTitle, {
        color: COLORS_CUSTOM.pharmacyGreen
      }]}>Pharmacy Token</Text>
      </View>
      <Text style={styles.label}>Upload Prescription (Optional)</Text>
      <TouchableOpacity style={[styles.uploadBox, {
      borderColor: COLORS_CUSTOM.pharmacyGreen + '40'
    }]} onPress={pickPrescriptionImage}>
        {prescriptionImage ? <View style={styles.imagePreview}>
            <Image source={{
          uri: prescriptionImage.uri
        }} style={styles.prescriptionImage} />
            <Text style={styles.imageLabel}>Prescription uploaded</Text>
            <Ionicons name="checkmark-circle" size={24} color={COLORS_CUSTOM.success} />
          </View> : <View style={styles.uploadPlaceholder}>
            <Ionicons name="cloud-upload-outline" size={40} color={COLORS_CUSTOM.pharmacyGreen} />
            <Text style={styles.uploadText}>Tap to upload prescription</Text>
            <Text style={styles.uploadSubtext}>JPG, PNG or PDF</Text>
          </View>}
      </TouchableOpacity>
      <Text style={styles.label}>Select Medicines</Text>
      <TouchableOpacity style={[styles.medicineSelector, {
      borderColor: COLORS_CUSTOM.pharmacyGreen + '40'
    }]} onPress={() => setShowMedicineSelector(!showMedicineSelector)}>
        <Text style={styles.medicineSelectorText}>
          {selectedMedicines.length > 0 ? `${selectedMedicines.length} medicines selected` : 'Tap to select medicines'}
        </Text>
        <Ionicons name={showMedicineSelector ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS_CUSTOM.textLight} />
      </TouchableOpacity>
      {showMedicineSelector && <View style={[styles.medicineListContainer, {
      borderColor: COLORS_CUSTOM.pharmacyGreen + '40'
    }]}>
          <ScrollView style={styles.medicineScroll} showsVerticalScrollIndicator={false}>
            {commonMedicines.map(m => <TouchableOpacity key={m} style={[styles.medicineItem, selectedMedicines.includes(m) && styles.medicineItemActive]} onPress={() => toggleMedicine(m)}>
                <Ionicons name={selectedMedicines.includes(m) ? 'checkbox' : 'square-outline'} size={22} color={selectedMedicines.includes(m) ? COLORS_CUSTOM.pharmacyGreen : COLORS_CUSTOM.textLight} />
                <Text style={[styles.medicineItemText, selectedMedicines.includes(m) && styles.medicineItemTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>
        </View>}
      <Text style={styles.label}>Prescription Reference</Text>
      <TextInput style={[styles.inputBox, {
      borderColor: COLORS_CUSTOM.pharmacyGreen + '40'
    }]} placeholder="Enter prescription number (e.g., 123456)" placeholderTextColor={COLORS_CUSTOM.textLight} value={prescriptionRef} onChangeText={handlePrescriptionRefChange} keyboardType="numeric" returnKeyType="done" onSubmitEditing={handlePrescriptionRefSubmit} blurOnSubmit={true} />
    </View>;
  const renderLabForm = () => <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={goBackToDepts} style={styles.backBtnSmall}>
          <Ionicons name="arrow-back" size={24} color={COLORS_CUSTOM.white} />
        </TouchableOpacity>
        <Text style={[styles.formTitle, {
        color: COLORS_CUSTOM.labOrange
      }]}>Laboratory Token</Text>
      </View>
      <Text style={styles.label}>Test Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {Object.keys(testCategories).map(cat => <TouchableOpacity key={cat} style={[styles.chip, styles.labChip, testCategory === cat && styles.labChipActive]} onPress={() => {
        setTestCategory(cat);
        setTestType('');
      }}>
            <Text style={[styles.chipText, testCategory === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>)}
      </ScrollView>
      {testCategory && <>
          <Text style={styles.label}>Select Test</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {testCategories[testCategory].map(t => <TouchableOpacity key={t} style={[styles.chip, styles.labChip, testType === t && styles.labChipActive]} onPress={() => setTestType(t)}>
                <Text style={[styles.chipText, testType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>)}
          </ScrollView>
        </>}
      <Text style={styles.label}>Sample Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {sampleTypes.map(s => <TouchableOpacity key={s} style={[styles.chip, styles.labChip, sampleType === s && styles.labChipActive]} onPress={() => setSampleType(s)}>
            <Text style={[styles.chipText, sampleType === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>)}
      </ScrollView>
    </View>;
  const renderCommonFields = () => {
    const deptInfo = getDeptInfo();
    return <View style={styles.commonFields}>
        <Text style={styles.label}>Select Date</Text>
        <TouchableOpacity style={[styles.inputBox, {
        borderColor: deptInfo.color + '40'
      }]} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={20} color={deptInfo.color} />
          <Text style={styles.dateValue}>{date.toDateString()}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS_CUSTOM.textLight} />
        </TouchableOpacity>

        {showDatePicker && <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.calendarModalOverlay}>
              <View style={styles.calendarModalContent}>
                <View style={styles.calendarModalHeader}>
                  <Text style={styles.calendarModalTitle}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color={COLORS_CUSTOM.text} />
                  </TouchableOpacity>
                </View>
                {renderCustomCalendar()}
                <TouchableOpacity style={[styles.calendarConfirmBtn, {
              backgroundColor: deptInfo.color
            }]} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.calendarConfirmText}>Confirm Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>}

        <Text style={styles.label}>Select Time (8:00 AM – 1:00 PM)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {timeSlots.map(t => <TouchableOpacity key={t} style={[styles.chip, selectedTime === t && styles.chipActive, selectedTime === t && {
          backgroundColor: deptInfo.color,
          borderColor: deptInfo.color
        }]} onPress={() => setSelectedTime(t)}>
              <Text style={[styles.chipText, selectedTime === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>)}
        </ScrollView>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleGenerateToken} disabled={loading}>
          <LinearGradient colors={[deptInfo.color, deptInfo.color + 'CC']} style={styles.btnGradient}>
            {loading ? <ActivityIndicator color={COLORS_CUSTOM.white} size="small" /> : <>
                <Text style={styles.btnText}>GENERATE TOKEN</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS_CUSTOM.white} />
              </>}
          </LinearGradient>
        </TouchableOpacity>
      </View>;
  };

  // ─── TOKEN MODAL ──────────────────────────────────────────────────────────
  const renderTokenModal = () => {
    if (!generatedToken) return null;
    const isPharmacy = generatedToken.department === 'Pharmacy';
    const deptColor = isPharmacy ? COLORS_CUSTOM.pharmacyGreen : COLORS_CUSTOM.labOrange;
    const lightColor = isPharmacy ? COLORS_CUSTOM.pharmacyLight : COLORS_CUSTOM.labLight;
    return <Modal visible={showTokenModal} transparent animationType="fade" onRequestClose={() => setShowTokenModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS_CUSTOM.success} />
            </View>
            <Text style={styles.modalTitle}>Token Generated!</Text>
            <Text style={styles.modalSubtitle}>Your token has been generated successfully</Text>

            {/* ─── COMPLETE TOKEN CARD ─── */}
            <View style={[styles.tokenCard, {
            borderColor: deptColor,
            borderWidth: 2
          }]}>
              <LinearGradient colors={[lightColor, lightColor]} style={styles.tokenCardGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 0,
              y: 1
            }}>
                {/* Hospital Name */}
                <View style={styles.tokenCardHeader}>
                  <Text style={styles.tokenCardTitle}>CDA HOSPITAL</Text>
                  <Text style={styles.tokenCardSub}>ISLAMABAD</Text>
                  <Text style={styles.tokenCardLocation}>CDA Hospital, G-8/4, Islamabad</Text>
                </View>

                {/* Token Number */}
                <Text style={[styles.tokenCardNumber, {
                color: deptColor
              }]}>
                  {generatedToken.token}
                </Text>
                <Text style={[styles.tokenCardDept, {
                color: deptColor
              }]}>
                  {generatedToken.department}
                </Text>

                {/* QR Code Placeholder */}
                <View style={[styles.qrContainer, {
                backgroundColor: deptColor + '15'
              }]}>
                  <Ionicons name="qr-code" size={60} color={deptColor} />
                  <Text style={[styles.qrText, {
                  color: COLORS_CUSTOM.textSecondary
                }]}>
                    Scan at hospital counter
                  </Text>
                </View>

                {/* Wait Time - HIGHLIGHTED */}
                <View style={[styles.waitTimeContainer, {
                backgroundColor: deptColor + '15',
                borderColor: deptColor + '40'
              }]}>
                  <Ionicons name="time-outline" size={24} color={deptColor} />
                  <Text style={styles.waitTimeLabel}>Estimated Wait Time</Text>
                  <Text style={[styles.waitTimeValue, {
                  color: deptColor
                }]}>
                    {generatedToken.waitingTime}
                  </Text>
                </View>

                {/* Token Details - DARK TEXT COLORS */}
                <View style={[styles.tokenCardDetails, {
                backgroundColor: deptColor + '08'
              }]}>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      Patient
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      {generatedToken.patientName}
                    </Text>
                  </View>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      Date & Time
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      {generatedToken.date}, {generatedToken.time}
                    </Text>
                  </View>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      Location
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      {generatedToken.room}
                    </Text>
                  </View>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      Position
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      #{generatedToken.queuePosition}
                    </Text>
                  </View>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      People Ahead
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      {generatedToken.peopleAhead}
                    </Text>
                  </View>
                  <View style={styles.tokenCardRow}>
                    <Text style={[styles.tokenCardLabel, {
                    color: COLORS_CUSTOM.textSecondary
                  }]}>
                      Estimated Time
                    </Text>
                    <Text style={[styles.tokenCardValue, {
                    color: COLORS_CUSTOM.text
                  }]}>
                      {generatedToken.estimatedTime}
                    </Text>
                  </View>
                  
                  {/* Pharmacy details - NO PURPOSE */}
                  {generatedToken.department === 'Pharmacy' && <>
                      <View style={styles.tokenCardRow}>
                        <Text style={[styles.tokenCardLabel, {
                      color: COLORS_CUSTOM.textSecondary
                    }]}>
                          Medicines
                        </Text>
                        <Text style={[styles.tokenCardValue, {
                      color: COLORS_CUSTOM.text
                    }]}>
                          {generatedToken.departmentData.medicines.join(', ')}
                        </Text>
                      </View>
                      <View style={styles.tokenCardRow}>
                        <Text style={[styles.tokenCardLabel, {
                      color: COLORS_CUSTOM.textSecondary
                    }]}>
                          Prescription
                        </Text>
                        <Text style={[styles.tokenCardValue, {
                      color: COLORS_CUSTOM.text
                    }]}>
                          {generatedToken.departmentData.ref}
                        </Text>
                      </View>
                    </>}
                  
                  {/* Laboratory details - WITH PURPOSE */}
                  {generatedToken.department === 'Laboratory' && <>
                      <View style={styles.tokenCardRow}>
                        <Text style={[styles.tokenCardLabel, {
                      color: COLORS_CUSTOM.textSecondary
                    }]}>
                          Test
                        </Text>
                        <Text style={[styles.tokenCardValue, {
                      color: COLORS_CUSTOM.text
                    }]}>
                          {generatedToken.departmentData.testType}
                        </Text>
                      </View>
                      <View style={styles.tokenCardRow}>
                        <Text style={[styles.tokenCardLabel, {
                      color: COLORS_CUSTOM.textSecondary
                    }]}>
                          Sample
                        </Text>
                        <Text style={[styles.tokenCardValue, {
                      color: COLORS_CUSTOM.text
                    }]}>
                          {generatedToken.departmentData.sampleType}
                        </Text>
                      </View>
                      <View style={styles.tokenCardRow}>
                        <Text style={[styles.tokenCardLabel, {
                      color: COLORS_CUSTOM.textSecondary
                    }]}>
                          Purpose
                        </Text>
                        <Text style={[styles.tokenCardValue, {
                      color: COLORS_CUSTOM.text
                    }]}>
                          {generatedToken.purpose}
                        </Text>
                      </View>
                    </>}
                </View>
              </LinearGradient>
            </View>

            {/* ─── ACTION BUTTONS: Download + View Queue ─── */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, styles.modalDownloadBtn, {
              backgroundColor: deptColor,
              borderColor: deptColor
            }]} onPress={handleDownloadToken} disabled={downloading}>
                {downloading ? <ActivityIndicator color={COLORS_CUSTOM.white} size="small" /> : <>
                    <Ionicons name="download-outline" size={20} color={COLORS_CUSTOM.white} />
                    <Text style={styles.modalDownloadText}>Download</Text>
                  </>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalActionBtn, styles.modalQueueBtn, {
              borderColor: deptColor
            }]} onPress={handleViewQueue}>
                <Ionicons name="timer-outline" size={20} color={deptColor} />
                <Text style={[styles.modalQueueText, {
                color: deptColor
              }]}>View Queue</Text>
              </TouchableOpacity>
            </View>

            {/* ─── DASHBOARD BUTTON ─── */}
            <TouchableOpacity style={styles.dashboardBtn} onPress={handleSaveToken}>
              <LinearGradient colors={[deptColor, deptColor + 'CC']} style={styles.dashboardGradient}>
                <Ionicons name="grid-outline" size={20} color={COLORS_CUSTOM.white} />
                <Text style={styles.dashboardText}>
                  Go to {generatedToken.department} Dashboard
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS_CUSTOM.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>;
  };
  const renderThankYou = () => <Modal visible={showThankYou} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.thankYouOverlay}>
        <View style={styles.thankYouContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS_CUSTOM.success} />
          <Text style={styles.thankYouTitle}>Thank You!</Text>
          <Text style={styles.thankYouSubtitle}>Your token has been generated successfully.</Text>
          <Text style={styles.thankYouToken}>Token: {generatedToken?.token}</Text>
          <Text style={styles.thankYouDept}>{generatedToken?.department}</Text>
          <View style={styles.thankYouDetails}>
            <Text style={styles.thankYouDetailText}>{generatedToken?.date} at {generatedToken?.time}</Text>
            <Text style={styles.thankYouDetailText}>Wait Time: {generatedToken?.waitingTime}</Text>
          </View>
          <ActivityIndicator size="small" color={COLORS.primary} style={{
          marginTop: hp(1.5)
        }} />
          <Text style={styles.thankYouRedirect}>Redirecting to your dashboard...</Text>
        </View>
      </View>
    </Modal>;

  // ── Root ───────────────────────────────────────────────────────────────────
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.6
    }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{
      flex: 1
    }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS_CUSTOM.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Generate Token</Text>
            <View style={{
            width: 40
          }} />
          </View>

          {userData && <View style={styles.userInfo}>
              <Ionicons name="person-circle-outline" size={20} color={COLORS_CUSTOM.white} />
              <Text style={styles.userName}>{userData.name}</Text>
              {userData.cdaCard && <Text style={styles.userCda}>CDA: {userData.cdaCard}</Text>}
            </View>}

          {!showForm ? renderDeptSelection() : <View>
              {selectedDepartment === 'Pharmacy Token' && renderPharmacyForm()}
              {selectedDepartment === 'Laboratory Token' && renderLabForm()}
              {renderCommonFields()}
            </View>}
        </ScrollView>
      </SafeAreaView>

      {renderTokenModal()}
      {renderThankYou()}

      {/* Themed rule prompt (already booked / 30-day / cardio clash) */}
      <ThemedPrompt visible={rulePrompt.visible} variant={rulePrompt.variant} icon={rulePrompt.icon} title={rulePrompt.title} message={rulePrompt.message} primaryLabel={rulePrompt.showView ? 'View My Token' : 'OK'} onPrimary={() => {
      const shouldView = rulePrompt.showView;
      setRulePrompt({
        ...rulePrompt,
        visible: false
      });
      if (shouldView) navigation.navigate('TokenJourneyScreen');
    }} secondaryLabel={rulePrompt.showView ? 'Close' : undefined} onSecondary={() => setRulePrompt({
      ...rulePrompt,
      visible: false
    })} />
    </View>;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: wp(5),
    paddingBottom: hp(4)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(5),
    fontWeight: 'bold'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: 20,
    marginBottom: hp(1.5),
    alignSelf: 'flex-start'
  },
  userName: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  userCda: {
    color: COLORS_CUSTOM.white + '70',
    fontSize: wp(2.8)
  },
  departmentContainer: {
    marginTop: hp(1)
  },
  sectionTitle: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(5.5),
    fontWeight: 'bold'
  },
  sectionSubtitle: {
    color: COLORS_CUSTOM.white + '70',
    fontSize: wp(3.5),
    marginTop: hp(0.5),
    marginBottom: hp(2)
  },
  departmentButtonsContainer: {
    gap: 12
  },
  departmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    borderWidth: 2,
    ...SHADOWS.medium
  },
  departmentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3)
  },
  departmentInfo: {
    flex: 1
  },
  departmentName: {
    fontSize: wp(4.5),
    fontWeight: '700'
  },
  departmentDesc: {
    fontSize: wp(3),
    color: COLORS_CUSTOM.textLight,
    marginTop: 2
  },
  formContainer: {
    marginTop: hp(1)
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  backBtnSmall: {
    padding: wp(1.5),
    marginRight: wp(2)
  },
  formTitle: {
    fontSize: wp(5),
    fontWeight: '700'
  },
  label: {
    color: COLORS_CUSTOM.text,
    fontSize: wp(3.8),
    fontWeight: '600',
    marginBottom: hp(0.8),
    marginTop: hp(1.5)
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: hp(0.5)
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    backgroundColor: COLORS_CUSTOM.white,
    marginRight: wp(2),
    borderWidth: 1,
    borderColor: COLORS_CUSTOM.border,
    ...SHADOWS.small
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  chipText: {
    color: COLORS_CUSTOM.textSecondary,
    fontSize: wp(3),
    fontWeight: '500'
  },
  chipTextActive: {
    color: COLORS_CUSTOM.white
  },
  labChip: {
    borderColor: COLORS_CUSTOM.labOrange
  },
  labChipActive: {
    backgroundColor: COLORS_CUSTOM.labOrange,
    borderColor: COLORS_CUSTOM.labOrange
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 12,
    paddingHorizontal: wp(3.5),
    height: hp(6.5),
    borderWidth: 1.5,
    borderColor: COLORS_CUSTOM.border,
    marginBottom: hp(1)
  },
  dateValue: {
    color: COLORS_CUSTOM.text,
    marginLeft: wp(2.5),
    fontSize: wp(3.5),
    flex: 1
  },
  uploadBox: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 12,
    padding: wp(4),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(15),
    marginBottom: hp(1)
  },
  uploadPlaceholder: {
    alignItems: 'center'
  },
  uploadText: {
    color: COLORS_CUSTOM.text,
    fontSize: wp(3.5),
    marginTop: hp(0.5)
  },
  uploadSubtext: {
    color: COLORS_CUSTOM.textLight,
    fontSize: wp(2.8),
    marginTop: 2
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  prescriptionImage: {
    width: 60,
    height: 60,
    borderRadius: 8
  },
  imageLabel: {
    color: COLORS_CUSTOM.text,
    fontSize: wp(3)
  },
  medicineSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 12,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    borderWidth: 1.5,
    borderColor: COLORS_CUSTOM.border,
    marginBottom: hp(1)
  },
  medicineSelectorText: {
    color: COLORS_CUSTOM.text,
    fontSize: wp(3.5)
  },
  medicineListContainer: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS_CUSTOM.border,
    maxHeight: hp(30),
    marginBottom: hp(1)
  },
  medicineScroll: {
    padding: wp(2)
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: COLORS_CUSTOM.border
  },
  medicineItemActive: {
    backgroundColor: COLORS_CUSTOM.pharmacyLight
  },
  medicineItemText: {
    fontSize: wp(3.5),
    color: COLORS_CUSTOM.text
  },
  medicineItemTextActive: {
    color: COLORS_CUSTOM.pharmacyGreen,
    fontWeight: '600'
  },
  commonFields: {
    marginTop: hp(1)
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  calendarModalContent: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 24,
    padding: wp(5),
    width: width * 0.92
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2)
  },
  calendarModalTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS_CUSTOM.text
  },
  calendarContainer: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 12
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  calendarNav: {
    padding: wp(2)
  },
  calendarMonthText: {
    fontSize: wp(4),
    fontWeight: '600',
    color: COLORS_CUSTOM.text
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(1)
  },
  calendarDayName: {
    fontSize: wp(3),
    fontWeight: '600',
    color: COLORS_CUSTOM.textLight,
    width: wp(10),
    textAlign: 'center'
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  calendarCell: {
    width: wp(10),
    height: wp(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2
  },
  calendarCellSelected: {
    backgroundColor: COLORS.primary
  },
  calendarCellDisabled: {
    opacity: 0.3
  },
  calendarEmptyCell: {
    width: wp(10),
    height: wp(10)
  },
  calendarCellText: {
    fontSize: wp(3.5),
    color: COLORS_CUSTOM.text
  },
  calendarCellTextSelected: {
    color: COLORS_CUSTOM.white,
    fontWeight: '700'
  },
  calendarCellTextDisabled: {
    color: COLORS_CUSTOM.textLight
  },
  calendarConfirmBtn: {
    marginTop: hp(2),
    paddingVertical: hp(1.2),
    borderRadius: 12,
    alignItems: 'center'
  },
  calendarConfirmText: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(4),
    fontWeight: '600'
  },
  confirmBtn: {
    marginTop: hp(3),
    borderRadius: 15,
    overflow: 'hidden'
  },
  btnGradient: {
    height: hp(7),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  btnText: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(4),
    fontWeight: 'bold',
    letterSpacing: 1.5
  },
  // ─── TOKEN MODAL STYLES ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 24,
    padding: wp(5),
    width: width * 0.92,
    maxHeight: height * 0.9,
    ...SHADOWS.large
  },
  modalSuccessIcon: {
    alignItems: 'center',
    marginBottom: hp(1)
  },
  modalTitle: {
    fontSize: wp(5.5),
    fontWeight: '700',
    color: COLORS_CUSTOM.text,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: wp(3.5),
    color: COLORS_CUSTOM.textSecondary,
    textAlign: 'center',
    marginBottom: hp(1.5)
  },
  tokenCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: hp(1.5)
  },
  tokenCardGradient: {
    padding: wp(4)
  },
  tokenCardHeader: {
    alignItems: 'center',
    marginBottom: hp(0.8)
  },
  tokenCardTitle: {
    color: COLORS_CUSTOM.text,
    fontSize: wp(4.5),
    fontWeight: '800',
    letterSpacing: 2
  },
  tokenCardSub: {
    color: COLORS_CUSTOM.textSecondary,
    fontSize: wp(3),
    letterSpacing: 1
  },
  tokenCardLocation: {
    color: COLORS_CUSTOM.textSecondary,
    fontSize: wp(2.8),
    marginTop: 2
  },
  tokenCardNumber: {
    fontSize: wp(8),
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2
  },
  tokenCardDept: {
    fontSize: wp(3.5),
    textAlign: 'center',
    fontWeight: '600'
  },
  waitTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: hp(0.8),
    marginVertical: hp(0.5),
    gap: 8,
    borderWidth: 1
  },
  waitTimeLabel: {
    fontSize: wp(3),
    color: COLORS_CUSTOM.textSecondary
  },
  waitTimeValue: {
    fontSize: wp(5),
    fontWeight: 'bold'
  },
  tokenCardDetails: {
    borderRadius: 12,
    padding: hp(1),
    marginTop: hp(0.5)
  },
  tokenCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(0.3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  tokenCardLabel: {
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  tokenCardValue: {
    fontSize: wp(3),
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right'
  },
  qrContainer: {
    alignItems: 'center',
    borderRadius: 12,
    padding: wp(2),
    marginVertical: hp(0.5)
  },
  qrText: {
    fontSize: wp(2.8),
    marginTop: hp(0.3)
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: hp(1)
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: hp(1),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5
  },
  modalDownloadBtn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary
  },
  modalDownloadText: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  modalQueueBtn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05'
  },
  modalQueueText: {
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  dashboardBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  dashboardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    gap: 10
  },
  dashboardText: {
    color: COLORS_CUSTOM.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  thankYouOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  thankYouContainer: {
    backgroundColor: COLORS_CUSTOM.white,
    borderRadius: 24,
    padding: wp(8),
    width: width * 0.85,
    alignItems: 'center',
    ...SHADOWS.large
  },
  thankYouTitle: {
    fontSize: wp(6),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: hp(1)
  },
  thankYouSubtitle: {
    fontSize: wp(3.5),
    color: COLORS_CUSTOM.textSecondary,
    textAlign: 'center',
    marginTop: hp(0.5)
  },
  thankYouToken: {
    fontSize: wp(4),
    fontWeight: 'bold',
    color: COLORS_CUSTOM.text,
    marginTop: hp(1),
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
    borderRadius: 8
  },
  thankYouDept: {
    fontSize: wp(3.5),
    color: COLORS_CUSTOM.textLight,
    marginTop: hp(0.3)
  },
  thankYouDetails: {
    marginTop: hp(0.5),
    alignItems: 'center'
  },
  thankYouDetailText: {
    fontSize: wp(3.2),
    color: COLORS_CUSTOM.textSecondary,
    marginTop: hp(0.2)
  },
  thankYouRedirect: {
    fontSize: wp(3),
    color: COLORS_CUSTOM.textLight,
    marginTop: hp(0.5)
  }
});
export default GenerateTokenScreen;