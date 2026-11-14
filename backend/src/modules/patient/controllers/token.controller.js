// Token controller — the full token journey.
//
// Flow you described:
//   1) Patient gets a token → goes into Chronic OPD queue (status: in-queue).
//   2) Doctor sees them → "move to pharmacy" → status moves to pharmacy.
//      (Doctor module doesn't exist yet, so the app calls this manually.)
//   3) At pharmacy → "done" → app asks "take a lab token?"
//        • Get Lab Token → same number, department = laboratory.
//        • Mark complete → journey ends → "Thank you" → home.
//   4) Queue position is priority-aware (elderly / critical first).

const Token = require('../models/Token');
const Counter = require('../models/Counter');
const User = require('../../auth/models/User');
const Prescription = require('../models/Prescription');
const Vital = require('../models/Vital');
const Doctor = require('../models/Doctor');
const { computePriority, orderByPriority, LEVEL_SCORE } = require('../services/priority.service');
const { mmsMetrics } = require('../services/queue.engine');

// Fallback per-patient service time (minutes) and default doctors per dept.
// Doctors here are FAST (a chronic follow-up is a few minutes) — the real value
// is MEASURED from actual consultations below and overrides these.
const SERVICE_MIN = { chronic_opd: 6, pharmacy: 6, laboratory: 12 };
const DEFAULT_SERVERS = { chronic_opd: 4, pharmacy: 2, laboratory: 2 };

// How many servers (doctors on duty) are serving a department right now.
async function serversFor(department) {
  if (department === 'chronic_opd') {
    const n = await Doctor.countDocuments({ active: true });
    return Math.max(1, n || DEFAULT_SERVERS.chronic_opd);
  }
  return DEFAULT_SERVERS[department] || 2;
}

// ADAPTIVE service time: measure how long doctors ACTUALLY take from recent
// consultations (time from "started consultation" to the next stage change).
// Cached for 5 min so the estimate self-tunes without hammering the DB.
const _svcCache = {};
async function measureServiceMin(department, fallback) {
  const recent = await Token.find({ 'history.note': /started consultation/i })
    .sort({ updatedAt: -1 }).limit(120).select('history').lean();
  const durations = [];
  for (const t of recent) {
    const h = t.history || [];
    const i = h.findIndex((e) => /started consultation/i.test(e.note || ''));
    if (i >= 0 && h[i + 1]) {
      const mins = (new Date(h[i + 1].at) - new Date(h[i].at)) / 60000;
      if (mins > 0.3 && mins < 90) durations.push(mins);
    }
  }
  if (!durations.length) return fallback;
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.max(1, Math.round(avg * 10) / 10);
}
async function getServiceMin(department) {
  const fallback = SERVICE_MIN[department] || 6;
  if (department !== 'chronic_opd') return fallback; // only the OPD is measured today
  const c = _svcCache[department];
  if (c && Date.now() - c.at < 5 * 60 * 1000) return c.val;
  let val = fallback;
  try { val = await measureServiceMin(department, fallback); } catch (e) { /* keep fallback */ }
  _svcCache[department] = { val, at: Date.now() };
  return val;
}

// M/M/s-informed wait: with s doctors each ~serviceMin, a patient at queue
// position p waits ceil((p-1)/s) service cycles.
function estimateWaitMin(position, s, serviceMin) {
  const cycles = Math.max(0, Math.ceil((Number(position || 1) - 1) / Math.max(1, s)));
  return Math.round(cycles * serviceMin);
}
const { scorePatient, buildPatient } = require('../../../services/priority.ml.service');
const { listConditions, doctorForCondition, defaultMedsFor } = require('../services/chronic.config');
const { findPendingFeedback } = require('./feedback.controller');
const logger = require('../../../utils/logger');
const { notifyUser } = require('./notification.controller');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Get the socket.io instance (set on the app) to emit real-time updates.
function io(req) {
  return req.app.get('io');
}

