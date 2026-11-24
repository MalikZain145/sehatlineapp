// Prescription model.
//
// Created the moment the doctor finishes with a chronic OPD patient. It
// carries a SNAPSHOT of the patient's identity (name, email, CNIC, phone,
// CDA card) plus the prescribed medicines and any lab tests — this is the
// document that "goes to the pharmacist" (and then the lab, if tests were
// prescribed). The pharmacy/lab staff modules don't exist yet, so for now
// the app drives the status transitions; the record is ready for them.

const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true, index: true },
    tokenNumber: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Identity snapshot — frozen at prescribe time so the pharmacy sees
    // exactly who this is, independent of later profile edits.
    patient: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      cnic: { type: String, default: '' },
      phone: { type: String, default: '' },
      cdaCard: { type: String, default: '' },
      age: { type: Number, default: 0 },
    },

    // Who prescribed, and for what.
    chronicIllness: { type: String, default: '' },
    doctor: {
      doctorId: { type: String, default: '' },
      name: { type: String, default: '' },
      specialization: { type: String, default: '' },
    },

    medicines: { type: [String], default: [] },   // display strings, e.g. "Metformin 500mg — 2/day × 30 days"
    // Structured medicine lines so the pharmacy can dispense the exact quantity
    // (qty = perDay × days) and decrement stock accurately. Optional/back-compat:
    // older prescriptions only have the `medicines` strings.
    medicineItems: {
      type: [{
        name: { type: String, default: '' },
        form: { type: String, default: 'Tablet' },   // Tablet/Syrup/Injection/…
        perDay: { type: Number, default: 1 },
        days: { type: Number, default: 1 },
        qty: { type: Number, default: 0 },            // perDay × days (base units)
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryMedicine', default: null },
      }],
      default: [],
    },
    tests: { type: [String], default: [] },      // lab tests, if any
    notes: { type: String, default: '' },

    // Pharmacist this prescription is assigned to. Set at creation time by the
    // load-balancer (least-loaded pharmacist currently on duty). Null means
    // "unassigned" — every pharmacist can pick it up (fallback when nobody was
    // on duty at prescribe time). See pharmacy/services/assignment.service.js.
    pharmacist: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
      name: { type: String, default: '' },
    },

    // Pharmacy stage.
    pharmacyStatus: {
      type: String,
      // pending (waiting) → preparing → ready (for pickup) → dispensed (done)
      enum: ['pending', 'preparing', 'ready', 'dispensed'],
      default: 'pending',
      index: true,
    },
    pharmacyCounter: { type: String, default: '' },   // pickup counter when ready
    dispensedAt: { type: Date },

    // Lab stage (only relevant when tests.length > 0).
    // pending (waiting) → collected (sample taken) → processing → completed.
    labStatus: {
      type: String,
      enum: ['none', 'pending', 'collected', 'processing', 'completed'],
      default: 'none',
      index: true,
    },
    // Cardiology appointments have no OPD Token to gate the lab queue; the
    // pharmacy sets this on dispense so tokenless test-patients still appear.
    labQueued: { type: Boolean, default: false },
    labCounter: { type: String, default: '' },   // collection/serving counter
    labCompletedAt: { type: Date },
    labReport: { type: mongoose.Schema.Types.ObjectId, ref: 'LabReport', default: null },
  },
  { timestamps: true }
);

// Speed: the pharmacy queue/completed lists and lab queue filter + sort on these.
prescriptionSchema.index({ pharmacyStatus: 1, createdAt: 1 });
prescriptionSchema.index({ pharmacyStatus: 1, dispensedAt: -1 });
prescriptionSchema.index({ labStatus: 1, createdAt: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
