// Doctor CONSULTATION — powers CallNextPatientScreen & ConsultationScreen.
//
//   GET  /api/doctor/consult/:tokenId          → patient details + history
//   POST /api/doctor/consult/:tokenId/proceed  → save diagnosis/notes +
//        prescription, send patient to Pharmacy (or Lab), load next patient.

const Token = require('../../patient/models/Token');
const User = require('../../auth/models/User');
const Prescription = require('../../patient/models/Prescription');
const Vital = require('../../patient/models/Vital');
const LabReport = require('../../patient/models/LabReport');
const Appointment = require('../../patient/models/Appointment');
const Medicine = require('../../pharmacy/models/Medicine');
const { defaultMedsFor, doctorForCondition } = require('../../patient/services/chronic.config');

// Turn the doctor's medicine input into (a) display strings for the app and
// (b) structured lines the pharmacy dispenses from (qty = perDay × days). Accepts
// either the new structured `medicineItems` or the legacy `medicines` strings.
async function buildMeds(medicinesRaw, itemsRaw) {
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.filter((it) => it && it.name && String(it.name).trim())
    : [];
  if (!items.length) {
    const meds = Array.isArray(medicinesRaw) ? medicinesRaw.filter(Boolean) : [];
    return { medicines: meds, medicineItems: [] };
  }
  const built = [];
  const display = [];
  for (const it of items) {
    const name = String(it.name).trim();
    const form = String(it.form || 'Tablet').trim();
    const perDay = Math.max(0, Number(it.perDay) || 0);
    const days = Math.max(0, Number(it.days) || 0);
    const qty = perDay && days ? perDay * days : (Math.max(0, Number(it.qty) || 0));
    let medicineId = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const m = await Medicine.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id').lean();
      if (m) medicineId = m._id;
    } catch (e) { /* ignore */ }
    built.push({ name, form, perDay, days, qty, medicineId });
    display.push(perDay && days ? `${name} — ${perDay}/day × ${days} day${days > 1 ? 's' : ''}` : name);
  }
  return { medicines: display, medicineItems: built };
}
const { orderByPriority } = require('../../patient/services/priority.service');
const { pickPharmacist } = require('../../pharmacy/services/assignment.service');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');
const { fail, computeAge, recomputeOpd, broadcast } = require('../services/doctor.service');

// Cardiology appointments are booked with a SPECIFIC doctor, so a doctor may
// only open/complete appointments assigned to them — this stops one doctor
// pulling another doctor's patient record by guessing an appointment id (BOLA).
// Chronic-OPD tokens are intentionally shared (a shared queue any doctor serves),
// so this guard is only applied on the appointment path. If an appointment has
// no doctorId (legacy/unassigned) we can't scope it and allow it.
function doctorOwnsAppt(appt, req) {
  const owner = String(appt.doctorId || '');
  if (!owner) return true;
  return owner === String(req.user.doctorId || '');
}

