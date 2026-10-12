// CNIC real-time detection service.
//
// GOAL: confirm the captured image is actually a Pakistani CNIC and not a
// random photo. We run OCR (Tesseract) on the image and score it against
// known CNIC markers:
//   - a 13-digit identity number, usually formatted 00000-0000000-0
//   - Pakistani CNIC keywords ("Pakistan", "Identity Card", "National",
//     "Date of Birth", "Gender", "Father Name", etc.)
//
// This is the realistic production approach without shipping a heavy ML
// model. The verdict is returned to the app so the UI can accept/reject
// the capture in real time.
//
// NOTE: OCR is best-effort. We expose a confidence score + matched signals
// so you can tune the acceptance threshold in one place.

const path = require('path');
const { createWorker } = require('tesseract.js');
let Jimp = null;
try { Jimp = require('jimp'); } catch (e) { Jimp = null; } // pure-JS preprocessing

// Pre-process a CNIC photo for OCR: upscale small shots, grayscale, normalize
// (stretch contrast), a touch more contrast, and optionally rotate. This alone
// turns most "needs 2-3 tries" photos into a clean first-pass read. Falls back
// to the raw image if Jimp isn't available.
async function preprocess(input, rotateDeg = 0) {
  if (!Jimp) return input;
  const img = await Jimp.read(input);
  const maxSide = Math.max(img.bitmap.width, img.bitmap.height);
  if (maxSide < 1500) img.scale(1500 / maxSide);          // OCR likes ~1500px on the long edge
  else if (maxSide > 2600) img.scale(2600 / maxSide);     // cap huge photos for speed
  img.grayscale().normalize().contrast(0.22);
  if (rotateDeg) img.rotate(rotateDeg);                    // resizes canvas to fit
  return img.getBufferAsync(Jimp.MIME_PNG);
}
const { fuzzyIncludes, findCnicNumber, findCnicCandidates, editDistance, countDates, normalizeText, normalizeDigits } = require('./ocr.util');

// The English OCR model is BUNDLED in the backend root (eng.traineddata), so
// Tesseract never has to download it from a CDN — that download was what made
// CNIC verification hang and time out on some networks. We also keep ONE
// persistent worker (loaded once) instead of re-loading the model per request.
const BACKEND_ROOT = path.join(__dirname, '..', '..');
let _workerPromise = null;

async function getOcrWorker() {
  if (_workerPromise) return _workerPromise;
  _workerPromise = (async () => {
    const worker = await createWorker('eng', 1, {
      langPath: process.env.TESS_LANG_PATH || BACKEND_ROOT,
      gzip: false,             // the bundled file is a raw .traineddata
      cacheMethod: 'readOnly', // never try to fetch/refresh from the network
    });
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    return worker;
  })();
  // If init fails (e.g. missing model), reset so the next request can retry.
  _workerPromise.catch(() => { _workerPromise = null; });
  return _workerPromise;
}

// Keyword signals commonly present on a Pakistani CNIC.
// Weighted: some phrases are far more specific to a CNIC than others.
const CNIC_KEYWORDS = [
  // Strong — essentially only appear on a CNIC / NADRA document
  { word: 'national identity card', weight: 30 },
  { word: 'islamic republic of pakistan', weight: 30 },
  { word: 'nadra', weight: 25 },
  { word: 'country of stay', weight: 22 },
  { word: 'identity number', weight: 20 },
  { word: 'registration number', weight: 12 },

  // Medium — common on ID documents generally
  { word: 'pakistan', weight: 14 },
  { word: 'identity', weight: 12 },
  { word: 'national', weight: 10 },
  { word: 'date of birth', weight: 12 },
  { word: 'date of issue', weight: 12 },
  { word: 'date of expiry', weight: 12 },
  { word: 'father name', weight: 12 },
  { word: 'husband name', weight: 12 },

  // Weak — supporting signals
  { word: 'gender', weight: 6 },
  { word: 'father', weight: 5 },
  { word: 'husband', weight: 5 },
  { word: 'holder', weight: 8 },
  { word: 'signature', weight: 10 },
  { word: 'permanent address', weight: 16 },
  { word: 'present address', weight: 16 },
  { word: 'address', weight: 8 },
];

// 13-digit CNIC number, with or without dashes.
const CNIC_NUMBER_REGEX = /\b\d{5}[-\s]?\d{7}[-\s]?\d\b/;

