// Auth routes. Mounted at /api/auth in app.js

const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const cnicController = require('../controllers/cnic.controller');
const passwordController = require('../controllers/password.controller');

const authGuard = require('../../../middleware/auth.middleware');
const { upload } = require('../../../middleware/upload');
const { validate } = require('../../../middleware/validate');
const V = require('../validations/auth.zod');

const router = express.Router();

// Throttle sensitive endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'Too many attempts. Try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: { success: false, code: 'RATE_LIMIT', message: 'Too many code requests. Try again later.' },
});

// Lookup endpoints (availability / CNIC upload) are account-enumeration and
// disk-filling targets if left unthrottled — generous, but bounded.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'Too many requests. Try again later.' },
});

// ── Public ────────────────────────────────────────────────
router.post('/signup', authLimiter, validate(V.signupSchema), authController.signup);
router.post('/check-availability', lookupLimiter, authController.checkAvailability);
router.post('/login', authLimiter, validate(V.loginSchema), authController.login);
router.post('/fingerprint-login', authLimiter, authController.fingerprintLogin);

// CNIC image upload. The app no longer uses this (capture step removed);
// kept for older app builds still in the field, so they keep working.
router.post('/cnic/verify', lookupLimiter, upload.single('image'), cnicController.verifyCnic);

// Forgot password (email + phone based)
router.post('/forgot/request', otpLimiter, validate(V.forgotRequestSchema), passwordController.requestReset);
router.post('/forgot/verify', otpLimiter, validate(V.forgotVerifySchema), passwordController.verifyReset);
router.post('/forgot/reset', otpLimiter, validate(V.forgotResetSchema), passwordController.resetPassword);

// ── Protected (require valid session) ─────────────────────
router.get('/me', authGuard, authController.me);
router.get('/heartbeat', authGuard, authController.heartbeat);
router.post('/enroll-fingerprint', authGuard, authController.enrollFingerprint);
router.post('/logout', authGuard, authController.logout);

// Expo push token registration (delivers notifications while app is closed)
router.post('/push-token', authGuard, authController.registerPushToken);
router.post('/push-token/remove', authGuard, authController.removePushToken);

// Settings (preferences, profile pic, biometric, rating)
const settingsController = require('../controllers/settings.controller');
router.get('/settings', authGuard, settingsController.getSettings);
router.patch('/settings/preferences', authGuard, settingsController.updatePreferences);
router.patch('/settings/profile-pic', authGuard, settingsController.updateProfilePic);
router.patch('/settings/profile', authGuard, settingsController.updateProfile);
router.post('/settings/password', authGuard, authLimiter, validate(V.changePasswordSchema), settingsController.changePassword);
router.post('/settings/verify-password', authGuard, authLimiter, settingsController.verifyPassword);
router.post('/settings/force-password', authGuard, authLimiter, validate(V.changePasswordSchema), settingsController.forcePasswordChange);
router.post('/settings/biometric', authGuard, settingsController.setBiometric);
// Rate-limited: the controller also caps at 5 per day per account.
router.post('/settings/rating', authGuard, authLimiter, settingsController.submitRating);

// Account ownership — deactivation and deletion. Both password-gated, and
// rate-limited because they are password oracles.
const accountController = require('../controllers/account.controller');
router.get('/account/summary', authGuard, accountController.accountSummary);
router.post('/account/deactivate', authGuard, authLimiter, accountController.deactivateAccount);
// POST, not DELETE: the request carries a body (password + typed
// confirmation), and DELETE bodies are poorly supported across clients.
router.post('/account/delete', authGuard, authLimiter, accountController.deleteAccount);

module.exports = router;
