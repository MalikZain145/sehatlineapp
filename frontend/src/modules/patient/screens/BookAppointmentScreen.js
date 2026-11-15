// BookAppointmentScreen — specialist appointment booking.
//
// Redesigned to match the rest of the app (ScreenHeader, teal/mint cards,
// sticky action bar, ThemedPrompt) so it feels like one product with the
// Chronic OPD screen. The flow:
//   1) Pick a doctor (list from the DB, with their real available days).
//   2) Pick a date (horizontal strip; days the doctor doesn't sit are off).
//   3) Pick a time (that doctor's free slots for the date, from the backend).
//   4) Optional visit type → Book.
//
// No 30-day rule here (that's chronic-only). Appointments are a plain queue —
// no pharmacy/lab/medicine afterwards.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import FadeInView from '../../../components/ui/FadeInView';
import useBottomInset from '../../../hooks/useBottomInset';
import appointmentService from '../services/appointmentService';
import feedbackService from '../services/feedbackService';
import DoctorFeedbackModal from '../../../components/ui/DoctorFeedbackModal';
import { useTheme } from "../../../context/ThemeContext";
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VISIT_TYPES = ['Routine Check-up', 'Follow-up', 'Medication Review', 'Test Results Review', 'Post-Surgery'];
const toDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const label12 = t24 => {
  const [h, m] = String(t24).split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
};
export default function BookAppointmentScreen({
  navigation,
  route
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  // Reschedule mode: when opened with a rescheduleId, this screen MOVES an
  // existing booked appointment (new date/time and optionally a new doctor)
  // instead of creating a new one. Used by the "Reschedule Appointment?" link
  // on the live queue screen.
  const rescheduleId = route?.params?.rescheduleId || null;
  const currentLabel = route?.params?.currentLabel || '';
  const isReschedule = !!rescheduleId;
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [selectedTime, setSelectedTime] = useState(''); // 24h 'HH:mm'
  const [visitType, setVisitType] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dayAvailable, setDayAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });

  // Next 30 days as Date objects (today first).
  const upcoming = React.useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({
      length: 30
    }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);
  const loadDoctors = useCallback(async () => {
    try {
      const res = await appointmentService.getDoctors();
      const list = (res?.doctors || []).map(d => ({
        id: d.doctorId,
        name: d.name,
        specialization: d.specialization,
        room: d.room,
        availableDays: d.availableDays || [],
        slots: d.slots || []
      }));
      setDoctors(list);
    } catch (e) {/* offline */} finally {
      setLoadingDoctors(false);
    }
  }, []);
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Mandatory doctor feedback for the last visit before booking a new one.
  const [pendingVisit, setPendingVisit] = useState(null);
  const loadPending = useCallback(async () => {
    // In reschedule mode we must not gate on prior-visit feedback — this screen
    // is the escape hatch from a locked queue, so it has to stay unblocked.
    if (isReschedule) return;
    try {
      const fb = await feedbackService.getPending();
      setPendingVisit(fb?.pending ? fb.visit : null);
    } catch (e) {/* offline */}
  }, [isReschedule]);
  useEffect(() => {
    loadPending();
    const focus = navigation.addListener?.('focus', loadPending);
    return () => {
      focus && focus();
    };
  }, [loadPending, navigation]);

  // When a doctor is chosen, auto-select their first upcoming available day.
  const pickDoctor = doc => {
    setSelectedDoctor(doc);
    setSelectedTime('');
    const firstDay = upcoming.find(d => doc.availableDays.includes(DOW[d.getDay()]));
    setSelectedDate(firstDay || null);
  };

  // Fetch that doctor's free slots whenever doctor/date changes.
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      return;
    }
    let active = true;
    (async () => {
      setSlotsLoading(true);
      setSelectedTime('');
      try {
        const res = await appointmentService.getSlots(toDateStr(selectedDate), selectedDoctor.id);
        if (!active) return;
        setSlots(res?.slots || []);
        setDayAvailable(res?.dayAvailable !== false);
      } catch (e) {
        if (active) {
          setSlots([]);
          setDayAvailable(true);
        }
      } finally {
        if (active) setSlotsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedDoctor, selectedDate]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDoctors();
    setTimeout(() => setRefreshing(false), 400);
  };
  const passedToday = t24 => {
    const now = new Date();
    if (!selectedDate || toDateStr(selectedDate) !== toDateStr(now)) return false;
    const [h, m] = String(t24).split(':').map(Number);
    const slot = new Date(now);
    slot.setHours(h, m, 0, 0);
    return slot <= now;
  };
  const book = async () => {
    if (!selectedDoctor) return info('Select a Doctor', 'Please choose a doctor first.');
    if (!selectedDate) return info('Select a Date', 'Please choose an available date.');
    if (!selectedTime) return info('Select a Time', 'Please choose a time slot.');
    setBusy(true);
    try {
      const dateStr = toDateStr(selectedDate);
      const res = isReschedule
        ? await appointmentService.reschedule(rescheduleId, {
            date: dateStr,
            time: selectedTime,
            doctorId: selectedDoctor.id
          })
        : await appointmentService.book({
            date: dateStr,
            time: selectedTime,
            doctorId: selectedDoctor.id,
            reason: visitType || 'Consultation'
          });
      if (res?.appointment) {
        const dLabel = `${DOW[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MON[selectedDate.getMonth()]}`;
        setPrompt({
          visible: true,
          variant: 'success',
          icon: 'checkmark-circle',
          title: isReschedule ? 'Appointment Rescheduled' : 'Appointment Confirmed',
          message: `${selectedDoctor.name}\n${dLabel} at ${label12(selectedTime)}`,
          primaryLabel: 'View Appointment',
          onPrimary: () => {
            closePrompt();
            // After a reschedule the old slot is no longer "active", so leave
            // the locked queue screen and land on the appointments list.
            // Keep Home UNDER the list so the back button works. (index 0 /
            // a single route left nothing to go back to — on iOS, which has no
            // hardware back key, users were stuck on "My Appointments".)
            navigation.reset({
              index: 1,
              routes: [{ name: 'HomeScreen' }, { name: 'AppointmentListScreen' }]
            });
          }
        });
        setSelectedTime('');
      } else {
        info(isReschedule ? 'Reschedule Failed' : 'Booking Failed', res?.message || 'Could not update appointment.');
      }
    } catch (e) {
      info(isReschedule ? 'Cannot Reschedule' : 'Cannot Book', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const info = (title, message) => setPrompt({
    visible: true,
    variant: 'warning',
    icon: 'alert-circle',
    title,
    message,
    primaryLabel: 'OK',
    onPrimary: closePrompt
  });
  const canBook = selectedDoctor && selectedDate && selectedTime;
  return <View style={styles.container}>
      <ScreenHeader title={isReschedule ? 'Reschedule Appointment' : 'Book Appointment'} subtitle={isReschedule ? 'Pick a new doctor, date & time' : 'See a specialist'} onBack={() => navigation.goBack()} />

      {loadingDoctors ? <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 30
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
          {/* Current slot banner (reschedule mode) */}
          {isReschedule && !!currentLabel && <FadeInView delay={20}>
            <View style={styles.currentBanner}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={styles.currentBannerText}>Current: {currentLabel}. Choose a new slot below to move it.</Text>
            </View>
          </FadeInView>}

          {/* Step 1 — Doctor */}
          <FadeInView delay={40}>
            <Text style={styles.stepTitle}>Choose a doctor</Text>
            {doctors.length === 0 ? <Text style={styles.hint}>No doctors available right now. Pull to refresh.</Text> : doctors.map(doc => {
          const active = selectedDoctor?.id === doc.id;
          return <TouchableOpacity key={doc.id} style={[styles.docCard, active && styles.docCardActive]} onPress={() => pickDoctor(doc)} activeOpacity={0.85}>
                    <View style={[styles.docAvatar, active && styles.docAvatarActive]}>
                      <Ionicons name="person" size={22} color={active ? '#FFF' : COLORS.primary} />
                    </View>
                    <View style={{
              flex: 1
            }}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <Text style={styles.docSpec}>{doc.specialization}{doc.room ? ` • ${doc.room}` : ''}</Text>
                      {doc.availableDays?.length > 0 && <Text style={styles.docDays}>{doc.availableDays.join(' · ')}</Text>}
                    </View>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>;
        })}
          </FadeInView>

          {/* Step 2 — Date. Only the doctor's OWN working days are shown, so if a
              doctor sits Mon & Thu the patient sees only every upcoming Mon/Thu. */}
          {selectedDoctor && (() => {
            const days = selectedDoctor.availableDays || [];
            const doctorDates = upcoming.filter(d => days.includes(DOW[d.getDay()]));
            return <FadeInView delay={40}>
              <Text style={styles.stepTitle}>Pick a date</Text>
              {days.length > 0 && <Text style={styles.stepHint}>{selectedDoctor.name} sits on {days.join(' · ')}</Text>}
              {doctorDates.length === 0 ? (
                <Text style={styles.hint}>This doctor has no working days set yet. Please check back later.</Text>
              ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                {doctorDates.map(d => {
            const active = selectedDate && toDateStr(selectedDate) === toDateStr(d);
            return <TouchableOpacity key={toDateStr(d)} style={[styles.dateCell, active && styles.dateCellActive]} onPress={() => setSelectedDate(d)} activeOpacity={0.85}>
                      <Text style={[styles.dateDow, active && styles.dateTextActive]}>{DOW[d.getDay()]}</Text>
                      <Text style={[styles.dateNum, active && styles.dateTextActive]}>{d.getDate()}</Text>
                      <Text style={[styles.dateMon, active && styles.dateTextActive]}>{MON[d.getMonth()]}</Text>
                    </TouchableOpacity>;
          })}
              </ScrollView>
              )}
            </FadeInView>;
          })()}

          {/* Step 3 — Time */}
          {selectedDoctor && selectedDate && <FadeInView delay={40}>
              <Text style={styles.stepTitle}>Pick a time</Text>
              {slotsLoading ? <ActivityIndicator color={COLORS.primary} style={{
          alignSelf: 'flex-start',
          marginVertical: 10
        }} /> : !dayAvailable ? <Text style={styles.hint}>{selectedDoctor.name} does not sit on {DOW[selectedDate.getDay()]}. Pick another day.</Text> : slots.length === 0 ? <Text style={styles.hint}>No slots for this day.</Text> : <View style={styles.slotWrap}>
                  {slots.map(s => {
            const disabled = !s.available || passedToday(s.time);
            const active = selectedTime === s.time;
            return <TouchableOpacity key={s.time} style={[styles.slot, active && styles.slotActive, disabled && styles.slotOff]} onPress={() => !disabled && setSelectedTime(s.time)} disabled={disabled}>
                        <Text style={[styles.slotText, active && styles.slotTextActive, disabled && styles.slotTextOff]}>
                          {label12(s.time)}
                        </Text>
                      </TouchableOpacity>;
          })}
                </View>}
            </FadeInView>}

          {/* Step 4 — Visit type (optional) */}
          {canBook && <FadeInView delay={40}>
              <Text style={styles.stepTitle}>Visit type <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.slotWrap}>
                {VISIT_TYPES.map(v => {
            const active = visitType === v;
            return <TouchableOpacity key={v} style={[styles.vChip, active && styles.vChipActive]} onPress={() => setVisitType(active ? '' : v)}>
                      <Text style={[styles.vChipText, active && styles.vChipTextActive]}>{v}</Text>
                    </TouchableOpacity>;
          })}
              </View>
            </FadeInView>}
        </ScrollView>}

      {/* Sticky action bar */}
      <View style={[styles.bar, {
      paddingBottom: bottomInset + 12
    }]}>
        <TouchableOpacity style={[styles.bookBtn, !canBook && styles.bookBtnMuted]} onPress={book} disabled={busy || !canBook} activeOpacity={0.9}>
          {busy ? <ActivityIndicator color="#FFF" /> : <>
              <Ionicons name="calendar" size={18} color="#FFF" />
              <Text style={styles.bookBtnText}>
                {!selectedDoctor ? 'Select a doctor' : !selectedTime ? 'Select a time' : isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}
              </Text>
            </>}
        </TouchableOpacity>
      </View>

      <ThemedPrompt {...prompt} />

      {/* Mandatory: rate the previous doctor visit before booking again. */}
      <DoctorFeedbackModal visible={!!pendingVisit} visit={pendingVisit} onDone={() => {
      setPendingVisit(null);
      loadPending();
    }} />
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary + '14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    padding: 12,
    marginTop: 6
  },
  currentBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 17
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 12
  },
  stepHint: {
    fontSize: 12.5,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: -6,
    marginBottom: 10
  },
  optional: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight
  },
  hint: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4
  },
  // Doctor cards
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12
  },
  docCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '18'
  },
  docAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center'
  },
  docAvatarActive: {
    backgroundColor: COLORS.primary
  },
  docName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text
  },
  docSpec: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  docDays: {
    fontSize: 11.5,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600'
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  // Date strip
  dateStrip: {
    gap: 10,
    paddingVertical: 2
  },
  dateCell: {
    width: 58,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  dateCellActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  dateCellOff: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.borderLight,
    opacity: 0.5
  },
  dateDow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight
  },
  dateNum: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    marginVertical: 2
  },
  dateMon: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textLight
  },
  dateTextActive: {
    color: '#FFF'
  },
  dateTextOff: {
    color: COLORS.textLight
  },
  // Time slots + visit chips
  slotWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  slot: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  slotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  slotOff: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.borderLight,
    opacity: 0.5
  },
  slotText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  slotTextActive: {
    color: '#FFF'
  },
  slotTextOff: {
    color: COLORS.textLight
  },
  vChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  vChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  vChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  vChipTextActive: {
    color: '#FFF'
  },
  // Action bar
  bar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15
  },
  bookBtnMuted: {
    backgroundColor: COLORS.tealLight
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  }
});