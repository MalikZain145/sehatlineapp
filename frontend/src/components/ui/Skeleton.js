// Skeleton / shimmer loading placeholders.
//
// Use these INSTEAD of a spinner while data loads — they show the SHAPE of the
// content with an animated shimmer sweep, so screens feel instant and premium.
// Theme-aware (light/dark) via the app ThemeContext, with an optional `dark`
// prop override for screens on a different theme system (e.g. pharmacy).
// Built on expo-linear-gradient + the native driver (no extra dependency).
//
//   <Skeleton width={120} height={16} radius={8} />
//   <SkeletonCircle size={48} />
//   <SkeletonText lines={3} />
//   <SkeletonList count={6} topInset />   // avatar + two lines rows (list screens)
//   <SkeletonCard />                       // a generic content card
//   <SkeletonScreen cards={2} />           // full-screen detail/dashboard load

import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Easing, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_BAR_HEIGHT } from '../../utils/safeArea';

// Top padding that clears the status bar / notch. Pass `topInset` on a skeleton
// that renders at the very top of a screen (i.e. the header isn't shown while
// loading) so the shimmer doesn't sit under the notch / too high.
const TOP_INSET = STATUS_BAR_HEIGHT + 14;

// Palette derived purely from a dark/light flag, so it can be overridden.
function palette(dark) {
  return dark
    ? { base: '#232F45', highlight: '#33415C', surface: '#1A2436', border: '#2A3750' }
    : { base: '#E7ECF3', highlight: '#F6F9FC', surface: '#FFFFFF', border: '#E5E7EB' };
}

// Resolve the effective dark flag: explicit prop wins, else the app theme.
function useDark(darkProp) {
  const { isDark } = useTheme();
  return typeof darkProp === 'boolean' ? darkProp : isDark;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, style, dark }) {
  const { base, highlight } = palette(useDark(dark));
  const progress = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1150, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius, backgroundColor: base, overflow: 'hidden' }, style]}
    >
      {w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
          <LinearGradient colors={[base, highlight, base]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </Animated.View>
      )}
    </View>
  );
}

export function SkeletonCircle({ size = 44, style, dark }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} dark={dark} />;
}

export function SkeletonText({ lines = 3, lastWidth = '60%', gap = 8, height = 12, style, dark }) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={height} width={i === lines - 1 ? lastWidth : '100%'} dark={dark} style={{ marginTop: i === 0 ? 0 : gap }} />
      ))}
    </View>
  );
}

// A list-row placeholder: avatar + two text lines. Matches most lists.
export function SkeletonListItem({ style, dark }) {
  const { surface, border } = palette(useDark(dark));
  return (
    <View style={[styles.row, { backgroundColor: surface, borderColor: border }, style]}>
      <SkeletonCircle size={44} dark={dark} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="55%" height={13} dark={dark} />
        <Skeleton width="80%" height={11} dark={dark} style={{ marginTop: 9 }} />
      </View>
      <Skeleton width={54} height={22} radius={11} dark={dark} />
    </View>
  );
}

export function SkeletonList({ count = 6, style, topInset = false, dark }) {
  return (
    <View style={[{ padding: 14 }, topInset && { paddingTop: TOP_INSET }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} dark={dark} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

// A generic content card: title line + a few body lines.
export function SkeletonCard({ style, dark }) {
  const { surface, border } = palette(useDark(dark));
  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, style]}>
      <Skeleton width="45%" height={16} dark={dark} />
      <SkeletonText lines={3} dark={dark} style={{ marginTop: 14 }} />
    </View>
  );
}

// A full-screen "detail/dashboard" loading state: a couple of cards, with a top
// inset so it clears the status bar when no header is shown while loading.
export function SkeletonScreen({ cards = 2, topInset = true, style, dark }) {
  return (
    <View style={[{ padding: 16 }, topInset && { paddingTop: TOP_INSET }, style]}>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} dark={dark} style={i === 0 ? null : { marginTop: 14 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
});

export default { Skeleton, SkeletonCircle, SkeletonText, SkeletonListItem, SkeletonList, SkeletonCard, SkeletonScreen };