// Broadcast the latest queue + stats to all connected clients.
async function broadcastUpdate(req) {
  try {
    const server = io(req);
    if (!server) return;
    const stats = await computeStats();
    const queue = await buildQueue('chronic_opd');
    server.emit('queue:update', { stats, queue, department: 'chronic_opd' });
  } catch (e) {
    logger.warn(`Socket broadcast failed: ${e.message}`);
  }
}

// Sequential token number, A-001 style, atomic (no duplicates).
// Resets daily so numbering starts fresh each day at A-001.
async function nextTokenNumber() {
  const dayKey = `token_${new Date().toISOString().slice(0, 10)}`; // token_2026-07-04
  const seq = await Counter.next(dayKey);
  return `A-${String(seq).padStart(3, '0')}`;
}

// Recompute queue positions for a department based on priority.
async function recomputePositions(department) {
  const active = await Token.find({
    department,
    status: { $in: ['in-queue', 'in-progress'] },
  });
  const ordered = orderByPriority(active);
  const s = await serversFor(department);
  const serviceMin = await getServiceMin(department);   // measured, self-tuning
  // One bulk write instead of N sequential saves — stays fast under heavy load.
  const ops = [];
  for (let i = 0; i < ordered.length; i++) {
    ordered[i].position = i + 1;
    ordered[i].estimatedWaitMin = estimateWaitMin(i + 1, s, serviceMin);
    ops.push({ updateOne: { filter: { _id: ordered[i]._id }, update: { $set: { position: i + 1, estimatedWaitMin: ordered[i].estimatedWaitMin } } } });
  }
  if (ops.length) await Token.bulkWrite(ops, { ordered: false });
  return ordered;
}

// Compute hospital-wide stats for the Home screen (all real, from DB).
async function computeStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayTokens, served, appointments, reports, waiting, doctors] = await Promise.all([
    Token.countDocuments({ createdAt: { $gte: startOfDay } }),          // tokens issued today
    Token.countDocuments({ status: 'completed', createdAt: { $gte: startOfDay } }), // served today
    Token.countDocuments({ status: { $in: ['in-queue', 'in-progress', 'pharmacy', 'laboratory'] } }), // active appointments
    Token.countDocuments({ labRequested: true, createdAt: { $gte: startOfDay } }), // lab reports
    Token.countDocuments({ department: 'chronic_opd', status: 'in-queue' }),
    Doctor.countDocuments({ active: true }),
  ]);

  // Live M/M/s (Erlang C) snapshot for the OPD: arrival rate from today's tokens
  // over the hours elapsed, service rate from the ~15-min consult, doctors on duty.
  const hoursElapsed = Math.max(0.5, (Date.now() - startOfDay.getTime()) / 3600000);
  const lambda = todayTokens / hoursElapsed;             // arrivals per hour
  const serviceMin = await getServiceMin('chronic_opd'); // MEASURED doctor pace
  const mu = 60 / serviceMin;                            // patients/hr per doctor
  const s = Math.max(1, doctors || DEFAULT_SERVERS.chronic_opd);
  const m = mmsMetrics(lambda, mu, s);
  const queueModel = {
    doctorsOnDuty: s,
    avgConsultMin: serviceMin,                                     // measured minutes/patient
    arrivalsPerHour: Math.round(lambda * 10) / 10,
    utilization: isFinite(m.rho) ? Math.round(m.rho * 100) : 100, // %
    avgWaitMin: isFinite(m.Wq) ? Math.round(m.Wq) : null,          // estimated wait (min)
    expectedInQueue: isFinite(m.Lq) ? Math.round(m.Lq) : null,
    overloaded: !m.stable,                                         // needs more doctors / hours
  };

  return {
    appointments,   // active appointments right now
    tokens: todayTokens, // total tokens today
    served,         // completed today
    reports,        // lab reports today
    waiting,        // waiting in OPD
    queueModel,     // live M/M/s estimate (Erlang C)
  };
}

