// ============================================================
// API client
// A thin fetch wrapper that:
//   • prefixes API_BASE_URL
//   • attaches the JWT (Authorization: Bearer ...)
//   • attaches the device fingerprint hash (x-fingerprint) so the
//     backend can enforce device binding
//   • on any 401, clears the session and calls the registered
//     onUnauthorized handler → the app navigates to Login (auto-logout)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getApiBaseUrl } from '../config/api.config';
import network from './network';

const TOKEN_KEY = 'auth_token';
const FP_KEY = 'device_fingerprint_hash';

// The app registers a callback here (see SessionContext) so the client
// can force a logout/navigation when the server rejects the session.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function getFingerprint() {
  return AsyncStorage.getItem(FP_KEY);
}

// ── Offline-first layer ───────────────────────────────────────────────────
// • Every successful GET is cached on the phone (per user). If the network is
//   down / times out, the cached copy is returned (flag `_offline: true`), so
//   every screen keeps working offline with the last data it saw.
// • On a weak connection, a cached GET is shown after ~2.5 s instead of
//   making the user wait 20 s; the real response still lands in the cache.
// • Writes (book appointment, take token, doctor "proceed", pharmacy/lab
//   actions, vitals…) that can't reach the server are saved in an OUTBOX and
//   sent automatically when the connection returns — nothing is lost.
// • Every write carries an Idempotency-Key, so a request that DID reach the
//   server but whose reply was lost (weak signal) is never applied twice
//   when it is retried (backend: middleware/idempotency.js).

const CACHE_PREFIX = '@apicache:';
const OUTBOX_KEY = '@sehatline_outbox_v1';
const FAILED_KEY = '@sehatline_outbox_failed_v1';
const RACE_MS = 2500;                 // weak network: show cache after this
const MUTATION_FRESH_MS = 30000;      // after a write, wait for fresh data

const memCache = new Map();
const inflight = new Map();
let nsCache = null;
let lastMutationAt = 0;

async function namespace() {
  if (nsCache) return nsCache;
  try {
    const raw = await AsyncStorage.getItem('userData');
    const u = raw ? JSON.parse(raw) : null;
    nsCache = String(u?._id || u?.id || u?.email || 'anon');
  } catch (e) { nsCache = 'anon'; }
  return nsCache;
}
function resetNamespace() { nsCache = null; memCache.clear(); }

async function cacheGet(path) {
  const ns = await namespace();
  const k = `${ns}|${path}`;
  if (memCache.has(k)) return memCache.get(k);
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + k);
    if (raw) { const v = JSON.parse(raw); memCache.set(k, v); return v; }
  } catch (e) { /* ignore */ }
  return null;
}
async function cacheSet(path, data) {
  const ns = await namespace();
  const k = `${ns}|${path}`;
  const v = { data, at: Date.now() };
  memCache.set(k, v);
  try { await AsyncStorage.setItem(CACHE_PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage full — memory cache still works */ }
}
export async function clearApiCache() {
  memCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch (e) { /* ignore */ }
}

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const isNetErr = (e) => e && (e.code === 'NETWORK' || e.code === 'TIMEOUT');

// Raw HTTP call (no cache / outbox).
async function rawRequest(path, { method = 'GET', body, headers = {}, isForm = false, idemKey, timeoutMs } = {}) {
  const token = await getToken();
  const fp = await getFingerprint();

  const finalHeaders = { ...headers };
  if (!isForm) finalHeaders['Content-Type'] = 'application/json';
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (fp) finalHeaders['x-fingerprint'] = fp;
  if (idemKey) finalHeaders['Idempotency-Key'] = idemKey;

  let res;
  // Abort the request if it takes too long, so the UI never gets stuck.
  const limit = timeoutMs || (isForm ? 60000 : 20000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), limit);
  const t0 = Date.now();

  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: finalHeaders,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (networkErr) {
    clearTimeout(timeoutId);
    network.reportRequest(false, Date.now() - t0);
    // Timeout or network / server unreachable
    if (networkErr.name === 'AbortError') {
      throw {
        code: 'TIMEOUT',
        message: 'The request took too long. Please try again.',
      };
    }
    throw {
      code: 'NETWORK',
      message: 'Cannot reach server. Check your connection and the API address.',
    };
  }
  // 5xx from a gateway/proxy = server unreachable for our purposes.
  network.reportRequest(!(res.status >= 502 && res.status <= 504), Date.now() - t0);

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }

  // A 401 means one of two very different things:
  //
  //   • The session is gone — expired, revoked, timed out. The app must
  //     return the user to the login screen.
  //   • The user typed the wrong password into a form on a screen they are
  //     legitimately signed in to. Signing them out for that is hostile: they
  //     lose their place, and the mistake they were about to correct.
  //
  // Only the first set of codes, all raised by the auth middleware, should
  // tear down the session.
  const SESSION_FAILURES = new Set([
    'NO_TOKEN', 'BAD_TOKEN', 'NO_SESSION', 'INACTIVE', 'NO_USER',
    'FINGERPRINT_MISMATCH_SESSION',
  ]);

  if (res.status === 401) {
    const code = data.code || 'UNAUTHORIZED';
    const isSessionFailure = SESSION_FAILURES.has(code) || !data.code;

    if (isSessionFailure) {
      await AsyncStorage.multiRemove([TOKEN_KEY]);
      // Don't trigger the global handler for the logout endpoint itself —
      // that loops.
      const isLogout = path.includes('/auth/logout');
      if (onUnauthorized && !isLogout) onUnauthorized(data);
      throw { code, message: data.message || 'Session ended.', status: 401, session: true };
    }

    // A form-level rejection. Hand it back to the caller to display.
    throw { code, message: data.message || 'Request failed', status: 401 };
  }

  if (res.status >= 502 && res.status <= 504) {
    throw { code: 'NETWORK', message: 'Server is not responding right now.', status: res.status };
  }

  if (!res.ok) {
    throw { code: data.code || 'ERROR', message: data.message || 'Request failed', status: res.status };
  }

  return data;
}

