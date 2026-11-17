// Pharmacy → live queue. The queue IS the prescriptions the doctors sent
// (Prescription.pharmacyStatus in pending/preparing/ready). Opening/serving a
// prescription notifies the patient; completing dispenses it, decrements stock
// and advances the patient's token.

const Prescription = require('../../patient/models/Prescription');
const Token = require('../../patient/models/Token');
const Medicine = require('../models/Medicine');
const User = require('../../auth/models/User');
const { checkAvailability } = require('../services/availability.service');
const { touchPharmacist, visibleToPharmacistFilter } = require('../services/assignment.service');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Tell every pharmacist which medicines just dropped to low / out of stock.
async function notifyLowStock(alerts) {
  if (!alerts || !alerts.length) return;
  try {
    const pharmacists = await User.find({ role: 'pharmacy' }).select('_id').lean();
    for (const a of alerts) {
      const title = a.level === 'out' ? `Out of stock: ${a.name}` : `Low stock: ${a.name}`;
      const body = a.level === 'out'
        ? `${a.name} is now OUT OF STOCK (0 left). Please raise a requisition.`
        : `${a.name} is running low (${a.stock} left). Consider restocking.`;
      pharmacists.forEach((ph) => notifyUser(ph._id, {
        type: 'system', title, body, icon: 'alert-circle', screen: 'Inventory',
      }));
    }
  } catch (e) { /* best-effort */ }
}

// Prescriptions this request should see. A pharmacist sees their own assigned
// queue (plus anything unassigned / assigned to an offline colleague); an admin
// sees everything. Also refreshes the pharmacist's presence heartbeat.
async function scopeFilter(req) {
  if (req.user.role === 'pharmacy') {
    await touchPharmacist(req.user._id);
    return visibleToPharmacistFilter(req.user._id);
  }
  return {}; // admin oversight — no scoping
}

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function pharmacyIO(req) { return req.app.get('io'); }
function broadcast(req) {
  try { const io = pharmacyIO(req); if (io) { io.emit('pharmacy:update', { type: 'queue' }); io.emit('queue:update', { department: 'pharmacy' }); } } catch (e) { /* ignore */ }
}

const STATUS_LABEL = { pending: 'Waiting', preparing: 'Preparing', ready: 'Ready' };

// GET /api/pharmacy/queue
async function getQueue(req, res, next) {
  try {
    const scope = await scopeFilter(req);
    const rows = await Prescription.find({ pharmacyStatus: { $in: ['pending', 'preparing', 'ready'] }, ...scope })
      .sort({ createdAt: 1 }).limit(200).lean();
    const queue = rows.map((p) => ({
      id: String(p._id),
      cardNo: p.patient?.cdaCard || p.patient?.cnic || p.tokenNumber || '',
      patientName: p.patient?.name || 'Patient',
      doctorName: p.doctor?.name || '',
      tokenNumber: p.tokenNumber,
      status: STATUS_LABEL[p.pharmacyStatus] || 'Waiting',
      pharmacyStatus: p.pharmacyStatus,
      counter: p.pharmacyCounter || '',
      assignedTo: p.pharmacist?.name || '',
      medicines: (p.medicines || []).length,
      time: new Date(p.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    }));
    return res.json({
      success: true,
      waiting: queue.filter((q) => q.pharmacyStatus === 'pending').length,
      ready: queue.filter((q) => q.pharmacyStatus === 'ready').length,
      count: queue.length,
      queue,
    });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/prescriptions/:id  — full details + per-medicine availability
async function getPrescription(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id).lean();
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');
    const { items, hasOutOfStock } = await checkAvailability(p.medicines);
    return res.json({
      success: true,
      prescription: {
        id: String(p._id),
        tokenNumber: p.tokenNumber,
        patient: p.patient,
        doctor: p.doctor,
        chronicIllness: p.chronicIllness,
        notes: p.notes,
        tests: p.tests || [],
        pharmacyStatus: p.pharmacyStatus,
        counter: p.pharmacyCounter || '',
        medicines: items,   // each: { line, name, quantity, available, ... }
      },
      hasOutOfStock,
    });
  } catch (err) { next(err); }
}

// The serving pharmacist's own counter, formatted for the patient. Taken from
// their profile — the patient is NEVER asked to "go to a counter" generically;
// they're sent to whichever counter the pharmacist who called them is at.
function counterLabel(user) {
  const c = String(user?.counterNumber || '').trim();
  if (!c) return 'the pharmacy counter';
  return /^\d+$/.test(c) ? `Counter ${c}` : c;
}

// POST /api/pharmacy/prescriptions/:id/prepare  — the pharmacist CALLS this
// patient to their counter. The patient is auto-directed to the calling
// pharmacist's own counter.
async function startPreparing(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id);
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');
    const label = counterLabel(req.user);
    p.pharmacyStatus = 'preparing';
    // Stamp the calling pharmacist's counter on the prescription so it stays
    // consistent through "ready" and on the patient's prescription screen.
    if (req.user.counterNumber) p.pharmacyCounter = String(req.user.counterNumber).trim();
    await p.save();
    notifyUser(p.user, {
      type: 'order', title: `You are being served at ${label}`,
      body: `Your medicines (Token ${p.tokenNumber}) are being prepared. Please come to ${label}.`,
      icon: 'medkit', screen: 'PrescriptionDetailScreen', refId: String(p._id),
    });
    logger.db('UPDATE', 'Prescription', `${p.tokenNumber} → preparing @ ${label}`);
    broadcast(req);
    return res.json({ success: true, message: `Patient called to ${label}.`, counter: p.pharmacyCounter || '' });
  } catch (err) { next(err); }
}