// Extract the CNIC number (normalized to 13 digits, no dashes) from text.
// Uses the noise-tolerant finder so OCR confusions (l→1, S→5) still resolve.
function extractCnicNumber(text) {
  return findCnicNumber(text);
}

// Month name → number map (handles "Dec", "December", etc.)
const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Parse ANY date string into a normalized { d, m, y } (all 2/4-digit strings),
// or null if it can't. Handles:
//   "31.12.2002", "31-12-2002", "31/12/2002"  (numeric)
//   "31 Dec 2002", "31 December 2002"          (month name)
//   "2002-12-31"                                (ISO)
// Parse a date the USER typed (or one we extracted) into { d, m, y }.
// Accepts: "2002-12-31", "31.12.2002", "31 Dec 2002", "December 31, 2002".
// Month names → numbers. Includes common OCR manglings and full names.
const MONTH_WORDS = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();

  // Month-name format, either order: "31 dec 2002" / "december 31, 2002"
  const dayFirst = s.match(/(\d{1,2})\s*[\s.\-/,]+\s*([a-z]{3,9})\s*[\s.\-/,]+\s*(\d{4})/);
  const monFirst = s.match(/([a-z]{3,9})\s*[\s.\-/,]+\s*(\d{1,2})\s*[\s.\-/,]+\s*(\d{4})/);
  const mn = dayFirst || monFirst;
  if (mn) {
    const day = dayFirst ? mn[1] : mn[2];
    const mon = dayFirst ? mn[2] : mn[1];
    const year = mn[3];
    const mm = MONTH_WORDS[mon] || MONTHS[mon.slice(0, 3)];
    if (mm) return { d: day.padStart(2, '0'), m: mm, y: year };
  }

  // Numeric with separators: dd?mm?yyyy or yyyy?mm?dd
  const parts = s.split(/[.\-/,\s]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    // ISO: yyyy-mm-dd
    if (parts[0].length === 4) {
      return { d: parts[2].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[0] };
    }
    // dd-mm-yyyy
    if (parts[2].length === 4) {
      return { d: parts[0].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[2] };
    }
  }

  // Pure 8 digits: ddmmyyyy or yyyymmdd
  const digits = s.replace(/\D/g, '');
  if (digits.length === 8) {
    // try both, return ddmmyyyy interpretation (caller compares both sides anyway)
    return { d: digits.slice(0, 2), m: digits.slice(2, 4), y: digits.slice(4) };
  }

  return null;
}

// Compare two dates loosely: equal if day+month+year match. Also tolerant of
// day/month swap (some CNICs/locales differ) by checking the swap too.
function datesMatch(a, b) {
  if (!a || !b) return false;
  if (a.d === b.d && a.m === b.m && a.y === b.y) return true;
  // tolerate day/month swapped
  if (a.d === b.m && a.m === b.d && a.y === b.y) return true;
  return false;
}

// Extract all date-like tokens (numeric) from OCR text.
// Pull every date-like string out of OCR text.
//
// Handles what Tesseract actually returns from a CNIC photo:
//   • 31.12.2002   31-12-2002   31/12/2002   31 12 2002
//   • 31 DEC 2002  /  DEC 31 2002  /  December 31, 2002
//   • OCR noise: 3l.12.2002, 3I.I2.2OO2, 31,12,2002
//
// Every hit is normalized to "dd.mm.yyyy" so downstream comparison is trivial.
function extractDates(text) {
  const raw = String(text || '');
  const dates = new Set();

  // ---- Pass 1: month-NAME dates (do this first; the numeric pass would
  // otherwise mangle "31 DEC 2002" while hunting for digits). ----
  const nameRe = /\b(\d{1,2})\s*[.\-/,\s]\s*([a-z]{3,9})\s*[.\-/,\s]\s*(\d{4})\b/gi;
  let m;
  while ((m = nameRe.exec(raw)) !== null) {
    const mm = MONTH_WORDS[m[2].toLowerCase()];
    if (mm) dates.add(`${m[1].padStart(2, '0')}.${mm}.${m[3]}`);
  }
  const nameFirstRe = /\b([a-z]{3,9})\s*[.\-/,\s]\s*(\d{1,2})\s*[.\-/,\s]\s*(\d{4})\b/gi;
  while ((m = nameFirstRe.exec(raw)) !== null) {
    const mm = MONTH_WORDS[m[1].toLowerCase()];
    if (mm) dates.add(`${m[2].padStart(2, '0')}.${mm}.${m[3]}`);
  }

  // ---- Pass 2: numeric dates, tolerating OCR letter/digit confusion. ----
  // Normalize only inside candidate windows so real words stay intact.
  const numRe = /\b([\dloiszbgqIOSZBGQ]{1,2})\s*[.\-/,\s]\s*([\dloiszbgqIOSZBGQ]{1,2})\s*[.\-/,\s]\s*([\dloiszbgqIOSZBGQ]{4})\b/g;
  while ((m = numRe.exec(raw)) !== null) {
    const d = normalizeDigits(m[1]).replace(/\D/g, '');
    const mo = normalizeDigits(m[2]).replace(/\D/g, '');
    const y = normalizeDigits(m[3]).replace(/\D/g, '');
    if (!d || !mo || y.length !== 4) continue;

    const dn = Number(d);
    const mn = Number(mo);
    const yn = Number(y);
    // Sanity: a real date, and a plausible year for a CNIC.
    if (dn < 1 || dn > 31 || mn < 1 || mn > 12) continue;
    if (yn < 1900 || yn > 2100) continue;

    dates.add(`${d.padStart(2, '0')}.${mo.padStart(2, '0')}.${y}`);
  }

  return [...dates];
}

