// SideMenu — the laboratory side drawer, an OVERLAY that slides over the
// current screen (it does not push it). Mirrors the pharmacy module's side menu.

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../Theme/themeContext";
import { useSession } from "../../../../context/SessionContext";
import laboratoryService from "../../services/laboratoryService";
import { topPad } from '../../../../utils/safeArea';

const { width } = Dimensions.get("window");
const drawerWidth = width * 0.82;

const menuItems = [
  { icon: "person-outline", title: "My Profile", route: "Profile" },
  { icon: "home-outline", title: "Dashboard", route: "Dashboard" },
  { icon: "list-outline", title: "Today's Queue", route: "Queue" },
  { icon: "flask-outline", title: "Test Catalog", route: "TestCatalog" },
  { icon: "document-text-outline", title: "Reports", route: "CompletedReports" },
  { icon: "cube-outline", title: "Inventory", route: "Inventory" },
  { icon: "cart-outline", title: "Requisitions", route: "Requisitions" },
  { icon: "stats-chart-outline", title: "Analytics", route: "Analytics" },
  { icon: "settings-outline", title: "Settings", route: "Settings" },
  { icon: "help-circle-outline", title: "Help & Support", route: "HelpSupport" },
];

export default function SideMenu({ visible, onClose }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { logout } = useSession();
  const currentRoute = useNavigationState((s) => s?.routes?.[s.index]?.name);
  const [profile, setProfile] = useState({ name: "Laboratory", email: "", profilePic: "" });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const res = await laboratoryService.getProfile();
        const u = res?.profile;
        if (u) setProfile({ name: u.name || "Laboratory", email: u.email || "", profilePic: u.profilePic || "" });
      } catch (e) { /* offline */ }
    })();
  }, [visible]);

  const handleLogout = () => {
    onClose();
    logout("manual");
  };

  const handleNavigation = (route) => {
    onClose();
    if (route !== currentRoute) navigation.navigate(route);
  };

  const translateX = useRef(new Animated.Value(-drawerWidth)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX }], backgroundColor: theme.colors.background },
        ]}
      >
        {/* Header */}
        <LinearGradient colors={["#0BAA9D", "#44D6C9"]} style={styles.header}>
          <View style={styles.avatar}>
            {profile.profilePic ? (
              <Image source={{ uri: profile.profilePic }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{(profile.name || "L").charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.name}>{profile.name || "Laboratory"}</Text>
          <Text style={styles.role}>Laboratorist</Text>
          {!!profile.email && <Text style={styles.email}>{profile.email}</Text>}
        </LinearGradient>

        {/* Menu */}
        <View style={styles.body}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => {
                const active = currentRoute === item.route;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, active && { backgroundColor: theme.colors.primary + "18" }]}
                    onPress={() => handleNavigation(item.route)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
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

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
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
              <Text style={[styles.hospitalName, { color: theme.colors.textSecondary }]}>
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
  root: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 999 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  drawer: {
    position: "absolute", left: 0, top: 0, bottom: 0, width: drawerWidth,
    borderTopRightRadius: 20, borderBottomRightRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 4, height: 0 }, elevation: 10,
  },
  header: { alignItems: "center", paddingTop: topPad(40), paddingBottom: 18, paddingHorizontal: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#73E8DA", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  name: { marginTop: 12, fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  role: { marginTop: 4, fontSize: 15, color: "#F8FFFF" },
  email: { marginTop: 3, fontSize: 13, color: "#F5FFFF" },
  body: { flex: 1, justifyContent: "space-between" },
  menuContainer: { paddingHorizontal: 8, paddingTop: 14 },
  footer: { marginTop: "auto", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" },
  menuText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "600" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  footerText: { marginTop: 16, alignItems: "center" },
  appName: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  hospitalName: { marginTop: 2, fontSize: 11.5 },
});
