// SignupScreen — modern, professional multi-step registration.
// Step 1: Name (first + last), email, phone
// Step 2: CNIC, CDA card, DOB (modern calendar), address
// Step 3: Password (with live strength meter) + confirm
// Clean UI with progress indicator, inline validation, and smooth flow.

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Animated, ActivityIndicator, Alert, Dimensions, Image, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../../theme';
import authService from '../services/authService';
import { showInfo, showConfirm } from '../../../components/confirm';
import ModernDatePicker from '../../../components/ui/ModernDatePicker';
import PasswordStrength, { scorePassword } from '../../../components/ui/PasswordStrength';
import { validateEmailAddress } from '../../../utils/emailValidation';
import { useSession } from '../../../context/SessionContext';
import FadeInView from '../../../components/ui/FadeInView';
import AuthLogo from '../../../components/ui/AuthLogo';
import BottomWave from '../../../components/ui/BottomWave';
import CnicCamera from '../../../components/ui/CnicCamera';
import CropEditor from '../../../components/ui/CropEditor';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const { width } = Dimensions.get('window');

// ---- Layout constants (consistent spacing on both Android and iOS) ----
const TOP_INSET = STATUS_BAR_HEIGHT + 12;
const HEADER_PAD_BOTTOM = 8;
const PROGRESS_PAD_TOP = 6;    // tight: keep the form high on the page
const PROGRESS_PAD_BOTTOM = 14;
const CARD_GAP = 4;
// CNIC photo capture step. DISABLED: the in-app camera/crop flow was unreliable
// on iOS and blocked real users at signup. The typed CNIC + CDA card are still
// required and still checked for duplicates (step "Identity"). Set to true to
// bring the camera step back (backend: also set CNIC_REQUIRE_IMAGES=true).
const CNIC_CAPTURE_ENABLED = false;
// Internal step ids: 0 Personal, 1 Identity, 2 CNIC capture, 3 Security.
const STEP_ORDER = CNIC_CAPTURE_ENABLED ? [0, 1, 2, 3] : [0, 1, 3];
const ALLOWED = 'gmail.com, yahoo.com, outlook.com, hotmail.com, live.com, icloud.com, protonmail.com';

