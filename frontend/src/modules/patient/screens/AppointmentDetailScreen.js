import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, Alert, Share, Platform } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SHADOWS } from '../../../theme';
import { showConfirm } from '../../../components/confirm';
import { useTheme } from "../../../context/ThemeContext";
import { SvgXml } from "react-native-svg";
import { useSession } from "../../../context/SessionContext";
import { downloadAppointmentPdf, appointmentQrSvg } from "../services/appointmentPdf";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const AppointmentDetailScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const { user } = useSession();
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const styles = makeStyles(COLORS);
  const appointment = route?.params?.appointment || {
    id: 'SHL-99281',
    doctorName: 'Dr. Sarah Ahmed',
    specialty: 'Cardiologist',
    date: 'Jun 27, 2026',
    time: '10:30 AM',
    status: 'Confirmed',
    hospital: 'CDA Hospital Islamabad',
    tokenNo: 'A-12',
    department: 'Chronic OPD',
    queuePosition: 3,
    estimatedWaitTime: '15 mins',
    type: 'Follow-up'
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const STATUS_MAP = {
    Confirmed: {
      color: COLORS.success || '#2ECC71',
      bg: (COLORS.success || '#2ECC71') + '15'
    },
    Pending: {
      color: COLORS.warning || '#F39C12',
      bg: (COLORS.warning || '#F39C12') + '15'
    },
    Completed: {
      color: COLORS.primary,
      bg: COLORS.primary + '15'
    },
    Cancelled: {
      color: COLORS.danger || '#E74C3C',
      bg: (COLORS.danger || '#E74C3C') + '15'
    },
    'In Progress': {
      color: '#3B82F6',
      bg: '#3B82F615'
    }
  };
  const getStatus = s => STATUS_MAP[s] || {
    color: COLORS.textSecondary,
    bg: COLORS.border || '#E8EDF2'
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await Share.share({
        message: `📋 Appointment Details\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `🆔 ID: ${appointment.id}\n` + `👨‍⚕️ Doctor: ${appointment.doctorName}\n` + `🏥 Specialty: ${appointment.specialty}\n` + `📅 Date: ${appointment.date}\n` + `⏰ Time: ${appointment.time}\n` + `📍 Location: ${appointment.hospital}\n` + `🎫 Token: ${appointment.tokenNo}\n` + `📊 Status: ${appointment.status}\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `CDA Hospital Islamabad`,
        title: 'Appointment Details'
      });
    } catch (e) {
      Alert.alert('Error', 'Unable to share appointment details');
    }
  };
  const handleCancel = () => {
    showConfirm({
      title: 'Cancel Appointment',
      message: `Are you sure you want to cancel your appointment with ${appointment.doctorName}?`,
      confirmLabel: 'Yes, Cancel',
      cancelLabel: 'No, Keep It',
      destructive: true,
      icon: 'close-circle-outline',
      onConfirm: () => {
        Alert.alert('Success', 'Appointment cancellation request has been sent.');
        navigation.goBack();
      }
    });
  };
  const handleDownloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadAppointmentPdf(appointment, { patientName: user?.name });
    } catch (e) {
      Alert.alert('Download failed', e?.message || 'Could not create the PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  };
  const qrSvg = appointmentQrSvg(appointment);
  const handleReschedule = () => navigation.navigate('BookAppointmentScreen', {
    rescheduleId: appointment.id || appointment._id,
    currentLabel: `${appointment.doctorName || appointment.specialty || 'Specialist'} • ${appointment.time || ''}`.trim()
  });
  const handleViewQueue = () => navigation.navigate('LiveTokenQueueScreen', {
    tokenNo: appointment.tokenNo,
    department: appointment.department
  });
  const sCfg = getStatus(appointment.status);

  // ── Render ────────────────────────────────────────────────────────────────
  return <SafeAreaView style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <LinearGradient colors={[COLORS.primary + '08', COLORS.background, COLORS.background]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity style={[styles.iconBtn, {
        backgroundColor: COLORS.primary + '15'
      }]} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Token card */}
        <View style={styles.tokenCard}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary || '#1A5276']} style={styles.tokenGradient} start={{
          x: 0,
          y: 0
        }} end={{
          x: 1,
          y: 1
        }}>
            <View style={styles.tokenHeader}>
              <View style={styles.tokenTitleRow}>
                <Ionicons name="ticket-outline" size={18} color={COLORS.white} />
                <Text style={styles.tokenTitle}>DIGITAL TOKEN</Text>
              </View>
              <View style={[styles.statusBadge, {
              backgroundColor: sCfg.bg
            }]}>
                <View style={[styles.statusDot, {
                backgroundColor: sCfg.color
              }]} />
                <Text style={[styles.statusText, {
                color: sCfg.color
              }]}>{appointment.status}</Text>
              </View>
            </View>

            <Text style={styles.tokenNumber}>{appointment.tokenNo}</Text>
            <Text style={styles.tokenSubText}>Your position in queue</Text>

            <View style={styles.queueInfoRow}>
              {[{
              icon: 'people-outline',
              label: 'Position',
              value: `#${appointment.queuePosition || 3}`
            }, {
              icon: 'time-outline',
              label: 'Wait Time',
              value: appointment.estimatedWaitTime || '15 mins'
            }, {
              icon: 'medical-outline',
              label: 'Dept',
              value: appointment.department || 'Chronic OPD'
            }].map((item, i, arr) => <React.Fragment key={item.label}>
                  <View style={styles.queueInfoItem}>
                    <Ionicons name={item.icon} size={16} color={COLORS.white} />
                    <Text style={styles.queueInfoLabel}>{item.label}</Text>
                    <Text style={styles.queueInfoValue}>{item.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.queueDivider} />}
                </React.Fragment>)}
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qrBox}>
                {qrSvg
                  ? <SvgXml xml={qrSvg} width={120} height={120} />
                  : <Ionicons name="qr-code-outline" size={60} color={COLORS.white} />}
              </View>
              <Text style={styles.qrDesc}>Scan to verify — valid appointment</Text>
            </View>

            <View style={styles.tokenActions}>
              <TouchableOpacity style={styles.tokenActionBtn} onPress={handleViewQueue}>
                <Ionicons name="timer-outline" size={18} color={COLORS.white} />
                <Text style={styles.tokenActionText}>View Queue</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Info */}
        <Text style={styles.sectionTitle}>Appointment Information</Text>
        <View style={styles.infoCard}>
          {[['person-outline', 'Doctor', appointment.doctorName], ['medical-outline', 'Specialty', appointment.specialty], ['calendar-outline', 'Date', appointment.date], ['time-outline', 'Time', appointment.time], ['business-outline', 'Location', appointment.hospital], ['document-text-outline', 'Appointment ID', appointment.id], ['clipboard-outline', 'Visit Type', appointment.type || 'Follow-up']].map(([icon, label, value]) => <DetailRow key={label} icon={icon} label={label} value={value} />)}
        </View>

        {/* Instructions */}
        <Text style={[styles.sectionTitle, {
        marginTop: hp(2)
      }]}>Important Instructions</Text>
        <View style={styles.infoCard}>
          {[['time-outline', 'Arrive 15 minutes before your scheduled time'], ['id-card-outline', 'Bring your CDA Card and CNIC for verification'], ['document-text-outline', 'Carry previous medical records and reports'], ['medkit-outline', 'List of current medications (if any)']].map(([icon, text]) => <View key={text} style={styles.instructionItem}>
              <Ionicons name={icon} size={18} color={COLORS.primary} />
              <Text style={styles.instructionText}>{text}</Text>
            </View>)}
        </View>

        {/* Buttons */}
        <View style={styles.btnContainer}>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPdf} disabled={pdfBusy} activeOpacity={0.85}>
            {pdfBusy
              ? <Ionicons name="hourglass-outline" size={20} color={COLORS.primary} />
              : <Ionicons name="download-outline" size={20} color={COLORS.primary} />}
            <Text style={styles.downloadText}>{pdfBusy ? 'Preparing PDF…' : 'Download PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rescheduleBtn} onPress={handleReschedule} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary || '#1A5276']} style={styles.rescheduleGradient} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 0
          }}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.danger || '#E74C3C'} />
            <Text style={styles.cancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        </View>
        <View style={{
        height: hp(2)
      }} />
      </ScrollView>
    </SafeAreaView>;
};
const DetailRow = ({
  icon,
  label,
  value
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  return <View style={styles.detailRow}>
    <View style={[styles.detailIconWrap, {
      backgroundColor: COLORS.primary + '15'
    }]}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(10)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1) : hp(2),
    paddingBottom: hp(1.5)
  },
  iconBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: COLORS.backgroundSecondary || '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text
  },
  tokenCard: {
    borderRadius: wp(5),
    overflow: 'hidden',
    marginTop: hp(1),
    marginBottom: hp(2.5),
    ...SHADOWS.large
  },
  tokenGradient: {
    padding: wp(5),
    paddingBottom: wp(3)
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  tokenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5)
  },
  tokenTitle: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '700',
    letterSpacing: 1
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
    gap: wp(1)
  },
  statusDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75)
  },
  statusText: {
    fontSize: wp(2.5),
    fontWeight: '600'
  },
  tokenNumber: {
    color: COLORS.white,
    fontSize: wp(14),
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2
  },
  tokenSubText: {
    color: COLORS.white + '80',
    fontSize: wp(3.2),
    textAlign: 'center',
    marginTop: hp(0.2),
    fontWeight: '500'
  },
  queueInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white + '15',
    borderRadius: wp(3),
    padding: hp(1.2),
    marginTop: hp(1.5),
    marginBottom: hp(1.5)
  },
  queueInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.2)
  },
  queueInfoLabel: {
    color: COLORS.white + '70',
    fontSize: wp(2.5),
    fontWeight: '500'
  },
  queueInfoValue: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '700'
  },
  queueDivider: {
    width: 1,
    height: hp(3.5),
    backgroundColor: COLORS.white + '20'
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: hp(0.5)
  },
  qrBox: {
    borderRadius: wp(3),
    backgroundColor: '#FFFFFF',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrDesc: {
    color: COLORS.white + '70',
    fontSize: wp(2.8),
    marginTop: hp(0.8),
    fontWeight: '500'
  },
  tokenActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(1.5)
  },
  tokenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: COLORS.white + '20',
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
    borderRadius: wp(3)
  },
  tokenActionText: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1.2),
    marginLeft: wp(1)
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    padding: wp(3.5),
    borderWidth: 1,
    borderColor: COLORS.border || '#E8EDF2',
    ...SHADOWS.small
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E8EDF2'
  },
  detailIconWrap: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3)
  },
  detailContent: {
    flex: 1
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  detailValue: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: '600',
    marginTop: hp(0.1)
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.6),
    gap: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E8EDF2'
  },
  instructionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.2),
    lineHeight: hp(2.2)
  },
  btnContainer: {
    marginTop: hp(2),
    gap: hp(1.5)
  },
  rescheduleBtn: {
    borderRadius: wp(3.5),
    overflow: 'hidden',
    ...SHADOWS.button
  },
  rescheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(1.8),
    gap: wp(2)
  },
  rescheduleText: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: '700',
    letterSpacing: 0.5
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(1.8),
    borderRadius: wp(3.5),
    borderWidth: 1.5,
    borderColor: COLORS.danger || '#E74C3C',
    gap: wp(2),
    backgroundColor: (COLORS.danger || '#E74C3C') + '05'
  },
  cancelText: {
    color: COLORS.danger || '#E74C3C',
    fontSize: wp(4),
    fontWeight: '700'
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(1.8),
    borderRadius: wp(3.5),
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: wp(2),
    backgroundColor: COLORS.primary + '0D'
  },
  downloadText: {
    color: COLORS.primary,
    fontSize: wp(4),
    fontWeight: '700'
  }
});
export default AppointmentDetailScreen;