// ── CONSULTATION DETAILS (history for the current patient) ─────────────────
async function getConsultation(req, res, next) {
  try {
    const token = await Token.findById(req.params.tokenId).lean();
    if (!token) {
      // Not an OPD token — maybe it's a cardiology appointment.
      const appt = await Appointment.findById(req.params.tokenId).lean();
      if (appt) {
        if (!doctorOwnsAppt(appt, req)) return fail(res, 403, 'This appointment is not assigned to you.', 'FORBIDDEN');
        return getAppointmentConsultation(appt, res);
      }
      return fail(res, 404, 'Token not found', 'NOT_FOUND');
    }
    const patient = await User.findById(token.user).select('name email cnic phone cdaCard dob chronicConditions allergies bloodGroup isChronic').lean();

    const [pastVisits, vitals, reports] = await Promise.all([
      Token.find({ user: token.user, status: 'completed', _id: { $ne: token._id } })
        .sort({ completedAt: -1 }).limit(5).select('tokenNumber chronicIllness diagnosis clinicalNotes completedAt consultedByName prescription').lean(),
      Vital.find({ user: token.user }).sort({ recordedAt: -1 }).limit(3).lean(),
      LabReport.find({ user: token.user }).sort({ reportedAt: -1 }).limit(3).select('title category reportedAt').lean(),
    ]);

    // Attach each past visit's prescription (medicines + tests) so the doctor can
    // VIEW what was prescribed before deciding to reuse or write a new one.
    const prescriptions = await Prescription.find({ user: token.user })
      .sort({ createdAt: -1 }).limit(20).select('token medicines tests notes createdAt').lean();
    const byToken = {};
    prescriptions.forEach((p) => { if (p.token) byToken[String(p.token)] = p; });
    const pastVisitsFull = pastVisits.map((v) => {
      const pr = byToken[String(v._id)];
      return { ...v, medicines: pr?.medicines || [], tests: pr?.tests || [] };
    });

    return res.json({
      success: true,
      token: {
        tokenId: String(token._id), tokenNumber: token.tokenNumber, status: token.status,
        chronicIllness: token.chronicIllness, isFollowUp: token.isFollowUp,
        priorityLevel: token.priorityLevel, priorityReason: token.priorityReason,
        suggestedMedicines: defaultMedsFor(token.chronicIllness),
      },
      patient: patient ? { ...patient, age: computeAge(patient.dob) } : null,
      history: { pastVisits: pastVisitsFull, vitals, reports },
    });
  } catch (err) { next(err); }
}

