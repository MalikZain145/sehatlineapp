// mobile/src/screens/doctor/DoctorProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, ScrollView, Image, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { showConfirm, showInfo } from '../../../components/confirm';
import FadeInView from '../../../components/ui/FadeInView';
import doctorService from '../services/doctorService';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
const {
  width
} = Dimensions.get('window');

// ── Storage Keys ──────────────────────────────────────────────────────
const USER_DATA_KEY = '@sehatline_userData';
const PROFILE_IMAGE_KEY = '@sehatline_profile_image';

// ── Helper ────────────────────────────────────────────────────────────
const getInitials = name => {
  if (!name) return 'DR';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
const DoctorProfileScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useMinLoading(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ── Load Data ──────────────────────────────────────────────────────
  const loadDoctorData = async () => {
    try {
      const profileImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      let doctorData = {
        id: 'DR-1024',
        name: 'Dr. Ahmed Khan',
        designation: 'Consultant Cardiologist',
        department: 'Cardiology Department',
        hospital: 'Capital Hospital CDA',
        room: 'Room 12',
        employeeId: 'DR-1024',
        qualification: 'MBBS, FCPS (Cardiology)',
        experience: '15 Years',
        pmdcRegistration: 'PMC-123456',
        workingHours: '09:00 AM – 02:00 PM',
        isOnline: true,
        color: COLORS.primary,
        color2: COLORS.secondary,
        profileImage: null
      };
      if (userData) {
        const parsed = JSON.parse(userData);
        doctorData = {
          ...doctorData,
          ...parsed
        };
      }

      // Overlay with the REAL account profile from the backend session.
      try {
        const res = await doctorService.getProfile();
        const d = res?.doctor;
        if (d) {
          doctorData = {
            ...doctorData,
            name: d.name || doctorData.name,
            email: d.email || doctorData.email,
            phone: d.phone || doctorData.phone,
            employeeId: d.employeeId || d.doctorId || doctorData.employeeId,
            designation: d.designation || d.specialization || doctorData.designation,
            department: d.department || doctorData.department,
            hospital: d.hospital || doctorData.hospital,
            room: d.room || doctorData.room,
            qualification: d.qualification || doctorData.qualification,
            experience: d.experience || doctorData.experience,
            pmdcRegistration: d.pmdcRegistration || doctorData.pmdcRegistration,
            workingHours: d.workingHours || doctorData.workingHours
          };
          // Trust the backend fully for the photo (empty means no photo), so a
          // photo-less account never inherits a previous session's cached image.
          doctorData.profileImage = d.profilePic || null;
        }
      } catch (e) {/* offline — keep cached/defaults */}

      // On/Off duty comes from the doctor's real availability status.
      try {
        const av = await doctorService.getAvailability();
        if (av && typeof av.active === 'boolean') doctorData.isOnline = av.active;
      } catch (e) {/* offline — keep default */}

      // The backend is the source of truth for the photo. Only fall back to the
      // local cache when the backend returned none (e.g. offline) — never let a
      // stale cached image override it, which could otherwise show the previous
      // doctor's photo if two accounts are used on the same device.
      if (!doctorData.profileImage && profileImage) {
        doctorData.profileImage = profileImage;
      }

      // Set avatar from name
      doctorData.avatar = getInitials(doctorData.name);
      setDoctor(doctorData);
    } catch (error) {
      console.error('Error loading doctor data:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadDoctorData();
  }, []);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDoctorData();
    });
    return unsubscribe;
  }, [navigation]);
  const handleLogout = () => {
    showConfirm({
      title: 'Logout',
      message: 'Are you sure you want to log out of your account?',
      confirmLabel: 'Logout',
      destructive: true,
      icon: 'log-out-outline',
      onConfirm: async () => {
        try {
          await AsyncStorage.multiRemove(['user', 'userData', 'isLoggedIn', 'userRole', '@sehatline_userData', '@sehatline_token', '@sehatline_profile_image', '@sehatline_queue']);
        } catch (e) {/* ignore */}
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Login'
          }]
        });
      }
    });
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDoctorData();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ── Profile Picture ────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const {
        status: cameraStatus
      } = await ImagePicker.requestCameraPermissionsAsync();
      const {
        status: galleryStatus
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' && galleryStatus !== 'granted') {
        showInfo({
          title: 'Permissions Required',
          message: 'Please allow camera and gallery access to update your profile picture.',
          icon: 'alert-circle'
        });
        return false;
      }
      return true;
    }
    return true;
  };
  const handleUpdatePhoto = () => setShowPhotoModal(true);
  const openCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const a = result.assets[0];
        // Store a data-URI (not the file:// path) so the photo survives a
        // reinstall and persists to the backend, rendering on any device.
        const imageUri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
        await saveProfileImage(imageUri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to open camera. Please try again.',
        icon: 'alert-circle'
      });
    }
  };
  const openGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const a = result.assets[0];
        // Store a data-URI (not the file:// path) so the photo survives a
        // reinstall and persists to the backend, rendering on any device.
        const imageUri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
        await saveProfileImage(imageUri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to open gallery. Please try again.',
        icon: 'alert-circle'
      });
    }
  };
  const saveProfileImage = async imageUri => {
    setUploading(true);
    try {
      // Persist to the BACKEND first so the photo survives logout/login and
      // shows on every device (previously it was only cached locally and the
      // local key was wiped on logout, so the DP vanished after re-login).
      await doctorService.updateProfile({ profilePic: imageUri });

      // Cache locally for instant load on next open.
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, imageUri);

      // Update state
      setDoctor(prev => ({
        ...prev,
        profileImage: imageUri
      }));

      // Update user data
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.profileImage = imageUri;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(parsed));
      }
      showInfo({
        title: 'Success',
        message: 'Profile photo updated successfully!',
        icon: 'checkmark-circle'
      });
    } catch (error) {
      console.error('Error saving profile image:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to save profile photo. Please try again.',
        icon: 'alert-circle'
      });
      loadDoctorData();
    } finally {
      setUploading(false);
    }
  };
  const handleRemovePhoto = () => {
    showConfirm({
      title: 'Remove Photo',
      message: 'Are you sure you want to remove your profile photo?',
      confirmLabel: 'Remove',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        try {
          // Clear on the backend too, so it stays removed after re-login.
          try { await doctorService.updateProfile({ profilePic: '' }); } catch (e) {/* offline */}
          await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
          setDoctor(prev => ({
            ...prev,
            profileImage: null
          }));
          const userData = await AsyncStorage.getItem(USER_DATA_KEY);
          if (userData) {
            const parsed = JSON.parse(userData);
            parsed.profileImage = null;
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(parsed));
          }
          showInfo({
            title: 'Success',
            message: 'Profile photo removed successfully!',
            icon: 'checkmark-circle'
          });
        } catch (error) {
          console.error('Error removing profile image:', error);
          showInfo({
            title: 'Error',
            message: 'Failed to remove profile photo.',
            icon: 'alert-circle'
          });
        }
      }
    });
  };
  if (loading) {
    return <View style={styles.container}><SkeletonScreen cards={2} /></View>;
  }
  if (!doctor) {
    return <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No doctor data found</Text>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {/* ═══ 1. HEADER - SCROLLABLE (like DoctorPortalScreen) ══════════ */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Profile</Text>

          <View style={styles.headerRightRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('DoctorEditProfileScreen', {
            doctor
          })} activeOpacity={0.6}>
              <Ionicons name="create-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('DoctorSettings')} activeOpacity={0.6}>
              <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ 2. DOCTOR IDENTITY CARD ════════════════════════════════════ */}
        <FadeInView delay={60}>
          <View style={styles.doctorCard}>
            <LinearGradient colors={[COLORS.primary + '06', COLORS.card]} style={styles.doctorCardGradient} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handleUpdatePhoto} activeOpacity={0.8} disabled={uploading}>
                {doctor.profileImage ? <Image source={{
                uri: doctor.profileImage
              }} style={styles.avatarImage} /> : <LinearGradient colors={[doctor.color || COLORS.primary, doctor.color2 || COLORS.secondary]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{doctor.avatar || 'DR'}</Text>
                  </LinearGradient>}
                
                <View style={styles.cameraOverlay}>
                  {uploading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="camera-outline" size={14} color={COLORS.white} />}
                </View>
              </TouchableOpacity>

              <Text style={styles.doctorName}>{doctor.name}</Text>
              
              <View style={styles.specialtyContainer}>
                <Ionicons name="medical-outline" size={16} color={COLORS.primary} />
                <Text style={styles.doctorSpecialty}>{doctor.designation}</Text>
              </View>
              
              <Text style={styles.doctorDepartment}>{doctor.department}</Text>
              <Text style={styles.doctorHospital}>{doctor.hospital}</Text>
              
              <View style={styles.doctorIdRow}>
                <View style={styles.doctorIdItem}>
                  <Text style={styles.doctorIdLabel}>Employee ID</Text>
                  <Text style={styles.doctorIdValue}>{doctor.employeeId}</Text>
                </View>
                <View style={styles.doctorIdDivider} />
                <View style={styles.doctorIdItem}>
                  <Text style={styles.doctorIdLabel}>Status</Text>
                  <Text style={[styles.doctorIdValue, {
                  color: doctor.isOnline ? COLORS.success : COLORS.textLight
                }]}>
                    {doctor.isOnline ? 'On Duty' : 'Off Duty'}
                  </Text>
                </View>
              </View>

              {doctor.profileImage && <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                  <Text style={styles.removePhotoText}>Remove Photo</Text>
                </TouchableOpacity>}
            </LinearGradient>
          </View>
        </FadeInView>

        {/* ═══ 3. PROFESSIONAL INFORMATION ════════════════════════════════ */}
        <FadeInView delay={100}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            <View style={styles.sectionRule} />
            <View style={styles.infoCard}>
              <InfoItem icon="medkit-outline" label="Designation" value={doctor.designation} />
              <InfoItem icon="school-outline" label="Qualification" value={doctor.qualification} />
              <InfoItem icon="briefcase-outline" label="Experience" value={doctor.experience} />
              <InfoItem icon="id-card-outline" label="PMDC Registration" value={doctor.pmdcRegistration} />
            </View>
          </View>
        </FadeInView>

        {/* ═══ 4. DEPARTMENT & DUTY ════════════════════════════════════════ */}
        <FadeInView delay={140}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Department & Duty</Text>
            <View style={styles.sectionRule} />
            <View style={styles.infoCard}>
              <InfoItem icon="business-outline" label="Hospital" value={doctor.hospital} />
              <InfoItem icon="people-outline" label="Department" value={doctor.department} />
              <InfoItem icon="location-outline" label="Room" value={doctor.room} />
              <InfoItem icon="time-outline" label="Working Hours" value={doctor.workingHours} />
            </View>
          </View>
        </FadeInView>

        {/* ═══ 5. LOGOUT BUTTON ════════════════════════════════════════════ */}
        <FadeInView delay={180}>
          <TouchableOpacity style={styles.editBtn} onPress={handleLogout} activeOpacity={0.9}>
            <View style={styles.logoutBtnInner}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger || '#EF4444'} />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </FadeInView>


        <View style={styles.footer}>
          <Text style={styles.footerText}>Capital Hospital CDA</Text>
          <Text style={styles.footerSub}>SehatLine v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      {/* ─── UPDATE PHOTO — themed options modal ──────────────────────── */}
      <BottomSheet visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} overlayStyle={styles.photoOverlay} sheetStyle={styles.photoCard}>
            <Text style={styles.photoTitle}>Update Profile Photo</Text>
            <TouchableOpacity style={styles.photoOption} activeOpacity={0.7} onPress={() => {
            setShowPhotoModal(false);
            openCamera();
          }}>
              <View style={styles.photoOptionIcon}><Ionicons name="camera-outline" size={22} color={COLORS.primary} /></View>
              <Text style={styles.photoOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoOption} activeOpacity={0.7} onPress={() => {
            setShowPhotoModal(false);
            openGallery();
          }}>
              <View style={styles.photoOptionIcon}><Ionicons name="images-outline" size={22} color={COLORS.primary} /></View>
              <Text style={styles.photoOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {!!doctor?.profileImage && <TouchableOpacity style={styles.photoOption} activeOpacity={0.7} onPress={() => {
            setShowPhotoModal(false);
            handleRemovePhoto();
          }}>
                <View style={styles.photoOptionIcon}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger || '#EF4444'} />
                </View>
                <Text style={[styles.photoOptionText, {
              color: COLORS.danger || '#EF4444'
            }]}>Remove Photo</Text>
              </TouchableOpacity>}
            <TouchableOpacity style={styles.photoCancel} activeOpacity={0.7} onPress={() => setShowPhotoModal(false)}>
              <Text style={styles.photoCancelText}>Cancel</Text>
            </TouchableOpacity>
      </BottomSheet>
    </View>;
};

