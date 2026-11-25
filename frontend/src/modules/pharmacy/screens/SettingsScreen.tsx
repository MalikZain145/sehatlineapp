import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import GradientHeader from "../components/common/GradientHeader";
import SettingItem from "../components/settings/SettingsItem";
import { useTheme } from "../Theme/themeContext";
import BiometricSheet from "../../../components/ui/BiometricSheet";
import settingsService from "../../patient/services/settingsService";
import { loadNotificationPref, setNotificationsEnabled } from "../../../services/notifications";
import { APP_VERSION } from "../../../constants/version";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useMinLoading(true);
  useEffect(() => { setLoading(false); }, []);

  const [notifications, setNotifications] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  const load = useCallback(async () => {
    // Notification preference (local push gate).
    try {
      const on = await loadNotificationPref();
      setNotifications(on);
    } catch (e) {}
    // Biometric status from the account.
    try {
      const res = await settingsService.getSettings();
      setBiometricEnabled(!!res?.settings?.biometricEnabled);
    } catch (e) {}
  }, []);

  useEffect(() => {
    load();
    const focus = navigation.addListener?.("focus", load);
    return () => focus && focus();
  }, [load, navigation]);

  // Notifications on/off — persists and gates every local push from the app.
  const onNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    try {
      await setNotificationsEnabled(value);
    } catch (e) {
      setNotifications(!value); // roll back
      pharmAlert("Could not save", "Please try again in a moment.");
    }
  };

  // Enabling biometric needs the password + a live fingerprint, so it opens a
  // sheet. Disabling is a single call.
  const onBiometricToggle = (value: boolean) => {
    if (value) {
      setShowBiometric(true);
      return;
    }
    settingsService
      .setBiometric({ enabled: false })
      .then(() => setBiometricEnabled(false))
      .catch(() => pharmAlert("Could not disable", "Please try again in a moment."));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Settings" subtitle="Manage application preferences" />

      {loading ? <SkeletonList count={6} dark={theme.dark} /> : <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.heading, { color: theme.colors.text }]}>Preferences</Text>

        <SettingItem
          icon="moon-outline"
          title="Dark Mode"
          subtitle="Switch app appearance"
          showSwitch
          switchValue={theme.dark}
          onSwitchChange={toggleTheme}
        />

        <SettingItem
          icon="notifications-outline"
          title="Notifications"
          subtitle={notifications ? "Push alerts are on" : "Push alerts are off"}
          showSwitch
          switchValue={notifications}
          onSwitchChange={onNotificationsToggle}
        />

        <Text style={[styles.heading, { color: theme.colors.text }]}>Account</Text>

        <SettingItem
          icon="person-outline"
          title="Edit Profile"
          subtitle="Update your details & photo"
          onPress={() => navigation.navigate("EditProfile")}
        />

        <SettingItem
          icon="lock-closed-outline"
          title="Change Password"
          subtitle="Update your account password"
          onPress={() => navigation.navigate("ChangePassword")}
        />

        <SettingItem
          icon="finger-print-outline"
          title="Biometric Login"
          subtitle={biometricEnabled ? "Sign in with your fingerprint" : "Enable fingerprint sign-in"}
          showSwitch
          switchValue={biometricEnabled}
          onSwitchChange={onBiometricToggle}
        />

        <Text style={[styles.heading, { color: theme.colors.text }]}>Support</Text>

        <SettingItem
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="FAQs and contact support"
          onPress={() => navigation.navigate("HelpSupport")}
        />

        <SettingItem
          icon="flag-outline"
          title="Report to Admin"
          subtitle="Send a message to hospital administration"
          onPress={() => navigation.navigate("ReportAdmin")}
        />

        <View style={styles.footer}>
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
            Version {APP_VERSION}
          </Text>
        </View>
      </ScrollView>}

      {/* Fingerprint enrolment (password → scan). Shared with patient/doctor. */}
      <BiometricSheet
        visible={showBiometric}
        onClose={() => setShowBiometric(false)}
        onDone={() => {
          setShowBiometric(false);
          setBiometricEnabled(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12, marginTop: 20 },
  footer: { alignItems: "center", marginTop: 35 },
  version: { fontSize: 14 },
});