// Build an ordered, display-ready queue for a department.
async function buildQueue(department) {
  const ordered = await recomputePositions(department);
  const nowServing = ordered.find((t) => t.status === 'in-progress') || null;
  return {
    nowServing: nowServing ? nowServing.tokenNumber : (ordered[0] ? ordered[0].tokenNumber : null),
    waiting: ordered.filter((t) => t.status === 'in-queue').length,
    total: ordered.length,
    tokens: ordered.map((t) => ({
      tokenNumber: t.tokenNumber,
      position: t.position,
      status: t.status,
      priorityLevel: t.priorityLevel,
    })),
  };
}

// ── GENERATE TOKEN ────────────────────────────────────────────────────────
// POST /api/patient/tokens/generate
async function generateToken(req, res, next) {
  try {
    // GATE: only patients classified as chronic (by an admin or doctor) may
    // use the Chronic OPD.
    if (!req.user.isChronic) {
      return res.status(403).json({
        success: false,
        code: 'NOT_CHRONIC',
        message: 'The Chronic OPD is for registered chronic patients only. Please ask your doctor or the administration to enable chronic care for your account.',
      });
    }

    // One active token per patient at a time.
    const existing = await Token.findOne({
      user: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    });
    if (existing) {
      return res.json({
        success: true,
        message: 'You already have an active token.',
        token: existing,
        alreadyActive: true,
      });
    }

    // Is this a follow-up token (view lab reports only, no medicine repeat)?
    const wantsFollowUp = req.body.followUp === true || req.body.followUp === 'true';

    // MANDATORY: rate the previous doctor visit before booking a new one.
    const pendingFb = await findPendingFeedback(req.user._id);
    if (pendingFb) {
      return res.status(409).json({
        success: false,
        code: 'FEEDBACK_REQUIRED',
        message: 'Please share feedback about your last doctor visit before booking a new one.',
        visit: pendingFb,
      });
    }

    // RULE: chronic meds are given for 30 days, so a chronic patient can only
    // take a new Chronic OPD token 30 days after their last completed one.
    // EXCEPTION: if their last visit prescribed lab tests (so reports exist),
    // they may take a FOLLOW-UP token within the window — only to show those
    // reports to the doctor. It does not repeat medicine.
    const lastCompleted = await Token.findOne({
      user: req.user._id,
      status: 'completed',
    }).sort({ completedAt: -1 });

    let isFollowUp = false;
    if (lastCompleted && lastCompleted.completedAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastCompleted.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 30) {
        // Reports exist only if the previous journey included the lab.
        const followUpAvailable = !!lastCompleted.labRequested;
        if (wantsFollowUp && followUpAvailable) {
          isFollowUp = true; // allowed — proceed to issue a reports-only token
        } else {
          const daysLeft = 30 - daysSince;
          return res.status(409).json({
            success: false,
            code: 'TOO_SOON',
            message: followUpAvailable
              ? `Your chronic medicines are valid for 30 days (${daysLeft} day(s) left). You can, however, take a follow-up token to show your lab reports to the doctor.`
              : `Your chronic medicines are valid for 30 days. You can take a new token in ${daysLeft} day(s).`,
            daysLeft,
            followUpAvailable,
          });
        }
      }
    }

    // RULE: can't take a chronic token if a cardiology appointment exists at
    // the same date+time (clash is per date+time). Since a token is for "now",
    // block if there's a cardiology appointment booked for today at a time
    // within the next hour window. (Simple same-day guard.)
    const Appointment = require('../models/Appointment');
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaysCardio = await Appointment.findOne({
      user: req.user._id, date: todayStr, status: 'booked',
    });
    if (todaysCardio) {
      return res.status(409).json({
        success: false,
        code: 'CARDIO_CLASH',
        message: `You have a cardiology appointment today at ${todaysCardio.time}. Please attend it or reschedule before taking a chronic token.`,
      });
    }

    // The chronic illness the patient is here for, and the doctor that maps to.
    const chronicIllness = String(req.body.chronicIllness || '').trim();
    let assignedDoctor = doctorForCondition(chronicIllness);

    // A follow-up is only to show lab reports, so it must go BACK to the same
    // doctor who ordered those tests (they know the case) — not just whoever the
    // illness maps to. Reuse the prescribing doctor from the last completed visit.
    if (isFollowUp && lastCompleted?.assignedDoctor?.doctorId) {
      assignedDoctor = {
        doctorId: lastCompleted.assignedDoctor.doctorId,
        name: lastCompleted.assignedDoctor.name || assignedDoctor.name,
        specialization: lastCompleted.assignedDoctor.specialization || assignedDoctor.specialization,
        room: lastCompleted.assignedDoctor.room || assignedDoctor.room,
      };
    }

    // Gather patient factors for priority. Age from DOB; conditions from body,
    // the chosen illness, or the user profile (chronic conditions).
    const age = computeAge(req.user.dob) || Number(req.body.age) || 0;
    const conditions = req.body.conditions
      || (chronicIllness ? [chronicIllness] : null)
      || req.user.chronicConditions || [];
    const isPregnant = !!req.body.isPregnant;
    const disability = !!req.body.disability;

    const priority = computePriority({ age, conditions, isPregnant, disability, isFollowUp });

    // AI/ML triage score using the patient's most recent vitals (falls back to
    // the transparent rule score if the ML service is down). This is what lets
    // the queue put critical-vitals + elderly patients ahead automatically.
    // priority.score is on the legacy 50-1100 rule scale; tokens are stored on
    // the 0-100 triage scale (same as scorePatient) so they sort together.
    let priorityScore = Math.min(100, Math.round(priority.score / 11));
    let priorityLevel = priority.level;
    try {
      const vital = await Vital.findOne({ user: req.user._id }).sort({ recordedAt: -1 }).lean();
      const patient = buildPatient({ user: req.user, vital, extra: { conditions, isPregnant, disability, age } });
      const s = await scorePatient(patient);
      priorityScore = s.score;
      priorityLevel = s.level;
    } catch (e) { /* keep rule score */ }

    // Guarantee the follow-up boost even when the ML score is used: a reports
    // review is prioritised over standard patients (but stays below any higher
    // clinical priority the ML/rules already assigned).
    //
    // BUG FIX: scorePatient() returns a 0-100 score, but this used to clamp
    // follow-ups up to LEVEL_SCORE.high (=700, the old rule scale) — which put
    // every follow-up AHEAD of genuinely critical patients (85-100). Use the
    // 0-100 "high" threshold instead so critical patients still go first.
    const FOLLOWUP_FLOOR = 65; // = 'high' on the 0-100 triage scale
    if (isFollowUp && priorityScore < FOLLOWUP_FLOOR) {
      priorityScore = FOLLOWUP_FLOOR;
      priorityLevel = 'high';
    }

    // Atomic sequential number (A-001, A-002...) — no double-booking.
    const tokenNumber = await nextTokenNumber();

    const token = await Token.create({
      user: req.user._id,
      tokenNumber,
      department: 'chronic_opd',
      status: 'in-queue',
      priorityScore,
      priorityLevel,
      priorityReason: priority.reason,
      factors: priority.factors,
      chronicIllness,
      assignedDoctor,
      isFollowUp,
    });
    token.log(isFollowUp
      ? `Follow-up token issued — Chronic OPD (view reports${chronicIllness ? `: ${chronicIllness}` : ''})`
      : `Token issued — Chronic OPD${chronicIllness ? ` (${chronicIllness})` : ''}`);
    await token.save();

    logger.db('INSERT', 'Token', `${tokenNumber} for ${req.user.email} (${priority.level})`);
    logger.success(`Token ${tokenNumber} issued — priority: ${priority.level} (${priority.reason})`);

    // Recompute the queue so elderly/critical get their position.
    await recomputePositions('chronic_opd');
    const updated = await Token.findById(token._id);

    // Real-time: tell everyone the queue + stats changed.
    await broadcastUpdate(req);

    return res.status(201).json({
      success: true,
      message: isFollowUp
        ? `Follow-up token issued. Please see ${assignedDoctor.name} at ${assignedDoctor.room} to review your reports.`
        : `Token generated. Please proceed to ${assignedDoctor.name} (${assignedDoctor.specialization}) at ${assignedDoctor.room}.`,
      token: updated,
      assignedDoctor,
      isFollowUp,
    });
  } catch (err) {
    next(err);
  }
}

