// AdminSidebar — the admin portal's slide-in navigation drawer. Branded header,
// the signed-in admin's identity, the section menu (with the active route
// highlighted), and a sign-out action. Rendered as the drawer content.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandRow from '../../../components/BrandRow';
import authService from '../../auth/services/authService';
import { showConfirm } from '../../../components/confirm';
import { useTheme } from '../../../context/ThemeContext';

const ITEMS = [
  { route: 'AdminDashboard', label: 'Dashboard', icon: 'grid-outline' },
  { route: 'AdminSystem', label: 'System Monitor', icon: 'pulse-outline' },
  { route: 'AdminDoctors', label: 'Manage Doctors', icon: 'medkit-outline' },
  { route: 'AdminPatients', label: 'Manage Patients', icon: 'people-outline' },
  { route: 'AdminPharmacists', label: 'Manage Pharmacists', icon: 'flask-outline' },
  { route: 'AdminReports', label: 'Staff Reports', icon: 'chatbox-ellipses-outline' },
  { route: 'AdminRatings', label: 'System Ratings', icon: 'star-outline' },
  { route: 'AdminNotifications', label: 'Notifications', icon: 'notifications-outline' },
  { route: 'AdminAnnouncements', label: 'Announcements', icon: 'megaphone-outline' },
  { route: 'AdminSettings', label: 'Settings', icon: 'settings-outline' },
];

export default function AdminSidebar(props) {
  const { colors: COLORS, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(COLORS);
  const { state, navigation } = props;
  const activeRoute = state?.routeNames?.[state.index];
  const [admin, setAdmin] = useState({ name: 'Administrator', email: '' });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        if (raw) { const u = JSON.parse(raw); setAdmin({ name: u.name || 'Administrator', email: u.email || '' }); }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const logout = () => {
    showConfirm({
      title: 'Logout', message: 'Log out of the admin portal?',
      confirmLabel: 'Logout', cancelLabel: 'Cancel', destructive: true, icon: 'log-out-outline',
      onConfirm: async () => {
        try { await authService.logout(); } catch (e) {}
        try { await AsyncStorage.multiRemove(['user', 'userData', 'isLoggedIn', 'userRole']); } catch (e) {}
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Fixed (sticky) header — brand + admin identity, like the other modules */}
      <View style={[styles.brand, { paddingTop: insets.top + 22 }]}>
        <BrandRow logo light={!isDark} subtitle="Admin Portal" />
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}><Ionicons name="person" size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{admin.name}</Text>
          {!!admin.email && <Text style={styles.email} numberOfLines={1}>{admin.email}</Text>}
        </View>
      </View>

      {/* Only the menu tabs scroll */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.menu} showsVerticalScrollIndicator={false}>
        {ITEMS.map((it) => {
          const active = activeRoute === it.route;
          return (
            <TouchableOpacity
              key={it.route}
              style={[styles.item, active && styles.itemActive]}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(it.route)}
            >
              <Ionicons name={it.icon} size={20} color={COLORS.primary} />
              <Text style={[styles.itemLabel, active && { color: COLORS.primary, fontWeight: '800' }]}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom: logout (lifted off the edge) + brand footer */}
      <View style={{ paddingBottom: insets.bottom + 10 }}>
        <TouchableOpacity style={styles.logout} activeOpacity={0.8} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            <Text style={{ color: COLORS.primary }}>Sehat</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1E293B' }}>Line</Text>
          </Text>
          <Text style={styles.footerSub}>CDA Hospital, Islamabad</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  brand: { alignItems: 'center', paddingTop: 24, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  menu: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  itemActive: { backgroundColor: COLORS.primary + '12' },
  itemLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1.5, borderColor: (COLORS.danger || '#EF4444') + '55', backgroundColor: (COLORS.danger || '#EF4444') + '10' },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
  footer: { alignItems: 'center', paddingTop: 2, marginHorizontal: 16, marginTop: 2 },
  footerBrand: { fontSize: 16, fontWeight: '800', marginTop: 6, letterSpacing: 0.3 },
  footerSub: { fontSize: 11.5, color: COLORS.textLight, fontWeight: '600', marginTop: 2 },
});