// ── PROCEED (finish + prescription + next patient) ────────────────────────
// body: { diagnosis, clinicalNotes, medicines:[], tests:[] }
async function proceed(req, res, next) {
  try {
    const { diagnosis = '', clinicalNotes = '', medicines = [], tests = [] } = req.body || {};
    const token = await Token.findOne({ _id: req.params.tokenId, department: 'chronic_opd' });
    if (!token) {
      // Not an OPD token — a cardiology appointment. Complete it for real.
      const appt = await Appointment.findById(req.params.tokenId);
      if (appt) {
        if (!doctorOwnsAppt(appt, req)) return fail(res, 403, 'This appointment is not assigned to you.', 'FORBIDDEN');
        return completeAppointment(appt, req, res);
      }
      return fail(res, 404, 'Token not found in OPD', 'NOT_FOUND');
    }
    if (token.status === 'completed') return fail(res, 400, 'Already completed', 'DONE');
    // RETRY-SAFE: on a weak connection the app may resend "proceed" after the
    // first one already went through. Don't create a second prescription.
    if (['pharmacy', 'awaiting_lab_choice', 'laboratory'].includes(token.status)) {
      return res.json({ success: true, alreadyDone: true, message: 'Patient already sent to Pharmacy.', nextPatient: null });
    }

    const cleanTests = Array.isArray(tests) ? tests.filter(Boolean) : [];
    const { medicines: builtMeds, medicineItems } = await buildMeds(medicines, req.body.medicineItems);
    const cleanMeds = builtMeds.length ? builtMeds : defaultMedsFor(token.chronicIllness);

    token.diagnosis = String(diagnosis).trim();
    token.clinicalNotes = String(clinicalNotes).trim();
    token.consultedByName = req.user.name;
    token.consultedAt = new Date();

    if (token.isFollowUp) {
      // Reports-only visit: no pharmacy. Complete after the doctor reviews.
      token.department = 'done';
      token.status = 'completed';
      token.completedAt = new Date();
      token.log('Follow-up reviewed by doctor → completed (no medicine)');
      await token.save();
    } else {
      // Build the prescription that goes to the pharmacist. Load-balance it onto
      // the least-busy pharmacist who is on duty right now (null if none online).
      const patient = await User.findById(token.user);
      const assigned = await pickPharmacist();
      // BUG FIX: a failed prescription insert used to be only logged, while the
      // token was still moved to "pharmacy" — so the patient was told to go to
      // the pharmacy but the pharmacy never saw them. Now a failure aborts
      // (the app retries via its offline outbox) and an existing prescription
      // for this token is reused instead of duplicated.
      const existingPresc = await Prescription.findOne({ token: token._id });
      if (existingPresc) {
        token.prescription = existingPresc._id;
      } else {
        const presc = await Prescription.create({
          token: token._id, tokenNumber: token.tokenNumber, user: token.user,
          patient: {
            name: patient?.name || '', email: patient?.email || '', cnic: patient?.cnic || '',
            phone: patient?.phone || '', cdaCard: patient?.cdaCard || '', age: computeAge(patient?.dob) || 0,
          },
          chronicIllness: token.chronicIllness || '',
          doctor: { doctorId: token.assignedDoctor?.doctorId || '', name: req.user.name, specialization: token.assignedDoctor?.specialization || '' },
          medicines: cleanMeds, medicineItems, tests: cleanTests,
          notes: token.clinicalNotes,
          pharmacist: assigned ? { id: assigned.id, name: assigned.name } : { id: null, name: '' },
          pharmacyStatus: 'pending', labStatus: cleanTests.length ? 'pending' : 'none',
        });
        token.prescription = presc._id;
        if (assigned) notifyUser(assigned.id, {
          type: 'order', title: 'New prescription assigned',
          body: `Token ${token.tokenNumber} — ${patient?.name || 'a patient'} is waiting at the pharmacy.`,
          icon: 'medkit', screen: 'Queue',
        });
        // Let the patient open their new prescription straight from the bell.
        notifyUser(token.user, {
          type: 'order', title: 'Your prescription is ready to view',
          body: `${req.user.name} has issued your prescription (Token ${token.tokenNumber}). Tap to view it and track it at the pharmacy.`,
          icon: 'document-text', screen: 'PrescriptionDetailScreen', refId: String(presc._id),
        });
      }

      if (cleanTests.length) { token.labRequired = true; token.prescribedTests = cleanTests; }
      token.department = 'pharmacy';
      token.status = 'pharmacy';
      token.log(cleanTests.length ? `Doctor done → Pharmacy (tests: ${cleanTests.join(', ')})` : 'Doctor done → Pharmacy');
      await token.save();

      // Wake the pharmacy module's live queue/dashboard.
      try { const io = req.app.get('io'); if (io) io.emit('pharmacy:update', { type: 'queue' }); } catch (e) { /* ignore */ }
    }

    logger.db('UPDATE', 'Token', `${token.tokenNumber} consulted by ${req.user.email}`);

    // Load the NEXT waiting patient (highest priority) into consultation —
    // from THIS doctor's own line. (It used to pick from the whole OPD pool, so
    // finishing a patient could pull another doctor's patient "in-progress".)
    const myDoctorId = req.user.doctorId || '';
    const waitingAll = await Token.find({ department: 'chronic_opd', status: 'in-queue' });
    const waiting = myDoctorId
      ? waitingAll.filter((t) => (t.assignedDoctor?.doctorId || doctorForCondition(t.chronicIllness)?.doctorId || 'chronic_gp') === myDoctorId)
      : waitingAll;
    const alreadyServing = await Token.findOne({ department: 'chronic_opd', status: 'in-progress', _id: { $ne: token._id } });
    const servingIsMine = alreadyServing && (!myDoctorId || (alreadyServing.assignedDoctor?.doctorId || doctorForCondition(alreadyServing.chronicIllness)?.doctorId || 'chronic_gp') === myDoctorId);
    const nextToken = servingIsMine ? null : (orderByPriority(waiting)[0] || null);
    if (nextToken) {
      nextToken.status = 'in-progress';
      nextToken.log('Now serving (auto-loaded after previous patient)');
      await nextToken.save();
      notifyUser(nextToken.user, {
        type: 'token', title: 'It is your turn',
        body: `Token ${nextToken.tokenNumber} — please proceed to the doctor's room.`,
        icon: 'walk', screen: 'TokenJourneyScreen',
      });
    }

    await recomputeOpd();
    await broadcast(req);

    return res.json({
      success: true,
      message: token.isFollowUp ? 'Follow-up completed.' : 'Patient sent to Pharmacy.',
      nextPatient: nextToken ? nextToken.tokenNumber : null,
    });
  } catch (err) { next(err); }
}

