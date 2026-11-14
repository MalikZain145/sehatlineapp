// src/screens/doctor/PatientHistoryScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, SafeAreaView, Image, RefreshControl, ActivityIndicator, FlatList, Dimensions, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';

// ─── FORCE CLEAN DUPLICATE DATA ──────────────────────────────────────
const forceCleanDuplicateData = async () => {
  try {
    const data = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Force new unique IDs for ALL records
      const cleaned = parsed.map((item, index) => ({
        ...item,
        // OVERRIDE with completely new unique ID
        historyId: `hist_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 8)}`
      }));
      await AsyncStorage.setItem(COMPLETED_PATIENTS_KEY, JSON.stringify(cleaned));
      console.log('✅ Duplicate data cleaned! Total records:', cleaned.length);
      return cleaned;
    }
    return [];
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return [];
  }
};
const PatientHistoryScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const filters = [{
    id: 'all',
    label: 'All Records'
  }, {
    id: 'pharmacy',
    label: 'Pharmacy'
  }, {
    id: 'lab',
    label: 'Lab'
  }, {
    id: 'consultation',
    label: 'Consultation'
  }];

  // ─── INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // FORCE clean duplicate data first
      const cleanedData = await forceCleanDuplicateData();
      if (cleanedData && cleanedData.length > 0) {
        setPatients(cleanedData);
      } else {
        await loadPatientHistory();
      }
      setLoading(false);
    };
    init();
  }, []);

  // ─── LOAD PATIENT HISTORY ──────────────────────────────────────────
  const loadPatientHistory = async () => {
    try {
      const data = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure every item has a unique historyId
        const withUniqueIds = parsed.map((item, index) => ({
          ...item,
          historyId: item.historyId || `hist_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 8)}`
        }));
        setPatients(withUniqueIds);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading patient history:', error);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    // Force clean on refresh too
    const cleanedData = await forceCleanDuplicateData();
    if (cleanedData && cleanedData.length > 0) {
      setPatients(cleanedData);
    } else {
      await loadPatientHistory();
    }
    setRefreshing(false);
  };
  const getFilteredPatients = () => {
    let filtered = [...patients];
    if (selectedFilter === 'pharmacy') {
      filtered = filtered.filter(item => item.type === 'pharmacy' || item.prescriptions && item.prescriptions.length > 0);
    } else if (selectedFilter === 'lab') {
      filtered = filtered.filter(item => item.type === 'lab' || item.testReferral);
    } else if (selectedFilter === 'consultation') {
      filtered = filtered.filter(item => !item.type || item.type !== 'pharmacy' && item.type !== 'lab');
    }
    return filtered.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
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
  const formatTime = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const getTypeIcon = item => {
    if (item.type === 'pharmacy' || item.prescriptions && item.prescriptions.length > 0) {
      return 'medkit-outline';
    }
    if (item.type === 'lab' || item.testReferral) {
      return 'flask-outline';
    }
    return 'clipboard-outline';
  };
  const getTypeLabel = item => {
    if (item.type === 'pharmacy' || item.prescriptions && item.prescriptions.length > 0) {
      return 'Pharmacy';
    }
    if (item.type === 'lab' || item.testReferral) {
      return 'Lab';
    }
    return 'Consultation';
  };
  const getTypeColor = item => {
    if (item.type === 'pharmacy' || item.prescriptions && item.prescriptions.length > 0) {
      return COLORS.success;
    }
    if (item.type === 'lab' || item.testReferral) {
      return '#3B82F6';
    }
    return COLORS.primary;
  };
  const renderPatientCard = ({
    item
  }) => {
    const typeLabel = getTypeLabel(item);
    const typeColor = getTypeColor(item);
    const typeIcon = getTypeIcon(item);
    return <TouchableOpacity style={[styles.historyCard, SHADOWS.small]} activeOpacity={0.7} onPress={() => {
      Alert.alert('Patient Record', `Patient: ${item.patientName}\n\n` + `Token: ${item.patientToken || '—'}\n` + `Diagnosis: ${item.diagnosis || 'N/A'}\n` + `Medicines: ${item.prescriptions?.length || 0} item(s)\n` + `Date: ${formatDate(item.completedAt)}\n` + `Time: ${formatTime(item.completedAt)}\n` + `Doctor: ${item.doctorName || 'Dr. Unknown'}`);
    }}>
        <View style={styles.cardHeader}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.patientAvatar}>
            <Text style={styles.avatarText}>
              {item.patientName?.charAt(0) || 'P'}
            </Text>
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.patientToken}>Token #{item.patientToken || '—'}</Text>
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

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="clipboard-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={styles.detailLabel}>Diagnosis:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.diagnosis || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="medkit-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={styles.detailLabel}>Prescriptions:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.prescriptions?.length || 0} item(s)
            </Text>
          </View>

          {item.testReferral && <View style={styles.detailRow}>
              <Ionicons name="flask-outline" size={wp(3.5)} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Test Referral:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.testReferral}
              </Text>
            </View>}

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.completedAt)} at {formatTime(item.completedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.doctorName}>
            <Ionicons name="person-outline" size={wp(2.5)} color={COLORS.textLight} />
            {' '}{item.doctorName || 'Dr. Unknown'}
          </Text>
          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={wp(3)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>;
  };
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  const filteredPatients = getFilteredPatients();
  const stats = {
    total: filteredPatients.length,
    pharmacy: filteredPatients.filter(p => getTypeLabel(p) === 'Pharmacy').length,
    lab: filteredPatients.filter(p => getTypeLabel(p) === 'Lab').length,
    consultation: filteredPatients.filter(p => getTypeLabel(p) === 'Consultation').length
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Patient History</Text>
            <Text style={styles.headerSub}>All Consultation Records</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={wp(5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── STATS BANNER ───────────────────────────────────────────── */}
        <View style={[styles.statsBanner, SHADOWS.small]}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: COLORS.success
          }]}>{stats.pharmacy}</Text>
            <Text style={styles.statLabel}>Pharmacy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: '#3B82F6'
          }]}>{stats.lab}</Text>
            <Text style={styles.statLabel}>Lab</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, {
            color: COLORS.warning
          }]}>{stats.consultation}</Text>
            <Text style={styles.statLabel}>Consult</Text>
          </View>
        </View>

        {/* ─── FILTERS ─────────────────────────────────────────────────── */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map(filter => <TouchableOpacity key={filter.id} style={[styles.filterChip, selectedFilter === filter.id && styles.filterChipActive]} onPress={() => setSelectedFilter(filter.id)}>
                <Text style={[styles.filterText, selectedFilter === filter.id && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>
        </View>

        {/* ─── PATIENT LIST ───────────────────────────────────────────── */}
        <FlatList data={filteredPatients} keyExtractor={(item, index) => {
        // ✅ ULTIMATE FIX: Force unique key
        // Always use historyId if available, else generate from index
        if (item.historyId) {
          return `hist_${item.historyId}`;
        }
        // Fallback: use index + timestamp (guaranteed unique)
        return `key_${index}_${Date.now()}`;
      }} renderItem={renderPatientCard} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={wp(15)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySub}>Patient records will appear here</Text>
            </View>} />

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
          <Text style={styles.footerSub}>Patient History Module</Text>
        </View>
      </SafeAreaView>
    </View>;
};
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1.5) : (StatusBar.currentHeight || 28) + 14,
    paddingBottom: hp(1.5),
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20'
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
    fontSize: wp(4.5),
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
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(4),
    marginTop: hp(1),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(0.8)
  },
  statNumber: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text
  },
  statLabel: {
    fontSize: wp(2.2),
    color: COLORS.textSecondary,
    marginTop: hp(0.1),
    textAlign: 'center'
  },
  statDivider: {
    width: 1,
    height: hp(3.5),
    backgroundColor: COLORS.border,
    alignSelf: 'center'
  },
  filterContainer: {
    backgroundColor: COLORS.card,
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small
  },
  filterScroll: {
    paddingHorizontal: wp(4),
    gap: wp(2)
  },
  filterChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
    borderRadius: wp(5),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    fontWeight: '500'
  },
  filterTextActive: {
    color: COLORS.white
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(2)
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    padding: wp(3.5),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5)
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
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.2),
    borderRadius: wp(2),
    gap: wp(0.5)
  },
  typeText: {
    fontSize: wp(2.4),
    fontWeight: '600'
  },
  cardBody: {
    paddingVertical: hp(0.3)
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginVertical: hp(0.2)
  },
  detailLabel: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    fontWeight: '500',
    width: wp(18)
  },
  detailValue: {
    flex: 1,
    fontSize: wp(2.6),
    color: COLORS.text,
    fontWeight: '500'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.5),
    paddingTop: hp(0.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  doctorName: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5)
  },
  viewBtnText: {
    fontSize: wp(2.6),
    color: COLORS.primary,
    fontWeight: '600'
  },
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
    marginTop: hp(0.5),
    textAlign: 'center'
  },
  footer: {
    alignItems: 'center',
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(4)
  },
  footerText: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  footerSub: {
    fontSize: wp(2.2),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  }
});
export default PatientHistoryScreen;