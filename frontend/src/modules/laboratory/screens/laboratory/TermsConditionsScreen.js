import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

const SECTIONS = [
  { h: "Authorized Use", b: "This module is for authorized CDA Hospital laboratory staff only. You must use it strictly to process the tests referred to the laboratory and to publish accurate results." },
  { h: "Accuracy of Results", b: "Lab staff are responsible for verifying every result before completing a report. Once a report is published it is delivered to the patient and the referring doctor, so care must be taken before marking a test complete." },
  { h: "Sample Handling", b: "Samples must be collected, labelled and processed following the hospital's standard operating procedures. The status you set (Sample Collected, Processing, Completed) must reflect the real state of the sample." },
  { h: "Account Responsibility", b: "Keep your login credentials confidential. All actions performed under your account are attributed to you." },
  { h: "Service Availability", b: "The hospital may update or suspend the service for maintenance. Continued use after an update constitutes acceptance of these terms." },
];

export default function TermsConditionsScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader title="Terms & Conditions" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((s, i) => (
          <View key={s.h} style={{ marginBottom: 18 }}>
            <Text style={[styles.h, { color: colors.text }]}>{i + 1}. {s.h}</Text>
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
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  header: { height: topPad(105), paddingTop: topPad(45), paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: "#FFFFFF", fontSize: 21, fontWeight: "800" },
  content: { padding: 22 },
  h: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  b: { fontSize: 13.5, lineHeight: 21 },
  foot: { fontSize: 12, marginTop: 10, textAlign: "center" },
});
