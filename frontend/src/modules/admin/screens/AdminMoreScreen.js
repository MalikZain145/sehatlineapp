// Admin → More. The hub reached from the bottom tab bar — admin identity plus
// every secondary section (Analytics, Pharmacists, System, Reports, Ratings,
// Announcements, Settings) and Logout.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Image, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import authService from '../../auth/services/authService';
import settingsService from '../../patient/services/settingsService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const ITEMS = [
  { label: 'Analytics', desc: 'Trends, department split & KPIs', icon: 'bar-chart', route: 'AdminAnalytics' },
  { label: 'Manage Pharmacists', desc: 'Add & manage pharmacy staff', icon: 'flask', route: 'AdminPharmacists' },
  { label: 'System Monitor', desc: 'Live queues, cache & restart', icon: 'pulse', route: 'AdminSystem' },
  { label: 'Staff Reports', desc: 'Messages from doctors, pharmacy & lab', icon: 'chatbox-ellipses', route: 'AdminReports' },
  { label: 'System Ratings', desc: 'What patients think of the system', icon: 'star', route: 'AdminRatings' },
  { label: 'Announcements', desc: 'Broadcast to staff', icon: 'megaphone', route: 'AdminAnnouncements' },
  { label: 'Settings', desc: 'Theme, password & account', icon: 'settings', route: 'AdminSettings' },
];

export default function AdminMoreScreen({ navigation }) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS);
  const [admin, setAdmin] = useState({ name: 'Administrator', email: '', profilePic: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem('userData'); if (raw) { const u = JSON.parse(raw); setAdmin((a) => ({ ...a, name: u.name || 'Administrator', email: u.email || '', profilePic: u.profilePic || '' })); } } catch (e) { /* ignore */ }
      try { const res = await authService.me(); if (res?.user) setAdmin((a) => ({ ...a, name: res.user.name || a.name, email: res.user.email || a.email, profilePic: res.user.profilePic || a.profilePic })); } catch (e) { /* offline */ }
    })();
  }, []);

  const changePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { showInfo({ title: 'Permission needed', message: 'Allow photo access to set a picture.', icon: 'image' }); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
      if (res.canceled) return;
      const a = res.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      setUploading(true);
      setAdmin((prev) => ({ ...prev, profilePic: uri }));
      try {
        await settingsService.updateProfilePic(uri);
        const raw = await AsyncStorage.getItem('userData');
        if (raw) { const u = JSON.parse(raw); u.profilePic = uri; await AsyncStorage.setItem('userData', JSON.stringify(u)); }
      } catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not save photo.', icon: 'alert-circle' }); }
      finally { setUploading(false); }
    } catch (e) { setUploading(false); }
  };

  const logout = () => {
    showConfirm({
      title: 'Logout', message: 'Log out of the admin portal?',
      confirmLabel: 'Logout', cancelLabel: 'Cancel', destructive: true, icon: 'log-out-outline',
      onConfirm: async () => {
        try { await authService.logout(); } catch (e) {}
        try { await AsyncStorage.multiRemove(['user', 'userData', 'isLoggedIn', 'userRole']); } catch (e) {}
        navigation.getParent()?.reset?.({ index: 0, routes: [{ name: 'Login' }] });
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0BAA9D" translucent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={() => navigation.navigate('AdminProfile')}>
            {admin.profilePic ? <Image source={{ uri: admin.profilePic }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{(admin.name || 'A').charAt(0).toUpperCase()}</Text>}
          </TouchableOpacity>
          <Text style={styles.name}>{admin.name}</Text>
          {!!admin.email && <Text style={styles.email}>{admin.email}</Text>}
          <TouchableOpacity style={styles.editProfile} activeOpacity={0.8} onPress={() => navigation.navigate('AdminProfile')}>
            <Ionicons name="create-outline" size={13} color="#FFF" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.body}>
          {ITEMS.map((it) => (
            <TouchableOpacity key={it.route} style={styles.row} activeOpacity={0.75} onPress={() => navigation.navigate(it.route)}>
              <View style={styles.rowIcon}><Ionicons name={`${it.icon}-outline`} size={21} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowDesc}>{it.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logout} activeOpacity={0.8} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            <Text style={{ color: COLORS.primary }}>Sehat</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1E293B' }}>Line</Text>
            <Text style={{ color: COLORS.textLight }}>  ·  CDA Hospital, Islamabad</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    alignItems: 'center',
    paddingTop: (STATUS_BAR_HEIGHT + 24),
    paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 39 },
  avatarText: { color: '#FFF', fontSize: 30, fontWeight: '900' },
  camBadge: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 12 },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  editProfile: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  editProfileText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },

  body: { paddingHorizontal: 14, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rowDesc: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, marginTop: 8, borderRadius: 14, borderWidth: 1.5, borderColor: (COLORS.danger || '#EF4444') + '55', backgroundColor: (COLORS.danger || '#EF4444') + '10' },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12.5, fontWeight: '700', marginTop: 20 },
});
