import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width } = Dimensions.get("window");
import { useTheme } from "../../Theme/themeContext";
import { useProfile } from "../../context/profileContext";
import { topPad } from '../../../../utils/safeArea';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const drawerWidth = width * 0.82;
const menuItems = [
  { icon: "person-outline", title: "My Profile", route: "Profile" },
  { icon: "home-outline", title: "Dashboard", route: "Dashboard" },
  { icon: "list-outline", title: "Today's Queue", route: "Queue" },
  { icon: "cube-outline", title: "Inventory", route: "Inventory" },
  { icon: "cart-outline", title: "Requisition", route: "Requisition" },
  { icon: "stats-chart-outline", title: "Analytics", route: "Analytics" },
  { icon: "cloud-download-outline", title: "Backup", route: "Backup" },
  { icon: "settings-outline", title: "Settings", route: "Settings" },
  { icon: "help-circle-outline", title: "Help & Support", route: "HelpSupport" },
];
export default function SideMenu({
  visible,
  onClose,
}: Props) {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { profile } = useProfile();
  const currentRoute = useNavigationState((s: any) => s?.routes?.[s.index]?.name);

  const handleLogout = async () => {
    onClose();
    try {
      await AsyncStorage.multiRemove([
        "user", "userData", "isLoggedIn", "userRole",
        "@sehatline_userData", "@sehatline_token",
      ]);
    } catch (e) {}
    const root = navigation.getParent?.() || navigation;
    root.reset({ index: 0, routes: [{ name: "Login" }] });
  };

   const handleNavigation = (screen: string) => {

  onClose();

  switch (screen) {

      case "My Profile":
      navigation.navigate("Profile");
      break;

    case "Dashboard":
      navigation.navigate("Dashboard");
      break;

    case "Analytics":
      navigation.navigate("Analytics");
      break;

    case "Inventory":
      navigation.navigate("Inventory");
      break;

    case "Today's Queue":
      navigation.navigate("Queue");
      break;


    case "Requisition":
      navigation.navigate("Requisition");
      break;

      case "Backup":
  navigation.navigate("Backup");
  break;

      case "Help & Support":
  navigation.navigate("HelpSupport");
  break;

  case "Settings":
  navigation.navigate("Settings");
  break;

    default:
      break;
  }

};
  const translateX = React.useRef(
    new Animated.Value(-drawerWidth)
  ).current;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;
    return (
    <View style={styles.root}>

      {/* Dark Overlay */}

      <Pressable
        style={styles.overlay}
        onPress={onClose}
      />

      {/* Drawer */}

      <Animated.View
  style={[
    styles.drawer,
    {
      transform: [{ translateX }],
      backgroundColor: theme.colors.background,
    },
  ]}
>

        {/* Header */}

        <LinearGradient
          colors={["#0BAA9D", "#44D6C9"]}
          style={styles.header}
        >

          <View style={styles.avatar}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>
                {(profile.fullName || "P").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={styles.name}>
            {profile.fullName || "Pharmacist"}
          </Text>

          <Text style={styles.role}>Pharmacist</Text>

          <Text style={styles.email}>
            {profile.email || ""}
          </Text>

        </LinearGradient>

        {/* Menu */}

     <View style={styles.body}>

  <ScrollView
    style={{ flex: 1 }}
    showsVerticalScrollIndicator={false}
  >

    <View style={styles.menuContainer}>
      {menuItems.map((item, index) => {
        const active = currentRoute === item.route;
        return (
        <TouchableOpacity
          key={index}
          style={[styles.menuItem, active && { backgroundColor: theme.colors.primary + "18" }]}
          onPress={() => handleNavigation(item.title)}
          activeOpacity={0.75}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
          </View>
          <Text
            style={[
              styles.menuText,
              { color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? "800" : "600" },
            ]}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
        );
      })}
    </View>
  </ScrollView>

 <View
  style={[
    styles.footer,
    {
      borderTopColor: theme.colors.border,
    },
  ]}
>

    {/* Admin-style logout pill */}
    <TouchableOpacity
      style={[styles.logout, { borderColor: "#EF444455", backgroundColor: "#EF444410" }]}
      activeOpacity={0.8}
      onPress={handleLogout}
    >
      <Ionicons name="log-out-outline" size={20} color="#EF4444" />
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>

    <View style={styles.footerText}>
      <Text style={styles.appName}>
        <Text style={{ color: theme.colors.primary }}>Sehat</Text>
        <Text style={{ color: theme.dark ? "#FFFFFF" : "#1E293B" }}>Line</Text>
      </Text>

<Text
  style={[
    styles.hospitalName,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
        CDA Hospital, Islamabad
      </Text>

    </View>

  </View>

</View>
</Animated.View>

    </View>
  );
}
const styles = StyleSheet.create({
  root: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 9999,
  elevation: 999,
},

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

 drawer: {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0, 
  width: drawerWidth,
  backgroundColor: "#FFFFFF",

  borderTopRightRadius: 20,
  borderBottomRightRadius: 20,

  overflow: "hidden",

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 18,
  shadowOffset: {
    width: 4,
    height: 0,
  },
  elevation: 10,
},

  header: {
    alignItems: "center",

    paddingTop: topPad(40),
    paddingBottom: 18,

    paddingHorizontal: 20,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,

    backgroundColor: "#73E8DA",

    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },

  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  name: {
    marginTop: 12,

    fontSize: 20,
    fontWeight: "700",

    color: "#FFFFFF",
  },

  role: {
    marginTop: 4,

    fontSize: 15,

    color: "#F8FFFF",
  },

  email: {
    marginTop: 3,

    fontSize: 13,

    color: "#F5FFFF",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 18,

    backgroundColor: "#FFFFFF",

    paddingHorizontal: 18,
    paddingVertical: 8,

    borderRadius: 20,
  },

  badgeText: {
    marginLeft: 6,

    color: "#0BAA9D",
    fontWeight: "700",
  },

  body: {
    flex: 1,
    justifyContent: "space-between",
},

menuContainer: {
  paddingHorizontal: 8,
  paddingTop: 14,
},

footer: {
  marginTop: "auto",

  paddingHorizontal: 20,
  paddingTop: 6,
  paddingBottom: 18,
},

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // No disc in either mode — the teal icon sits plain.
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },

  menuText: {
    flex: 1,

    marginLeft: 12,

    fontSize: 15,
    fontWeight: "600",

    color: "#1F2937",
  },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },

  footerText: {
    marginTop: 16,
    alignItems: "center",
  },

  appName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  hospitalName: {
    marginTop: 2,

    fontSize: 11.5,

    color: "#8C95A1",
  },
});