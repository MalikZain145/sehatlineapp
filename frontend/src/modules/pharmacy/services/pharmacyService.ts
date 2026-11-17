// Pharmacy API — talks to the SehatLine backend (/api/pharmacy).
// Replaces the module's dummy PharmacyContext data with real endpoints.

import { api } from '../../../services/apiClient';

const pharmacyService = {
  // Dashboard + queue
  getDashboard: () => api.get('/pharmacy/dashboard'),
  getQueue: () => api.get('/pharmacy/queue'),
  getCompleted: (range: 'today' | 'all' = 'all') => api.get(`/pharmacy/completed?range=${range}`),
  getAnalytics: () => api.get('/pharmacy/analytics'),
  getPrescription: (id: string) => api.get(`/pharmacy/prescriptions/${id}`),
  prepare: (id: string) => api.post(`/pharmacy/prescriptions/${id}/prepare`, {}),
  // No counter passed — the backend uses the serving pharmacist's own counter.
  markReady: (id: string) => api.post(`/pharmacy/prescriptions/${id}/ready`, {}),
  complete: (id: string) => api.post(`/pharmacy/prescriptions/${id}/complete`, {}),

  // Loan Prescription (only when out of stock)
  createLP: (id: string) => api.post(`/pharmacy/prescriptions/${id}/lp`, {}),
  listLP: () => api.get('/pharmacy/lp'),

  // Inventory
  listInventory: (params: { q?: string; status?: string } = {}) => {
    const clean: Record<string, string> = {};
    if (params.q) clean.q = params.q;
    if (params.status && params.status !== 'All') clean.status = params.status;
    const qs = new URLSearchParams(clean).toString();
    return api.get(`/pharmacy/inventory${qs ? `?${qs}` : ''}`);
  },
  addMedicine: (payload: any) => api.post('/pharmacy/inventory', payload),
  updateMedicine: (id: string, payload: any) => api.patch(`/pharmacy/inventory/${id}`, payload),
  deleteMedicine: (id: string) => api.delete(`/pharmacy/inventory/${id}`),

  // Report to admin
  reportToAdmin: (message: string) => api.post('/pharmacy/report', { message }),

  // My notifications (admin announcements land here — role-neutral endpoint)
  getMyNotifications: () => api.get('/notifications'),
  markNotificationRead: (id: string) => api.post(`/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => api.post('/notifications/read-all', {}),

  // Daily Excel backup
  createBackup: (date?: string) => api.post('/pharmacy/backup', date ? { date } : {}),
  listBackups: () => api.get('/pharmacy/backup'),

  // Profile
  getProfile: () => api.get('/pharmacy/profile'),
  updateProfile: (payload: any) => api.patch('/pharmacy/profile', payload),

  // Requisition to admin
  createRequisition: (items: any[], note?: string) => api.post('/pharmacy/requisitions', { items, note }),
  myRequisitions: () => api.get('/pharmacy/requisitions'),
};

export default pharmacyService;
