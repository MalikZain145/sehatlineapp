// Pharmacy backup endpoints. Each day's dispensing record can be downloaded as
// a formatted Excel sheet; "Export All" streams one master workbook with a sheet
// per day. The downloading pharmacist's details are stamped into every sheet.

const { localDateStr } = require('../../../utils/dates');
const {
  generateDailyBackup, buildWorkbookForDay, buildMasterWorkbook, listDays,
} = require('../services/backup.service');

function pharmacistOf(req) {
  const u = req.user || {};
  return { name: u.name, phone: u.phone, email: u.email, employeeId: u.employeeId };
}

async function sendWorkbook(res, workbook, fileName) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
}

// GET /api/pharmacy/backup  → list of days that have dispensing data
async function listBackups(req, res, next) {
  try {
    const days = await listDays();
    return res.json({ success: true, count: days.length, days });
  } catch (err) { next(err); }
}

// POST /api/pharmacy/backup  → save today's (or ?date) file to disk on the server
async function createBackup(req, res, next) {
  try {
    const { fileName, count } = await generateDailyBackup(req.body?.date, pharmacistOf(req));
    return res.json({ success: true, message: `Backup saved: ${count} record(s).`, fileName, count });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/backup/:date/download  → one day's workbook
async function downloadDay(req, res, next) {
  try {
    const date = String(req.params.date).replace(/[^0-9-]/g, '');
    const { workbook } = await buildWorkbookForDay(date, pharmacistOf(req));
    return sendWorkbook(res, workbook, `pharmacy-backup-${date}.xlsx`);
  } catch (err) { next(err); }
}

// GET /api/pharmacy/backup/export-all/download  → master workbook (sheet per day)
async function exportAll(req, res, next) {
  try {
    const { workbook } = await buildMasterWorkbook(pharmacistOf(req));
    const stamp = localDateStr();
    return sendWorkbook(res, workbook, `pharmacy-backup-ALL-${stamp}.xlsx`);
  } catch (err) { next(err); }
}

module.exports = { listBackups, createBackup, downloadDay, exportAll };
