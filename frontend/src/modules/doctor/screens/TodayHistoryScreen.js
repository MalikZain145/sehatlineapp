// src/screens/doctor/TodayHistoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, SafeAreaView, Image, RefreshControl, ActivityIndicator, FlatList, Dimensions, Alert, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';
const TodayHistoryScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // ── State ──────────────────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [todayStats, setTodayStats] = useState({
    total: 0,
    consultation: 0,
    pharmacy: 0,
    laboratory: 0
  });

  // ── Date Helpers ──────────────────────────────────────────────────
  const getTodayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatTime = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  const formatDateFull = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // ─── Get Stable Key ──────────────────────────────────────────────
  const getStableKey = item => {
    if (item.historyId) return item.historyId;
    if (item.completedId) return item.completedId;
    if (item.consultationId) return item.consultationId;
    if (item.patientVisitId) return item.patientVisitId;
    return `${item.patientId || 'unknown'}_${item.completedAt}_${item.patientToken || '0'}`;
  };

  // ─── Get Consultation Type ───────────────────────────────────────
  const getConsultationType = item => {
    if (item.type === 'pharmacy' || item.prescriptions && item.prescriptions.length > 0) {
      return 'pharmacy';
    }
    if (item.type === 'lab' || item.testReferral) {
      return 'laboratory';
    }
    return 'consultation';
  };
  const getTypeLabel = item => {
    const type = getConsultationType(item);
    switch (type) {
      case 'pharmacy':
        return 'Pharmacy';
      case 'laboratory':
        return 'Laboratory';
      default:
        return 'Consultation';
    }
  };
  const getTypeIcon = item => {
    const type = getConsultationType(item);
    switch (type) {
      case 'pharmacy':
        return 'medkit-outline';
      case 'laboratory':
        return 'flask-outline';
      default:
        return 'chatbubble-outline';
    }
  };
  const getTypeColor = item => {
    const type = getConsultationType(item);
    switch (type) {
      case 'pharmacy':
        return COLORS.success;
      case 'laboratory':
        return '#3B82F6';
      default:
        return COLORS.primary;
    }
  };

  // ─── Generate Realistic Consultation Times ──────────────────────
  const generateRealisticTimes = count => {
    const times = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 8:30 AM
    const startTime = new Date(today);
    startTime.setHours(8, 30, 0, 0);

    // Doctor's break: 12:30 PM - 1:00 PM (30 minutes)
    const breakStart = new Date(today);
    breakStart.setHours(12, 30, 0, 0);
    const breakEnd = new Date(today);
    breakEnd.setHours(13, 0, 0, 0);
    let current = new Date(startTime);
    for (let i = 0; i < count; i++) {
      // Check if current time falls within break
      if (current >= breakStart && current < breakEnd) {
        // Skip to after break (1:00 PM)
        current = new Date(breakEnd);
      }

      // Only add if time is not in the future
      if (current <= now) {
        times.push(new Date(current));
      }

      // Add gap: 15-20 minutes between patients
      const gapMinutes = 15 + Math.floor(Math.random() * 6); // 15-20 minutes
      current = new Date(current.getTime() + gapMinutes * 60000);
    }
    return times;
  };

  // ─── Load Today's Patients ──────────────────────────────────────
  const loadTodayPatients = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      if (!data) {
        setPatients([]);
        setTodayStats({
          total: 0,
          consultation: 0,
          pharmacy: 0,
          laboratory: 0
        });
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(data);
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ── Filter: Today's date AND completedAt <= current time ──
      const todayPatients = parsed.filter(item => {
        if (!item.completedAt) return false;
        const itemDate = new Date(item.completedAt);
        const itemDateOnly = new Date(itemDate);
        itemDateOnly.setHours(0, 0, 0, 0);
        const isToday = itemDateOnly.getTime() === today.getTime();
        const isCompleted = itemDate.getTime() <= now.getTime();
        return isToday && isCompleted;
      });

      // ── Remove duplicates using deterministic keys ──
      const uniqueMap = new Map();
      todayPatients.forEach(item => {
        const key = `${item.patientId || 'unknown'}_${item.completedAt}_${item.patientToken || '0'}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      let uniquePatients = Array.from(uniqueMap.values());

      // ── Sort by time ──
      uniquePatients = uniquePatients.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateA - dateB;
      });

      // ── Generate realistic times for patients without proper time ──
      if (uniquePatients.length > 0) {
        const realisticTimes = generateRealisticTimes(uniquePatients.length);
        uniquePatients = uniquePatients.map((item, index) => {
          if (index < realisticTimes.length) {
            return {
              ...item,
              completedAt: realisticTimes[index].toISOString()
            };
          }
          return item;
        });
      }

      // ── Sort: Newest first (descending) ──
      const sorted = uniquePatients.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
      setPatients(sorted);

      // ── Calculate Stats ──
      let consultation = 0;
      let pharmacy = 0;
      let laboratory = 0;
      sorted.forEach(item => {
        const type = getConsultationType(item);
        if (type === 'consultation') consultation++;else if (type === 'pharmacy') pharmacy++;else if (type === 'laboratory') laboratory++;
      });
      setTodayStats({
        total: sorted.length,
        consultation,
        pharmacy,
        laboratory
      });
      setCurrentTime(getCurrentTimeString());
    } catch (error) {
      console.error('Error loading today patients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Initial Load ─────────────────────────────────────────────────
  useEffect(() => {
    loadTodayPatients();
  }, [loadTodayPatients]);

  // ─── Refresh ──────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayPatients();
    setRefreshing(false);
  }, [loadTodayPatients]);

  // ─── Handle Patient Press ────────────────────────────────────────
  const handlePatientPress = item => {
    setSelectedPatient(item);
    setShowDetailModal(true);
  };

  // ─── Render Patient Detail Modal ──────────────────────────────────
  const renderPatientDetailModal = () => {
    if (!selectedPatient) return null;
    const typeLabel = getTypeLabel(selectedPatient);
    const typeColor = getTypeColor(selectedPatient);
    const typeIcon = getTypeIcon(selectedPatient);
    const isPharmacy = getConsultationType(selectedPatient) === 'pharmacy';
    const isLaboratory = getConsultationType(selectedPatient) === 'laboratory';
    return <Modal visible={showDetailModal} transparent={true} animationType="fade" onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, SHADOWS.large]}>
            {/* ── Modal Header ── */}
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 0
          }}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {selectedPatient.patientName?.charAt(0) || 'P'}
                  </Text>
                </View>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalPatientName}>{selectedPatient.patientName}</Text>
                  <Text style={styles.modalPatientToken}>
                    Token #{selectedPatient.patientToken || '—'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={wp(5)} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* ── Modal Body ── */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Badge */}
              <View style={[styles.modalTypeBadge, {
              backgroundColor: typeColor + '15'
            }]}>
                <Ionicons name={typeIcon} size={wp(3.5)} color={typeColor} />
                <Text style={[styles.modalTypeText, {
                color: typeColor
              }]}>
                  {typeLabel}
                </Text>
              </View>

              {/* Details Grid */}
              <View style={styles.modalDetailsGrid}>
                <View style={styles.modalDetailItem}>
                  <Ionicons name="clipboard-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.modalDetailLabel}>Diagnosis</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedPatient.diagnosis || 'N/A'}
                  </Text>
                </View>

                <View style={styles.modalDetailItem}>
                  <Ionicons name="medkit-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.modalDetailLabel}>Prescriptions</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedPatient.prescriptions?.length || 0} item(s)
                  </Text>
                </View>

                {isLaboratory && selectedPatient.testReferral && <View style={styles.modalDetailItem}>
                    <Ionicons name="flask-outline" size={wp(4)} color={COLORS.primary} />
                    <Text style={styles.modalDetailLabel}>Lab Referral</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedPatient.testReferral}
                    </Text>
                  </View>}

                <View style={styles.modalDetailItem}>
                  <Ionicons name="time-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.modalDetailLabel}>Completed At</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatTime(selectedPatient.completedAt)}
                  </Text>
                </View>

                <View style={styles.modalDetailItem}>
                  <Ionicons name="calendar-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.modalDetailLabel}>Date</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatDateFull(selectedPatient.completedAt)}
                  </Text>
                </View>

                <View style={styles.modalDetailItem}>
                  <Ionicons name="person-outline" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.modalDetailLabel}>Doctor</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedPatient.doctorName || 'Dr. Unknown'}
                  </Text>
                </View>
              </View>

              {/* Prescription List (if any) */}
              {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 && <View style={styles.modalPrescriptionSection}>
                  <Text style={styles.modalPrescriptionTitle}>
                    <Ionicons name="medkit-outline" size={wp(3.5)} color={COLORS.primary} />
                    {' Prescribed Medicines'}
                  </Text>
                  {selectedPatient.prescriptions.map((prescription, idx) => <View key={idx} style={styles.modalPrescriptionItem}>
                      <Text style={styles.modalPrescriptionIndex}>{idx + 1}.</Text>
                      <View style={styles.modalPrescriptionContent}>
                        <Text style={styles.modalPrescriptionName}>
                          {prescription.medicine || prescription.name || 'Medicine'}
                        </Text>
                        <Text style={styles.modalPrescriptionDosage}>
                          {prescription.dosage || prescription.dose || ''}
                        </Text>
                      </View>
                    </View>)}
                </View>}

              {/* Status Footer */}
              <View style={[styles.modalStatusFooter, {
              borderTopColor: typeColor + '20'
            }]}>
                <Ionicons name="checkmark-circle" size={wp(4)} color={COLORS.success} />
                <Text style={styles.modalStatusText}>
                  {isPharmacy ? 'Sent to Pharmacy' : isLaboratory ? 'Referred to Lab' : 'Consultation Completed'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>;
  };

  // ─── Render Patient Card ──────────────────────────────────────────
  const renderPatientCard = ({
    item,
    index
  }) => {
    const typeLabel = getTypeLabel(item);
    const typeColor = getTypeColor(item);
    const typeIcon = getTypeIcon(item);
    const completedTime = formatTime(item.completedAt);
    const completedDate = formatDate(item.completedAt);
    const isPharmacy = getConsultationType(item) === 'pharmacy';
    const isLaboratory = getConsultationType(item) === 'laboratory';
    return <TouchableOpacity style={[styles.historyCard, SHADOWS.small]} activeOpacity={0.7} onPress={() => handlePatientPress(item)}>
        {/* ── Left Color Bar ── */}
        <View style={[styles.colorBar, {
        backgroundColor: typeColor
      }]} />

        <View style={styles.cardContent}>
          {/* ── Header ── */}
          <View style={styles.cardHeader}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.patientAvatar}>
              <Text style={styles.avatarText}>
                {item.patientName?.charAt(0) || 'P'}
              </Text>
            </LinearGradient>

            <View style={styles.cardInfo}>
              <Text style={styles.patientName} numberOfLines={1}>
                {item.patientName}
              </Text>
              <Text style={styles.patientToken}>
                Token #{item.patientToken || '—'}
              </Text>
            </View>

            <View style={[styles.typeBadge, {
            backgroundColor: typeColor + '15'
          }]}>
              <Ionicons name={typeIcon} size={wp(2.5)} color={typeColor} />
              <Text style={[styles.typeText, {
              color: typeColor
            }]}>
                {typeLabel}
              </Text>
            </View>
          </View>

          {/* ── Body ── */}
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Ionicons name="clipboard-outline" size={wp(3.2)} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Diagnosis:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.diagnosis || 'N/A'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="medkit-outline" size={wp(3.2)} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Medicines:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.prescriptions?.length || 0} item(s)
              </Text>
            </View>

            {isLaboratory && item.testReferral && <View style={styles.detailRow}>
                <Ionicons name="flask-outline" size={wp(3.2)} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Lab Referral:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.testReferral}
                </Text>
              </View>}

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={wp(3.2)} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>
                {completedTime}
                <Text style={styles.dateSuffix}> • {completedDate}</Text>
              </Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={[styles.cardFooter, {
          borderTopColor: typeColor + '20'
        }]}>
            <Text style={styles.doctorName}>
              <Ionicons name="person-outline" size={wp(2.5)} color={COLORS.textLight} />
              {' '}{item.doctorName || 'Dr. Unknown'}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={wp(2.8)} color={COLORS.success} />
              <Text style={styles.statusText}>
                {isPharmacy ? 'Sent to Pharmacy' : isLaboratory ? 'Referred to Lab' : 'Consulted'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>;
  };

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Today's Completed</Text>
            <Text style={styles.headerSub}>
              {getTodayDateString()} • Completed until {currentTime || getCurrentTimeString()}
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={wp(5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── STATS BANNER ──────────────────────────────────────────── */}
        <View style={[styles.statsBanner, SHADOWS.small]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: COLORS.primary
          }]}>
              {todayStats.total}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: COLORS.primary
          }]}>
              {todayStats.consultation}
            </Text>
            <Text style={styles.statLabel}>Consult</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: COLORS.success
          }]}>
              {todayStats.pharmacy}
            </Text>
            <Text style={styles.statLabel}>Pharmacy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: '#3B82F6'
          }]}>
              {todayStats.laboratory}
            </Text>
            <Text style={styles.statLabel}>Lab</Text>
          </View>
        </View>

        {/* ─── PATIENT LIST ──────────────────────────────────────────── */}
        <FlatList data={patients} keyExtractor={item => getStableKey(item)} renderItem={renderPatientCard} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={wp(15)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No Consultations Today</Text>
              <Text style={styles.emptySub}>{getTodayDateString()}</Text>
              <Text style={styles.emptySub}>No patients completed today</Text>
            </View>} />

        {/* ─── FOOTER ──────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, {
          color: COLORS.primary
        }]}>
            End of Today's Consultations
          </Text>
          <Text style={styles.footerSub}>
            {getTodayDateString()} • {currentTime || getCurrentTimeString()}
          </Text>
        </View>
      </SafeAreaView>

      {/* ─── Patient Detail Modal ────────────────────────────────────── */}
      {renderPatientDetailModal()}
    </View>;
};

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: hp(1),
    fontSize: wp(3.5),
    color: COLORS.textSecondary
  },
  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1.5) : (StatusBar.currentHeight || 28) + 14,
    paddingBottom: hp(1.5),
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '30'
  },
  menuBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2)
  },
  headerLogo: {
    width: wp(10),
    height: wp(10),
    resizeMode: 'contain'
  },
  headerTitle: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: COLORS.text
  },
  headerSub: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    marginTop: -hp(0.2)
  },
  refreshBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  // ── Stats Banner ──────────────────────────────────────────────────
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(0.6)
  },
  statNumber: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: COLORS.text
  },
  statLabel: {
    fontSize: wp(2.2),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  statDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: COLORS.border,
    alignSelf: 'center'
  },
  // ── List ─────────────────────────────────────────────────────────
  listContent: {
    padding: wp(4),
    paddingBottom: hp(2)
  },
  // ─── History Card ──────────────────────────────────────────────────
  historyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  colorBar: {
    width: wp(1.2),
    flexShrink: 0
  },
  cardContent: {
    flex: 1,
    padding: wp(3.5)
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.3)
  },
  patientAvatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5)
  },
  avatarText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.white
  },
  cardInfo: {
    flex: 1
  },
  patientName: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  patientToken: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.15),
    borderRadius: wp(2),
    gap: wp(0.5)
  },
  typeText: {
    fontSize: wp(2.2),
    fontWeight: '600'
  },
  cardBody: {
    paddingVertical: hp(0.2)
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginVertical: hp(0.15)
  },
  detailLabel: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary,
    fontWeight: '500',
    width: wp(16)
  },
  detailValue: {
    flex: 1,
    fontSize: wp(2.5),
    color: COLORS.text,
    fontWeight: '500'
  },
  dateSuffix: {
    color: COLORS.textLight,
    fontWeight: '400'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.3),
    paddingTop: hp(0.3),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  doctorName: {
    fontSize: wp(2.4),
    color: COLORS.textSecondary
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.8)
  },
  statusText: {
    fontSize: wp(2.4),
    color: COLORS.success,
    fontWeight: '500'
  },
  // ─── Empty State ──────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: hp(10),
    paddingHorizontal: wp(4)
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1)
  },
  emptySub: {
    fontSize: wp(3.2),
    color: COLORS.textLight,
    marginTop: hp(0.3),
    textAlign: 'center'
  },
  // ─── Footer ──────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
    marginHorizontal: wp(4)
  },
  footerText: {
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  footerSub: {
    fontSize: wp(2.2),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  },
  // ─── Modal ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4)
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    overflow: 'hidden'
  },
  modalHeader: {
    padding: wp(4),
    paddingTop: wp(5),
    paddingBottom: wp(4)
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3)
  },
  modalAvatarText: {
    fontSize: wp(5),
    fontWeight: '700',
    color: COLORS.primary
  },
  modalHeaderInfo: {
    flex: 1
  },
  modalPatientName: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.white
  },
  modalPatientToken: {
    fontSize: wp(3),
    color: COLORS.white + '80',
    marginTop: hp(0.1)
  },
  modalCloseBtn: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: wp(4)
  },
  modalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
    gap: wp(1),
    marginBottom: hp(1.5)
  },
  modalTypeText: {
    fontSize: wp(3),
    fontWeight: '600'
  },
  modalDetailsGrid: {
    gap: hp(0.8)
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: wp(2.5),
    borderRadius: wp(2),
    gap: wp(2)
  },
  modalDetailLabel: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    fontWeight: '500',
    width: wp(20)
  },
  modalDetailValue: {
    flex: 1,
    fontSize: wp(2.8),
    color: COLORS.text,
    fontWeight: '500'
  },
  modalPrescriptionSection: {
    marginTop: hp(1.5),
    backgroundColor: COLORS.backgroundSecondary,
    padding: wp(3),
    borderRadius: wp(2)
  },
  modalPrescriptionTitle: {
    fontSize: wp(3),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: hp(0.5)
  },
  modalPrescriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.2),
    gap: wp(1.5)
  },
  modalPrescriptionIndex: {
    fontSize: wp(2.6),
    color: COLORS.textLight,
    fontWeight: '500',
    width: wp(4)
  },
  modalPrescriptionContent: {
    flex: 1
  },
  modalPrescriptionName: {
    fontSize: wp(2.8),
    color: COLORS.text,
    fontWeight: '500'
  },
  modalPrescriptionDosage: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  },
  modalStatusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: wp(1.5)
  },
  modalStatusText: {
    fontSize: wp(3.2),
    color: COLORS.success,
    fontWeight: '600'
  }
});
export default TodayHistoryScreen;