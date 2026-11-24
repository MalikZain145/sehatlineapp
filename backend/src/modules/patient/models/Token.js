// Token model.
// Represents a patient's token and its journey through the hospital:
//   chronic_opd → pharmacy → laboratory → completed
//
// The token keeps ONE number the whole journey (only its department/status
// changes). Priority (elderly / chronic condition) decides queue position.

const mongoose = require('mongoose');

// The stages a token moves through.
const STATUSES = [
  'in-queue',     // waiting to be seen at current department
  'in-progress',  // currently being served (Now Serving)
  'pharmacy',     // moved to pharmacy
  'awaiting_lab_choice', // pharmacy done, patient choosing lab or complete
  'laboratory',   // moved to laboratory
  'completed',    // journey finished
  'cancelled',
];

const DEPARTMENTS = ['chronic_opd', 'pharmacy', 'laboratory', 'done'];

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Human-facing token number, e.g. "CH-057". Stays the same all journey.
    tokenNumber: { type: String, required: true },

    // Current department the token is at.
    department: { type: String, enum: DEPARTMENTS, default: 'chronic_opd', index: true },

    // Current status within the journey.
    status: { type: String, enum: STATUSES, default: 'in-queue', index: true },

    // ---- Priority (from the ML model / rules) ----
    // Higher priorityScore = seen sooner. Elderly and chronic/critical
    // conditions get boosted so they're served before normal patients.
    priorityScore: { type: Number, default: 0, index: true },
    priorityLevel: { type: String, enum: ['critical', 'high', 'elderly', 'normal', 'low'], default: 'normal' },
    priorityReason: { type: String, default: '' },

    // Snapshot of patient factors used for priority (for transparency/audit)
    factors: {
      age: { type: Number, default: 0 },
      isElderly: { type: Boolean, default: false },
      hasCriticalCondition: { type: Boolean, default: false },
      conditions: { type: [String], default: [] },
    },

    // ---- Chronic OPD context ----
    // What the patient came in for, and which doctor they're routed to.
    // Set at token generation from the chronic illness → doctor mapping.
    chronicIllness: { type: String, default: '' },
    assignedDoctor: {
      doctorId: { type: String, default: '' },
      name: { type: String, default: '' },
      specialization: { type: String, default: '' },
      room: { type: String, default: '' },
    },

    // ---- Doctor consultation (filled during the consult) ----
    diagnosis: { type: String, default: '' },
    clinicalNotes: { type: String, default: '' },
    consultedByName: { type: String, default: '' },
    consultedAt: { type: Date },

    // A follow-up token is issued within the 30-day window ONLY to show lab
    // reports to the doctor. It does NOT repeat medicine, so its journey ends
    // at the doctor (no pharmacy, no new lab).
    isFollowUp: { type: Boolean, default: false },

    // Link to the prescription created when the doctor finishes with this
    // patient (the document that "goes to the pharmacy").
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },

    // Queue position at the current department (computed, 1 = next).
    position: { type: Number, default: 0 },

    // Estimated minutes until this token is seen (M/M/s-informed from position,
    // number of doctors on duty, and per-patient service time).
    estimatedWaitMin: { type: Number, default: 0 },

    // Journey log — every stage change with a timestamp.
    history: [
      {
        department: String,
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // Whether the patient chose to take a lab token after pharmacy.
    labRequested: { type: Boolean, default: false },

    // Set by the doctor: if they prescribe lab tests, the journey routes to
    // the lab after pharmacy automatically. If no tests, journey ends at
    // pharmacy with a thank-you.
    labRequired: { type: Boolean, default: false },
    prescribedTests: { type: [String], default: [] },

    issuedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

tokenSchema.statics.STATUSES = STATUSES;
tokenSchema.statics.DEPARTMENTS = DEPARTMENTS;

// Add a history entry helper.
tokenSchema.methods.log = function log(note) {
  this.history.push({ department: this.department, status: this.status, at: new Date(), note: note || '' });
};

// Speed: every queue read is "department + status", ordered by priority/time.
tokenSchema.index({ department: 1, status: 1, priorityScore: -1, issuedAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
