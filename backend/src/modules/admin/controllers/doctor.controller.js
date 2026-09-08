// Admin → doctor management. Add (single + bulk), edit, delete, list.
// Each doctor gets BOTH a login (User, role 'doctor') and a bookable Doctor row.

const User = require('../../auth/models/User');
const Doctor = require('../../patient/models/Doctor');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function emit(req, event, payload) {
  try { const io = req.app.get('io'); if (io) io.emit(event, payload || {}); } catch (e) { /* ignore */ }
}

// Turn a name into a login email + a doctorId slug if none supplied.
function slugFromName(name) {
  return String(name || 'doctor').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 30) || 'doctor';
}

// A readable placeholder name from an email local-part (e.g. ayesha.khan →
// "Ayesha Khan"), used when the admin creates an account with only an email.
function nameFromEmail(email) {
  const local = String(email || '').split('@')[0] || 'Doctor';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Doctor';
}

// ── LIST ────────────────────────────────────────────────────────────────────
async function listDoctors(req, res, next) {
  try {
    const rows = await Doctor.find().sort({ createdAt: -1 }).lean();
    const emails = {};
    const users = await User.find({ role: 'doctor' }).select('name email doctorId active accountStatus').lean();
    users.forEach((u) => { if (u.doctorId) emails[u.doctorId] = u; });
    const doctors = rows.map((d) => ({
      ...d,
      loginEmail: emails[d.doctorId]?.email || '',
      accountStatus: emails[d.doctorId]?.accountStatus || 'active',
    }));
    return res.json({ success: true, count: doctors.length, doctors });
  } catch (err) { next(err); }
}

// Create ONE doctor (login + bookable row). Returns the created doctor + creds.
// The admin can create an "empty" account with just an email + category — the
// doctor fills their own name/specialization/etc on first login. A doctor only
// becomes BOOKABLE (active) once they have a real name AND specialization.
async function createOneDoctor(body, opts = {}) {
  const emailIn = String(body.email || '').trim().toLowerCase();
  const nameIn = String(body.name || '').trim();
  if (!nameIn && !emailIn) throw Object.assign(new Error('A doctor name or email is required.'), { status: 400 });

  const specialization = String(body.specialization || '').trim(); // no default — doctor sets it

  // Category decides the doctor's queue + id prefix:
  //   • 'opd'     → bookable OPD clinic; id must start 'cardio' (the appointment
  //                 branch keys off that), department = the chosen OPD.
  //   • 'chronic' → Chronic OPD token queue; id starts 'chronic', dept 'chronic_opd'.
  const category = body.category === 'chronic' ? 'chronic' : 'opd';
  const department = category === 'chronic'
    ? 'chronic_opd'
    : String(body.department || 'cardiology').trim();
  const prefix = category === 'chronic' ? 'chronic' : 'cardio';
  const slugBase = nameIn || emailIn.split('@')[0] || 'doctor';
  const doctorId = String(body.doctorId || '').trim() || `${prefix}_${slugFromName(slugBase)}_${Date.now().toString(36)}`;
  const email = emailIn || `${doctorId.replace(/_/g, '.')}@sehatline.pk`;
  // Placeholder display name until the doctor sets their own.
  const name = nameIn || nameFromEmail(email);

  // Default password when the admin didn't set one — the doctor is then forced
  // to change it on first login.
  const usingDefault = !String(body.password || '').trim();
  const password = usingDefault ? 'doctor123' : String(body.password).trim();

  // Bookable status:
  //   • explicit body.active wins (true/false),
  //   • else when the caller opts into defaultActive (a deliberate admin add),
  //     the doctor is active straight away,
  //   • else fall back to "bookable only once name + specialization are set"
  //     (used by email-only bulk/Excel imports, which stay hidden until the
  //     doctor completes their own profile).
  const profileComplete = !!(nameIn && specialization);
  let active;
  if (body.active === true) active = true;
  else if (body.active === false) active = false;
  else active = opts.defaultActive ? true : profileComplete;

  // Bookable Doctor row (what patients see).
  await Doctor.findOneAndUpdate(
    { doctorId },
    {
      $set: {
        doctorId, name, specialization, category, department,
        conditions: Array.isArray(body.conditions) ? body.conditions : [],
        qualifications: body.qualifications || '',
        experienceYears: Number(body.experienceYears) || 0,
        room: body.room || '',
        active,
      },
    },
    { upsert: true, new: true }
  );

  const phone = String(body.phone || '').replace(/\s+/g, '').replace(/^0+/, '');

  // Login account.
  let user = await User.findOne({ email }).select('+password');
  if (user) {
    user.name = name; user.role = 'doctor'; user.doctorId = doctorId;
    user.specialization = specialization; user.department = department;
    if (phone && !user.phone) user.phone = phone;
    if (body.password) { user.password = password; user.mustChangePassword = false; }
    user.isVerified = true; user.accountStatus = 'active';
    await user.save();
  } else {
    user = await User.create({
      name, email, password, role: 'doctor', doctorId,
      specialization, department, phone: phone || '', isVerified: true, accountStatus: 'active',
      mustChangePassword: usingDefault, // force a change when using the shared default
    });
  }
  return { doctorId, name, specialization, category, department, loginEmail: email, password };
}

