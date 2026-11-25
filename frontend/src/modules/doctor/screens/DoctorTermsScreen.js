// Terms & Conditions — full page (was a modal). Themed for light/dark.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import DoctorHeader from '../components/DoctorHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const POINTS = [
  'Use the app only for legitimate patient care.',
  'Keep your login credentials and patient data confidential.',
  'Provide accurate profile and availability information.',
  'Follow hospital policies and medical ethics at all times.',
  'Do not misuse or share access with unauthorized persons.',
];

export default function DoctorTermsScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  return (
    <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <DoctorHeader title="Terms & Conditions" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text" size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.intro}>By using SehatLine, you agree to the following terms:</Text>
        {POINTS.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.num}>{i + 1}</Text>
            <Text style={styles.point}>{p}</Text>
          </View>
        ))}
        <Text style={styles.footer}>Continued use of the app means you accept these terms.</Text>
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
  row: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  num: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, color: '#FFFFFF',
    textAlign: 'center', lineHeight: 24, fontWeight: '800', fontSize: 12, overflow: 'hidden',
  },
  point: { flex: 1, fontSize: 14.5, lineHeight: 21, color: COLORS.text },
  footer: { fontSize: 13, lineHeight: 20, color: COLORS.textLight, marginTop: 14 },
});
