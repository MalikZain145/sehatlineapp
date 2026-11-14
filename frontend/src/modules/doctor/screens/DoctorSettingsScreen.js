// src/screens/doctor/DoctorSettingsScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BrandLogo from '../../../components/ui/BrandLogo';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, ScrollView, Switch, Alert, Image, Modal, ActivityIndicator, RefreshControl, TextInput, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { ConfirmModal } from '../../../components/AppModal';
import { showConfirm, showInfo } from '../../../components/confirm';
import doctorService from '../services/doctorService';
import { authenticateBiometric } from '../../../utils/biometric';
import authService from '../../auth/services/authService';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;

// ── Storage Keys ──────────────────────────────────────────────────────
const THEME_KEY = '@sehatline_theme';
const SETTINGS_KEYS = {
  notifications: '@sehatline_notifications',
  reminders: '@sehatline_appointment_reminders',
  queueUpdates: '@sehatline_queue_updates',
  adminMessages: '@sehatline_admin_messages',
  vibration: '@sehatline_vibration',
  biometric: '@sehatline_biometric',
  duration: '@sehatline_consultation_duration',
  template: '@sehatline_notes_template',
  autoSave: '@sehatline_auto_save_notes',
  available: '@sehatline_doctor_available',
  emergency: '@sehatline_accept_emergency'
};

// Maps a local AsyncStorage key to its backend settings field, so every save
// is synced to the server (and survives re-install / other devices).
const BACKEND_FIELD = {
  '@sehatline_notifications': 'notifications',
  '@sehatline_appointment_reminders': 'reminders',
  '@sehatline_queue_updates': 'queueUpdates',
  '@sehatline_consultation_duration': 'consultationDuration',
  '@sehatline_notes_template': 'notesTemplate',
  '@sehatline_auto_save_notes': 'autoSaveNotes',
  '@sehatline_accept_emergency': 'acceptEmergency',
};