// ── ADD ONE ──────────────────────────────────────────────────────────────────
async function addDoctor(req, res, next) {
  try {
    // Email is mandatory for a doctor added from the admin form — it's their
    // login identity. (Bulk/Excel imports keep their own, more lenient rules.)
    const email = String(req.body?.email || '').trim();
    if (!email) return fail(res, 400, 'Doctor email is required.', 'VALIDATION');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, 400, 'Please enter a valid doctor email.', 'VALIDATION');
    }
    // A doctor added deliberately by the admin is active (bookable) right away.
    const created = await createOneDoctor(req.body || {}, { defaultActive: true });
    logger.db('CREATE', 'Doctor', `admin added ${created.loginEmail}`);
    emit(req, 'admin:update', { type: 'doctors' });
    return res.json({ success: true, message: 'Doctor added.', doctor: created });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message, 'VALIDATION');
    next(err);
  }
}

// ── ADD BULK ──────────────────────────────────────────────────────────────────
// body: { doctors: [ {name, specialization, department, ...}, ... ] }
async function addDoctorsBulk(req, res, next) {
  try {
    const list = Array.isArray(req.body?.doctors) ? req.body.doctors : [];
    if (!list.length) return fail(res, 400, 'Provide a "doctors" array.', 'VALIDATION');

    const created = [];
    const errors = [];
    for (let i = 0; i < list.length; i++) {
      try { created.push(await createOneDoctor(list[i])); }
      catch (e) { errors.push({ row: i + 1, name: list[i]?.name, error: e.message }); }
    }
    logger.db('CREATE', 'Doctor', `admin bulk-added ${created.length} doctors`);
    emit(req, 'admin:update', { type: 'doctors' });
    return res.json({ success: true, message: `${created.length} doctor(s) added.`, created, errors });
  } catch (err) { next(err); }
}

