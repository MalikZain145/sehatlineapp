import React, { useState } from "react";

import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function ChangePasswordScreen({
  navigation,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrent, setShowCurrent] =
    useState(false);

  const [showNew, setShowNew] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const changePassword = () => {
    if (!currentPassword) {
      labAlert(
        "Current Password Required",
        "Please enter your current password."
      );
      return;
    }

    if (!newPassword) {
      labAlert(
        "New Password Required",
        "Please enter a new password."
      );
      return;
    }

    if (newPassword.length < 6) {
      labAlert(
        "Password Too Short",
        "Your new password must contain at least 6 characters."
      );
      return;
    }

    if (!confirmPassword) {
      labAlert(
        "Confirm Password",
        "Please confirm your new password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      labAlert(
        "Passwords Don't Match",
        "New password and confirm password must be the same."
      );
      return;
    }

    if (currentPassword === newPassword) {
      labAlert(
        "Invalid Password",
        "Your new password must be different from your current password."
      );
      return;
    }

    setSaving(true);
    laboratoryService.changePassword(currentPassword, newPassword)
      .then(() => {
        labAlert(
          "Password Changed",
          "Your password has been changed successfully.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      })
      .catch((e) => {
        labAlert("Could Not Change Password", e?.message || "Please check your current password and try again.");
      })
      .finally(() => setSaving(false));
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <GradientHeader title="Change Password" />

        {/* SECURITY ICON */}

        <View style={styles.securitySection}>
          <View
            style={[
              styles.securityIcon,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={42}
              color={colors.primary}
            />
          </View>

          <Text
            style={[
              styles.securityTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Keep Your Account Secure
          </Text>

          <Text
            style={[
              styles.securityText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Create a strong password that you
            don't use for other accounts.
          </Text>
        </View>

        {/* CURRENT PASSWORD */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          Current Password
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={
              colors.textSecondary
            }
            secureTextEntry={!showCurrent}
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />

          <TouchableOpacity
            onPress={() =>
              setShowCurrent(!showCurrent)
            }
          >
            <Ionicons
              name={
                showCurrent
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* NEW PASSWORD */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          New Password
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="key-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={
              colors.textSecondary
            }
            secureTextEntry={!showNew}
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />

          <TouchableOpacity
            onPress={() => setShowNew(!showNew)}
          >
            <Ionicons
              name={
                showNew
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* CONFIRM PASSWORD */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          Confirm New Password
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={
              colors.textSecondary
            }
            secureTextEntry={!showConfirm}
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />

          <TouchableOpacity
            onPress={() =>
              setShowConfirm(!showConfirm)
            }
          >
            <Ionicons
              name={
                showConfirm
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* PASSWORD REQUIREMENT */}

        <View
          style={[
            styles.requirementBox,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.primary}
          />

          <Text
            style={[
              styles.requirementText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Password must contain at least 6
            characters.
          </Text>
        </View>

        {/* CHANGE PASSWORD BUTTON */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={changePassword}
          style={[
            styles.changeButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="lock-open-outline"
            size={20}
            color={colors.white}
          />

          <Text
            style={[
              styles.changeButtonText,
              {
                color: colors.white,
              },
            ]}
          >
            Change Password
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
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

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  securitySection: {
    alignItems: "center",
    marginHorizontal: 30,
    marginTop: 28,
  },

  securityIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  securityTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },

  securityText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },

  inputContainer: {
    height: 52,
    marginHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 13,
    marginLeft: 10,
  },

  requirementBox: {
    marginHorizontal: 18,
    marginTop: 17,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  requirementText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },

  changeButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 22,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  changeButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});