import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';

export default function AboutAppScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader title="About" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: colors.mint }]}>
          <Ionicons name="flask" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>SehatLine Laboratory</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The SehatLine Laboratory module is the diagnostic hub of the SehatLine
          hospital system for CDA Hospital, Islamabad. Lab technicians receive
          patients referred from the OPD after their pharmacy visit, collect and
          process samples, and publish reports straight to the patient's app —
          with automatic analysis of out-of-range values.
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          It manages the live test queue, the test catalog, consumables
          inventory, requisitions to the admin, and lab analytics — all backed by
          the SehatLine backend.
        </Text>

        <Text style={[styles.foot, { color: colors.textSecondary }]}>
          © {new Date().getFullYear()} SehatLine · CDA Hospital, Islamabad
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: topPad(105), paddingTop: topPad(45), paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: "#FFFFFF", fontSize: 21, fontWeight: "800" },
  content: { padding: 24, alignItems: "center" },
  iconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginTop: 10 },
  appName: { fontSize: 20, fontWeight: "800", marginTop: 16 },
  version: { fontSize: 13, marginTop: 4 },
  body: { fontSize: 13.5, lineHeight: 21, marginTop: 18, textAlign: "left" },
  foot: { fontSize: 12, marginTop: 28, textAlign: "center" },
});
