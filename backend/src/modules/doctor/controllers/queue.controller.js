// Doctor QUEUE — powers DoctorPortalScreen, TodayQueueScreen,
// RealTimeQueueScreen and DoctorDashboardScreen.
//
//   GET  /api/doctor/dashboard              → today's overview + queue health
//   GET  /api/doctor/queue                  → the pooled chronic-OPD queue
//   GET  /api/doctor/my-queue               → THIS doctor's own live queue
//   POST /api/doctor/consult/:tokenId/start → call this patient now
//
// The chronic OPD is one shared, priority-ordered queue (server pooling — the
// queueing-theory way to minimise waiting). Cardiology doctors instead serve
// their own booked appointments.

const { localDateStr, label12 } = require('../../../utils/dates');
const Token = require('../../patient/models/Token');
const User = require('../../auth/models/User');
const Appointment = require('../../patient/models/Appointment');
const { doctorForCondition } = require('../../patient/services/chronic.config');
const { orderByPriority } = require('../../patient/services/priority.service');
const queueing = require('../../patient/services/queueing.service');
const {
  AVG_CONSULT_MIN, fail, startOfToday, computeAge,
  onDutyDoctorCount, recomputeOpd, broadcast,
} = require('../services/doctor.service');

// ── DASHBOARD ─────────────────────────────────────────────────────────────
async function getDashboard(req, res, next) {
  try {
    const today = startOfToday();
    const [patientsToday, waiting, completed, servers] = await Promise.all([
      Token.countDocuments({ department: 'chronic_opd', createdAt: { $gte: today } }),
      Token.countDocuments({ department: 'chronic_opd', status: 'in-queue' }),
      Token.countDocuments({ status: 'completed', completedAt: { $gte: today } }),
      onDutyDoctorCount(),
    ]);

    // Live queueing-theory snapshot. λ estimated from today's arrivals so far.
    const hoursElapsed = Math.max(1, (Date.now() - today.getTime()) / 3600000);
    const lambda = patientsToday / hoursElapsed;
    const m = queueing.metrics({ lambda, muPerServer: 60 / AVG_CONSULT_MIN, servers });

    const schedule = {
      opd: '09:00 – 13:00',
      breakTime: '11:30 – 12:00',
      room: 'Chronic OPD, Room D-200',
      onDutyDoctors: servers,
    };

    return res.json({
      success: true,
      doctor: { name: req.user.name, email: req.user.email },
      overview: { patientsToday, waiting, completed },
      queueHealth: m,               // utilisation, avgWaitMin, probWait…
      schedule,
    });
  } catch (err) { next(err); }
}

// ── LIVE OPD QUEUE (pooled) ────────────────────────────────────────────────
async function getQueue(req, res, next) {
  try {
    const ordered = await recomputeOpd();
    const servers = await onDutyDoctorCount();
    const userIds = ordered.map((t) => t.user);
    const users = await User.find({ _id: { $in: userIds } }).select('name cnic dob chronicConditions').lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const nowServing = ordered.find((t) => t.status === 'in-progress') || null;

    const queue = ordered.map((t, idx) => {
      const u = byId[String(t.user)] || {};
      const aheadCount = ordered.slice(0, idx).filter((x) => x.status === 'in-queue').length;
      return {
        tokenId: String(t._id),
        tokenNumber: t.tokenNumber,
        position: t.position,
        status: t.status,
        priorityLevel: t.priorityLevel,
        priorityReason: t.priorityReason,
        isFollowUp: t.isFollowUp,
        chronicIllness: t.chronicIllness,
        patientName: u.name || 'Patient',
        age: computeAge(u.dob),
        estWaitMin: t.status === 'in-progress' ? 0 : queueing.estimateWaitForPosition(aheadCount, servers, AVG_CONSULT_MIN),
      };
    });

    return res.json({
      success: true,
      nowServing: nowServing ? nowServing.tokenNumber : null,
      waiting: queue.filter((q) => q.status === 'in-queue').length,
      onDutyDoctors: servers,
      queue,
    });
  } catch (err) { next(err); }
}

// ── START CONSULT (call this patient now) ─────────────────────────────────
async function startConsult(req, res, next) {
  try {
    const token = await Token.findOne({ _id: req.params.tokenId, department: 'chronic_opd' }).catch(() => null);
    if (!token) {
      // Cardiology booking: mark the appointment in-progress so it shows as
      // "now serving" and isn't auto-closed while the patient is with the doctor.
      const appt = await Appointment.findById(req.params.tokenId).catch(() => null);
      if (!appt) return fail(res, 404, 'Token not found in the OPD queue', 'NOT_FOUND');
      if (appt.status === 'completed') return fail(res, 400, 'This visit is already complete', 'DONE');
      if (appt.status === 'booked') { appt.status = 'in-progress'; await appt.save(); }
      return res.json({ success: true, message: 'Consultation started', tokenNumber: appt.tokenNumber });
    }
    if (token.status === 'completed') return fail(res, 400, 'This visit is already complete', 'DONE');

    token.status = 'in-progress';
    token.log('Doctor started consultation');
    await token.save();
    await recomputeOpd();
    await broadcast(req);
    return res.json({ success: true, message: 'Consultation started', tokenNumber: token.tokenNumber });
  } catch (err) { next(err); }
}

