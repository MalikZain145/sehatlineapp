// src/screens/doctor/RealTimeQueueScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions, StatusBar, Platform, SafeAreaView, Image, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { showConfirm } from '../../../components/confirm';
import doctorService from '../services/doctorService';
import { onQueueUpdate } from '../../../services/socket';

// Map a backend my-queue row to this screen's patient card shape.
import { useTheme } from "../../../context/ThemeContext";
const mapBackendQueue = rows => (rows || []).map(p => ({
  id: p.tokenId,
  tokenId: p.tokenId,
  token: p.token || p.tokenNumber,
  name: p.patientName,
  age: p.age,
  gender: p.gender || '',
  type: p.reason || p.chronicIllness || 'Chronic OPD',
  priority: p.priorityLevel === 'critical' ? 'Emergency' : p.priorityLevel === 'elderly' || p.priorityLevel === 'high' ? 'Urgent' : 'Normal',
  time: p.estWaitMin != null ? `~${p.estWaitMin} min` : '',
  status: p.status === 'in-progress' ? 'Called' : 'Waiting'
}));
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const USER_DATA_KEY = '@sehatline_userData';
const QUEUE_KEY = '@sehatline_queue';
const CONSULTATION_QUEUE_KEY = '@sehatline_consultation_queue';
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';
const ACTIVE_PATIENTS_KEY = '@sehatline_active_patients';

// No mock patients — the real-time queue is always the live backend queue.

const RealTimeQueueScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [doctor, setDoctor] = useState(null);
  const [queue, setQueue] = useState([]);
  const [consultationQueue, setConsultationQueue] = useState([]);
  const [completedPatients, setCompletedPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useMinLoading(true);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [activeTab, setActiveTab] = useState('waiting');
  const [token, setToken] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [todayStats, setTodayStats] = useState({
    total: 0,
    waiting: 0,
    consulting: 0,
    completed: 0
  });
  const [sessionKey, setSessionKey] = useState(null);
  useEffect(() => {
    loadData();
    // Live: refetch this doctor's queue on server broadcasts + on focus.
    const unsubQueue = onQueueUpdate(() => loadData());
    const unsubFocus = navigation.addListener('focus', () => loadData());
    return () => {
      if (unsubQueue) unsubQueue();
      unsubFocus();
    };
  }, []);

  // ─── Generate Session Key ──────────────────────────────────────────
  const generateSessionKey = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };
  const loadData = async () => {
    try {
      setLoading(true);

      // Load doctor data and token
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      const userToken = await AsyncStorage.getItem('@sehatline_token');
      const session = await AsyncStorage.getItem('@sehatline_session_key');
      if (userToken) {
        setToken(userToken);
      }
      if (userData) {
        const parsed = JSON.parse(userData);
        setDoctor(parsed);
      }

      // Check if new session or existing
      let newSession = false;
      if (!session) {
        const newKey = generateSessionKey();
        await AsyncStorage.setItem('@sehatline_session_key', newKey);
        setSessionKey(newKey);
        newSession = true;
      } else {
        setSessionKey(session);
      }

      // Load completed patients list
      const completedData = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      if (completedData) {
        setCompletedPatients(JSON.parse(completedData));
      }

      // Load consultation queue from storage
      const consultationData = await AsyncStorage.getItem(CONSULTATION_QUEUE_KEY);
      if (consultationData) {
        const parsed = JSON.parse(consultationData);
        setConsultationQueue(parsed);
      }

      // Load queue - if new session or empty, generate fresh
      await loadQueueData(newSession);
    } catch (error) {
      console.error('Error loading data:', error);
      await generateFreshQueue();
    } finally {
      setLoading(false);
    }
  };
  const loadQueueData = async (newSession = false) => {
    // 1) LIVE per-doctor queue from backend.
    try {
      const q = await doctorService.getMyQueue();
      if (Array.isArray(q?.queue)) {
        const mapped = mapBackendQueue(q.queue);
        setQueue(mapped);
        setUsingMockData(false);
        updateStats(mapped);
        return;
      }
    } catch (e) {/* offline — show real empty, never mock */}

    // No mock. Server unreachable → empty live queue (0), never fake patients.
    setUsingMockData(false);
    setQueue([]);
    updateStats([]);
  };
  const generateFreshQueue = async () => {
    // No mock generation — just reload the live queue from the backend.
    setUsingMockData(false);
    try {
      const q = await doctorService.getMyQueue();
      const mapped = Array.isArray(q?.queue) ? mapBackendQueue(q.queue) : [];
      setQueue(mapped);
      updateStats(mapped);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(mapped));
    } catch (e) {
      setQueue([]);
      updateStats([]);
    }
  };
  const updateStats = queueData => {
    const waiting = queueData.filter(p => p.status === 'Waiting' || p.status === 'Called').length;
    const consulting = consultationQueue.length;
    const completed = completedPatients.length;
    setTodayStats({
      total: queueData.length + completed,
      waiting,
      consulting,
      completed
    });
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── RESET QUEUE (For Testing) ──────────────────────────────────────
  const resetQueue = () => {
    showConfirm({
      title: 'Reset Queue',
      message: 'This will clear the local session and reload the live queue. Continue?',
      confirmLabel: 'Reset',
      destructive: true,
      icon: 'refresh-outline',
      onConfirm: async () => {
        try {
          await AsyncStorage.removeItem(COMPLETED_PATIENTS_KEY);
          await AsyncStorage.removeItem(CONSULTATION_QUEUE_KEY);
          setCompletedPatients([]);
          setConsultationQueue([]);
          await generateFreshQueue();
          Alert.alert('Success', 'Queue reloaded.');
        } catch (error) {
          Alert.alert('Error', 'Failed to reset queue.');
        }
      }
    });
  };
  const callNextPatient = patient => {
    Alert.alert("Call Patient", `Calling ${patient.name} (Token #${patient.token})`, [{
      text: "Cancel",
      style: "cancel"
    }, {
      text: "Call Now",
      onPress: async () => {
        try {
          // Add patient to consultation queue
          const consultationEntry = {
            ...patient,
            calledAt: new Date().toISOString(),
            consultationStatus: 'Waiting for Consultation'
          };
          const updatedConsultation = [...consultationQueue, consultationEntry];
          setConsultationQueue(updatedConsultation);
          await AsyncStorage.setItem(CONSULTATION_QUEUE_KEY, JSON.stringify(updatedConsultation));

          // Update patient status in waiting queue
          const updatedQueue = queue.map(p => p.id === patient.id ? {
            ...p,
            status: 'Called'
          } : p);
          setQueue(updatedQueue);
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
          updateStats(updatedQueue);
          Alert.alert("Patient Called", `${patient.name} has been called and added to consultation queue.`, [{
            text: "View Consultation Queue",
            onPress: () => setShowConsultationModal(true)
          }, {
            text: "Start Consultation",
            onPress: () => navigation.navigate('CallNextPatient', {
              patient,
              doctor
            })
          }, {
            text: "OK",
            style: "cancel"
          }]);
        } catch (error) {
          Alert.alert("Error", "Failed to call patient. Please try again.");
        }
      }
    }]);
  };
  const startConsultation = patient => {
    showConfirm({
      title: 'Start Consultation',
      message: `Start consultation with ${patient.name} (Token #${patient.token})?`,
      confirmLabel: 'Start',
      icon: 'play-circle-outline',
      onConfirm: async () => {
        try {
          const updatedConsultation = consultationQueue.map(p => p.id === patient.id ? {
            ...p,
            consultationStatus: 'In Consultation'
          } : p);
          setConsultationQueue(updatedConsultation);
          await AsyncStorage.setItem(CONSULTATION_QUEUE_KEY, JSON.stringify(updatedConsultation));
          navigation.navigate('CallNextPatient', {
            patient,
            doctor
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to start consultation.');
        }
      }
    });
  };
  const completeConsultation = patient => {
    showConfirm({
      title: 'Complete Consultation',
      message: `Mark ${patient.name}'s consultation as complete?`,
      confirmLabel: 'Complete',
      icon: 'checkmark-done-outline',
      onConfirm: async () => {
        try {
          const updatedConsultation = consultationQueue.filter(p => p.id !== patient.id);
          setConsultationQueue(updatedConsultation);
          await AsyncStorage.setItem(CONSULTATION_QUEUE_KEY, JSON.stringify(updatedConsultation));
          const completedPatient = {
            ...patient,
            completedAt: new Date().toISOString()
          };
          const updatedCompleted = [...completedPatients, completedPatient];
          setCompletedPatients(updatedCompleted);
          await AsyncStorage.setItem(COMPLETED_PATIENTS_KEY, JSON.stringify(updatedCompleted));
          const updatedQueue = queue.filter(p => p.id !== patient.id);
          setQueue(updatedQueue);
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
          updateStats(updatedQueue);
          Alert.alert('Success', `${patient.name}'s consultation has been completed.`);
        } catch (error) {
          Alert.alert('Error', 'Failed to complete consultation.');
        }
      }
    });
  };
  const getPriorityColor = priority => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return COLORS.danger;
      case 'urgent':
        return COLORS.warning;
      default:
        return COLORS.success;
    }
  };
  const getStatusColor = status => {
    switch (status) {
      case 'Called':
        return COLORS.primary;
      case 'Completed':
        return COLORS.success;
      default:
        return COLORS.warning;
    }
  };
  const getConsultationStatusColor = status => {
    switch (status) {
      case 'In Consultation':
        return COLORS.primary;
      case 'Waiting for Consultation':
        return COLORS.warning;
      default:
        return COLORS.textLight;
    }
  };
  const renderQueueItem = ({
    item
  }) => {
    const isPriority = item.priority === 'Urgent' || item.priority === 'Emergency';
    const priorityColor = getPriorityColor(item.priority);
    return <View style={[styles.queueCard, SHADOWS.small, isPriority && styles.priorityCard]}>
        <View style={styles.tokenSection}>
          <View style={styles.tokenBadge}>
            <Text style={styles.token}>#{item.token}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.name}</Text>
            <View style={styles.patientMeta}>
              <Text style={styles.metaText}>Age {item.age || 'N/A'}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{item.type || 'General'}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{item.time || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          {isPriority && <View style={[styles.priorityBadge, {
          backgroundColor: priorityColor + '20'
        }]}>
              <Ionicons name="alert-circle" size={wp(3)} color={priorityColor} />
              <Text style={[styles.priorityText, {
            color: priorityColor
          }]}>
                {item.priority}
              </Text>
            </View>}
          
          <View style={[styles.statusBadge, {
          backgroundColor: getStatusColor(item.status) + '15'
        }]}>
            <View style={[styles.statusDot, {
            backgroundColor: getStatusColor(item.status)
          }]} />
            <Text style={[styles.statusText, {
            color: getStatusColor(item.status)
          }]}>
              {item.status}
            </Text>
          </View>

          {item.status === 'Waiting' && <TouchableOpacity style={[styles.callButton, SHADOWS.tiny]} onPress={() => callNextPatient(item)} activeOpacity={0.7}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.callGradient}>
                <Ionicons name="call-outline" size={wp(3.5)} color={COLORS.white} />
                <Text style={styles.callText}>Call</Text>
              </LinearGradient>
            </TouchableOpacity>}
        </View>
      </View>;
  };
  const renderConsultationItem = ({
    item
  }) => {
    const priorityColor = getPriorityColor(item.priority);
    const statusColor = getConsultationStatusColor(item.consultationStatus);
    return <View style={[styles.queueCard, SHADOWS.small, styles.consultationCard]}>
        <View style={styles.tokenSection}>
          <View style={[styles.tokenBadge, {
          backgroundColor: COLORS.primary + '20'
        }]}>
            <Text style={[styles.token, {
            color: COLORS.primary
          }]}>#{item.token}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.name}</Text>
            <View style={styles.patientMeta}>
              <Text style={styles.metaText}>Age {item.age || 'N/A'}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{item.type || 'General'}</Text>
            </View>
            <Text style={styles.calledTime}>
              Called: {new Date(item.calledAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {item.priority !== 'Normal' && <View style={[styles.priorityBadge, {
          backgroundColor: priorityColor + '20'
        }]}>
              <Ionicons name="alert-circle" size={wp(2.5)} color={priorityColor} />
              <Text style={[styles.priorityText, {
            color: priorityColor,
            fontSize: wp(2)
          }]}>
                {item.priority}
              </Text>
            </View>}
          
          <View style={[styles.statusBadge, {
          backgroundColor: statusColor + '15'
        }]}>
            <View style={[styles.statusDot, {
            backgroundColor: statusColor
          }]} />
            <Text style={[styles.statusText, {
            color: statusColor,
            fontSize: wp(2)
          }]}>
              {item.consultationStatus}
            </Text>
          </View>

          {item.consultationStatus === 'Waiting for Consultation' && <TouchableOpacity style={[styles.actionButton, {
          backgroundColor: COLORS.primary
        }]} onPress={() => startConsultation(item)}>
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>}

          {item.consultationStatus === 'In Consultation' && <TouchableOpacity style={[styles.actionButton, {
          backgroundColor: COLORS.success
        }]} onPress={() => completeConsultation(item)}>
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>}
        </View>
      </View>;
  };
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  const waitingCount = queue.filter(p => p.status === 'Waiting' || p.status === 'Called').length;
  const consultationCount = consultationQueue.length;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Patient Queue</Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={wp(5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── DOCTOR INFO BAR ────────────────────────────────────────── */}
        <View style={[styles.doctorBar, SHADOWS.small]}>
          <LinearGradient colors={[doctor?.color || COLORS.primary, doctor?.color2 || COLORS.secondary]} style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>
              {doctor?.avatar || 'DR'}
            </Text>
          </LinearGradient>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctor?.name || 'Dr. Ahmed Hassan'}</Text>
            <Text style={styles.doctorSpecialty}>{doctor?.specialty || 'Cardiologist'}</Text>
            <View style={styles.doctorMeta}>
              <Text style={styles.doctorMetaText}>{doctor?.hospital || 'Capital Hospital CDA'}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.doctorMetaText}>{doctor?.room || 'Room 12'}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.doctorMetaText}>{new Date().toLocaleDateString()}</Text>
            </View>
            {usingMockData && <View style={styles.mockBadge}>
                <Text style={styles.mockBadgeText}>Demo Mode</Text>
              </View>}
          </View>
          <View style={[styles.statusBadge, doctor?.isOnline && styles.statusOnline]}>
            <View style={[styles.statusDot, doctor?.isOnline && styles.statusDotOnline]} />
            <Text style={[styles.statusText, doctor?.isOnline && styles.statusTextOnline]}>
              {doctor?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* ─── RESET QUEUE BUTTON ────────────────────────────────────── */}
        <TouchableOpacity style={styles.resetButton} onPress={resetQueue}>
          <Ionicons name="refresh-circle" size={wp(4.5)} color={COLORS.warning} />
          <Text style={styles.resetButtonText}>Reset Queue (New Patients)</Text>
        </TouchableOpacity>

        {/* ─── TODAY'S STATS ───────────────────────────────────────────── */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, {
            color: COLORS.warning
          }]}>{todayStats.waiting}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, {
            color: COLORS.primary
          }]}>{todayStats.consulting}</Text>
            <Text style={styles.statLabel}>Consulting</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, {
            color: COLORS.success
          }]}>{todayStats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* ─── TABS ─────────────────────────────────────────────────────── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'waiting' && styles.activeTab]} onPress={() => setActiveTab('waiting')}>
            <Text style={[styles.tabText, activeTab === 'waiting' && styles.activeTabText]}>
              Waiting Queue ({waitingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'consultation' && styles.activeTab]} onPress={() => setActiveTab('consultation')}>
            <Text style={[styles.tabText, activeTab === 'consultation' && styles.activeTabText]}>
              Consultation ({consultationCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── QUEUE LIST ─────────────────────────────────────────────── */}
        <FlatList data={activeTab === 'waiting' ? queue.filter(p => p.status === 'Waiting' || p.status === 'Called') : consultationQueue} keyExtractor={item => item.id} renderItem={activeTab === 'waiting' ? renderQueueItem : renderConsultationItem} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="people-outline" size={wp(15)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'waiting' ? 'No Patients Waiting' : 'No Active Consultations'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'waiting' ? 'Tap "Reset Queue" to generate new patients for testing' : 'No patients currently in consultation'}
              </Text>
              {activeTab === 'waiting' && <TouchableOpacity style={styles.refreshBtnLarge} onPress={resetQueue}>
                  <Ionicons name="refresh" size={wp(4)} color={COLORS.white} />
                  <Text style={styles.refreshBtnText}>Generate New Patients</Text>
                </TouchableOpacity>}
            </View>} />

        {/* ─── CONSULTATION QUEUE MODAL ───────────────────────────────── */}
        <Modal visible={showConsultationModal} animationType="slide" transparent={true} onRequestClose={() => setShowConsultationModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Active Consultations</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowConsultationModal(false)}>
                  <Ionicons name="close" size={wp(6)} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {consultationQueue.length === 0 ? <View style={styles.modalEmpty}>
                    <Ionicons name="people-outline" size={wp(12)} color={COLORS.textLight} />
                    <Text style={styles.modalEmptyText}>No active consultations</Text>
                  </View> : consultationQueue.map(item => <View key={item.id} style={[styles.modalCard, SHADOWS.tiny]}>
                      <View style={styles.modalCardLeft}>
                        <Text style={styles.modalToken}>#{item.token}</Text>
                        <View>
                          <Text style={styles.modalPatientName}>{item.name}</Text>
                          <Text style={styles.modalPatientMeta}>
                            Age {item.age} · {item.type}
                          </Text>
                          <Text style={[styles.modalPatientStatus, {
                      color: item.consultationStatus === 'Waiting for Consultation' ? COLORS.warning : COLORS.primary
                    }]}>
                            {item.consultationStatus}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalCardRight}>
                        {item.consultationStatus === 'Waiting for Consultation' && <TouchableOpacity style={[styles.modalActionBtn, {
                    backgroundColor: COLORS.primary
                  }]} onPress={() => {
                    setShowConsultationModal(false);
                    startConsultation(item);
                  }}>
                            <Text style={styles.modalActionText}>Start</Text>
                          </TouchableOpacity>}
                        {item.consultationStatus === 'In Consultation' && <TouchableOpacity style={[styles.modalActionBtn, {
                    backgroundColor: COLORS.success
                  }]} onPress={() => {
                    setShowConsultationModal(false);
                    completeConsultation(item);
                  }}>
                            <Text style={styles.modalActionText}>Complete</Text>
                          </TouchableOpacity>}
                      </View>
                    </View>)}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SehatLine v{APP_VERSION}</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerSub}>Today: {todayStats.total} appointments</Text>
          {usingMockData && <>
              <View style={styles.footerDivider} />
              <Text style={[styles.footerSub, {
            color: COLORS.warning
          }]}>Demo Mode</Text>
            </>}
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
    fontSize: wp(4.8),
    fontWeight: '700',
    color: COLORS.text
  },
  refreshBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  // ── Reset Button ──────────────────────────────────────────────────
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(4),
    marginTop: hp(1),
    padding: wp(2),
    backgroundColor: COLORS.warning + '15',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
    gap: wp(1.5)
  },
  resetButtonText: {
    color: COLORS.warning,
    fontSize: wp(3),
    fontWeight: '600'
  },
  // ── Doctor Bar ──────────────────────────────────────────────────
  doctorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    padding: wp(3),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  doctorAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    justifyContent: 'center',
    alignItems: 'center'
  },
  doctorAvatarText: {
    color: COLORS.white,
    fontSize: wp(4),
    fontWeight: '700'
  },
  doctorInfo: {
    flex: 1,
    marginLeft: wp(2.5)
  },
  doctorName: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  doctorSpecialty: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary
  },
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.1),
    flexWrap: 'wrap'
  },
  doctorMetaText: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  },
  metaDot: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    marginHorizontal: wp(0.8)
  },
  mockBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(2),
    marginTop: hp(0.3),
    alignSelf: 'flex-start'
  },
  mockBadgeText: {
    fontSize: wp(2),
    color: COLORS.warning,
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    backgroundColor: COLORS.backgroundSecondary,
    gap: wp(1)
  },
  statusOnline: {
    backgroundColor: COLORS.success + '15'
  },
  statusDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
    backgroundColor: COLORS.textLight
  },
  statusDotOnline: {
    backgroundColor: COLORS.success
  },
  statusText: {
    fontSize: wp(2.4),
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  statusTextOnline: {
    color: COLORS.success
  },
  // ── Stats ────────────────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(4),
    marginTop: hp(1),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  statCard: {
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
    marginTop: hp(0.1)
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border
  },
  // ── Tabs ──────────────────────────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    marginTop: hp(1),
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  tab: {
    flex: 1,
    paddingVertical: hp(0.8),
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: COLORS.primary + '10'
  },
  tabText: {
    fontSize: wp(2.8),
    fontWeight: '500',
    color: COLORS.textSecondary
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  // ── Queue List ──────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2)
  },
  // ── Queue Card ──────────────────────────────────────────────────
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: wp(3),
    borderRadius: wp(3),
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  priorityCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger
  },
  consultationCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  tokenSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5)
  },
  tokenBadge: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  token: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  patientInfo: {
    flex: 1
  },
  patientName: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: COLORS.text
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.1),
    flexWrap: 'wrap'
  },
  metaText: {
    fontSize: wp(2.4),
    color: COLORS.textSecondary
  },
  calledTime: {
    fontSize: wp(2),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  },
  // ── Right Section ──────────────────────────────────────────────
  rightSection: {
    alignItems: 'flex-end',
    gap: hp(0.3)
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.1),
    borderRadius: wp(2),
    gap: wp(0.5)
  },
  priorityText: {
    fontSize: wp(2.2),
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(2),
    gap: wp(0.8)
  },
  statusText: {
    fontSize: wp(2.4),
    fontWeight: '600'
  },
  callButton: {
    borderRadius: wp(2),
    overflow: 'hidden',
    marginTop: hp(0.3)
  },
  callGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    gap: wp(0.8)
  },
  callText: {
    color: COLORS.white,
    fontSize: wp(2.6),
    fontWeight: '600'
  },
  actionButton: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
    marginTop: hp(0.3)
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: wp(2.4),
    fontWeight: '600'
  },
  // ── Empty State ──────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: hp(10)
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontWeight: '600',
    color: COLORS.text,
    marginTop: hp(1)
  },
  emptySub: {
    fontSize: wp(3.2),
    color: COLORS.textLight,
    marginTop: hp(0.5),
    textAlign: 'center'
  },
  refreshBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: wp(3),
    marginTop: hp(2),
    gap: wp(2)
  },
  refreshBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    width: wp(90),
    maxHeight: hp(80),
    padding: wp(4)
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: hp(1)
  },
  modalTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text
  },
  modalCloseBtn: {
    padding: wp(1)
  },
  modalScroll: {
    maxHeight: hp(60)
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: hp(5)
  },
  modalEmptyText: {
    fontSize: wp(3.5),
    color: COLORS.textLight,
    marginTop: hp(1)
  },
  modalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: wp(2.5),
    borderRadius: wp(2),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  modalToken: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: wp(7)
  },
  modalPatientName: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  modalPatientMeta: {
    fontSize: wp(2.4),
    color: COLORS.textSecondary
  },
  modalPatientStatus: {
    fontSize: wp(2.2),
    color: COLORS.primary,
    fontWeight: '500'
  },
  modalCardRight: {
    alignItems: 'flex-end'
  },
  modalActionBtn: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: wp(2)
  },
  modalActionText: {
    color: COLORS.white,
    fontSize: wp(2.6),
    fontWeight: '600'
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: wp(2)
  },
  footerSub: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  }
});
export default RealTimeQueueScreen;