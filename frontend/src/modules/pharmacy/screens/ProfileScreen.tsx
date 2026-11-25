import React, { useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import GradientHeader from "../components/common/GradientHeader";
import { useProfile } from "../context/profileContext";
import Colors from "../constants/colors";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { profile, updateProfile } = useProfile();

  const loadProfile = useCallback(async () => {
    try {
      const res = await pharmacyService.getProfile();
      const p = res?.profile;
      if (p) {
        updateProfile({
          fullName: p.name || profile.fullName,
          email: p.email || profile.email,
          phone: p.phone || profile.phone,
          department: p.department || profile.department,
          shift: p.shift || profile.shift,
          hospital: p.hospital || profile.hospital,
          employeeId: p.employeeId || profile.employeeId,
          profileImage: p.profilePic || profile.profileImage,
        });
      }
    } catch (e) { /* offline */ }
  }, []);

  useEffect(() => {
    loadProfile();
    const unsub = navigation.addListener("focus", loadProfile);
    return () => unsub && unsub();
  }, [loadProfile, navigation]);

  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      pharmAlert("Permission Needed", "Please allow photo access to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;
    const a = result.assets[0];
    const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    updateProfile({ profileImage: uri });
    try {
      await pharmacyService.updateProfile({ profilePic: uri });
    } catch (e) { /* offline — kept locally */ }
  };

  const removePhoto = () => {
    pharmAlert("Remove Photo", "Remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          updateProfile({ profileImage: "" });
          try { await pharmacyService.updateProfile({ profilePic: "" }); } catch (e) {}
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Pharmacist Profile" subtitle="Manage your account" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar — tap to change DP */}
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatar} onPress={changePhoto} activeOpacity={0.85}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.image} />
            ) : (
              <Ionicons name="person" size={60} color="#FFFFFF" />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: theme.colors.text }]}>{profile.fullName}</Text>
          <Text style={[styles.designation, { color: theme.colors.textSecondary }]}>
            {profile.department || "Pharmacy"}
          </Text>
          {!!profile.employeeId && (
            <Text style={[styles.employee, { color: theme.colors.primary }]}>{profile.employeeId}</Text>
          )}
          <Text style={[styles.photoHint, { color: theme.colors.textSecondary }]}>Tap the photo to change it</Text>

          {!!profile.profileImage && (
            <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info (view only — edit from Settings) */}
        <InfoRow icon="person-outline" label="Full Name" value={profile.fullName} theme={theme} />
        <InfoRow icon="mail-outline" label="Email" value={profile.email} theme={theme} />
        <InfoRow icon="call-outline" label="Phone" value={profile.phone} theme={theme} />
        <InfoRow icon="business-outline" label="Department" value={profile.department} theme={theme} />
        <InfoRow icon="time-outline" label="Shift" value={profile.shift} theme={theme} />
        <InfoRow icon="location-outline" label="Hospital" value={profile.hospital} theme={theme} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, theme }: any) {
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: "center", marginBottom: 25 },
  avatar: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 15,
  },
  image: { width: 110, height: 110, borderRadius: 55 },
  cameraBadge: {
    position: "absolute", bottom: 8, right: 4, width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: "#FFFFFF",
    justifyContent: "center", alignItems: "center",
  },
  name: { fontSize: 24, fontWeight: "700" },
  designation: { marginTop: 4 },
  employee: { marginTop: 4, fontWeight: "600" },
  photoHint: { marginTop: 6, fontSize: 12 },
  removePhotoBtn: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12,
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: "#EF4444",
  },
  removePhotoText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  card: {
    borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center",
    marginBottom: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  label: { fontSize: 13 },
  value: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  settingsBtn: {
    marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14, borderWidth: 1.5,
  },
  settingsBtnText: { fontWeight: "700", fontSize: 14 },
});
