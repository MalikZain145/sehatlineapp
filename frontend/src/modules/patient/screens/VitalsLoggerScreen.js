// VitalsLoggerScreen — the patient's health tracker.
//
// Redesigned to match the app (ScreenHeader, teal/mint cards). Three parts:
//   1) A local health analysis (score + per-metric status & trend + plain
//      insights) computed entirely on the backend with rule-based math —
//      NO external API. This is the "AI-style" tracking of where the
//      patient's health is heading.
//   2) A history of every reading, grouped by day, each deletable.
//   3) "Create a New Vital" → a sheet where every field is optional (a
//      patient logs only what applies). Multiple readings per day allowed.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import FadeInView from '../../../components/ui/FadeInView';
import useBottomInset from '../../../hooks/useBottomInset';
import vitalsService from '../services/vitalsService';

// Status → colour used by pills and rings.
import { useTheme } from "../../../context/ThemeContext";
import { COLORS } from "../../../theme"; // static brand palette for module-scope maps; components shadow it via useTheme()
const STATUS_COLOR = {
  normal: COLORS.success,
  elevated: COLORS.warning,
  low: '#3B82F6',
  high: COLORS.danger,
  critical: COLORS.danger
};
const STATUS_LABEL = {
  normal: 'Normal',
  elevated: 'Elevated',
  low: 'Low',
  high: 'High',
  critical: 'Critical'
};

