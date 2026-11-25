// bottomInset — keep buttons above the phone's navigation bar / home indicator.
//
// Android (edge-to-edge since Expo SDK 54) and iPhones draw every screen
// underneath the system bar at the bottom. Screens add BOTTOM_SPACE as
// paddingBottom on their ROOT container: the root keeps painting its own
// background all the way down (behind the system bar), while the content —
// lists, forms, footers and buttons — ends above it.
//
// initialWindowMetrics is filled synchronously from native, so these values
// can be used inside module-level StyleSheet.create() calls.

import { initialWindowMetrics } from 'react-native-safe-area-context';

// Height of the system navigation bar / home indicator (0 on phones without one).
export const BOTTOM_INSET =
  (initialWindowMetrics && initialWindowMetrics.insets && initialWindowMetrics.insets.bottom) || 0;

// A little breathing room so the last button never sits flush on the bar.
export const BOTTOM_EXTRA = 8;

// What a screen's root container should reserve at the bottom.
export const BOTTOM_SPACE = BOTTOM_INSET + BOTTOM_EXTRA;

export default { BOTTOM_INSET, BOTTOM_EXTRA, BOTTOM_SPACE };
