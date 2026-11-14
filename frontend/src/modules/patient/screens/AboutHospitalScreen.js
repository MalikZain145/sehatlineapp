import React from 'react';
import BrandLogo from '../../../components/ui/BrandLogo';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform, StatusBar } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const AboutHospitalScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const renderHeader = () => <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.headerGradient} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 0
  }}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.logoContainer}>
              <BrandLogo style={styles.logoImage} />
            </View>
            <Text style={styles.headerTitle}>About Hospital</Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('HomeScreen')} activeOpacity={0.7}>
            <Ionicons name="home-outline" size={wp(5.5)} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.primary} translucent={true} />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.2
    }} style={styles.gradientBackground} />

      {renderHeader()}

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>About CDA Hospital</Text>
            <Text style={styles.description}>
              CDA Hospital, managed by the Capital Development Authority, was established in March 1981. 
              It is a 280-bed tertiary care hospital located at G-6/2, Near Melody, Islamabad.
            </Text>

            <Text style={styles.sectionTitle}>Services</Text>
            
            <View style={[styles.card, SHADOWS.small]}>
              <View style={styles.cardRow}>
                <Ionicons name="medkit-outline" size={wp(5)} color={COLORS.primary} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>OPD & Treatment Service</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, SHADOWS.small]}>
              <View style={styles.cardRow}>
                <Ionicons name="bed-outline" size={wp(5)} color={COLORS.primary} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Indoor & Surgical Service</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, SHADOWS.small]}>
              <View style={styles.cardRow}>
                <Ionicons name="flask-outline" size={wp(5)} color={COLORS.primary} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Investigative Service</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, SHADOWS.small]}>
              <View style={styles.cardRow}>
                <Ionicons name="alert-circle-outline" size={wp(5)} color={COLORS.primary} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Emergency Services</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Location</Text>
            <View style={[styles.locationCard, SHADOWS.small]}>
              <Ionicons name="location-outline" size={wp(5)} color={COLORS.primary} />
              <View style={styles.locationContent}>
                <Text style={styles.locationText}>G-6/2, Near Melody, Islamabad</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.contactBtn, SHADOWS.medium]} onPress={() => navigation.navigate('ContactScreen')} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.contactGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Text style={styles.contactBtnText}>Contact Hospital</Text>
                <Ionicons name="arrow-forward" size={wp(4.5)} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine • CDA Hospital Islamabad</Text>
          </View>
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
    height: hp(25)
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
    paddingTop: hp(0.5)
  },
  // ─── Header ────────────────────────────────────────────────────────────
  headerGradient: {
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(0.5) : hp(0.8),
    paddingBottom: hp(1.5),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.medium
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  logoImage: {
    width: 19,
    height: 19
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  // ─── Content ──────────────────────────────────────────────────────────
  content: {
    paddingTop: hp(1.5)
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: wp(4.5),
    fontWeight: 'bold',
    marginBottom: hp(1),
    marginTop: hp(2)
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: wp(3.5),
    lineHeight: hp(2.5),
    marginBottom: hp(0.5)
  },
  // ─── Cards ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(3.5),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3)
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ─── Location ──────────────────────────────────────────────────────────
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(3.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  locationContent: {
    flex: 1
  },
  locationText: {
    color: COLORS.text,
    fontSize: wp(3.5)
  },
  // ─── Contact Button ──────────────────────────────────────────────────
  contactBtn: {
    borderRadius: wp(3),
    overflow: 'hidden',
    marginTop: hp(2.5)
  },
  contactGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: hp(1.8),
    gap: wp(2)
  },
  contactBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: wp(4)
  },
  // ─── Footer ──────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: hp(3),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    fontWeight: '600'
  }
});
export default AboutHospitalScreen;