// Patient token routes. Mounted at /api/patient in app.js
// All require a valid session (authGuard).

const allowRoles = require('../../../middleware/role.middleware');
const express = require('express');
const tokenController = require('../controllers/token.controller');
const appointmentController = require('../controllers/appointment.controller');
const pharmacyController = require('../controllers/pharmacy.controller');
const prescriptionController = require('../controllers/prescription.controller');
const notificationController = require('../controllers/notification.controller');
const bloodDonorController = require('../controllers/bloodDonor.controller');
const vitalsController = require('../controllers/vitals.controller');
const reportsController = require('../controllers/reports.controller');
const healthCampController = require('../controllers/healthCamp.controller');
const feedbackController = require('../controllers/feedback.controller');
const authGuard = require('../../../middleware/auth.middleware');
const { validateObjectId } = require('../../../middleware/validate');

const router = express.Router();
const oid = validateObjectId('id'); // reusable guard for /:id routes

// Token journey
router.get('/chronic/config', authGuard, tokenController.getChronicConfig);
router.post('/tokens/generate', authGuard, tokenController.generateToken);
router.get('/tokens/active', authGuard, tokenController.getActiveToken);
router.get('/tokens/queue/:department', authGuard, tokenController.getQueue);
router.get('/queues/summary', authGuard, tokenController.getQueuesSummary);
router.post('/tokens/:id/advance', authGuard, oid, tokenController.advanceToken);
// Staff only — patients used to be able to "call next" and move the whole
// hospital queue (a testing shortcut from before the staff modules existed).
router.post('/tokens/call-next', authGuard, allowRoles('doctor', 'pharmacy', 'laboratory', 'admin'), tokenController.callNext);
router.get('/stats', authGuard, tokenController.getStats);

// Cardiology appointments
router.get('/doctors', authGuard, appointmentController.getDoctors);
router.get('/appointments/slots', authGuard, appointmentController.getSlots);
router.get('/appointments/active', authGuard, appointmentController.getActiveAppointment);
router.get('/appointments', authGuard, appointmentController.myAppointments);
router.post('/appointments', authGuard, appointmentController.bookAppointment);
router.get('/appointments/:id', authGuard, oid, appointmentController.getAppointment);
router.post('/appointments/:id/cancel', authGuard, oid, appointmentController.cancelAppointment);
router.post('/appointments/:id/reschedule', authGuard, oid, appointmentController.reschedule);

// Doctor feedback (mandatory rating of last visit before booking next)
router.get('/feedback/pending', authGuard, feedbackController.getPending);
router.post('/feedback', authGuard, feedbackController.submit);

// Lab reports — view + local analysis + demo seed
router.get('/reports', authGuard, reportsController.listReports);
// Demo seeding wrote FAKE medical reports into a real patient's record — admin only now.
router.post('/reports/demo', authGuard, allowRoles('admin'), reportsController.seedDemoReports);
router.post('/reports', authGuard, reportsController.createReport);
router.get('/reports/:id', authGuard, oid, reportsController.getReport);
router.delete('/reports/:id', authGuard, oid, reportsController.deleteReport);

// Vitals — logging + local health analysis
router.get('/vitals/analysis', authGuard, vitalsController.getAnalysis);
router.get('/vitals', authGuard, vitalsController.listVitals);
router.post('/vitals', authGuard, vitalsController.createVital);
router.delete('/vitals/:id', authGuard, oid, vitalsController.deleteVital);

// Free Health Camps & Screening Drives
router.get('/health-camps/stats', authGuard, healthCampController.getStats);
router.get('/health-camps/mine', authGuard, healthCampController.myCamps);
router.get('/health-camps', authGuard, healthCampController.listCamps);
router.post('/health-camps/demo', authGuard, allowRoles('admin'), healthCampController.seedDemoCamps);
router.post('/health-camps/:id/register', authGuard, oid, healthCampController.registerCamp);
router.post('/health-camps/:id/unregister', authGuard, oid, healthCampController.unregisterCamp);

// Blood Donor Network
router.get('/blood/donor/me', authGuard, bloodDonorController.getDonorStatus);
router.post('/blood/donor/opt-in', authGuard, bloodDonorController.optIn);
router.post('/blood/donor/opt-out', authGuard, bloodDonorController.optOut);
router.get('/blood/requests', authGuard, bloodDonorController.listRequests);
router.get('/blood/requests/mine', authGuard, bloodDonorController.myRequests);
router.post('/blood/requests', authGuard, bloodDonorController.createRequest);
router.post('/blood/requests/:id/respond', authGuard, oid, bloodDonorController.respondToRequest);
router.post('/blood/requests/:id/fulfill', authGuard, oid, bloodDonorController.fulfillRequest);
router.post('/blood/requests/:id/cancel', authGuard, oid, bloodDonorController.cancelRequest);
router.get('/blood/stats', authGuard, bloodDonorController.getStats);

// Pharmacy — medicines & orders
// My Prescriptions (doctor-issued; read-only)
router.get('/prescriptions', authGuard, prescriptionController.myPrescriptions);
router.get('/prescriptions/:id', authGuard, oid, prescriptionController.getPrescription);

router.get('/medicines', authGuard, pharmacyController.getMedicines);
router.post('/orders', authGuard, pharmacyController.placeOrder);
router.get('/orders', authGuard, pharmacyController.myOrders);
router.get('/orders/:id', authGuard, oid, pharmacyController.getOrder);
router.post('/orders/:id/cancel', authGuard, oid, pharmacyController.cancelOrder);

// Notifications (bell menu + twice-daily health tips)
router.get('/notifications', authGuard, notificationController.listNotifications);
router.get('/notifications/unread-count', authGuard, notificationController.unreadCount);
router.post('/notifications/read-all', authGuard, notificationController.markAllRead);
router.post('/notifications/:id/read', authGuard, oid, notificationController.markRead);
router.delete('/notifications/:id', authGuard, oid, notificationController.removeNotification);

module.exports = router;
