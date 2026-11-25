// BottomSheet — a reusable bottom sheet that slides up and can be dismissed by
// dragging the grabber down (or tapping the dim backdrop), the way native app
// sheets behave. Drop-in replacement for the hand-rolled
// <Modal><View sheetOverlay><View sheet>…</View></View></Modal> pattern.
//
// Usage:
//   <BottomSheet visible={show} onClose={() => setShow(false)}
//                overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
//     …sheet content…
//   </BottomSheet>
//
// No visible grabber — the whole sheet is swipe-to-dismiss (drag it down) and
// the dim backdrop closes on tap. The pan only claims clearly-downward drags,
// so inner ScrollViews / lists keep scrolling normally (a child ScrollView wins
// the gesture except when it's already at the top). Pass dismissable={false}
// for a sheet that must not be swiped away.

import React, { useRef, useEffect, useCallback } from 'react';
import {
  Modal, Animated, PanResponder, KeyboardAvoidingView, View,
  TouchableWithoutFeedback, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

// A Modal opens in its own window, outside the app's bottom padding, and is
// drawn edge-to-edge (under the Android nav bar / iPhone home indicator).
// This spacer keeps the sheet's last button above the system bar.
const SHEET_BOTTOM = ((initialWindowMetrics && initialWindowMetrics.insets.bottom) || 0) + 8;

export default function BottomSheet({
  visible,
  onClose,
  children,
  overlayStyle,
  sheetStyle,
  avoidKeyboard = true,
  dismissable = true,
}) {
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(height)).current;

  const animateIn = useCallback(() => {
    translateY.setValue(height);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
  }, [height, translateY]);

  const dismiss = useCallback(() => {
    if (!dismissable) return;
    Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(() => {
      onClose && onClose();
    });
  }, [dismissable, height, onClose, translateY]);

  useEffect(() => { if (visible) animateIn(); }, [visible, animateIn]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => dismissable && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (dismissable && (g.dy > 120 || g.vy > 0.6)) {
          Animated.timing(translateY, { toValue: height, duration: 180, useNativeDriver: true }).start(() => { onClose && onClose(); });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = avoidKeyboard ? { behavior: Platform.OS === 'ios' ? 'padding' : undefined } : {};

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Wrapper {...wrapperProps} style={[styles.overlay, overlayStyle]}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <Animated.View style={[sheetStyle, { transform: [{ translateY }] }]} {...pan.panHandlers}>
          {children}
          <View style={{ height: SHEET_BOTTOM }} />
        </Animated.View>
      </Wrapper>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
});
