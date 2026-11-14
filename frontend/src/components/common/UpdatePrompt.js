// UpdatePrompt — over-the-air (OTA) update gate.
//
// On launch (and whenever the app comes back to the foreground) it asks the
// EAS Update server whether a newer JS bundle was published for this build's
// channel. If yes, it shows "New update available" — the user taps Update,
// the bundle downloads, and the app restarts on the new version. No APK
// reinstall needed for JS/asset changes.
//
// Only native changes (new native module, app.json permissions, SDK upgrade)
// still need a fresh APK — `runtimeVersion` (appVersion policy) makes sure an
// old APK never receives a bundle it can't run.
//
// No-op in development / Expo Go (Updates.isEnabled is false there).

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, AppState, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

let Updates = null;
try {
  // eslint-disable-next-line global-require
  Updates = require('expo-updates');
} catch (e) { Updates = null; }

// Set to true to block the app until the user updates (no "Later" button).
const FORCE_UPDATE = false;
// Don't hammer the update server: at most one check per this many ms.
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function UpdatePrompt() {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lastCheck = useRef(0);
  const dismissed = useRef(false);

  const enabled = !!(Updates && Updates.isEnabled) && !(typeof __DEV__ !== 'undefined' && __DEV__);

  const check = useCallback(async () => {
    if (!enabled || dismissed.current) return;
    const now = Date.now();
    if (now - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
    lastCheck.current = now;
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res && res.isAvailable) setVisible(true);
    } catch (e) { /* offline / server down — just carry on with current version */ }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub && sub.remove && sub.remove();
  }, [enabled, check]);

  const doUpdate = async () => {
    setBusy(true);
    setError('');
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // restarts the app on the new bundle
    } catch (e) {
      setBusy(false);
      setError('Update download failed. Check your internet and try again.');
    }
  };

  const later = () => { dismissed.current = true; setVisible(false); };

  if (!enabled) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={FORCE_UPDATE ? () => {} : later}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download-outline" size={34} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>New Update Available</Text>
          <Text style={styles.body}>
            A newer version of SehatLine is ready. Update now to get the latest fixes and features — it only takes a few seconds.
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.75 }]} onPress={doUpdate} disabled={busy} activeOpacity={0.85}>
            {busy ? (
              <>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.primaryText}>  Updating…</Text>
              </>
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.primaryText}>  Update Now</Text>
              </>
            )}
          </TouchableOpacity>

          {!FORCE_UPDATE && !busy && (
            <TouchableOpacity onPress={later} style={styles.laterBtn} activeOpacity={0.7}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: COLORS.card || '#FFF', borderRadius: 22,
    paddingVertical: 26, paddingHorizontal: 22, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(11,170,157,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  body: { fontSize: 13.5, color: COLORS.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  error: { fontSize: 12.5, color: '#EF4444', textAlign: 'center', marginTop: 10 },
  primaryBtn: {
    marginTop: 20, alignSelf: 'stretch', backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  laterBtn: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 16 },
  laterText: { color: COLORS.textLight, fontSize: 14, fontWeight: '700' },
});