// POST /api/pharmacy/prescriptions/:id/ready — no counter is asked; we use the
// pharmacist's own counter (set on their profile / stamped when they called).
async function markReady(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id);
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');
    // Prefer the pharmacist's current counter; fall back to whatever was
    // stamped when they called the patient.
    if (req.user.counterNumber) p.pharmacyCounter = String(req.user.counterNumber).trim();
    const label = counterLabel(req.user.counterNumber ? req.user : { counterNumber: p.pharmacyCounter });
    p.pharmacyStatus = 'ready';
    await p.save();
    notifyUser(p.user, {
      type: 'order', title: 'Medicine ready for pickup',
      body: `Your medicines (Token ${p.tokenNumber}) are ready. Please collect them from ${label}.`,
      icon: 'checkmark-circle', screen: 'PrescriptionDetailScreen', refId: String(p._id),
    });
    logger.db('UPDATE', 'Prescription', `${p.tokenNumber} → ready @ ${label}`);
    broadcast(req);
    return res.json({ success: true, message: `Ready at ${label}. Patient notified.` });
  } catch (err) { next(err); }
}

// POST /api/pharmacy/prescriptions/:id/complete — dispense, decrement stock,
// advance the patient's token (to lab-choice if tests, else complete).
async function complete(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id);
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');
    if (p.pharmacyStatus === 'dispensed') return fail(res, 400, 'Already dispensed.', 'DONE');

    // Decrement stock. Prefer the structured lines (qty = perDay × days); fall
    // back to the legacy "1 per available medicine" when a prescription predates
    // structured dosing. Collect any low/out-of-stock alerts to notify staff.
    const alerts = [];
    const pushAlert = (m) => {
      if (m.stock <= 0) alerts.push({ name: m.name, level: 'out', stock: 0 });
      else if (m.stock <= m.minimumStock) alerts.push({ name: m.name, level: 'low', stock: m.stock });
    };
    if (Array.isArray(p.medicineItems) && p.medicineItems.length) {
      for (const it of p.medicineItems) {
        const qty = Math.max(0, Number(it.qty) || 0);
        if (!qty) continue;
        let med = null;
        // eslint-disable-next-line no-await-in-loop
        if (it.medicineId) med = await Medicine.findById(it.medicineId);
        // eslint-disable-next-line no-await-in-loop
        if (!med && it.name) med = await Medicine.findOne({ name: new RegExp(`^${esc(it.name)}$`, 'i') });
        if (!med) continue;
        med.stock = Math.max(0, med.stock - qty);
        // eslint-disable-next-line no-await-in-loop
        await med.save();
        pushAlert(med);
      }
    } else {
      const { items } = await checkAvailability(p.medicines);
      for (const it of items) {
        if (it.available && it.medicineId) {
          // eslint-disable-next-line no-await-in-loop
          const med = await Medicine.findById(it.medicineId);
          if (med) { med.stock = Math.max(0, med.stock - 1); await med.save(); pushAlert(med); }
        }
      }
    }
    // De-dupe by name (a medicine can trip only one alert) and notify.
    const seen = new Set();
    const uniqueAlerts = alerts.filter((a) => (seen.has(a.name) ? false : seen.add(a.name)));
    notifyLowStock(uniqueAlerts);

    p.pharmacyStatus = 'dispensed';
    p.dispensedAt = new Date();
    // Mark for the lab queue when tests were prescribed. Chronic-OPD patients
    // are additionally gated by their live Token status (so a cancel removes
    // them); cardiology appointments have NO Token, so this flag is what puts
    // them into the lab queue after the pharmacy dispenses.
    if ((p.tests || []).length) p.labQueued = true;
    await p.save();

    // Advance the patient's token: if lab tests were prescribed, send the
    // patient straight into the LABORATORY queue (they can still cancel it,
    // which removes them). Otherwise the journey is complete.
    // (Cardiology appointments have no OPD Token — findById returns null and the
    // labQueued flag above carries them into the lab queue instead.)
    const token = await Token.findById(p.token);
    if (token && token.status !== 'completed') {
      if ((p.tests || []).length) {
        token.department = 'laboratory';
        token.status = 'laboratory';
        token.labRequired = true;
        token.labRequested = true;
        token.log('Pharmacy dispensed — sent to Laboratory');
      } else {
        token.department = 'done';
        token.status = 'completed';
        token.completedAt = new Date();
        token.log('Pharmacy dispensed — journey complete');
      }
      await token.save();
    }
    // Wake the laboratory live queue.
    try { const io = req.app.get('io'); if (io && (p.tests || []).length) { io.emit('laboratory:update', { type: 'queue' }); io.emit('queue:update', { department: 'laboratory' }); } } catch (e) { /* ignore */ }

    notifyUser(p.user, {
      type: 'order', title: 'Medicines dispensed',
      body: (p.tests || []).length
        ? `Your medicines (Token ${p.tokenNumber}) have been dispensed. You are now in the Laboratory queue for your tests — you can cancel it from the app if needed.`
        : `Your medicines (Token ${p.tokenNumber}) have been dispensed. Get well soon!`,
      icon: 'checkmark-done-circle', screen: 'PrescriptionDetailScreen', refId: String(p._id),
    });

    logger.db('UPDATE', 'Prescription', `${p.tokenNumber} dispensed by ${req.user.email}`);
    broadcast(req);
    return res.json({ success: true, message: 'Prescription completed and dispensed.' });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/dashboard
