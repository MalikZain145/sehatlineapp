import { useTheme } from "../../context/ThemeContext";
import { COLORS } from "../../theme"; // static palette for module-scope maps; components shadow it via useTheme()
// ThemedPrompt — the app's dialog. White card, dark text, one teal accent.
//
// The old version put a full-bleed gradient behind the icon, which fought with
// whatever screen it appeared over and made errors feel like announcements.
// A dialog interrupts the user; it should be quiet. The only colour here is a
// tinted icon disc that signals what kind of message this is.

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
const {
  width
} = Dimensions.get('window');

// Each variant only tints the icon — the card itself stays white.
const VARIANTS = {
  default: {
    color: COLORS.primary,
    tint: COLORS.mintLight,
    icon: 'information-circle'
  },
  success: {
    color: COLORS.success,
    tint: '#E7F8F1',
    icon: 'checkmark-circle'
  },
  warning: {
    color: COLORS.warning,
    tint: '#FEF3E2',
    icon: 'alert-circle'
  },
  error: {
    color: COLORS.danger,
    tint: '#FDECEC',
    icon: 'close-circle'
  }
};
export default function ThemedPrompt({
  visible,
  icon,
  title,
  message,
  primaryLabel = 'OK',
  onPrimary,
  secondaryLabel,
  onSecondary,
  variant = 'default',
  destructive = false // primary action deletes / discards
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const v = VARIANTS[variant] || VARIANTS.default;
  const accent = destructive ? COLORS.danger : v.color;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary || onPrimary}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconDisc, {
          backgroundColor: v.tint
        }]}>
            <Ionicons name={icon || v.icon} size={26} color={v.color} />
          </View>

          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            {!!secondaryLabel && <TouchableOpacity style={styles.btnGhost} onPress={onSecondary} activeOpacity={0.7}>
                <Text style={styles.btnGhostText} numberOfLines={1}>{secondaryLabel}</Text>
              </TouchableOpacity>}
            <TouchableOpacity style={[styles.btnPrimary, {
            backgroundColor: accent
          }, !secondaryLabel && {
            flex: 1
          }]} onPress={onPrimary} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText} numberOfLines={1}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
}
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28
  },
  card: {
    width: Math.min(width - 56, 340),
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8
        },
        shadowOpacity: 0.15,
        shadowRadius: 20
      },
      android: {
        elevation: 10
      }
    })
  },
  iconDisc: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 7
  },
  message: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnGhostText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13.5
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13.5
  }
});