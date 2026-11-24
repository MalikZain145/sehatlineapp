// Appointment model — for CARDIOLOGY department bookings.
//
// Rules enforced by the controller:
//   • One patient cannot double-book the SAME date + time (across cardio AND
//     an active chronic token).
//   • A given cardiology slot (date + time + doctor) can be held by only ONE
//     patient.
//
// This is separate from the Chronic OPD *token* flow (see Token.js), which is
// for chronic patients whose journey also includes pharmacy + lab.

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    department: { type: String, default: 'cardiology', index: true },

    doctorId: { type: String, default: '' },     // which cardiologist
    doctorName: { type: String, default: '' },

    // The booked slot.
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    time: { type: String, required: true },              // 'HH:mm' (24h)

    // System-assigned token number for this doctor + day, e.g. "C-007".
    // (The doctor's queue used to show the slot TIME as the "token".)
    tokenNumber: { type: String, default: '' },

    // Booking lifecycle.
    status: {
      type: String,
      enum: ['booked', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
      index: true,
    },

    reason: { type: String, default: '' },
    notes: { type: String, default: '' },

    // AI/ML triage priority (from the Python ensemble, rule-based fallback).
    // Higher score = should be seen sooner on the appointment day, so elderly
    // and patients with critical recent vitals are attended first.
    priorityScore: { type: Number, default: 0, index: true },
    priorityLevel: { type: String, default: 'normal' },
    prioritySource: { type: String, default: '' },   // 'ml' | 'rule-fallback'

    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Fast lookups for slot-clash checks.
appointmentSchema.index({ date: 1, time: 1, doctorId: 1, status: 1 });
appointmentSchema.index({ user: 1, date: 1, time: 1, status: 1 });
// RACE FIX: the controller checks "slot free?" and then creates — two
// patients tapping at the same moment could both pass the check. This makes
// the database itself refuse a second ACTIVE booking of the same slot.
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'booked' }, name: 'uniq_active_slot' }
);

// Next sequential token for a doctor's day: "C-001", "C-002", …
appointmentSchema.statics.nextTokenNumber = async function nextTokenNumber(doctorId, date) {
  const Counter = require('./Counter');
  const seq = await Counter.next(`appt_${doctorId || 'any'}_${date}`);
  return `C-${String(seq).padStart(3, '0')}`;
};

// Older bookings (made before token numbers existed) get one lazily.
appointmentSchema.statics.ensureTokenNumbers = async function ensureTokenNumbers(appts) {
  for (const a of appts) {
    if (a.tokenNumber) continue;
    const tn = await this.nextTokenNumber(a.doctorId, a.date);
    await this.updateOne({ _id: a._id, tokenNumber: { $in: ['', null] } }, { $set: { tokenNumber: tn } });
    a.tokenNumber = tn;
  }
  return appts;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
