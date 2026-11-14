// Admin → Profile. The admin's own account: display picture, name, email, and
// quick actions (change password, logout). Reached from the top-right avatar.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, Image, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import authService from '../../auth/services/authService';
import settingsService from '../../patient/services/settingsService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

export default function AdminProfileScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const [admin, setAdmin] = useState({ name: '', email: '', profilePic: '' });
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem('userData'); if (raw) { const u = JSON.parse(raw); setAdmin({ name: u.name || 'Administrator', email: u.email || '', profilePic: u.profilePic || '' }); setName(u.name || ''); } } catch (e) { /* ignore */ }
      try { const res = await authService.me(); if (res?.user) { setAdmin({ name: res.user.name || 'Administrator', email: res.user.email || '', profilePic: res.user.profilePic || '' }); setName(res.user.name || ''); } } catch (e) { /* offline */ }
    })();
  }, []);

  const persistUser = async (patch) => {
    try { const raw = await AsyncStorage.getItem('userData'); const u = raw ? JSON.parse(raw) : {}; await AsyncStorage.setItem('userData', JSON.stringify({ ...u, ...patch })); } catch (e) { /* ignore */ }
  };

  const changePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { showInfo({ title: 'Permission needed', message: 'Allow photo access to set a picture.', icon: 'image' }); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
      if (res.canceled) return;
      const a = res.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      setUploading(true);
      setAdmin((p) => ({ ...p, profilePic: uri }));
      try { await settingsService.updateProfilePic(uri); await persistUser({ profilePic: uri }); }
      catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not save photo.', icon: 'alert-circle' }); }
      finally { setUploading(false); }
    } catch (e) { setUploading(false); }
  };

  const saveName = async () => {
    const n = name.trim();
    if (!n) { showInfo({ title: 'Required', message: 'Name cannot be empty.', icon: 'alert-circle' }); return; }
    setSaving(true);
    try { await settingsService.updateProfile({ name: n }); setAdmin((p) => ({ ...p, name: n })); await persistUser({ name: n }); showInfo({ title: 'Saved', message: 'Profile updated.', icon: 'checkmark-circle' }); }
    catch (e) { showInfo({ title: 'Error', message: e?.message || 'Could not save.', icon: 'alert-circle' }); }
    finally { setSaving(false); }
  };

  const logout = () => {
    showConfirm({
      title: 'Logout', message: 'Log out of the admin portal?', confirmLabel: 'Logout', destructive: true, icon: 'log-out-outline',
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.hBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={changePhoto}>
            {admin.profilePic ? <Image source={{ uri: admin.profilePic }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{(admin.name || 'A').charAt(0).toUpperCase()}</Text>}
            <View style={styles.camBadge}>{uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={14} color="#FFF" />}</View>
          </TouchableOpacity>
          <Text style={styles.name}>{admin.name}</Text>
          {!!admin.email && <Text style={styles.email}>{admin.email}</Text>}
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.nameRow}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.textLight} />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.readonly]}><Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>{admin.email || '—'}</Text><Ionicons name="lock-closed" size={15} color={COLORS.textLight} /></View>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.75} onPress={() => navigation.navigate('AdminSettings')}>
            <View style={styles.actIcon}><Ionicons name="key-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.actLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.75} onPress={() => navigation.navigate('AdminSettings')}>
            <View style={styles.actIcon}><Ionicons name="settings-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.actLabel}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logout} activeOpacity={0.8} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 10, backgroundColor: COLORS.primary,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 45 },
  avatarText: { color: '#FFF', fontSize: 34, fontWeight: '900' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 12 },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },

  body: { paddingHorizontal: 16, marginTop: 18 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  nameRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary },
  readonly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: undefined },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13 },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB' },
  actIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  actLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, marginTop: 20, borderRadius: 14, borderWidth: 1.5, borderColor: (COLORS.danger || '#EF4444') + '55', backgroundColor: (COLORS.danger || '#EF4444') + '10' },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
