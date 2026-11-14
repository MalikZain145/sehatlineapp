// ScreenHeader — the header every inner screen uses.
//
// Back buttons had drifted: some white, some the old cyan, some sat in a
// tinted circle. A back arrow is navigation furniture, not a call to action —
// it should be the same dark slate glyph on every screen, with no chrome
// around it, exactly as on the auth screens.
//
// `right` takes an optional action (Save, Edit, Read-all…).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_BAR_HEIGHT } from '../../utils/safeArea';

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backIcon = 'arrow-back',
  right,
  // Some screens sit on the page background rather than white.
  transparent = false,
}) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  return (
    <View style={[styles.header, transparent && styles.transparent]}>
      <TouchableOpacity onPress={onBack} hitSlop={HIT} style={styles.backBtn}>
        <Ionicons name={backIcon} size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {/* Optional right-side action (Save / Edit / Read-all). */}
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 14,
    // Transparent so the header always takes the screen's own colour — no white
    // card bar, no divider — matching the Appointments screen on every screen.
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  transparent: { backgroundColor: 'transparent', borderBottomWidth: 0 },

  // No background, no border — just the glyph.
  backBtn: { width: 44, alignItems: 'flex-start' },

  // Screen name + subtitle are LEFT-aligned (sit right after the back arrow).
  center: { flex: 1, alignItems: 'flex-start', marginLeft: 4 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text, textAlign: 'left' },
  subtitle: { fontSize: 11, color: COLORS.textLight, marginTop: 1, textAlign: 'left' },

  // Holds an optional Save / Edit action on the far right.
  right: { width: 44, alignItems: 'flex-end' },
});