export default function SignupScreen({ navigation }) {
  const { onAuthenticated } = useSession();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    cnic: '', cdaCard: '', dob: '', dobDisplay: '', address: '',
    password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  // ---- CNIC verification (step 2) ----
  // Each side must pass the backend OCR check before the user can continue.
  const [cnicFront, setCnicFront] = useState(null);   // { uri, imagePath }
  const [cnicBack, setCnicBack] = useState(null);
  const [cameraSide, setCameraSide] = useState(null); // 'front' | 'back' | null
  const [pendingPhoto, setPendingPhoto] = useState(null); // { uri, width, height } → crop editor
  const [verifying, setVerifying] = useState(false);
  const [verifyingSide, setVerifyingSide] = useState(null); // shows the spinner on the right card
  const [attempts, setAttempts] = useState({ front: 0, back: 0 });

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // Formatters
  const formatCnic = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 13);
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  };
  // Phone is entered WITHOUT the leading 0 — the +92 prefix is shown in a
  // fixed chip, so the user types 3XXXXXXXXX (10 digits).
  const formatPhone = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('92')) d = d.slice(2);   // pasted +92...
    if (d.startsWith('0')) d = d.slice(1);    // pasted 0300...
    d = d.slice(0, 10);
    if (d.length <= 3) return d;
    return `${d.slice(0, 3)}-${d.slice(3)}`;
  };

  // CDA card: the patient types only the 4 digits; "-RB" is a fixed suffix.
  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 4);
  const cardForBackend = () => (form.cdaCard ? `${form.cdaCard}-RB` : '');

  // Backend expects the local 11-digit form (03001234567).
  const phoneDigits = () => form.phone.replace(/\D/g, '');
  const phoneForBackend = () => {
    const d = phoneDigits();
    return d ? `0${d}` : '';
  };

  // ---- Step validation ----
  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = 'First name is required';
      if (!form.lastName.trim()) e.lastName = 'Last name is required';
      if (!form.email.trim()) e.email = 'Email is required';
      else { const emailErr = validateEmailAddress(form.email.trim()); if (emailErr) e.email = emailErr; }
      if (!form.phone.trim()) e.phone = 'Phone number is required';
      else if (phoneDigits().length !== 10) e.phone = 'Enter a 10-digit number (e.g. 300 1234567)';
      else if (!phoneDigits().startsWith('3')) e.phone = 'Mobile numbers start with 3 (e.g. 300, 321)';
    } else if (step === 1) {
      if (!form.cnic.trim() || form.cnic.replace(/\D/g, '').length !== 13) e.cnic = 'Enter a valid 13-digit CNIC';
      if (!form.cdaCard.trim()) e.cdaCard = 'CDA card number is required';
      else if (form.cdaCard.length !== 4) e.cdaCard = 'Enter the 4-digit card number';
      if (!form.dob) e.dob = 'Date of birth is required';
    } else if (step === 2 && CNIC_CAPTURE_ENABLED) {
      // Both sides must have passed the backend OCR check.
      if (!cnicFront) e.cnicFront = 'Capture the front of your CNIC';
      if (!cnicBack) e.cnicBack = 'Capture the back of your CNIC';
    } else if (step === 3) {
      if (!form.password) e.password = 'Password is required';
      else if (scorePassword(form.password) < 2) e.password = 'Password is too weak';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Capture → send straight to the backend for OCR verification.
  // The front side is also matched against the CNIC/name/DOB the user typed,
  // so a photo of someone else's card (or a random image) is rejected.
  // Camera took a photo → hand it to the crop editor (no verify yet).
  const handlePhotoTaken = (photo, err) => {
    if (err || !photo?.uri) {
      setCameraSide(null);
      showInfo({ title: 'Capture Failed', message: 'Could not take the photo. Please try again.', icon: 'camera' });
      return;
    }
    setPendingPhoto(photo);
  };

  // User cropped and confirmed → now verify with the backend.
  const handleCropDone = async (croppedUri) => {
    const side = cameraSide;
    setVerifying(true);
    setVerifyingSide(side);
    try {
      const payload = side === 'front'
        ? {
            cnic: form.cnic,
            name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            dob: form.dob,
            cdaCard: cardForBackend(),
          }
        : {};
      const res = await authService.verifyCnic(croppedUri, side, payload);

      setVerifying(false);
      setVerifyingSide(null);

      if (res?.success) {
        const saved = { uri: croppedUri, imagePath: res.imagePath, confidence: res.verdict?.confidence };
        if (side === 'front') setCnicFront(saved); else setCnicBack(saved);
        setAttempts((a) => ({ ...a, [side]: 0 }));
        setPendingPhoto(null);
        setCameraSide(null);          // verified → close everything
      }
    } catch (e) {
      setVerifying(false);
      setVerifyingSide(null);

      // Already registered → no point retrying; send them to login.
      if (e.code === 'ALREADY_REGISTERED') {
        setPendingPhoto(null);
        setCameraSide(null);
        showConfirm({
          title: 'Already Registered', message: e.message, icon: 'person-circle',
          confirmLabel: 'Log In', cancelLabel: 'Cancel',
          onConfirm: () => navigation.navigate('Login'),
        });
        return;
      }

      // Stay on the crop editor so the user can adjust the box and retry.
      const n = (attempts[side] || 0) + 1;
      setAttempts((a) => ({ ...a, [side]: n }));

      // Precise, actionable feedback per failure reason.
      const title =
        e.code === 'NOT_A_CNIC' ? 'Not a CNIC'
        : e.code === 'MISMATCH' ? 'Details Do Not Match'
        : 'Verification Failed';

      const hint =
        e.code === 'NOT_A_CNIC'
          ? 'Tighten the crop box around the card so no background is included, then try again. Make sure the text is sharp and glare-free.'
          : e.code === 'MISMATCH'
          ? 'The CNIC number, name or date of birth on the card does not match what you entered. Go back and correct your details, or capture the correct card.'
          : 'Adjust the crop and try again, or retake in better lighting.';

      const fullMsg = `${e.message || 'Could not verify the image.'}\n\n${hint}${n >= 2 ? `\n\nAttempts: ${n}` : ''}`;
      if (e.code === 'MISMATCH') {
        showConfirm({
          title, message: fullMsg, icon: 'alert-circle',
          confirmLabel: 'Fix My Details', cancelLabel: 'Adjust Crop',
          onConfirm: () => { setPendingPhoto(null); setCameraSide(null); setStep(1); },
        });
      } else {
        showInfo({ title, message: fullMsg, icon: 'alert-circle', buttonLabel: 'Adjust Crop' });
      }
    }
  };

  const next = async () => {
    if (!validateStep()) return;

    // On step 0, check email/phone availability early.
    if (step === 0) {
      try {
        setLoading(true);
        const res = await authService.checkAvailability({
          email: form.email.trim().toLowerCase(),
          phone: phoneForBackend(),
        });
        setLoading(false);
        if (res && res.available === false) {
          const which = res.field === 'email' ? 'email' : res.field === 'phone' ? 'phone number' : 'account';
          showConfirm({
            title: 'Already Registered', message: `This ${which} is already registered. Please log in instead.`, icon: 'person-circle',
            confirmLabel: 'Log In', cancelLabel: 'OK',
            onConfirm: () => navigation.navigate('Login'),
          });
          return;
        }
      } catch (err) {
        setLoading(false);
        // if the check endpoint fails, continue (backend will still guard)
      }
    }

    // On the Identity step, catch an already-registered CNIC / CDA card now
    // (this used to happen during CNIC photo verification).
    if (step === 1) {
      try {
        setLoading(true);
        const res = await authService.checkAvailability({
          cnic: form.cnic,
          cdaCard: cardForBackend(),
        });
        setLoading(false);
        if (res && res.available === false) {
          const which = res.field === 'cdaCard' ? 'CDA card number' : res.field === 'cnic' ? 'CNIC' : 'account';
          setErrors((er) => ({ ...er, [res.field === 'cdaCard' ? 'cdaCard' : 'cnic']: `This ${which} is already registered` }));
          showConfirm({
            title: 'Already Registered', message: `This ${which} is already registered. Please log in instead.`, icon: 'person-circle',
            confirmLabel: 'Log In', cancelLabel: 'OK',
            onConfirm: () => navigation.navigate('Login'),
          });
          return;
        }
      } catch (err) {
        setLoading(false);
      }
    }

    const pos = STEP_ORDER.indexOf(step);
    if (pos < STEP_ORDER.length - 1) setStep(STEP_ORDER[pos + 1]);
    else handleSignup();
  };

  const back = () => {
    const pos = STEP_ORDER.indexOf(step);
    if (pos > 0) setStep(STEP_ORDER[pos - 1]);
    else navigation.goBack();
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const res = await authService.signup({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: phoneForBackend(),
        cnic: form.cnic,
        cdaCard: cardForBackend(),
        dob: form.dob,
        address: form.address,
        // Only sent when the (disabled) capture step is turned back on.
        ...(CNIC_CAPTURE_ENABLED ? {
          cnicFrontImage: cnicFront?.imagePath || '',
          cnicBackImage: cnicBack?.imagePath || '',
        } : {}),
      });
      setLoading(false);
      // Save session + go home.
      onAuthenticated && onAuthenticated(res.user);
      navigation.replace('HomeScreen', { userData: res.user });
    } catch (error) {
      setLoading(false);
      showInfo({ title: 'Signup Failed', message: error.message || 'Could not create account. Please try again.', icon: 'alert-circle' });
    }
  };

  // ---- Reusable field ----
  const Field = ({ label, icon, value, onChangeText, error, placeholder, keyboardType, ...props }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <Ionicons name={icon} size={18} color={error ? '#EF4444' : COLORS.secondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          {...props}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const STEPS = CNIC_CAPTURE_ENABLED ? ['Personal', 'Identity', 'Verify', 'Security'] : ['Personal', 'Identity', 'Security'];
  const stepPos = STEP_ORDER.indexOf(step);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* Soft mint wave anchoring the bottom of the page */}
      <BottomWave />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        {/* Brand mark — same as Login, compact for the multi-step form */}
        <FadeInView delay={40}>
          <AuthLogo compact />
        </FadeInView>

        {/* Progress */}
        <FadeInView delay={50}>
          <View style={styles.progress}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.progressItem}>
                <View style={[styles.progressDot, i <= stepPos && styles.progressDotActive]}>
                  {i < stepPos
                    ? <Ionicons name="checkmark" size={14} color="#FFF" />
                    : <Text style={[styles.progressNum, i <= stepPos && styles.progressNumActive]}>{i + 1}</Text>}
                </View>
                {/* Only the active step shows its label — 4 labels would
                    overflow on small (320px) screens. */}
                {i === stepPos && <Text style={styles.progressLabelActive}>{s}</Text>}
                {i < STEPS.length - 1 && <View style={[styles.progressLine, i < stepPos && styles.progressLineActive]} />}
              </View>
            ))}
          </View>
        </FadeInView>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}>
          <FadeInView delay={150}>
          <View style={styles.card}>
            {/* STEP 0 — Personal */}
            {step === 0 && (
              <>
                <Text style={styles.stepTitle}>Personal Information</Text>
                <Text style={styles.stepSub}>Let's start with your basic details</Text>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>First Name</Text>
                    <View style={[styles.inputWrap, errors.firstName && styles.inputError]}>
                      <Ionicons name="person-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                      <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} placeholder="John" placeholderTextColor="#94A3B8" />
                    </View>
                    {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Last Name</Text>
                    <View style={[styles.inputWrap, errors.lastName && styles.inputError]}>
                      <TextInput style={[styles.input, { paddingLeft: 14 }]} value={form.lastName} onChangeText={(v) => set('lastName', v)} placeholder="Doe" placeholderTextColor="#94A3B8" />
                    </View>
                    {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="you@gmail.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />
                  </View>
                  {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[styles.inputWrap, errors.phone && styles.inputError]}>
                    <View style={styles.phonePrefix}>
                      <Ionicons name="call-outline" size={16} color={COLORS.secondary} />
                      <Text style={styles.phonePrefixText}>+92</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      value={form.phone}
                      onChangeText={(v) => set('phone', formatPhone(v))}
                      placeholder="300-1234567"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                  </View>
                  {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>
              </>
            )}

            {/* STEP 1 — Identity */}
            {step === 1 && (
              <>
                <Text style={styles.stepTitle}>Identity Details</Text>
                <Text style={styles.stepSub}>Your CNIC and hospital card information</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>CNIC Number</Text>
                  <View style={[styles.inputWrap, errors.cnic && styles.inputError]}>
                    <Ionicons name="card-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.cnic} onChangeText={(v) => set('cnic', formatCnic(v))} placeholder="12345-1234567-1" placeholderTextColor="#94A3B8" keyboardType="number-pad" />
                  </View>
                  {!!errors.cnic && <Text style={styles.errorText}>{errors.cnic}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>CDA Card Number</Text>
                  <View style={[styles.inputWrap, errors.cdaCard && styles.inputError]}>
                    <Ionicons name="id-card-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={form.cdaCard}
                      onChangeText={(v) => set('cdaCard', formatCard(v))}
                      placeholder="1234"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    <View style={styles.cardSuffix}>
                      <Text style={styles.cardSuffixText}>-RB</Text>
                    </View>
                  </View>
                  {!!errors.cdaCard && <Text style={styles.errorText}>{errors.cdaCard}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Date of Birth</Text>
                  <TouchableOpacity style={[styles.inputWrap, errors.dob && styles.inputError]} onPress={() => setShowCalendar(true)} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <Text style={[styles.input, { color: form.dobDisplay ? COLORS.text : '#94A3B8', paddingTop: 14 }]}>
                      {form.dobDisplay || 'Select your date of birth'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" style={{ marginRight: 12 }} />
                  </TouchableOpacity>
                  {!!errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Address <Text style={styles.optional}>(optional)</Text></Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="location-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.address} onChangeText={(v) => set('address', v)} placeholder="Your address" placeholderTextColor="#94A3B8" />
                  </View>
                </View>
              </>
            )}

            {/* STEP 2 — CNIC Verification */}
            {step === 2 && CNIC_CAPTURE_ENABLED && (
              <>
                <Text style={styles.stepTitle}>Verify Your CNIC</Text>
                <Text style={styles.stepSub}>Capture both sides with the camera. We check the card and match it to your details.</Text>

                {[
                  { side: 'front', label: 'Front Side', captured: cnicFront, err: errors.cnicFront, icon: 'card-outline' },
                  { side: 'back', label: 'Back Side', captured: cnicBack, err: errors.cnicBack, icon: 'card' },
                ].map((c) => {
                  // This side is being checked by the backend right now.
                  const isVerifying = verifyingSide === c.side;
                  return (
                    <TouchableOpacity
                      key={c.side}
                      style={[
                        styles.cnicCard,
                        c.captured && styles.cnicCardDone,
                        c.err && styles.cnicCardError,
                        isVerifying && styles.cnicCardBusy,
                      ]}
                      onPress={() => { if (!verifying) { setPendingPhoto(null); setCameraSide(c.side); } }}
                      disabled={verifying}
                      activeOpacity={0.85}
                    >
                      {c.captured ? (
                        <Image source={{ uri: c.captured.uri }} style={styles.cnicThumb} />
                      ) : (
                        <View style={styles.cnicIconBox}>
                          <Ionicons name={c.icon} size={26} color={COLORS.secondary} />
                        </View>
                      )}

                      <View style={styles.cnicInfo}>
                        <Text style={styles.cnicLabel}>{c.label}</Text>
                        <Text style={[
                          styles.cnicStatus,
                          c.captured && { color: '#10B981' },
                          isVerifying && { color: COLORS.primary },
                        ]}>
                          {isVerifying
                            ? 'Verifying…'
                            : c.captured
                              ? 'Verified'
                              : 'Tap to capture'}
                        </Text>
                        {!!c.err && !isVerifying && <Text style={styles.errorText}>{c.err}</Text>}
                      </View>

                      {isVerifying ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Ionicons
                          name={c.captured ? 'checkmark-circle' : 'camera'}
                          size={c.captured ? 24 : 20}
                          color={c.captured ? '#10B981' : COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.terms}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
                  <Text style={styles.termsText}>
                    Photos are used only to verify your identity. Gallery uploads are not accepted — the card must be captured live.
                  </Text>
                </View>
              </>
            )}

            {/* STEP 3 — Security */}
            {step === 3 && (
              <>
                <Text style={styles.stepTitle}>Secure Your Account</Text>
                <Text style={styles.stepSub}>Create a strong password</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.password} onChangeText={(v) => set('password', v)} placeholder="Create a password" placeholderTextColor="#94A3B8" secureTextEntry={!showPw} />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  <PasswordStrength password={form.password} />
                  {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputWrap, errors.confirmPassword && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} placeholder="Re-enter password" placeholderTextColor="#94A3B8" secureTextEntry={!showConfirmPw} />
                    <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                      <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <View style={styles.matchRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.matchText}>Passwords match</Text>
                    </View>
                  )}
                </View>

                <View style={styles.terms}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                  <Text style={styles.termsText}>By creating an account, you agree to our Terms of Service and Privacy Policy.</Text>
                </View>
              </>
            )}
          </View>
          </FadeInView>

          {/* Next / Create button */}
          <FadeInView delay={250}>
          <TouchableOpacity style={styles.nextBtn} onPress={next} disabled={loading} activeOpacity={0.9}>
            <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextInner}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.nextText}>{step < 3 ? 'Continue' : 'Create Account'}</Text>
                  <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          </FadeInView>

          {step === 0 && (
            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Log In</Text></Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 140 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-app camera → manual crop → backend verification (no gallery) */}
      {CNIC_CAPTURE_ENABLED && <Modal visible={!!cameraSide} animationType="slide" onRequestClose={() => !verifying && setCameraSide(null)}>
        {pendingPhoto ? (
          <CropEditor
            photo={pendingPhoto}
            side={cameraSide || 'front'}
            busy={verifying}
            onDone={handleCropDone}
            onRetake={() => !verifying && setPendingPhoto(null)}
          />
        ) : (
          <CnicCamera
            side={cameraSide || 'front'}
            onCapture={handlePhotoTaken}
            onCancel={() => setCameraSide(null)}
          />
        )}
      </Modal>}

      <ModernDatePicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        initialDate={form.dob}
        onSelect={(iso, dateObj) => {
          set('dob', iso);
          setForm((f) => ({ ...f, dobDisplay: dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  // Gradient fades into the page background (same as HomeScreen), so the form
  // card always sits on a soft white area — no hard cut-off to line up.
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: TOP_INSET, paddingBottom: HEADER_PAD_BOTTOM,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  progress: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 14, paddingTop: PROGRESS_PAD_TOP, paddingBottom: PROGRESS_PAD_BOTTOM },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.mintLight, justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressNum: { color: COLORS.tealLight, fontWeight: '800', fontSize: 12 },
  progressNumActive: { color: '#FFFFFF' },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginLeft: 6 },
  progressLabelActive: { color: COLORS.text, fontSize: 11, fontWeight: '700', marginLeft: 6 },
  progressLine: { width: 18, height: 2, backgroundColor: COLORS.border, marginHorizontal: 5 },
  progressLineActive: { backgroundColor: COLORS.primary },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: CARD_GAP },
  // No box: transparent + no border/shadow so the form blends into the screen.
  card: {
    backgroundColor: 'transparent', borderRadius: 0, paddingHorizontal: 0, paddingVertical: 4,
  },
  stepTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  stepSub: { fontSize: 12.5, color: '#64748B', marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 13 },
  label: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 7 },
  optional: { color: '#94A3B8', fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary + '55' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { marginLeft: 14 },
  // +92 country-code chip, sits inside the input on the left.
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingLeft: 14, paddingRight: 10, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: COLORS.primary + '55',
  },
  phonePrefixText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  phoneInput: { paddingLeft: 12 },
  // Fixed "-RB" suffix on the CDA card field.
  cardSuffix: {
    paddingLeft: 10, paddingRight: 14, paddingVertical: 14,
    borderLeftWidth: 1, borderLeftColor: '#E2E8F0',
  },
  cardSuffixText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: COLORS.text },
  eyeBtn: { padding: 12 },
  errorText: { color: '#EF4444', fontSize: 11, marginTop: 5, marginLeft: 4, fontWeight: '500' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  matchText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  terms: { flexDirection: 'row', gap: 8, backgroundColor: '#E4F9F3', borderRadius: 12, padding: 14, marginTop: 4 },

  // ---- CNIC verification cards (step 2) ----
  cnicCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: 14, marginBottom: 12,
  },
  cnicCardDone: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  cnicCardError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  cnicCardBusy: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
  cnicIconBox: {
    width: 58, height: 40, borderRadius: 8,
    backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center',
  },
  cnicThumb: { width: 58, height: 40, borderRadius: 8, resizeMode: 'cover' },
  cnicInfo: { flex: 1 },
  cnicLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cnicStatus: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  termsText: { flex: 1, fontSize: 11, color: '#475569', lineHeight: 18 },

  nextBtn: { marginTop: 14, borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }) },
  nextInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  nextText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  loginLink: { alignItems: 'center', marginTop: 14 },
  loginLinkText: { color: '#64748B', fontSize: 13 },
  loginLinkBold: { color: COLORS.primary, fontWeight: '800' },
});
