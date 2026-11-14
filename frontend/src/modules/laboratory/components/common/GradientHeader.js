import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "../../Theme/themeContext";
import { topPad } from '../../../../utils/safeArea';

// Vertical gradient header (top darker → bottom lighter), like the pharmacy
// module. Light: teal → light-teal → white, white title, dark-slate tagline.
// Dark: teal → slate → black, everything white.
export default function GradientHeader({
  title,
  subtitle,
  showBackButton = true,
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.dark;

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#134E4A", "#1E293B", "#0F172A"]
          : ["#0BAA9D", "#5ED4C7", "#FFFFFF"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 14 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>

          {!!subtitle && (
            <Text style={[styles.subtitle, { color: isDark ? "#FFFFFF" : "#1E293B" }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: topPad(55),
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
});
