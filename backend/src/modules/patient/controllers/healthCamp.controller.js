// Health Camps controller — browse & register for free screening camps.

const { localDateStr } = require('../../../utils/dates');
const HealthCamp = require('../models/HealthCamp');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function io(req) { return req.app.get('io'); }

function todayStr() { return localDateStr(); }

function shape(camp, userId) {
  const regs = camp.registrants || [];
  return {
    _id: camp._id,
    title: camp.title,
    category: camp.category,
    description: camp.description,
    date: camp.date,
    startTime: camp.startTime,
    endTime: camp.endTime,
    venue: camp.venue,
    city: camp.city,
    organizer: camp.organizer,
    free: camp.free,
    capacity: camp.capacity,
    registeredCount: regs.length,
    isRegistered: regs.some((r) => String(r.user) === String(userId)),
    seatsLeft: camp.capacity > 0 ? Math.max(0, camp.capacity - regs.length) : null,
  };
}

// GET /api/patient/health-camps — upcoming camps (today onwards).
async function listCamps(req, res, next) {
  try {
    const camps = await HealthCamp.find({ active: true, date: { $gte: todayStr() } })
      .sort({ date: 1, startTime: 1 }).lean();
    return res.json({ success: true, camps: camps.map((c) => shape(c, req.user._id)) });
  } catch (err) { next(err); }
}

// GET /api/patient/health-camps/mine — camps I registered for.
async function myCamps(req, res, next) {
  try {
    const camps = await HealthCamp.find({ 'registrants.user': req.user._id })
      .sort({ date: 1 }).lean();
    return res.json({ success: true, camps: camps.map((c) => shape(c, req.user._id)) });
  } catch (err) { next(err); }
}

// POST /api/patient/health-camps/:id/register
async function registerCamp(req, res, next) {
  try {
    const camp = await HealthCamp.findById(req.params.id);
    if (!camp || !camp.active) return fail(res, 404, 'Camp not found', 'NOT_FOUND');
    if (camp.date < todayStr()) return fail(res, 400, 'This camp has already passed.', 'PAST');
    if (camp.registrants.some((r) => String(r.user) === String(req.user._id))) {
      return fail(res, 409, 'You are already registered for this camp.', 'ALREADY');
    }
    if (camp.capacity > 0 && camp.registrants.length >= camp.capacity) {
      return fail(res, 409, 'This camp is full. Please try another.', 'FULL');
    }

    camp.registrants.push({ user: req.user._id, name: req.user.name, phone: req.user.phone });
    await camp.save();

    logger.db('UPDATE', 'HealthCamp', `${req.user.email} registered for ${camp.title}`);
    const server = io(req);
    if (server) server.emit('camp:update', { type: 'register', campId: String(camp._id) });

    return res.json({ success: true, message: `You're registered for "${camp.title}". Please arrive at ${camp.venue} on ${camp.date}.`, camp: shape(camp, req.user._id) });
  } catch (err) { next(err); }
}

// POST /api/patient/health-camps/:id/unregister
async function unregisterCamp(req, res, next) {
  try {
    const camp = await HealthCamp.findById(req.params.id);
    if (!camp) return fail(res, 404, 'Camp not found', 'NOT_FOUND');
    camp.registrants = camp.registrants.filter((r) => String(r.user) !== String(req.user._id));
    await camp.save();
    const server = io(req);
    if (server) server.emit('camp:update', { type: 'unregister', campId: String(camp._id) });
    return res.json({ success: true, message: 'Registration cancelled.', camp: shape(camp, req.user._id) });
  } catch (err) { next(err); }
}

// GET /api/patient/health-camps/stats — Home tile.
async function getStats(req, res, next) {
  try {
    const [upcoming, myUpcoming] = await Promise.all([
      HealthCamp.countDocuments({ active: true, date: { $gte: todayStr() } }),
      HealthCamp.countDocuments({ 'registrants.user': req.user._id, date: { $gte: todayStr() } }),
    ]);
    return res.json({ success: true, stats: { upcoming, myUpcoming } });
  } catch (err) { next(err); }
}

// POST /api/patient/health-camps/demo — seed a few realistic upcoming camps
// (admin module will manage these in production).
async function seedDemoCamps(req, res, next) {
  try {
    const existing = await HealthCamp.countDocuments({ active: true, date: { $gte: todayStr() } });
    if (existing > 0) return res.json({ success: true, message: 'Camps already available.', created: 0 });

    const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const camps = [
      { title: 'Free Diabetes Screening Camp', category: 'Diabetes', description: 'Free blood sugar (fasting & random) testing and diabetes counselling for all ages.', date: d(2), startTime: '09:00', endTime: '13:00', venue: 'Capital Hospital, G-6/2', city: 'Islamabad', capacity: 100 },
      { title: 'Blood Pressure & Heart Check', category: 'Blood Pressure', description: 'Free BP measurement, ECG for high-risk patients, and heart-health advice.', date: d(5), startTime: '09:00', endTime: '12:00', venue: 'Capital Hospital OPD Block', city: 'Islamabad', capacity: 80 },
      { title: 'Free Eye Screening Camp', category: 'Eye', description: 'Vision testing, glaucoma and cataract screening, free reading glasses for the elderly.', date: d(9), startTime: '10:00', endTime: '14:00', venue: 'Capital Hospital, G-6/2', city: 'Islamabad', capacity: 60 },
      { title: 'Hepatitis B & C Free Testing', category: 'Hepatitis', description: 'Free hepatitis screening and vaccination guidance. Confidential and free of cost.', date: d(14), startTime: '09:00', endTime: '13:00', venue: 'Capital Hospital Lab', city: 'Islamabad', capacity: 0 },
    ];
    const docs = camps.map((c) => ({ ...c, organizer: 'Capital Hospital (CDA)', free: true, active: true }));
    await HealthCamp.insertMany(docs);
    logger.db('INSERT', 'HealthCamp', `${docs.length} demo camps seeded`);
    return res.status(201).json({ success: true, message: `${docs.length} upcoming camps added.`, created: docs.length });
  } catch (err) { next(err); }
}

module.exports = { listCamps, myCamps, registerCamp, unregisterCamp, getStats, seedDemoCamps };
