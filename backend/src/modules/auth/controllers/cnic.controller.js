// CNIC verification controller.
// The app captures the CNIC (front/back) with the in-app camera and POSTs
// the image here. We:
//   1) confirm the image is actually a CNIC (OCR detection)
//   2) for the FRONT image, if the user's typed data (cnic/name/dob) is sent,
//      we EXTRACT the same fields from the image and MATCH them. On mismatch
//      we return code MISMATCH so the app can send the user back to the form
//      with a precise error.

const path = require('path');
const fs = require('fs');
const { detectCnic, matchCnicData } = require('../../../services/cnic.service');
const User = require('../models/User');
const logger = require('../../../utils/logger');
const { signCnicToken } = require('../../../utils/cnicToken');

// On serverless (Vercel) the uploaded file lives in an ephemeral, per-instance
// /tmp and won't survive until the final /register call. So instead of handing
// back a file path (which register proves by fs.existsSync), we hand back a
// short-lived signed token that register can validate statelessly. Locally we
// keep returning the real /uploads path so the on-disk proof still works.
const SERVERLESS = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_REGION);
function issuedPathFor(side, filePath) {
  return SERVERLESS ? signCnicToken(side) : `/uploads/${path.basename(filePath)}`;
}

// Build the $or list to detect an already-registered CNIC / CDA card from the
// user's TYPED values (used both after a strong OCR match and in the hosted
// soft-pass path where OCR could not run in time). Returns the existing user
// or null, plus whether the hit was on the CDA card.
async function findExistingByIdentity(body, readCnic = '') {
  const dupChecks = [];
  const typedCnic = String(body.cnic || '').trim();
  if (typedCnic) dupChecks.push({ cnic: typedCnic });
  if (readCnic) {
    const dashed = `${readCnic.slice(0, 5)}-${readCnic.slice(5, 12)}-${readCnic.slice(12)}`;
    dupChecks.push({ cnic: readCnic }, { cnic: dashed });
  }
  const typedCard = String(body.cdaCard || '').trim();
  const normCard = typedCard
    ? (typedCard.endsWith('-RB') ? typedCard : `${typedCard}-RB`)
    : '';
  if (normCard) dupChecks.push({ cdaCard: normCard });

  if (!dupChecks.length) return { existing: null, normCard };
  const existing = await User.findOne({ $or: dupChecks });
  return { existing, normCard };
}

// Accept the capture with only the duplicate guard. Used whenever OCR cannot be
// trusted to REJECT a real user — i.e. a degraded read, or any read on the
// hosted (serverless) backend where the 10s function limit makes OCR flaky.
// This is what makes signup behave identically on iOS and Android.
async function softPass(req, res, side) {
  if (side === 'front') {
    const { existing, normCard } = await findExistingByIdentity(req.body);
    if (existing) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      const isCard = normCard && existing.cdaCard === normCard;
      return res.status(409).json({
        success: false,
        code: 'ALREADY_REGISTERED',
        field: isCard ? 'cdaCard' : 'cnic',
        message: isCard
          ? 'This CDA card number is already registered to an account. Please log in instead.'
          : 'This CNIC is already registered to an account. Please log in instead.',
      });
    }
  }
  return res.json({
    success: true,
    verified: false,
    message: 'CNIC image accepted.',
    side,
    imagePath: issuedPathFor(side, req.file.path),
    verdict: { isCnic: true, confidence: 0, degraded: true },
  });
}

// POST /api/auth/cnic/verify  (multipart: field "image", "side", and optional
// user fields: cnic, name, dob — sent for the front image to enable matching)
async function verifyCnic(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_IMAGE', message: 'No image received' });
    }

    const side = (req.body.side || 'front').toLowerCase();
    logger.info(`CNIC verify requested (${side}) from ${req.clientIp}`);

    const verdict = await detectCnic(req.file.path, side);

    // OCR timed out / could not read → accept (duplicate guard only). On the
    // hosted backend this is the common path within the function time limit.
    if (verdict.degraded) {
      logger.warn(`CNIC OCR degraded — soft-pass (${side})`);
      return softPass(req, res, side);
    }

    // If it doesn't look like a CNIC: the hosted backend accepts (OCR there is
    // too flaky to reject a real user); a local backend rejects with guidance.
    if (!verdict.isCnic) {
      if (SERVERLESS) return softPass(req, res, side);
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      logger.warn(`CNIC rejected (${side}) confidence=${verdict.confidence} signals=${JSON.stringify(verdict.signals)}`);

      // Tailor the hint to what the OCR actually saw, so the user knows what
      // to fix rather than just retrying blindly.
      const s = verdict.signals || {};
      let message;
      if (!s.wordCount || s.wordCount < 4) {
        message = 'We could not read any text on the card. Move closer, hold steady, and make sure the card fills the frame.';
      } else if (side === 'front' && !s.hasCnicNumber) {
        message = 'We could not read the 13-digit CNIC number. Make sure the number is inside the frame, sharp, and free of glare.';
      } else {
        message = 'This does not look like a valid CNIC. Capture the correct side of the card in good lighting.';
      }

      return res.status(422).json({
        success: false,
        code: 'NOT_A_CNIC',
        message,
        verdict: {
          isCnic: verdict.isCnic,
          confidence: verdict.confidence,
          textPreview: verdict.textPreview,
        },
      });
    }

    // ---- Data matching (front image only, when user data is provided) ----
    if (side === 'front' && (req.body.cnic || req.body.name || req.body.dob)) {
      const match = matchCnicData(verdict.rawText, {
        cnic: req.body.cnic || '',
        name: req.body.name || '',
        dob: req.body.dob || '',
      });

      logger.info(
        `CNIC match -> cnic:${match.fields.cnic} name:${match.fields.name} dob:${match.fields.dob} ` +
        `(read cnic=${match.extracted.cnic || 'none'})`
      );

      if (!match.match) {
        // Hosted: OCR is too unreliable to reject on a mismatch — accept
        // (duplicate guard still applies). Local: reject with a precise error.
        if (SERVERLESS) return softPass(req, res, side);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        logger.warn(`CNIC data MISMATCH: ${match.message}`);
        return res.status(422).json({
          success: false,
          code: 'MISMATCH',
          message: match.message,
          fields: match.fields,
        });
      }

      // ---- Duplicate guard ----
      // The card in front of the camera is real and matches what was typed.
      // Before we let signup continue, make sure this person (or this CDA
      // card) doesn't already hold an account. Catching it here saves the
      // user from filling in the rest of the form for nothing.
      const { existing, normCard } = await findExistingByIdentity(req.body, match.extracted.cnic || '');
      if (existing) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        const isCard = normCard && existing.cdaCard === normCard;
        logger.warn(`CNIC verify blocked — ${isCard ? 'CDA card' : 'CNIC'} already registered (${existing.email})`);
        return res.status(409).json({
          success: false,
          code: 'ALREADY_REGISTERED',
          field: isCard ? 'cdaCard' : 'cnic',
          message: isCard
            ? 'This CDA card number is already registered to an account. Please log in instead.'
            : 'This CNIC is already registered to an account. Please log in instead.',
        });
      }
    }

    logger.success(`CNIC verified (${side}) confidence=${verdict.confidence}`);
    return res.json({
      success: true,
      verified: true,
      message: 'CNIC verified successfully',
      side,
      imagePath: issuedPathFor(side, req.file.path),
      verdict: { isCnic: verdict.isCnic, confidence: verdict.confidence },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyCnic };
