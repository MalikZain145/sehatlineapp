// Admin → Settings. Change password (admin can change it later) + logout.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, ActivityIndicator, KeyboardAvoidingView, Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import BiometricSheet from '../../../components/ui/BiometricSheet';
import settingsService from '../../patient/services/settingsService';
import { APP_VERSION } from '../../../constants/version';
import adminService from '../services/adminService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function AdminSettingsScreen({ navigation }) {
  const { colors: COLORS, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(COLORS);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsService.getSettings();
        setBiometricEnabled(!!res?.settings?.biometricEnabled);
      } catch (e) { /* offline */ }
    })();
  }, []);

  // Enabling needs the password + a live fingerprint (opens the sheet);
  // disabling is a single call. The /auth/settings endpoints are role-agnostic,
  // so the admin enrols the same way patients/doctors/pharmacists do.
  const onBiometricToggle = useCallback((value) => {
    if (value) { setShowBiometric(true); return; }
    settingsService.setBiometric({ enabled: false })
      .then(() => setBiometricEnabled(false))
      .catch(() => showInfo({ title: 'Could not disable', message: 'Please try again in a moment.', icon: 'alert-circle' }));
  }, []);

  const changePassword = async () => {
    if (next.length < 6) { showInfo({ title: 'Weak Password', message: 'New password must be at least 6 characters.', icon: 'alert-circle' }); return; }
    if (next !== confirm) { showInfo({ title: 'Mismatch', message: 'New passwords do not match.', icon: 'alert-circle' }); return; }
    setSaving(true);
    try {
      await adminService.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      showInfo({ title: 'Done', message: 'Password changed successfully.', icon: 'checkmark-circle' });
    } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not change password.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const logout = () => {
    showConfirm({
      title: 'Logout', message: 'Log out of the admin portal?', confirmLabel: 'Logout', destructive: true, icon: 'log-out-outline',
      onConfirm: async () => {
        try { await AsyncStorage.multiRemove(['user', 'userData', 'isLoggedIn', 'userRole', '@sehatline_userData', '@sehatline_token']); } catch (e) {}
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      },
    });
  };

  const field = (label, value, setter) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setter} secureTextEntry autoCapitalize="none" placeholder="••••••" placeholderTextColor={COLORS.textLight} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text }}>Settings</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { marginBottom: 14 }]}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIcon}><Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={COLORS.primary} /></View>
                <View>
                  <Text style={styles.prefLabel}>Dark Mode</Text>
                  <Text style={styles.prefSub}>{isDark ? 'On' : 'Off'} · applies across the app</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.prefRow, { marginTop: 16 }]}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIcon}><Ionicons name="finger-print" size={18} color={COLORS.primary} /></View>
                <View>
                  <Text style={styles.prefLabel}>Biometric Login</Text>
                  <Text style={styles.prefSub}>{biometricEnabled ? 'Sign in with your fingerprint' : 'Enable fingerprint sign-in'}</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={onBiometricToggle}
                trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>
            {field('Current Password', current, setCurrent)}
            {field('New Password', next, setNext)}
            {field('Confirm New Password', confirm, setConfirm)}
            <TouchableOpacity style={styles.saveBtn} onPress={changePassword} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGrad}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Update Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.version}>SehatLine v{APP_VERSION}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fingerprint enrolment (password → scan). Shared with patient/doctor/pharmacy. */}
      <BiometricSheet
        visible={showBiometric}
        onClose={() => setShowBiometric(false)}
        onDone={() => { setShowBiometric(false); setBiometricEnabled(true); }}
      />
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 14, paddingBottom: 12, backgroundColor: COLORS.background,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  prefLabel: { fontSize: 14.5, fontWeight: '700', color: COLORS.text },
  prefSub: { fontSize: 11.5, color: COLORS.textLight, marginTop: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  saveBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { paddingVertical: 14, alignItems: 'center' },
  saveText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: (COLORS.danger || '#EF4444') + '55', backgroundColor: (COLORS.danger || '#EF4444') + '10' },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: COLORS.textLight, fontSize: 12, marginTop: 24 },
});
