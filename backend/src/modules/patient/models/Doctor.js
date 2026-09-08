// Doctor model — hospital doctors, seeded and served to the app.

const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, unique: true }, // e.g. 'cardio_1'
    name: { type: String, required: true },
    specialization: { type: String, default: '' },
    // Whether this doctor runs an OPD clinic (bookable appointments) or the
    // Chronic OPD (token queue). Drives which queue their portal shows and where
    // patients reach them. OPD doctors get a 'cardio*' id; chronic get 'chronic*'.
    category: { type: String, enum: ['opd', 'chronic'], default: 'opd', index: true },
    department: { type: String, default: 'cardiology', index: true },
    // For chronic doctors: which chronic illnesses this doctor handles.
    // The admin module will edit these; the token flow reads them to route a
    // patient to the right doctor for their illness.
    conditions: { type: [String], default: [] },
    qualifications: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    availableDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    // Bookable time slots for this doctor, 24h 'HH:mm'. Admin-managed. The
    // appointment flow offers exactly these (minus already-booked ones).
    slots: { type: [String], default: ['09:00', '09:30', '10:00', '10:30', '11:00', '12:00', '12:30', '13:00'] },
    // Optional per-doctor booking cut-off ('HH:mm'). When set it overrides the
    // hospital-wide BOOKING_END (1:00 PM) for THIS doctor only — so a doctor who
    // sits later can accept bookings up to their own time. Empty = use default.
    bookingEnd: { type: String, default: '' },
    // Per-day working hours the doctor sets in the app: [{ day, start, end,
    // available }]. availableDays + slots above are DERIVED from this for the
    // patient booking flow; this keeps the doctor's exact per-day config.
    availabilityDetail: { type: Array, default: [] },
    room: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
