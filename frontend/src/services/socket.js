// Real-time socket connection to the backend.
// Emits/receives queue + stats updates so the UI stays live.
//
// socket.io-client is loaded defensively — if it isn't installed yet, the
// app still works (real-time just won't fire) instead of crashing.

import { AppState } from 'react-native';
import { getApiBaseUrl } from '../config/api.config';

let ioClient = null;
try {
  // eslint-disable-next-line global-require
  ioClient = require('socket.io-client').io;
} catch (e) {
  ioClient = null;
}

// The base URL ends with /api — strip it for the socket origin. Resolved at
// connect time (not import) so it reflects the dynamically-loaded backend URL.
function getSocketUrl() {
  return getApiBaseUrl().replace(/\/api$/, '');
}

let socket = null;

// Connect once and reuse. Safe to call multiple times.
export function connectSocket() {
  if (!ioClient) return null; // socket.io-client not installed
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = ioClient(getSocketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 8000,
    });
  } else {
    socket.connect();
  }
  return socket;
}

// ── Polling fallback ─────────────────────────────────────────────────────
// The hosted backend (Vercel serverless) can't keep WebSockets open, so on the
// live APK no 'queue:update' / 'pharmacy:update' events ever arrive — that is
// why e.g. a prescription the doctor just sent only appeared in the pharmacy
// after a manual pull-to-refresh. Every subscription below therefore also
// re-runs its handler every POLL_MS while the socket is NOT connected (and the
// app is in the foreground). When the socket is live, events drive updates.
const POLL_MS = 12000;
let appActive = true;
try { AppState.addEventListener('change', (s) => { appActive = s === 'active'; }); } catch (e) { /* ignore */ }

function withPolling(event, handler) {
  const s = connectSocket();
  if (s) s.on(event, handler);
  const timer = setInterval(() => {
    if (!appActive) return;
    if (s && s.connected) return;
    try { handler({ type: 'poll' }); } catch (e) { /* ignore */ }
  }, POLL_MS);
  return () => {
    clearInterval(timer);
    if (s) s.off(event, handler);
  };
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}

// Subscribe to queue updates. Returns an unsubscribe function.
export function onQueueUpdate(handler) {
  return withPolling('queue:update', handler);
}

// Subscribe to Admin portal updates (doctors/patients/reports changed).
export function onAdminUpdate(handler) {
  return withPolling('admin:update', handler);
}

// Subscribe to Pharmacy updates (queue / inventory / LP changes).
export function onPharmacyUpdate(handler) {
  return withPolling('pharmacy:update', handler);
}

// Subscribe to Blood Donor Network updates (new/responded/fulfilled requests).
export function onBloodUpdate(handler) {
  return withPolling('blood:update', handler);
}

// Subscribe to Health Camps updates (new camp / registrations).
export function onHealthCampUpdate(handler) {
  return withPolling('camp:update', handler);
}

// Admin-triggered backend restart — connected clients reload once it's back.
export function onSystemRestart(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('system:restart', handler);
  return () => s.off('system:restart', handler);
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}

export default { connectSocket, onQueueUpdate, onBloodUpdate, onHealthCampUpdate, onSystemRestart, disconnectSocket };