// The fields the create sheet offers. All optional.
const SUGAR_TYPES = [{
  key: 'fasting',
  label: 'Fasting'
}, {
  key: 'random',
  label: 'Random'
}, {
  key: 'post_meal',
  label: 'Post-meal'
}];
export default function VitalsLoggerScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });

  // Create form (all strings; blank = not recorded).
  const empty = {
    systolic: '',
    diastolic: '',
    heartRate: '',
    bloodSugar: '',
    bloodSugarType: 'fasting',
    temperature: '',
    spo2: '',
    respiratoryRate: '',
    weight: '',
    notes: ''
  };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const closePrompt = () => setPrompt({
    visible: false
  });
  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([vitalsService.getAnalysis(), vitalsService.list()]);
      setAnalysis(a?.analysis || null);
      setVitals(l?.vitals || []);
    } catch (e) {/* offline */} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  };
  const onlyNum = v => v.replace(/[^0-9.]/g, '');
  const save = async () => {
    // Build a payload of just the filled numeric fields.
    const payload = {};
    ['systolic', 'diastolic', 'heartRate', 'bloodSugar', 'temperature', 'spo2', 'respiratoryRate', 'weight'].forEach(k => {
      if (String(form[k]).trim() !== '') payload[k] = form[k];
    });
    if (payload.bloodSugar != null) payload.bloodSugarType = form.bloodSugarType;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    // Everything is optional — only block a totally empty save.
    if (Object.keys(payload).length === 0) {
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: 'alert-circle',
        title: 'Nothing to Save',
        message: 'Enter at least one reading or a note.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
      return;
    }
    setBusy(true);
    try {
      await vitalsService.create(payload);
      setShowSheet(false);
      setForm(empty);
      await load();
      setPrompt({
        visible: true,
        variant: 'success',
        icon: 'checkmark-circle',
        title: 'Vitals Saved',
        message: 'Your reading has been recorded and your analysis updated.',
        primaryLabel: 'Done',
        onPrimary: closePrompt
      });
    } catch (e) {
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: 'alert-circle',
        title: 'Could Not Save',
        message: e.message || 'Please try again.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = v => {
    setPrompt({
      visible: true,
      variant: 'warning',
      icon: 'trash',
      title: 'Delete Reading?',
      message: 'This reading will be removed from your history and analysis.',
      destructive: true,
      primaryLabel: 'Delete',
      onPrimary: async () => {
        closePrompt();
        try {
          await vitalsService.remove(v._id);
          await load();
        } catch (e) {}
      },
      secondaryLabel: 'Cancel',
      onSecondary: closePrompt
    });
  };

  // Turn a stored vital into display chips for the history list.
  const readingChips = v => {
    const c = [];
    if (v.systolic != null && v.diastolic != null) c.push({
      icon: 'heart',
      text: `${v.systolic}/${v.diastolic} mmHg`
    });
    if (v.heartRate != null) c.push({
      icon: 'pulse',
      text: `${v.heartRate} bpm`
    });
    if (v.bloodSugar != null) c.push({
      icon: 'water',
      text: `${v.bloodSugar} mg/dL${v.bloodSugarType ? ` (${v.bloodSugarType})` : ''}`
    });
    if (v.temperature != null) c.push({
      icon: 'thermometer',
      text: `${v.temperature} °F`
    });
    if (v.spo2 != null) c.push({
      icon: 'fitness',
      text: `${v.spo2}% SpO₂`
    });
    if (v.respiratoryRate != null) c.push({
      icon: 'cloud',
      text: `${v.respiratoryRate}/min`
    });
    if (v.weight != null) c.push({
      icon: 'scale',
      text: `${v.weight} kg`
    });
    return c;
  };
  const fmtDate = iso => {
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    const days = Math.round((today - dd) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };
  const fmtTime = iso => new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  // Group history by day label.
  const grouped = vitals.reduce((acc, v) => {
    const key = fmtDate(v.recordedAt);
    (acc[key] = acc[key] || []).push(v);
    return acc;
  }, {});
  const trendIcon = t => t === 'rising' ? 'trending-up' : t === 'falling' ? 'trending-down' : 'remove';
  return <View style={styles.container}>
      <ScreenHeader title="My Vitals" subtitle="Track your health" onBack={() => navigation.goBack()} right={<TouchableOpacity onPress={() => setShowSheet(true)} hitSlop={{
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    }}>
            <Ionicons name="add-circle" size={26} color={COLORS.primary} />
          </TouchableOpacity>} />

      {loading ? <SkeletonList count={5} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 90
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
          {!analysis || !analysis.hasData ? <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="pulse" size={34} color={COLORS.primary} /></View>
              <Text style={styles.emptyTitle}>Start tracking your health</Text>
              <Text style={styles.emptySub}>Log your first reading — blood pressure, sugar, heart rate, whatever applies to you. Your health analysis appears here.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowSheet(true)} activeOpacity={0.9}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyBtnText}>Create a New Vital</Text>
              </TouchableOpacity>
            </View> : <>
              {/* Health score */}
              <FadeInView delay={40}>
                <LinearGradient colors={[COLORS.primary, COLORS.tealDark]} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} style={styles.scoreCard}>
                  <View style={styles.scoreLeft}>
                    <Text style={styles.scoreLabel}>HEALTH SCORE</Text>
                    <Text style={styles.scoreValue}>{analysis.score}<Text style={styles.scoreOutOf}>/100</Text></Text>
                    <Text style={styles.scoreRating}>{analysis.rating}</Text>
                  </View>
                  <View style={styles.scoreRight}>
                    <Ionicons name="analytics" size={26} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.scoreMeta}>{analysis.totalReadings} reading{analysis.totalReadings === 1 ? '' : 's'}</Text>
                  </View>
                </LinearGradient>
              </FadeInView>

              {/* Insights */}
              {analysis.insights?.length > 0 && <FadeInView delay={70}>
                  <View style={styles.insightsWrap}>
                    {analysis.insights.map((ins, i) => {
              const color = ins.severity === 'bad' ? COLORS.danger : ins.severity === 'warn' ? COLORS.warning : COLORS.success;
              const icon = ins.severity === 'bad' ? 'alert-circle' : ins.severity === 'warn' ? 'warning' : 'checkmark-circle';
              return <View key={i} style={[styles.insight, {
                borderLeftColor: color
              }]}>
                          <Ionicons name={icon} size={18} color={color} />
                          <Text style={styles.insightText}>{ins.text}</Text>
                        </View>;
            })}
                  </View>
                </FadeInView>}

              {/* Metric cards */}
              <FadeInView delay={100}>
                <Text style={styles.sectionTitle}>Your Metrics</Text>
                <View style={styles.metricGrid}>
                  {analysis.metrics.map(m => {
              const color = STATUS_COLOR[m.status] || COLORS.textLight;
              const showStatus = m.key !== 'weight';
              return <View key={m.key} style={styles.metricCard}>
                        <View style={styles.metricTop}>
                          <View style={[styles.metricIcon, {
                    backgroundColor: color + '18'
                  }]}>
                            <Ionicons name={m.icon} size={16} color={color} />
                          </View>
                          {m.trend && m.count > 1 && <View style={styles.trendPill}>
                              <Ionicons name={trendIcon(m.trend)} size={12} color={m.concerningTrend ? COLORS.danger : COLORS.textLight} />
                            </View>}
                        </View>
                        <Text style={styles.metricValue}>{m.display}</Text>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                        {showStatus && <View style={[styles.statusPill, {
                  backgroundColor: color + '18'
                }]}>
                            <Text style={[styles.statusText, {
                    color
                  }]}>{STATUS_LABEL[m.status] || m.status}</Text>
                          </View>}
                      </View>;
            })}
                </View>
              </FadeInView>

              {/* History */}
              <FadeInView delay={130}>
                <Text style={styles.sectionTitle}>History</Text>
                {Object.keys(grouped).map(day => <View key={day} style={{
            marginBottom: 8
          }}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    {grouped[day].map(v => <View key={v._id} style={styles.histCard}>
                        <View style={styles.histHeader}>
                          <Text style={styles.histTime}>{fmtTime(v.recordedAt)}</Text>
                          <TouchableOpacity onPress={() => confirmDelete(v)} hitSlop={{
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8
                }}>
                            <Ionicons name="trash-outline" size={16} color={COLORS.textLight} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.chipRow}>
                          {readingChips(v).map((c, i) => <View key={i} style={styles.readChip}>
                              <Ionicons name={c.icon} size={12} color={COLORS.primary} />
                              <Text style={styles.readChipText}>{c.text}</Text>
                            </View>)}
                        </View>
                        {!!v.notes && <Text style={styles.histNotes}>{v.notes}</Text>}
                      </View>)}
                  </View>)}
              </FadeInView>
            </>}
        </ScrollView>}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, {
      bottom: bottomInset + 20
    }]} onPress={() => setShowSheet(true)} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color="#FFF" />
        <Text style={styles.fabText}>New Vital</Text>
      </TouchableOpacity>

      {/* Create sheet */}
      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>New Vital Reading</Text>
              <Text style={styles.sheetSub}>Fill only what applies — everything is optional. Saved with today's date &amp; time.</Text>

              {/* Blood pressure */}
              <Text style={styles.fieldLabel}>Blood Pressure (mmHg)</Text>
              <View style={styles.row2}>
                <TextInput style={[styles.input, {
                flex: 1
              }]} placeholder="Systolic (120)" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.systolic} onChangeText={t => set('systolic', onlyNum(t))} />
                <Text style={styles.slash}>/</Text>
                <TextInput style={[styles.input, {
                flex: 1
              }]} placeholder="Diastolic (80)" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.diastolic} onChangeText={t => set('diastolic', onlyNum(t))} />
              </View>

              {/* Heart rate + Temp */}
              <View style={styles.row2}>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Heart Rate (bpm)</Text>
                  <TextInput style={styles.input} placeholder="74" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.heartRate} onChangeText={t => set('heartRate', onlyNum(t))} />
                </View>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Temperature (°F)</Text>
                  <TextInput style={styles.input} placeholder="98.6" placeholderTextColor={COLORS.textLight} keyboardType="decimal-pad" value={form.temperature} onChangeText={t => set('temperature', onlyNum(t))} />
                </View>
              </View>

              {/* Blood sugar */}
              <Text style={styles.fieldLabel}>Blood Sugar (mg/dL)</Text>
              <TextInput style={styles.input} placeholder="110" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.bloodSugar} onChangeText={t => set('bloodSugar', onlyNum(t))} />
              <View style={styles.typeRow}>
                {SUGAR_TYPES.map(t => {
                const active = form.bloodSugarType === t.key;
                return <TouchableOpacity key={t.key} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => set('bloodSugarType', t.key)}>
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>;
              })}
              </View>

              {/* SpO2 + Respiratory */}
              <View style={styles.row2}>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Oxygen SpO₂ (%)</Text>
                  <TextInput style={styles.input} placeholder="98" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.spo2} onChangeText={t => set('spo2', onlyNum(t))} />
                </View>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Resp. Rate (/min)</Text>
                  <TextInput style={styles.input} placeholder="16" placeholderTextColor={COLORS.textLight} keyboardType="number-pad" value={form.respiratoryRate} onChangeText={t => set('respiratoryRate', onlyNum(t))} />
                </View>
              </View>

              {/* Weight */}
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput style={styles.input} placeholder="70" placeholderTextColor={COLORS.textLight} keyboardType="decimal-pad" value={form.weight} onChangeText={t => set('weight', onlyNum(t))} />

              {/* Notes */}
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput style={[styles.input, {
              height: 64,
              textAlignVertical: 'top'
            }]} placeholder="How are you feeling?" placeholderTextColor={COLORS.textLight} multiline value={form.notes} onChangeText={t => set('notes', t)} />

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetGhost} onPress={() => setShowSheet(false)}>
                  <Text style={styles.sheetGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetPrimary} onPress={save} disabled={busy}>
                  {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sheetPrimaryText}>Save Vital</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
      </BottomSheet>

      <ThemedPrompt {...prompt} />
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
  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 10
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 10
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 22
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  // Score
  scoreCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  scoreLeft: {},
  scoreLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  scoreValue: {
    color: '#FFF',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 4
  },
  scoreOutOf: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)'
  },
  scoreRating: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  scoreRight: {
    alignItems: 'center',
    gap: 6
  },
  scoreMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600'
  },
  // Insights
  insightsWrap: {
    marginTop: 16,
    gap: 8
  },
  insight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  insightText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12
  },
  // Metric cards
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  trendPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 10
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '600'
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    marginTop: 8
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  // History
  dayLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4
  },
  histCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 10
  },
  histHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  histTime: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.text
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  readChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.mintLightest,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  readChipText: {
    fontSize: 11.5,
    color: COLORS.text,
    fontWeight: '600'
  },
  histNotes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic'
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 13,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 5
        },
        shadowOpacity: 0.4,
        shadowRadius: 10
      },
      android: {
        elevation: 6
      }
    })
  },
  fabText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '90%'
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text
  },
  sheetSub: {
    fontSize: 12.5,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 6
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 14,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  slash: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textLight
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  typeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  typeChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  typeChipTextActive: {
    color: '#FFF'
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22
  },
  sheetGhost: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center'
  },
  sheetGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  sheetPrimary: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary
  },
  sheetPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF'
  }
});