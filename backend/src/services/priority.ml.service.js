// Node client for the Python priority ML service, with a rule-based fallback.
//
// The Python service (ml-service/) ranks patients with a trained
// GradientBoosting + neural-net ensemble. This client calls it, but if the
// service is unreachable it falls back to the local rule-based scorer
// (priority.service.js) so booking NEVER breaks — the app just degrades to
// the transparent rules.

const env = require('../config/env');

const ML_URL = env.mlServiceUrl || 'http://127.0.0.1:8000';
const TIMEOUT_MS = 1500;

async function callMl(path, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ML ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Build the ML feature payload from a user + their latest vitals reading.
function buildPatient({ user = {}, vital = null, extra = {} }) {
  const age = computeAge(user.dob) || Number(extra.age) || 0;
  const conditions = extra.conditions || user.chronicConditions || [];
  return {
    id: String(user._id || extra.id || ''),
    age,
    conditions,
    systolic: vital?.systolic ?? 0,
    diastolic: vital?.diastolic ?? 0,
    heartRate: vital?.heartRate ?? 0,
    spo2: vital?.spo2 ?? 0,
    bloodSugar: vital?.bloodSugar ?? 0,
    temperature: vital?.temperature ?? 0,
    isPregnant: !!(user.isPregnant || extra.isPregnant),
    hasDisability: !!(user.hasDisability || extra.disability),
    daysSinceLastVisit: Number(extra.daysSinceLastVisit) || 0,
    missedAppointments: Number(extra.missedAppointments) || 0,
  };
}

// ── Clinical rule score (0-100) — exact JS port of ml-service/SehatLine/core.py
// `rule_score`. This is the ground truth the neural net was trained to
// approximate, so it is used (a) as the fallback whenever the Python service
// is unreachable — which is ALWAYS the case on the hosted (Vercel) backend —
// and (b) as a safety floor under the NN: a learned model must never score a
// patient with clinical red flags (low SpO2, BP crisis, …) LOWER than the
// rules do. Previously the fallback ignored vitals entirely, so on the live
// backend a patient with SpO2 85% got no priority at all.
const ELDERLY_AGE = 60;
const CRITICAL_KEYWORDS = [
  'heart', 'cardiac', 'cardio', 'chest pain', 'stroke', 'kidney', 'renal',
  'respiratory', 'copd', 'asthma', 'cancer', 'seizure', 'hypertension crisis',
];
const LEVELS = [[85, 'critical'], [65, 'high'], [45, 'elderly'], [25, 'normal'], [0, 'low']];

function levelFor(score) {
  for (const [t, name] of LEVELS) if (score >= t) return name;
  return 'low';
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function ruleScore(p = {}) {
  const age = num(p.age);
  const conditions = Array.isArray(p.conditions) ? p.conditions : [];
  const joined = conditions.map((c) => String(c).toLowerCase()).join(' ');
  const critical = CRITICAL_KEYWORDS.some((k) => joined.includes(k)) ? 1 : 0;
  const systolic = num(p.systolic); const diastolic = num(p.diastolic);
  const hr = num(p.heartRate); const spo2 = num(p.spo2);
  const sugar = num(p.bloodSugar); const temp = num(p.temperature);

  let s = 0;
  if (age >= ELDERLY_AGE) s += 15 + clip(age - ELDERLY_AGE, 0, 30) / 3;
  s += critical * 25;
  s += clip(conditions.length, 0, 5) * 2.5;
  if (spo2 > 0) s += spo2 < 90 ? 30 : spo2 < 94 ? 15 : 0;
  s += systolic >= 180 ? 25 : systolic >= 160 ? 15 : (systolic > 0 && systolic < 90) ? 12 : 0;
  s += diastolic >= 110 ? 12 : 0;
  s += sugar >= 300 ? 18 : sugar >= 250 ? 12 : (sugar > 0 && sugar < 60) ? 15 : 0;
  s += temp >= 103 ? 15 : temp >= 101 ? 8 : 0;
  s += hr >= 120 ? 10 : (hr > 0 && hr < 50) ? 10 : 0;
  s += (p.isPregnant ? 12 : 0) + (p.hasDisability ? 10 : 0);
  s += clip(num(p.daysSinceLastVisit) / 30, 0, 4) * 2;
  s += clip(num(p.missedAppointments), 0, 5) * 1.5;
  s = clip(s, 0, 100);
  // Red-flag override (mirrors core.py): one life-threatening vital alone
  // makes the patient at least "critical" (85).
  const redFlag = (spo2 > 0 && spo2 < 90) || systolic >= 180 || diastolic >= 120
    || (sugar > 0 && sugar < 60) || sugar >= 400 || temp >= 104
    || hr >= 130 || (hr > 0 && hr < 40);
  if (redFlag) s = Math.max(s, 85);
  return Math.round(s * 100) / 100;
}

// Score ONE patient. Returns { score, level, source } on a 0-100 scale.
async function scorePatient(patient) {
  const rule = ruleScore(patient);
  try {
    const r = await callMl('/score', patient);
    const ml = num(r.priorityScore);
    // Safety floor: never below the clinical rules.
    const score = Math.max(ml, rule);
    return { score, level: levelFor(score), source: ml >= rule ? 'ml' : 'ml+rule-floor' };
  } catch (e) {
    return { score: rule, level: levelFor(rule), source: 'rule-fallback' };
  }
}

// Rank a BATCH of patients (the booking-rush case). Returns the service's
// ranked array (with the same safety floor), or a locally-sorted fallback.
async function rankPatients(patients) {
  const rules = new Map(patients.map((p) => [String(p.id), ruleScore(p)]));
  let ranked; let source;
  try {
    const r = await callMl('/prioritize', { patients });
    ranked = (r.ranked || []).map((x) => {
      const score = Math.max(num(x.priorityScore), rules.get(String(x.id)) || 0);
      return { ...x, priorityScore: score, priorityLevel: levelFor(score) };
    });
    source = r.engine || 'ml';
  } catch (e) {
    ranked = patients.map((p) => {
      const score = rules.get(String(p.id)) || 0;
      return { id: p.id, priorityScore: score, priorityLevel: levelFor(score) };
    });
    source = 'rule-fallback';
  }
  ranked.sort((a, b) => b.priorityScore - a.priorityScore);
  ranked.forEach((x, i) => { x.rank = i + 1; });
  return { ranked, source };
}

function computeAge(dob) {
  if (!dob) return 0;
  const str = String(dob).trim();
  // Prefer an exact date (YYYY-MM-DD / ISO); fall back to just the year.
  let d = /^\d{4}-\d{2}-\d{2}/.test(str) ? new Date(str.slice(0, 10) + 'T00:00:00') : null;
  if (!d || Number.isNaN(d.getTime())) {
    const m = str.match(/\b(19|20)\d{2}\b/);
    return m ? Math.max(new Date().getFullYear() - parseInt(m[0], 10), 0) : 0;
  }
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return Math.max(age, 0);
}

module.exports = { scorePatient, rankPatients, buildPatient, ruleScore, levelFor, computeAge, ML_URL };
