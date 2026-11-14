// BloodDonorScreen — the Blood Donor Network.
//
// One screen, three jobs:
//   1) Donor status — opt in (blood group + city) or opt out. Opt-in is
//      gated on a CNIC-verified account (enforced by the backend) so the
//      network stays trustworthy.
//   2) Requests feed — active blood requests, with the ones matching the
//      patient's own blood group surfaced first. "I Can Donate" shares the
//      donor's contact with the requester.
//   3) Post a request — a form that notifies every compatible, eligible,
//      opted-in donor instantly.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Linking, Platform, StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import useBottomInset from '../../../hooks/useBottomInset';
import bloodDonorService from '../services/bloodDonorService';
import { onBloodUpdate } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const URGENCIES = [{
  key: 'critical',
  label: 'Critical',
  color: '#DC2626'
}, {
  key: 'urgent',
  label: 'Urgent',
  color: '#EA580C'
}, {
  key: 'normal',
  label: 'Normal',
  color: '#0BAA9D'
}];
const RED = '#E23744';
const FILTERS = [{
  key: 'matches',
  label: 'Matches Me'
}, {
  key: 'all',
  label: 'All Requests'
}, {
  key: 'mine',
  label: 'My Requests'
}];
export default function BloodDonorScreen({
  navigation
}) {
  const {
    colors: COLORS,
    isDark
  } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const bottomInset = useBottomInset();
  const [user, setUser] = useState(null);
  const [donor, setDonor] = useState(null);
  const [filter, setFilter] = useState('matches');
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Modals
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });

  // Donor opt-in form
  const [dGroup, setDGroup] = useState('');
  const [dCity, setDCity] = useState('');

  // Post-request form
  const [pGroup, setPGroup] = useState('');
  const [pUnits, setPUnits] = useState('1');
  const [pHospital, setPHospital] = useState('');
  const [pCity, setPCity] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pPatient, setPPatient] = useState('');
  const [pUrgency, setPUrgency] = useState('urgent');
  const [pNotes, setPNotes] = useState('');
  const closePrompt = () => setPrompt({
    visible: false
  });
  const showInfo = (title, message, variant = 'default') => setPrompt({
    visible: true,
    title,
    message,
    variant,
    primaryLabel: 'OK',
    onPrimary: closePrompt
  });
  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setDGroup(g => g || u.bloodGroup || '');
        setDCity(c => c || u.donor?.city || u.address || '');
        setPGroup(g => g || u.bloodGroup || '');
        setPCity(c => c || u.donor?.city || '');
        setPPhone(p => p || u.phone || '');
      }
    } catch (e) {/* ignore */}
  }, []);
  const loadDonor = useCallback(async () => {
    try {
      const res = await bloodDonorService.getDonorStatus();
      if (res?.donor) setDonor(res.donor);
    } catch (e) {/* offline */}
  }, []);
  const loadRequests = useCallback(async () => {
    try {
      const [feed, mine] = await Promise.all([bloodDonorService.listRequests(false), bloodDonorService.myRequests()]);
      setRequests(feed?.requests || []);
      setMyRequests(mine?.requests || []);
    } catch (e) {/* offline */}
  }, []);
  const loadAll = useCallback(async () => {
    await Promise.all([loadUser(), loadDonor(), loadRequests()]);
    setLoading(false);
  }, [loadUser, loadDonor, loadRequests]);
  useEffect(() => {
    loadAll();
    const unsub = onBloodUpdate(() => loadRequests());
    const focus = navigation.addListener?.('focus', () => {
      loadDonor();
      loadRequests();
    });
    return () => {
      unsub && unsub();
      focus && focus();
    };
  }, [loadAll, loadDonor, loadRequests, navigation]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setTimeout(() => setRefreshing(false), 400);
  };

  // ── Donor opt-in / opt-out ───────────────────────────────────────────────
  const submitOptIn = async () => {
    if (!dGroup) return showInfo('Blood Group', 'Please select your blood group.', 'warning');
    if (!dCity.trim()) return showInfo('City', 'Please enter your city so nearby requests can find you.', 'warning');
    setBusy(true);
    try {
      const res = await bloodDonorService.optIn({
        bloodGroup: dGroup,
        city: dCity.trim()
      });
      setDonor(res?.donor || null);
      setShowDonorModal(false);
      // Keep the cached user's bloodGroup in sync for the responder flow.
      if (user) {
        const updated = {
          ...user,
          bloodGroup: dGroup
        };
        setUser(updated);
        await AsyncStorage.setItem('userData', JSON.stringify(updated));
      }
      showInfo('You Are In 💚', res?.message || 'You are now a registered blood donor.', 'success');
    } catch (e) {
      const notVerified = e.code === 'NOT_VERIFIED';
      showInfo(notVerified ? 'Verify Your Account First' : 'Could Not Join', e.message || 'Please try again.', 'warning');
    } finally {
      setBusy(false);
    }
  };
  const confirmOptOut = () => {
    setPrompt({
      visible: true,
      title: 'Leave the Network?',
      message: 'You will stop receiving blood requests. You can rejoin any time.',
      variant: 'warning',
      primaryLabel: 'Leave',
      destructive: true,
      onPrimary: async () => {
        closePrompt();
        setBusy(true);
        try {
          const res = await bloodDonorService.optOut();
          setDonor(res?.donor || null);
        } catch (e) {/* ignore */} finally {
          setBusy(false);
        }
      },
      secondaryLabel: 'Stay',
      onSecondary: closePrompt
    });
  };

  // ── Post a request ───────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (!pGroup) return showInfo('Blood Group', 'Select the blood group needed.', 'warning');
    if (!pHospital.trim()) return showInfo('Hospital', 'Enter the hospital name.', 'warning');
    if (!pCity.trim()) return showInfo('City', 'Enter the city.', 'warning');
    if (!pPhone.trim()) return showInfo('Contact', 'Enter a contact phone number.', 'warning');
    setBusy(true);
    try {
      const res = await bloodDonorService.createRequest({
        patientName: pPatient.trim(),
        bloodGroup: pGroup,
        unitsNeeded: parseInt(pUnits, 10) || 1,
        hospital: pHospital.trim(),
        city: pCity.trim(),
        contactPhone: pPhone.trim(),
        notes: pNotes.trim(),
        urgency: pUrgency
      });
      setShowPostModal(false);
      setPPatient('');
      setPUnits('1');
      setPHospital('');
      setPNotes('');
      await loadRequests();
      setFilter('mine');
      showInfo('Request Posted', res?.message || 'Compatible donors have been notified.', 'success');
    } catch (e) {
      showInfo('Could Not Post', e.message || 'Please try again.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  // ── Respond to a request ─────────────────────────────────────────────────
  const respond = req => {
    setPrompt({
      visible: true,
      title: 'Offer to Donate?',
      message: `Your name, blood group and phone number will be shared with the requester so they can contact you about donating ${req.bloodGroup} blood.`,
      variant: 'default',
      icon: 'water',
      primaryLabel: 'Yes, I Can Help',
      onPrimary: async () => {
        closePrompt();
        setBusy(true);
        try {
          const res = await bloodDonorService.respond(req._id);
          await loadRequests();
          showInfo('Thank You 💚', res?.message || 'The requester has your contact details now.', 'success');
        } catch (e) {
          showInfo('Could Not Respond', e.message || 'Please try again.', 'warning');
        } finally {
          setBusy(false);
        }
      },
      secondaryLabel: 'Cancel',
      onSecondary: closePrompt
    });
  };
  const fulfill = req => {
    setPrompt({
      visible: true,
      title: 'Mark Fulfilled?',
      message: 'This closes the request and stops notifying donors. Do this once you have enough blood.',
      variant: 'success',
      primaryLabel: 'Mark Fulfilled',
      onPrimary: async () => {
        closePrompt();
        try {
          await bloodDonorService.fulfill(req._id);
          await loadRequests();
        } catch (e) {/* ignore */}
      },
      secondaryLabel: 'Not Yet',
      onSecondary: closePrompt
    });
  };
  const cancelReq = req => {
    setPrompt({
      visible: true,
      title: 'Cancel Request?',
      message: 'This removes your request from the network.',
      variant: 'warning',
      destructive: true,
      primaryLabel: 'Cancel Request',
      onPrimary: async () => {
        closePrompt();
        try {
          await bloodDonorService.cancel(req._id);
          await loadRequests();
        } catch (e) {/* ignore */}
      },
      secondaryLabel: 'Keep',
      onSecondary: closePrompt
    });
  };
  const callNumber = phone => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  // ── Derived list per filter ──────────────────────────────────────────────
  const visibleRequests = filter === 'mine' ? myRequests : filter === 'matches' ? requests.filter(r => r.compatible && !r.isMine) : requests.filter(r => !r.isMine);
  const urgencyMeta = key => URGENCIES.find(u => u.key === key) || URGENCIES[1];

  // ── Renderers ────────────────────────────────────────────────────────────
  const renderDonorCard = () => {
    if (donor?.optedIn) {
      return <View style={[styles.donorCard, styles.donorCardActive]}>
          <View style={styles.donorRow}>
            <View style={styles.donorBadge}>
              <Text style={styles.donorBadgeText}>{donor.bloodGroup || '—'}</Text>
            </View>
            <View style={{
            flex: 1
          }}>
              <Text style={styles.donorTitle}>You're a registered donor</Text>
              <Text style={styles.donorSub}>
                {donor.city ? `${donor.city} • ` : ''}
                {donor.eligible ? 'Eligible to donate now' : 'Recently donated — resting'}
              </Text>
            </View>
          </View>
          {!donor.eligible && donor.nextEligibleDate && <View style={styles.eligPill}>
              <Ionicons name="time-outline" size={13} color={COLORS.textLight} />
              <Text style={styles.eligText}>
                Eligible again on {new Date(donor.nextEligibleDate).toLocaleDateString()}
              </Text>
            </View>}
          <TouchableOpacity style={styles.optOutBtn} onPress={confirmOptOut} disabled={busy}>
            <Text style={styles.optOutText}>Leave network</Text>
          </TouchableOpacity>
        </View>;
    }
    return <View style={styles.donorCard}>
        <View style={styles.donorRow}>
          <View style={[styles.donorBadge, {
          backgroundColor: RED
        }]}>
            <Ionicons name="water" size={22} color="#FFF" />
          </View>
          <View style={{
          flex: 1
        }}>
            <Text style={styles.donorTitle}>Become a blood donor</Text>
            <Text style={styles.donorSub}>Get notified when someone nearby needs your blood group.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.joinBtn} onPress={() => setShowDonorModal(true)} activeOpacity={0.85}>
          <Ionicons name="heart" size={16} color="#FFF" />
          <Text style={styles.joinBtnText}>Join the Network</Text>
        </TouchableOpacity>
      </View>;
  };
  const renderRequest = req => {
    const u = urgencyMeta(req.urgency);
    const mine = filter === 'mine' || req.isMine;
    return <View key={req._id} style={styles.reqCard}>
        <View style={styles.reqTop}>
          <View style={styles.reqGroupBadge}>
            <Text style={styles.reqGroupText}>{req.bloodGroup}</Text>
          </View>
          <View style={{
          flex: 1
        }}>
            <Text style={styles.reqHospital} numberOfLines={1}>{req.hospital}</Text>
            <Text style={styles.reqCity} numberOfLines={1}>
              {req.city}{req.patientName ? ` • for ${req.patientName}` : ''}
            </Text>
          </View>
          <View style={[styles.urgPill, {
          backgroundColor: u.color + '18'
        }]}>
            <View style={[styles.urgDot, {
            backgroundColor: u.color
          }]} />
            <Text style={[styles.urgText, {
            color: u.color
          }]}>{u.label}</Text>
          </View>
        </View>

        <View style={styles.reqMetaRow}>
          <View style={styles.reqMeta}>
            <Ionicons name="water-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.reqMetaText}>{req.unitsNeeded} unit(s)</Text>
          </View>
          {req.compatible && !mine && <View style={styles.matchPill}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
              <Text style={styles.matchText}>You can donate</Text>
            </View>}
          {req.responderCount > 0 && <View style={styles.reqMeta}>
              <Ionicons name="people-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.reqMetaText}>{req.responderCount} offered</Text>
            </View>}
        </View>

        {!!req.notes && <Text style={styles.reqNotes}>{req.notes}</Text>}

        {/* Actions */}
        {mine ? <View style={styles.reqActions}>
            <TouchableOpacity style={styles.actGhost} onPress={() => callNumber(req.contactPhone)}>
              <Ionicons name="call-outline" size={15} color={COLORS.primary} />
              <Text style={styles.actGhostText}>{req.contactPhone}</Text>
            </TouchableOpacity>
            {req.status === 'active' && <>
                <TouchableOpacity style={styles.actGhost} onPress={() => fulfill(req)}>
                  <Text style={styles.actGhostText}>Fulfilled</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actGhost, styles.actDanger]} onPress={() => cancelReq(req)}>
                  <Text style={[styles.actGhostText, {
              color: COLORS.danger
            }]}>Cancel</Text>
                </TouchableOpacity>
              </>}
          </View> : <View style={styles.reqActions}>
            <TouchableOpacity style={styles.actGhost} onPress={() => callNumber(req.contactPhone)}>
              <Ionicons name="call-outline" size={15} color={COLORS.primary} />
              <Text style={styles.actGhostText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.donateBtn, req.hasResponded && styles.donateBtnDone]} onPress={() => !req.hasResponded && respond(req)} disabled={req.hasResponded} activeOpacity={0.85}>
              <Ionicons name={req.hasResponded ? 'checkmark' : 'water'} size={15} color="#FFF" />
              <Text style={styles.donateBtnText}>{req.hasResponded ? 'Offered' : 'I Can Donate'}</Text>
            </TouchableOpacity>
          </View>}
      </View>;
  };
  const renderEmpty = () => {
    const msg = filter === 'mine' ? "You haven't posted any requests yet." : filter === 'matches' ? 'No active requests match your blood group right now. That’s good news.' : 'No active blood requests right now.';
    return <View style={styles.empty}>
        <Ionicons name="water-outline" size={54} color={COLORS.border} />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>;
  };
  return <View style={styles.container}>
      <ScreenHeader title="Blood Donor Network" subtitle="Give blood, save lives" onBack={() => navigation.goBack()} right={<TouchableOpacity onPress={() => setShowPostModal(true)} hitSlop={{
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    }}>
            <Ionicons name="add-circle" size={26} color={RED} />
          </TouchableOpacity>} />

      {loading ? <SkeletonList count={5} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 90
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[RED]} tintColor={RED} />}>
          {renderDonorCard()}

          {/* Filter segments */}
          <View style={styles.segments}>
            {FILTERS.map(f => {
          const count = f.key === 'mine' ? myRequests.length : f.key === 'matches' ? requests.filter(r => r.compatible && !r.isMine).length : requests.filter(r => !r.isMine).length;
          const active = filter === f.key;
          return <TouchableOpacity key={f.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {f.label}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>;
        })}
          </View>

          {visibleRequests.length === 0 ? renderEmpty() : visibleRequests.map(renderRequest)}
        </ScrollView>}

      {/* Post request FAB */}
      {!loading && <TouchableOpacity style={[styles.fab, {
      bottom: bottomInset + 20
    }]} onPress={() => setShowPostModal(true)} activeOpacity={0.9}>
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.fabText}>Request Blood</Text>
        </TouchableOpacity>}

      {/* ── Donor opt-in modal ── */}
      <BottomSheet visible={showDonorModal} onClose={() => setShowDonorModal(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <Text style={styles.sheetTitle}>Join as a Donor</Text>
            <Text style={styles.sheetSub}>You'll be notified when a compatible request is posted.</Text>

            <Text style={styles.fieldLabel}>Your Blood Group</Text>
            <View style={styles.groupGrid}>
              {BLOOD_GROUPS.map(g => <TouchableOpacity key={g} style={[styles.groupChip, dGroup === g && styles.groupChipActive]} onPress={() => setDGroup(g)}>
                  <Text style={[styles.groupChipText, dGroup === g && styles.groupChipTextActive]}>{g}</Text>
                </TouchableOpacity>)}
            </View>

            <Text style={styles.fieldLabel}>City</Text>
            <TextInput style={styles.input} placeholder="e.g. Islamabad" placeholderTextColor={COLORS.textLight} value={dCity} onChangeText={setDCity} />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetGhost} onPress={() => setShowDonorModal(false)}>
                <Text style={styles.sheetGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimary, {
              backgroundColor: RED
            }]} onPress={submitOptIn} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sheetPrimaryText}>Join Network</Text>}
              </TouchableOpacity>
            </View>
      </BottomSheet>

      {/* ── Post request modal ── */}
      <BottomSheet visible={showPostModal} onClose={() => setShowPostModal(false)} overlayStyle={styles.sheetOverlay} sheetStyle={[styles.sheet, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Request Blood</Text>
              <Text style={styles.sheetSub}>Compatible donors are notified instantly.</Text>

              <Text style={styles.fieldLabel}>Blood Group Needed</Text>
              <View style={styles.groupGrid}>
                {BLOOD_GROUPS.map(g => <TouchableOpacity key={g} style={[styles.groupChip, pGroup === g && styles.groupChipActive]} onPress={() => setPGroup(g)}>
                    <Text style={[styles.groupChipText, pGroup === g && styles.groupChipTextActive]}>{g}</Text>
                  </TouchableOpacity>)}
              </View>

              <Text style={styles.fieldLabel}>Urgency</Text>
              <View style={styles.urgRow}>
                {URGENCIES.map(u => <TouchableOpacity key={u.key} style={[styles.urgChip, pUrgency === u.key && {
                backgroundColor: u.color,
                borderColor: u.color
              }]} onPress={() => setPUrgency(u.key)}>
                    <Text style={[styles.urgChipText, pUrgency === u.key && {
                  color: '#FFF'
                }]}>{u.label}</Text>
                  </TouchableOpacity>)}
              </View>

              <View style={styles.row2}>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Units</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={pUnits} onChangeText={t => setPUnits(t.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="1" placeholderTextColor={COLORS.textLight} />
                </View>
                <View style={{
                flex: 2
              }}>
                  <Text style={styles.fieldLabel}>Patient Name (optional)</Text>
                  <TextInput style={styles.input} value={pPatient} onChangeText={setPPatient} placeholder="e.g. Ahmed" placeholderTextColor={COLORS.textLight} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Hospital</Text>
              <TextInput style={styles.input} value={pHospital} onChangeText={setPHospital} placeholder="e.g. PIMS Hospital" placeholderTextColor={COLORS.textLight} />

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput style={styles.input} value={pCity} onChangeText={setPCity} placeholder="e.g. Islamabad" placeholderTextColor={COLORS.textLight} />

              <Text style={styles.fieldLabel}>Contact Phone</Text>
              <TextInput style={styles.input} value={pPhone} onChangeText={setPPhone} keyboardType="phone-pad" placeholder="03xx-xxxxxxx" placeholderTextColor={COLORS.textLight} />

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput style={[styles.input, {
              height: 70,
              textAlignVertical: 'top'
            }]} value={pNotes} onChangeText={setPNotes} multiline placeholder="Ward, timing, or any detail for donors" placeholderTextColor={COLORS.textLight} />

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetGhost} onPress={() => setShowPostModal(false)}>
                  <Text style={styles.sheetGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sheetPrimary, {
                backgroundColor: RED
              }]} onPress={submitRequest} disabled={busy}>
                  {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sheetPrimaryText}>Post Request</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
      </BottomSheet>

      <ThemedPrompt {...prompt} />
    </View>;
}
const makeStyles = (COLORS, isDark = false) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Donor status card
  donorCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18
  },
  donorCardActive: {
    borderColor: RED + '40',
    backgroundColor: '#FFF7F7'
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  donorBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center'
  },
  donorBadgeText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900'
  },
  donorTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.text
  },
  donorSub: {
    fontSize: 12.5,
    color: COLORS.textLight,
    marginTop: 3,
    lineHeight: 17
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RED,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14
  },
  joinBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  eligPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12
  },
  eligText: {
    fontSize: 12,
    color: COLORS.textLight
  },
  optOutBtn: {
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  optOutText: {
    color: COLORS.danger,
    fontSize: 12.5,
    fontWeight: '700'
  },
  // Segments
  segments: {
    flexDirection: 'row',
    // White track (light) with a soft red border; slate track in dark.
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    borderWidth: isDark ? 0 : 1,
    borderColor: '#F0D6D6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center'
  },
  segmentActive: {
    // Active pill is RED with white text.
    backgroundColor: RED,
    ...Platform.select({
      ios: {
        shadowColor: RED,
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: {
          width: 0,
          height: 1
        }
      },
      android: {
        elevation: 1
      }
    })
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    // Inactive: red on the white track (light) / light-grey on slate (dark).
    color: isDark ? '#CBD5E1' : RED
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  // Request card
  reqCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12
  },
  reqTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  reqGroupBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: RED + '12',
    justifyContent: 'center',
    alignItems: 'center'
  },
  reqGroupText: {
    color: RED,
    fontSize: 16,
    fontWeight: '900'
  },
  reqHospital: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.text
  },
  reqCity: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2
  },
  urgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10
  },
  urgDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  urgText: {
    fontSize: 11,
    fontWeight: '800'
  },
  reqMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    flexWrap: 'wrap'
  },
  reqMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  reqMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9
  },
  matchText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '800'
  },
  reqNotes: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 18,
    fontStyle: 'italic'
  },
  reqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14
  },
  actGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  actDanger: {
    borderColor: COLORS.danger + '40'
  },
  actGhostText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary
  },
  donateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 10
  },
  donateBtnDone: {
    backgroundColor: COLORS.success
  },
  donateBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800'
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 12
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 19
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: RED,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 13,
    ...Platform.select({
      ios: {
        shadowColor: RED,
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
  // Sheets / modals
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
    paddingBottom: 30
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
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 8
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
    gap: 12
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  groupChip: {
    width: 58,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  groupChipActive: {
    backgroundColor: RED,
    borderColor: RED
  },
  groupChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  groupChipTextActive: {
    color: '#FFF'
  },
  urgRow: {
    flexDirection: 'row',
    gap: 8
  },
  urgChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  urgChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
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
    justifyContent: 'center'
  },
  sheetPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF'
  }
});