// Normalize a name for loose comparison: lowercase, strip non-letters,
// collapse spaces. So "MUHAMMAD  ZAIN" ~ "Muhammad Zain".
function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Count English letters in a string (to tell English lines from Urdu ones).
function englishLetterCount(s) {
  const m = (s || '').match(/[A-Za-z]/g);
  return m ? m.length : 0;
}

// Try to pull the holder name (ENGLISH) from CNIC text. On a Pakistani CNIC
// the name appears in both Urdu and English; we only want the English one.
// The label is "Name" (English) and the English name is usually the line
// right after it that actually contains Latin letters.
function extractName(rawText) {
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    // The English "Name" label (skip Father/Husband name)
    if (/\bname\b/.test(low) && !/father|husband/.test(low)) {
      // Same line after the label?
      const sameLine = lines[i].replace(/name/i, '').trim();
      if (englishLetterCount(sameLine) >= 3) return sameLine;

      // Otherwise scan the next few lines for the first ENGLISH line
      // (skips the Urdu name line which has no Latin letters).
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
        if (englishLetterCount(lines[j]) >= 3 && !/father|husband/i.test(lines[j])) {
          return lines[j];
        }
      }
    }
  }
  return '';
}

// (DOB parsing/matching is handled by parseDate + datesMatch above.)

