// ProfileScreen — everything the account holds, and the parts they may change.
//
// Identity (name, CNIC, CDA card, email, date of birth) came off a verified
// CNIC scan at signup. It is displayed but locked: rewriting it would void the
// verification the hospital matches records against.
//
// Medical details — blood group, allergies, chronic illnesses, emergency
// contact — are the patient's to maintain. Chronic illnesses in particular
// feed the queue's priority scoring, so keeping them current matters.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, StatusBar, Platform, ActivityIndicator, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import settingsService from '../services/settingsService';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import { showConfirm } from '../../../components/confirm';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import { useTheme } from "../../../context/ThemeContext";
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Offered as one-tap suggestions; the patient can still type anything.
const COMMON_CONDITIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Arthritis', 'Thyroid'];
const COMMON_ALLERGIES = ['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Peanuts', 'Dust', 'Pollen'];
export default function ProfileScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset(80);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    cnic: '',
    cdaCard: '',
    dob: '',
    address: '',
    bloodGroup: '',
    emergencyName: '',
    emergencyContact: '',
    allergies: [],
    chronicConditions: [],
    profilePic: '',
    isVerified: false,
    memberSince: null
  });
  const [draft, setDraft] = useState({});
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [loadError, setLoadError] = useState('');

  // The login response already carried the full account — CNIC, card, name,
  // picture. Paint from that cache first so the screen is never blank while
  // the network call is in flight, then reconcile with the server.
  const seedFromCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (!raw) return;
      const u = JSON.parse(raw);
      setProfile(p => ({
        ...p,
        name: u.name ?? p.name,
        email: u.email ?? p.email,
        phone: u.phone ?? p.phone,
        cnic: u.cnic ?? p.cnic,
        cdaCard: u.cdaCard ?? p.cdaCard,
        dob: u.dob ?? p.dob,
        address: u.address ?? p.address,
        profilePic: u.profilePic ?? p.profilePic,
        bloodGroup: u.bloodGroup ?? p.bloodGroup,
        emergencyName: u.emergencyName ?? p.emergencyName,
        emergencyContact: u.emergencyContact ?? p.emergencyContact,
        allergies: u.allergies ?? p.allergies,
        chronicConditions: u.chronicConditions ?? p.chronicConditions,
        isVerified: u.isVerified ?? p.isVerified,
        memberSince: u.createdAt ?? p.memberSince
      }));
    } catch (e) {/* no cache yet */}
  }, []);
  const load = useCallback(async () => {
    try {
      const res = await settingsService.getSettings();
      if (res?.settings) {
        setProfile(p => ({
          ...p,
          ...res.settings
        }));
        setLoadError('');
        // Refresh the cache so the next cold start paints correctly.
        // (mergeItem isn't supported everywhere, so read-merge-write.)
        try {
          const raw = await AsyncStorage.getItem('userData');
          const prev = raw ? JSON.parse(raw) : {};
          await AsyncStorage.setItem('userData', JSON.stringify({
            ...prev,
            ...res.settings
          }));
        } catch (e) {/* cache is an optimisation, not a requirement */}
      }
    } catch (e) {
      // Swallowing this left every field showing "—" with no explanation.
      setLoadError(e.message || 'Could not reach the server. Showing your last saved details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    // Cache first, then the network — the screen is populated either way.
    seedFromCache().finally(load);
  }, [seedFromCache, load]);
  const startEdit = () => {
    setDraft({
      address: profile.address,
      bloodGroup: profile.bloodGroup,
      emergencyName: profile.emergencyName,
      emergencyContact: profile.emergencyContact,
      allergies: [...(profile.allergies || [])],
      chronicConditions: [...(profile.chronicConditions || [])]
    });
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft({});
    setNewAllergy('');
    setNewCondition('');
    setEditing(false);
  };
  const save = async () => {
    setSaving(true);
    try {
      await settingsService.updateProfile(draft);
      setProfile(p => ({
        ...p,
        ...draft
      }));
      cancelEdit();
      setPrompt({
        variant: 'success',
        title: 'Profile Saved',
        message: 'Your details have been updated.'
      });
    } catch (e) {
      setPrompt({
        variant: 'error',
        title: 'Could not save',
        message: e.message || 'Please check your details and try again.'
      });
    } finally {
      setSaving(false);
    }
  };
  const pickPhoto = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPrompt({
          variant: 'warning',
          title: 'Permission Needed',
          message: 'Allow photo access to set a profile picture.'
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfile(p => ({
        ...p,
        profilePic: uri
      }));
      await settingsService.updateProfilePic(uri);

      // The sidebar and settings both read the picture from this cache.
      try {
        const raw = await AsyncStorage.getItem('userData');
        const prev = raw ? JSON.parse(raw) : {};
        await AsyncStorage.setItem('userData', JSON.stringify({
          ...prev,
          profilePic: uri
        }));
      } catch (e) {/* non-fatal */}
    } catch (e) {
      setPrompt({
        variant: 'error',
        title: 'Upload Failed',
        message: e.message || 'Could not update your picture.'
      });
    }
  };
  const removePhoto = () => {
    showConfirm({
      title: 'Remove Photo',
      message: 'Are you sure you want to remove your profile photo?',
      confirmLabel: 'Remove',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        setProfile(p => ({
          ...p,
          profilePic: ''
        }));
        try {
          await settingsService.updateProfilePic('');
        } catch (e) {/* offline */}
        try {
          const raw = await AsyncStorage.getItem('userData');
          const prev = raw ? JSON.parse(raw) : {};
          await AsyncStorage.setItem('userData', JSON.stringify({
            ...prev,
            profilePic: ''
          }));
        } catch (e) {/* non-fatal */}
      }
    });
  };
  const set = (k, v) => setDraft(d => ({
    ...d,
    [k]: v
  }));
  const addTo = (key, value, clear) => {
    const v = value.trim();
    if (!v) return;
    const list = draft[key] || [];
    if (list.some(x => x.toLowerCase() === v.toLowerCase())) {
      clear('');
      return;
    }
    set(key, [...list, v]);
    clear('');
  };
  const removeFrom = (key, value) => set(key, (draft[key] || []).filter(x => x !== value));
  const showPhone = p => p ? `+92 ${p.slice(0, 3)}-${p.slice(3)}` : '—';
  const showDate = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  if (loading) {
    return (
      <View style={[styles.container, { padding: 20 }]}>
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <SkeletonCircle size={96} />
          <Skeleton width={160} height={18} radius={9} style={{ marginTop: 16 }} />
          <Skeleton width={210} height={12} style={{ marginTop: 10 }} />
        </View>
        <SkeletonCard style={{ marginTop: 30 }} />
        <SkeletonCard style={{ marginTop: 14 }} />
      </View>
    );
  }
  const initial = (profile.name || 'P').charAt(0).toUpperCase();
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />

      <ScreenHeader title={editing ? 'Edit Details' : 'My Profile'} backIcon={editing ? 'close' : 'arrow-back'} onBack={() => editing ? cancelEdit() : navigation.goBack()} right={editing ? <TouchableOpacity onPress={save} disabled={saving} hitSlop={HIT}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.save}>Save</Text>}
            </TouchableOpacity> : <TouchableOpacity onPress={startEdit} hitSlop={HIT}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>} />

      {/* Fields near the bottom — emergency contact especially — sat under the
          keyboard while being typed into. Lifting the scroll view keeps the
          focused input visible. */}
      <KeyboardAvoidingView style={{
      flex: 1
    }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        load();
      }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {!!loadError && <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={15} color={COLORS.warning} />
            <Text style={styles.offlineText}>{loadError}</Text>
          </View>}

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>            {profile.profilePic ? <Image source={{
              uri: profile.profilePic
            }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>}
            <View style={styles.cameraBadge}><Ionicons name="camera" size={13} color="#FFF" /></View>
          </TouchableOpacity>

          {!!profile.profilePic && <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color={COLORS.danger || '#EF4444'} />
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>}

          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name || 'Patient'}</Text>
            {profile.isVerified && <Ionicons name="checkmark-circle" size={17} color={COLORS.primary} />}
          </View>

          <View style={[styles.pill, !profile.isVerified && styles.pillPending]}>
            <Ionicons name={profile.isVerified ? 'shield-checkmark' : 'time-outline'} size={11} color={profile.isVerified ? COLORS.primary : COLORS.warning} />
            <Text style={[styles.pillText, !profile.isVerified && {
              color: COLORS.warning
            }]}>
              {profile.isVerified ? 'Verified Patient' : 'Verification Pending'}
            </Text>
          </View>

          {!!profile.memberSince && <Text style={styles.memberSince}>Member since {showDate(profile.memberSince)}</Text>}
        </View>

        {/* Identity — read only */}
        <Section title="Identity" note="Verified at registration · cannot be changed">
          <InfoRow icon="person-outline" label="Full Name" value={profile.name || '—'} locked />
          <InfoRow icon="card-outline" label="CNIC" value={profile.cnic || '—'} locked />
          <InfoRow icon="id-card-outline" label="CDA Card" value={profile.cdaCard || '—'} locked />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={profile.dob || '—'} locked />
          <InfoRow icon="mail-outline" label="Email" value={profile.email || '—'} locked />
          <InfoRow icon="call-outline" label="Phone" value={showPhone(profile.phone)} locked last />
        </Section>

        {/* Medical — editable */}
        <Section title="Medical Information">
          {editing ? <View style={styles.editBlock}>
              <Text style={styles.fieldLabel}>Blood Group</Text>
              <View style={styles.chips}>
                {BLOOD_GROUPS.map(bg => <TouchableOpacity key={bg} style={[styles.chip, draft.bloodGroup === bg && styles.chipActive]} onPress={() => set('bloodGroup', draft.bloodGroup === bg ? '' : bg)}>
                    <Text style={[styles.chipText, draft.bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                  </TouchableOpacity>)}
              </View>
            </View> : <InfoRow icon="water-outline" label="Blood Group" value={profile.bloodGroup || 'Not set'} last />}
        </Section>

        {/* Chronic illnesses */}
        <Section title="Chronic Illnesses" note={editing ? 'Used to prioritise you in the queue' : undefined}>
          {editing ? <TagEditor items={draft.chronicConditions || []} suggestions={COMMON_CONDITIONS} value={newCondition} onChangeText={setNewCondition} onAdd={v => addTo('chronicConditions', v ?? newCondition, setNewCondition)} onRemove={v => removeFrom('chronicConditions', v)} placeholder="e.g. Diabetes" /> : <TagList items={profile.chronicConditions} empty="None recorded" icon="pulse-outline" />}
        </Section>

        {/* Allergies */}
        <Section title="Allergies">
          {editing ? <TagEditor items={draft.allergies || []} suggestions={COMMON_ALLERGIES} value={newAllergy} onChangeText={setNewAllergy} onAdd={v => addTo('allergies', v ?? newAllergy, setNewAllergy)} onRemove={v => removeFrom('allergies', v)} placeholder="e.g. Penicillin" danger /> : <TagList items={profile.allergies} empty="None recorded" icon="warning-outline" danger />}
        </Section>

        {/* Contact */}
        <Section title="Contact & Emergency">
          {editing ? <>
              <EditRow icon="location-outline" label="Address" value={draft.address} onChangeText={v => set('address', v)} />
              <EditRow icon="people-outline" label="Emergency Contact Name" value={draft.emergencyName} onChangeText={v => set('emergencyName', v)} />
              <EditRow icon="alert-circle-outline" label="Emergency Contact Number" value={draft.emergencyContact} onChangeText={v => set('emergencyContact', v.replace(/\D/g, '').slice(0, 11))} keyboardType="phone-pad" last />
            </> : <>
              <InfoRow icon="location-outline" label="Address" value={profile.address || '—'} />
              <InfoRow icon="people-outline" label="Emergency Contact" value={profile.emergencyName || '—'} />
              <InfoRow icon="alert-circle-outline" label="Emergency Number" value={profile.emergencyContact || '—'} last />
            </>}
        </Section>

        {/* Room for the keyboard to push the last field clear of it. */}
        <View style={{
          height: bottomInset
        }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <ThemedPrompt visible={!!prompt} variant={prompt?.variant} title={prompt?.title} message={prompt?.message} primaryLabel="OK" onPrimary={() => setPrompt(null)} />
    </View>;
}
const HIT = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12
};
function Section({
  title,
  note,
  children
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!note && <Text style={styles.sectionNote}>{note}</Text>}
      <View style={styles.sectionCard}>{children}</View>
    </View>;
}
function InfoRow({
  icon,
  label,
  value,
  locked,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // A value arriving as an array or number renders as a bare child and React
  // Native throws "Text strings must be rendered within a <Text> component".
  // Coerce here rather than trusting every call site and every cached payload.
  const text = Array.isArray(value) ? value.length ? value.join(', ') : '—' : value === null || value === undefined || value === '' ? '—' : String(value);
  return <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.rowIcon, locked && styles.rowIconLocked]}>
        <Ionicons name={icon} size={17} color={locked ? COLORS.textLight : COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, locked && styles.rowValueLocked]} numberOfLines={1}>{text}</Text>
      </View>
      {locked && <Ionicons name="lock-closed" size={12} color={COLORS.textLight} />}
    </View>;
}
function EditRow({
  icon,
  label,
  last,
  ...props
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={17} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput style={styles.editInput} placeholderTextColor="#9CA3AF" placeholder={`Enter ${String(label || '').toLowerCase()}`} {...props} />
      </View>
    </View>;
}

// Read-only chip list.
function TagList({
  items,
  empty,
  icon,
  danger
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // A stale cache could hold objects here; keep only renderable strings.
  items = (Array.isArray(items) ? items : []).filter(t => typeof t === 'string' && t);
  if (!items.length) {
    return <View style={styles.emptyBlock}>
        <Ionicons name={icon} size={17} color={COLORS.textLight} />
        <Text style={styles.emptyText}>{empty}</Text>
      </View>;
  }
  return <View style={styles.tagWrap}>
      {items.map(t => <View key={t} style={[styles.tag, danger && styles.tagDanger]}>
          <Text style={[styles.tagText, danger && styles.tagTextDanger]}>{t}</Text>
        </View>)}
    </View>;
}

// Editable chip list with suggestions and a free-text field.
function TagEditor({
  items,
  suggestions,
  value,
  onChangeText,
  onAdd,
  onRemove,
  placeholder,
  danger
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  items = (Array.isArray(items) ? items : []).filter(t => typeof t === 'string' && t);
  const unused = suggestions.filter(s => !items.some(i => i.toLowerCase() === s.toLowerCase()));
  return <View style={styles.editBlock}>
      {items.length > 0 && <View style={styles.tagWrapInner}>
          {items.map(t => <TouchableOpacity key={t} style={[styles.tag, danger && styles.tagDanger]} onPress={() => onRemove(t)}>
              <Text style={[styles.tagText, danger && styles.tagTextDanger]}>{t}</Text>
              <Ionicons name="close" size={13} color={danger ? COLORS.danger : COLORS.primary} />
            </TouchableOpacity>)}
        </View>}

      <View style={styles.addRow}>
        <TextInput style={styles.addInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9CA3AF" onSubmitEditing={() => onAdd()} returnKeyType="done" />
        <TouchableOpacity style={styles.addBtn} onPress={() => onAdd()} disabled={!String(value || '').trim()}>
          <Ionicons name="add" size={19} color={String(value || '').trim() ? '#FFF' : '#D1D5DB'} />
        </TouchableOpacity>
      </View>

      {unused.length > 0 && <>
          <Text style={styles.suggestLabel}>Common</Text>
          <View style={[styles.tagWrapInner, {
        marginTop: 8
      }]}>
            {unused.map(s => <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => onAdd(s)}>
                <Ionicons name="add" size={12} color={COLORS.textSecondary} />
                <Text style={styles.suggestText}>{s}</Text>
              </TouchableOpacity>)}
          </View>
        </>}
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card
  },
  save: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.primary
  },
  scroll: {
    padding: 16
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3E2',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6
  },
  offlineText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB'
  },
  removePhotoText: {
    fontSize: 12,
    color: COLORS.danger || '#EF4444',
    fontWeight: '600'
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46
  },
  avatarFallback: {
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.backgroundSecondary
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.mintLight,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 11,
    marginTop: 8
  },
  pillPending: {
    backgroundColor: '#FEF3E2'
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  memberSince: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 8
  },
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4
  },
  sectionNote: {
    fontSize: 10.5,
    color: COLORS.textLight,
    marginLeft: 4,
    marginTop: 3,
    fontStyle: 'italic'
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginTop: 9
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 12
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowIconLocked: {
    backgroundColor: COLORS.surface
  },
  rowText: {
    flex: 1
  },
  rowLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600'
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 2
  },
  rowValueLocked: {
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  editInput: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: 3,
    marginTop: 1
  },
  editBlock: {
    padding: 15
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 9
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  chipTextActive: {
    color: '#FFF'
  },
  // Standalone list — carries its own padding.
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    padding: 15
  },
  // Nested inside editBlock, which already pads.
  tagWrapInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.mintLight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9
  },
  tagDanger: {
    backgroundColor: '#FDECEC'
  },
  tagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primary
  },
  tagTextDanger: {
    color: COLORS.danger
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13.5,
    color: COLORS.text
  },
  addBtn: {
    width: 42,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  suggestLabel: {
    fontSize: 10.5,
    color: COLORS.textLight,
    fontWeight: '700',
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  suggestText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  emptyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 15
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight
  }
});