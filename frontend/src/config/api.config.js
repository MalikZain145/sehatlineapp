// ============================================================
// API configuration — AUTO-DETECTS your backend IP.
// ------------------------------------------------------------
// You do NOT need to set any IP manually.
//
// How it works:
//   • When you run `npx expo start`, your phone connects to the Expo dev
//     server running on your PC. Expo exposes that PC's IP address.
//   • The backend runs on the SAME PC, so we reuse that IP automatically.
//   • If your Wi-Fi/IP changes, it just works — nothing to edit.
//
// For a shared APK (friends on any network) set USE_PRODUCTION = true and
// put your hosted backend URL in PRODUCTION_API_URL.
// ============================================================

import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';

// ---- Production (hosted) backend, used only when USE_PRODUCTION = true ----
// Live backend hosted on Vercel. The shipped APK talks to this URL.
const PRODUCTION_API_URL = 'https://sehatlineapp-arfk.vercel.app';
// TRUE = the app uses the hosted backend above (for the APK / demo).
// FALSE = the app auto-detects the LAN IP of the PC running the backend
//         (the same PC Expo/Metro is served from) — the dev default for
//         running against a local backend over Wi-Fi.
// NOTE: a shareable APK MUST use TRUE so it reaches the live Vercel backend;
// flip to FALSE only for local LAN development, then flip back before building.
const USE_PRODUCTION = true;

const LOCAL_PORT = 5000;

// ---- Manual backend override (highest priority) ----
// Point the app at ANY backend IP without touching auto-detection. Either:
//   • set EXPO_PUBLIC_API_URL=http://192.168.1.11:5000  (full URL), or
//   • set EXPO_PUBLIC_API_IP=192.168.1.11               (just the IP), in
//     frontend/.env, then restart Expo, OR
//   • hard-code MANUAL_API_IP below (e.g. '192.168.1.11').
// Leave MANUAL_API_IP empty to fall back to auto-detection.
const MANUAL_API_IP = '';

function manualBaseUrl() {
  const url = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (url) return url.replace(/\/+$/, '') + (url.endsWith('/api') ? '' : '/api');
  const ip = (process.env.EXPO_PUBLIC_API_IP || MANUAL_API_IP || '').trim();
  if (ip) return `http://${ip}:${LOCAL_PORT}/api`;
  return null;
}

// Pull the dev-server host IP (e.g. "192.168.1.43") from whichever source is
// available on this platform/SDK. This is what makes the app work on ANY IP
// automatically — the backend runs on the same machine as Metro/Expo, so we
// reuse the machine's IP that the phone is already talking to.
function getDevServerIp() {
  const candidates = [
    // Most reliable across Expo Go AND dev/bare builds: Metro's bundle URL,
    // e.g. "http://192.168.1.43:8081/index.bundle?platform=android". This is
    // present whenever the app was loaded from a Metro dev server.
    NativeModules?.SourceCode?.scriptURL,

    // Expo-provided host fields (vary by SDK / Expo Go vs dev client).
    Constants.expoGoConfig?.debuggerHost,          // newer Expo Go
    Constants.expoGoConfig?.hostUri,
    Constants.expoConfig?.hostUri,                 // SDK 49+
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest2?.launchAsset?.url,
    Constants.manifest?.debuggerHost,              // legacy
    Constants.manifest?.hostUri,
    Constants.linkingUri,
    Constants.experienceUrl,
  ].filter(Boolean);

  for (const c of candidates) {
    // c looks like "192.168.1.43:8081", "exp://192.168.1.43:8081" or a full URL.
    const match = String(c).match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    // Ignore loopback (0.0.0.0 / 127.x) — those never reach a phone.
    if (match && match[1] !== '0.0.0.0' && !match[1].startsWith('127.')) {
      return match[1];
    }
  }
  return null;
}

function resolveBaseUrl() {
  // 1) Manual override wins — point at any backend IP you like.
  const manual = manualBaseUrl();
  if (manual) return manual;

  if (USE_PRODUCTION) {
    return `${PRODUCTION_API_URL}/api`;
  }

  // Auto-detected local IP (the PC running Expo + the backend).
  const ip = getDevServerIp();
  if (ip) {
    return `http://${ip}:${LOCAL_PORT}/api`;
  }

  // Fallbacks if detection fails:
  //  • Android emulator reaches the host machine at 10.0.2.2
  //  • otherwise localhost (iOS simulator / web)
  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}/api`;
  return `http://localhost:${LOCAL_PORT}/api`;
}

// The backend runs on the SAME PC as the Expo/Metro dev server, so the app
// reuses the LAN IP the phone is already connected to (getDevServerIp above).
// The frontend auto-detects the backend IP - no manual configuration needed.
// getApiBaseUrl()/bootstrapApiBaseUrl() are kept so apiClient, socket and
// SessionContext need no changes.
let _resolvedBase = resolveBaseUrl();
export let API_BASE_URL = _resolvedBase;

export function getApiBaseUrl() {
  return _resolvedBase;
}

// Re-resolve the local backend URL at startup (the dev-server IP is available
// by then). Purely local - no remote/network config.
export async function bootstrapApiBaseUrl() {
  _resolvedBase = resolveBaseUrl();
  API_BASE_URL = _resolvedBase;
  console.log("[SehatLine] API base URL ->", _resolvedBase);
  return _resolvedBase;
}

// Session heartbeat interval (ms).
export const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Client-side inactivity limit (ms) — matches backend SESSION_INACTIVITY_MINUTES.
export const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

export default { API_BASE_URL, HEARTBEAT_INTERVAL_MS, INACTIVITY_LIMIT_MS };
