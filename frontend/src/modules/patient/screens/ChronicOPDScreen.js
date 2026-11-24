// ChronicOPDScreen — the entry point for a Chronic OPD visit.
//
// The patient tells us their chronic illness; we show which doctor they'll
// see (illness → doctor mapping, admin-managed in future), explain the
// journey, and issue the token. The token then flows:
//   Doctor → Pharmacy → Laboratory (only if tests) → Done.
//
// A new chronic token is locked for 30 days after the last visit (medicines
// last a month). Within that window, if the last visit had lab tests, the
// patient may still take a FOLLOW-UP token — only to show reports to the
// doctor, with no medicine repeat.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import FadeInView from '../../../components/ui/FadeInView';
import useBottomInset from '../../../hooks/useBottomInset';
import tokenService from '../services/tokenService';
import feedbackService from '../services/feedbackService';
import DoctorFeedbackModal from '../../../components/ui/DoctorFeedbackModal';

// The journey a chronic token travels — shown up front so the patient knows
// what to expect before they even take a token.
import { useTheme } from "../../../context/ThemeContext";
const JOURNEY = [{
  icon: 'person',
  label: 'Doctor'
}, {
  icon: 'medkit',
  label: 'Pharmacy'
}, {
  icon: 'flask',
  label: 'Lab',
  note: 'if tests'
}, {
  icon: 'checkmark-done',
  label: 'Done'
}];
export default function ChronicOPDScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [lockedForDays, setLockedForDays] = useState(0);
  const [followUpAvailable, setFollowUpAvailable] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [pendingVisit, setPendingVisit] = useState(null);
  const [selected, setSelected] = useState(null); // { condition, icon, doctor }
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });
  const load = useCallback(async () => {
    try {
      const [cfg, active, fb] = await Promise.all([tokenService.getChronicConfig(), tokenService.getActive(), feedbackService.getPending().catch(() => null)]);
      if (cfg?.conditions) setConditions(cfg.conditions);
      setLockedForDays(cfg?.lockedForDays ?? 0);
      setFollowUpAvailable(!!cfg?.followUpAvailable);
      setActiveToken(active?.token || null);
      setPendingVisit(fb?.pending ? fb.visit : null);
    } catch (e) {/* offline */} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => {
      focus && focus();
    };
  }, [load, navigation]);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  };
  const doGenerate = async (followUp = false) => {
    if (!followUp && !selected) {
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: 'medkit',
        title: 'Select Your Illness',
        message: 'Please choose what you are here for so we can route you to the right doctor.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
      return;
    }
    setBusy(true);
    try {
      const res = await tokenService.generate({
        chronicIllness: selected?.condition || '',
        followUp
      });
      if (res?.queued) {
        // Offline: the request is saved and sent automatically when back
        // online. The token NUMBER is assigned by the hospital server (so two
        // patients can never get the same number) — it appears on Home then.
        setPrompt({
          visible: true,
          variant: 'success',
          icon: 'cloud-upload',
          title: 'Token Request Saved',
          message: "You're offline right now. Your token request is saved and will be sent automatically when the connection returns. Your token number will then appear on the Home screen.",
          primaryLabel: 'OK',
          onPrimary: () => { closePrompt(); navigation.goBack(); }
        });
        return;
      }
      if (res?.alreadyActive) {
        setPrompt({
          visible: true,
          variant: 'warning',
          icon: 'ticket',
          title: 'Token Already Active',
          message: `You already have an active token (${res.token?.tokenNumber || ''}). Complete your current journey first.`,
          primaryLabel: 'Track It',
          onPrimary: () => {
            closePrompt();
            navigation.reset({ index: 1, routes: [{ name: 'HomeScreen' }, { name: 'TokenJourneyScreen' }] });
          },
          secondaryLabel: 'Close',
          onSecondary: closePrompt
        });
        return;
      }
      if (res?.token) {
        setPrompt({
          visible: true,
          variant: 'success',
          icon: 'checkmark-circle',
          title: followUp ? 'Follow-up Token Issued' : 'Token Generated',
          message: res.message || 'Please proceed as guided.',
          primaryLabel: 'Track My Token',
          onPrimary: () => {
            closePrompt();
            // Once the token is issued the patient must NOT be able to go back to
            // the generate form (no re-generating / back-navigation). Rebuild the
            // stack as Home → Token Journey so "back" returns Home, not here.
            navigation.reset({ index: 1, routes: [{ name: 'HomeScreen' }, { name: 'TokenJourneyScreen' }] });
          }
        });
      } else {
        setPrompt({
          visible: true,
          variant: 'warning',
          icon: 'alert-circle',
          title: 'Could Not Generate',
          message: res?.message || 'Please try again.',
          primaryLabel: 'OK',
          onPrimary: closePrompt
        });
      }
    } catch (e) {
      const is30 = e.code === 'TOO_SOON';
      const isCardio = e.code === 'CARDIO_CLASH';
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: is30 ? 'calendar' : isCardio ? 'heart' : 'alert-circle',
        title: is30 ? 'Come Back Later' : isCardio ? 'Cardiology Appointment Today' : 'Cannot Generate Token',
        message: e.message || 'Please try again.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
      // Refresh lock/follow-up state so the UI reflects the latest.
      load();
    } finally {
      setBusy(false);
    }
  };
  if (loading) {
    return <View style={styles.container}>
        <ScreenHeader title="Chronic OPD" subtitle="Consultation token" onBack={() => navigation.goBack()} />
        <View style={{ padding: 16 }}><SkeletonCard /><SkeletonCard style={{ marginTop: 14 }} /></View>
      </View>;
  }
  const locked = lockedForDays > 0;
  return <View style={styles.container}>
      <ScreenHeader title="Chronic OPD" subtitle="Consultation token" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 30
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {/* Active token → straight to tracking */}
        {activeToken ? <FadeInView>
            <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate('TokenJourneyScreen')} style={styles.activeWrap}>
              <LinearGradient colors={[COLORS.primary, COLORS.tealDark]} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} style={styles.activeCard}>
                <View style={styles.activeRow}>
                  <Ionicons name="ticket" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.activeLabel}>You already have an active token</Text>
                </View>
                <Text style={styles.activeNumber}>{activeToken.tokenNumber}</Text>
                <View style={styles.activeTrack}>
                  <Text style={styles.activeTrackText}>Track journey</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </FadeInView> : <>
            {/* Intro / journey explainer */}
            <FadeInView delay={40}>
              <View style={styles.introCard}>
                <View style={styles.introIconBox}>
                  <Ionicons name="medical" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.introTitle}>Start your Chronic OPD visit</Text>
                <Text style={styles.introSub}>
                  Tell us your condition and we'll route you to the right doctor. Your token travels this journey:
                </Text>

                <View style={styles.journeyRow}>
                  {JOURNEY.map((s, i) => <React.Fragment key={s.label}>
                      <View style={styles.journeyStep}>
                        <View style={styles.journeyDot}>
                          <Ionicons name={s.icon} size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.journeyLabel}>{s.label}</Text>
                        {!!s.note && <Text style={styles.journeyNote}>{s.note}</Text>}
                      </View>
                      {i < JOURNEY.length - 1 && <View style={styles.journeyConnector} />}
                    </React.Fragment>)}
                </View>
              </View>
            </FadeInView>

            {/* Locked notice (30-day window) */}
            {locked && <FadeInView delay={60}>
                <View style={styles.lockCard}>
                  <Ionicons name="time" size={20} color={COLORS.warning} />
                  <View style={{
              flex: 1
            }}>
                    <Text style={styles.lockTitle}>New token locked for {lockedForDays} day(s)</Text>
                    <Text style={styles.lockSub}>
                      Your chronic medicines are valid for 30 days.
                      {followUpAvailable ? ' You can take a follow-up token to show your lab reports to the doctor (no new medicine).' : ' Please come back once the period is over.'}
                    </Text>
                  </View>
                </View>
              </FadeInView>}

            {/* Illness selection — only when a normal token can be taken */}
            {!locked && <FadeInView delay={80}>
                <Text style={styles.sectionTitle}>What are you here for?</Text>
                <View style={styles.grid}>
                  {conditions.map(c => {
              const active = selected?.condition === c.condition;
              return <TouchableOpacity key={c.condition} style={[styles.illCard, active && styles.illCardActive]} onPress={() => setSelected(c)} activeOpacity={0.85}>
                        <View style={[styles.illIcon, active && styles.illIconActive]}>
                          <Ionicons name={c.icon} size={20} color={active ? '#FFF' : COLORS.primary} />
                        </View>
                        <Text style={[styles.illText, active && styles.illTextActive]}>{c.condition}</Text>
                      </TouchableOpacity>;
            })}
                </View>
              </FadeInView>}

            {/* Assigned doctor card */}
            {!locked && selected && <FadeInView delay={40}>
                <View style={styles.docCard}>
                  <View style={styles.docAvatar}>
                    <Ionicons name="person" size={24} color="#FFF" />
                  </View>
                  <View style={{
              flex: 1
            }}>
                    <Text style={styles.docFor}>For {selected.condition}, you'll see</Text>
                    <Text style={styles.docName}>{selected.doctor.name}</Text>
                    <Text style={styles.docSpec}>{selected.doctor.specialization} • {selected.doctor.room}</Text>
                  </View>
                </View>
              </FadeInView>}
          </>}
      </ScrollView>

      {/* Sticky action bar */}
      {!activeToken && <View style={[styles.bar, {
      paddingBottom: bottomInset + 12
    }]}>
          {locked ? followUpAvailable ? <TouchableOpacity style={styles.followBtn} onPress={() => doGenerate(true)} disabled={busy} activeOpacity={0.9}>
                {busy ? <ActivityIndicator color="#FFF" /> : <>
                    <Ionicons name="document-text" size={18} color="#FFF" />
                    <Text style={styles.followBtnText}>Follow-up Token (view reports)</Text>
                  </>}
              </TouchableOpacity> : <View style={[styles.genBtn, styles.genBtnDisabled]}>
                <Ionicons name="lock-closed" size={16} color={COLORS.textLight} />
                <Text style={styles.genBtnDisabledText}>Available in {lockedForDays} day(s)</Text>
              </View> : <TouchableOpacity style={[styles.genBtn, !selected && styles.genBtnMuted]} onPress={() => doGenerate(false)} disabled={busy} activeOpacity={0.9}>
              {busy ? <ActivityIndicator color="#FFF" /> : <>
                  <Ionicons name="ticket" size={18} color="#FFF" />
                  <Text style={styles.genBtnText}>{selected ? 'Generate Token' : 'Select an illness'}</Text>
                </>}
            </TouchableOpacity>}
        </View>}

      <ThemedPrompt {...prompt} />

      {/* Mandatory: rate the previous doctor visit before booking again. */}
      <DoctorFeedbackModal visible={!!pendingVisit} visit={pendingVisit} onDone={() => {
      setPendingVisit(null);
      load();
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
  // Active token banner
  activeWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.22,
        shadowRadius: 12
      },
      android: {
        elevation: 5
      }
    })
  },
  activeCard: {
    padding: 20
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  activeLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600'
  },
  activeNumber: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '900',
    marginVertical: 8,
    letterSpacing: -1
  },
  activeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11
  },
  activeTrackText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13
  },
  // Intro
  introCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  introIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text
  },
  introSub: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    lineHeight: 19
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 18
  },
  journeyStep: {
    alignItems: 'center',
    width: 62
  },
  journeyDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center'
  },
  journeyLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6
  },
  journeyNote: {
    fontSize: 9.5,
    color: COLORS.textLight,
    marginTop: 1
  },
  journeyConnector: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 19
  },
  // Lock notice
  lockCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FEF9EC',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCE4B6'
  },
  lockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92610A'
  },
  lockSub: {
    fontSize: 12.5,
    color: '#A9791F',
    marginTop: 4,
    lineHeight: 18
  },
  // Illness grid
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 12
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  illCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12
  },
  illCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '18'
  },
  illIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center'
  },
  illIconActive: {
    backgroundColor: COLORS.primary
  },
  illText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  illTextActive: {
    color: COLORS.text
  },
  // Doctor card
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '30'
  },
  docAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  docFor: {
    fontSize: 11.5,
    color: COLORS.textLight,
    fontWeight: '600'
  },
  docName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2
  },
  docSpec: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  // Action bar
  bar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15
  },
  genBtnMuted: {
    backgroundColor: COLORS.tealLight
  },
  genBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  },
  genBtnDisabled: {
    backgroundColor: COLORS.borderLight
  },
  genBtnDisabledText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.warning,
    borderRadius: 14,
    paddingVertical: 15
  },
  followBtnText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800'
  }
});