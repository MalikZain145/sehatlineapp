// Label for the clock line on a doctor's patient card.
//   • Cardiology booking  → "Appointment at 2:30 PM" (the REAL slot time)
//   • Chronic OPD token   → "~12 min wait" (queue estimate)
// The card used to fall back to a hard-coded "Appointment at 10:00 AM".
export function to12h(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  if (!Number.isFinite(h)) return '';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function visitTimeLabel(p = {}) {
  if (p.timeLabel) return `Appointment at ${p.timeLabel}`;
  if (p.slotTime) return `Appointment at ${to12h(p.slotTime)}`;
  if (p.estWaitMin === 0) return 'Now serving';
  if (p.estWaitMin != null) return `~${p.estWaitMin} min wait`;
  return '';
}