// ── CHRONIC CONFIG (illness → doctor choices for the app) ─────────────────
// GET /api/patient/chronic/config
async function getChronicConfig(req, res, next) {
  try {
    // Whether the patient could take a follow-up (reports-only) token right
    // now, and the countdown for a normal token — so the screen can guide them.
    const lastCompleted = await Token.findOne({
      user: req.user._id, status: 'completed',
    }).sort({ completedAt: -1 });

    let daysLeft = 0;
    let followUpAvailable = false;
    if (lastCompleted && lastCompleted.completedAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastCompleted.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 30) {
        daysLeft = 30 - daysSince;
        followUpAvailable = !!lastCompleted.labRequested;
      }
    }

    return res.json({
      success: true,
      conditions: listConditions(),
      lockedForDays: daysLeft,           // 0 ⇒ a normal token can be taken
      followUpAvailable,                 // true ⇒ reports-only token allowed within the window
    });
  } catch (err) {
    next(err);
  }
}

// ── GET MY ACTIVE TOKEN ───────────────────────────────────────────────────
// GET /api/patient/tokens/active
async function getActiveToken(req, res, next) {
  try {
    const token = await Token.findOne({
      user: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    }).populate('prescription');
    if (!token) return res.json({ success: true, token: null });

    // How many are ahead at the current department (higher priority score).
    const ahead = await Token.countDocuments({
      department: token.department,
      status: { $in: ['in-queue', 'in-progress'] },
      // Same order as orderByPriority: higher score first, then FIFO on ties.
      // (Counting only strictly-higher scores ignored equal-priority patients
      // who arrived earlier, so "ahead" and the ETA were too optimistic.)
      _id: { $ne: token._id },
      $or: [
        { priorityScore: { $gt: token.priorityScore } },
        { priorityScore: token.priorityScore, issuedAt: { $lt: token.issuedAt } },
      ],
    });

    // Live M/M/s-informed estimated wait: patients ahead ÷ doctors on duty × MEASURED service time.
    const s = await serversFor(token.department);
    const serviceMin = await getServiceMin(token.department);
    const estimatedWaitMin = token.status === 'in-progress' ? 0 : estimateWaitMin(ahead + 1, s, serviceMin);

    // Who is now serving at this department.
    const serving = await Token.findOne({ department: token.department, status: 'in-progress' });

    // Friendly stage label for the UI.
    const stageLabel = {
      'in-queue': 'Waiting',
      'in-progress': 'Now Serving',
      'pharmacy': 'Pharmacy',
      'awaiting_lab_choice': 'Pharmacy Done',
      'laboratory': 'Laboratory',
    }[token.status] || token.status;

    return res.json({
      success: true,
      token,
      ahead,
      estimatedWaitMin,
      doctorsOnDuty: s,
      isNext: ahead === 0,
      isNowServing: token.status === 'in-progress',
      stage: stageLabel,
      nowServing: serving ? serving.tokenNumber : null,
      awaitingLabChoice: token.status === 'awaiting_lab_choice',
    });
  } catch (err) {
    next(err);
  }
}

