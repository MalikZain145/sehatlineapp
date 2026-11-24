// Idempotency-Key support — makes retried writes safe.
//
// The app's offline outbox (frontend/src/services/apiClient.js) sends every
// write with an `Idempotency-Key` header and re-sends it with the SAME key if
// the connection drops. On a weak signal the first attempt often DID reach the
// server and only the reply was lost; without this, the retry would book a
// second appointment, create a second token, or prescribe twice.
//
//   first time  → handled normally; the response (status + JSON) is stored
//   same key    → the stored response is replayed, the handler does NOT run
//   still busy  → 503 (the app treats it as "try again shortly")
//
// Records expire after 24 h (TTL index). 5xx responses are not stored, so a
// request that failed on the server can be retried for real.

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  method: String,
  path: String,
  state: { type: String, enum: ['pending', 'done'], default: 'pending' },
  status: Number,
  body: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});
const IdempotencyKey = mongoose.models.IdempotencyKey || mongoose.model('IdempotencyKey', schema);

const STALE_PENDING_MS = 2 * 60 * 1000; // a crashed request releases its key

module.exports = function idempotency(req, res, next) {
  const raw = req.get('Idempotency-Key');
  if (!raw || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const key = `${String(raw).slice(0, 80)}|${req.method}|${req.originalUrl.split('?')[0]}`;

  (async () => {
    try {
      await IdempotencyKey.create({ key, method: req.method, path: req.originalUrl });
    } catch (e) {
      if (e && e.code === 11000) {
        const rec = await IdempotencyKey.findOne({ key }).lean();
        if (rec && rec.state === 'done') {
          res.set('Idempotent-Replay', 'true');
          return res.status(rec.status || 200).json(rec.body);
        }
        if (rec && Date.now() - new Date(rec.createdAt).getTime() > STALE_PENDING_MS) {
          await IdempotencyKey.deleteOne({ key });
          return module.exports(req, res, next);
        }
        return res.status(503).json({ success: false, code: 'IN_PROGRESS', message: 'Still processing the previous attempt. Retrying shortly.' });
      }
      // DB problem with the key store — don't block the real request.
      logger.warn(`Idempotency store unavailable: ${e && e.message}`);
      return next();
    }

    const origJson = res.json.bind(res);
    res.json = (body) => {
      const status = res.statusCode || 200;
      if (status >= 500) {
        IdempotencyKey.deleteOne({ key }).catch(() => {});
      } else {
        IdempotencyKey.updateOne({ key }, { $set: { state: 'done', status, body } }).catch(() => {});
      }
      return origJson(body);
    };
    return next();
  })().catch(next);
};