// ── Info Item ──────────────────────────────────────────────────────────
const InfoItem = ({
  icon,
  label,
  value
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>;
};

// ── Menu Link (Quick Links list) ───────────────────────────────────────
const MenuLink = ({
  icon,
  label,
  onPress,
  last
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <TouchableOpacity style={[styles.menuLinkRow, last && {
    borderBottomWidth: 0
  }]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <Text style={styles.menuLinkLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
  </TouchableOpacity>;
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary
  },
  // ─── HEADER - SCROLLABLE (like DoctorPortalScreen) ──────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18,
    backgroundColor: COLORS.background
  },
  iconBtn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 0
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16
  },
  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.6,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden'
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain'
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4
  },
  brandAccent: {
    color: COLORS.text
  },
  tagline: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  // ─── SCROLL CONTENT ──────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 20
  },
  // ─── SECTION ──────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.3
  },
  sectionRule: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginBottom: 16
  },
  // ─── 1. DOCTOR CARD ──────────────────────────────────────────────
  doctorCard: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.08,
        shadowRadius: 12
      },
      android: {
        elevation: 0
      }
    })
  },
  doctorCardGradient: {
    padding: 20
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover'
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff'
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 2
  },
  doctorSpecialty: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center'
  },
  doctorDepartment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2
  },
  doctorHospital: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 12
  },
  doctorIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '04',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  doctorIdItem: {
    flex: 1,
    alignItems: 'center'
  },
  doctorIdLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  doctorIdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1
  },
  doctorIdDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.surface
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent'
  },
  removePhotoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500'
  },
  // ─── INFO CARD ─────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  menuLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  menuLinkLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600'
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1
  },
  // ─── EDIT BUTTON ──────────────────────────────────────────────────
  editBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.25,
        shadowRadius: 12
      },
      android: {
        elevation: 0
      }
    })
  },
  editBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  photoCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28
  },
  photoHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border || '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14
  },
  photoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14
  },
  photoOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  photoCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center'
  },
  photoCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary || '#6B7280'
  },
  logoutBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    backgroundColor: (COLORS.danger || '#EF4444') + '12',
    borderWidth: 1.5,
    borderColor: (COLORS.danger || '#EF4444') + '55',
    borderRadius: 12
  },
  logoutBtnText: {
    color: COLORS.danger || '#EF4444',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  // ─── FOOTER ──────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: 20
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  footerSub: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2
  }
});
export default DoctorProfileScreen;