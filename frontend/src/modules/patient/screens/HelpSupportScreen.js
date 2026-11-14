// HelpSupportScreen — the ways a patient can actually reach someone.
//
// The old version offered live chat and a ticket system. Neither exists, and
// a support channel that silently goes nowhere is worse than an honest phone
// number. What's here either dials, opens mail, or answers the question
// inline.

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import { HOSPITAL } from '../../../constants/hospital';

// LayoutAnimation needs no opt-in on the New Architecture, and calling
// setLayoutAnimationEnabledExperimental there logs a warning for nothing.
// The old bridge still wants it, so guard on whether the flag is a no-op.
import { useTheme } from "../../../context/ThemeContext";
if (Platform.OS === 'android' && !global.nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Questions patients actually ask, answered from how the app really behaves.
const FAQS = [{
  q: 'How do I get a queue token?',
  a: 'Open Chronic Care from the home screen and tap Generate Token. You can only hold one active token at a time, and chronic medicines are dispensed every 30 days — so a new token becomes available 30 days after your last visit.'
}, {
  q: 'Why can I not take a token today?',
  a: 'Either you already have an active token, or fewer than 30 days have passed since your last chronic visit, or you have a cardiology appointment booked for today. The app will tell you which, and how long to wait.'
}, {
  q: 'What happens after the doctor sees me?',
  a: 'Your token moves to Pharmacy automatically. If the doctor ordered lab tests, it then moves to the Laboratory. If not, your visit is complete once you collect your medicines.'
}, {
  q: 'Do I have to stay in the hospital while I wait?',
  a: 'No. Watch your position in the app. You will get a notification when you are next, and again when it is your turn.'
}, {
  q: 'How do I book a cardiology appointment?',
  a: 'Tap Appointments on the home screen. Choose a doctor, a date, and a free slot. You cannot book two things at the same time, and slots are released once someone else takes them.'
}, {
  q: 'Why was my CNIC rejected?',
  a: 'The photo must show the whole card, sharp and free of glare, and the number, name and date of birth must match what you typed. Crop tightly around the card — background text confuses the reader.'
}, {
  q: 'Can I sign in with my fingerprint?',
  a: 'Yes. Go to Settings, enable Biometric Login, confirm your password and scan your fingerprint. After that the fingerprint alone identifies your account.'
}, {
  q: 'I forgot my password.',
  a: 'Tap Forgot Password on the sign-in screen. Enter your email or phone number and we will send a code. You may request a reset three times in any 24 hours.'
}];
export default function HelpSupportScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [open, setOpen] = useState(null);
  const toggle = i => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === i ? null : i);
  };
  const dial = number => Linking.openURL(`tel:${number}`).catch(() => {});
  const mail = () => Linking.openURL(`mailto:${HOSPITAL.email}?subject=SehatLine%20Support`).catch(() => {});
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />
      <ScreenHeader title="Help & Support" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Emergency first — the one case where seconds matter. */}
        <TouchableOpacity style={styles.emergency} onPress={() => dial(HOSPITAL.emergency)} activeOpacity={0.85}>
          <View style={styles.emergencyIcon}>
            <Ionicons name="medical" size={22} color="#FFF" />
          </View>
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>Medical Emergency</Text>
            <Text style={styles.emergencySub}>Call {HOSPITAL.emergencyLabel} — answered 24/7</Text>
          </View>
          <Ionicons name="call" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Contact */}
        <Section title="Contact the Hospital">
          <Contact icon="call-outline" title="Reception" detail={HOSPITAL.receptionLabel} sub={`${HOSPITAL.opdDays}, ${HOSPITAL.opdHours}`} onPress={() => dial(HOSPITAL.reception)} />
          <Contact icon="mail-outline" title="Email" detail={HOSPITAL.email} sub="We reply within two working days" onPress={mail} />
          <Contact icon="car-outline" title="Ambulance" detail={HOSPITAL.ambulanceLabel} sub="Dispatch line" onPress={() => dial(HOSPITAL.ambulance)} last />
        </Section>

        {/* FAQ */}
        <Section title="Common Questions">
          {FAQS.map((f, i) => <View key={f.q} style={[styles.faq, i < FAQS.length - 1 && styles.divider]}>
              <TouchableOpacity style={styles.faqHead} onPress={() => toggle(i)} activeOpacity={0.7}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={17} color={COLORS.textLight} />
              </TouchableOpacity>
              {open === i && <Text style={styles.faqA}>{f.a}</Text>}
            </View>)}
        </Section>

        {/* Other routes */}
        <Section title="More">
          <Link icon="chatbox-ellipses-outline" title="Send Feedback" sub="Tell us what to improve" onPress={() => navigation.navigate('FeedbackScreen')} />
          <Link icon="document-text-outline" title="Terms & Policies" sub="How the service works" onPress={() => navigation.navigate('PoliciesScreen')} />
          <Link icon="shield-checkmark-outline" title="Privacy & Data" sub="What we store and why" onPress={() => navigation.navigate('PrivacyScreen')} last />
        </Section>

        <Text style={styles.footer}>
          {HOSPITAL.name}, {HOSPITAL.city}{'\n'}{HOSPITAL.address}
        </Text>

        <View style={{
        height: bottomInset
      }} />
      </ScrollView>
    </View>;
}
function Section({
  title,
  children
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>;
}
function Contact({
  icon,
  title,
  detail,
  sub,
  onPress,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <TouchableOpacity style={[styles.row, !last && styles.divider]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Ionicons name="open-outline" size={16} color={COLORS.textLight} />
    </TouchableOpacity>;
}
function Link({
  icon,
  title,
  sub,
  onPress,
  last
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <TouchableOpacity style={[styles.row, !last && styles.divider]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} />
    </TouchableOpacity>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  scroll: {
    padding: 16
  },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22
  },
  emergencyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emergencyText: {
    flex: 1
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF'
  },
  emergencySub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2
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
    marginLeft: 4,
    marginBottom: 9
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
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
  rowText: {
    flex: 1
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  rowDetail: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2
  },
  rowSub: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  faq: {
    paddingHorizontal: 15
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14
  },
  faqQ: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 19
  },
  faqA: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 19,
    paddingBottom: 14,
    paddingRight: 24
  },
  footer: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4
  }
});