// ── GET with cache ────────────────────────────────────────────────────────
async function cachedGet(path, opts = {}) {
  if (opts.noCache) return rawRequest(path, { ...opts, method: 'GET' });
  if (inflight.has(path)) return inflight.get(path);

  const p = (async () => {
    const cached = await cacheGet(path);
    const wrap = (c, flag) => ({ ...(c.data || {}), [flag]: true, _cachedAt: c.at });

    // Known offline (no radio / server down) → answer from cache instantly.
    if (cached && network.isOffline()) {
      // Still probe in the background so we notice when it's back.
      rawRequest(path, { ...opts, method: 'GET', timeoutMs: 8000 }).then((d) => cacheSet(path, d)).catch(() => {});
      return wrap(cached, '_offline');
    }

    const live = rawRequest(path, { ...opts, method: 'GET' }).then(async (d) => { await cacheSet(path, d); return d; });

    const recentWrite = Date.now() - lastMutationAt < MUTATION_FRESH_MS;
    if (cached && !recentWrite && network.getStatus() !== 'online') {
      // Weak network: whichever comes first — fresh data or ~2.5 s.
      let timer;
      const fallback = new Promise((resolve) => { timer = setTimeout(() => resolve('__cache__'), RACE_MS); });
      try {
        const winner = await Promise.race([live, fallback]);
        clearTimeout(timer);
        if (winner !== '__cache__') return winner;
        live.catch(() => {}); // keep updating the cache in the background
        return wrap(cached, '_stale');
      } catch (e) {
        clearTimeout(timer);
        if (isNetErr(e)) return wrap(cached, '_offline');
        throw e;
      }
    }

    try {
      return await live;
    } catch (e) {
      if (cached && isNetErr(e)) return wrap(cached, '_offline');
      throw e;
    }
  })();

  inflight.set(path, p);
  try { return await p; } finally { inflight.delete(path); }
}

// ── Outbox (offline writes) ───────────────────────────────────────────────
// Writes that must NEVER be queued (need an immediate real answer).
const NO_QUEUE = [/^\/auth\//, /\/cnic\//, /\/backup/, /\/system\//, /\/upload/];
let outbox = null;            // [{ id, key, path, method, body, createdAt, label, tries }]
const outboxListeners = new Set();
let flushing = false;

async function loadOutbox() {
  if (outbox) return outbox;
  try { outbox = JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) || '[]'); } catch (e) { outbox = []; }
  return outbox;
}
async function saveOutbox() {
  try { await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox || [])); } catch (e) { /* ignore */ }
  const pending = (outbox || []).length;
  outboxListeners.forEach((fn) => { try { fn({ pending }); } catch (e) { /* ignore */ } });
}
async function recordFailed(entry, err) {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(FAILED_KEY)) || '[]');
    list.unshift({ ...entry, error: err?.message || 'Rejected by server', failedAt: Date.now() });
    await AsyncStorage.setItem(FAILED_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (e) { /* ignore */ }
  outboxListeners.forEach((fn) => { try { fn({ pending: (outbox || []).length, failed: { ...entry, error: err?.message } }); } catch (e) { /* ignore */ } });
}

