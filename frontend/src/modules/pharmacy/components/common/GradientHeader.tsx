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


interface Props {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function GradientHeader({
  title,
  subtitle,
  showBackButton = true,
}: Props) {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={
        theme.dark
          ? ["#134E4A", "#1E293B", "#0F172A"]
          : ["#0BAA9D", "#5ED4C7", "#FFFFFF"]
      }
      style={styles.header}
    >
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 15 }}
          >
            <Ionicons
              name="arrow-back"
              size={30}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              {
                color: "#FFFFFF",
              },
            ]}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  // Dark slate in light mode (the light gradient washed out the
                  // old light-grey tagline); keep it light on the dark gradient.
                  color: theme.dark ? "#E5E7EB" : "#1E293B",
                },
              ]}
            >
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
    paddingBottom: 35,
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
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
});