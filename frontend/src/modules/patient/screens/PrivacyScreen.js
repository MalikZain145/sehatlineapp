// PrivacyScreen — what the app holds, why, and what the patient controls.
//
// The old version listed three permissions as "Enabled" whether they were or
// not, and offered a "Manage Data Sharing" button that did nothing. Claiming
// controls that don't exist is worse than not mentioning them, so the
// permissions here are read live, and only real actions are offered.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';

// Loaded defensively — a missing module must not break the screen.
import { useTheme } from "../../../context/ThemeContext";
let ImagePicker = null;
let Notifications = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {/* optional */}
try {
  Notifications = require('expo-notifications');
} catch (e) {/* optional */}
let Camera = null;
try {
  Camera = require('expo-camera');
} catch (e) {/* optional */}
export default function PrivacyScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [perms, setPerms] = useState({
    camera: null,
    photos: null,
    notifications: null
  });
  const readPermissions = useCallback(async () => {
    const next = {
      camera: null,
      photos: null,
      notifications: null
    };
    try {
      if (Camera?.Camera?.getCameraPermissionsAsync) {
        const r = await Camera.Camera.getCameraPermissionsAsync();
        next.camera = r.granted;
      } else if (Camera?.getCameraPermissionsAsync) {
        const r = await Camera.getCameraPermissionsAsync();
        next.camera = r.granted;
      }
    } catch (e) {/* leave unknown */}
    try {
      if (ImagePicker?.getMediaLibraryPermissionsAsync) {
        const r = await ImagePicker.getMediaLibraryPermissionsAsync();
        next.photos = r.granted;
      }
    } catch (e) {/* leave unknown */}
    try {
      if (Notifications?.getPermissionsAsync) {
        const r = await Notifications.getPermissionsAsync();
        next.notifications = r.granted;
      }
    } catch (e) {/* leave unknown */}
    setPerms(next);
    setLoading(false);
  }, []);
  useEffect(() => {
    readPermissions();
    const focus = navigation.addListener?.('focus', readPermissions);
    return () => focus && focus();
  }, [readPermissions, navigation]);
  const openSettings = () => Linking.openSettings().catch(() => {});
  if (loading) {
    return <View style={styles.container}><SkeletonList count={5} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />
      <ScreenHeader title="Privacy & Data" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* How data is held */}
        <Section title="Your Data">
          <Item icon="lock-closed-outline" title="Encrypted in transit and at rest" body="Your medical records, CNIC images and personal details are encrypted. Staff see only what their role requires." />
          <Item icon="business-outline" title="Held by CDA Hospital" body="Your records belong to the hospital's medical system. SehatLine is the app you use to reach them." />
          <Item icon="eye-off-outline" title="Never sold or shared" body="We do not sell your data, and we do not share it with advertisers or third parties." last />
        </Section>

        {/* What we store */}
        <Section title="What We Store">
          <Bullet text="Your name, CNIC, CDA card number and date of birth — verified once at registration." />
          <Bullet text="Blood group, allergies and chronic illnesses, as you enter them." />
          <Bullet text="Your queue tokens, appointments, orders and lab reports." />
          <Bullet text="CNIC photographs, kept only to prove your identity was verified." last />
        </Section>

        {/* Permissions — read live, not asserted */}
        <Section title="Device Permissions" note="Managed by your phone, not by SehatLine">
          <Permission icon="camera-outline" title="Camera" reason="Capturing your CNIC during registration" granted={perms.camera} />
          <Permission icon="images-outline" title="Photos" reason="Choosing a profile picture" granted={perms.photos} />
          <Permission icon="notifications-outline" title="Notifications" reason="Queue updates and daily health tips" granted={perms.notifications} last />

          <TouchableOpacity style={styles.settingsBtn} onPress={openSettings} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={16} color={COLORS.primary} />
            <Text style={styles.settingsText}>Open Phone Settings</Text>
          </TouchableOpacity>
        </Section>

        {/* Real controls only */}
        <Section title="Your Controls">
          <Action icon="person-outline" title="Edit your details" body="Update your medical information and emergency contact." onPress={() => navigation.navigate('ProfileScreen')} />
          <Action icon="shield-outline" title="Account & Ownership" body="Deactivate or permanently delete your account." onPress={() => navigation.navigate('AccountOwnershipScreen')} danger last />
        </Section>

        <Text style={styles.footer}>
          Questions about your data? Contact the hospital's records office through Help & Support.
        </Text>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>
    </View>;
}
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
      <View style={styles.card}>{children}</View>
    </View>;
}
function Item({
  icon,
  title,
  body,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>;
}
function Bullet({
  text,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={[styles.bulletRow, !last && styles.divider]}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>;
}

// `granted` may be null — we genuinely don't know on some platforms, and
// saying "Enabled" when we haven't checked would be a lie.
function Permission({
  icon,
  title,
  reason,
  granted,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const state = granted === true ? 'Allowed' : granted === false ? 'Not allowed' : 'Unknown';
  const colour = granted === true ? COLORS.success : granted === false ? COLORS.textLight : COLORS.textLight;
  return <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{reason}</Text>
      </View>
      <View style={[styles.pill, granted === true && styles.pillOn]}>
        <Text style={[styles.pillText, {
        color: colour
      }]}>{state}</Text>
      </View>
    </View>;
}
function Action({
  icon,
  title,
  body,
  onPress,
  danger,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <TouchableOpacity style={[styles.row, !last && styles.divider]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && {
        color: COLORS.danger
      }]}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} />
    </TouchableOpacity>;
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
  scroll: {
    padding: 16
  },
  section: {
    marginBottom: 20
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
  card: {
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
    paddingVertical: 14
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconBoxDanger: {
    backgroundColor: '#FDECEC'
  },
  rowText: {
    flex: 1
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  rowBody: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 3,
    lineHeight: 16
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surface
  },
  pillOn: {
    backgroundColor: '#E7F8F1'
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700'
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  settingsText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13
  },
  footer: {
    fontSize: 11.5,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
    marginTop: 4
  }
});