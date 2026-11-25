// ForcePasswordChangeScreen — the blocking first-login step for staff who were
// created with the shared default password (doctor123 / pharmacy123). It cannot
// be dismissed or backed out of: hardware back is swallowed, there is no header
// back button, and the only way forward is to set a new password. On success we
// reset the stack straight to the user's portal.

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import authService from '../services/authService';
import { useTheme } from '../../../context/ThemeContext';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function ForcePasswordChangeScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const target = route?.params?.target || 'PatientPortal';
  const userData = route?.params?.userData || null;

  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Block hardware back the whole time this screen is focused.
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []));

  const submit = async () => {
    setError('');
    if (pw.length < 8) return setError('Your new password must be at least 8 characters.');
    if (pw !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await authService.forcePasswordChange(pw);
      // Done — go straight to the portal; the stack is reset so there is no back.
      navigation.reset({ index: 0, routes: [{ name: target, params: { userData } }] });
    } catch (e) {
      setBusy(false);
      setError(e?.message || 'Could not set your password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.iconDisc}><Ionicons name="lock-closed" size={26} color={COLORS.primary} /></View>
        <Text style={styles.title}>Change your password</Text>
        <Text style={styles.subtitle}>
          Your account was set up with a temporary password. For your security, please set your own password to continue. You can’t skip this step.
        </Text>

        <View style={styles.field}>
          <Ionicons name="key-outline" size={18} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="New password (min 8 characters)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!show}
            autoCapitalize="none"
            value={pw}
            onChangeText={(v) => { setPw(v); setError(''); }}
          />
          <TouchableOpacity onPress={() => setShow(!show)} hitSlop={HIT}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Ionicons name="key-outline" size={18} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!show}
            autoCapitalize="none"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
          />
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Set Password & Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: (24) + BOTTOM_SPACE },
  card: { width: '100%', maxWidth: 400, backgroundColor: COLORS.card, borderRadius: 20, padding: 22 },
  iconDisc: { width: 54, height: 54, borderRadius: 27, alignSelf: 'center', backgroundColor: COLORS.primary + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 13.5, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, marginBottom: 12 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14.5, color: COLORS.text },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FDECEC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  errorText: { flex: 1, fontSize: 12.5, color: COLORS.danger, fontWeight: '500' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
