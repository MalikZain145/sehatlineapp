// ForgotPasswordScreen — modern, single smart input.
// The user types EITHER an email or a phone number; the app auto-detects
// which and sends the OTP to the matching account.
// Flow: identify → enter OTP → set new password.

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert, Dimensions, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../../theme';
import authService from '../services/authService';
import { showInfo } from '../../../components/confirm';
import PasswordStrength, { scorePassword } from '../../../components/ui/PasswordStrength';
import FadeInView from '../../../components/ui/FadeInView';
import AuthLogo from '../../../components/ui/AuthLogo';
import BottomWave from '../../../components/ui/BottomWave';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const { width } = Dimensions.get('window');

// Detect whether the input is an email or a phone number.
function detectIdentifier(input) {
  const t = input.trim();
  if (t.includes('@')) return { type: 'email', value: t.toLowerCase() };
  const digits = t.replace(/\D/g, '');
  if (digits.length >= 10) return { type: 'phone', value: digits.replace(/^0+/, '') };
  return { type: 'unknown', value: t };
}

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 identify, 2 otp, 3 new password
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [detected, setDetected] = useState(null); // { type, value }
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetTicket, setResetTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  // Numeric-keyboard toggle for the identify field. We never auto-switch the
  // keyboard based on what was typed (that felt jumpy) — the user taps the
  // keypad icon to open the number pad, and it stays put otherwise.
  const [numKeyboard, setNumKeyboard] = useState(false);
  const otpRefs = useRef([]);
  const idRef = useRef(null);

  const idType = detectIdentifier(identifier).type;

  // While typing, if the input is all digits treat it as a phone number and
  // strip any leading zero(s) — we store numbers as +92 300…, never 0300…, so
  // the backend matches regardless of whether the user typed the 0.
  const onChangeIdentifier = (text) => {
    const t = text.trimStart();
    if (/^[0-9]+$/.test(t)) {
      setIdentifier(t.replace(/^0+/, ''));
    } else {
      setIdentifier(text);
    }
  };

  // Toggle the number pad on/off and re-focus so the OS swaps the keyboard.
  const toggleNumericKeyboard = () => {
    setNumKeyboard((v) => !v);
    idRef.current?.blur();
    setTimeout(() => idRef.current?.focus(), 60);
  };

  // ---- Step 1: request OTP ----
  const requestOtp = async () => {
    const det = detectIdentifier(identifier);
    if (det.type === 'unknown') {
      showInfo({ title: 'Invalid Input', message: 'Please enter a valid email address or phone number.', icon: 'alert-circle' });
      return;
    }
    setDetected(det);
    setLoading(true);
    try {
      const payload = det.type === 'email' ? { email: det.value } : { phone: det.value };
      const res = await authService.requestReset(payload);
      setLoading(false);
      // Backend returns success even if account exists; if it says not registered, show it.
      if (res && res.success === false) {
        showInfo({ title: 'Not Found', message: res.message || 'No account found with these details.', icon: 'alert-circle' });
        return;
      }
      setStep(2);
      // If backend returns the OTP in dev mode, prefill nothing but inform.
      showInfo({ title: 'Code Sent', message: `A verification code has been sent to your ${det.type === 'email' ? 'email' : 'phone'}.`, icon: 'mail-unread' });
    } catch (err) {
      setLoading(false);
      // Backend enforces max 3 reset requests per account per 24 hours.
      if (err.code === 'TOO_MANY_RESETS') {
        showInfo({ title: 'Limit Reached', message: err.message || 'Too many reset requests. Please try again later.', icon: 'time' });
        return;
      }
      showInfo({ title: 'Error', message: err.message || 'Could not send verification code.', icon: 'alert-circle' });
    }
  };

  // ---- OTP input handling ----
  const setOtpDigit = (i, v) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (!digit && i > 0) { /* stay */ }
  };
  const onOtpKey = (i, key) => {
    if (key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  // ---- Step 2: verify OTP ----
  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { showInfo({ title: 'Incomplete', message: 'Please enter the 6-digit code.', icon: 'alert-circle' }); return; }
    setLoading(true);
    try {
      const payload = detected.type === 'email' ? { email: detected.value, otp: code } : { phone: detected.value, otp: code };
      const res = await authService.verifyReset(payload);
      setLoading(false);
      if (res && res.resetTicket) {
        setResetTicket(res.resetTicket);
        setStep(3);
      } else {
        showInfo({ title: 'Invalid Code', message: res?.message || 'The code is incorrect or expired.', icon: 'alert-circle' });
      }
    } catch (err) {
      setLoading(false);
      showInfo({ title: 'Invalid Code', message: err.message || 'The code is incorrect or expired.', icon: 'alert-circle' });
    }
  };

  // ---- Step 3: reset password ----
  const resetPassword = async () => {
    if (scorePassword(newPassword) < 2) { showInfo({ title: 'Weak Password', message: 'Please choose a stronger password.', icon: 'shield-half' }); return; }
    if (newPassword !== confirmPassword) { showInfo({ title: 'Mismatch', message: 'Passwords do not match.', icon: 'alert-circle' }); return; }
    setLoading(true);
    try {
      const payload = {
        ...(detected.type === 'email' ? { email: detected.value } : { phone: detected.value }),
        resetTicket,
        newPassword,
      };
      const res = await authService.resetPassword(payload);
      setLoading(false);
      showInfo({ title: 'Success', message: 'Your password has been reset. Please log in.', icon: 'checkmark-circle', buttonLabel: 'Log In', onClose: () => navigation.replace('Login') });
    } catch (err) {
      setLoading(false);
      showInfo({ title: 'Error', message: err.message || 'Could not reset password.', icon: 'alert-circle' });
    }
  };

  // Once the OTP is verified (step 3) the user must finish setting a new
  // password — going back would strand a consumed reset ticket.
  const back = () => {
    if (step === 3) return;              // locked
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  // Block the Android hardware back button on the final step.
  useEffect(() => {
    const onBack = () => {
      if (step === 3) {
        showInfo({ title: 'Finish Reset', message: 'Please set your new password to continue.', icon: 'lock-closed' });
        return true;                      // swallow the event
      }
      return false;                       // let the default happen
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [step]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* Soft mint wave anchoring the bottom of the page */}
      <BottomWave />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          {step === 3 ? (
            <View style={{ width: 40 }} />
          ) : (
            <TouchableOpacity style={styles.backBtn} onPress={back}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
          )}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}>
          {/* Brand mark — same as Login */}
          <FadeInView delay={50}>
            <AuthLogo compact />
          </FadeInView>

          {/* Step icon — gives visual context for where the user is in the flow */}
          <FadeInView delay={100}>
            <View style={styles.iconWrap}>
              <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.iconCircle}>
                <Ionicons name={step === 1 ? 'lock-closed' : step === 2 ? 'shield-checkmark' : 'key'} size={32} color="#FFF" />
              </LinearGradient>
            </View>
          </FadeInView>

          <FadeInView delay={150}>
          <View style={styles.card}>
            {/* STEP 1 — Identify */}
            {step === 1 && (
              <>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.sub}>Enter your email or phone number and we'll send you a verification code.</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Email or Phone Number</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name={idType === 'email' ? 'mail-outline' : idType === 'phone' ? 'call-outline' : 'person-outline'}
                      size={18} color={COLORS.secondary} style={styles.inputIcon}
                    />
                    <TextInput
                      ref={idRef}
                      style={styles.input}
                      value={identifier}
                      onChangeText={onChangeIdentifier}
                      placeholder="Enter email or phone number"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      // Never auto-switch: default keyboard unless the user taps
                      // the keypad icon to open the number pad.
                      keyboardType={numKeyboard ? 'number-pad' : 'default'}
                      numberOfLines={1}
                    />
                    {/* Keypad toggle — opens the number pad for entering a phone
                        number without the keyboard jumping on its own. */}
                    <TouchableOpacity onPress={toggleNumericKeyboard} style={styles.keypadBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="keypad-outline" size={18} color={numKeyboard ? COLORS.primary : '#94A3B8'} />
                    </TouchableOpacity>
                    {idType !== 'unknown' && (
                      <View style={styles.detectBadge}>
                        <Text style={styles.detectText}>{idType === 'email' ? 'Email' : 'Phone'}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={requestOtp} disabled={loading} activeOpacity={0.9}>
                  <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryInner}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryText}>Send Code</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2 — OTP */}
            {step === 2 && (
              <>
                <Text style={styles.title}>Enter Code</Text>
                <Text style={styles.sub}>We sent a 6-digit code to your {detected?.type === 'email' ? 'email' : 'phone'}.</Text>

                <View style={styles.otpRow}>
                  {otp.map((d, i) => (
                    <TextInput
                      key={i}
                      ref={(r) => (otpRefs.current[i] = r)}
                      style={[styles.otpBox, d && styles.otpBoxFilled]}
                      value={d}
                      onChangeText={(v) => setOtpDigit(i, v)}
                      onKeyPress={({ nativeEvent }) => onOtpKey(i, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={verifyOtp} disabled={loading} activeOpacity={0.9}>
                  <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryInner}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryText}>Verify</Text><Ionicons name="checkmark" size={20} color="#FFF" /></>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resend} onPress={requestOtp}>
                  <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendBold}>Resend</Text></Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 3 — New password */}
            {step === 3 && (
              <>
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.sub}>Create a strong new password for your account.</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor="#94A3B8" secureTextEntry={!showPw} />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  <PasswordStrength password={newPassword} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor="#94A3B8" secureTextEntry={!showPw} />
                  </View>
                  {confirmPassword && newPassword === confirmPassword && (
                    <View style={styles.matchRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.matchText}>Passwords match</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={resetPassword} disabled={loading} activeOpacity={0.9}>
                  <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryInner}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryText}>Reset Password</Text><Ionicons name="checkmark" size={20} color="#FFF" /></>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
          </FadeInView>

          {/* No escape route once the OTP is verified — they must finish. */}
          {step !== 3 && (
            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Remember your password? <Text style={styles.loginLinkBold}>Log In</Text></Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 150 },
  iconWrap: { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 }, android: { elevation: 8 } }) },
  // No box: transparent + no border/shadow so the form blends into the screen.
  card: {
    backgroundColor: 'transparent', borderRadius: 0, paddingHorizontal: 0, paddingVertical: 4,
  },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 13, color: '#64748B', marginTop: 8, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary + '55' },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 13, color: COLORS.text },
  eyeBtn: { padding: 12 },
  keypadBtn: { padding: 10 },
  detectBadge: { backgroundColor: COLORS.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, marginRight: 8 },
  detectText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  primaryBtn: { marginTop: 8, borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }) },
  primaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  primaryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  // Clamp so the boxes stay tappable on small (320px) Android screens.
  otpBox: { width: Math.max(38, (width - 32 - 48 - 30) / 6), aspectRatio: 0.85, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary + '55', backgroundColor: '#F8FAFC', fontSize: 20, fontWeight: '800', color: COLORS.text },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#E4F9F3' },
  resend: { alignItems: 'center', marginTop: 16 },
  resendText: { color: '#64748B', fontSize: 12.5 },
  resendBold: { color: COLORS.primary, fontWeight: '800' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  matchText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: '#64748B', fontSize: 13 },
  loginLinkBold: { color: COLORS.primary, fontWeight: '800' },
});
