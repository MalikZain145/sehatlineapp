import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { pharmAlert } from "../components/common/PharmAlert";
import { api } from "../../../services/apiClient";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function ChangePasswordScreen() {

  const navigation = useNavigation<any>();
const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);

  // BUG FIX: this screen used to show "Password changed successfully" WITHOUT
  // calling the server — the password never changed. Now it really updates it.
  const updatePassword = async () => {

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      pharmAlert(
        "Missing Information",
        "Please fill in all fields."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      pharmAlert(
        "Password Mismatch",
        "New password and confirm password do not match."
      );
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      await api.post("/auth/settings/password", { currentPassword, newPassword });
      pharmAlert("Success", "Password changed successfully.");
      navigation.goBack();
    } catch (e: any) {
      pharmAlert(
        "Could Not Change Password",
        e?.code === "NETWORK" || e?.code === "TIMEOUT"
          ? "You need an internet connection to change your password."
          : e?.message || "Please check your current password and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
   <SafeAreaView
  style={[
    styles.container,
    {
      backgroundColor: theme.colors.background,
    },
  ]}
>

      <GradientHeader
        title="Change Password"
        subtitle="Update your account password"
      />

      <ScrollView contentContainerStyle={styles.content}>

        <Text 
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>
          Current Password
        </Text>

        <TextInput
          secureTextEntry
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

       <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>
          New Password
        </Text>

        <TextInput
          secureTextEntry
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={newPassword}
          onChangeText={setNewPassword}
        />
<Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>
          Confirm Password
        </Text>

        <TextInput
          secureTextEntry
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
         style={[
  styles.button,
  {
    backgroundColor: theme.colors.primary,
  },
]}
          onPress={updatePassword}
        >
          <Text
  style={[
    styles.buttonText,
    {
      color: theme.colors.white,
    },
  ]}
>
  Update Password
</Text>
      
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
   
  },

  content: {
    padding: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    
    marginTop: 15,
    marginBottom: 8,
  },

  input: {
   
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 55,
    elevation: 2,
  },

  button: {
    marginTop: 35,
   
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },

  buttonText: {
   
    fontSize: 16,
    fontWeight: "700",
  },

});