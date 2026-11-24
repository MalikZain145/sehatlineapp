// Local (hospital) date helpers.
//
// BUG FIX: the code used `new Date().toISOString().slice(0, 10)` for "today".
// toISOString() is UTC, but the hospital runs on Pakistan time (UTC+5) and the
// hosted backend (Vercel) runs in UTC — so between 00:00 and 05:00 PKT "today"
// was still yesterday, daily token numbers reset at 5 AM instead of midnight,
// and appointment slots were compared against UTC clock time.
//
// process.env.TZ is pinned to Asia/Karachi at startup (server.js / api/index.js),
// so the LOCAL getters below are hospital time.

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' for the given date in hospital local time.
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 'HH:mm' (24h) for the given date in hospital local time.
function localHHMM(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 'HH:mm' → '2:30 PM'
function label12(t24) {
  const [h, m] = String(t24 || '').split(':').map(Number);
  if (!Number.isFinite(h)) return String(t24 || '');
  const mer = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(m || 0)} ${mer}`;
}

module.exports = { localDateStr, localHHMM, label12 };
