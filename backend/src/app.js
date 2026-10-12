// Express application setup.
// server.js imports this after the DB connects.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const requestLogger = require('./middleware/requestLogger');
const { noSqlGuard } = require('./middleware/security.middleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/routes/auth.routes');
const patientRoutes = require('./modules/patient/routes/patient.routes');
const doctorRoutes = require('./modules/doctor/routes/doctor.routes');
const adminRoutes = require('./modules/admin/routes/admin.routes');
const pharmacyRoutes = require('./modules/pharmacy/routes/pharmacy.routes');
const laboratoryRoutes = require('./modules/laboratory/routes/laboratory.routes');

const app = express();

// Behind a reverse proxy (Render/Nginx) so req.ip and the rate limiter see the
// real client IP from X-Forwarded-For rather than the proxy's address.
app.set('trust proxy', 1);

// Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.).
// crossOriginResourcePolicy is relaxed so the app can load /uploads images.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: open in dev; in production set ALLOWED_ORIGINS (comma-separated) to
// lock the API to known origins. (Native app requests carry no Origin header,
// so this only constrains browsers — it never blocks the mobile app.)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins, credentials: true } : {}));

// Body parsers with hard size caps (anti-DoS). 10mb accommodates base64
// profile-photo data-URIs; tighten via env if your app doesn't need it.
const bodyLimit = process.env.BODY_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Terminal access logging (IP + route) — sets req.clientIp.
app.use(requestLogger);

// Global rate limit — defense-in-depth against floods on top of the tighter
// per-endpoint limits on auth/OTP. Generous so normal polling never trips it;
// tune with RATE_LIMIT_MAX. The health check is exempt.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 1000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl === '/api/health',
  message: { success: false, code: 'RATE_LIMIT', message: 'Too many requests. Please slow down.' },
});
app.use('/api', apiLimiter);

// Security: block NoSQL injection in request bodies, queries and params.
app.use(noSqlGuard);

// Serve uploaded CNIC images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'SehatLine API', time: new Date().toISOString() });
});

// Public appointment verification page — the target of the QR on the
// appointment pass/PDF, so anyone can scan it and confirm the appointment.
app.get('/api/appointments/verify/:id',
  require('./modules/patient/controllers/appointment.controller').verifyAppointmentPublic);

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/laboratory', laboratoryRoutes);

// Role-neutral notifications (staff bells): any signed-in user reads/acks their own.
{
  const authGuard = require('./middleware/auth.middleware');
  const { validateObjectId } = require('./middleware/validate');
  const notif = require('./modules/patient/controllers/notification.controller');
  app.get('/api/notifications', authGuard, notif.listMine);
  app.post('/api/notifications/:id/read', authGuard, validateObjectId('id'), notif.markRead);
  app.post('/api/notifications/read-all', authGuard, notif.markAllRead);
  app.delete('/api/notifications/:id', authGuard, validateObjectId('id'), notif.removeNotification);
}

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
