// BiometricSheet — enrol this device's fingerprint against the account.
//
// Two gates, in order:
//   1. Password. Proves the person holding the phone is the account owner and
//      not someone who picked it up unlocked.
//   2. A live fingerprint scan. Produces the device token we store, hashed.
//
// At login the same token is hashed and matched against every account, so the
// fingerprint alone identifies who is signing in — no email needed.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import settingsService from '../../modules/patient/services/settingsService';
import { authenticateBiometric, isBiometricAvailable } from '../../utils/biometric';
import { useTheme } from "../../context/ThemeContext";
const {
  width
} = Dimensions.get('window');
const STEP = {
  PASSWORD: 'password',
  SCAN: 'scan'
};
export default function BiometricSheet({
  visible,
  onClose,
  onDone
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [step, setStep] = useState(STEP.PASSWORD);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reset = () => {
    setStep(STEP.PASSWORD);
    setPassword('');
    setShow(false);
    setError('');
    setBusy(false);
  };
  const close = () => {
    if (!busy) {
      reset();
      onClose();
    }
  };

  // Step 1 — verify the password *before* asking for a fingerprint. Checking
  // both together meant a typo only surfaced after the user had already
  // scanned, which is a confusing place to be told to go back.
  const continueToScan = async () => {
    if (!password) return setError('Enter your password to continue.');
    setBusy(true);
    setError('');
    try {
      await settingsService.verifyPassword(password);
    } catch (e) {
      setBusy(false);
      setError(e.code === 'BAD_PASSWORD' ? 'That password is incorrect.' : e.message || 'Could not verify your password.');
      return;
    }
    const available = await isBiometricAvailable();
    setBusy(false);
    if (!available) {
      setError('No fingerprint is set up on this device. Add one in your phone settings first.');
      return;
    }
    setStep(STEP.SCAN);
  };

  // Step 2 — scan, then send the raw device token. The backend hashes it the
  // same way it will at login, so the two always agree. The password goes with
  // it because the enrol endpoint re-checks it; by now we know it's right.
  const scanAndSave = async () => {
    setBusy(true);
    setError('');
    try {
      const bio = await authenticateBiometric('Scan your fingerprint to enable sign-in');
      if (!bio.success) {
        setBusy(false);
        setError(bio.message || 'Fingerprint was not recognised.');
        return;
      }
      await settingsService.setBiometric({
        enabled: true,
        password,
        fingerprintHash: bio.deviceToken
      });
      setBusy(false);
      reset();
      onDone();
    } catch (e) {
      setBusy(false);
      // The password was already verified, so this is almost certainly a
      // network or server problem — keep the user on the scan step.
      setError(e.message || 'Could not enable biometric sign-in.');
    }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconDisc}>
            <Ionicons name="finger-print" size={26} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Enable Biometric Login</Text>

          {step === STEP.PASSWORD ? <>
              <Text style={styles.subtitle}>Confirm your password, then scan your fingerprint.</Text>

              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={17} color={COLORS.textLight} />
                <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#9CA3AF" secureTextEntry={!show} autoCapitalize="none" value={password} onChangeText={v => {
              setPassword(v);
              setError('');
            }} />
                <TouchableOpacity onPress={() => setShow(!show)} hitSlop={HIT}>
                  <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {!!error && <ErrorBox text={error} />}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={close} disabled={busy} activeOpacity={0.7}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, busy && styles.btnDisabled]} onPress={continueToScan} disabled={busy} activeOpacity={0.85}>
                  {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Continue</Text>}
                </TouchableOpacity>
              </View>
            </> : <>
              <Text style={styles.subtitle}>Place your finger on the sensor when prompted.</Text>

              <View style={styles.scanArea}>
                <View style={[styles.scanRing, busy && styles.scanRingActive]}>
                  <Ionicons name="finger-print" size={44} color={busy ? COLORS.primary : COLORS.tealLight} />
                </View>
                <Text style={styles.scanHint}>
                  {busy ? 'Scanning…' : 'Ready when you are'}
                </Text>
              </View>

              {!!error && <ErrorBox text={error} />}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => {
              setStep(STEP.PASSWORD);
              setError('');
            }} disabled={busy} activeOpacity={0.7}>
                  <Text style={styles.btnGhostText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, busy && styles.btnDisabled]} onPress={scanAndSave} disabled={busy} activeOpacity={0.85}>
                  {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Scan Fingerprint</Text>}
                </TouchableOpacity>
              </View>
            </>}
        </View>
      </KeyboardAvoidingView>
    </Modal>;
}
const HIT = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};
function ErrorBox({
  text
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
      <Text style={styles.errorText}>{text}</Text>
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: Math.min(width - 48, 350),
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
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
    alignSelf: 'center',
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 18
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13
  },
  input: {
    flex: 1,
    paddingVertical: 12.5,
    fontSize: 14,
    color: COLORS.text
  },
  scanArea: {
    alignItems: 'center',
    paddingVertical: 8
  },
  scanRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanRingActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.mintLight
  },
  scanHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 12,
    fontWeight: '600'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18
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
    flex: 1.3,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13.5
  },
  btnDisabled: {
    opacity: 0.65
  }
});