// Privacy Policy — full page (was a modal). Themed for light/dark.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import DoctorHeader from '../components/DoctorHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const POINTS = [
  'Your data is stored securely on hospital-controlled servers.',
  'Only authorized hospital staff can access patient records.',
  'All communications between the app and the server are encrypted.',
  'Your data is used only for healthcare and hospital operations.',
  'We never sell or share your information with third parties.',
];

export default function DoctorPrivacyScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  return (
    <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <DoctorHeader title="Privacy Policy" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.intro}>SehatLine is committed to protecting your privacy and the confidentiality of patient data.</Text>
        {POINTS.map((p, i) => (
          <View key={i} style={styles.row}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
            <Text style={styles.point}>{p}</Text>
          </View>
        ))}
        <Text style={styles.footer}>For more information, contact Hospital Administration, Capital Hospital — CDA, Islamabad.</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary + '18',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  intro: { fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  point: { flex: 1, fontSize: 14.5, lineHeight: 21, color: COLORS.text },
  footer: { fontSize: 13, lineHeight: 20, color: COLORS.textLight, marginTop: 14 },
});
