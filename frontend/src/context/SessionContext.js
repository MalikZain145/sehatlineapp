// ============================================================
// SessionContext
// Global session/auth state + the two auto-logout mechanisms:
//
//   1) INACTIVITY: an app-wide timer resets on every touch. If it fires
//      (INACTIVITY_LIMIT_MS with no interaction), we log out.
//
//   2) SERVER REJECTION: apiClient calls our onUnauthorized handler on any
//      401 (expired token, server-side inactivity, or fingerprint mismatch),
//      and we log out + send the user to Login.
//
// Wrap your navigator in <SessionProvider> and put <ActivityWrapper> around
// the app so touches reset the inactivity timer.
// ============================================================

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authService from '../modules/auth/services/authService';
import { setUnauthorizedHandler } from '../services/apiClient';
import { getExpoPushToken, addNotificationResponseListener } from '../services/notifications';
import { onSystemRestart } from '../services/socket';
import { reloadApp } from '../utils/appReload';
import { INACTIVITY_LIMIT_MS, HEARTBEAT_INTERVAL_MS, bootstrapApiBaseUrl } from '../config/api.config';

const SessionContext = createContext(null);

export function SessionProvider({ children, navigationRef }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const inactivityTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const userRef = useRef(null);
  const loggingOutRef = useRef(false);

  // Keep a ref of the current user so memoized callbacks see the latest value.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ---- logout (shared) ----
  // Only forces navigation to Login if someone was actually logged in.
  // This prevents flicker/loops on boot or transient network errors.
  const doLogout = useCallback(async (reason) => {
    // Prevent overlapping/looping logouts (heartbeat + 401 + manual can all fire).
    if (loggingOutRef.current) return reason;
    loggingOutRef.current = true;

    clearTimers();
    const wasLoggedIn = !!userRef.current;
    try {
      await authService.logout();
    } catch (_) {
      // ignore — clearing locally regardless
    }
    setUser(null);
    // Clear per-doctor cached profile so the NEXT account that logs in on this
    // device doesn't inherit the previous doctor's name/specialty/photo.
    try {
      await AsyncStorage.multiRemove([
        '@sehatline_userData',
        '@sehatline_profile_image',
        '@sehatline_queue',
      ]);
    } catch (_) { /* ignore */ }
    if (wasLoggedIn && navigationRef?.current) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
    // small delay before allowing another logout (lets navigation settle)
    setTimeout(() => { loggingOutRef.current = false; }, 1000);
    return reason;
  }, [navigationRef]);

  function clearTimers() {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    inactivityTimer.current = null;
    heartbeatTimer.current = null;
  }

  // ---- inactivity timer ----
  const resetInactivity = useCallback(() => {
    if (!user) return;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      doLogout('inactivity');
    }, INACTIVITY_LIMIT_MS);
  }, [user, doLogout]);

  // ---- heartbeat: server-side session validity check ----
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = setInterval(async () => {
      try {
        await authService.heartbeat(); // 401 → handled globally → logout
      } catch (_) {
        // apiClient already triggered logout on 401
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  // ---- register the global 401 handler once ----
  useEffect(() => {
    setUnauthorizedHandler(() => {
      doLogout('server');
    });
  }, [doLogout]);

  // ---- boot: restore session if a token exists ----
  useEffect(() => {
    // OTA updates are handled by <UpdatePrompt /> (asks the user first).
    (async () => {
      try {
        // Resolve the current backend URL (from the GitHub config) BEFORE any
        // API call, so login/session validation hit the live tunnel address.
        await bootstrapApiBaseUrl();
        const raw = await AsyncStorage.getItem(authService.USER_KEY);
        if (raw) {
          // Validate with server. OFFLINE: if the server can't be reached,
          // keep the saved session so the app still opens and works from the
          // offline cache (a real 401 still logs out via the global handler).
          let res = null;
          try {
            res = await authService.me();
          } catch (e) {
            if (e && (e.code === 'NETWORK' || e.code === 'TIMEOUT')) {
              try { setUser(JSON.parse(raw)); } catch (_) { setUser(null); }
              return;
            }
            throw e;
          }
          setUser(res.user);
          // Returning user — (re)register this device's push token.
          getExpoPushToken()
            .then((t) => { if (t) authService.registerPushToken(t).catch(() => {}); })
            .catch(() => {});
        }
      } catch (_) {
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // ---- when user changes, (re)start timers ----
  useEffect(() => {
    if (user) {
      resetInactivity();
      startHeartbeat();
    } else {
      clearTimers();
    }
    return clearTimers;
  }, [user, resetInactivity, startHeartbeat]);

  // ---- pause/resume on app background ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') resetInactivity();
    });
    return () => sub.remove();
  }, [resetInactivity]);

  // Called by screens after a successful login/signup.
  //
  // authService already writes the user to storage, but only on its own login
  // paths. Writing here too means any screen that seeds itself from the cache
  // (Profile, Home, Sidebar) sees the same object, whatever route the user
  // took to get authenticated.
  const onAuthenticated = useCallback((u) => {
    setUser(u);
    if (u) {
      AsyncStorage.setItem(authService.USER_KEY, JSON.stringify(u)).catch(() => {});
      // Register this device for push so notifications arrive while the app is
      // closed. Best-effort and silent (no-op in Expo Go / without EAS setup).
      getExpoPushToken()
        .then((t) => { if (t) authService.registerPushToken(t).catch(() => {}); })
        .catch(() => {});
    }
  }, []);

  // When the admin restarts the backend, connected apps reload themselves once
  // it's back up (guarded so it only fires once per event).
  useEffect(() => {
    let done = false;
    const unsub = onSystemRestart(() => {
      if (done) return; done = true;
      setTimeout(() => { reloadApp().catch(() => {}); }, 6000);
    });
    return () => unsub && unsub();
  }, []);

  // Tapping a push/notification deep-links to the screen it carries.
  useEffect(() => {
    const unsub = addNotificationResponseListener((data) => {
      const screen = data?.screen;
      if (screen && navigationRef?.current) {
        try { navigationRef.current.navigate(screen, data.refId ? { refId: data.refId } : undefined); } catch (e) {}
      }
    });
    return unsub;
  }, [navigationRef]);

  const value = {
    user,
    booting,
    onAuthenticated,
    logout: doLogout,
    resetInactivity, // ActivityWrapper calls this on touch
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export default SessionContext;
