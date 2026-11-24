// Network status — online / weak / offline — for the whole app.
//
// Two signals are combined:
//   1. NetInfo (device radio): no connection / no internet reachability.
//   2. Real request outcomes from apiClient: timeouts, failures and slow
//      responses. A phone can show "Wi-Fi connected" while the hospital
//      network or the server is barely responding — that is "weak".
//
// Anything can subscribe (the global NetworkBanner, the outbox sync).

let NetInfo = null;
try {
  // eslint-disable-next-line global-require
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) { NetInfo = null; }

const SLOW_MS = 4000;          // a request slower than this = weak connection
const WINDOW = 6;              // look at the last N requests

let deviceOnline = true;       // from NetInfo
let recent = [];               // [{ ok, ms }]
let status = 'online';         // 'online' | 'weak' | 'offline'
const listeners = new Set();

function compute() {
  if (!deviceOnline) return 'offline';
  if (!recent.length) return 'online';
  const last = recent[recent.length - 1];
  // Last 2 requests both failed → server unreachable → offline mode.
  const lastTwo = recent.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((r) => !r.ok)) return 'offline';
  if (!last.ok) return 'weak';
  const slow = recent.filter((r) => r.ok && r.ms > SLOW_MS).length;
  const failed = recent.filter((r) => !r.ok).length;
  if (slow >= 2 || failed >= 1 || last.ms > SLOW_MS) return 'weak';
  return 'online';
}

function update() {
  const next = compute();
  if (next !== status) {
    const prev = status;
    status = next;
    listeners.forEach((fn) => { try { fn(status, prev); } catch (e) { /* ignore */ } });
  }
}

// Called by apiClient after every request.
export function reportRequest(ok, ms) {
  recent.push({ ok, ms });
  if (recent.length > WINDOW) recent = recent.slice(-WINDOW);
  update();
}

export function getStatus() { return status; }
export function isOffline() { return status === 'offline'; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let started = false;
export function startNetworkMonitor() {
  if (started || !NetInfo) return;
  started = true;
  try {
    NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      const was = deviceOnline;
      deviceOnline = online;
      // Coming back online: forget old failures so we don't stay "offline".
      if (online && !was) recent = [];
      update();
    });
  } catch (e) { /* NetInfo native module missing (old build) — request signals still work */ }
}

export default { reportRequest, getStatus, isOffline, subscribe, startNetworkMonitor };
