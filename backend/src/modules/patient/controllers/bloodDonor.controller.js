// Blood Donor Network controller.
//
// Two halves:
//   1) Donor profile — a patient opts in with their blood group + city.
//      Gated on cnicVerified so the network stays trustworthy.
//   2) Blood requests — anyone can post one ("O- needed, City Hospital,
//      2 units"). Compatible, eligible, opted-in donors are notified
//      immediately (bell + real-time socket push). A donor responds with
//      "I Can Donate", which shares their contact with the requester.
//
// This is deliberately hospital-agnostic (city + hospital name are free
// text) — the whole point is a donor network useful anywhere in Pakistan,
// not just at one hospital.

const User = require('../../auth/models/User');
const BloodRequest = require('../models/BloodRequest');
const {
  BLOOD_GROUPS, compatibleDonorGroups, isEligibleToDonate, nextEligibleDate,
} = require('../services/blood.service');
const { notifyUser } = require('./notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function io(req) { return req.app.get('io'); }

const REQUEST_LIFETIME_DAYS = 3;
const URGENCY_RANK = { critical: 0, urgent: 1, normal: 2 };

// Requests whose expiry has passed but are still 'active' → mark expired.
// Same lazy-transition pattern as the health tips / cardiology appointments.
async function expireStale() {
  await BloodRequest.updateMany(
    { status: 'active', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
}

function donorView(u) {
  const eligible = isEligibleToDonate(u.donor?.lastDonationAt);
  return {
    optedIn: !!u.donor?.optedIn,
    bloodGroup: u.bloodGroup || '',
    city: u.donor?.city || '',
    lastDonationAt: u.donor?.lastDonationAt || null,
    eligible,
    nextEligibleDate: eligible ? null : nextEligibleDate(u.donor?.lastDonationAt),
  };
}

// ── DONOR PROFILE ────────────────────────────────────────────────────────

// GET /api/patient/blood/donor/me
async function getDonorStatus(req, res, next) {
  try {
    return res.json({ success: true, donor: donorView(req.user) });
  } catch (err) { next(err); }
}

// POST /api/patient/blood/donor/opt-in   body: { bloodGroup, city, lastDonationAt? }
async function optIn(req, res, next) {
  try {
    const { bloodGroup, city, lastDonationAt } = req.body;
    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return fail(res, 400, 'A valid blood group is required.', 'NO_GROUP');
    }
    if (!city || typeof city !== 'string' || !city.trim()) {
      return fail(res, 400, 'City is required so requests near you can find you.', 'NO_CITY');
    }
    // CNIC photo capture was removed from signup, so new accounts never get
    // cnicVerified=true. Gate on the account-verified flag instead.
    if (!(req.user.cnicVerified || req.user.isVerified)) {
      return fail(
        res, 403,
        'Only verified accounts can join the donor network — this keeps it trustworthy for people in an emergency.',
        'NOT_VERIFIED'
      );
    }

    const user = await User.findById(req.user._id);
    user.bloodGroup = bloodGroup;
    user.donor = {
      optedIn: true,
      city: city.trim(),
      lastDonationAt: lastDonationAt ? new Date(lastDonationAt) : user.donor?.lastDonationAt,
    };
    await user.save();

    logger.db('UPDATE', 'User', `${user.email} opted in as ${bloodGroup} donor (${city})`);
    logger.success(`New blood donor: ${bloodGroup} in ${city}`);

    return res.json({ success: true, message: 'You are now a registered blood donor. Thank you for being ready to save a life.', donor: donorView(user) });
  } catch (err) { next(err); }
}

// POST /api/patient/blood/donor/opt-out
async function optOut(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    user.donor = { ...(user.donor?.toObject ? user.donor.toObject() : user.donor), optedIn: false };
    await user.save();
    return res.json({ success: true, message: 'You have left the donor network. You can rejoin any time.', donor: donorView(user) });
  } catch (err) { next(err); }
}

// ── REQUESTS ─────────────────────────────────────────────────────────────

// POST /api/patient/blood/requests
// body: { patientName, bloodGroup, unitsNeeded, hospital, city, contactPhone, notes, urgency }
async function createRequest(req, res, next) {
  try {
    const { patientName, bloodGroup, unitsNeeded, hospital, city, contactPhone, notes, urgency } = req.body;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return fail(res, 400, 'A valid blood group is required.', 'NO_GROUP');
    }
    if (!hospital || !hospital.trim()) return fail(res, 400, 'Hospital name is required.', 'NO_HOSPITAL');
    if (!city || !city.trim()) return fail(res, 400, 'City is required.', 'NO_CITY');
    if (!contactPhone || !contactPhone.trim()) return fail(res, 400, 'A contact phone is required.', 'NO_PHONE');

    const expiresAt = new Date(Date.now() + REQUEST_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

    const request = await BloodRequest.create({
      requester: req.user._id,
      patientName: (patientName || '').trim(),
      bloodGroup,
      unitsNeeded: Math.max(1, Math.min(20, Number(unitsNeeded) || 1)),
      hospital: hospital.trim(),
      city: city.trim(),
      contactPhone: contactPhone.trim(),
      notes: (notes || '').trim(),
      urgency: ['critical', 'urgent', 'normal'].includes(urgency) ? urgency : 'urgent',
      status: 'active',
      expiresAt,
    });

    // Find compatible, opted-in, currently-eligible donors and notify them.
    const donorGroups = compatibleDonorGroups(bloodGroup);
    const candidates = await User.find({
      role: 'patient',
      'donor.optedIn': true,
      bloodGroup: { $in: donorGroups },
      _id: { $ne: req.user._id },
    }).select('_id donor city');

    const eligible = candidates.filter((c) => isEligibleToDonate(c.donor?.lastDonationAt));
    // Donors in the same city surface first in the notification wording, but
    // everyone compatible is notified — a nationwide network is the point.
    for (const donor of eligible) {
      const sameCity = (donor.donor?.city || '').toLowerCase() === city.trim().toLowerCase();
      await notifyUser(donor._id, {
        type: 'blood_request',
        title: `${bloodGroup} blood needed${sameCity ? ' near you' : ''}`,
        body: `${request.unitsNeeded} unit(s) needed at ${hospital.trim()}, ${city.trim()}. Tap to help.`,
        icon: 'water',
        screen: 'BloodDonorScreen',
      });
    }
    request.notifiedDonorCount = eligible.length;
    await request.save();

    logger.db('INSERT', 'BloodRequest', `${req.user.email} needs ${bloodGroup} at ${hospital} (${eligible.length} donors notified)`);
    logger.success(`Blood request posted: ${bloodGroup} × ${request.unitsNeeded} — ${eligible.length} compatible donors notified`);

    const server = io(req);
    if (server) server.emit('blood:update', { type: 'new_request' });

    return res.status(201).json({
      success: true,
      message: eligible.length > 0
        ? `Request posted. ${eligible.length} compatible donor(s) have been notified.`
        : 'Request posted. No matching donors are registered yet — share the app to grow the network.',
      request,
      donorsNotified: eligible.length,
    });
  } catch (err) { next(err); }
}

// GET /api/patient/blood/requests?onlyCompatible=1
async function listRequests(req, res, next) {
  try {
    await expireStale();

    const requests = await BloodRequest.find({ status: 'active' }).sort({ createdAt: -1 }).lean();

    const myGroup = req.user.bloodGroup || '';
    const myCompatibleAsDonorFor = myGroup ? new Set(
      BLOOD_GROUPS.filter((recipientGroup) => compatibleDonorGroups(recipientGroup).includes(myGroup))
    ) : new Set();

    const onlyCompatible = req.query.onlyCompatible === '1';

    const mapped = requests
      .map((r) => ({
        ...r,
        isMine: String(r.requester) === String(req.user._id),
        compatible: myCompatibleAsDonorFor.has(r.bloodGroup),
        hasResponded: (r.responders || []).some((x) => String(x.user) === String(req.user._id)),
        responderCount: (r.responders || []).length,
        responders: undefined, // don't leak other donors' contact info in the public feed
      }))
      .filter((r) => !onlyCompatible || r.isMine || r.compatible)
      .sort((a, b) => {
        const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
        if (rank !== 0) return rank;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    return res.json({ success: true, requests: mapped });
  } catch (err) { next(err); }
}

// GET /api/patient/blood/requests/mine
async function myRequests(req, res, next) {
  try {
    await expireStale();
    const requests = await BloodRequest.find({ requester: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) { next(err); }
}

// POST /api/patient/blood/requests/:id/respond
async function respondToRequest(req, res, next) {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return fail(res, 404, 'Request not found', 'NOT_FOUND');
    if (request.status !== 'active') return fail(res, 400, 'This request is no longer active.', 'NOT_ACTIVE');
    if (String(request.requester) === String(req.user._id)) {
      return fail(res, 400, 'You cannot respond to your own request.', 'OWN_REQUEST');
    }
    if (!req.user.phone || !req.user.bloodGroup) {
      return fail(res, 400, 'Add your phone number and blood group in your profile before responding.', 'INCOMPLETE_PROFILE');
    }
    if (request.responders.some((x) => String(x.user) === String(req.user._id))) {
      return fail(res, 409, 'You already offered to donate for this request.', 'ALREADY_RESPONDED');
    }

    request.responders.push({
      user: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      bloodGroup: req.user.bloodGroup,
    });
    await request.save();

    await notifyUser(request.requester, {
      type: 'blood_request',
      title: 'A donor can help!',
      body: `${req.user.name} (${req.user.bloodGroup}) offered to donate. Contact: ${req.user.phone}`,
      icon: 'heart',
      screen: 'BloodDonorScreen',
    });

    const server = io(req);
    if (server) server.emit('blood:update', { type: 'responded', requestId: String(request._id) });

    logger.db('UPDATE', 'BloodRequest', `${req.user.email} responded to ${request._id}`);

    return res.json({ success: true, message: 'Thank you! The requester has been notified with your contact details.' });
  } catch (err) { next(err); }
}

// POST /api/patient/blood/requests/:id/fulfill
async function fulfillRequest(req, res, next) {
  try {
    const request = await BloodRequest.findOne({ _id: req.params.id, requester: req.user._id });
    if (!request) return fail(res, 404, 'Request not found', 'NOT_FOUND');
    request.status = 'fulfilled';
    await request.save();
    const server = io(req);
    if (server) server.emit('blood:update', { type: 'fulfilled' });
    return res.json({ success: true, message: 'Marked as fulfilled. Thank you for updating the network.', request });
  } catch (err) { next(err); }
}

// POST /api/patient/blood/requests/:id/cancel
async function cancelRequest(req, res, next) {
  try {
    const request = await BloodRequest.findOne({ _id: req.params.id, requester: req.user._id });
    if (!request) return fail(res, 404, 'Request not found', 'NOT_FOUND');
    if (request.status !== 'active') return fail(res, 400, 'Only active requests can be cancelled.', 'BAD_STATE');
    request.status = 'cancelled';
    await request.save();
    const server = io(req);
    if (server) server.emit('blood:update', { type: 'cancelled' });
    return res.json({ success: true, message: 'Request cancelled.', request });
  } catch (err) { next(err); }
}

// GET /api/patient/blood/stats — powers the Home screen tile.
async function getStats(req, res, next) {
  try {
    await expireStale();

    const [totalDonors, activeRequests, fulfilledRequests, myGroup] = await Promise.all([
      User.countDocuments({ 'donor.optedIn': true }),
      BloodRequest.countDocuments({ status: 'active' }),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      Promise.resolve(req.user.bloodGroup || ''),
    ]);

    let matchingMe = 0;
    if (myGroup) {
      const groupsIDonateTo = BLOOD_GROUPS.filter((recipientGroup) => compatibleDonorGroups(recipientGroup).includes(myGroup));
      matchingMe = await BloodRequest.countDocuments({
        status: 'active', bloodGroup: { $in: groupsIDonateTo }, requester: { $ne: req.user._id },
      });
    }

    return res.json({
      success: true,
      stats: { totalDonors, activeRequests, fulfilledRequests, matchingMe, isDonor: !!req.user.donor?.optedIn },
    });
  } catch (err) { next(err); }
}

module.exports = {
  getDonorStatus, optIn, optOut,
  createRequest, listRequests, myRequests, respondToRequest, fulfillRequest, cancelRequest,
  getStats,
};
