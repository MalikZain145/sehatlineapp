import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Dimensions, Image, Platform, SafeAreaView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const DoctorDashboardScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ✅ Get doctor data from navigation params
  const doctorFromParams = route.params?.doctor || route.params?.doctorData || {};

  // ✅ Doctor data with fallbacks
  const doctorData = {
    id: doctorFromParams.id || '1',
    name: doctorFromParams.name || 'Dr. Doctor',
    specialization: doctorFromParams.specialty || doctorFromParams.specialization || 'Specialist',
    department: doctorFromParams.department || 'General',
    todayPatients: 18,
    waitingPatients: 4,
    completedPatients: 14,
    priorityPatients: 2,
    rating: doctorFromParams.rating || 4.8,
    experience: doctorFromParams.experience || '12 Years',
    totalPatients: doctorFromParams.patientsHandled || 1247,
    successRate: 98,
    availableSlots: 3,
    nextPatient: 'Ahmed Khan',
    nextToken: 'A-145',
    queuePosition: 4,
    avatar: doctorFromParams.avatar || 'DR',
    color: doctorFromParams.color || COLORS.primary,
    color2: doctorFromParams.color2 || COLORS.secondary,
    qualification: doctorFromParams.qualification || 'FCPS, MBBS',
    email: doctorFromParams.email || 'doctor@sehatline.com',
    certifications: doctorFromParams.certifications || ['FACC', 'FSCAI'],
    bio: doctorFromParams.bio || 'Experienced healthcare professional dedicated to patient care.',
    schedule: 'Mon, Wed, Fri - 9AM to 5PM',
    location: 'CDA Hospital, Islamabad',
    joinDate: 'Jan 2020',
    performance: {
      satisfaction: 98,
      noShows: 12,
      avgWait: 8
    }
  };

  // ✅ Stats Cards
  const stats = [{
    label: "Today's Patients",
    value: doctorData.todayPatients,
    icon: 'people-outline',
    color: COLORS.primary,
    bgColor: COLORS.primary + '15'
  }, {
    label: 'Waiting',
    value: doctorData.waitingPatients,
    icon: 'time-outline',
    color: COLORS.warning,
    bgColor: COLORS.warning + '15'
  }, {
    label: 'Completed',
    value: doctorData.completedPatients,
    icon: 'checkmark-done-outline',
    color: COLORS.success,
    bgColor: COLORS.success + '15'
  }, {
    label: 'Priority',
    value: doctorData.priorityPatients,
    icon: 'alert-circle-outline',
    color: COLORS.danger,
    bgColor: COLORS.danger + '15'
  }];

  // ✅ Quick Actions - Only 4 relevant ones
  const quickActions = [{
    id: 1,
    title: 'Call Next',
    desc: 'Call next patient',
    icon: 'call-outline',
    color: COLORS.primary,
    screen: 'CallNextPatientScreen'
  }, {
    id: 2,
    title: 'Queue',
    desc: 'View live queue',
    icon: 'people-outline',
    color: COLORS.warning,
    screen: 'LiveTokenQueueScreen'
  }, {
    id: 3,
    title: 'Profile',
    desc: 'View doctor profile',
    icon: 'person-outline',
    color: COLORS.info,
    onPress: () => setShowProfileModal(true)
  }, {
    id: 4,
    title: 'Schedule',
    desc: 'View schedule',
    icon: 'calendar-outline',
    color: COLORS.success,
    screen: 'DoctorScheduleScreen'
  }];

  // ✅ Handle navigation with doctor data
  const handleActionPress = screen => {
    navigation.navigate(screen, {
      doctor: doctorData,
      doctorData: doctorData,
      doctorName: doctorData.name,
      doctorId: doctorData.id
    });
  };

  // ✅ Doctor Profile Modal (Cleaned - No Phone, No Emergency)
  const renderProfileModal = () => <Modal visible={showProfileModal} transparent={true} animationType="slide" onRequestClose={() => setShowProfileModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, styles.cardShadow]}>
          {/* Modal Header */}
          <LinearGradient colors={[doctorData.color, doctorData.color2]} style={styles.modalHeader} start={{
          x: 0,
          y: 0
        }} end={{
          x: 1,
          y: 0
        }}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={wp(5)} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.modalAvatarContainer}>
              <LinearGradient colors={[doctorData.color, doctorData.color2]} style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>{doctorData.avatar}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.modalDoctorName}>{doctorData.name}</Text>
            <Text style={styles.modalSpecialty}>{doctorData.specialization}</Text>
            <Text style={styles.modalDepartment}>{doctorData.department}</Text>
          </LinearGradient>

          {/* Modal Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Rating & Experience */}
            <View style={styles.modalBadgeContainer}>
              <View style={[styles.modalBadge, {
              backgroundColor: '#FFB80015'
            }]}>
                <Ionicons name="star" size={wp(3.5)} color="#FFB800" />
                <Text style={styles.modalBadgeText}>{doctorData.rating} ★</Text>
              </View>
              <View style={[styles.modalBadge, {
              backgroundColor: COLORS.primary + '15'
            }]}>
                <Ionicons name="briefcase-outline" size={wp(3.5)} color={COLORS.primary} />
                <Text style={styles.modalBadgeText}>{doctorData.experience}</Text>
              </View>
              <View style={[styles.modalBadge, {
              backgroundColor: COLORS.success + '15'
            }]}>
                <Ionicons name="time-outline" size={wp(3.5)} color={COLORS.success} />
                <Text style={styles.modalBadgeText}>Slots: {doctorData.availableSlots}</Text>
              </View>
            </View>

            {/* Info Items - No Phone, No Emergency */}
            <View style={styles.modalInfoSection}>
              <View style={styles.modalInfoItem}>
                <Ionicons name="medkit-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Qualification</Text>
                  <Text style={styles.modalInfoValue}>{doctorData.qualification}</Text>
                </View>
              </View>

              <View style={styles.modalInfoItem}>
                <Ionicons name="mail-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Email</Text>
                  <Text style={styles.modalInfoValue}>{doctorData.email}</Text>
                </View>
              </View>

              <View style={styles.modalInfoItem}>
                <Ionicons name="calendar-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Schedule</Text>
                  <Text style={styles.modalInfoValue}>{doctorData.schedule}</Text>
                </View>
              </View>

              <View style={styles.modalInfoItem}>
                <Ionicons name="business-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Location</Text>
                  <Text style={styles.modalInfoValue}>{doctorData.location}</Text>
                </View>
              </View>

              <View style={styles.modalInfoItem}>
                <Ionicons name="calendar-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Joined</Text>
                  <Text style={styles.modalInfoValue}>{doctorData.joinDate}</Text>
                </View>
              </View>

              {/* Performance Metrics */}
              <View style={styles.modalInfoItem}>
                <Ionicons name="stats-chart-outline" size={wp(4.5)} color={COLORS.primary} />
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalInfoLabel}>Performance</Text>
                  <Text style={styles.modalInfoValue}>
                    Satisfaction: {doctorData.performance.satisfaction}% • Avg Wait: {doctorData.performance.avgWait}min
                  </Text>
                </View>
              </View>
            </View>

            {/* Certifications */}
            <View style={styles.modalCertSection}>
              <Text style={styles.modalCertTitle}>Certifications</Text>
              <View style={styles.modalCertContainer}>
                {doctorData.certifications.map((cert, index) => <View key={index} style={[styles.modalCertItem, {
                backgroundColor: doctorData.color + '15'
              }]}>
                    <Ionicons name="checkmark-circle" size={wp(3)} color={doctorData.color} />
                    <Text style={[styles.modalCertText, {
                  color: doctorData.color
                }]}>{cert}</Text>
                  </View>)}
              </View>
            </View>

            {/* Bio */}
            <View style={styles.modalBioSection}>
              <Text style={styles.modalBioTitle}>About</Text>
              <Text style={styles.modalBioText}>{doctorData.bio}</Text>
            </View>

            {/* Patient Stats */}
            <View style={styles.modalPatientStats}>
              <View style={[styles.modalPatientStatItem, {
              backgroundColor: COLORS.primary + '10'
            }]}>
                <Text style={[styles.modalPatientStatNumber, {
                color: COLORS.primary
              }]}>
                  {doctorData.totalPatients}
                </Text>
                <Text style={styles.modalPatientStatLabel}>Total Patients</Text>
              </View>
              <View style={[styles.modalPatientStatItem, {
              backgroundColor: COLORS.success + '10'
            }]}>
                <Text style={[styles.modalPatientStatNumber, {
                color: COLORS.success
              }]}>
                  {doctorData.successRate}%
                </Text>
                <Text style={styles.modalPatientStatLabel}>Success Rate</Text>
              </View>
              <View style={[styles.modalPatientStatItem, {
              backgroundColor: COLORS.warning + '10'
            }]}>
                <Text style={[styles.modalPatientStatNumber, {
                color: COLORS.warning
              }]}>
                  {doctorData.performance.satisfaction}%
                </Text>
                <Text style={styles.modalPatientStatLabel}>Satisfaction</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.modalCloseBtnBottom, {
            backgroundColor: doctorData.color
          }]} onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCloseBtnBottomText}>Close Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 1
    }} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Section - Doctor Info */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.doctorName}>{doctorData.name}</Text>
                <Text style={styles.specialization}>{doctorData.specialization}</Text>
                <Text style={styles.department}>{doctorData.department}</Text>
              </View>
              <TouchableOpacity style={styles.profileCircle} onPress={() => setShowProfileModal(true)} activeOpacity={0.8}>
                <LinearGradient colors={[doctorData.color, doctorData.color2]} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{doctorData.avatar}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Rating & Experience Badges */}
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, styles.cardShadow]}>
                <Ionicons name="star" size={wp(3.5)} color="#FFB800" />
                <Text style={styles.badgeText}>{doctorData.rating} ★</Text>
              </View>
              <View style={[styles.badge, styles.cardShadow]}>
                <Ionicons name="briefcase-outline" size={wp(3.5)} color={COLORS.primary} />
                <Text style={styles.badgeText}>{doctorData.experience}</Text>
              </View>
              <View style={[styles.badge, styles.cardShadow]}>
                <Ionicons name="time-outline" size={wp(3.5)} color={COLORS.success} />
                <Text style={styles.badgeText}>Slots: {doctorData.availableSlots}</Text>
              </View>
            </View>
          </View>

          {/* Next Patient Info */}
          <View style={[styles.nextPatientCard, styles.cardShadow]}>
            <LinearGradient colors={[COLORS.primary + '15', COLORS.secondary + '10']} style={styles.nextPatientGradient}>
              <View style={styles.nextPatientLeft}>
                <View style={styles.nextPatientIcon}>
                  <Ionicons name="person-outline" size={wp(6)} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.nextPatientLabel}>Next Patient</Text>
                  <Text style={styles.nextPatientName}>{doctorData.nextPatient}</Text>
                  <Text style={styles.nextPatientToken}>Token: {doctorData.nextToken}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.nextPatientBtn, styles.cardShadow]} onPress={() => handleActionPress('CallNextPatientScreen')}>
                <Text style={styles.nextPatientBtnText}>Call</Text>
                <Ionicons name="arrow-forward" size={wp(4)} color={COLORS.white} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => <View key={index} style={[styles.statCard, styles.cardShadow]}>
                <View style={[styles.statIcon, {
              backgroundColor: stat.bgColor
            }]}>
                  <Ionicons name={stat.icon} size={wp(5.5)} color={stat.color} />
                </View>
                <Text style={[styles.statNumber, {
              color: stat.color
            }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>)}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map(action => <TouchableOpacity key={action.id} style={[styles.actionCard, styles.cardShadow]} activeOpacity={0.8} onPress={() => {
            if (action.onPress) {
              action.onPress();
            } else if (action.screen) {
              handleActionPress(action.screen);
            }
          }}>
                <View style={[styles.actionIcon, {
              backgroundColor: action.color + '15'
            }]}>
                  <Ionicons name={action.icon} size={wp(6)} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </TouchableOpacity>)}
          </View>

          {/* Today's Schedule */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <View style={[styles.scheduleCard, styles.cardShadow]}>
              <View style={styles.scheduleItem}>
                <View style={styles.scheduleTime}>
                  <Ionicons name="time-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.scheduleTimeText}>09:00 AM - 01:00 PM</Text>
                </View>
                <View style={[styles.scheduleStatusBadge, {
                backgroundColor: COLORS.success + '15'
              }]}>
                  <Text style={[styles.scheduleStatusText, {
                  color: COLORS.success
                }]}>Active</Text>
                </View>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleItem}>
                <View style={styles.scheduleTime}>
                  <Ionicons name="time-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.scheduleTimeText}>02:00 PM - 06:00 PM</Text>
                </View>
                <View style={[styles.scheduleStatusBadge, {
                backgroundColor: COLORS.warning + '15'
              }]}>
                  <Text style={[styles.scheduleStatusText, {
                  color: COLORS.warning
                }]}>Upcoming</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats Footer */}
          <View style={[styles.footerStats, styles.cardShadow]}>
            <View style={styles.footerStatItem}>
              <Ionicons name="medkit-outline" size={wp(4)} color={COLORS.primary} />
              <Text style={styles.footerStatText}>Total: {doctorData.totalPatients}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerStatItem}>
              <Ionicons name="thumbs-up-outline" size={wp(4)} color={COLORS.success} />
              <Text style={styles.footerStatText}>Success: {doctorData.successRate}%</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerStatItem}>
              <Ionicons name="people-outline" size={wp(4)} color={COLORS.warning} />
              <Text style={styles.footerStatText}>Queue: {doctorData.queuePosition}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine • CDA Hospital Islamabad</Text>
            <Text style={styles.footerSub}>Doctor Panel</Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Doctor Profile Modal */}
      {renderProfileModal()}
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
    height: hp(28)
  },
  safeArea: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp(3)
  },
  // Header Section
  header: {
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(1) : StatusBar.currentHeight + hp(1),
    paddingBottom: hp(1.5)
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  greeting: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '500',
    opacity: 0.8
  },
  doctorName: {
    color: COLORS.white,
    fontSize: wp(5.5),
    fontWeight: 'bold',
    marginTop: 2
  },
  specialization: {
    color: COLORS.white,
    fontSize: wp(3.5),
    marginTop: 2,
    opacity: 0.9
  },
  department: {
    color: COLORS.white,
    fontSize: wp(3),
    opacity: 0.7,
    marginTop: 2
  },
  profileCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
    overflow: 'hidden'
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: wp(6),
    fontWeight: 'bold',
    color: COLORS.white
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1)
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: wp(5),
    gap: 6
  },
  cardShadow: {
    ...SHADOWS.medium
  },
  badgeText: {
    color: COLORS.text,
    fontSize: wp(2.8)
  },
  // Next Patient Card
  nextPatientCard: {
    marginHorizontal: wp(5),
    marginBottom: hp(1.5),
    borderRadius: wp(4),
    overflow: 'hidden'
  },
  nextPatientGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  nextPatientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3)
  },
  nextPatientIcon: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small
  },
  nextPatientLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  nextPatientName: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: COLORS.text
  },
  nextPatientToken: {
    fontSize: wp(3),
    color: COLORS.primary,
    fontWeight: '500'
  },
  nextPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
    borderRadius: wp(3),
    gap: 8
  },
  nextPatientBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: wp(3)
  },
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(5),
    gap: wp(2),
    marginBottom: hp(1.5)
  },
  statCard: {
    flex: 1,
    minWidth: (width - wp(14)) / 2 - wp(2),
    padding: wp(3),
    borderRadius: wp(4),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statIcon: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3)
  },
  statNumber: {
    fontSize: wp(5.5),
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    marginTop: 2
  },
  // Quick Actions
  sectionTitle: {
    color: COLORS.text,
    fontSize: wp(4.5),
    fontWeight: 'bold',
    marginHorizontal: wp(5),
    marginBottom: hp(1)
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(5),
    gap: wp(2.5)
  },
  actionCard: {
    width: (width - wp(15)) / 2 - wp(2),
    padding: wp(3),
    borderRadius: wp(4),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  actionIcon: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3)
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: '600',
    marginBottom: 2
  },
  actionDesc: {
    color: COLORS.textSecondary,
    fontSize: wp(2.5)
  },
  // Schedule Section
  scheduleSection: {
    marginTop: hp(1.5)
  },
  scheduleCard: {
    marginHorizontal: wp(5),
    padding: wp(4),
    borderRadius: wp(4),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  scheduleTimeText: {
    color: COLORS.text,
    fontSize: wp(3.2)
  },
  scheduleStatusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.2),
    borderRadius: wp(3)
  },
  scheduleStatusText: {
    fontSize: wp(2.5),
    fontWeight: '500'
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: hp(0.8)
  },
  // Footer Stats
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1.5),
    marginHorizontal: wp(5),
    paddingVertical: hp(1.2),
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  footerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8
  },
  footerDivider: {
    width: 1,
    height: hp(2.5),
    backgroundColor: COLORS.border
  },
  footerStatText: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: hp(2),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(5)
  },
  footerText: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  footerSub: {
    fontSize: wp(2.5),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  },
  // ─── Profile Modal Styles ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.88,
    backgroundColor: COLORS.card,
    borderRadius: wp(5),
    overflow: 'hidden'
  },
  modalHeader: {
    padding: wp(4),
    paddingTop: wp(6),
    alignItems: 'center',
    position: 'relative'
  },
  modalCloseBtn: {
    position: 'absolute',
    top: wp(2.5),
    right: wp(3),
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalAvatarContainer: {
    marginBottom: hp(0.5)
  },
  modalAvatar: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white
  },
  modalAvatarText: {
    fontSize: wp(7),
    fontWeight: 'bold',
    color: COLORS.white
  },
  modalDoctorName: {
    color: COLORS.white,
    fontSize: wp(5.5),
    fontWeight: 'bold'
  },
  modalSpecialty: {
    color: COLORS.white + '90',
    fontSize: wp(3.5),
    marginTop: 2
  },
  modalDepartment: {
    color: COLORS.white + '70',
    fontSize: wp(3),
    marginTop: 2
  },
  modalBody: {
    padding: wp(4)
  },
  modalBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(1.5)
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    gap: 6
  },
  modalBadgeText: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: COLORS.text
  },
  modalInfoSection: {
    marginBottom: hp(1.5)
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: wp(3)
  },
  modalInfoContent: {
    flex: 1,
    paddingVertical: hp(0.2)
  },
  modalInfoLabel: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  modalInfoValue: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  modalCertSection: {
    marginBottom: hp(1.5)
  },
  modalCertTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(0.5)
  },
  modalCertContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2)
  },
  modalCertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    gap: 6
  },
  modalCertText: {
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  modalBioSection: {
    marginBottom: hp(1.5)
  },
  modalBioTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(0.3)
  },
  modalBioText: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    lineHeight: hp(2.2)
  },
  modalPatientStats: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.5)
  },
  modalPatientStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: wp(2),
    borderRadius: wp(3)
  },
  modalPatientStatNumber: {
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  modalPatientStatLabel: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary,
    marginTop: 2
  },
  modalCloseBtnBottom: {
    paddingVertical: hp(1.2),
    borderRadius: wp(3),
    alignItems: 'center'
  },
  modalCloseBtnBottomText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '700'
  }
});
export default DoctorDashboardScreen;