// Compare the data the USER typed against what OCR read from the CNIC image.
// Returns { match: boolean, fields: {cnic, name, dob}, extracted, message }.
// Each field is only failed when OCR clearly read a DIFFERENT value — if OCR
// couldn't read a field at all, we don't block on it (OCR is imperfect).
function matchCnicData(rawText, userData) {
  const text = rawText || '';
  const cnicCandidates = findCnicCandidates(text);
  const extractedCnic = cnicCandidates[0] || extractCnicNumber(text);
  const extractedName = extractName(text);
  const extractedDates = extractDates(text);

  const result = { cnic: true, name: true, dob: true };
  let firstError = '';

  // ---- CNIC number (STRICT, hard gate) ----
  // Identity hinges on the 13-digit number, and it's the most machine-readable
  // field, so this is enforced, not optional:
  //   • We must be able to READ a 13-digit number off the card, AND
  //   • the number the user typed must EXACTLY equal one we read.
  // A single wrong digit fails. If the card's number can't be read cleanly,
  // we reject (ask for a sharper photo) rather than letting it slide.
  if (userData.cnic) {
    const userCnic = String(userData.cnic).replace(/\D/g, '');
    if (userCnic.length !== 13) {
      result.cnic = false;
      firstError = firstError || 'Please enter your full 13-digit CNIC number.';
    } else if (cnicCandidates.length === 0) {
      result.cnic = false;
      firstError = firstError ||
        'We could not clearly read the CNIC number on the card. Please retake a sharp, glare-free photo of the front with the number fully in frame.';
    } else if (!cnicCandidates.includes(userCnic)) {
      result.cnic = false;
      firstError = firstError ||
        'The CNIC number you entered does not match the card. Please check every digit and enter it exactly as printed.';
    }
  }

  // ---- Name (STRICT) ----
  // The entered name must genuinely correspond to the English name on the
  // card: most of the user's significant words (3+ letters) must appear on the
  // card, allowing a small OCR edit tolerance per word. Sharing just one word
  // (e.g. only "Muhammad") is NOT enough. If OCR couldn't read a name at all,
  // the CNIC gate above still protects identity, so we don't hard-fail on a
  // missing read alone.
  if (userData.name && extractedName) {
    const un = normalizeName(userData.name);
    const en = normalizeName(extractedName);
    const userWords = un.split(' ').filter((w) => w.length >= 3);
    const cnicWords = en.split(' ').filter((w) => w.length >= 2);

    const wordMatches = (uw) => cnicWords.some((cw) => {
      if (cw === uw || cw.includes(uw) || uw.includes(cw)) return true;
      const tol = uw.length <= 4 ? 1 : 2; // OCR tolerance scales with length
      return editDistance(cw, uw, tol) <= tol;
    });

    if (userWords.length && cnicWords.length) {
      const matched = userWords.filter(wordMatches).length;
      const ratio = matched / userWords.length;
      // Require a clear majority of the name to line up (and, for multi-word
      // names, at least two matching words).
      const enough = ratio >= 0.6 && (userWords.length === 1 ? matched >= 1 : matched >= 2);
      if (!enough) {
        result.name = false;
        firstError = firstError || 'The name you entered does not match the name on the CNIC. Please enter it exactly as printed on your card.';
      }
    }
  }

  // ---- DOB ----
  // Parse the user's DOB (e.g. "31 Dec 2002") and compare against every date
  // read from the CNIC (e.g. "31.12.2002"). Match if any date equals it.
  if (userData.dob && extractedDates.length) {
    const userDate = parseDate(userData.dob);
    if (userDate) {
      const anyMatch = extractedDates.some((d) => datesMatch(parseDate(d), userDate));
      if (!anyMatch) {
        result.dob = false;
        // Show what we actually read, so the user can see the discrepancy
        // rather than guessing.
        const seen = extractedDates.slice(0, 3).join(', ');
        firstError = firstError ||
          `Date of birth does not match the CNIC. You entered ${userDate.d}.${userDate.m}.${userDate.y}` +
          (seen ? `, but the card reads ${seen}.` : '.');
      }
    }
    // If we couldn't parse the user's DOB at all, don't block on it.
  }

  const match = result.cnic && result.name && result.dob;
  return {
    match,
    fields: result,
    extracted: { cnic: extractedCnic, name: extractedName, dates: extractedDates },
    message: firstError,
  };
}

function analyzeText(rawText, side = 'front') {
  const text = String(rawText || '');
  const clean = normalizeText(text);

  // ---- Signal 1: the 13-digit identity number (strongest) ----
  const cnicNumber = findCnicNumber(text);
  const hasCnicNumber = !!cnicNumber;

  // ---- Signal 2: weighted, noise-tolerant keyword hits ----
  const matched = [];
  let keywordScore = 0;
  for (const { word, weight } of CNIC_KEYWORDS) {
    if (fuzzyIncludes(clean, word)) {
      matched.push(word);
      keywordScore += weight;
    }
  }
  keywordScore = Math.min(keywordScore, 60);   // cap so keywords alone can pass

  // ---- Signal 3: structure (a CNIC always carries 2–3 dates) ----
  const dateCount = countDates(text);
  const dateScore = Math.min(dateCount * 8, 20);

  // ---- Signal 4: enough text at all? A blank/blurry shot reads as noise ----
  const wordCount = clean ? clean.split(' ').length : 0;
  const hasEnoughText = wordCount >= 4;

  let score = 0;
  if (hasCnicNumber) score += 45;
  score += keywordScore;
  score += dateScore;

  // A photo with no readable text can never be a CNIC.
  if (!hasEnoughText) score = Math.min(score, 20);

  // The BACK of a CNIC carries no identity number and fewer strong phrases
  // (mostly address + issue date + signature), so it needs a lower bar.
  const threshold = side === 'back' ? 38 : 55;

  // Accept when EITHER:
  //   • we read the identity number and at least one supporting signal, OR
  //   • enough independent signals line up for this side
  const isCnic =
    (hasCnicNumber && (keywordScore >= 10 || dateCount >= 1)) ||
    score >= threshold;

  return {
    isCnic,
    confidence: Math.min(Math.round(score), 100),
    signals: {
      hasCnicNumber,
      cnicNumber,
      matchedKeywords: matched,
      dateCount,
      wordCount,
      side,
      threshold,
    },
  };
}

