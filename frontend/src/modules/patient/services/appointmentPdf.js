// Appointment pass → a proper, downloadable PDF with a scannable QR code.
//
// The QR encodes a PUBLIC verification URL (GET /api/appointments/verify/:id)
// so anyone — a hospital desk, a guard — can scan it with any phone and get a
// page confirming the appointment is genuine, straight from the database.
//
// • appointmentQrSvg()     → an <svg> string for on-screen display (SvgXml).
// • appointmentVerifyUrl() → the URL the QR points at.
// • downloadAppointmentPdf()→ builds the PDF and opens the share/save sheet.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import qrcode from 'qrcode-generator';
import { getApiBaseUrl } from '../../../config/api.config';

function apptId(a) {
  return String((a && (a.id || a._id)) || '').trim();
}

export function appointmentVerifyUrl(appt) {
  // getApiBaseUrl() → "https://host/api"; the verify route lives at /api/appointments/verify/:id
  return `${getApiBaseUrl()}/appointments/verify/${apptId(appt)}`;
}

function makeQr(appt) {
  const qr = qrcode(0, 'M');
  qr.addData(appointmentVerifyUrl(appt));
  qr.make();
  return qr;
}

// For React Native display (crisp, via react-native-svg's SvgXml).
export function appointmentQrSvg(appt, cellSize = 5, margin = 2) {
  try { return makeQr(appt).createSvgTag({ cellSize, margin, scalable: true }); }
  catch (e) { return null; }
}

// For the PDF (a GIF data-URI renders fine in the print webview; pure JS).
export function appointmentQrDataUrl(appt, cellSize = 6, margin = 4) {
  try { return makeQr(appt).createDataURL(cellSize, margin); }
  catch (e) { return ''; }
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildAppointmentHtml(appt, { patientName = '' } = {}) {
  const qr = appointmentQrDataUrl(appt);
  const url = appointmentVerifyUrl(appt);
  const dept = appt.specialty || appt.department || 'Cardiology';
  const ref = apptId(appt).slice(-10).toUpperCase() || '—';
  const rows = [
    ['Patient', patientName || appt.patientName || '—'],
    ['Doctor', appt.doctor || appt.doctorName || 'Specialist'],
    ['Specialty / Department', dept],
    ['Date', appt.date || '—'],
    ['Time', appt.time || '—'],
    ['Token', appt.tokenNo || '—'],
    ['Visit Type', appt.type || appt.visitPurpose || 'Consultation'],
    ['Status', appt.status || 'Confirmed'],
    ['Appointment Ref', ref],
  ];
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1F2937; }
    .sheet { padding: 40px 44px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #0BAA9D; padding-bottom: 16px; }
    .brand .name { color: #0BAA9D; font-size: 26px; font-weight: 800; letter-spacing: .3px; }
    .brand .hosp { color: #374151; font-size: 13px; margin-top: 3px; }
    .doc { text-align: right; }
    .doc .label { font-size: 11px; letter-spacing: 2px; color: #9CA3AF; text-transform: uppercase; }
    .doc .title { font-size: 19px; font-weight: 800; color: #111827; margin-top: 2px; }
    .main { display: flex; gap: 30px; margin-top: 30px; }
    .details { flex: 1; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 11px 2px; border-bottom: 1px solid #ECEFF3; font-size: 14.5px; vertical-align: top; }
    td.k { color: #6B7280; width: 44%; }
    td.v { font-weight: 700; color: #111827; }
    .qrwrap { width: 190px; text-align: center; }
    .qrbox { border: 1px solid #E5E7EB; border-radius: 14px; padding: 12px; background: #fff; }
    .qrbox img { width: 164px; height: 164px; display: block; }
    .qrcap { font-size: 12px; color: #0BAA9D; font-weight: 700; margin-top: 10px; }
    .qrsub { font-size: 10.5px; color: #9CA3AF; margin-top: 4px; word-break: break-all; line-height: 1.4; }
    .valid { display:inline-block; margin-top: 8px; background:#0BAA9D; color:#fff; font-size: 11px;
             font-weight:700; padding: 5px 12px; border-radius: 20px; }
    .notes { margin-top: 34px; background: #F3FBF9; border: 1px solid #CDEEE8; border-radius: 12px; padding: 16px 18px; }
    .notes h3 { margin: 0 0 8px; font-size: 13px; color: #0A6F66; text-transform: uppercase; letter-spacing: 1px; }
    .notes li { font-size: 13px; color: #374151; margin: 5px 0; }
    .foot { margin-top: 30px; border-top: 1px solid #ECEFF3; padding-top: 12px;
            display: flex; justify-content: space-between; color: #9CA3AF; font-size: 11px; }
  </style></head>
  <body><div class="sheet">
    <div class="top">
      <div class="brand"><div class="name">SehatLine</div><div class="hosp">CDA Hospital, Islamabad</div></div>
      <div class="doc"><div class="label">Appointment</div><div class="title">Confirmation</div></div>
    </div>
    <div class="main">
      <div class="details"><table>${rowsHtml}</table></div>
      <div class="qrwrap">
        <div class="qrbox">${qr ? `<img src="${qr}" alt="QR"/>` : ''}</div>
        <div class="valid">&#10003; Scan to verify</div>
        <div class="qrcap">Valid appointment</div>
        <div class="qrsub">${esc(url)}</div>
      </div>
    </div>
    <div class="notes"><h3>Please note</h3><ul>
      <li>Arrive 15 minutes before your scheduled time.</li>
      <li>Bring your CNIC and CDA card for verification.</li>
      <li>Carry previous medical records and reports.</li>
      <li>Show this pass (or the QR above) at the hospital desk.</li>
    </ul></div>
    <div class="foot"><span>Generated ${esc(new Date().toLocaleString())}</span><span>SehatLine &middot; Smart Queue &amp; Appointment System</span></div>
  </div></body></html>`;
}

// Build the PDF and open the native save/share sheet. Returns the file uri.
export async function downloadAppointmentPdf(appt, opts = {}) {
  const html = buildAppointmentHtml(appt, opts);
  const { uri } = await Print.printToFileAsync({ html });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Appointment PDF',
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (_) { /* user dismissed the sheet */ }
  return uri;
}
