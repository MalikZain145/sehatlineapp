// Appointment controller — CARDIOLOGY bookings with strict rules.
//
// Booking rules:
//   1) No double-booking the same date+time: if the patient already has a
//      cardiology appointment OR an active chronic token at that date+time,
//      block it. (Clash is per date+time, not the whole day — a different
//      time on the same day is allowed.)
//   2) A cardiology slot (date+time+doctor) can be held by only one patient.
//
// Chronic OPD tokens are handled in token.controller.js. The 30-day chronic
// rule is enforced there (generateToken).

const Appointment = require('../models/Appointment');
const Token = require('../models/Token');
const Vital = require('../models/Vital');
const emailService = require('../../../services/email.service');
const { scorePatient, buildPatient } = require('../../../services/priority.ml.service');
const { findPendingFeedback } = require('./feedback.controller');
const logger = require('../../../utils/logger');

// Score a patient's triage priority using their latest vitals + profile.
async function computeAppointmentPriority(user) {
  try {
    const vital = await Vital.findOne({ user: user._id }).sort({ recordedAt: -1 }).lean();
    const patient = buildPatient({ user, vital });
    return await scorePatient(patient);
  } catch (e) {
    return { score: 0, level: 'normal', source: 'none' };
  }
}

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

function io(req) { return req.app.get('io'); }

// Fallback slots / days if a doctor row has none (should not happen after
// seeding, but keeps the endpoint safe).
const DEFAULT_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '12:00', '12:30', '13:00'];
const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Legacy fallback doctor list (only used if the DB has no doctors seeded).
const CARDIO_DOCTORS = [
  { id: 'cardio_1', name: 'Dr. Ahmed Hassan' },
  { id: 'cardio_2', name: 'Dr. Fatima Noor' },
];

// 'YYYY-MM-DD' → short weekday name ('Mon'...'Sun'), timezone-safe.
function weekdayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[new Date(y, (m || 1) - 1, d || 1).getDay()];
}

// Hospital session: doctors sit Monday–Saturday. Booking is open 8:00 AM to
// 1:00 PM; the doctor keeps seeing already-booked patients until the session
// ends at 2:00 PM. So NO new booking after 1 PM, and Sundays are closed.
const SESSION_START = '08:00';
const BOOKING_END = '13:00';  // 1:00 PM — booking window closes (no slots at/after)
const SESSION_END = '14:00';  // 2:00 PM — doctors finish seeing booked patients

function nowParts() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { todayStr, nowHHMM };
}

// Is this date+time still a valid, bookable slot? Enforces Mon–Sat, the
// 8 AM–1 PM BOOKING window, no past dates, and no past-or-after-1pm slots today.
// ('YYYY-MM-DD' and 'HH:MM' compare correctly as zero-padded strings.)
function slotBookable(date, time, bookingEnd) {
  const { todayStr, nowHHMM } = nowParts();
  // A doctor may extend their own booking window past the hospital default.
  const endLimit = /^\d{2}:\d{2}$/.test(String(bookingEnd || '')) ? bookingEnd : BOOKING_END;
  if (weekdayOf(date) === 'Sun') return { ok: false, reason: 'Hospital is closed on Sundays. Sessions run Monday to Saturday.' };
  if (date < todayStr) return { ok: false, reason: 'That date has already passed.' };
  if (time < SESSION_START || time >= endLimit) return { ok: false, reason: `This time is outside the booking window (until ${label12(endLimit)}). Please pick an earlier slot.` };
  if (date === todayStr) {
    if (nowHHMM >= endLimit) return { ok: false, reason: `Today's booking window (until ${label12(endLimit)}) has closed. Please book for another day.` };
    if (time <= nowHHMM) return { ok: false, reason: 'That time has already passed today.' };
  }
  return { ok: true };
}

