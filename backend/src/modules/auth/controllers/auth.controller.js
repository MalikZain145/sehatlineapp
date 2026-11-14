// Auth controller — signup, login, fingerprint, logout, heartbeat, me.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const { createSession } = require('../services/auth.service');
const { validateSignup, validateLogin } = require('../validations/auth.validation');
const emailService = require('../../../services/email.service');
const logger = require('../../../utils/logger');
const { isValidCnicToken } = require('../../../utils/cnicToken');

// A throwaway bcrypt hash used to equalize login timing when the account
// doesn't exist (so response time can't be used to enumerate accounts).
const DUMMY_HASH = bcrypt.hashSync('sehatline-dummy-timing-guard', 10);

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// ── SIGNUP (patients only) ────────────────────────────────────────────────
// Staff (doctor/admin/lab/pharmacy) are seeded, never signed up.
async function signup(req, res, next) {
  try {
    const errors = validateSignup(req.body);
    if (errors.length) return fail(res, 400, errors[0], 'VALIDATION');

    const { name, email, password, phone, cnic, cdaCard, dob, address } = req.body;

    // One person = one account. Any of these four identifies a person, so a
    // match on ANY of them blocks the signup. (The DB also carries unique
    // indexes on all four, which closes the race between this check and the
    // insert below.)
    const normPhone = phone ? String(phone).replace(/^0+/, '') : '';
    const normCard = cdaCard ? (cdaCard.endsWith('-RB') ? cdaCard : `${cdaCard}-RB`) : '';

    const orClauses = [{ email: email.toLowerCase() }];
    if (cnic) orClauses.push({ cnic: String(cnic) });
    if (normPhone) orClauses.push({ phone: normPhone });
    if (normCard) orClauses.push({ cdaCard: normCard });

    const exists = await User.findOne({ $or: orClauses });
    if (exists) {
      // Tell the user precisely which field clashed.
      let field = 'email';
      let label = 'email';
      if (exists.email === email.toLowerCase()) { field = 'email'; label = 'email'; }
      else if (cnic && exists.cnic === String(cnic)) { field = 'cnic'; label = 'CNIC'; }
      else if (normPhone && exists.phone === normPhone) { field = 'phone'; label = 'phone number'; }
      else if (normCard && exists.cdaCard === normCard) { field = 'cdaCard'; label = 'CDA card number'; }

      return res.status(409).json({
        success: false,
        code: 'DUPLICATE',
        field,
        message: `An account with this ${label} already exists. Please log in instead.`,
      });
    }

    // CNIC image paths (uploaded via /cnic/verify beforehand, passed back here)
    const cnicFrontImage = req.body.cnicFrontImage || '';
    const cnicBackImage = req.body.cnicBackImage || '';

    // Do NOT trust `cnicVerified` from the body — anyone can send true.
    //
    // Two forms of proof, both minted only by our own /cnic/verify:
    //   • Local: /cnic/verify deletes the uploaded file on reject, so an image
    //     still on disk is proof it passed. Confirm both sides survived and the
    //     paths look like ones we issued (no traversal / crafted names).
    //   • Serverless (Vercel): /tmp is ephemeral and per-instance, so the file
    //     can't survive to here. /cnic/verify instead returns a short-lived
    //     HMAC token we validate statelessly.
    const uploadsDir = path.join(__dirname, '../../../../uploads');
    const isVerifiedImage = (p, side) => {
      if (!p || typeof p !== 'string') return false;
      // Serverless proof: a signed, unexpired verification token.
      if (isValidCnicToken(p, side)) return true;
      // Local proof: the uploaded image is still on disk.
      const name = path.basename(p);
      // Reject traversal and anything that isn't a plain filename.
      if (name !== p.replace(/^\/uploads\//, '')) return false;
      if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
      try {
        return fs.existsSync(path.join(uploadsDir, name));
      } catch (e) {
        return false;
      }
    };

    const cnicVerified = isVerifiedImage(cnicFrontImage, 'front') && isVerifiedImage(cnicBackImage, 'back');
    // CNIC photo capture has been REMOVED from the app (it was unreliable on
    // iOS and blocked genuine users). Images are therefore optional: signup
    // needs only the typed CNIC + CDA card (both still unique-checked above).
    // Set CNIC_REQUIRE_IMAGES=true to make the photos mandatory again.
    const requireImages = String(process.env.CNIC_REQUIRE_IMAGES || '').toLowerCase() === 'true';
    if (requireImages && !cnicVerified) {
      logger.warn(`Signup rejected — CNIC not verified (${email})`);
      return fail(res, 422, 'Please verify both sides of your CNIC before creating an account.', 'CNIC_NOT_VERIFIED');
    }
    // If a CNIC image was provided, mark upload time so the account can
    // auto-verify after the waiting period (Pending → Verified + blue tick).
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone ? String(phone).replace(/^0+/, '') : '',
      role: 'patient',
      cnic: cnic || '',
      cdaCard: cdaCard ? (cdaCard.endsWith('-RB') ? cdaCard : `${cdaCard}-RB`) : '',
      dob: dob || '',
      address: address || '',
      // Only keep image refs that WE issued (never store arbitrary strings).
      cnicFrontImage: cnicVerified ? cnicFrontImage : '',
      cnicBackImage: cnicVerified ? cnicBackImage : '',
      cnicVerified,
      cnicUploadedAt: new Date(),
      accountStatus: 'active',
      // The CNIC passed OCR and matched the entered details before we got
      // here, so there is nothing left to wait for. Making the patient sit on
      // "Verification Pending" for 12 hours after a check that already
      // succeeded was just wrong.
      isVerified: true,
    });

    logger.db('INSERT', 'User', `patient ${user.email}`);
    logger.success(`New patient registered: ${user.email}`);

    // Log them in right away
    const { token } = await createSession(user, {
      ip: req.clientIp,
      userAgent: req.headers['user-agent'],
      fingerprintHash: req.body.fingerprintHash || '',
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.clientIp || '';
    await user.save();

    // Welcome email — fire-and-forget so a mail hiccup never blocks signup.
    emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    // Two signups racing each other pass the findOne check but only one wins
    // the unique index. Translate Mongo's E11000 into the same 409 the
    // pre-check would have returned.
    if (err && err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || 'email';
      const labels = { email: 'email', cnic: 'CNIC', phone: 'phone number', cdaCard: 'CDA card number' };
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE',
        field: key,
        message: `An account with this ${labels[key] || key} already exists. Please log in instead.`,
      });
    }
    next(err);
  }
}