// ─── Duration Options ──────────────────────────────────────────────
const DURATION_OPTIONS = ['10', '15', '20', '30', '45', '60'];
const TEMPLATE_OPTIONS = ['General Checkup', 'Chronic Care', 'Follow-up', 'Emergency'];
const DoctorSettingsScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // ─── State ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  // Dark mode is driven by the app-wide ThemeContext (persists + applies).
  const {
    isDark,
    setDark
  } = useTheme();
  const isDarkMode = isDark;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [queueUpdates, setQueueUpdates] = useState(true);
  const [adminMessages, setAdminMessages] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [consultationDuration, setConsultationDuration] = useState('15');
  const [notesTemplate, setNotesTemplate] = useState('General Checkup');
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [acceptEmergency, setAcceptEmergency] = useState(true);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── LOAD ALL SETTINGS ──────────────────────────────────────────────
  const loadAllSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [theme, notif, reminders, queue, admin, vibration, bio, duration, template, autoSave, available, emergency] = await Promise.all([AsyncStorage.getItem(THEME_KEY), AsyncStorage.getItem(SETTINGS_KEYS.notifications), AsyncStorage.getItem(SETTINGS_KEYS.reminders), AsyncStorage.getItem(SETTINGS_KEYS.queueUpdates), AsyncStorage.getItem(SETTINGS_KEYS.adminMessages), AsyncStorage.getItem(SETTINGS_KEYS.vibration), AsyncStorage.getItem(SETTINGS_KEYS.biometric), AsyncStorage.getItem(SETTINGS_KEYS.duration), AsyncStorage.getItem(SETTINGS_KEYS.template), AsyncStorage.getItem(SETTINGS_KEYS.autoSave), AsyncStorage.getItem(SETTINGS_KEYS.available), AsyncStorage.getItem(SETTINGS_KEYS.emergency)]);

      // (dark mode comes from ThemeContext, not this key)
      if (notif !== null) setNotificationsEnabled(JSON.parse(notif));
      if (reminders !== null) setAppointmentReminders(JSON.parse(reminders));
      if (queue !== null) setQueueUpdates(JSON.parse(queue));
      if (admin !== null) setAdminMessages(JSON.parse(admin));
      if (vibration !== null) setVibrationEnabled(JSON.parse(vibration));
      if (bio !== null) setBiometricEnabled(bio === 'true');
      if (duration) setConsultationDuration(duration);
      if (template) setNotesTemplate(template);
      if (autoSave !== null) setAutoSaveNotes(JSON.parse(autoSave));
      if (available !== null) setIsAvailable(JSON.parse(available));
      if (emergency !== null) setAcceptEmergency(JSON.parse(emergency));

      // Backend is the source of truth — override local with the synced values.
      try {
        const res = await doctorService.getSettings();
        const s = res?.settings;
        if (s) {
          if (typeof s.notifications === 'boolean') setNotificationsEnabled(s.notifications);
          if (typeof s.reminders === 'boolean') setAppointmentReminders(s.reminders);
          if (typeof s.queueUpdates === 'boolean') setQueueUpdates(s.queueUpdates);
          if (s.consultationDuration) setConsultationDuration(s.consultationDuration);
          if (s.notesTemplate) setNotesTemplate(s.notesTemplate);
          if (typeof s.autoSaveNotes === 'boolean') setAutoSaveNotes(s.autoSaveNotes);
          if (typeof s.acceptEmergency === 'boolean') setAcceptEmergency(s.acceptEmergency);
        }
      } catch (e) { /* offline — local values stand */ }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllSettings();
    setRefreshing(false);
  }, [loadAllSettings]);

  // ─── SAVE HELPERS ──────────────────────────────────────────────────
  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
    // Sync to the backend so the setting persists across devices/re-installs.
    const field = BACKEND_FIELD[key];
    if (field) {
      try { await doctorService.updateSettings({ [field]: value }); } catch (e) { /* offline */ }
    }
  };

  // ─── HANDLERS ──────────────────────────────────────────────────────
  const toggleDarkMode = value => {
    // Applies app-wide + persists via ThemeContext (appSettings.darkMode).
    setDark(value);
  };
  const toggleNotifications = async value => {
    setNotificationsEnabled(value);
    await saveSetting(SETTINGS_KEYS.notifications, value);
  };
  const toggleAppointmentReminders = async value => {
    setAppointmentReminders(value);
    await saveSetting(SETTINGS_KEYS.reminders, value);
  };
  const toggleQueueUpdates = async value => {
    setQueueUpdates(value);
    await saveSetting(SETTINGS_KEYS.queueUpdates, value);
  };
  const toggleAdminMessages = async value => {
    setAdminMessages(value);
    await saveSetting(SETTINGS_KEYS.adminMessages, value);
  };
  const toggleVibration = async value => {
    setVibrationEnabled(value);
    await saveSetting(SETTINGS_KEYS.vibration, value);
  };

  // ─── BIOMETRIC ─────────────────────────────────────────────────────
  const handleBiometric = () => {
    if (biometricEnabled) {
      showConfirm({
        title: 'Disable Biometric',
        message: 'Are you sure you want to disable biometric login?',
        confirmLabel: 'Disable',
        destructive: true,
        icon: 'finger-print-outline',
        onConfirm: async () => {
          await saveSetting(SETTINGS_KEYS.biometric, false);
          setBiometricEnabled(false);
          showInfo({
            title: 'Success',
            message: 'Biometric login disabled.',
            icon: 'checkmark-circle'
          });
        }
      });
    } else {
      setShowBiometricModal(true);
    }
  };
  const handleBiometricSetup = async () => {
    setIsBiometricLoading(true);
    try {
      // 1) REAL fingerprint scan on the device sensor.
      const result = await authenticateBiometric('Scan your fingerprint to enable biometric login');
      if (!result.success) {
        setIsBiometricLoading(false);
        setShowBiometricModal(false);
        showInfo({
          title: 'Not Enabled',
          message: result.message || 'Fingerprint scan was cancelled or not recognized.',
          icon: 'finger-print-outline'
        });
        return;
      }

      // 2) Bind it to this account. The backend rejects (409) if this biometric
      //    is already linked to a different patient/doctor/pharmacist/lab/admin.
      await authService.enrollFingerprint(result.deviceToken);
      await saveSetting(SETTINGS_KEYS.biometric, true);
      setBiometricEnabled(true);
      setShowBiometricModal(false);
      showInfo({
        title: 'Biometric Enabled',
        message: 'Fingerprint login is now enabled for this device.',
        icon: 'checkmark-circle'
      });
    } catch (error) {
      setShowBiometricModal(false);
      showInfo({
        title: 'Could Not Enable',
        message: error?.message || 'Failed to enable biometric login.',
        icon: 'alert-circle'
      });
    } finally {
      setIsBiometricLoading(false);
    }
  };

  // ─── CLINICAL PREFERENCES ──────────────────────────────────────────
  const saveClinicalPreferences = async () => {
    setSaving(true);
    try {
      await Promise.all([AsyncStorage.setItem(SETTINGS_KEYS.duration, consultationDuration), AsyncStorage.setItem(SETTINGS_KEYS.template, notesTemplate), AsyncStorage.setItem(SETTINGS_KEYS.autoSave, JSON.stringify(autoSaveNotes))]);
      // Sync clinical preferences to the backend.
      try {
        await doctorService.updateSettings({
          consultationDuration,
          notesTemplate,
          autoSaveNotes,
        });
      } catch (e) { /* offline */ }
      showInfo({
        title: 'Success',
        message: 'Clinical preferences saved!',
        icon: 'checkmark-circle'
      });
    } catch (error) {
      showInfo({
        title: 'Error',
        message: 'Failed to save preferences.',
        icon: 'alert-circle'
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── AVAILABILITY ──────────────────────────────────────────────────
  // Toggling "Available Today" saves immediately so the On/Off-Duty status
  // updates everywhere at once — no separate Save press needed.
  const toggleAvailable = async (value) => {
    setIsAvailable(value);
    try { await AsyncStorage.setItem(SETTINGS_KEYS.available, JSON.stringify(value)); } catch (e) {}
    try { await doctorService.setDutyStatus(value); } catch (e) {}
    showInfo({
      title: value ? 'On Duty' : 'Off Duty',
      message: value ? 'You are now available. Patients can see and book you.' : 'You are now off duty. Patients will not see or be able to book you.',
      icon: value ? 'checkmark-circle' : 'moon-outline',
    });
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      await Promise.all([AsyncStorage.setItem(SETTINGS_KEYS.available, JSON.stringify(isAvailable)), AsyncStorage.setItem(SETTINGS_KEYS.emergency, JSON.stringify(acceptEmergency))]);
      // Push the on/off-duty status to the backend. When OFF, patients can no
      // longer see or book this doctor, and the profile shows "Off Duty".
      try {
        await doctorService.setDutyStatus(isAvailable);
        await doctorService.updateSettings({ acceptEmergency });
      } catch (e) {/* offline */}
      showInfo({
        title: isAvailable ? 'On Duty' : 'Off Duty',
        message: isAvailable ? 'You are now available. Patients can see and book you.' : 'You are now off duty. Patients will not see or be able to book you.',
        icon: isAvailable ? 'checkmark-circle' : 'moon-outline'
      });
    } catch (error) {
      showInfo({
        title: 'Error',
        message: 'Failed to update availability.',
        icon: 'alert-circle'
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── PRIVACY ──────────────────────────────────────────────────────
  const handlePrivacy = () => navigation.navigate('DoctorPrivacy');
  const handleTerms = () => navigation.navigate('DoctorTerms');

  // ─── REPORT TO ADMIN ─────────────────────────────────────────────
  const submitReport = async () => {
    const msg = reportText.trim();
    if (!msg) {
      showInfo({
        title: 'Empty',
        message: 'Please write your report before sending.',
        icon: 'alert-circle'
      });
      return;
    }
    setReportSending(true);
    try {
      const res = await doctorService.reportToAdmin(msg);
      setShowReportModal(false);
      setReportText('');
      showInfo({
        title: 'Report Sent',
        message: res?.message || 'Your report has been sent to the admin.',
        icon: 'checkmark-circle'
      });
    } catch (e) {
      showInfo({
        title: 'Failed',
        message: e?.message || 'Could not send your report. Please try again.',
        icon: 'alert-circle'
      });
    } finally {
      setReportSending(false);
    }
  };

  // ─── LOGOUT ──────────────────────────────────────────────────────
  const handleLogout = () => setShowLogoutModal(true);
  const doLogout = async () => {
    setShowLogoutModal(false);
    try {
      await AsyncStorage.multiRemove(['user', 'userData', 'isLoggedIn', 'userRole', '@sehatline_userData', '@sehatline_token', '@sehatline_profile_image', '@sehatline_queue']);
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Login'
        }]
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ─── DYNAMIC COLORS ──────────────────────────────────────────────
  const colors = useMemo(() => {
    const isDark = isDarkMode;
    const primaryColor = COLORS.primary;
    return {
      background: isDark ? '#121212' : '#F4F7FC',
      card: isDark ? '#1E1E1E' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#1A1A2E',
      textSecondary: isDark ? '#B0B0B0' : '#4A4A5A',
      textLight: isDark ? '#888888' : '#8A8A9A',
      border: isDark ? '#333333' : '#E8EEF4',
      iconBg: isDark ? '#2A2A3A' : primaryColor + '12',
      primary: primaryColor,
      primaryLight: isDark ? primaryColor + '60' : primaryColor + '30',
      danger: isDark ? '#FF6B6B' : COLORS.danger,
      switchTrackOn: primaryColor,
      switchTrackOff: isDark ? '#444444' : '#E0E0E0',
      switchThumb: isDark ? '#FFFFFF' : '#FFFFFF',
      switchThumbOn: isDark ? '#FFFFFF' : '#FFFFFF',
      logoBorder: isDark ? primaryColor : primaryColor,
      brandPrimary: isDark ? primaryColor : primaryColor,
      brandAccent: isDark ? '#FFFFFF' : '#1A1A2E'
    };
  }, [isDarkMode]);

  // ─── SETTING ITEM COMPONENT ──────────────────────────────────────
  const SettingItem = useCallback(({
    icon,
    label,
    description,
    type,
    value,
    onValueChange,
    disabled = false
  }) => <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, {
        backgroundColor: disabled ? colors.border : colors.iconBg
      }]}>
          <Ionicons name={icon} size={wp(4.5)} color={disabled ? colors.textLight : colors.primary} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, {
          color: disabled ? colors.textLight : colors.text
        }]}>{label}</Text>
          <Text style={[styles.rowDesc, {
          color: colors.textLight
        }]}>{description}</Text>
        </View>
      </View>
      {type === 'switch' && <Switch value={value && !disabled} onValueChange={onValueChange} trackColor={{
      false: colors.switchTrackOff,
      true: disabled ? colors.textLight : colors.switchTrackOn
    }} thumbColor={value && !disabled ? colors.switchThumbOn : colors.switchThumb} ios_backgroundColor={colors.switchTrackOff} />}
    </View>, [colors]);
  const Divider = useCallback(() => <View style={[styles.divider, {
    backgroundColor: colors.border
  }]} />, [colors.border]);

  // ─── OPTION PICKER ──────────────────────────────────────────────
  const renderOptionPicker = (visible, options, selected, onSelect, onClose, title) => <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.pickerModal, {
        backgroundColor: colors.card
      }]}>
          <View style={[styles.pickerHeader, {
          borderBottomColor: colors.border
        }]}>
            <Text style={[styles.pickerTitle, {
            color: colors.text
          }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={wp(5)} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerOptions}>
            {options.map(option => <TouchableOpacity key={option} style={[styles.pickerOption, selected === option && styles.pickerOptionActive, {
            borderBottomColor: colors.border
          }]} onPress={() => {
            onSelect(option);
            onClose();
          }}>
                <Text style={[styles.pickerOptionText, selected === option && styles.pickerOptionTextActive, {
              color: colors.text
            }]}>
                  {option}
                </Text>
                {selected === option && <Ionicons name="checkmark" size={wp(4)} color={colors.primary} />}
              </TouchableOpacity>)}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>;

  // ─── BIOMETRIC MODAL ──────────────────────────────────────────────
  const renderBiometricModal = () => <Modal visible={showBiometricModal} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBiometricModal(false)}>
        <View style={[styles.modalContainer, {
        backgroundColor: colors.card
      }]}>
          <View style={[styles.modalHeader, {
          borderBottomColor: colors.border
        }]}>
            <Text style={[styles.modalTitle, {
            color: colors.text
          }]}>Enable Biometric Login</Text>
            <TouchableOpacity onPress={() => setShowBiometricModal(false)}>
              <Ionicons name="close" size={wp(5)} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.biometricIconContainer}>
              <View style={[styles.biometricIconCircle, {
              backgroundColor: colors.iconBg
            }]}>
                <Ionicons name="finger-print" size={wp(15)} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.biometricTitle, {
            color: colors.text
          }]}>Use Fingerprint to Login</Text>
            <Text style={[styles.biometricDesc, {
            color: colors.textSecondary
          }]}>
              Secure your account with biometric authentication.
            </Text>
            <TouchableOpacity style={[styles.modalSubmitBtn, isBiometricLoading && styles.modalSubmitDisabled]} onPress={handleBiometricSetup} disabled={isBiometricLoading}>
              <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.modalSubmitGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Ionicons name="finger-print" size={wp(4)} color={COLORS.white} />
                <Text style={styles.modalSubmitText}>
                  {isBiometricLoading ? 'Setting up...' : 'Enable Fingerprint Login'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>;

  // ─── LOADING STATE ──────────────────────────────────────────────
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  return <View style={[styles.container, {
    backgroundColor: colors.background
  }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#121212' : '#F4F7FC'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {/* ─── HEADER - SCROLLABLE (like DoctorPortalScreen) ──────── */}
        <View style={[styles.header, {
        backgroundColor: colors.background
      }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={26} color={colors.primary} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: colors.text }} numberOfLines={1}>Settings</Text>

          <View style={styles.iconBtn} />
        </View>

        {/* ─── APPEARANCE ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Appearance</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            <SettingItem icon={isDarkMode ? "moon" : "sunny"} label="Dark Mode" description={isDarkMode ? "Dark theme enabled" : "Light theme enabled"} type="switch" value={isDarkMode} onValueChange={toggleDarkMode} disabled={false} />
          </View>
        </View>

        {/* ─── SECURITY ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Security</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            <SettingItem icon="finger-print" label="Biometric Login" description={biometricEnabled ? "Fingerprint login enabled" : "Enable fingerprint login"} type="switch" value={biometricEnabled} onValueChange={handleBiometric} disabled={false} />
          </View>
        </View>

        {/* ─── NOTIFICATIONS ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Notifications</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            <SettingItem icon="notifications-outline" label="Push Notifications" description="Master toggle for all notifications" type="switch" value={notificationsEnabled} onValueChange={toggleNotifications} disabled={false} />
            <Divider />
            <SettingItem icon="calendar-outline" label="Appointment Reminders" description="Get reminders for upcoming appointments" type="switch" value={appointmentReminders} onValueChange={toggleAppointmentReminders} disabled={!notificationsEnabled} />
            <Divider />
            <SettingItem icon="people-outline" label="Queue Updates" description="Patient arrival and queue status alerts" type="switch" value={queueUpdates} onValueChange={toggleQueueUpdates} disabled={!notificationsEnabled} />
          </View>
        </View>

        {/* ─── CLINICAL PREFERENCES ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Clinical Preferences</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            
            <TouchableOpacity style={styles.row} onPress={() => setShowDurationPicker(true)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, {
                backgroundColor: colors.iconBg
              }]}>
                  <Ionicons name="time-outline" size={wp(4.5)} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, {
                  color: colors.text
                }]}>Consultation Duration</Text>
                  <Text style={[styles.rowDesc, {
                  color: colors.textLight
                }]}>{consultationDuration} minutes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={wp(4)} color={colors.textLight} />
            </TouchableOpacity>

            <Divider />

            <TouchableOpacity style={styles.row} onPress={() => setShowTemplatePicker(true)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, {
                backgroundColor: colors.iconBg
              }]}>
                  <Ionicons name="document-text-outline" size={wp(4.5)} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, {
                  color: colors.text
                }]}>Notes Template</Text>
                  <Text style={[styles.rowDesc, {
                  color: colors.textLight
                }]}>{notesTemplate}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={wp(4)} color={colors.textLight} />
            </TouchableOpacity>

            <Divider />

            <SettingItem icon="save-outline" label="Auto Save Notes" description="Automatically save consultation notes" type="switch" value={autoSaveNotes} onValueChange={setAutoSaveNotes} disabled={false} />

            <Divider />

            <TouchableOpacity style={[styles.saveButton]} onPress={saveClinicalPreferences} disabled={saving} activeOpacity={0.7}>
              <LinearGradient colors={[colors.primary, colors.tealDark || colors.primary]} style={styles.saveGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Ionicons name="save-outline" size={wp(3.5)} color={COLORS.white} />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── AVAILABILITY ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Doctor Availability</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            <SettingItem icon="checkmark-circle-outline" label="Available Today" description={isAvailable ? "You are available for consultations" : "You are currently unavailable"} type="switch" value={isAvailable} onValueChange={toggleAvailable} disabled={false} />
            <Divider />
            <SettingItem icon="alert-circle-outline" label="Accept Emergency Cases" description={acceptEmergency ? "Emergency cases accepted" : "Emergency cases not accepted"} type="switch" value={acceptEmergency} onValueChange={setAcceptEmergency} disabled={!isAvailable} />
            <Divider />
            <TouchableOpacity style={[styles.saveButton]} onPress={saveAvailability} disabled={saving} activeOpacity={0.7}>
              <LinearGradient colors={[colors.primary, colors.tealDark || colors.primary]} style={styles.saveGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Ionicons name="save-outline" size={wp(3.5)} color={COLORS.white} />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Updating...' : 'Update Status'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── LEGAL ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: colors.textSecondary
        }]}>Legal</Text>
          <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}>
            <TouchableOpacity style={styles.row} onPress={handlePrivacy} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, {
                backgroundColor: colors.iconBg
              }]}>
                  <Ionicons name="shield-outline" size={wp(4.5)} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, {
                  color: colors.text
                }]}>Privacy Policy</Text>
                  <Text style={[styles.rowDesc, {
                  color: colors.textLight
                }]}>How we protect your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={wp(4)} color={colors.textLight} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, {
            backgroundColor: colors.border
          }]} />
            <TouchableOpacity style={styles.row} onPress={handleTerms} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, {
                backgroundColor: colors.iconBg
              }]}>
                  <Ionicons name="document-text-outline" size={wp(4.5)} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, {
                  color: colors.text
                }]}>Terms & Conditions</Text>
                  <Text style={[styles.rowDesc, {
                  color: colors.textLight
                }]}>Rules for using SehatLine</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={wp(4)} color={colors.textLight} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, {
            backgroundColor: colors.border
          }]} />
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('DoctorReport')} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, {
                backgroundColor: colors.iconBg
              }]}>
                  <Ionicons name="megaphone-outline" size={wp(4.5)} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, {
                  color: colors.text
                }]}>Report to Admin</Text>
                  <Text style={[styles.rowDesc, {
                  color: colors.textLight
                }]}>Send a note to the administration</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={wp(4)} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout moved to the Doctor Profile screen. */}

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <View style={[styles.footer, {
        borderTopColor: colors.border
      }]}>
          <Text style={[styles.footerText, {
          color: colors.textLight
        }]}>SehatLine v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderBiometricModal()}

      {renderOptionPicker(showDurationPicker, DURATION_OPTIONS, consultationDuration, setConsultationDuration, () => setShowDurationPicker(false), 'Consultation Duration')}

      {renderOptionPicker(showTemplatePicker, TEMPLATE_OPTIONS, notesTemplate, setNotesTemplate, () => setShowTemplatePicker(false), 'Notes Template')}

      {/* ─── REPORT TO ADMIN MODAL ────────────────────────────────────── */}
      <BottomSheet visible={showReportModal} onClose={() => setShowReportModal(false)} overlayStyle={styles.reportOverlay} sheetStyle={[styles.reportCard, { backgroundColor: colors.card }]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportTitle, {
              color: colors.text
            }]}>Report to Admin</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)} hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reportSub, {
            color: colors.textLight
          }]}>Write your message. It will be sent to the hospital administration.</Text>
            <TextInput style={[styles.reportInput, {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface || '#F4F7FC'
          }]} placeholder="Type your report or concern…" placeholderTextColor={colors.textLight} value={reportText} onChangeText={setReportText} multiline textAlignVertical="top" maxLength={2000} />
            <TouchableOpacity style={styles.reportSendBtn} activeOpacity={0.85} onPress={submitReport} disabled={reportSending}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }} style={styles.reportSendGradient}>
                {reportSending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.reportSendText}>Send Report</Text>}
              </LinearGradient>
            </TouchableOpacity>
      </BottomSheet>
    </View>;
};

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: wp(3.5)
  },
  // ── Header - SCROLLABLE (like DoctorPortalScreen) ──────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18
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
    letterSpacing: 0.4
  },
  brandAccent: {
    fontWeight: '800'
  },
  tagline: {
    fontSize: 11,
    marginTop: 2
  },
  // ── Scroll ──────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 20
  },
  // ── Section ────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden'
  },
  // ── Row ────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 14
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  reportCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: wp(5),
    paddingBottom: hp(3)
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6)
  },
  reportTitle: {
    fontSize: wp(4.5),
    fontWeight: '700'
  },
  reportSub: {
    fontSize: wp(3.2),
    marginBottom: hp(1.5)
  },
  reportInput: {
    minHeight: hp(16),
    borderWidth: 1,
    borderRadius: wp(3),
    padding: wp(3.5),
    fontSize: wp(3.6)
  },
  reportSendBtn: {
    marginTop: hp(2),
    borderRadius: wp(3),
    overflow: 'hidden'
  },
  reportSendGradient: {
    paddingVertical: hp(1.7),
    alignItems: 'center'
  },
  reportSendText: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: '700'
  },
  rowDisabled: {
    opacity: 0.5
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  rowContent: {
    flex: 1
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  rowDesc: {
    fontSize: 10,
    marginTop: 1
  },
  divider: {
    height: 1,
    marginHorizontal: 14
  },
  // ── Save Button ────────────────────────────────────────────────
  saveButton: {
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 10,
    overflow: 'hidden'
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600'
  },
  // ── Logout ──────────────────────────────────────────────────────
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    marginHorizontal: 20
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500'
  },
  // ─── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: width * 0.92,
    borderRadius: 16,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  modalBody: {
    padding: 16
  },
  modalSubmitBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8
  },
  modalSubmitDisabled: {
    opacity: 0.6
  },
  modalSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8
  },
  modalSubmitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600'
  },
  // ─── Biometric ──────────────────────────────────────────────────
  biometricIconContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  biometricIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4
  },
  biometricDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  // ─── Picker Modal ──────────────────────────────────────────────
  pickerModal: {
    width: width * 0.88,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: height * 0.6
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  pickerOptions: {
    paddingVertical: 4
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primary + '05'
  },
  pickerOptionText: {
    fontSize: 13
  },
  pickerOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600'
  }
});
export default DoctorSettingsScreen;