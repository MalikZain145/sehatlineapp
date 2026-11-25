// src/screens/doctor/DoctorEditProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, SafeAreaView, ScrollView, Image, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { SHADOWS } from '../../../theme';
import BottomSheet from '../../../components/ui/BottomSheet';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import doctorService from '../services/doctorService';
import { showInfo } from '../../../components/confirm';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const USER_DATA_KEY = '@sehatline_userData';
const DoctorEditProfileScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [hospital, setHospital] = useState('');
  const [room, setRoom] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [pmdcRegistration, setPmdcRegistration] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [availableDays, setAvailableDays] = useState([]);   // e.g. ['Mon','Wed','Fri']
  const [profileImage, setProfileImage] = useState(null);
  const [avatar, setAvatar] = useState('');

  // Working-hours time picker state.
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [fromTime, setFromTime] = useState({
    h: 9,
    m: '00',
    p: 'AM'
  });
  const [toTime, setToTime] = useState({
    h: 2,
    m: '00',
    p: 'PM'
  });
  useEffect(() => {
    if (route.params?.doctor) {
      const doctor = route.params.doctor;
      setName(doctor.name || '');
      setDesignation(doctor.designation || doctor.specialty || '');
      setDepartment(doctor.department || '');
      setHospital(doctor.hospital || '');
      setRoom(doctor.room || '');
      setEmployeeId(doctor.employeeId || '');
      setQualification(doctor.qualification || '');
      setExperience(doctor.experience || '');
      setPmdcRegistration(doctor.pmdcRegistration || '');
      setWorkingHours(doctor.workingHours || doctor.shift || '');
      setAvailableDays(Array.isArray(doctor.availableDays) ? doctor.availableDays : []);
      // Backend stores the photo as `profilePic`; keep `profileImage` as a
      // fallback for any locally-cached object.
      setProfileImage(doctor.profilePic || doctor.profileImage || null);
      setAvatar(doctor.avatar || 'DR');
    }
  }, [route.params]);

  // ── Working-hours time picker helpers ──────────────────────────────────
  const parseTimePart = (str, fallback) => {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(str || ''));
    if (!m) return fallback;
    return {
      h: Math.min(12, Math.max(1, parseInt(m[1], 10))),
      m: m[2],
      p: m[3].toUpperCase()
    };
  };
  const openTimePicker = () => {
    const parts = String(workingHours || '').split(/[–-]/);
    setFromTime(parseTimePart(parts[0], {
      h: 9,
      m: '00',
      p: 'AM'
    }));
    setToTime(parseTimePart(parts[1], {
      h: 2,
      m: '00',
      p: 'PM'
    }));
    setShowTimeModal(true);
  };
  const confirmTime = () => {
    const fmt = t => `${String(t.h).padStart(2, '0')}:${t.m} ${t.p}`;
    setWorkingHours(`${fmt(fromTime)} – ${fmt(toTime)}`);
    setShowTimeModal(false);
  };
  const pickImage = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showInfo({
          title: 'Permission Denied',
          message: 'Please allow access to your photo library.',
          icon: 'checkmark-circle'
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        // Keep the base64 payload small: a big data-URI blocks the JS thread on
        // save (AsyncStorage write + upload), which on iOS looks like the screen
        // hanging with an unresponsive Back button.
        quality: 0.4,
        base64: true
      });
      if (!result.canceled) {
        const a = result.assets[0];
        // Store a data-URI so the photo persists to the backend and renders anywhere.
        setProfileImage(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to pick image.',
        icon: 'alert-circle'
      });
    }
  };
  const takePhoto = async () => {
    try {
      const {
        status
      } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showInfo({
          title: 'Permission Denied',
          message: 'Please allow access to your camera.',
          icon: 'checkmark-circle'
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        // Small base64 payload — see note in the library picker above.
        quality: 0.4,
        base64: true
      });
      if (!result.canceled) {
        const a = result.assets[0];
        // Store a data-URI so the photo persists to the backend and renders anywhere.
        setProfileImage(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to take photo.',
        icon: 'alert-circle'
      });
    }
  };
  const handleChangeImage = () => setShowPhotoModal(true);
  const handleSave = async () => {
    if (!name.trim()) {
      showInfo({
        title: 'Error',
        message: 'Please enter your name.',
        icon: 'alert-circle'
      });
      return;
    }
    if (!designation.trim()) {
      showInfo({
        title: 'Error',
        message: 'Please enter your designation.',
        icon: 'alert-circle'
      });
      return;
    }
    setSaving(true);
    try {
      const existingData = await AsyncStorage.getItem(USER_DATA_KEY);
      let currentData = existingData ? JSON.parse(existingData) : {};
      const updatedDoctor = {
        ...currentData,
        name: name.trim(),
        specialty: designation.trim(),
        designation: designation.trim(),
        department: department.trim(),
        hospital: hospital.trim(),
        room: room.trim(),
        employeeId: employeeId.trim(),
        qualification: qualification.trim(),
        experience: experience.trim(),
        pmdcRegistration: pmdcRegistration.trim(),
        shift: workingHours.trim(),
        workingHours: workingHours.trim(),
        availableDays,
        profileImage: profileImage,
        avatar: avatar || name.split(' ').map(n => n[0]).join('').toUpperCase(),
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedDoctor));

      // Persist ALL editable fields + photo to the backend so they survive
      // logout/login (not just name/photo).
      try {
        await doctorService.updateProfile({
          name: name.trim(),
          specialization: designation.trim(),
          designation: designation.trim(),
          department: department.trim(),
          employeeId: employeeId.trim(),
          hospital: hospital.trim(),
          room: room.trim(),
          qualification: qualification.trim(),
          experience: experience.trim(),
          pmdcRegistration: pmdcRegistration.trim(),
          workingHours: workingHours.trim(),
          availableDays,
          ...(profileImage ? {
            profilePic: profileImage
          } : {})
        });
      } catch (e) {/* offline — local cache still updated */}
      showInfo({
        title: 'Success',
        message: 'Profile updated successfully!',
        icon: 'checkmark-circle',
        onClose: () => navigation.goBack()
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to save profile.',
        icon: 'alert-circle'
      });
    } finally {
      setSaving(false);
    }
  };
  const getInitials = () => {
    if (profileImage) return null;
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'DR';
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Edit Profile</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveBtnGradient}>
              {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <>
                  <Ionicons name="checkmark-outline" size={wp(4)} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{
        flex: 1
      }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageSection}>
            <TouchableOpacity style={styles.profileImageContainer} onPress={handleChangeImage} activeOpacity={0.8}>
              {profileImage ? <Image source={{
                uri: profileImage
              }} style={styles.profileImage} /> : <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>{getInitials()}</Text>
                </LinearGradient>}
              <View style={styles.cameraIconContainer}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.cameraIcon}>
                  <Ionicons name="camera-outline" size={wp(3)} color={COLORS.white} />
                </LinearGradient>
              </View>
            </TouchableOpacity>
            <Text style={styles.profileImageHint}>Tap to change profile picture</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Personal Information</Text>
            <View style={styles.formCard}>
              <FormField label="Full Name" value={name} onChangeText={setName} placeholder="Enter full name" icon="person-outline" />
              <FormField label="Designation" value={designation} onChangeText={setDesignation} placeholder="Enter designation" icon="medkit-outline" />
              <FormField label="Department" value={department} onChangeText={setDepartment} placeholder="Enter department" icon="people-outline" />
              <FormField label="Hospital" value={hospital} onChangeText={setHospital} placeholder="Enter hospital name" icon="business-outline" />
              <FormField label="Room" value={room} onChangeText={setRoom} placeholder="Enter room number" icon="location-outline" />
              <FormField label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="Enter employee ID" icon="id-card-outline" />
              <FormField label="Qualification" value={qualification} onChangeText={setQualification} placeholder="Enter qualification" icon="school-outline" />
              <FormField label="Experience" value={experience} onChangeText={setExperience} placeholder="Enter experience" icon="briefcase-outline" />
              <FormField label="PMDC Registration No." value={pmdcRegistration} onChangeText={setPmdcRegistration} placeholder="Enter PMDC registration" icon="id-card-outline" />

              {/* Working Hours — modern scrollable time picker */}
              <TouchableOpacity style={styles.fieldContainer} activeOpacity={0.7} onPress={openTimePicker}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="time-outline" size={wp(3.5)} color={COLORS.primary} />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>Working Hours</Text>
                  <Text style={[styles.fieldInput, !workingHours && {
                    color: COLORS.textLight
                  }]}>
                    {workingHours || 'Tap to set working hours'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={wp(4)} color={COLORS.textLight} />
              </TouchableOpacity>

              {/* Working Days — patients can only book on the days selected here */}
              <View style={{ marginTop: hp(1.4), paddingHorizontal: wp(1) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                  <View style={styles.fieldIcon}>
                    <Ionicons name="calendar-outline" size={wp(3.5)} color={COLORS.primary} />
                  </View>
                  <Text style={styles.fieldLabel}>Working Days</Text>
                </View>
                <Text style={{ color: COLORS.textLight, fontSize: wp(3), marginTop: hp(0.5), marginLeft: wp(1) }}>
                  Patients can only book you on the days you select.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginTop: hp(1.2), marginLeft: wp(1) }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                    const active = availableDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.8}
                        onPress={() => setAvailableDays((prev) => (active ? prev.filter((d) => d !== day) : [...prev, day]))}
                        style={{
                          paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: wp(6), borderWidth: 1.5,
                          backgroundColor: active ? COLORS.primary : COLORS.card,
                          borderColor: active ? COLORS.primary : COLORS.border,
                        }}
                      >
                        <Text style={{ fontSize: wp(3.3), fontWeight: '700', color: active ? '#FFFFFF' : COLORS.textSecondary }}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Capital Hospital CDA</Text>
            <Text style={styles.footerSub}>SehatLine v{APP_VERSION}</Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {/* ─── WORKING-HOURS TIME PICKER MODAL ─────────────────────────── */}
        <BottomSheet visible={showTimeModal} onClose={() => setShowTimeModal(false)} overlayStyle={styles.tpOverlay} sheetStyle={styles.tpCard}>
              <View style={styles.tpHeader}>
                <Text style={styles.tpTitle}>Working Hours</Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)} hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
              }}>
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <TimeSelector label="From" value={fromTime} onChange={setFromTime} />
              <View style={styles.tpSeparator} />
              <TimeSelector label="To" value={toTime} onChange={setToTime} />

              <TouchableOpacity style={styles.tpSaveBtn} activeOpacity={0.85} onPress={confirmTime}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 0
              }} style={styles.tpSaveGradient}>
                  <Text style={styles.tpSaveText}>Set Hours</Text>
                </LinearGradient>
              </TouchableOpacity>
        </BottomSheet>

        {/* ─── CHANGE PROFILE PICTURE — themed modal ────────────────────── */}
        <BottomSheet visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} overlayStyle={styles.ppOverlay} sheetStyle={styles.ppCard}>
              <Text style={styles.ppTitle}>Change Profile Picture</Text>
              <TouchableOpacity style={styles.ppOption} activeOpacity={0.7} onPress={() => {
              setShowPhotoModal(false);
              takePhoto();
            }}>
                <View style={styles.ppOptionIcon}><Ionicons name="camera-outline" size={22} color={COLORS.primary} /></View>
                <Text style={styles.ppOptionText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ppOption} activeOpacity={0.7} onPress={() => {
              setShowPhotoModal(false);
              pickImage();
            }}>
                <View style={styles.ppOptionIcon}><Ionicons name="images-outline" size={22} color={COLORS.primary} /></View>
                <Text style={styles.ppOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              {!!profileImage && <TouchableOpacity style={styles.ppOption} activeOpacity={0.7} onPress={() => {
              setShowPhotoModal(false);
              setProfileImage(null);
            }}>
                  <View style={styles.ppOptionIcon}>
                    <Ionicons name="trash-outline" size={22} color={COLORS.danger || '#EF4444'} />
                  </View>
                  <Text style={[styles.ppOptionText, {
                color: COLORS.danger || '#EF4444'
              }]}>Remove Photo</Text>
                </TouchableOpacity>}
              <TouchableOpacity style={styles.ppCancel} activeOpacity={0.7} onPress={() => setShowPhotoModal(false)}>
                <Text style={styles.ppCancelText}>Cancel</Text>
              </TouchableOpacity>
        </BottomSheet>
      </SafeAreaView>
    </View>;
};