// ── CARDIOLOGY APPOINTMENT CONSULTATION ────────────────────────────────────
// Cardiology visits are Appointments, not chronic-OPD Tokens. These two helpers
// let the SAME doctor consultation screen load + complete an appointment.

async function getAppointmentConsultation(appt, res) {
  const patient = await User.findById(appt.user).select('name email cnic phone cdaCard dob chronicConditions allergies bloodGroup isChronic').lean();
  const [pastVisits, vitals, reports] = await Promise.all([
    Appointment.find({ user: appt.user, status: 'completed', _id: { $ne: appt._id } })
      .sort({ updatedAt: -1 }).limit(5).select('doctorName reason notes date').lean(),
    Vital.find({ user: appt.user }).sort({ recordedAt: -1 }).limit(3).lean(),
    LabReport.find({ user: appt.user }).sort({ reportedAt: -1 }).limit(3).select('title category reportedAt').lean(),
  ]);
  return res.json({
    success: true,
    token: {
      tokenId: String(appt._id), tokenNumber: appt.tokenNumber || '', slotTime: appt.time, status: appt.status,
      chronicIllness: appt.reason || 'Cardiology', isFollowUp: false,
      priorityLevel: appt.priorityLevel || 'normal', priorityReason: '',
      suggestedMedicines: [],
    },
    patient: patient ? { ...patient, age: computeAge(patient.dob) } : null,
    history: {
      pastVisits: pastVisits.map((v) => ({
        tokenNumber: v.tokenNumber || '', slotTime: v.time, chronicIllness: v.reason, diagnosis: v.reason,
        clinicalNotes: v.notes, completedAt: v.date, consultedByName: v.doctorName,
      })),
      vitals, reports,
    },
  });
}

async function completeAppointment(appt, req, res) {
  if (appt.status === 'completed') {
    // Retry of a request that already went through → same success answer.
    return res.json({ success: true, alreadyDone: true, message: 'Patient sent to Pharmacy.', nextPatient: null });
  }
  const { diagnosis = '', clinicalNotes = '', medicines = [], tests = [] } = req.body || {};
  const cleanTests = Array.isArray(tests) ? tests.filter(Boolean) : [];
  const { medicines: cleanMeds, medicineItems } = await buildMeds(medicines, req.body.medicineItems);

  // BUG FIX (doctor completes on a weak connection → pharmacy never sees it):
  // the appointment used to be marked "completed" FIRST and a failed
  // prescription insert was only logged. Now the prescription is created first
  // (or reused on a retry) and only then is the appointment completed — if
  // anything fails, nothing is half-done and the app's outbox retries.
  const patient = await User.findById(appt.user);
  const assigned = await pickPharmacist();
  let apptPresc = await Prescription.findOne({ token: appt._id });
  if (!apptPresc) {
    apptPresc = await Prescription.create({
      // Appointments have no OPD Token; use the appointment id so the record is
      // still traceable and the required `token` field is satisfied.
      // BUG FIX: was `tokenNumber: appt.time` — the pharmacy showed the slot
      // TIME as the patient's token. Use the system-assigned token number.
      token: appt._id, tokenNumber: appt.tokenNumber || (await Appointment.nextTokenNumber(appt.doctorId, appt.date)), user: appt.user,
      patient: {
        name: patient?.name || '', email: patient?.email || '', cnic: patient?.cnic || '',
        phone: patient?.phone || '', cdaCard: patient?.cdaCard || '', age: computeAge(patient?.dob) || 0,
      },
      chronicIllness: appt.reason || 'Cardiology',
      doctor: { doctorId: req.user.doctorId || '', name: req.user.name, specialization: req.user.specialization || 'Cardiologist' },
      medicines: cleanMeds.length ? cleanMeds : ['As prescribed by doctor'],
      medicineItems,
      tests: cleanTests,
      notes: clinicalNotes,
      pharmacist: assigned ? { id: assigned.id, name: assigned.name } : { id: null, name: '' },
      pharmacyStatus: 'pending', labStatus: cleanTests.length ? 'pending' : 'none',
    });
    if (assigned) notifyUser(assigned.id, {
      type: 'order', title: 'New prescription assigned',
      body: `${patient?.name || 'A patient'} (Cardiology) is waiting at the pharmacy.`,
      icon: 'medkit', screen: 'Queue',
    });
  }

  appt.status = 'completed';
  appt.notes = [clinicalNotes, diagnosis ? `Diagnosis: ${diagnosis}` : ''].filter(Boolean).join(' | ').trim();
  await appt.save();

  notifyUser(appt.user, {
    type: 'order', title: 'Your prescription is ready to view',
    body: `Your appointment with ${req.user.name} is complete. Tap to view your prescription and collect it from the pharmacy.`,
    icon: 'document-text',
    screen: apptPresc ? 'PrescriptionDetailScreen' : 'AppointmentsScreen',
    refId: apptPresc ? String(apptPresc._id) : '',
  });

  logger.db('UPDATE', 'Appointment', `${appt._id} completed by ${req.user.email}`);
  try { const s = req.app.get('io'); if (s) { s.emit('queue:update', { department: 'cardiology' }); s.emit('pharmacy:update', { type: 'queue' }); } } catch (e) { /* ignore */ }

  return res.json({ success: true, message: 'Patient sent to Pharmacy.', nextPatient: null });
}

