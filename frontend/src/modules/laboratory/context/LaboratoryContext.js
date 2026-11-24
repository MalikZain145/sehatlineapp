// LaboratoryContext — now backed by the real SehatLine backend
// (/api/laboratory) instead of dummy in-memory data. The public surface is
// unchanged so the screens keep working; the mutations call the API and refresh.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import laboratoryService from '../services/laboratoryService';
import { onQueueUpdate } from '../../../services/socket';

const LaboratoryContext = createContext(null);

export function LaboratoryProvider({ children }) {
  const [queuePatients, setQueuePatients] = useState([]);
  const [completedReports, setCompletedReports] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshQueue = useCallback(async () => {
    try { const res = await laboratoryService.getQueue(); setQueuePatients(res?.queue || []); } catch (e) { /* offline */ }
  }, []);

  const refreshCompleted = useCallback(async () => {
    try { const res = await laboratoryService.getCompleted(); setCompletedReports(res?.completedReports || []); } catch (e) { /* offline */ }
  }, []);

  const refreshInventory = useCallback(async () => {
    try { const res = await laboratoryService.listInventory(); setInventoryItems(res?.items || []); } catch (e) { /* offline */ }
  }, []);

  const refreshStats = useCallback(async () => {
    try { const res = await laboratoryService.getDashboard(); setStats(res?.stats || null); } catch (e) { /* offline */ }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshQueue(), refreshCompleted(), refreshInventory(), refreshStats()]);
    setLoading(false);
  }, [refreshQueue, refreshCompleted, refreshInventory, refreshStats]);

  useEffect(() => { refresh(); }, [refresh]);
  // Live lab queue: the backend emits 'queue:update' when the doctor/pharmacy
  // moves a patient on. On the hosted backend (no WebSocket) the subscription
  // polls instead, so new lab patients appear without a manual refresh.
  useEffect(() => {
    const off = onQueueUpdate(() => { refreshQueue(); refreshStats(); });
    return () => off && off();
  }, [refreshQueue, refreshStats]);

  /* ================= PATIENTS ================= */

  // newStatus is a label: 'Sample Collected' | 'Processing'.
  const updatePatientStatus = async (id, newStatus) => {
    // optimistic
    setQueuePatients((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    try { await laboratoryService.updateStatus(id, newStatus); await refreshQueue(); await refreshStats(); }
    catch (e) { await refreshQueue(); throw e; }
  };

  // Complete with an optional report payload ({ title, category, results, remarks }).
  const completePatient = async (id, payload = {}, opts = {}) => {
    try {
      const res = await laboratoryService.complete(id, payload, opts);
      await Promise.all([refreshQueue(), refreshCompleted(), refreshStats()]);
      return res;
    } catch (e) { await refreshQueue(); throw e; }
  };

  const pendingPatients = queuePatients.filter((p) => p.status !== 'Completed');

  /* ================= INVENTORY ================= */

  const addInventoryItem = async (newItem) => {
    try {
      await laboratoryService.addItem({
        name: newItem.name,
        category: newItem.category,
        quantity: Number(newItem.quantity) || 0,
        cartons: Number(newItem.cartons) || 0,
        unitsPerCarton: Number(newItem.unitsPerCarton) || 0,
        unit: newItem.unit,
        minimumStock: Number(newItem.minimumStock) || 0,
        expiryDate: newItem.expiryDate || newItem.expiry || '',
      });
      await refreshInventory();
    } catch (e) { throw e; }
  };

  const updateInventoryStock = async (itemId, quantityToAdd) => {
    try { await laboratoryService.addStock(itemId, Number(quantityToAdd) || 0); await refreshInventory(); }
    catch (e) { throw e; }
  };

  return (
    <LaboratoryContext.Provider
      value={{
        /* Patients */
        queuePatients,
        setQueuePatients,
        pendingPatients,
        updatePatientStatus,
        completePatient,

        /* Reports */
        completedReports,
        setCompletedReports,

        /* Inventory */
        inventoryItems,
        setInventoryItems,
        addInventoryItem,
        updateInventoryStock,

        /* Meta */
        stats,
        loading,
        refresh,
        refreshQueue,
        refreshCompleted,
        refreshInventory,
      }}
    >
      {children}
    </LaboratoryContext.Provider>
  );
}

export function useLaboratory() {
  const context = useContext(LaboratoryContext);
  if (!context) {
    throw new Error('useLaboratory must be used inside LaboratoryProvider');
  }
  return context;
}