// ── Scrollable time selector (hour / minute / AM-PM) ───────────────────────
const TP_HOURS = Array.from({
  length: 12
}, (_, i) => i + 1);
const TP_MINUTES = ['00', '15', '30', '45'];
const TP_PERIODS = ['AM', 'PM'];
const TimeSelector = ({
  label,
  value,
  onChange
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.tsWrap}>
    <Text style={styles.tsLabel}>{label}</Text>
    <View style={styles.tsRow}>
      <View style={styles.tsCol}>
        <Text style={styles.tsColLabel}>Hour</Text>
        <ScrollView style={styles.tsScroll} showsVerticalScrollIndicator={false}>
          {TP_HOURS.map(h => <TouchableOpacity key={h} style={[styles.tsItem, value.h === h && styles.tsItemActive]} onPress={() => onChange({
            ...value,
            h
          })}>
              <Text style={[styles.tsItemText, value.h === h && styles.tsItemTextActive]}>{String(h).padStart(2, '0')}</Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>
      <View style={styles.tsCol}>
        <Text style={styles.tsColLabel}>Min</Text>
        <ScrollView style={styles.tsScroll} showsVerticalScrollIndicator={false}>
          {TP_MINUTES.map(m => <TouchableOpacity key={m} style={[styles.tsItem, value.m === m && styles.tsItemActive]} onPress={() => onChange({
            ...value,
            m
          })}>
              <Text style={[styles.tsItemText, value.m === m && styles.tsItemTextActive]}>{m}</Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>
      <View style={styles.tsCol}>
        <Text style={styles.tsColLabel}>AM/PM</Text>
        <ScrollView style={styles.tsScroll} showsVerticalScrollIndicator={false}>
          {TP_PERIODS.map(p => <TouchableOpacity key={p} style={[styles.tsItem, value.p === p && styles.tsItemActive]} onPress={() => onChange({
            ...value,
            p
          })}>
              <Text style={[styles.tsItemText, value.p === p && styles.tsItemTextActive]}>{p}</Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>
    </View>
  </View>;
};
const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  editable = true
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.fieldContainer}>
    <View style={styles.fieldIcon}>
      <Ionicons name={icon} size={wp(3.5)} color={COLORS.primary} />
    </View>
    <View style={styles.fieldContent}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.fieldInput, !editable && styles.fieldInputDisabled]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textLight} editable={editable} />
    </View>
  </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },
  // Working-hours time picker
  tpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  tpCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(3)
  },
  tpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5)
  },
  tpTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text
  },
  tpSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: hp(1.2)
  },
  tsWrap: {},
  tsLabel: {
    fontSize: wp(3.4),
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: hp(0.8)
  },
  tsRow: {
    flexDirection: 'row',
    gap: wp(3)
  },
  tsCol: {
    flex: 1,
    alignItems: 'center'
  },
  tsColLabel: {
    fontSize: wp(2.6),
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: hp(0.5)
  },
  tsScroll: {
    height: hp(14),
    width: '100%'
  },
  tsItem: {
    paddingVertical: hp(1),
    borderRadius: wp(2),
    alignItems: 'center',
    marginVertical: 2,
    backgroundColor: COLORS.background
  },
  tsItemActive: {
    backgroundColor: COLORS.primary
  },
  tsItemText: {
    fontSize: wp(4),
    color: COLORS.text,
    fontWeight: '600'
  },
  tsItemTextActive: {
    color: COLORS.white,
    fontWeight: '800'
  },
  tpSaveBtn: {
    marginTop: hp(2),
    borderRadius: wp(3),
    overflow: 'hidden'
  },
  tpSaveGradient: {
    paddingVertical: hp(1.6),
    alignItems: 'center'
  },
  tpSaveText: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: '700'
  },
  // Change-photo modal
  ppOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  ppCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp(5),
    paddingTop: hp(1.5),
    paddingBottom: hp(3.5)
  },
  ppHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border || '#E5E7EB',
    alignSelf: 'center',
    marginBottom: hp(1.5)
  },
  ppTitle: {
    fontSize: wp(4.3),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1)
  },
  ppOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
    paddingVertical: hp(1.6)
  },
  ppOptionIcon: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(3),
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ppOptionText: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: COLORS.text
  },
  ppCancel: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.6),
    borderRadius: wp(3),
    borderWidth: 1.5,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center'
  },
  ppCancelText: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: COLORS.textSecondary || '#6B7280'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1.2) : (StatusBar.currentHeight || 28) + 14,
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
  saveBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden'
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.6),
    gap: wp(1)
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '600'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: hp(4)
  },
  profileImageSection: {
    alignItems: 'center',
    marginTop: hp(2)
  },
  profileImageContainer: {
    position: 'relative'
  },
  profileImage: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    borderWidth: 3,
    borderColor: COLORS.primary + '30'
  },
  profileImagePlaceholder: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary + '30'
  },
  profileImageText: {
    fontSize: wp(8),
    fontWeight: '700',
    color: COLORS.white
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0
  },
  cameraIcon: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white
  },
  profileImageHint: {
    fontSize: wp(2.8),
    color: COLORS.textLight,
    marginTop: hp(1)
  },
  formSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(2)
  },
  formTitle: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1)
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  fieldIcon: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(2),
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2.5)
  },
  fieldContent: {
    flex: 1
  },
  fieldLabel: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    fontWeight: '500'
  },
  fieldInput: {
    fontSize: wp(3.2),
    color: COLORS.text,
    paddingVertical: hp(0.2),
    paddingRight: wp(2)
  },
  fieldInputDisabled: {
    color: COLORS.textLight
  },
  footer: {
    alignItems: 'center',
    marginTop: hp(3),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(4)
  },
  footerText: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  footerSub: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    marginTop: hp(0.2)
  }
});
export default DoctorEditProfileScreen;