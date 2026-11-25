// NetworkBanner — app-wide connection notice.
//
//   offline → red:    "You're offline — showing saved data. N change(s) will sync."
//   weak    → amber:  "Weak connection — the app may be slower."
//   back    → green:  "Back online — N change(s) synced" (auto-hides)
//   failed  → red:    "Couldn't sync: <server reason>" (e.g. slot taken meanwhile)
//
// Sits above every screen and is purely informational (touches pass through).
// No manual Retry: the outbox re-syncs on its own when the connection
// changes, when the app returns to the foreground and on a periodic timer.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import network from '../../services/network';
import { onOutboxChange, getPendingWrites } from '../../services/apiClient';
import { STATUS_BAR_HEIGHT } from '../../utils/safeArea';

const COLORS = {
  offline: '#DC2626',
  weak: '#D97706',
  synced: '#16A34A',
  failed: '#B91C1C',
};

export default function NetworkBanner() {
  const [status, setStatus] = useState(network.getStatus());
  const [pending, setPending] = useState(0);
  const [flash, setFlash] = useState(null); // { kind, text }
  const anim = useRef(new Animated.Value(0)).current;
  const flashTimer = useRef(null);

  useEffect(() => {
    getPendingWrites().then((l) => setPending(l.length)).catch(() => {});
    const unNet = network.subscribe((s, prev) => {
      setStatus(s);
      if (prev === 'offline' && s !== 'offline') showFlash('synced', 'Back online');
    });
    const unOut = onOutboxChange(({ pending: p, synced, failed }) => {
      setPending(p);
      if (synced) showFlash('synced', `Back online — ${synced} change${synced === 1 ? '' : 's'} synced`);
      if (failed) showFlash('failed', `Couldn't sync ${failed.label || 'an action'}: ${failed.error || 'rejected by server'}`, 7000);
    });
    return () => { unNet(); unOut(); if (flashTimer.current) clearTimeout(flashTimer.current); };
  }, []);

  const showFlash = (kind, text, ms = 3500) => {
    setFlash({ kind, text });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  };

  let kind = null; let text = ''; let icon = 'cloud-offline-outline';
  if (status === 'offline') {
    kind = 'offline'; icon = 'cloud-offline-outline';
    text = pending
      ? `You're offline — ${pending} change${pending === 1 ? '' : 's'} will sync automatically`
      : "You're offline — showing saved data";
  } else if (flash) {
    kind = flash.kind; text = flash.text;
    icon = flash.kind === 'failed' ? 'alert-circle-outline' : 'checkmark-circle-outline';
  } else if (status === 'weak') {
    kind = 'weak'; icon = 'cellular-outline';
    text = pending ? `Weak connection — syncing ${pending} change${pending === 1 ? '' : 's'}…` : 'Weak connection — the app may be slower';
  } else if (pending) {
    kind = 'weak'; icon = 'sync-outline';
    text = `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;
  }

  const visible = !!kind;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: COLORS[kind], paddingTop: STATUS_BAR_HEIGHT + 4 },
          { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }] },
        ]}
      >
        <View style={styles.row}>
          <Ionicons name={icon} size={16} color="#FFF" />
          <Text style={styles.text} numberOfLines={2}>{text}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingBottom: 8, paddingHorizontal: 14, zIndex: 9999, elevation: 30,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { color: '#FFF', fontSize: 12.5, fontWeight: '700', marginLeft: 8, flex: 1 },
});