// ── LIVE QUEUE for a department ───────────────────────────────────────────
// GET /api/patient/tokens/queue/:department
async function getQueue(req, res, next) {
  try {
    const department = req.params.department;
    const ordered = await recomputePositions(department);
    const nowServing = ordered.find((t) => t.status === 'in-progress') || ordered[0] || null;

    return res.json({
      success: true,
      department,
      nowServing: nowServing ? nowServing.tokenNumber : null,
      waiting: ordered.filter((t) => t.status === 'in-queue').length,
      queue: ordered.map((t) => ({
        tokenNumber: t.tokenNumber,
        position: t.position,
        status: t.status,
        priorityLevel: t.priorityLevel,
        estimatedWaitMin: t.estimatedWaitMin,
        isMine: String(t.user) === String(req.user._id),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ── ADVANCE TOKEN (journey transitions) ───────────────────────────────────
// POST /api/patient/tokens/:id/advance   body: { action }
// action ∈ 'move_to_pharmacy' | 'pharmacy_done' | 'get_lab_token' | 'complete'
async function advanceToken(req, res, next) {
  try {
    const { action } = req.body;
    const token = await Token.findOne({ _id: req.params.id, user: req.user._id });
    if (!token) return fail(res, 404, 'Token not found', 'NOT_FOUND');
    if (token.status === 'completed') return fail(res, 400, 'Token already completed', 'DONE');

    switch (action) {
      case 'move_to_pharmacy':
        token.department = 'pharmacy';
        token.status = 'pharmacy';
        token.log('Moved to Pharmacy (doctor finished)');
        break;

      case 'pharmacy_done':
        // Pharmacy finished — patient will be asked about a lab token.
        token.status = 'in-progress'; // holding state; app shows the lab prompt
        token.log('Pharmacy done — awaiting lab choice');
        break;

      case 'get_lab_token':
        token.department = 'laboratory';
        token.status = 'laboratory';
        token.labRequested = true;
        token.log(token.history?.some((h) => /Lab token cancelled/.test(h.note || ''))
          ? 'Lab token rescheduled — Laboratory'
          : 'Lab token taken — Laboratory');
        break;

      case 'cancel_lab':
        // Patient cancels the lab visit. The token leaves the lab queue but the
        // prescribed tests remain, so they can reschedule (get_lab_token) later.
        if (token.department !== 'laboratory') return fail(res, 400, 'No active lab token to cancel.', 'NO_LAB');
        token.department = 'pharmacy';       // hold outside the lab queue
        token.status = 'awaiting_lab_choice';
        token.labRequested = false;
        token.log('Lab token cancelled — can reschedule later');
        break;

      case 'complete':
        token.department = 'done';
        token.status = 'completed';
        token.completedAt = new Date();
        token.log('Journey completed — thank you');
        break;

      default:
        return fail(res, 400, 'Unknown action', 'BAD_ACTION');
    }

    await token.save();
    logger.db('UPDATE', 'Token', `${token.tokenNumber} → ${action}`);

    // Recompute positions for affected departments.
    await recomputePositions('chronic_opd');
    if (token.department === 'pharmacy') await recomputePositions('pharmacy');
    if (token.department === 'laboratory' || action === 'cancel_lab' || action === 'get_lab_token') await recomputePositions('laboratory');

    const updated = await Token.findById(token._id);

    // Real-time update to all clients.
    await broadcastUpdate(req);

    return res.json({
      success: true,
      message: messageFor(action),
      token: updated,
      completed: updated.status === 'completed',
    });
  } catch (err) {
    next(err);
  }
}

// ── STATS for Home screen ─────────────────────────────────────────────────
// GET /api/patient/stats
async function getStats(req, res, next) {
  try {
    const stats = await computeStats();
    return res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}

function messageFor(action) {
  switch (action) {
    case 'move_to_pharmacy': return 'Token moved to Pharmacy.';
    case 'pharmacy_done': return 'Pharmacy complete.';
    case 'get_lab_token': return 'Lab token issued. Please proceed to Laboratory.';
    case 'cancel_lab': return 'Lab token cancelled. You can reschedule it whenever you are ready.';
    case 'complete': return 'Thank You for choosing CDA Hospital.';
    default: return 'Updated.';
  }
}

// ---- helpers ----
function computeAge(dob) {
  if (!dob) return 0;
  // dob may be "31 Dec 2002", "2002-12-31", etc. Extract a year.
  const yearMatch = String(dob).match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return 0;
  const year = parseInt(yearMatch[0], 10);
  return Math.max(new Date().getFullYear() - year, 0);
}

// ── CALL NEXT (simulates doctor / pharmacist / lab tech) ──────────────────
// POST /api/patient/tokens/call-next   body: { department }
// Since doctor/pharmacy/lab modules don't exist yet, this endpoint simulates
// a staff member calling the next patient at a department:
//   • The current "now serving" (in-progress) token advances to its next stage.
//   • The next waiting token (by priority) becomes "now serving".
async function callNext(req, res, next) {
  try {
    const department = req.body.department || 'chronic_opd';

    // 1) Find who is currently at this department.
    //    In Chronic OPD the "current" patient is 'in-progress'.
    //    In Pharmacy/Lab the patient sits in 'pharmacy'/'laboratory' status.
    let current = null;
    if (department === 'chronic_opd') {
      current = await Token.findOne({ department: 'chronic_opd', status: 'in-progress' });
      // If none is being served yet, promote the first waiting one instead of failing.
      if (!current) {
        const waitingOpd = await Token.find({ department: 'chronic_opd', status: 'in-queue' });
        const orderedOpd = orderByPriority(waitingOpd);
        if (orderedOpd[0]) {
          orderedOpd[0].status = 'in-progress';
          orderedOpd[0].log('Now serving');
          await orderedOpd[0].save();
          await recomputePositions('chronic_opd');
          await broadcastUpdate(req);
          return res.json({ success: true, nowServing: orderedOpd[0].tokenNumber, advanced: null });
        }
      }
    } else if (department === 'pharmacy') {
      // The patient currently at pharmacy.
      current = await Token.findOne({ department: 'pharmacy', status: 'pharmacy' });
    } else if (department === 'laboratory') {
      current = await Token.findOne({ department: 'laboratory', status: 'laboratory' });
    }

    // 2) Advance the current patient to the next stage.
    if (current) {
      if (department === 'chronic_opd') {
        const tests = Array.isArray(req.body.prescribedTests) ? req.body.prescribedTests.filter(Boolean) : [];

        // A FOLLOW-UP token is reports-only: the doctor reviews the lab
        // reports and the journey ends here — no pharmacy, no new medicine.
        if (current.isFollowUp) {
          current.department = 'done';
          current.status = 'completed';
          current.completedAt = new Date();
          current.log('Doctor reviewed reports → follow-up completed (no medicine)');
        } else {
          // Doctor finished a normal visit. Build the PRESCRIPTION that goes
          // to the pharmacy — a snapshot of the patient's identity plus the
          // medicines (default for their illness) and any lab tests.
          if (tests.length > 0) {
            current.labRequired = true;
            current.prescribedTests = tests;
          }
          try {
            const patient = await User.findById(current.user);
            const medicines = defaultMedsFor(current.chronicIllness);
            const presc = await Prescription.create({
              token: current._id,
              tokenNumber: current.tokenNumber,
              user: current.user,
              patient: {
                name: patient?.name || '',
                email: patient?.email || '',
                cnic: patient?.cnic || '',
                phone: patient?.phone || '',
                cdaCard: patient?.cdaCard || '',
                age: computeAge(patient?.dob) || 0,
              },
              chronicIllness: current.chronicIllness || '',
              doctor: {
                doctorId: current.assignedDoctor?.doctorId || '',
                name: current.assignedDoctor?.name || '',
                specialization: current.assignedDoctor?.specialization || '',
              },
              medicines,
              tests,
              pharmacyStatus: 'pending',
              labStatus: tests.length > 0 ? 'pending' : 'none',
            });
            current.prescription = presc._id;
            logger.db('INSERT', 'Prescription', `${current.tokenNumber} → pharmacy (${medicines.length} meds, ${tests.length} tests)`);
          } catch (e) {
            logger.warn(`Could not create prescription for ${current.tokenNumber}: ${e.message}`);
          }

          current.department = 'pharmacy';
          current.status = 'pharmacy';
          current.log(tests.length > 0
            ? `Doctor finished → Pharmacy (tests prescribed: ${tests.join(', ')})`
            : 'Doctor finished → moved to Pharmacy');
        }
      } else if (department === 'pharmacy') {
        // Pharmacist dispensed the medicine — mark the prescription.
        if (current.prescription) {
          await Prescription.updateOne(
            { _id: current.prescription },
            { $set: { pharmacyStatus: 'dispensed', dispensedAt: new Date() } }
          );
        }
        // Pharmacy finished. Auto-route based on whether the doctor prescribed
        // tests: tests → Laboratory (keep same token number); no tests →
        // journey complete (thank you).
        if (current.labRequired) {
          current.department = 'laboratory';
          current.status = 'laboratory';
          current.labRequested = true;
          current.log('Pharmacy done → Laboratory (tests prescribed)');
        } else {
          current.department = 'done';
          current.status = 'completed';
          current.completedAt = new Date();
          current.log('Pharmacy done → completed (no tests)');
        }
      } else if (department === 'laboratory') {
        // Lab collected the samples / finished the tests.
        if (current.prescription) {
          await Prescription.updateOne(
            { _id: current.prescription },
            { $set: { labStatus: 'completed', labCompletedAt: new Date() } }
          );
        }
        current.department = 'done';
        current.status = 'completed';
        current.completedAt = new Date();
        current.log('Laboratory finished → completed');
      }
      await current.save();
    }

    // 3) For Chronic OPD, promote the next waiting token to "now serving".
    let nextToken = null;
    if (department === 'chronic_opd') {
      const waiting = await Token.find({ department: 'chronic_opd', status: 'in-queue' });
      const ordered = orderByPriority(waiting);
      nextToken = ordered[0] || null;
      if (nextToken) {
        nextToken.status = 'in-progress';
        nextToken.log('Now serving');
        await nextToken.save();
        // Land it in the bell menu too, not just the live socket push.
        notifyUser(nextToken.user, {
          type: 'token',
          title: 'It is your turn',
          body: `Token ${nextToken.tokenNumber} — please proceed to the doctor's room.`,
          icon: 'walk',
          screen: 'TokenJourneyScreen',
        });
      }
    }

    await recomputePositions('chronic_opd');
    await broadcastUpdate(req);

    return res.json({
      success: true,
      nowServing: nextToken ? nextToken.tokenNumber : null,
      advanced: current ? current.tokenNumber : null,
      currentStatus: current ? current.status : null,
    });
  } catch (err) {
    next(err);
  }
}

// ── LIVE QUEUE SUMMARY (all departments) ──────────────────────────────────
// GET /api/patient/queues/summary
async function getQueuesSummary(req, res, next) {
  try {
    const depts = [
      { key: 'chronic_opd', label: 'Chronic OPD' },
      { key: 'pharmacy', label: 'Pharmacy' },
      { key: 'laboratory', label: 'Laboratory' },
    ];
    const summary = [];
    for (const d of depts) {
      const statusForServing = d.key === 'chronic_opd' ? 'in-progress' : d.key;
      const serving = await Token.findOne({ department: d.key, status: statusForServing }).sort({ updatedAt: -1 });
      const waitingCount = await Token.countDocuments({
        department: d.key,
        status: d.key === 'chronic_opd' ? 'in-queue' : { $in: ['pharmacy', 'laboratory'] },
      });
      summary.push({
        department: d.key,
        label: d.label,
        nowServing: serving ? serving.tokenNumber : '—',
        waiting: waitingCount,
      });
    }
    return res.json({ success: true, queues: summary });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateToken, getActiveToken, getQueue, advanceToken, getStats, callNext, getQueuesSummary, getChronicConfig,
  // Exposed for integration tests — the exact live queue helpers.
  _internals: { serversFor, estimateWaitMin, measureServiceMin, getServiceMin, recomputePositions, computeStats },
};