export async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  let synced = 0;
  try {
    await loadOutbox();
    const ns = await namespace();
    // Only send writes that belong to the user who is signed in now (a
    // different user may have logged in on a shared hospital phone).
    while (outbox.some((x) => (x.ns || ns) === ns)) {
      const e = outbox.find((x) => (x.ns || ns) === ns);
      try {
        await rawRequest(e.path, { method: e.method, body: e.body, idemKey: e.key });
        outbox = outbox.filter((x) => x !== e); synced += 1; lastMutationAt = Date.now();
        await saveOutbox();
      } catch (err) {
        if (isNetErr(err)) break;                     // still offline — try later
        if (err && err.session) break;                // logged out — keep for after login
        if (err && (err.status === 429 || err.status === 408)) break;
        // Server refused it (e.g. slot taken meanwhile). Don't retry forever.
        outbox = outbox.filter((x) => x !== e);
        await saveOutbox();
        await recordFailed(e, err);
      }
    }
  } finally {
    flushing = false;
  }
  if (synced) outboxListeners.forEach((fn) => { try { fn({ pending: outbox.length, synced }); } catch (e) { /* ignore */ } });
}

async function enqueue(path, method, body, key, label) {
  await loadOutbox();
  outbox.push({ id: key, key, path, method, body, label: label || '', ns: await namespace(), createdAt: Date.now() });
  await saveOutbox();
}

async function write(path, method, body, opts = {}) {
  const key = opts.idemKey || newKey();
  const queueable = !opts.isForm && !opts.noQueue && !NO_QUEUE.some((re) => re.test(path));

  // Device has no connection at all → straight to the outbox (no 20 s wait).
  if (queueable && network.isOffline()) {
    await enqueue(path, method, body, key, opts.label);
    return { success: true, queued: true, offline: true, message: 'Saved offline. It will sync automatically when you are back online.' };
  }
  try {
    const data = await rawRequest(path, { ...opts, method, body, idemKey: key });
    lastMutationAt = Date.now();
    return data;
  } catch (e) {
    if (queueable && isNetErr(e)) {
      // Weak/lost connection: keep it and retry with the SAME key, so the
      // server applies it exactly once even if the first try got through.
      await enqueue(path, method, body, key, opts.label);
      return { success: true, queued: true, offline: true, message: 'Weak connection — saved and will sync automatically.' };
    }
    throw e;
  }
}

// Background sync triggers: network comes back, app returns to foreground,
// and a gentle timer while anything is pending.
let syncStarted = false;
export function startOfflineSync() {
  if (syncStarted) return;
  syncStarted = true;
  network.startNetworkMonitor();
  network.subscribe((s) => { if (s !== 'offline') flushOutbox(); });
  try { AppState.addEventListener('change', (st) => { if (st === 'active') flushOutbox(); }); } catch (e) { /* ignore */ }
  setInterval(async () => {
    await loadOutbox();
    if (outbox.length) flushOutbox();
  }, 15000);
  flushOutbox();
}

export function onOutboxChange(fn) {
  outboxListeners.add(fn);
  return () => outboxListeners.delete(fn);
}
export async function getPendingWrites() {
  await loadOutbox();
  return [...outbox];
}

async function request(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  if (method === 'GET') return cachedGet(path, opts);
  return write(path, method, opts.body, opts);
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  postForm: (path, formData, opts) =>
    request(path, { ...opts, method: 'POST', body: formData, isForm: true }),

  // token + fingerprint storage helpers
  saveToken: (t) => { resetNamespace(); return AsyncStorage.setItem(TOKEN_KEY, t); },
  // Logout: also wipe this user's cached screens (privacy on shared phones).
  clearToken: async () => { resetNamespace(); await clearApiCache(); return AsyncStorage.removeItem(TOKEN_KEY); },
  outbox: { flush: flushOutbox, pending: getPendingWrites, onChange: onOutboxChange },
  clearCache: clearApiCache,
  saveFingerprint: (h) => AsyncStorage.setItem(FP_KEY, h),
  getFingerprint,
  TOKEN_KEY,
  FP_KEY,
};

export default api;