// ── PER-DOCTOR LIVE QUEUE ─────────────────────────────────────────────────
// Each doctor sees ONLY their own queue:
//   • cardiology doctor (doctorId 'cardio_*') → today's + upcoming appointments.
//   • chronic doctor (doctorId 'chronic_*')   → chronic-OPD tokens whose
//     illness maps to this doctor, priority-ordered with queueing-theory waits.
//   • generic doctor (no doctorId)            → the whole chronic OPD pool.
async function getMyQueue(req, res, next) {
  try {
    const doctorId = req.user.doctorId || '';
    const servers = 1; // this single doctor serves their own line

    if (doctorId.startsWith('cardio')) {
      const today = localDateStr();
      // Today's Queue = TODAY's appointments only. A doctor's daily session runs
      // for the current day; future days (e.g. Wednesday's bookings) are NOT
      // shown today — they appear in the queue on their own day. Once today's
      // appointments are all seen, the queue is simply empty.
      const appts = await Appointment.find({ doctorId, date: today, status: { $in: ['booked', 'in-progress'] } })
        .sort({ time: 1 }).lean();
      await Appointment.ensureTokenNumbers(appts);
      const users = await User.find({ _id: { $in: appts.map((a) => a.user) } }).select('name dob').lean();
      const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
      const queue = appts.map((a, idx) => ({
        id: String(a._id), tokenId: String(a._id),
        // BUG FIX: the slot TIME used to be sent as the "token". Now the real
        // system-assigned token number, with the slot time sent separately.
        token: a.tokenNumber, tokenNumber: a.tokenNumber,
        slotTime: a.time, timeLabel: label12(a.time),
        date: a.date,
        isToday: a.date === today,
        patientName: byId[String(a.user)]?.name || 'Patient',
        age: computeAge(byId[String(a.user)]?.dob),
        reason: a.reason || 'Cardiology',
        status: a.status, position: idx + 1,
        estWaitMin: a.date === today ? queueing.estimateWaitForPosition(idx, servers, AVG_CONSULT_MIN) : null,
      }));
      return res.json({ success: true, department: 'cardiology', waiting: queue.length, queue });
    }

    // Chronic / generic: tokens in the chronic OPD pool, filtered to this doctor.
    // Prefer the token's STORED assigned doctor (a follow-up is pinned to the
    // doctor who ordered the tests) and fall back to the illness→doctor mapping
    // for older tokens that predate the stored field.
    const active = await Token.find({ department: 'chronic_opd', status: { $in: ['in-queue', 'in-progress'] } });
    let mine = active;
    if (doctorId) {
      mine = active.filter((t) => {
        const assigned = t.assignedDoctor?.doctorId || doctorForCondition(t.chronicIllness)?.doctorId || 'chronic_gp';
        return assigned === doctorId;
      });
    }
    const ordered = orderByPriority(mine);
    const users = await User.find({ _id: { $in: ordered.map((t) => t.user) } }).select('name dob').lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const nowServing = ordered.find((t) => t.status === 'in-progress') || null;
    const queue = ordered.map((t, idx) => {
      const ahead = ordered.slice(0, idx).filter((x) => x.status === 'in-queue').length;
      return {
        tokenId: String(t._id), token: t.tokenNumber, tokenNumber: t.tokenNumber,
        patientName: byId[String(t.user)]?.name || 'Patient', age: computeAge(byId[String(t.user)]?.dob),
        reason: t.chronicIllness || 'Chronic OPD', chronicIllness: t.chronicIllness,
        priorityLevel: t.priorityLevel, status: t.status, position: idx + 1,
        estWaitMin: t.status === 'in-progress' ? 0 : queueing.estimateWaitForPosition(ahead, servers, AVG_CONSULT_MIN),
      };
    });
    return res.json({
      success: true, department: 'chronic_opd',
      nowServing: nowServing ? nowServing.tokenNumber : null,
      waiting: queue.filter((q) => q.status === 'in-queue').length,
      queue,
    });
  } catch (err) { next(err); }
}

module.exports = { getDashboard, getQueue, startConsult, getMyQueue };
