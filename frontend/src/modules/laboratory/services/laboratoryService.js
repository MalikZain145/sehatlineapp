// Laboratory API — talks to the SehatLine backend (/api/laboratory).
// Replaces the module's dummy in-memory data with real endpoints.

import { api } from '../../../services/apiClient';

function qs(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'All') clean[k] = v; });
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

const laboratoryService = {
  // Dashboard + live queue
  getDashboard: () => api.get('/laboratory/dashboard'),
  getQueue: () => api.get('/laboratory/queue'),
  getCompleted: () => api.get('/laboratory/completed'),
  getAnalytics: () => api.get('/laboratory/analytics'),
  getRecord: (id) => api.get(`/laboratory/prescriptions/${id}`),
  // status: 'Sample Collected' | 'Processing'
  updateStatus: (id, status) => api.post(`/laboratory/queue/${id}/status`, { status }),
  // payload: { title?, category?, results?, remarks? }
  complete: (id, payload = {}, opts = {}) => api.post(`/laboratory/queue/${id}/complete`, payload, opts),
  // Upload a report by card number — { cardNo, title?, pdfName?, pdfData? }
  uploadReport: (payload) => api.post('/laboratory/reports/upload', payload),

  // Test catalog
  listTests: (params = {}) => api.get(`/laboratory/tests${qs(params)}`),
  getTest: (id) => api.get(`/laboratory/tests/${id}`),
  addTest: (payload) => api.post('/laboratory/tests', payload),
  updateTest: (id, payload) => api.patch(`/laboratory/tests/${id}`, payload),
  deleteTest: (id) => api.delete(`/laboratory/tests/${id}`),

  // Inventory
  listInventory: (params = {}) => api.get(`/laboratory/inventory${qs(params)}`),
  addItem: (payload) => api.post('/laboratory/inventory', payload),
  updateItem: (id, payload) => api.patch(`/laboratory/inventory/${id}`, payload),
  addStock: (id, add) => api.post(`/laboratory/inventory/${id}/stock`, { add }),
  deleteItem: (id) => api.delete(`/laboratory/inventory/${id}`),

  // Requisitions + report to admin
  createRequisition: (payload) => api.post('/laboratory/requisitions', payload),
  myRequisitions: () => api.get('/laboratory/requisitions'),
  reportToAdmin: (message) => api.post('/laboratory/report', { message }),

  // Profile (role-neutral auth settings are also available)
  getProfile: () => api.get('/laboratory/profile'),
  updateProfile: (payload) => api.patch('/laboratory/profile', payload),

  // Notifications (role-neutral staff bell)
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id) => api.post(`/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => api.post('/notifications/read-all', {}),

  // Account (role-neutral auth settings)
  changePassword: (currentPassword, newPassword) => api.post('/auth/settings/password', { currentPassword, newPassword }),
  updateProfilePic: (profilePic) => api.patch('/auth/settings/profile-pic', { profilePic }),
};

export default laboratoryService;