async function getDashboard(req, res, next) {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const scope = await scopeFilter(req);
    const [waiting, preparing, ready, dispensedToday, inStock, lowStock, outOfStock] = await Promise.all([
      Prescription.countDocuments({ pharmacyStatus: 'pending', ...scope }),
      Prescription.countDocuments({ pharmacyStatus: 'preparing', ...scope }),
      Prescription.countDocuments({ pharmacyStatus: 'ready', ...scope }),
      Prescription.countDocuments({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: startOfToday } }),
      Medicine.countDocuments({ $expr: { $gt: ['$stock', '$minimumStock'] } }),
      Medicine.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minimumStock'] }] } }),
      Medicine.countDocuments({ stock: { $lte: 0 } }),
    ]);
    return res.json({
      success: true,
      stats: { waiting, preparing, ready, dispensedToday, inStock, lowStock, outOfStock },
    });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/completed — recently dispensed orders
// GET /api/pharmacy/completed?range=today|all
// Full list of patients whose medicines were dispensed (newest first), with
// date/time, doctor and the medicines given — shown when the pharmacist taps
// "Completed Orders" on the dashboard.
async function getCompleted(req, res, next) {
  try {
    const range = req.query.range === 'today' ? 'today' : 'all';
    const filter = { pharmacyStatus: 'dispensed' };
    if (range === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      filter.dispensedAt = { $gte: start };
    }
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [rows, todayCount, totalCount] = await Promise.all([
      Prescription.find(filter).sort({ dispensedAt: -1 }).limit(500).lean(),
      Prescription.countDocuments({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: startOfToday } }),
      Prescription.countDocuments({ pharmacyStatus: 'dispensed' }),
    ]);
    const orders = rows.map((p) => {
      const at = p.dispensedAt ? new Date(p.dispensedAt) : null;
      const meds = (p.medicines && p.medicines.length)
        ? p.medicines
        : (p.medicineItems || []).map((m) => m.name).filter(Boolean);
      return {
        id: String(p._id),
        patientName: p.patient?.name || 'Patient',
        cardNo: p.patient?.cdaCard || p.patient?.cnic || p.tokenNumber || '',
        phone: p.patient?.phone || '',
        doctorName: p.doctor?.name || '',
        medicines: meds,
        dispensedAt: at ? at.toISOString() : null,
        collectedTime: at ? at.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '',
        collectedDate: at ? at.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        counter: p.pharmacyCounter || '',
      };
    });
    return res.json({ success: true, range, count: orders.length, todayCount, totalCount, orders });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/analytics — real numbers for the Analytics screen
async function getAnalytics(req, res, next) {
  try {
    const { parseLine } = require('../services/availability.service');
    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    const [prescriptionsToday, dispensedToday, inStock, lowStock, outOfStock] = await Promise.all([
      Prescription.countDocuments({ createdAt: { $gte: startOfToday } }),
      Prescription.countDocuments({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: startOfToday } }),
      Medicine.countDocuments({ $expr: { $gt: ['$stock', '$minimumStock'] } }),
      Medicine.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minimumStock'] }] } }),
      Medicine.countDocuments({ stock: { $lte: 0 } }),
    ]);

    // Weekly dispensed — Monday to Saturday of THIS week (hospital runs 6 days).
    const weekly = [];
    const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monday = new Date(now); monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // this week's Monday
    for (let i = 0; i < 6; i++) {
      const d0 = new Date(monday); d0.setDate(monday.getDate() + i);
      const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
      // eslint-disable-next-line no-await-in-loop
      const count = await Prescription.countDocuments({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: d0, $lt: d1 } });
      weekly.push({ label: WEEK_DAYS[i], count });
    }

    // Department distribution (from inventory) — drives the pie chart.
    const catAgg = await Medicine.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]);
    const categories = catAgg.map((c) => ({ name: c._id || 'General', count: c.count }));

    // Low-stock list (includes out-of-stock / 0 left). Scrollable on the client.
    const lowRows = await Medicine.find({ $expr: { $lte: ['$stock', '$minimumStock'] } }).sort({ stock: 1 }).limit(50).lean();
    const lowStockList = lowRows.map((m) => ({ name: m.name, stock: m.stock }));

    // Top dispensed (approx: count drug names across recent dispensed prescriptions).
    const recent = await Prescription.find({ pharmacyStatus: 'dispensed' }).sort({ dispensedAt: -1 }).limit(300).select('medicines').lean();
    const tally = {};
    recent.forEach((p) => (p.medicines || []).forEach((line) => {
      const drug = parseLine(line).drug;
      if (drug) tally[drug] = (tally[drug] || 0) + 1;
    }));
    const topDispensed = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

    return res.json({
      success: true,
      overview: { prescriptions: prescriptionsToday, dispensed: dispensedToday },
      inventory: { inStock, lowStock, outOfStock },
      weekly, categories, lowStockList, topDispensed,
      summary: { patients: prescriptionsToday, dispensedToday },
    });
  } catch (err) { next(err); }
}

module.exports = { getQueue, getPrescription, startPreparing, markReady, complete, getDashboard, getCompleted, getAnalytics };
