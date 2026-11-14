// Medicine Reminders — user-set custom reminders.
//
// These are PERSONAL, device-local reminders the patient sets themselves (e.g.
// for a medicine not on a SehatLine prescription, or a personal schedule). They
// fire as local scheduled notifications every day at the chosen time(s) — no
// push server needed. (The prescription-driven morning/afternoon/evening
// reminders are handled separately on the backend.)
//
// Reminders + their scheduled-notification ids are stored in AsyncStorage so
// they survive restarts and can be cancelled when deleted.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../context/ThemeContext';
import { showConfirm, showInfo } from '../../../components/confirm';
import {
  setupNotifications, scheduleDailyReminder, cancelReminder,
} from '../../../services/notifications';

const STORAGE_KEY = 'med_reminders_v1';

// 24h hour/minute → "8:05 AM"
const fmtTime = (hour, minute) => {
  const p = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, '0')} ${p}`;
};

const MedsReminderConfig = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useMinLoading(true);

  // Add-reminder modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [medicine, setMedicine] = useState('');
  const [dose, setDose] = useState('');
  const [draftTimes, setDraftTimes] = useState([]); // [{ hour, minute }]
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load / persist ────────────────────────────────────────────────
  useEffect(() => {
    setupNotifications(); // ensure notification permission is requested
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setReminders(raw ? JSON.parse(raw) : []);
      } catch (e) { setReminders([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setReminders(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
  }, []);

  // ── Add-reminder modal ────────────────────────────────────────────
  const openModal = () => {
    setMedicine(''); setDose(''); setDraftTimes([]);
    setModalVisible(true);
  };

  // iOS: the spinner fires onChange on EVERY wheel tick, so closing on the
  // first event added a half-scrolled time. Keep it open and commit on "Done".
  const [iosPending, setIosPending] = useState(null);
  const commitTime = (selected) => {
    if (selected) {
      const hour = selected.getHours();
      const minute = selected.getMinutes();
      setDraftTimes((prev) => {
        if (prev.some((t) => t.hour === hour && t.minute === minute)) return prev; // dedupe
        return [...prev, { hour, minute }].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
      });
    }
  };
  const onPickTime = (event, selected) => {
    if (Platform.OS === 'ios') { if (selected) setIosPending(selected); return; }
    setShowPicker(false);
    if (event.type === 'set' && selected) commitTime(selected);
  };

  const removeDraftTime = (idx) => setDraftTimes((prev) => prev.filter((_, i) => i !== idx));

  const saveReminder = async () => {
    const name = medicine.trim();
    if (!name) { showInfo({ title: 'Medicine Required', message: 'Enter the medicine name.', icon: 'medkit' }); return; }
    if (draftTimes.length === 0) { showInfo({ title: 'Add a Time', message: 'Add at least one reminder time.', icon: 'time' }); return; }

    setSaving(true);
    try {
      const doseText = dose.trim();
      // Schedule one daily local notification per time; keep the ids to cancel later.
      const times = [];
      for (const t of draftTimes) {
        const notifId = await scheduleDailyReminder({
          title: `💊 ${name}`,
          body: doseText ? `Time to take ${name} (${doseText})` : `Time to take ${name}`,
          hour: t.hour,
          minute: t.minute,
        });
        times.push({ hour: t.hour, minute: t.minute, notifId: notifId || '' });
      }

      const next = [
        ...reminders,
        { id: `r-${Date.now()}`, medicine: name, dose: doseText, times },
      ];
      await persist(next);
      setModalVisible(false);
      showInfo({ title: 'Reminder Set', message: `You'll be reminded to take ${name} daily.`, icon: 'checkmark-circle' });
    } catch (e) {
      showInfo({ title: 'Error', message: 'Could not set the reminder. Please try again.', icon: 'alert-circle' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────
  const deleteReminder = (rem) => {
    showConfirm({
      title: 'Delete Reminder',
      message: `Stop the daily reminder for ${rem.medicine}?`,
      confirmLabel: 'Delete', destructive: true, icon: 'trash-outline',
      onConfirm: async () => {
        // Cancel every scheduled notification tied to this reminder.
        for (const t of rem.times || []) { if (t.notifId) await cancelReminder(t.notifId); }
        await persist(reminders.filter((r) => r.id !== rem.id));
      },
    });
  };

  const timesLabel = (times) => (times || []).map((t) => fmtTime(t.hour, t.minute)).join('  •  ');

  return (
    <View style={styles.container}>
      <CustomHeader title="Medicine Reminders" navigation={navigation} />

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Active Reminders</Text>
          <Text style={styles.subtitle}>
            Daily reminders that alert you at the times you choose — even when the app is closed.
          </Text>

          {reminders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="alarm-outline" size={54} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>No reminders yet</Text>
              <Text style={styles.emptyText}>Tap “Add New Reminder” to set your first medicine alert.</Text>
            </View>
          ) : (
            reminders.map((rem) => (
              <View key={rem.id} style={styles.reminderCard}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="medkit" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.medicine}>{rem.medicine}</Text>
                  {!!rem.dose && <Text style={styles.dose}>{rem.dose}</Text>}
                  <View style={styles.timesRow}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.time}>{timesLabel(rem.times)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteReminder(rem)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addButton} onPress={openModal} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add New Reminder</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add-reminder modal */}
      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} overlayStyle={styles.modalOverlay} sheetStyle={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Medicine</Text>
            <TextInput
              style={styles.input} value={medicine} onChangeText={setMedicine}
              placeholder="e.g. Amoxicillin" placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Dose (optional)</Text>
            <TextInput
              style={styles.input} value={dose} onChangeText={setDose}
              placeholder="e.g. 1 tablet" placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Reminder Times</Text>
            <View style={styles.timeChips}>
              {draftTimes.map((t, idx) => (
                <View key={`${t.hour}-${t.minute}`} style={styles.timeChip}>
                  <Text style={styles.timeChipText}>{fmtTime(t.hour, t.minute)}</Text>
                  <TouchableOpacity onPress={() => removeDraftTime(idx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTimeChip} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addTimeText}>Add time</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickTime}
              />
            )}
            {showPicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.addTimeChip, { alignSelf: 'flex-end', marginBottom: 8 }]}
                onPress={() => { commitTime(iosPending || new Date()); setIosPending(null); setShowPicker(false); }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.addTimeText}>Done</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveReminder} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="notifications" size={18} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>Set Reminder</Text>
                </>
              )}
            </TouchableOpacity>
      </BottomSheet>
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, marginBottom: 20, lineHeight: 19 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },

  reminderCard: {
    backgroundColor: COLORS.card, padding: 16, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: COLORS.border || '#E5E7EB',
  },
  reminderIcon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  reminderInfo: { marginLeft: 14, flex: 1 },
  medicine: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  dose: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  time: { fontSize: 13, color: COLORS.primary, fontWeight: '700', flexShrink: 1 },

  addButton: {
    backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, padding: 15, borderRadius: 14, marginTop: 18,
  },
  addButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: 34,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 7, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.primary + '40', borderRadius: 12, paddingHorizontal: 13,
    paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.backgroundSecondary,
  },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary + '12',
    borderRadius: 20, paddingLeft: 12, paddingRight: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.primary + '35',
  },
  timeChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  addTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary + '55',
  },
  addTimeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  saveBtn: {
    backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 24,
  },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});

export default MedsReminderConfig;
