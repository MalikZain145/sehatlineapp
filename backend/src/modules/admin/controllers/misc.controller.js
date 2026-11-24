// Admin → dashboard stats, doctor reports, and change-own-password.

const { localDateStr } = require('../../../utils/dates');
const User = require('../../auth/models/User');
const Doctor = require('../../patient/models/Doctor');
const Token = require('../../patient/models/Token');
const Appointment = require('../../patient/models/Appointment');
const Report = require('../models/Report');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

// Where each staff role opens their notifications, so tapping the admin's reply
// lands in the right place.
const ROLE_NOTIF_SCREEN = { doctor: 'AdminNotifications', pharmacy: 'Notifications', laboratory: 'Notifications' };

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function emit(req, event, payload) {
  try { const io = req.app.get('io'); if (io) io.emit(event, payload || {}); } catch (e) { /* ignore */ }
}

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────
async function getDashboard(req, res, next) {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [patients, chronicPatients, doctors, activeDoctors, tokensToday, apptsToday, openReports] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'patient', isChronic: true }),
      Doctor.countDocuments({}),
      Doctor.countDocuments({ active: true }),
      Token.countDocuments({ createdAt: { $gte: startOfToday } }),
      Appointment.countDocuments({ date: localDateStr() }),
      Report.countDocuments({ status: 'open' }),
    ]);
    return res.json({
      success: true,
      stats: { patients, chronicPatients, doctors, activeDoctors, tokensToday, apptsToday, openReports },
    });
  } catch (err) { next(err); }
}

// ── ANALYTICS (real data — read-only) ──────────────────────────────────────
// Powers the Dashboard trend chips + the Analytics screen (weekly series,
// department distribution, KPIs). Everything here is computed live from the
// existing collections — no new data is stored.
const DEPT_LABEL = { chronic_opd: 'Chronic OPD', cardiology: 'Cardiology', pharmacy: 'Pharmacy', done: 'Completed', general: 'General' };
const DAY_MS = 86400000;
const dateStr = (d) => localDateStr(d);
const pctChange = (cur, prev) => {
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
};

async function getAnalytics(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const yest = new Date(startOfToday.getTime() - DAY_MS);
    const weekAgo = new Date(startOfToday.getTime() - 7 * DAY_MS);
    const twoWeeks = new Date(startOfToday.getTime() - 14 * DAY_MS);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

    // Last 7 days (oldest → today).
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(new Date(startOfToday.getTime() - i * DAY_MS));
    const labels = days.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' }));

    const [patientsPerDay, apptsPerDay, tokensPerDay] = await Promise.all([
      Promise.all(days.map((d) => User.countDocuments({ role: 'patient', createdAt: { $gte: d, $lt: new Date(d.getTime() + DAY_MS) } }))),
      Promise.all(days.map((d) => Appointment.countDocuments({ date: dateStr(d) }))),
      Promise.all(days.map((d) => Token.countDocuments({ createdAt: { $gte: d, $lt: new Date(d.getTime() + DAY_MS) } }))),
    ]);

    const [totalPatients, patThisWeek, patLastWeek, apptToday, apptYest, tokToday, tokYest, doctorsNew, doctorsTotal] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'patient', createdAt: { $gte: weekAgo } }),
      User.countDocuments({ role: 'patient', createdAt: { $gte: twoWeeks, $lt: weekAgo } }),
      Appointment.countDocuments({ date: dateStr(startOfToday) }),
      Appointment.countDocuments({ date: dateStr(yest) }),
      Token.countDocuments({ createdAt: { $gte: startOfToday } }),
      Token.countDocuments({ createdAt: { $gte: yest, $lt: startOfToday } }),
      Doctor.countDocuments({ createdAt: { $gte: weekAgo } }),
      Doctor.countDocuments({}),
    ]);

    // Department distribution over the last 30 days (tokens by dept + appts as Cardiology).
    const tokAgg = await Token.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const apptMonth = await Appointment.countDocuments({ createdAt: { $gte: monthAgo } });
    const deptMap = {};
    tokAgg.forEach((t) => { const label = DEPT_LABEL[t._id] || t._id || 'General'; deptMap[label] = (deptMap[label] || 0) + t.count; });
    if (apptMonth) deptMap.Cardiology = (deptMap.Cardiology || 0) + apptMonth;
    const deptTotal = Object.values(deptMap).reduce((a, b) => a + b, 0) || 1;
    let departments = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / deptTotal) * 100) }))
      .sort((a, b) => b.count - a.count);
    if (departments.length > 5) {
      const top = departments.slice(0, 4);
      const oc = departments.slice(4).reduce((a, b) => a + b.count, 0);
      top.push({ name: 'Others', count: oc, pct: Math.round((oc / deptTotal) * 100) });
      departments = top;
    }

    // KPIs: appointments this month, no-show rate (past appts not completed), avg wait.
    const [apptPastTotal, apptPastNoShow] = await Promise.all([
      Appointment.countDocuments({ date: { $lt: dateStr(startOfToday) } }),
      Appointment.countDocuments({ date: { $lt: dateStr(startOfToday) }, status: { $nin: ['completed'] } }),
    ]);
    const noShowRate = apptPastTotal ? Math.round((apptPastNoShow / apptPastTotal) * 1000) / 10 : 0;
    const waitAgg = await Token.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, status: 'in-queue' } },
      { $group: { _id: null, avg: { $avg: '$estimatedWaitMin' } } },
    ]);
    const avgWaitMin = Math.round(waitAgg[0]?.avg || 0);

    return res.json({
      success: true,
      weekly: { labels, patients: patientsPerDay, appointments: apptsPerDay, tokens: tokensPerDay },
      trends: {
        apptsToday: { value: apptToday, deltaPct: pctChange(apptToday, apptYest) },
        patients: { value: totalPatients, deltaPct: pctChange(patThisWeek, patLastWeek) },
        tokensToday: { value: tokToday, deltaPct: pctChange(tokToday, tokYest) },
        doctors: { value: doctorsTotal, deltaNew: doctorsNew },
      },
      departments,
      kpis: { totalPatients, appointments: apptMonth, noShowRate, avgWaitMin },
    });
  } catch (err) { next(err); }
}

