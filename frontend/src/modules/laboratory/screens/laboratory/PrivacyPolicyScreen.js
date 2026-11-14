import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';

const SECTIONS = [
  { h: "Information We Handle", b: "The laboratory module processes patient identity (name, CDA card / CNIC), the tests referred by the doctor, sample and processing status, and the results entered by lab staff. This data belongs to CDA Hospital and is used solely for the patient's care." },
  { h: "How Reports Are Shared", b: "A completed report is delivered only to the patient it belongs to, inside their own SehatLine app, and to the referring doctor. Reports are never shared with third parties." },
  { h: "Staff Accountability", b: "Every status change and report is linked to the lab technician who performed it, so the hospital can audit the chain of custody for each sample." },
  { h: "Data Security", b: "Access is restricted to authenticated laboratory staff. Sessions are device-bound and time out automatically when idle." },
];

export default function PrivacyPolicyScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader title="Privacy Policy" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((s) => (
          <View key={s.h} style={{ marginBottom: 18 }}>
            <Text style={[styles.h, { color: colors.text }]}>{s.h}</Text>
            <Text style={[styles.b, { color: colors.textSecondary }]}>{s.b}</Text>
          </View>
        ))}
        <Text style={[styles.foot, { color: colors.textSecondary }]}>
          CDA Hospital, Islamabad · Laboratory Services
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
  content: { padding: 22 },
  h: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  b: { fontSize: 13.5, lineHeight: 21 },
  foot: { fontSize: 12, marginTop: 10, textAlign: "center" },
});
