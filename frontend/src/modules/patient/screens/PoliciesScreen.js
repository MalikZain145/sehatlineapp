// PoliciesScreen — terms, privacy and disclaimers.
//
// The old text described an "AI symptom checker" and a "HAMI AI assistant"
// that analysed conversations. Neither exists. A policy describing features
// the app doesn't have is worse than none: it tells the patient we're not
// paying attention to what we promise them.
//
// Everything below describes what the app really does.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, LayoutAnimation, Platform, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import useBottomInset from '../../../hooks/useBottomInset';
import { APP_VERSION } from '../../../constants/version';
import { HOSPITAL } from '../../../constants/hospital';

// LayoutAnimation needs no opt-in on the New Architecture, and calling the
// experimental setter there logs a warning for nothing.
import { useTheme } from "../../../context/ThemeContext";
if (Platform.OS === 'android' && !global.nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const SECTIONS = [{
  icon: 'document-text-outline',
  title: 'Terms of Use',
  body: [`SehatLine is the digital front desk for ${HOSPITAL.name}, ${HOSPITAL.city}. It lets you take a queue token, book a cardiology appointment, follow your position in the queue, and view your reports.`, 'It does not diagnose, prescribe, or give medical advice. Every clinical decision is made by a doctor at the hospital.', 'You must be registered with the hospital and hold a valid CDA card to use the app. One person, one account.']
}, {
  icon: 'medical-outline',
  title: 'Medical Disclaimer',
  body: [`In a life-threatening emergency, do not use this app. Call ${HOSPITAL.emergencyLabel} or go straight to the Emergency Ward.`, 'Waiting times shown in the queue are estimates. They move as patients are seen, and priority cases — the elderly, the critically ill, pregnant patients — are seen ahead of the queue.', 'Reports shown in the app are copies. The hospital record is authoritative.']
}, {
  icon: 'shield-checkmark-outline',
  title: 'Privacy',
  body: ['Your records are encrypted in transit and at rest. Hospital staff see only what their role requires.', 'Your CNIC photographs are kept solely as evidence that your identity was verified at registration. They are not shared.', 'We do not sell your data, and we do not share it with advertisers or any third party.', 'You may delete your account at any time from Settings. Deletion is permanent and removes your tokens, appointments, orders and notifications.']
}, {
  icon: 'lock-closed-outline',
  title: 'Your Account',
  body: ['Your CNIC, CDA card, name and date of birth were verified once at registration and cannot be changed in the app. If any of them is wrong, contact the hospital records office.', 'You control your medical details — blood group, allergies and chronic illnesses. Chronic illnesses affect your position in the queue, so keep them current.', 'Biometric sign-in stores a one-way hash of your device fingerprint. We never see the fingerprint itself.']
}, {
  icon: 'time-outline',
  title: 'Queue & Appointments',
  body: [`The OPD runs ${HOSPITAL.opdDays}, ${HOSPITAL.opdHours}, with a break from ${HOSPITAL.opdBreak}.`, 'Chronic medicines are dispensed for 30 days, so a chronic token becomes available 30 days after your last visit.', 'You may hold one active token at a time, and you cannot hold a token and a cardiology appointment on the same day.', 'A booked slot is yours. If you cannot attend, cancel it so someone else can take it.']
}, {
  icon: 'notifications-outline',
  title: 'Notifications',
  body: ['We notify you when your turn approaches, when it arrives, and when your prescription is ready.', 'You also receive one health tip each morning and one each evening. These are general wellbeing suggestions, not medical advice.', 'You can turn notifications off in Settings, but you will then need to watch the queue yourself.']
}];
export default function PoliciesScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [open, setOpen] = useState(0);
  // Static screen — brief skeleton on entry (min ~2.5s) for a consistent feel.
  const [loading, setLoading] = useMinLoading(true);
  useEffect(() => { setLoading(false); }, []);
  const toggle = i => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === i ? null : i);
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />
      <ScreenHeader title="Terms & Policies" onBack={() => navigation.goBack()} />

      {loading ? <SkeletonList count={5} /> : <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          How SehatLine works, what it holds, and what it will not do.
        </Text>

        {SECTIONS.map((s, i) => <View key={s.title} style={styles.card}>
            <TouchableOpacity style={styles.head} onPress={() => toggle(i)} activeOpacity={0.7}>
              <View style={styles.iconBox}>
                <Ionicons name={s.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{s.title}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={17} color={COLORS.textLight} />
            </TouchableOpacity>

            {open === i && <View style={styles.body}>
                {s.body.map((p, j) => <View key={j} style={styles.para}>
                    <View style={styles.dot} />
                    <Text style={styles.paraText}>{p}</Text>
                  </View>)}
              </View>}
          </View>)}

        <View style={styles.footer}>
          <Text style={styles.version}>SehatLine v{APP_VERSION}</Text>
          <Text style={styles.footerSub}>
            {HOSPITAL.name} · {HOSPITAL.city}
          </Text>
          <Text style={styles.footerNote}>
            Questions about these terms? Reach the records office through Help & Support.
          </Text>
        </View>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>}
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  scroll: {
    padding: 16
  },
  intro: {
    fontSize: 12.5,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 18,
    marginHorizontal: 4
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 11,
    overflow: 'hidden'
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.text
  },
  body: {
    paddingHorizontal: 15,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12
  },
  para: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6
  },
  paraText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 19
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16
  },
  version: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight
  },
  footerSub: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16
  }
});