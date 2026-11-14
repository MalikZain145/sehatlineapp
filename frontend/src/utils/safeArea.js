// safeArea — one source of truth for the status-bar / notch height.
//
// WHY: screens used to hard-code the iOS top padding (`Platform.OS === 'ios'
// ? 56 : …`) or reused StatusBar.currentHeight, which is ANDROID-ONLY (it is
// undefined on iOS). That is why layouts looked right on Android but broke on
// iPhones: on Dynamic-Island phones (inset 59) the header slid under the
// island, on an iPhone SE (inset 20) there was a huge empty gap, and the
// lab/pharmacy headers (fixed 45px) sat under the clock.
//
// `initialWindowMetrics` is filled in synchronously by
// react-native-safe-area-context from the native side, so it can be used in
// module-level StyleSheet.create() calls (no hook needed).
//
// Android values are UNCHANGED — STATUS_BAR_HEIGHT there is exactly the old
// `StatusBar.currentHeight || 28`, so nothing moves on Android.

import { Platform, StatusBar } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

const ANDROID_ASSUMED = 28; // the value the Android-first layouts were tuned for

const nativeTop = initialWindowMetrics && initialWindowMetrics.insets
  ? initialWindowMetrics.insets.top
  : null;

// Real height of the status bar / notch / Dynamic Island area.
export const STATUS_BAR_HEIGHT = Platform.OS === 'ios'
  ? (typeof nativeTop === 'number' && nativeTop > 0 ? nativeTop : 47)
  : (StatusBar.currentHeight || ANDROID_ASSUMED);

// How much taller the iOS top inset is than the 28px the Android layouts
// assumed. 0 on Android.
export const TOP_SHIFT = Platform.OS === 'ios' ? STATUS_BAR_HEIGHT - ANDROID_ASSUMED : 0;

// Convert a hard-coded Android top padding/height (tuned for a ~28px status
// bar) into one that is correct on every iPhone. Identity on Android.
export const topPad = (androidValue) => Math.max(0, androidValue + TOP_SHIFT);

export default { STATUS_BAR_HEIGHT, TOP_SHIFT, topPad };
