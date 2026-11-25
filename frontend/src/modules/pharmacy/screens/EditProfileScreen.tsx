import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import GradientHeader from "../components/common/GradientHeader";
import { useProfile } from "../context/profileContext";
import Colors from "../constants/colors";
import pharmacyService from "../services/pharmacyService";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function EditProfileScreen() {

  const navigation = useNavigation<any>();
  const { profile, updateProfile } = useProfile();
  const { theme } = useTheme();
  const [profileImage, setProfileImage] = useState(profile.profileImage);
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [department, setDepartment] = useState(profile.department);
  const [shift, setShift] = useState(profile.shift);
  const [hospital, setHospital] = useState(profile.hospital);
  const [counterNumber, setCounterNumber] = useState(profile.counterNumber);
  const [saving, setSaving] = useState(false);


    const pickImage = async () => {

  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    pharmAlert(
      "Permission Required",
      "Please allow gallery access."
    );
    return;
  }

  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

  if (!result.canceled) {
    const a = result.assets[0];
    // Store a data-URI so the photo persists to the backend and renders anywhere.
    setProfileImage(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
  }
};

  const saveProfile = async () => {
    if (!fullName || !email || !phone) {
      pharmAlert("Error", "Please fill name, email and phone.");
      return;
    }
    setSaving(true);
    try {
      await pharmacyService.updateProfile({
        name: fullName,
        phone,
        department,
        shift,
        hospital,
        counterNumber,
        ...(profileImage ? { profilePic: profileImage } : {}),
      });
      updateProfile({ fullName, email, phone, department, shift, hospital, counterNumber, profileImage });
      pharmAlert("Success", "Profile updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      // Still keep the local copy so the UI reflects the change offline.
      updateProfile({ fullName, email, phone, department, shift, hospital, counterNumber, profileImage });
      pharmAlert("Saved locally", e?.message || "Could not reach the server; saved on this device.");
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
        title="Edit Profile"
        subtitle="Update your information"
      />

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.imageSection}>

  <TouchableOpacity
    style={styles.avatar}
    onPress={pickImage}
  >

    {profileImage ? (

      <Image
        source={{ uri: profileImage }}
        style={styles.image}
      />

    ) : (

      <Ionicons
        name="person"
        size={70}
        color="#FFFFFF"
      />

    )}

  </TouchableOpacity>

  <TouchableOpacity
    onPress={pickImage}
  >
    <Text style={[styles.changePhoto, { color: theme.colors.text }]}>
      Change Profile Picture
    </Text>
  </TouchableOpacity>

</View>
<Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Full Name</Text>

        <TextInput
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Email</Text>

        <TextInput
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

       <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Phone Number</Text>

        <TextInput
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>Department</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Pharmacy"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>Shift</Text>
        <View
          style={[
            styles.input,
            styles.readonlyField,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>8:00 AM – 2:00 PM</Text>
          <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
          The pharmacy shift is fixed and cannot be changed.
        </Text>

        <Text style={[styles.label, { color: theme.colors.text }]}>Hospital</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={hospital}
          onChangeText={setHospital}
          placeholder="e.g. CDA Hospital"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>Counter Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={counterNumber}
          onChangeText={setCounterNumber}
          placeholder="e.g. 3 — patients you serve are sent to this counter"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="number-pad"
        />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
          When you serve a patient, they're automatically directed to this counter.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
            {saving ? "Saving..." : "Save Changes"}
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
    marginBottom: 8,
    marginTop: 15,
   
  },

  input: {

    borderRadius: 12,
    paddingHorizontal: 16,
    height: 55,
    elevation: 2,
  },
  readonlyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    elevation: 0,
  },
  imageSection: {
  alignItems: "center",
  marginBottom: 25,
},

avatar: {
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: Colors.primary,
  justifyContent: "center",
  alignItems: "center",
},

changePhotoBase: {},

image: {
  width: 120,
  height: 120,
  borderRadius: 60,
},

changePhoto: {
  marginTop: 12,

  fontWeight: "700",
  fontSize: 15,
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