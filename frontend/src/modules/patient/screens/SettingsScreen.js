// SettingsScreen — account, security and app preferences. Nothing else.
//
// Booking, tokens and reports don't belong here: they're tasks, and the home
// screen already surfaces them. Settings is where you change how the app
// behaves, not what you do with it.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, StatusBar, Platform, ActivityIndicator, Share } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import settingsService from '../services/settingsService';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import ChangePasswordSheet from '../../../components/ui/ChangePasswordSheet';
import BiometricSheet from '../../../components/ui/BiometricSheet';
import { useSession } from '../../../context/SessionContext';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
export default function SettingsScreen({
  navigation
}) {
  const {
    colors: COLORS,
    isDark,
    setDark
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const {
    logout
  } = useSession();
  const [loading, setLoading] = useMinLoading(true);
  const [prefs, setPrefs] = useState({
    notifications: true,
    autoSync: true
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [account, setAccount] = useState({
    name: '',
    email: '',
    isVerified: false,
    profilePic: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [prompt, setPrompt] = useState(null); // { title, message, variant, ... }

  const load = useCallback(async () => {
    try {
      const res = await settingsService.getSettings();
      const s = res?.settings;
      if (s) {
        setPrefs({
          notifications: s.preferences?.notifications ?? true,
          autoSync: s.preferences?.autoSync ?? true
        });
        setBiometricEnabled(!!s.biometricEnabled);
        setAccount({
          name: s.name || '',
          email: s.email || '',
          isVerified: !!s.isVerified,
          profilePic: s.profilePic || ''
        });
      }
    } catch (e) {
      // Offline — leave the defaults in place.
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => focus && focus();
  }, [load, navigation]);

  // Preferences write straight through; a failed sync shouldn't block the UI.
  const togglePref = (key, value) => {
    setPrefs(p => ({
      ...p,
      [key]: value
    }));
    settingsService.updatePreferences({
      [key]: value
    }).catch(() => {
      setPrefs(p => ({
        ...p,
        [key]: !value
      })); // roll back
      setPrompt({
        variant: 'error',
        title: 'Could not save',
        message: 'We could not reach the server. Please check your connection.'
      });
    });
  };

  // Biometric is the one preference that can't be toggled blind — enabling it
  // needs the password and a live fingerprint, so it opens a sheet.
  const onBiometricToggle = value => {
    if (value) {
      setShowBiometric(true);
      return;
    }
    settingsService.setBiometric({
      enabled: false
    }).then(() => setBiometricEnabled(false)).catch(() => setPrompt({
      variant: 'error',
      title: 'Could not disable',
      message: 'Please try again in a moment.'
    }));
  };
  const shareApp = async () => {
    try {
      await Share.share({
        message: 'SehatLine — skip the queue at CDA Hospital, Islamabad. Book, track and collect, all from your phone.'
      });
    } catch (e) {/* user dismissed */}
  };
  const confirmLogout = () => setPrompt({
    variant: 'warning',
    icon: 'log-out-outline',
    title: 'Sign out?',
    message: 'You will need to sign in again to view your tokens and appointments.',
    primaryLabel: 'Sign Out',
    destructive: true,
    onPrimary: () => {
      setPrompt(null);
      logout('manual');
    },
    secondaryLabel: 'Cancel'
  });
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />

      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Account */}
        <TouchableOpacity style={styles.accountCard} activeOpacity={0.85} onPress={() => navigation.navigate('ProfileScreen')}>
          {account.profilePic ? <Image source={{
          uri: account.profilePic
        }} style={styles.accountAvatar} /> : <View style={[styles.accountAvatar, styles.accountAvatarFallback]}>
              <Text style={styles.accountInitial}>{(account.name || 'P').charAt(0).toUpperCase()}</Text>
            </View>}
          <View style={styles.accountInfo}>
            <View style={styles.accountNameRow}>
              <Text style={styles.accountName} numberOfLines={1}>{account.name || 'Patient'}</Text>
              {account.isVerified && <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} />}
            </View>
            <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Security & Privacy */}
        <Section title="Security & Privacy">
          <Row icon="key-outline" title="Change Password" subtitle="Signs out your other devices" onPress={() => setShowPassword(true)} />
          <Row icon="finger-print-outline" title="Biometric Login" subtitle={biometricEnabled ? 'Enabled — sign in with your fingerprint' : 'Sign in with your fingerprint'} right={<Switch value={biometricEnabled} onValueChange={onBiometricToggle} trackColor={{
          false: '#E5E7EB',
          true: COLORS.mint
        }} thumbColor={biometricEnabled ? COLORS.primary : '#F9FAFB'} />} />
          <Row icon="shield-checkmark-outline" title="Privacy & Data" subtitle="What we store and why" onPress={() => navigation.navigate('PrivacyScreen')} />
          <Row icon="person-remove-outline" title="Account & Ownership" subtitle="Deactivate or delete your account" onPress={() => navigation.navigate('AccountOwnershipScreen')} last />
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row icon="moon-outline" title="Dark Mode" subtitle={isDark ? 'On — easier on the eyes at night' : 'Off — bright theme'} right={<Switch value={isDark} onValueChange={setDark} trackColor={{
          false: '#E5E7EB',
          true: COLORS.mint
        }} thumbColor={isDark ? COLORS.primary : '#F9FAFB'} />} />
          <Row icon="notifications-outline" title="Notifications" subtitle="Queue updates and health tips" right={<Switch value={prefs.notifications} onValueChange={v => togglePref('notifications', v)} trackColor={{
          false: '#E5E7EB',
          true: COLORS.mint
        }} thumbColor={prefs.notifications ? COLORS.primary : '#F9FAFB'} />} />
          <Row icon="sync-outline" title="Auto Sync" subtitle="Keep your records up to date in the background" right={<Switch value={prefs.autoSync} onValueChange={v => togglePref('autoSync', v)} trackColor={{
          false: '#E5E7EB',
          true: COLORS.mint
        }} thumbColor={prefs.autoSync ? COLORS.primary : '#F9FAFB'} />} last />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Row icon="help-circle-outline" title="Help & Support" onPress={() => navigation.navigate('HelpSupportScreen')} />
          <Row icon="chatbox-ellipses-outline" title="Send Feedback" onPress={() => navigation.navigate('FeedbackScreen')} />
          <Row icon="document-text-outline" title="Terms & Policies" onPress={() => navigation.navigate('PoliciesScreen')} />
          <Row icon="share-social-outline" title="Share SehatLine" onPress={shareApp} last />
        </Section>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOut} onPress={confirmLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={19} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>SehatLine v{APP_VERSION}</Text>
        <Text style={styles.versionSub}>CDA Hospital • Islamabad</Text>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>

      {/* Sheets */}
      <ChangePasswordSheet visible={showPassword} onClose={() => setShowPassword(false)} onDone={() => {
      setShowPassword(false);
      setPrompt({
        variant: 'success',
        title: 'Password Updated',
        message: 'Your other devices have been signed out.'
      });
    }} />

      <BiometricSheet visible={showBiometric} onClose={() => setShowBiometric(false)} onDone={() => {
      setShowBiometric(false);
      setBiometricEnabled(true);
      setPrompt({
        variant: 'success',
        title: 'Biometric Enabled',
        message: 'You can now sign in with your fingerprint.'
      });
    }} />

      <ThemedPrompt visible={!!prompt} variant={prompt?.variant} icon={prompt?.icon} title={prompt?.title} message={prompt?.message} primaryLabel={prompt?.primaryLabel || 'OK'} destructive={prompt?.destructive} onPrimary={prompt?.onPrimary || (() => setPrompt(null))} secondaryLabel={prompt?.secondaryLabel} onSecondary={() => setPrompt(null)} />
    </View>;
}
const HIT = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12
};
function Section({
  title,
  children
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>;
}
function Row({
  icon,
  title,
  subtitle,
  right,
  onPress,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const Wrapper = onPress ? TouchableOpacity : View;
  return <Wrapper style={[styles.row, !last && styles.rowDivider]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right || (onPress ? <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} /> : null)}
    </Wrapper>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card
  },
  scroll: {
    padding: 16
  },
  // ---- Account ----
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 22
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  accountAvatarFallback: {
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  accountInitial: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary
  },
  accountInfo: {
    flex: 1
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  accountName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1
  },
  accountEmail: {
    fontSize: 12.5,
    color: COLORS.textLight,
    marginTop: 2
  },
  // ---- Sections ----
  section: {
    marginBottom: 22
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 9,
    marginLeft: 4
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 14
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowText: {
    flex: 1
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.text
  },
  rowSubtitle: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 2
  },
  // ---- Sign out ----
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 15,
    marginTop: 4
  },
  signOutText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 14.5
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 22,
    fontWeight: '600'
  },
  versionSub: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3
  }
});