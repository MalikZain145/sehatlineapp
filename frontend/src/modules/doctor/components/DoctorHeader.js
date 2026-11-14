// DoctorHeader — patient-style top bar for every doctor screen except the
// dashboard: a plain back arrow, a left-aligned screen title, and an optional
// right-side action. Theme-aware (dark mode). Matches the patient module.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function DoctorHeader({ title, onBack, navigation, right }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const goBack = onBack || (() => navigation && navigation.goBack());
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} hitSlop={HIT} style={styles.backBtn} activeOpacity={0.6}>
        <Ionicons name="arrow-back" size={26} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 14,
    backgroundColor: COLORS.background,
  },
  backBtn: { width: 32, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  right: { minWidth: 32, alignItems: 'flex-end' },
});