// Run OCR on an image (file path or buffer) and return the verdict.
//
// By default tesseract.js downloads its English model from a CDN on first
// use (fine in most environments). For OFFLINE/production reliability you
// can bundle the model and point to it with env vars:
//   TESS_LANG_PATH   → folder containing eng.traineddata (or a URL)
// Download the file once from:
//   https://github.com/naptha/tessdata/raw/main/eng.traineddata
// place it in backend/tessdata/ and set TESS_LANG_PATH=./tessdata
// One OCR pass on a prepared buffer (PSM 6 = single uniform block, best for ID
// cards). Model is local, so recognition is a few seconds, not a download.
async function ocrOnce(buffer, timeoutMs = 30000) {
  // Race worker acquisition + recognition against a timeout. On serverless
  // (Vercel free tier ~10s cap) we pass a short timeout so a slow cold-start
  // OCR is abandoned gracefully instead of getting the whole request killed.
  const run = (async () => {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  })();
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), timeoutMs));
  return Promise.race([run, timeoutPromise]);
}

// A read is "strong" (stop searching) when it's clearly a CNIC — and, for the
// FRONT, when we could actually pull the 13-digit number off it.
function isStrongRead(verdict, side, text) {
  if (!verdict.isCnic) return false;
  if (side === 'front') return !!extractCnicNumber(text);
  return true;
}

async function detectCnic(imagePathOrBuffer, side = 'front') {
  // On serverless (Vercel free tier) the whole HTTP function is killed at ~10s,
  // so we cannot afford several multi-second OCR passes. There we do a single
  // upright pass with a tight timeout and an overall deadline; if OCR can't
  // finish in time we return a `degraded` verdict so the caller can soft-pass
  // signup instead of hard-failing. Locally (no timeout pressure) we keep the
  // full multi-orientation search for maximum accuracy.
  // The app now uploads a normalised ~1500px JPEG, so OCR is fast enough on the
  // hosted backend to try upright AND upside-down (the loop early-exits the
  // moment it gets a strong read, so an upright card still finishes in one pass).
  const SERVERLESS = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_REGION);
  const orientations = SERVERLESS ? [0, 180] : [0, 180, 90, 270];
  const perPassMs = SERVERLESS ? 4500 : 30000;
  const deadline = Date.now() + (SERVERLESS ? 8500 : 120000);

  try {
    let best = null;
    let anyOcrOk = false;      // did ANY OCR pass actually return text?
    for (const deg of orientations) {
      if (Date.now() > deadline) break;
      let text = '';
      try {
        const buf = await preprocess(imagePathOrBuffer, deg);
        text = await ocrOnce(buf, perPassMs);
        anyOcrOk = true;
      } catch (e) {
        // If preprocessing/OCR failed, fall back to the raw image for upright.
        if (deg === 0) {
          try { text = await ocrOnce(imagePathOrBuffer, perPassMs); anyOcrOk = true; }
          catch (_) { text = ''; }
        } else continue;
      }
      const verdict = analyzeText(text, side);
      const packed = {
        ok: true, ...verdict, rawText: text, orientation: deg,
        textPreview: (text || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      };
      if (!best || (verdict.confidence || 0) > (best.confidence || 0)) best = packed;
      if (isStrongRead(verdict, side, text)) { best = packed; break; }
    }
    if (best) {
      // On serverless a single rushed pass may read a real card weakly. Rather
      // than falsely reject a legitimate user, treat a non-confident hosted
      // read as degraded so the caller soft-passes (a confident read still goes
      // through the normal strict match path).
      if (SERVERLESS && !best.isCnic) best.degraded = true;
      return best;
    }
    // No usable read at all — on serverless this is almost always an OCR
    // timeout (cold start / CPU limit), so flag it degraded for a soft-pass.
    return {
      ok: false, degraded: SERVERLESS, isCnic: false, confidence: 0, rawText: '',
      signals: { hasCnicNumber: false, matchedKeywords: [] },
    };
  } catch (err) {
    return {
      ok: false, degraded: SERVERLESS, isCnic: false, confidence: 0, error: err.message, rawText: '',
      signals: { hasCnicNumber: false, matchedKeywords: [] },
    };
  }
}

module.exports = { detectCnic, analyzeText, matchCnicData, extractCnicNumber, extractName, extractDates };
