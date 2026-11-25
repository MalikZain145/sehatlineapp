// ============================================================
// BottomErrorToast
// A minimal error message that FADES IN/OUT at the BOTTOM of the screen.
// No heavy background block — just a soft pill with an icon + text, so it
// reads as clean floating text (per the requested style).
//
// Usage:
//   const [err, setErr] = useState('');
//   ...
//   <BottomErrorToast message={err} onHide={() => setErr('')} />
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SIZES } from '../../theme';
import { useTheme } from "../../context/ThemeContext";
import { BOTTOM_INSET } from '../../utils/bottomInset';
export default function BottomErrorToast({
  message,
  type = 'error',
  duration = 3200,
  onHide
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    if (message) {
      // fade + rise in
      Animated.parallel([Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true
      }), Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true
      })]).start();
      const t = setTimeout(() => {
        // fade + sink out
        Animated.parallel([Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true
        }), Animated.timing(translateY, {
          toValue: 20,
          duration: 280,
          useNativeDriver: true
        })]).start(() => onHide && onHide());
      }, duration);
      return () => clearTimeout(t);
    }
  }, [message]);
  if (!message) return null;
  const color = type === 'success' ? COLORS.success : type === 'warning' ? COLORS.warning : type === 'info' ? COLORS.primary : COLORS.danger;
  const icon = type === 'success' ? 'checkmark-circle' : type === 'warning' ? 'warning' : type === 'info' ? 'information-circle' : 'alert-circle';
  return <Animated.View pointerEvents="none" style={[styles.container, {
    opacity,
    transform: [{
      translateY
    }]
  }]}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.text, {
        color
      }]}>{message}</Text>
      </View>
    </Animated.View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: (Platform.OS === 'ios' ? 44 : 30) + BOTTOM_INSET,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2000
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    // Very subtle translucent backing so text is readable on any bg,
    // but not a solid block. Set to 'transparent' for pure text.
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20
  },
  text: {
    fontSize: SIZES.body,
    fontWeight: '600',
    maxWidth: 300,
    textAlign: 'center'
  }
});