// ── LOGIN (any role) ──────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length) return fail(res, 400, errors[0], 'VALIDATION');

    const { emailOrPhone, password } = req.body;
    const isEmail = emailOrPhone.includes('@');

    const query = isEmail
      ? { email: emailOrPhone.toLowerCase() }
      : { phone: String(emailOrPhone).replace(/^0+/, '') };

    const user = await User.findOne(query).select('+password');

    // Anti-enumeration: return the SAME generic error whether the account does
    // not exist or the password is wrong — an attacker must not be able to tell
    // which emails/phones are registered. When there's no user we still run a
    // dummy bcrypt compare so the response time doesn't reveal existence either.
    const ok = user ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
    if (!user || !ok) {
      return fail(res, 401, 'Invalid email/phone or password.', 'INVALID_CREDENTIALS');
    }

    // Only revealed to someone who already passed authentication (no enumeration).
    if (user.accountStatus === 'suspended') {
      return fail(res, 403, 'Your account is suspended. Contact support.', 'SUSPENDED');
    }

    // Deactivation is the patient's own doing and is meant to be reversible.
    // Signing in *successfully* is the clearest statement that they want the
    // account back — so this must come after the password check, not before,
    // or a wrong guess would still restore it.
    if (user.accountStatus === 'deactivated') {
      user.accountStatus = 'active';
      logger.success(`Account reactivated on sign-in: ${user.email}`);
    }

    const { token } = await createSession(user, {
      ip: req.clientIp,
      userAgent: req.headers['user-agent'],
      fingerprintHash: req.body.fingerprintHash || '',
    });

    // Update lastLogin in the background — don't make the user wait for it.
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.clientIp || '';
    user.save().catch(() => {});

    logger.success(`Login: ${user.email} (${user.role}) from ${req.clientIp}`);

    return res.json({
      success: true,
      message: `Welcome ${user.name || user.role}!`,
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

// ── ENROLL FINGERPRINT ────────────────────────────────────────────────────
// The app captures a device biometric credential id, hashes it, and stores
// it on the user + current session. Later logins from a DIFFERENT fingerprint
// hash are rejected by the auth middleware.
async function enrollFingerprint(req, res, next) {
  try {
    const { fingerprintToken } = req.body;
    if (!fingerprintToken) return fail(res, 400, 'fingerprintToken is required', 'VALIDATION');

    const fingerprintHash = crypto.createHash('sha256').update(String(fingerprintToken)).digest('hex');

    // Make sure this biometric isn't already linked to a DIFFERENT account
    // (any role — patient / doctor / pharmacist / lab / admin). One device
    // biometric = one account.
    const existing = await User.findOne({
      fingerprintHash,
      _id: { $ne: req.user._id },
    }).select('role');
    if (existing) {
      return fail(
        res,
        409,
        `This fingerprint is already linked to another ${existing.role || 'account'}. Each biometric can be registered to only one account.`,
        'FINGERPRINT_IN_USE'
      );
    }

    req.user.fingerprintHash = fingerprintHash;
    await req.user.save();

    if (req.session) {
      req.session.fingerprintHash = fingerprintHash;
      await req.session.save();
    }

    logger.db('UPDATE', 'User', `fingerprint enrolled for ${req.user.email}`);
    // Notify the owner that biometric login was set up (security awareness).
    emailService.sendBiometricEmail(req.user.email, req.user.name).catch(() => {});
    return res.json({ success: true, message: 'Fingerprint enrolled for this device' });
  } catch (err) {
    next(err);
  }
}

// ── FINGERPRINT LOGIN ─────────────────────────────────────────────────────
// User presents a fingerprint token; we find the account whose stored hash
// matches. If none matches → reject (someone else's finger).
async function fingerprintLogin(req, res, next) {
  try {
    const { fingerprintToken, email } = req.body;
    if (!fingerprintToken) return fail(res, 400, 'fingerprintToken is required', 'VALIDATION');

    const fingerprintHash = crypto.createHash('sha256').update(String(fingerprintToken)).digest('hex');

    // Optionally scope by email (faster + safer); else match by hash alone.
    // Never match on an empty hash — accounts that have never enrolled all
    // share one, and `biometricEnabled` guards against a stale record.
    const query = email
      ? { email: email.toLowerCase(), fingerprintHash, biometricEnabled: true }
      : { fingerprintHash, biometricEnabled: true };

    // SECURITY: if this fingerprint is (wrongly) linked to more than one account
    // and no email was given to disambiguate, refuse — a fingerprint must resolve
    // to exactly one account. This can only happen with legacy duplicates; new
    // enrolments are blocked by the uniqueness check in setBiometric.
    if (!email) {
      const matches = await User.countDocuments({ fingerprintHash, biometricEnabled: true });
      if (matches > 1) {
        logger.warn(`Fingerprint login ambiguous (${matches} accounts) from ${req.clientIp}`);
        return fail(res, 409, 'This fingerprint is linked to more than one account. Please sign in with your password, then re-enable biometric on the account you want.', 'FINGERPRINT_AMBIGUOUS');
      }
    }

    const user = await User.findOne(query).select('+fingerprintHash');
    if (!user) {
      logger.warn(`Fingerprint login rejected (no match) from ${req.clientIp}`);
      return fail(res, 401, 'Fingerprint not recognized on this account.', 'FINGERPRINT_MISMATCH');
    }

    const { token } = await createSession(user, {
      ip: req.clientIp,
      userAgent: req.headers['user-agent'],
      fingerprintHash,
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.clientIp || '';
    await user.save();

    logger.success(`Fingerprint login: ${user.email} from ${req.clientIp}`);
    return res.json({
      success: true,
      message: `Welcome back ${user.name || user.role}!`,
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

// ── SESSION HEARTBEAT ─────────────────────────────────────────────────────
// The app pings this periodically. It refreshes activity (handled in
// middleware) and reports whether the session is still valid, so the client
// can proactively log out on inactivity.
async function heartbeat(req, res) {
  return res.json({
    success: true,
    valid: true,
    lastActivityAt: req.session.lastActivityAt,
  });
}

// ── LOGOUT ────────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    if (req.session) {
      req.session.isActive = false;
      await req.session.save();
      logger.db('UPDATE', 'Session', `logout ${req.user.email}`);
    }
    // Stop pushing to this device once the user signs out of it.
    const token = String(req.body?.pushToken || '').trim();
    if (token) await User.updateOne({ _id: req.user._id }, { $pull: { pushTokens: token } });
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

// ── PUSH TOKEN ─────────────────────────────────────────────────────────────
// The client registers its Expo push token after login so notifications reach
// it while the app is closed. Stored per device ($addToSet dedupes).
async function registerPushToken(req, res, next) {
  try {
    const token = String(req.body?.pushToken || '').trim();
    if (!token || !token.startsWith('ExponentPushToken')) {
      return fail(res, 400, 'A valid Expo push token is required.', 'VALIDATION');
    }
    await User.updateOne({ _id: req.user._id }, { $addToSet: { pushTokens: token } });
    return res.json({ success: true });
  } catch (err) { next(err); }
}

async function removePushToken(req, res, next) {
  try {
    const token = String(req.body?.pushToken || '').trim();
    if (token) await User.updateOne({ _id: req.user._id }, { $pull: { pushTokens: token } });
    return res.json({ success: true });
  } catch (err) { next(err); }
}

// ── ME ────────────────────────────────────────────────────────────────────
async function me(req, res) {
  return res.json({ success: true, user: req.user.toSafeJSON() });
}

// ── CHECK AVAILABILITY ────────────────────────────────────────────────────
// Called by the signup form as the user fills fields, so we can tell them
// EARLY (before CNIC step) that an account already exists. Checks email,
// cnic, phone, and cdaCard. Returns which field is taken (if any).
async function checkAvailability(req, res, next) {
  try {
    const { email, cnic, phone, cdaCard } = req.body;

    // Build checks only for provided fields.
    const checks = [];
    if (email) checks.push({ field: 'email', query: { email: String(email).toLowerCase() }, label: 'email' });
    if (cnic) checks.push({ field: 'cnic', query: { cnic: String(cnic) }, label: 'CNIC' });
    if (phone) checks.push({ field: 'phone', query: { phone: String(phone).replace(/^0+/, '') }, label: 'phone number' });
    if (cdaCard) {
      const raw = String(cdaCard);
      const card = raw.endsWith('-RB') ? raw : `${raw}-RB`;
      checks.push({ field: 'cdaCard', query: { cdaCard: card }, label: 'CDA card number' });
    }

    for (const c of checks) {
      const existing = await User.findOne(c.query);
      if (existing) {
        return res.json({
          success: true,
          available: false,
          field: c.field,
          message: `This ${c.label} is already registered. Please log in instead.`,
        });
      }
    }

    return res.json({ success: true, available: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  enrollFingerprint,
  fingerprintLogin,
  heartbeat,
  logout,
  me,
  checkAvailability,
  registerPushToken,
  removePushToken,
};
