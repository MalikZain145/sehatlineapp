import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../theme"; // static palette for module-scope maps; components shadow it via useTheme()
// Reusable, theme-consistent modals for the whole app (patient + doctor).
//
//  <AppModal>       — a themed popup shell. Pass `onClose` to show the ✕ close
//                     button (for info/content modals). Put anything as children.
//  <ConfirmModal>   — a titled confirm dialog with Cancel + action buttons
//                     (for "Are you sure?", delete, logout, accept/ok, etc.).
//
// Both use the app theme (COLORS), rounded cards, a dimmed backdrop, and a
// gradient primary button — the same look as the "No patient in queue" modal.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
const DANGER = COLORS.danger || '#EF4444';

// ── Base themed modal shell ────────────────────────────────────────────────
export function AppModal({
  visible,
  onClose,
  // if provided → shows the ✕ close button + tap-outside closes
  title,
  icon,
  // optional Ionicon name shown in a circular badge
  iconColor = COLORS.primary,
  children,
  dismissOnBackdrop = true
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissOnBackdrop && onClose ? onClose : undefined} />
        <View style={styles.card}>
          {!!onClose && <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary || '#6B7280'} />
            </TouchableOpacity>}
          {!!icon && <View style={[styles.iconWrap, {
          backgroundColor: iconColor + '15'
        }]}>
              <Ionicons name={icon} size={32} color={iconColor} />
            </View>}
          {!!title && <Text style={styles.title}>{title}</Text>}
          {children}
        </View>
      </View>
    </Modal>;
}

// ── Confirm dialog (Cancel + action) ───────────────────────────────────────
export function ConfirmModal({
  visible,
  title,
  message,
  icon,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  // red action button (delete / logout)
  onConfirm,
  onCancel
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const accent = destructive ? DANGER : COLORS.primary;
  return <AppModal visible={visible} onClose={onCancel} title={title} icon={icon} iconColor={accent}>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={onConfirm}>
          {destructive ? <View style={[styles.confirmSolid, {
          backgroundColor: DANGER
        }]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </View> : <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
          x: 0,
          y: 0
        }} end={{
          x: 1,
          y: 0
        }} style={styles.confirmSolid}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </LinearGradient>}
        </TouchableOpacity>
      </View>
    </AppModal>;
}

// Single-button themed alert (replaces plain Alert.alert for info messages).
export function InfoModal({
  visible,
  title,
  message,
  icon = 'information-circle',
  buttonLabel = 'Got it',
  onClose
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <AppModal visible={visible} onClose={onClose} title={title} icon={icon}>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <TouchableOpacity style={styles.fullBtn} activeOpacity={0.85} onPress={onClose}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 0
      }} style={styles.fullBtnGradient}>
          <Text style={styles.confirmText}>{buttonLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </AppModal>;
}
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    padding: 4
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text || '#1F2937',
    textAlign: 'center',
    marginBottom: 6
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    color: COLORS.textSecondary || '#6B7280',
    fontSize: 15,
    fontWeight: '700'
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden'
  },
  confirmSolid: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  fullBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden'
  },
  fullBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center'
  }
});
export default AppModal;