// ── DOCTOR MARKS A PATIENT AS CHRONIC ──────────────────────────────────────
// POST /api/doctor/consult/:tokenId/chronic
// Resolves the patient from the current consultation (OPD token OR appointment)
// and enables Chronic OPD for them.
async function markChronic(req, res, next) {
  try {
    let userId = null;
    const token = await Token.findById(req.params.tokenId).lean();
    if (token) userId = token.user;
    else {
      const appt = await Appointment.findById(req.params.tokenId).lean();
      if (appt) {
        if (!doctorOwnsAppt(appt, req)) return fail(res, 403, 'This appointment is not assigned to you.', 'FORBIDDEN');
        userId = appt.user;
      }
    }
    if (!userId) return fail(res, 404, 'Patient not found for this consultation.', 'NOT_FOUND');

    const patient = await User.findById(userId);
    if (!patient) return fail(res, 404, 'Patient not found.', 'NOT_FOUND');
    patient.isChronic = true;
    await patient.save();

    notifyUser(patient._id, {
      type: 'system',
      title: 'Chronic care enabled',
      body: `${req.user.name || 'Your doctor'} has enabled Chronic OPD for you. You can now book chronic care visits.`,
      icon: 'checkmark-circle',
      screen: 'HomeScreen',
    });
    logger.db('UPDATE', 'User', `doctor ${req.user.email} marked ${patient.email} chronic`);
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'patients' }); } catch (e) { /* ignore */ }
    return res.json({ success: true, message: 'Patient enabled for Chronic OPD.' });
  } catch (err) { next(err); }
}

// GET /api/doctor/lab-tests — the ACTIVE lab catalog, so a doctor can only
// prescribe tests the laboratory actually offers (a test switched off in the
// lab module disappears here).
async function getLabTests(req, res, next) {
  try {
    const LabTest = require('../../laboratory/models/LabTest');
    const rows = await LabTest.find({ active: true }).sort({ name: 1 }).select('name category sampleType').lean();
    return res.json({ success: true, count: rows.length, tests: rows.map((t) => ({ id: String(t._id), name: t.name, category: t.category, sampleType: t.sampleType })) });
  } catch (err) { next(err); }
}

// GET /api/doctor/medicines — the pharmacy inventory, so the doctor picks a real
// medicine (matched to stock) instead of free-typing.
async function getMedicineCatalog(req, res, next) {
  try {
    const rows = await Medicine.find({}).sort({ name: 1 }).select('name category strength stock minimumStock').lean();
    return res.json({
      success: true,
      count: rows.length,
      medicines: rows.map((m) => ({
        id: String(m._id), name: m.name, form: m.category || 'Tablet', strength: m.strength || '',
        inStock: m.stock > 0, low: m.stock > 0 && m.stock <= m.minimumStock,
      })),
    });
  } catch (err) { next(err); }
}

module.exports = { getConsultation, proceed, markChronic, getLabTests, getMedicineCatalog };