// 'HH:mm' → '1:00 PM' for user-facing messages.
function label12(t24) {
  const [h, m] = String(t24).split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${mer}`;
}

// Load a doctor's bookable slots + available days from the DB.
async function doctorAvailability(doctorId) {
  if (!doctorId) return { slots: DEFAULT_SLOTS, availableDays: DEFAULT_DAYS, doctor: null };
  const Doctor = require('../models/Doctor');
  const doctor = await Doctor.findOne({ doctorId });
  return {
    slots: doctor?.slots?.length ? doctor.slots : DEFAULT_SLOTS,
    availableDays: doctor?.availableDays?.length ? doctor.availableDays : DEFAULT_DAYS,
    bookingEnd: doctor?.bookingEnd || '',
    doctor,
  };
}

// ── GET available slots for a doctor on a date ────────────────────────────
// GET /api/patient/appointments/slots?date=YYYY-MM-DD&doctorId=cardio_1
// Slots come from the DOCTOR's own configured slots + available days, minus
// any already-booked ones — so a patient only sees real availability.
async function getSlots(req, res, next) {
  try {
    const { date, doctorId } = req.query;
    if (!date) return fail(res, 400, 'date is required', 'NO_DATE');

    const { slots: doctorSlots, availableDays, bookingEnd } = await doctorAvailability(doctorId);
    const weekday = weekdayOf(date);
    const dayAvailable = availableDays.includes(weekday);
    const endLimit = /^\d{2}:\d{2}$/.test(bookingEnd) ? bookingEnd : BOOKING_END;

    // Slots already taken for this doctor+date.
    const taken = await Appointment.find({
      date,
      doctorId: doctorId || { $exists: true },
      status: 'booked',
    }).select('time doctorId');
    const takenSet = new Set(taken.map((a) => `${a.doctorId}|${a.time}`));

    // The patient's own bookings that day (to grey out clashing times).
    const myThatDay = await Appointment.find({
      user: req.user._id, date, status: 'booked',
    }).select('time');
    const myTimes = new Set(myThatDay.map((a) => a.time));

    const slots = doctorSlots.map((time) => {
      if (!dayAvailable) {
        return { time, available: false, reason: `Doctor not available on ${weekday}` };
      }
      // Hospital session window (Mon–Sat, nothing in the past), honouring this
      // doctor's own booking cut-off when they sit later than the default.
      const session = slotBookable(date, time, endLimit);
      if (!session.ok) {
        return { time, available: false, reason: session.reason };
      }
      const doctorTaken = doctorId ? takenSet.has(`${doctorId}|${time}`) : false;
      const clashesWithMine = myTimes.has(time);
      return {
        time,
        available: !doctorTaken && !clashesWithMine,
        reason: doctorTaken ? 'Slot full' : clashesWithMine ? 'You have another booking at this time' : null,
      };
    });

    // Same-day booking closes at this doctor's own cut-off (default 1 PM).
    const { todayStr, nowHHMM } = nowParts();
    const sessionClosedToday = date === todayStr && nowHHMM >= endLimit;

    return res.json({
      success: true,
      date,
      weekday,
      dayAvailable: dayAvailable && weekday !== 'Sun' && !sessionClosedToday,
      sessionClosedToday,
      sessionHours: { start: SESSION_START, bookingEnd: endLimit, end: SESSION_END },
      availableDays,
      slots,
    });
  } catch (err) {
    next(err);
  }
}

// ── BOOK a cardiology appointment ─────────────────────────────────────────
// POST /api/patient/appointments   body: { date, time, doctorId, reason }
async function bookAppointment(req, res, next) {
  try {
    const { date, time, doctorId, reason } = req.body;
    if (!date || !time) return fail(res, 400, 'Date and time are required', 'MISSING');
    if (!doctorId) return fail(res, 400, 'Please select a doctor.', 'NO_DOCTOR');

    // Resolve the doctor from the DB and validate against THEIR configured
    // days + slots (admin-managed), not a global hardcoded list.
    const Doctor = require('../models/Doctor');
    const docRow = await Doctor.findOne({ doctorId });
    if (!docRow) return fail(res, 404, 'Selected doctor not found.', 'NO_DOCTOR');

    const availableDays = docRow.availableDays?.length ? docRow.availableDays : DEFAULT_DAYS;
    const docSlots = docRow.slots?.length ? docRow.slots : DEFAULT_SLOTS;
    if (!availableDays.includes(weekdayOf(date))) {
      return fail(res, 400, `${docRow.name} is not available on ${weekdayOf(date)}. Please pick another day.`, 'DAY_OFF');
    }
    if (!docSlots.includes(time)) {
      return fail(res, 400, 'This time is not in the doctor’s available slots.', 'BAD_SLOT');
    }
    // Session rule: Mon–Sat, no same-day slot in the past, and within this
    // doctor's booking window (their own cut-off, else the hospital default).
    const session = slotBookable(date, time, docRow.bookingEnd);
    if (!session.ok) {
      return fail(res, 400, session.reason, 'SESSION_CLOSED');
    }

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

    const doctor = { id: docRow.doctorId, name: docRow.name };

    // RULE 1a: patient can't double-book the same date+time (cardiology).
    const clashCardio = await Appointment.findOne({
      user: req.user._id, date, time, status: 'booked',
    });
    if (clashCardio) {
      return fail(res, 409, 'You already have an appointment at this date and time.', 'DOUBLE_BOOK');
    }

    // RULE 1b: clash with an active chronic token on the same day+time.
    const sameDayToken = await Token.findOne({
      user: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
      createdAt: {
        $gte: new Date(`${date}T00:00:00`),
        $lte: new Date(`${date}T23:59:59`),
      },
    });
    if (sameDayToken) {
      return fail(res, 409,
        'You have an active Chronic OPD token today. Complete it first or pick another time.',
        'CHRONIC_CLASH');
    }

    // RULE 2: the slot (date+time+doctor) must be free.
    const slotTaken = await Appointment.findOne({
      date, time, doctorId: doctor.id, status: 'booked',
    });
    if (slotTaken) {
      return fail(res, 409, 'This slot was just booked by someone else. Please pick another.', 'SLOT_FULL');
    }

    // AI/ML triage priority — elderly + critical recent vitals rank higher.
    const priority = await computeAppointmentPriority(req.user);

    const appointment = await Appointment.create({
      user: req.user._id,
      department: 'cardiology',
      doctorId: doctor.id,
      doctorName: doctor.name,
      date, time,
      reason: reason || '',
      status: 'booked',
      priorityScore: priority.score,
      priorityLevel: priority.level,
      prioritySource: priority.source,
    });

    logger.db('INSERT', 'Appointment', `${req.user.email} cardio ${date} ${time} ${doctor.name}`);
    logger.success(`Cardiology appointment booked: ${date} ${time} with ${doctor.name}`);

    // Confirmation email — fire-and-forget.
    emailService.sendAppointmentBookedEmail(req.user.email, req.user.name, {
      department: 'cardiology', doctorName: doctor.name, date, time,
    }).catch(() => {});

    // Notify queue/stat listeners (optional).
    const server = io(req);
    if (server) server.emit('appointments:update', { date });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET MY ACTIVE APPOINTMENT (today's, for the Home screen queue card) ───
// GET /api/patient/appointments/active
// Mirrors tokens/active for the chronic journey: only returns something
// when there's a booked slot today, and reports how many patients are
// ahead of this one so the Home screen can show "X ahead" like the token
// card does.
async function getActiveAppointment(req, res, next) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Lazily close out any booked appointment whose slot has already
    // passed — same pattern as the health-tip delivery: computed at read
    // time instead of needing a cron job.
    await Appointment.updateMany(
      {
        user: req.user._id,
        status: 'booked',
        $or: [
          { date: { $lt: todayStr } },
          { date: todayStr, time: { $lt: nowHHMM } },
        ],
      },
      { $set: { status: 'completed' } }
    );

    const appointment = await Appointment.findOne({
      user: req.user._id, status: 'booked', date: todayStr,
    }).sort({ time: 1 });

    if (!appointment) return res.json({ success: true, appointment: null });

    // Priority-aware "ahead" count: among today's booked appointments for this
    // doctor, patients are seen HIGHEST-PRIORITY first (elderly / critical
    // vitals), ties broken by slot time then booking time. So a high-priority
    // patient legitimately has fewer people ahead than their clock slot implies.
    const sameDay = await Appointment.find({
      date: appointment.date,
      doctorId: appointment.doctorId,
      status: 'booked',
    }).select('priorityScore time bookedAt').lean();

    const cmp = (a, b) => (
      (b.priorityScore || 0) - (a.priorityScore || 0)
      || String(a.time).localeCompare(String(b.time))
      || new Date(a.bookedAt) - new Date(b.bookedAt)
    );
    const ordered = sameDay.sort(cmp);
    const ahead = ordered.findIndex((a) => String(a._id) === String(appointment._id));

    return res.json({
      success: true,
      appointment,
      ahead: ahead < 0 ? 0 : ahead,
      isNext: ahead <= 0,
    });
  } catch (err) {
    next(err);
  }
}

// ── LIST my appointments ──────────────────────────────────────────────────
// GET /api/patient/appointments
async function myAppointments(req, res, next) {
  try {
    const appts = await Appointment.find({ user: req.user._id }).sort({ date: -1, time: -1 });
    const now = new Date();
    const upcoming = [];
    const past = [];
    for (const a of appts) {
      const dt = new Date(`${a.date}T${a.time}:00`);
      if (a.status === 'booked' && dt >= now) upcoming.push(a);
      else past.push(a);
    }
    return res.json({ success: true, upcoming, past, all: appts });
  } catch (err) {
    next(err);
  }
}

// ── GET one appointment ───────────────────────────────────────────────────
async function getAppointment(req, res, next) {
  try {
    const a = await Appointment.findOne({ _id: req.params.id, user: req.user._id });
    if (!a) return fail(res, 404, 'Appointment not found', 'NOT_FOUND');
    return res.json({ success: true, appointment: a });
  } catch (err) {
    next(err);
  }
}

// ── CANCEL ────────────────────────────────────────────────────────────────
async function cancelAppointment(req, res, next) {
  try {
    const a = await Appointment.findOne({ _id: req.params.id, user: req.user._id });
    if (!a) return fail(res, 404, 'Appointment not found', 'NOT_FOUND');
    if (a.status !== 'booked') return fail(res, 400, 'Only booked appointments can be cancelled.', 'BAD_STATE');
    a.status = 'cancelled';
    await a.save();
    logger.db('UPDATE', 'Appointment', `cancelled ${a._id}`);

    // Cancellation email — fire-and-forget.
    emailService.sendAppointmentCancelledEmail(req.user.email, req.user.name, {
      department: a.department, doctorName: a.doctorName, date: a.date, time: a.time,
    }).catch(() => {});

    return res.json({ success: true, message: 'Appointment cancelled.', appointment: a });
  } catch (err) {
    next(err);
  }
}

// ── RESCHEDULE ────────────────────────────────────────────────────────────
// POST /api/patient/appointments/:id/reschedule  body: { date, time, doctorId }
async function reschedule(req, res, next) {
  try {
    const { date, time, doctorId } = req.body;
    const a = await Appointment.findOne({ _id: req.params.id, user: req.user._id, status: 'booked' });
    if (!a) return fail(res, 404, 'Booked appointment not found', 'NOT_FOUND');

    // Validate against the (possibly new) doctor's own days + slots.
    const Doctor = require('../models/Doctor');
    const targetDoctorId = doctorId || a.doctorId;
    const docRow = await Doctor.findOne({ doctorId: targetDoctorId });
    const availableDays = docRow?.availableDays?.length ? docRow.availableDays : DEFAULT_DAYS;
    const docSlots = docRow?.slots?.length ? docRow.slots : DEFAULT_SLOTS;
    if (!availableDays.includes(weekdayOf(date))) {
      return fail(res, 400, `Doctor not available on ${weekdayOf(date)}. Pick another day.`, 'DAY_OFF');
    }
    if (!docSlots.includes(time)) return fail(res, 400, 'Invalid slot for this doctor.', 'BAD_SLOT');
    const session = slotBookable(date, time, docRow?.bookingEnd);
    if (!session.ok) return fail(res, 400, session.reason, 'SESSION_CLOSED');

    const doctor = docRow ? { id: docRow.doctorId, name: docRow.name } : { id: a.doctorId, name: a.doctorName };

    // Same clash checks (excluding this appointment).
    const clash = await Appointment.findOne({
      user: req.user._id, date, time, status: 'booked', _id: { $ne: a._id },
    });
    if (clash) return fail(res, 409, 'You already have a booking at this date and time.', 'DOUBLE_BOOK');

    const slotTaken = await Appointment.findOne({
      date, time, doctorId: doctor.id, status: 'booked', _id: { $ne: a._id },
    });
    if (slotTaken) return fail(res, 409, 'That slot is taken. Pick another.', 'SLOT_FULL');

    a.date = date; a.time = time; a.doctorId = doctor.id; a.doctorName = doctor.name;
    await a.save();
    logger.db('UPDATE', 'Appointment', `rescheduled ${a._id} → ${date} ${time}`);
    return res.json({ success: true, message: 'Appointment rescheduled.', appointment: a });
  } catch (err) {
    next(err);
  }
}

// ── GET cardiology doctors (from DB) ──────────────────────────────────────
// GET /api/patient/doctors
async function getDoctors(req, res, next) {
  try {
    const Doctor = require('../models/Doctor');
    const doctors = await Doctor.find({ department: 'cardiology', active: true }).sort({ name: 1 });
    return res.json({ success: true, doctors });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSlots, bookAppointment, myAppointments, getAppointment, getActiveAppointment,
  cancelAppointment, reschedule, getDoctors, CARDIO_DOCTORS,
  // exported for tests
  _internals: { slotBookable, weekdayOf, SESSION_START, SESSION_END },
};
