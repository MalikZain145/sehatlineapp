// DoctorFeedbackModal — a mandatory prompt shown before a patient books their
// next visit, asking how their LAST doctor visit went. Star rating + three
// yes/no accountability questions (harassment / bothered / extra charges) +
// notes. It can't be dismissed without submitting (accountability by design).
//
// Usage:
//   <DoctorFeedbackModal visible={!!pending} visit={pending} onDone={...} />

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import feedbackService from '../../modules/patient/services/feedbackService';

// Three yes/no questions. Default "No" (the good outcome).
import { useTheme } from "../../context/ThemeContext";
const QUESTIONS = [{
  key: 'harassed',
  label: 'Did the doctor harass you in any way?'
}, {
  key: 'bothered',
  label: 'Did the doctor bother or misbehave with you?'
}, {
  key: 'extraCharges',
  label: 'Did the doctor ask for extra / unofficial money?'
}];
export default function DoctorFeedbackModal({
  visible,
  visit,
  onDone
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState({
    harassed: false,
    bothered: false,
    extraCharges: false
  });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const setAns = (k, v) => setAnswers(a => ({
    ...a,
    [k]: v
  }));
  const submit = async () => {
    if (!visit) return;
    if (rating < 1) {
      setErr('Please tap the stars to rate your visit.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await feedbackService.submit({
        visitId: visit.visitId,
        visitType: visit.visitType,
        doctorId: visit.doctorId,
        doctorName: visit.doctorName,
        department: visit.department,
        rating,
        harassed: answers.harassed,
        bothered: answers.bothered,
        extraCharges: answers.extraCharges,
        notes: notes.trim()
      });
      // reset for next time
      setRating(0);
      setAnswers({
        harassed: false,
        bothered: false,
        extraCharges: false
      });
      setNotes('');
      onDone && onDone(true);
    } catch (e) {
      setErr(e.message || 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  if (!visit) return null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconWrap}><Ionicons name="chatbubbles" size={26} color={COLORS.primary} /></View>
            <Text style={styles.title}>How was your last visit?</Text>
            <Text style={styles.sub}>
              Before booking again, please rate your visit with{' '}
              <Text style={{
              fontWeight: '800',
              color: COLORS.text
            }}>{visit.doctorName}</Text>
              {visit.department ? ` (${visit.department})` : ''}. Your feedback is confidential.
            </Text>

            {/* Star rating */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => <TouchableOpacity key={n} onPress={() => {
              setRating(n);
              setErr('');
            }} hitSlop={{
              top: 6,
              bottom: 6,
              left: 4,
              right: 4
            }}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? '#F59E0B' : COLORS.border} />
                </TouchableOpacity>)}
            </View>

            {/* Yes/No accountability questions */}
            {QUESTIONS.map(q => <View key={q.key} style={styles.qRow}>
                <Text style={styles.qLabel}>{q.label}</Text>
                <View style={styles.toggle}>
                  <TouchableOpacity style={[styles.toggleBtn, !answers[q.key] && styles.toggleNo]} onPress={() => setAns(q.key, false)}>
                    <Text style={[styles.toggleText, !answers[q.key] && styles.toggleActiveText]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, answers[q.key] && styles.toggleYes]} onPress={() => setAns(q.key, true)}>
                    <Text style={[styles.toggleText, answers[q.key] && styles.toggleActiveText]}>Yes</Text>
                  </TouchableOpacity>
                </View>
              </View>)}

            {/* Notes */}
            <Text style={styles.notesLabel}>Additional notes (optional)</Text>
            <TextInput style={styles.notes} placeholder="Anything else you'd like to share…" placeholderTextColor={COLORS.textLight} value={notes} onChangeText={setNotes} multiline />

            {!!err && <Text style={styles.err}>{err}</Text>}

            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy} activeOpacity={0.9}>
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit Feedback</Text>}
            </TouchableOpacity>
            <Text style={styles.footNote}>This helps CDA Hospital keep care safe and fair for everyone.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>;
}
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
    maxHeight: '92%'
  },
  iconWrap: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center'
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 18
  },
  qRow: {
    marginTop: 14
  },
  qLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  toggle: {
    flexDirection: 'row',
    gap: 10
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  toggleNo: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success
  },
  toggleYes: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger
  },
  toggleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  toggleActiveText: {
    color: '#FFF'
  },
  notesLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 18,
    marginBottom: 8
  },
  notes: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card
  },
  err: {
    color: COLORS.danger,
    fontSize: 12.5,
    marginTop: 12,
    textAlign: 'center'
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  },
  footNote: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12
  }
});