// ── ADD BULK FROM EXCEL ────────────────────────────────────────────────────────
// Accepts an uploaded .xlsx (field "file"). Row 1 is a header; recognised
// columns (case-insensitive): Name, Specialization, Department, Room,
// Experience, Conditions (comma-separated), Email, Password. Any row without a
// name is skipped. Doctors with no password get the shared default (doctor123)
// and are forced to change it on first login.
async function addDoctorsFromExcel(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) return fail(res, 400, 'Please attach an .xlsx file.', 'NO_FILE');
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return fail(res, 400, 'The spreadsheet has no sheets.', 'EMPTY');

    // Map header names → column index.
    const header = {};
    ws.getRow(1).eachCell((cell, col) => {
      const key = String(cell.value || '').trim().toLowerCase();
      if (key) header[key] = col;
    });
    const pick = (row, ...names) => {
      for (const n of names) {
        const col = header[n];
        if (col) {
          const v = row.getCell(col).value;
          if (v !== null && v !== undefined && String(v).trim() !== '') return String(v.text || v).trim();
        }
      }
      return '';
    };

    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      // Email is the key — an "empty profile" import only needs Email (+ Phone).
      // Name/specialization/etc are optional; the doctor fills them on first login.
      const email = pick(row, 'email', 'login email', 'e-mail');
      const name = pick(row, 'name', 'doctor name', 'full name');
      if (!email && !name) continue;
      const catRaw = pick(row, 'category', 'type').toLowerCase();
      const deptRaw = pick(row, 'department', 'dept');
      const category = (catRaw === 'chronic' || /chronic/i.test(deptRaw)) ? 'chronic' : 'opd';
      rows.push({
        email,
        name,
        phone: pick(row, 'phone', 'phone number', 'mobile', 'contact'),
        category,
        specialization: pick(row, 'specialization', 'speciality', 'specialty'),
        department: deptRaw || 'cardiology',
        room: pick(row, 'room'),
        experienceYears: Number(pick(row, 'experience', 'experienceyears', 'experience years')) || 0,
        qualifications: pick(row, 'qualifications', 'qualification'),
        conditions: pick(row, 'conditions', 'illnesses').split(',').map((s) => s.trim()).filter(Boolean),
        password: pick(row, 'password'),
      });
    }
    if (!rows.length) return fail(res, 400, 'No rows found. Make sure row 1 is a header with an "Email" column.', 'EMPTY');

    const created = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      try { created.push(await createOneDoctor(rows[i])); }
      catch (e) { errors.push({ row: i + 2, name: rows[i]?.name, error: e.message }); }
    }
    logger.db('CREATE', 'Doctor', `admin imported ${created.length} doctors from Excel`);
    emit(req, 'admin:update', { type: 'doctors' });
    return res.json({ success: true, message: `${created.length} doctor(s) imported.`, created, errors });
  } catch (err) {
    if (/zip|xlsx|corrupt|end of central/i.test(err.message || '')) {
      return fail(res, 400, 'That file is not a valid .xlsx spreadsheet.', 'BAD_FILE');
    }
    next(err);
  }
}

// ── EDIT ──────────────────────────────────────────────────────────────────────
async function updateDoctor(req, res, next) {
  try {
    const { doctorId } = req.params;
    const doc = await Doctor.findOne({ doctorId });
    if (!doc) return fail(res, 404, 'Doctor not found.', 'NOT_FOUND');

    const fields = ['name', 'specialization', 'department', 'qualifications', 'room', 'experienceYears', 'active', 'conditions', 'slots', 'availableDays', 'bookingEnd'];
    fields.forEach((k) => { if (req.body[k] !== undefined) doc[k] = req.body[k]; });
    await doc.save();

    // Keep the login account in sync.
    const user = await User.findOne({ doctorId });
    if (user) {
      if (req.body.name !== undefined) user.name = req.body.name;
      if (req.body.specialization !== undefined) user.specialization = req.body.specialization;
      if (req.body.department !== undefined) user.department = req.body.department;
      if (req.body.password) user.password = req.body.password;
      await user.save();
    }
    logger.db('UPDATE', 'Doctor', `admin edited ${doctorId}`);
    emit(req, 'admin:update', { type: 'doctors' });
    return res.json({ success: true, message: 'Doctor updated.', doctor: doc.toObject() });
  } catch (err) { next(err); }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deleteDoctor(req, res, next) {
  try {
    const { doctorId } = req.params;
    const doc = await Doctor.findOneAndDelete({ doctorId });
    if (!doc) return fail(res, 404, 'Doctor not found.', 'NOT_FOUND');
    await User.deleteOne({ doctorId, role: 'doctor' });
    logger.db('DELETE', 'Doctor', `admin removed ${doctorId}`);
    emit(req, 'admin:update', { type: 'doctors' });
    return res.json({ success: true, message: 'Doctor removed.' });
  } catch (err) { next(err); }
}

module.exports = { listDoctors, addDoctor, addDoctorsBulk, addDoctorsFromExcel, updateDoctor, deleteDoctor };
