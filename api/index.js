// Vercel serverless entry AT REPO ROOT (Root Directory = repo root / default).
// Wraps the Express app in backend/. Socket.IO, cron and the ML subprocess do
// NOT run on Vercel — REST API + MongoDB work; app uses pull-to-refresh.
// Hospital time (PKT). Must be set before any Date is created — see
// src/utils/dates.js. Override with APP_TZ if ever deployed elsewhere.
process.env.TZ = process.env.APP_TZ || 'Asia/Karachi';
process.env.ML_AUTOSTART = 'false';

// Load at module scope but capture any load-time error so we can SURFACE it in
// the HTTP response instead of an opaque 500 (helps diagnose without dashboard logs).
let app = null;
let connectDBCached = null;
let loadErr = null;
try {
  app = require('../backend/src/app');
  ({ connectDBCached } = require('../backend/src/config/db'));
} catch (e) {
  loadErr = e;
}

module.exports = async (req, res) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  if (loadErr) {
    return json(500, { success: false, code: 'LOAD_ERROR', message: loadErr.message, where: (loadErr.stack || '').split('\n').slice(0, 6) });
  }
  try {
    await connectDBCached();
  } catch (e) {
    return json(503, { success: false, code: 'DB_DOWN', message: e.message });
  }
  try {
    return app(req, res);
  } catch (e) {
    return json(500, { success: false, code: 'RUN_ERROR', message: e.message });
  }
};