// ── DOCTOR REPORTS ─────────────────────────────────────────────────────────────
async function listReports(req, res, next) {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(200).lean();
    const unread = reports.filter((r) => r.status === 'open').length;
    return res.json({ success: true, unread, reports });
  } catch (err) { next(err); }
}

async function resolveReport(req, res, next) {
  try {
    const r = await Report.findByIdAndUpdate(req.params.id, { $set: { status: 'resolved' } }, { new: true });
    if (!r) return fail(res, 404, 'Report not found.', 'NOT_FOUND');
    emit(req, 'admin:update', { type: 'reports' });
    return res.json({ success: true, message: 'Report marked as resolved.' });
  } catch (err) { next(err); }
}

// POST /api/admin/reports/:id/reply  body: { reply }
// The admin replies to a staff report. The reply is saved, the report is marked
// resolved, and the sender (doctor/pharmacist/lab) gets a notification quoting
// their original message so they know exactly which issue was answered.
async function replyReport(req, res, next) {
  try {
    const reply = String(req.body?.reply || '').trim();
    if (!reply) return fail(res, 400, 'Please write a reply before sending.', 'EMPTY');
    const r = await Report.findById(req.params.id);
    if (!r) return fail(res, 404, 'Report not found.', 'NOT_FOUND');

    r.reply = reply;
    r.repliedAt = new Date();
    r.status = 'resolved';
    await r.save();

    if (r.fromUser) {
      const snippet = r.message.length > 90 ? `${r.message.slice(0, 90)}…` : r.message;
      notifyUser(r.fromUser, {
        type: 'system',
        title: 'Admin replied to your report',
        body: `Re: "${snippet}"\n\n${reply}`,
        icon: 'chatbox-ellipses',
        screen: ROLE_NOTIF_SCREEN[r.fromRole] || 'Notifications',
      });
    }

    logger.db('UPDATE', 'Report', `admin replied to ${r._id} (${r.fromRole})`);
    emit(req, 'admin:update', { type: 'reports' });
    return res.json({ success: true, message: 'Reply sent to the sender and report resolved.', report: r.toObject() });
  } catch (err) { next(err); }
}

// ── CHANGE OWN PASSWORD ────────────────────────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return fail(res, 400, 'New password must be at least 6 characters.', 'VALIDATION');
    }
    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.comparePassword(String(currentPassword || ''));
    if (!ok) return fail(res, 401, 'Current password is incorrect.', 'BAD_PASSWORD');
    user.password = newPassword;
    await user.save();
    logger.db('UPDATE', 'User', `admin ${user.email} changed password`);
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
}

// ── SYSTEM RATINGS ─────────────────────────────────────────────────────────
// GET /api/admin/ratings?category=app|queue|staff|facilities|other
// Patient-submitted ratings/feedback of the SYSTEM, with summary stats.
async function getRatings(req, res, next) {
  try {
    const Feedback = require('../../patient/models/Feedback');
    const { category } = req.query || {};
    const query = {};
    if (category && category !== 'all') query.category = category;

    const rows = await Feedback.find(query).sort({ createdAt: -1 }).limit(300).lean();

    // Attach the reviewer's name (best-effort).
    const userIds = [...new Set(rows.map((r) => String(r.user)).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const nameById = {};
    users.forEach((u) => { nameById[String(u._id)] = u.name || u.email || 'Patient'; });

    const ratings = rows.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      category: r.category,
      comment: r.comment || '',
      reviewed: !!r.reviewed,
      userName: nameById[String(r.user)] || 'Patient',
      appVersion: r.appVersion || '',
      platform: r.platform || '',
      createdAt: r.createdAt,
    }));

    // Summary over ALL feedback (not just the filtered page).
    const all = await Feedback.find().select('rating category').lean();
    const count = all.length;
    const average = count ? Math.round((all.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10 : 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byCategory = {};
    all.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating] += 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });

    return res.json({ success: true, average, count, distribution, byCategory, ratings });
  } catch (err) { next(err); }
}

// PATCH /api/admin/ratings/:id/reviewed — mark a rating as read/triaged.
async function markRatingReviewed(req, res, next) {
  try {
    const Feedback = require('../../patient/models/Feedback');
    const r = await Feedback.findByIdAndUpdate(req.params.id, { $set: { reviewed: true } }, { new: true });
    if (!r) return fail(res, 404, 'Rating not found.', 'NOT_FOUND');
    return res.json({ success: true, message: 'Marked as reviewed.' });
  } catch (err) { next(err); }
}

module.exports = { getDashboard, getAnalytics, listReports, resolveReport, replyReport, changePassword, getRatings, markRatingReviewed };
