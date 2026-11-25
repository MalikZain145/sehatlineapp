import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import BiometricSheet from "../../../../components/ui/BiometricSheet";
import settingsService from "../../../patient/services/settingsService";
import { APP_VERSION } from "../../../../constants/version";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function SettingsScreen({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const colors = theme.colors;

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await settingsService.getSettings();
      setBiometricEnabled(!!res?.settings?.biometricEnabled);
    } catch (e) { /* offline */ }
  }, []);

  useEffect(() => {
    load();
    const focus = navigation.addListener?.("focus", load);
    return () => focus && focus();
  }, [load, navigation]);

  // Enabling needs password + a live fingerprint (opens the sheet); disabling
  // is a single call.
  const onBiometricToggle = (value) => {
    if (value) { setShowBiometric(true); return; }
    settingsService
      .setBiometric({ enabled: false })
      .then(() => setBiometricEnabled(false))
      .catch(() => labAlert("Could not disable", "Please try again in a moment."));
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}

        <GradientHeader title="Settings" />

        {/* Appearance */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Appearance
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon={theme.dark ? "moon-outline" : "sunny-outline"}
            title="Dark Mode"
            subtitle={
              theme.dark
                ? "Dark theme is currently enabled"
                : "Light theme is currently enabled"
            }
            colors={colors}
            right={
              <Switch
                value={theme.dark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: colors.border,
                  true: colors.mint,
                }}
                thumbColor={
                  theme.dark
                    ? colors.primary
                    : colors.white
                }
              />
            }
          />
        </View>

        {/* Account */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Account
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            colors={colors}
            onPress={() =>
              navigation.navigate("EditProfile")
            }
          />

          <SettingRow
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Update your account password"
            colors={colors}
            onPress={() =>
              navigation.navigate("ChangePassword")
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Login"
            subtitle={biometricEnabled ? "Sign in with your fingerprint" : "Enable fingerprint sign-in"}
            colors={colors}
            right={
              <Switch
                value={biometricEnabled}
                onValueChange={onBiometricToggle}
                trackColor={{ false: colors.border, true: colors.mint }}
                thumbColor={biometricEnabled ? colors.primary : colors.white}
              />
            }
          />
        </View>

        {/* Support */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Support
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help using the laboratory system"
            colors={colors}
            onPress={() =>
              navigation.navigate("HelpSupport")
            }
          />

          <SettingRow
            icon="alert-circle-outline"
            title="Report a Problem"
            subtitle="Tell us about an issue"
            colors={colors}
            onPress={() =>
              navigation.navigate("ReportProblem")
            }
          />
        </View>

        {/* Legal */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Legal
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            colors={colors}
            onPress={() =>
              navigation.navigate("PrivacyPolicy")
            }
          />

          <SettingRow
            icon="document-text-outline"
            title="Terms & Conditions"
            subtitle="View terms and conditions"
            colors={colors}
            onPress={() =>
              navigation.navigate("TermsConditions")
            }
          />

          <SettingRow
            icon="information-circle-outline"
            title="About App"
            subtitle="Laboratory Management System"
            colors={colors}
            onPress={() =>
              navigation.navigate("AboutApp")
            }
          />
        </View>

        <Text
          style={[
            styles.version,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Laboratory Management System{"\n"}
          Version {APP_VERSION}
        </Text>
      </ScrollView>

      {/* Fingerprint enrolment (password → scan). Shared across modules. */}
      <BiometricSheet
        visible={showBiometric}
        onClose={() => setShowBiometric(false)}
        onDone={() => { setShowBiometric(false); setBiometricEnabled(true); }}
      />
    </View>
  );
}

/* ================= SETTING ROW ================= */

function SettingRow({
  icon,
  title,
  subtitle,
  colors,
  right,
  onPress,
}) {
  const content = (
    <>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.settingTitle,
            {
              color: colors.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.settingSubtitle,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      {right ? (
        right
      ) : (
        <Ionicons
          name="chevron-forward"
          size={19}
          color={colors.textSecondary}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.settingRow}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.settingRow}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: topPad(105),
    paddingTop: topPad(45),
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },

  card: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    elevation: 2,
  },

  settingRow: {
    minHeight: 75,
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
  },

  settingSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },

  version: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 28,
  },
});