// MedicineBankScreen — the Medicine Donation Bank.
//
// Donate surplus, in-date medicine; browse what others have donated (search
// by name/city) and claim what you need — claiming shares contact so donor
// and recipient coordinate a handover. Same community model as the Blood
// Donor Network, aimed at the cost of chronic medicine in Pakistan.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Linking, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import useBottomInset from '../../../hooks/useBottomInset';
import medicineBankService from '../services/medicineBankService';
import { onMedBankUpdate } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
const GREEN = '#0E9F6E';
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Inhaler', 'Injection', 'Drops', 'Other'];
const FILTERS = [{
  key: 'browse',
  label: 'Browse'
}, {
  key: 'mine',
  label: 'My Donations'
}];
export default function MedicineBankScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('browse');
  const [donations, setDonations] = useState([]);
  const [mine, setMine] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });
  const empty = {
    medicineName: '',
    form: 'Tablet',
    quantity: '',
    expiry: '',
    city: '',
    contactPhone: '',
    notes: ''
  };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setForm(f => ({
          ...f,
          city: f.city || u.donor?.city || u.address || '',
          contactPhone: f.contactPhone || u.phone || ''
        }));
      }
    } catch (e) {/* ignore */}
  }, []);
  const loadLists = useCallback(async () => {
    try {
      const [browse, my] = await Promise.all([medicineBankService.list({
        q: search
      }), medicineBankService.mine()]);
      setDonations(browse?.donations || []);
      setMine(my?.donations || []);
    } catch (e) {/* offline */}
  }, [search]);
  const loadAll = useCallback(async () => {
    await Promise.all([loadUser(), loadLists()]);
    setLoading(false);
  }, [loadUser, loadLists]);
  useEffect(() => {
    loadAll();
    const unsub = onMedBankUpdate(() => loadLists());
    const focus = navigation.addListener?.('focus', loadLists);
    return () => {
      unsub && unsub();
      focus && focus();
    };
  }, [loadAll, loadLists, navigation]);

  // Re-fetch browse when the search text changes.
  useEffect(() => {
    const t = setTimeout(() => {
      medicineBankService.list({
        q: search
      }).then(r => setDonations(r?.donations || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLists();
    setTimeout(() => setRefreshing(false), 400);
  };
  const info = (title, message, variant = 'warning', icon = 'alert-circle') => setPrompt({
    visible: true,
    variant,
    icon,
    title,
    message,
    primaryLabel: 'OK',
    onPrimary: closePrompt
  });
  const submit = async () => {
    if (!form.medicineName.trim()) return info('Medicine Name', 'Please enter the medicine name.');
    if (!form.city.trim()) return info('City', 'Please enter your city.');
    if (!form.contactPhone.trim()) return info('Contact', 'Please enter a contact number.');
    setBusy(true);
    try {
      const res = await medicineBankService.donate({
        medicineName: form.medicineName.trim(),
        form: form.form,
        quantity: form.quantity.trim(),
        expiry: form.expiry.trim(),
        city: form.city.trim(),
        contactPhone: form.contactPhone.trim(),
        notes: form.notes.trim()
      });
      setShowSheet(false);
      setForm({
        ...empty,
        city: form.city,
        contactPhone: form.contactPhone
      });
      await loadLists();
      setFilter('mine');
      info('Listed 💚', res?.message || 'Your medicine is now available for someone in need.', 'success', 'checkmark-circle');
    } catch (e) {
      info('Could Not List', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const claim = d => {
    setPrompt({
      visible: true,
      variant: 'default',
      icon: 'medkit',
      title: 'Claim this medicine?',
      message: `Your name and phone will be shared with the donor so you can arrange to collect ${d.medicineName}.`,
      primaryLabel: 'Yes, Claim',
      onPrimary: async () => {
        closePrompt();
        setBusy(true);
        try {
          const res = await medicineBankService.claim(d._id);
          await loadLists();
          info('Claimed 💚', res?.message || 'The donor has been notified.', 'success', 'checkmark-circle');
        } catch (e) {
          info('Could Not Claim', e.message || 'Please try again.');
        } finally {
          setBusy(false);
        }
      },
      secondaryLabel: 'Cancel',
      onSecondary: closePrompt
    });
  };
  const markGiven = d => {
    setPrompt({
      visible: true,
      variant: 'success',
      icon: 'checkmark-circle',
      title: 'Mark as Given?',
      message: 'Confirm you have handed over this medicine.',
      primaryLabel: 'Mark Given',
      onPrimary: async () => {
        closePrompt();
        try {
          await medicineBankService.markGiven(d._id);
          await loadLists();
        } catch (e) {}
      },
      secondaryLabel: 'Cancel',
      onSecondary: closePrompt
    });
  };
  const removeItem = d => {
    setPrompt({
      visible: true,
      variant: 'warning',
      icon: 'trash',
      title: 'Remove Listing?',
      destructive: true,
      message: 'This medicine will no longer be visible to others.',
      primaryLabel: 'Remove',
      onPrimary: async () => {
        closePrompt();
        try {
          await medicineBankService.remove(d._id);
          await loadLists();
        } catch (e) {}
      },
      secondaryLabel: 'Keep',
      onSecondary: closePrompt
    });
  };
  const call = phone => phone && Linking.openURL(`tel:${phone}`).catch(() => {});
  const statusColor = s => s === 'available' ? GREEN : s === 'claimed' ? COLORS.warning : s === 'given' ? COLORS.primary : COLORS.textLight;
  const renderBrowse = d => <View key={d._id} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.medIcon}><Ionicons name="medkit" size={20} color={GREEN} /></View>
        <View style={{
        flex: 1
      }}>
          <Text style={styles.medName}>{d.medicineName}{d.form ? ` · ${d.form}` : ''}</Text>
          <Text style={styles.medMeta}>{d.quantity || 'Quantity not specified'}{d.expiry ? ` · exp ${d.expiry}` : ''}</Text>
        </View>
        {d.sealed && <View style={styles.sealBadge}><Text style={styles.sealText}>Sealed</Text></View>}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color={COLORS.textLight} /><Text style={styles.metaText}>{d.city}</Text></View>
      </View>
      {!!d.notes && <Text style={styles.notes}>{d.notes}</Text>}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.ghost} onPress={() => call(d.contactPhone)}>
          <Ionicons name="call-outline" size={15} color={COLORS.primary} /><Text style={styles.ghostText}>Call</Text>
        </TouchableOpacity>
        {!d.isMine && <TouchableOpacity style={styles.claimBtn} onPress={() => claim(d)} activeOpacity={0.85}>
            <Ionicons name="hand-left" size={15} color="#FFF" /><Text style={styles.claimText}>I Need This</Text>
          </TouchableOpacity>}
      </View>
    </View>;
  const renderMine = d => <View key={d._id} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.medIcon}><Ionicons name="medkit" size={20} color={GREEN} /></View>
        <View style={{
        flex: 1
      }}>
          <Text style={styles.medName}>{d.medicineName}{d.form ? ` · ${d.form}` : ''}</Text>
          <Text style={styles.medMeta}>{d.city}{d.expiry ? ` · exp ${d.expiry}` : ''}</Text>
        </View>
        <View style={[styles.statusPill, {
        backgroundColor: statusColor(d.status) + '18'
      }]}>
          <Text style={[styles.statusText, {
          color: statusColor(d.status)
        }]}>{d.status}</Text>
        </View>
      </View>
      {d.claimedBy?.name && <View style={styles.claimedInfo}>
          <Ionicons name="person" size={13} color={COLORS.warning} />
          <Text style={styles.claimedText}>Claimed by {d.claimedBy.name} — {d.claimedBy.phone}</Text>
        </View>}
      {(d.status === 'available' || d.status === 'claimed') && <View style={styles.actions}>
          {d.status === 'claimed' && <TouchableOpacity style={styles.ghost} onPress={() => call(d.claimedBy?.phone)}>
              <Ionicons name="call-outline" size={15} color={COLORS.primary} /><Text style={styles.ghostText}>Call</Text>
            </TouchableOpacity>}
          <TouchableOpacity style={styles.ghost} onPress={() => markGiven(d)}>
            <Text style={styles.ghostText}>Mark Given</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ghost, {
        borderColor: COLORS.danger + '40'
      }]} onPress={() => removeItem(d)}>
            <Text style={[styles.ghostText, {
          color: COLORS.danger
        }]}>Remove</Text>
          </TouchableOpacity>
        </View>}
    </View>;
  const listData = filter === 'mine' ? mine : donations;
  return <View style={styles.container}>
      <ScreenHeader title="Medicine Bank" subtitle="Donate & find medicine" onBack={() => navigation.goBack()} right={<TouchableOpacity onPress={() => setShowSheet(true)} hitSlop={{
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    }}><Ionicons name="add-circle" size={26} color={GREEN} /></TouchableOpacity>} />

      {loading ? <SkeletonList count={5} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 90
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}>

          {/* Intro banner */}
          <View style={styles.banner}>
            <Ionicons name="heart-circle" size={26} color={GREEN} />
            <Text style={styles.bannerText}>Have surplus, in-date medicine? Donate it. Need something? Find it here — free, from people near you.</Text>
          </View>

          {/* Segments */}
          <View style={styles.segments}>
            {FILTERS.map(f => {
          const active = filter === f.key;
          const count = f.key === 'mine' ? mine.length : donations.length;
          return <TouchableOpacity key={f.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => setFilter(f.key)}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{f.label}{count > 0 ? ` (${count})` : ''}</Text>
                </TouchableOpacity>;
        })}
          </View>

          {/* Search (browse only) */}
          {filter === 'browse' && <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.textLight} />
              <TextInput style={styles.searchInput} placeholder="Search medicine name…" placeholderTextColor={COLORS.textLight} value={search} onChangeText={setSearch} />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textLight} /></TouchableOpacity>}
            </View>}

          {listData.length === 0 ? <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={50} color={COLORS.border} />
              <Text style={styles.emptyText}>{filter === 'mine' ? "You haven't donated any medicine yet." : 'No medicines available right now. Be the first to donate.'}</Text>
            </View> : listData.map(d => filter === 'mine' ? renderMine(d) : renderBrowse(d))}
        </ScrollView>}

      {/* FAB */}
      {!loading && <TouchableOpacity style={[styles.fab, {
      bottom: bottomInset + 20
    }]} onPress={() => setShowSheet(true)} activeOpacity={0.9}>
          <Ionicons name="add" size={22} color="#FFF" /><Text style={styles.fabText}>Donate Medicine</Text>
        </TouchableOpacity>}

      {/* Donate sheet */}
      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} overlayStyle={styles.sheetOverlay} sheetStyle={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Donate Medicine</Text>
              <Text style={styles.sheetSub}>Only donate sealed, in-date medicine. Thank you for helping. 💚</Text>

              <Text style={styles.fieldLabel}>Medicine Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Metformin 500mg" placeholderTextColor={COLORS.textLight} value={form.medicineName} onChangeText={t => set('medicineName', t)} />

              <Text style={styles.fieldLabel}>Form</Text>
              <View style={styles.chipsWrap}>
                {FORMS.map(f => {
                const active = form.form === f;
                return <TouchableOpacity key={f} style={[styles.chip, active && styles.chipActive]} onPress={() => set('form', f)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text></TouchableOpacity>;
              })}
              </View>

              <View style={styles.row2}>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput style={styles.input} placeholder="e.g. 2 strips" placeholderTextColor={COLORS.textLight} value={form.quantity} onChangeText={t => set('quantity', t)} />
                </View>
                <View style={{
                flex: 1
              }}>
                  <Text style={styles.fieldLabel}>Expiry (YYYY-MM)</Text>
                  <TextInput style={styles.input} placeholder="2026-12" placeholderTextColor={COLORS.textLight} value={form.expiry} onChangeText={t => set('expiry', t)} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput style={styles.input} placeholder="e.g. Islamabad" placeholderTextColor={COLORS.textLight} value={form.city} onChangeText={t => set('city', t)} />

              <Text style={styles.fieldLabel}>Contact Phone</Text>
              <TextInput style={styles.input} placeholder="03xx-xxxxxxx" placeholderTextColor={COLORS.textLight} keyboardType="phone-pad" value={form.contactPhone} onChangeText={t => set('contactPhone', t)} />

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput style={[styles.input, {
              height: 64,
              textAlignVertical: 'top'
            }]} placeholder="Storage, packaging, timing…" placeholderTextColor={COLORS.textLight} multiline value={form.notes} onChangeText={t => set('notes', t)} />

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetGhost} onPress={() => setShowSheet(false)}><Text style={styles.sheetGhostText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.sheetPrimary, {
                backgroundColor: GREEN
              }]} onPress={submit} disabled={busy}>
                  {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sheetPrimaryText}>Donate</Text>}
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
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: GREEN + '10',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: GREEN + '25'
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: COLORS.mintLightest,
    borderRadius: 12,
    padding: 4,
    marginTop: 16
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center'
  },
  segmentActive: {
    backgroundColor: COLORS.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
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
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textLight
  },
  segmentTextActive: {
    color: COLORS.text,
    fontWeight: '800'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginTop: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginTop: 12
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  medIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GREEN + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  medName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.text
  },
  medMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2
  },
  sealBadge: {
    backgroundColor: GREEN + '18',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9
  },
  sealText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: GREEN
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  notes: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 10,
    fontStyle: 'italic'
  },
  claimedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: COLORS.warning + '12',
    padding: 8,
    borderRadius: 9
  },
  claimedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap'
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ghostText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary
  },
  claimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 10,
    minWidth: 120
  },
  claimText: {
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
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 13,
    ...Platform.select({
      ios: {
        shadowColor: GREEN,
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
    gap: 12
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  chipTextActive: {
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
    justifyContent: 'center'
  },
  sheetPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF'
  }
});