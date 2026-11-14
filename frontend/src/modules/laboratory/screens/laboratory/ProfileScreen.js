import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import * as ImagePicker from "expo-image-picker";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';

  
export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
 const [profileImage, setProfileImage] = useState(null);


  const pickProfileImage = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      labAlert(
        "Permission Required",
        "Please allow photo library access to choose a profile picture."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

    if (result.canceled) {
      return;
    }

    const a = result.assets?.[0];
    const imageUri = a?.base64 ? `data:image/jpeg;base64,${a.base64}` : a?.uri;

    if (imageUri) {
      setProfileImage(imageUri);
      // Persist it so it also shows in the side menu and everywhere else.
      try {
        await laboratoryService.updateProfile({ profilePic: imageUri });
        labAlert("Photo Updated", "Your profile picture has been updated.");
      } catch (e) {
        labAlert("Error", "Could not save the photo. Please try again.");
      }
    }
  } catch (error) {
    console.log("Profile image error:", error);

    labAlert(
      "Error",
      "Unable to select profile picture."
    );
  }
};

  const [profile, setProfile] = useState({
    name: "Laboratory",
    role: "Laboratorist",
    employeeId: "—",
    department: "Laboratory Department",
    email: "",
    phone: "",
    counterNumber: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await laboratoryService.getProfile();
        const u = res?.profile;
        if (u) {
          setProfile({
            name: u.name || "Laboratory",
            role: "Laboratorist",
            employeeId: u.employeeId || "—",
            department: u.department || "Laboratory Department",
            email: u.email || "",
            phone: u.phone || "",
            counterNumber: u.counterNumber ? String(u.counterNumber) : "",
          });
          if (u.profilePic) setProfileImage(u.profilePic);
        }
      } catch (e) { /* offline */ }
    })();
  }, []);

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
      {/* HEADER */}

<GradientHeader title="Profile" />

{/* PROFILE SECTION */}

<View style={styles.profileSection}>

  {/* PROFILE PICTURE */}

  <TouchableOpacity
    activeOpacity={0.8}
    onPress={pickProfileImage}
    style={styles.profileImageWrapper}
  >
    {profileImage ? (
      <Image
        source={{ uri: profileImage }}
        style={styles.profileImage}
      />
    ) : (
      <View
        style={[
          styles.profileImage,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name="person"
          size={42}
          color={colors.primary}
        />
      </View>
    )}

    {/* CAMERA ICON */}

    <View
      style={[
        styles.cameraButton,
        {
          backgroundColor: colors.primary,
          borderColor: colors.surface,
        },
      ]}
    >
      <Ionicons
        name="camera"
        size={15}
        color={colors.white}
      />
    </View>
  </TouchableOpacity>

  {/* PROFILE INFORMATION */}

  <View style={styles.profileInfo}>
    <Text
      style={[
        styles.profileName,
        {
          color: colors.text,
        },
      ]}
      numberOfLines={1}
    >
      {profile.name}
    </Text>

    <Text
      style={[
        styles.profileRole,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Laboratorist{profile.counterNumber ? ` · Counter ${profile.counterNumber}` : ""}
    </Text>
  </View>

  {/* EDIT PROFILE ICON */}

  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() =>
      navigation.navigate("EditProfile")
    }
    style={[
      styles.editIconButton,
      {
        backgroundColor: colors.mint,
      },
    ]}
  >
    <Ionicons
      name="create-outline"
      size={20}
      color={colors.primary}
    />
  </TouchableOpacity>

</View>
        {/* Personal Information */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Personal Information
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <InfoRow
            icon="person-outline"
            label="Full Name"
            value={profile.name}
            colors={colors}
          />

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={profile.email}
            colors={colors}
          />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={profile.phone}
            colors={colors}
          />

          <InfoRow
            icon="business-outline"
            label="Department"
            value={profile.department}
            colors={colors}
            last
          />
        </View>

        {/* Work Information */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Work Information
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <InfoRow
            icon="card-outline"
            label="Employee ID"
            value={profile.employeeId}
            colors={colors}
          />

          <InfoRow
            icon="grid-outline"
            label="Counter Number"
            value={profile.counterNumber ? `Counter ${profile.counterNumber}` : "Not set — tap Edit to add"}
            colors={colors}
          />

          <InfoRow
            icon="flask-outline"
            label="Department"
            value="Laboratory"
            colors={colors}
          />

          <InfoRow
            icon="shield-checkmark-outline"
            label="Access Level"
            value="Laboratory Staff"
            colors={colors}
            last
          />
        </View>


        {/* Change Password */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("ChangePassword")
          }
          style={[
            styles.passwordButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.passwordButtonText,
              {
                color: colors.primary,
              },
            ]}
          >
            Change Password
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.footer,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Laboratory Management System{"\n"}
          CDA Hospital Islamabad
        </Text>
      </ScrollView>
    </View>
  );
}

/* ================= INFO ROW ================= */

function InfoRow({
  icon,
  label,
  value,
  colors,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoText}>
        <Text
          style={[
            styles.infoLabel,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color: colors.text,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingBottom: 40,
  },

  header: {
  height: topPad(105),
  paddingTop: topPad(45),
  paddingHorizontal: 10,
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
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "800",
  marginLeft: 4,
},

headerSpacer: {
  flex: 1,
},

  profileHeader: {
  marginHorizontal: 18,
  marginTop: 20,
  padding: 16,
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "center",
},

profileImageContainer: {
  alignItems: "center",
  justifyContent: "center",
},

profileImage: {
  width: 76,
  height: 76,
  borderRadius: 38,
  alignItems: "center",
  justifyContent: "center",
},

profileInfo: {
  flex: 1,
  marginLeft: 14,
},

profileName: {
  fontSize: 17,
  fontWeight: "800",
},

profileRole: {
  fontSize: 11,
  marginTop: 4,
},

editIconButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
},
 
  profileCard: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 18,
    elevation: 3,
  },

  avatar: {
    width: 85,
    height: 85,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 14,
  },

  role: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },

  departmentBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  departmentText: {
    fontSize: 11,
    fontWeight: "700",
  },

  profileImageWrapper: {
  width: 82,
  height: 82,
  position: "relative",
  alignItems: "center",
  justifyContent: "center",
},

profileImage: {
  width: 76,
  height: 76,
  borderRadius: 38,
  alignItems: "center",
  justifyContent: "center",
},

cameraButton: {
  position: "absolute",
  right: -2,
  bottom: -1,
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 3,
},

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },

  infoCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    elevation: 2,
  },
  profileSection: {
  marginHorizontal: 18,
  marginTop: 22,
  padding: 16,
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "center",
},




editIconButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
},

  infoRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    flex: 1,
    marginLeft: 13,
  },

  infoLabel: {
    fontSize: 11,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },

  editButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 25,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  editButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  passwordButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  passwordButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 25,
  },
});