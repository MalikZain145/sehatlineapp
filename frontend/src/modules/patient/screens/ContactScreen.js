import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Dimensions, Platform, StatusBar, Modal, Share, Alert } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, SHADOWS } from '../../../theme';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');

// Responsive sizing
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const ContactScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [showMapModal, setShowMapModal] = useState(false);
  const openMaps = () => {
    const url = "https://www.google.com/maps/search/?api=1&query=CDA+Hospital+Islamabad";
    Linking.openURL(url);
  };
  const openPhone = number => {
    Linking.openURL(`tel:${number}`);
  };
  const openEmail = email => {
    Linking.openURL(`mailto:${email}`);
  };
  const shareApp = async () => {
    try {
      await Share.share({
        message: 'Check out SehatLine - CDA Healthcare Portal! Download now from the app store.',
        title: 'Share SehatLine'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this moment');
    }
  };
  const departments = [{
    name: 'OPD Registration',
    phone: '051-111-123-456',
    timing: '8AM - 8PM',
    icon: 'clipboard-outline'
  }, {
    name: 'Pharmacy',
    phone: '051-111-123-457',
    timing: '24/7',
    icon: 'medkit-outline'
  }, {
    name: 'Lab Services',
    phone: '051-111-123-458',
    timing: '8AM - 10PM',
    icon: 'flask-outline'
  }, {
    name: 'Radiology',
    phone: '051-111-123-459',
    timing: '9AM - 9PM',
    icon: 'scan-outline'
  }, {
    name: 'Patient Relations',
    phone: '051-111-123-460',
    timing: '9AM - 5PM',
    icon: 'people-outline'
  }, {
    name: 'Billing & Accounts',
    phone: '051-111-123-461',
    timing: '9AM - 5PM',
    icon: 'card-outline'
  }, {
    name: 'Medical Records',
    phone: '051-111-123-462',
    timing: '9AM - 4PM',
    icon: 'folder-outline'
  }, {
    name: 'HR Department',
    phone: '051-111-123-463',
    timing: '9AM - 5PM',
    icon: 'business-outline'
  }];
  const socialLinks = [{
    name: 'Facebook',
    icon: 'logo-facebook',
    url: 'https://facebook.com/sehatline',
    color: '#4892f3'
  }, {
    name: 'Twitter',
    icon: 'logo-twitter',
    url: 'https://twitter.com/sehatline',
    color: '#129dd4'
  }, {
    name: 'Instagram',
    icon: 'logo-instagram',
    url: 'https://instagram.com/sehatline',
    color: '#E4405F'
  }, {
    name: 'LinkedIn',
    icon: 'logo-linkedin',
    url: 'https://linkedin.com/company/sehatline',
    color: '#0A66C2'
  }, {
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    url: 'https://wa.me/923001234567',
    color: '#25D366'
  }];
  const workingHours = [{
    day: 'Monday - Friday',
    hours: '8:00 AM - 8:00 PM'
  }, {
    day: 'Saturday',
    hours: '9:00 AM - 5:00 PM'
  }, {
    day: 'Sunday',
    hours: '10:00 AM - 2:00 PM'
  }];
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.background, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 1
    }} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header with Hero Section */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.white} />
            </TouchableOpacity>
            
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.heroIconGradient}>
                  <Ionicons name="call-outline" size={wp(8)} color={COLORS.white} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Contact Us</Text>
              <Text style={styles.heroSubtitle}>We're here to help</Text>
            </View>
          </View>

          {/* Main Contact Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <View style={styles.contactGrid}>
              <TouchableOpacity style={[styles.contactCard, styles.cardShadow]} onPress={() => openPhone('051-111-123-456')}>
                <View style={styles.cardContent}>
                  <View style={[styles.cardIcon, {
                  backgroundColor: COLORS.primary + '15'
                }]}>
                    <Ionicons name="call-outline" size={wp(5)} color={COLORS.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Call Us</Text>
                  <Text style={styles.cardValue}>051-111-123-456</Text>
                  <Text style={styles.cardSub}>Support Line</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.contactCard, styles.cardShadow]} onPress={() => openEmail('support@sehatline.com')}>
                <View style={styles.cardContent}>
                  <View style={[styles.cardIcon, {
                  backgroundColor: COLORS.success + '15'
                }]}>
                    <Ionicons name="mail-outline" size={wp(5)} color={COLORS.success} />
                  </View>
                  <Text style={styles.cardTitle}>Email Us</Text>
                  <Text style={styles.cardValue}>support@sehatline.com</Text>
                  <Text style={styles.cardSub}>24hr Response</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.contactCard, styles.cardShadow]} onPress={openMaps}>
                <View style={styles.cardContent}>
                  <View style={[styles.cardIcon, {
                  backgroundColor: '#8B5CF6' + '15'
                }]}>
                    <Ionicons name="location-outline" size={wp(5)} color="#8B5CF6" />
                  </View>
                  <Text style={styles.cardTitle}>Visit Us</Text>
                  <Text style={styles.cardValue}>CDA Hospital, G-6/2</Text>
                  <Text style={styles.cardSub}>Islamabad, Pakistan</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.contactCard, styles.cardShadow]} onPress={shareApp}>
                <View style={styles.cardContent}>
                  <View style={[styles.cardIcon, {
                  backgroundColor: '#F59E0B' + '15'
                }]}>
                    <Ionicons name="share-social-outline" size={wp(5)} color="#F59E0B" />
                  </View>
                  <Text style={styles.cardTitle}>Share App</Text>
                  <Text style={styles.cardValue}>Invite Friends</Text>
                  <Text style={styles.cardSub}>Spread the word</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Department Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Department Direct Lines</Text>
            {departments.map((dept, index) => <TouchableOpacity key={index} style={[styles.deptCard, styles.cardShadow]} onPress={() => openPhone(dept.phone)}>
                <View style={styles.deptContent}>
                  <View style={[styles.deptIcon, {
                backgroundColor: COLORS.primary + '15'
              }]}>
                    <Ionicons name={dept.icon} size={wp(4.5)} color={COLORS.primary} />
                  </View>
                  <View style={styles.deptInfo}>
                    <Text style={styles.deptName}>{dept.name}</Text>
                    <Text style={styles.deptTiming}>{dept.timing}</Text>
                  </View>
                  <View style={styles.deptPhone}>
                    <Text style={styles.deptPhoneText}>{dept.phone}</Text>
                    <Ionicons name="call-outline" size={wp(3.5)} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>)}
          </View>

          {/* Working Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <View style={[styles.hoursCard, styles.cardShadow]}>
              {workingHours.map((item, index) => <View key={index} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{item.day}</Text>
                  <Text style={styles.hoursTime}>{item.hours}</Text>
                </View>)}
            </View>
          </View>

          {/* Social Media Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connect With Us</Text>
            <View style={styles.socialGrid}>
              {socialLinks.map((social, index) => <TouchableOpacity key={index} style={[styles.socialCard, styles.cardShadow]} onPress={() => Linking.openURL(social.url)}>
                  <View style={[styles.socialContent, {
                borderColor: social.color + '30'
              }]}>
                    <Ionicons name={social.icon} size={wp(6)} color={social.color} />
                    <Text style={styles.socialName}>{social.name}</Text>
                  </View>
                </TouchableOpacity>)}
            </View>
          </View>

          {/* Map Preview */}
          <TouchableOpacity style={[styles.mapPreview, styles.cardShadow]} onPress={openMaps}>
            <View style={styles.mapContent}>
              <Ionicons name="map-outline" size={wp(6)} color={COLORS.primary} />
              <View style={styles.mapInfo}>
                <Text style={styles.mapTitle}>View on Google Maps</Text>
                <Text style={styles.mapAddress}>CDA Hospital, G-6/2, Islamabad</Text>
              </View>
              <Ionicons name="chevron-forward" size={wp(4.5)} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine v{APP_VERSION} | CDA Healthcare Portal</Text>
            <Text style={styles.footerSub}>© 2026 All Rights Reserved</Text>
          </View>

          <View style={{
          height: hp(5)
        }} />
        </ScrollView>
      </SafeAreaView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%'
  },
  safeArea: {
    flex: 1
  },
  cardShadow: {
    ...SHADOWS.medium
  },
  // Header
  headerContainer: {
    paddingBottom: hp(1),
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(1) : StatusBar.currentHeight + hp(1)
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  heroSection: {
    alignItems: 'center',
    marginTop: hp(1.5),
    marginBottom: hp(1)
  },
  heroIcon: {
    marginBottom: hp(1)
  },
  heroIconGradient: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: wp(5.5),
    fontWeight: 'bold'
  },
  heroSubtitle: {
    color: COLORS.white,
    fontSize: wp(3.2),
    marginTop: hp(0.3),
    opacity: 0.8
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(5)
  },
  section: {
    marginBottom: hp(2.5)
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: wp(4.2),
    fontWeight: 'bold',
    marginBottom: hp(1.5)
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(2)
  },
  contactCard: {
    width: (wp(92) - wp(6)) / 2,
    borderRadius: wp(4),
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardContent: {
    padding: wp(3),
    alignItems: 'center'
  },
  cardIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5)
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: wp(3.2),
    fontWeight: 'bold'
  },
  cardValue: {
    color: COLORS.primary,
    fontSize: wp(3),
    fontWeight: '600',
    marginTop: hp(0.2),
    textAlign: 'center'
  },
  cardSub: {
    color: COLORS.textSecondary,
    fontSize: wp(2.3),
    marginTop: hp(0.1)
  },
  deptCard: {
    borderRadius: wp(3),
    overflow: 'hidden',
    marginBottom: hp(1),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  deptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    gap: wp(3)
  },
  deptIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  deptInfo: {
    flex: 1
  },
  deptName: {
    color: COLORS.text,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  deptTiming: {
    color: COLORS.textSecondary,
    fontSize: wp(2.3),
    marginTop: hp(0.1)
  },
  deptPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1)
  },
  deptPhoneText: {
    color: COLORS.primary,
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  hoursCard: {
    borderRadius: wp(4),
    padding: wp(4),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(0.8)
  },
  hoursDay: {
    color: COLORS.text,
    fontSize: wp(3)
  },
  hoursTime: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8)
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(2)
  },
  socialCard: {
    width: (wp(92) - wp(8)) / 3,
    borderRadius: wp(3),
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  socialContent: {
    alignItems: 'center',
    padding: wp(2.5),
    gap: hp(0.3),
    borderWidth: 1,
    borderRadius: wp(3)
  },
  socialName: {
    color: COLORS.text,
    fontSize: wp(2.3),
    fontWeight: '500'
  },
  mapPreview: {
    borderRadius: wp(3.5),
    overflow: 'hidden',
    marginBottom: hp(2),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  mapContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.5),
    gap: wp(3)
  },
  mapInfo: {
    flex: 1
  },
  mapTitle: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  mapAddress: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    marginTop: hp(0.1)
  },
  footer: {
    alignItems: 'center',
    marginTop: hp(2)
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8)
  },
  footerSub: {
    color: COLORS.textLight,
    fontSize: wp(2.5),
    marginTop: hp(0.3)
  }
});
export default ContactScreen;