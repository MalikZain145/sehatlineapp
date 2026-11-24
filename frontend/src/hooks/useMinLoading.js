// useMinLoading — a drop-in replacement for `useState(bool)` used as a loading
// flag, that guarantees the loading (skeleton) state stays visible for at least
// `minMs` milliseconds. This stops the shimmer from flashing for a split second
// when data loads almost instantly.
//
// SPEED FIX: the minimum used to be 2.5 s — so EVERY screen (55 of them) made
// the user wait at least 2.5 s even when the data (now often from the offline
// cache) was ready instantly. 350 ms is enough to avoid a flicker.
//
// Usage (change one line):
//   const [loading, setLoading] = useState(true);
//   →
//   const [loading, setLoading] = useMinLoading(true);
//
// Everything else stays the same: call setLoading(false) when done — the hook
// delays the "off" until the minimum time has elapsed since it last turned on.

import { useState, useRef, useCallback, useEffect } from 'react';

export default function useMinLoading(initial = true, minMs = 350) {
  const [loading, setRaw] = useState(initial);
  const startAt = useRef(Date.now());   // when loading last became true
  const timer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const setLoading = useCallback((value) => {
    // Support functional updates like React's setState, just in case.
    const next = typeof value === 'function' ? value(loading) : value;

    if (next) {
      // Turning ON — reset the clock and cancel any pending "off".
      startAt.current = Date.now();
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      setRaw(true);
      return;
    }

    // Turning OFF — honor the minimum visible time.
    const remaining = minMs - (Date.now() - startAt.current);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (remaining > 0) {
      timer.current = setTimeout(() => { if (mounted.current) setRaw(false); }, remaining);
    } else {
      setRaw(false);
    }
  }, [loading, minMs]);

  return [loading, setLoading];
}
