import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Switch,
  View,
  Text,
} from "react-native";

import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function AppearanceScreen() {

  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >
      <GradientHeader
        title="Appearance"
        subtitle="Customize app appearance"
      />

      <ScrollView
        contentContainerStyle={styles.content}
      >

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.colors.surface,
            },
          ]}
        >
          <View>

            <Text
              style={[
                styles.title,
                {
                  color:
                    theme.colors.text,
                },
              ]}
            >
              Dark Mode
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              Enable dark appearance
            </Text>

          </View>

          <Switch
            value={isDark}
            onValueChange={toggleTheme}
          />

        </View>

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

  card: {
    borderRadius: 18,
    padding: 20,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    elevation: 3,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },

});