import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "../../Theme/themeContext";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

// Module-level so the TextInputs are NOT remounted on every parent render
// (an inline component would drop keyboard focus after each keystroke).
function Field({ colors, label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize, editable = true, hint }) {
  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, opacity: editable ? 1 : 0.6 }]}>
        <Ionicons name={icon} size={19} color={colors.primary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {!!hint && <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>}
    </>
  );
}

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Laboratory");
  const [counter, setCounter] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await laboratoryService.getProfile();
        const u = res?.profile;
        if (u) {
          setName(u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setDepartment(u.department || "Laboratory");
          setCounter(u.counterNumber ? String(u.counterNumber) : "");
          setPhoto(u.profilePic || "");
        }
      } catch (e) { /* offline */ }
    })();
  }, []);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        labAlert("Permission Needed", "Please allow photo access to set a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        setPhoto(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
      }
    } catch (e) {
      labAlert("Error", "Could not pick the image.");
    }
  };

  const saveProfile = () => {
    if (!name.trim()) { labAlert("Name Required", "Please enter your name."); return; }
    if (!phone.trim()) { labAlert("Phone Required", "Please enter your phone number."); return; }
    setSaving(true);
    // Email is a locked identity field. Counter number tells patients which
    // counter to come to (used in the "called to Counter X" notification).
    laboratoryService.updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      department: department.trim(),
      counterNumber: counter.trim(),
      ...(photo ? { profilePic: photo } : {}),
    })
      .then(() => {
        labAlert("Profile Updated", "Your profile has been updated successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      })
      .catch((e) => labAlert("Error", e?.message || "Could not update your profile."))
      .finally(() => setSaving(false));
  };

  const initials = (name || "L").trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader title="Edit Profile" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* PROFILE PHOTO */}
        <View style={styles.profileSection}>
          <TouchableOpacity activeOpacity={0.85} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.photoInitials}>{initials}</Text>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.profileHint, { color: colors.textSecondary }]}>Tap to change profile picture</Text>
        </View>

        <Field colors={colors} label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="Enter your name" />
        <Field colors={colors} label="Email Address" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" editable={false} hint="Email is your login identity and can’t be changed here." />
        <Field colors={colors} label="Phone Number" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" keyboardType="phone-pad" />
        <Field colors={colors} label="Counter Number" icon="grid-outline" value={counter} onChangeText={setCounter} placeholder="e.g. 3" hint="Patients are told which counter to come to (e.g. “called to Counter 3”)." />
        <Field colors={colors} label="Department" icon="business-outline" value={department} onChangeText={setDepartment} placeholder="Laboratory" />

        <TouchableOpacity activeOpacity={0.85} onPress={saveProfile} disabled={saving} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { paddingBottom: 160 },

  profileSection: { alignItems: "center", marginTop: 18, marginBottom: 6 },
  photo: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoInitials: { color: "#FFFFFF", fontSize: 36, fontWeight: "800" },
  cameraBadge: { position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  profileHint: { fontSize: 11.5, marginTop: 10 },

  label: { fontSize: 13, fontWeight: "800", marginHorizontal: 20, marginTop: 18, marginBottom: 8 },
  inputContainer: { height: 52, marginHorizontal: 18, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, fontSize: 13, marginLeft: 10 },
  hint: { fontSize: 11, marginHorizontal: 22, marginTop: 6, lineHeight: 15 },

  saveButton: { height: 52, marginHorizontal: 18, marginTop: 28, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
