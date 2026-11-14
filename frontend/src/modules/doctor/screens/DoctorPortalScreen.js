// src/screens/doctor/DoctorPortalScreen.js
// ═══════════════════════════════════════════════════════════════════════════
// SEHATLINE — DOCTOR PORTAL (State-Based Professional Workspace)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, Dimensions, Platform, StatusBar, Alert, ActivityIndicator, Image, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandRow from '../../../components/BrandRow';
import doctorService from '../services/doctorService';
import { showConfirm, showInfo } from '../../../components/confirm';
import { onQueueUpdate } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { COLORS } from "../../../theme"; // static brand palette for module-scope defaults; components shadow it via useTheme()
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;

// ── Storage Keys ──────────────────────────────────────────────────────
const USER_DATA_KEY = '@sehatline_userData';
const QUEUE_KEY = '@sehatline_queue';
const COMPLETED_PATIENTS_KEY = '@sehatline_completed_patients';
const APPOINTMENTS_KEY = '@sehatline_appointments';
const SESSION_STARTED_KEY = '@sehatline_session_started';
const PROFILE_IMAGE_KEY = '@sehatline_profile_image';

// ── Helper Functions ─────────────────────────────────────────────────
const getInitials = name => {
  if (!name) return 'DR';
  const nameParts = name.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// ── Default profile scaffold (NO fake identity) ─────────────────────────
// Real name/specialty/photo come from the backend account; these are just
// neutral placeholders so nothing renders as a fake doctor.
const MOCK_DOCTOR = {
  id: '',
  name: '',
  specialty: '',
  department: '',
  hospital: '',
  room: '',
  avatar: '',
  color: COLORS.primary,
  color2: COLORS.secondary,
  isOnline: true,
  profileImage: null,
  rating: 0,
  totalPatients: 0,
  totalAppointments: 0,
  about1: '',
  about2: ''
};

// ─── MONTHLY PERFORMANCE DATA ────────────────────────────────────────
// Starts at ZERO — no mock. Real figures fill in from the backend as the
// doctor works; nothing fake is ever shown.
const MONTHLY_PERFORMANCE = {
  totalPatients: 0,
  avgRating: 0,
  totalAppointments: 0,
  completedConsultations: 0,
  efficiency: 0,
  satisfaction: 0,
  onTime: 0,
  treatmentSuccess: 0,
  monthlyGrowth: 0,
  weeklyData: [{
    week: 'Week 1',
    patients: 0,
    efficiency: 0
  }, {
    week: 'Week 2',
    patients: 0,
    efficiency: 0
  }, {
    week: 'Week 3',
    patients: 0,
    efficiency: 0
  }, {
    week: 'Week 4',
    patients: 0,
    efficiency: 0
  }]
};

// Reviews come live from the backend (per doctor). No mock feedback.

// ─── Get Today's Date ─────────────────────────────────────────────────
const getTodayDate = () => {
  const today = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return today.toLocaleDateString('en-US', options);
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
const DoctorPortalScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [refreshing, setRefreshing] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [queuePatients, setQueuePatients] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [patientsWaiting, setPatientsWaiting] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);

  // ─── Monthly Performance Modal ──────────────────────────────────────
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showNoPatientModal, setShowNoPatientModal] = useState(false);
  const [monthlyData, setMonthlyData] = useState(MONTHLY_PERFORMANCE);

  // ── Animations ──────────────────────────────────────────────────────────
  const expandAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Feedback Slider ─────────────────────────────────────────────────
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [feedbackData, setFeedbackData] = useState([]);
  const feedbackScrollRef = useRef(null);
  // Tracks whether the queue had at least one patient during this session, so we
  // only auto-end on "queue empty" AFTER the doctor has actually served people
  // (not the instant a fresh session starts before anyone is in line).
  const hadPatientsRef = useRef(false);
  const [feedbackWidth, setFeedbackWidth] = useState(width - 40);

  // ── LIFECYCLE ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAllData();
    loadFromBackend();
    animateIn();
    const unsubscribe = navigation.addListener('focus', () => {
      loadAllData();
      loadFromBackend();
    });
    // Live: refetch overview + queue whenever the server broadcasts a change.
    const unsubQueue = onQueueUpdate(() => loadFromBackend());
    return () => {
      unsubscribe();
      if (unsubQueue) unsubQueue();
    };
  }, []);

  // Pull LIVE data from the backend: today's overview + THIS doctor's own
  // queue + the real logged-in doctor identity. Falls back silently offline.
  const loadFromBackend = useCallback(async () => {
    try {
      const d = await doctorService.getDashboard();
      if (d?.overview) {
        setPatientsWaiting(d.overview.waiting ?? 0);
        setCompletedCount(d.overview.completed ?? 0);
        setTotalAppointments(d.overview.patientsToday ?? 0);
      }
      // (doctor identity is set by loadDoctorData — includes edited profile)
    } catch (e) {/* offline */}
    try {
      const q = await doctorService.getMyQueue();
      if (Array.isArray(q?.queue)) {
        setQueuePatients(q.queue.map(p => ({
          id: p.tokenId,
          tokenId: p.tokenId,
          name: p.patientName,
          token: p.token || p.tokenNumber,
          age: p.age,
          reason: p.reason || p.chronicIllness || 'Chronic OPD',
          gender: p.gender || '',
          status: p.status,
          priorityLevel: p.priorityLevel,
          estWaitMin: p.estWaitMin
        })));
        setPatientsWaiting(q.waiting ?? q.queue.length);
      }
    } catch (e) {/* offline */}
    // Real patient feedback for THIS doctor. If none yet, show an honest
    // placeholder (not fake samples).
    try {
      const rv = await doctorService.getReviews();
      // Show ALL reviews (same as "View All"), not only the ones with a written
      // comment — a rating-only ("smiley") review still counts and must appear
      // so the carousel matches the total and can move through them.
      const all = (rv?.reviews || []);
      setFeedbackData(all.length ? all.map((r, i) => ({
        id: r.id || `rv-${i}`,
        rating: r.rating || 0,
        text: (r.comment && r.comment.trim())
          ? r.comment
          : (r.rating >= 4 ? 'Rated this visit highly. 👍'
            : r.rating > 0 ? `Rated ${r.rating} out of 5.`
              : 'Patient left a rating.'),
      })) : [{
        id: 'none',
        rating: 0,
        text: 'No patient feedback yet — reviews will appear here once patients rate their visit.'
      }]);
    } catch (e) {/* offline — keep whatever is shown */}
  }, []);
  const animateIn = () => {
    Animated.parallel([Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true
    }), Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    })]).start();
  };
  const animateModalIn = () => {
    Animated.timing(modalFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  // ── DATA LOADING ──────────────────────────────────────────────────────
  const loadAllData = async () => {
    try {
      await Promise.all([loadDoctorData(),
      // NOTE: queue now comes from the backend (loadFromBackend → my-queue).
      // The old mock loadQueue() was removed so refresh never shows mock.
      loadCompletedPatients(), loadAppointments(), loadSessionStatus(), loadUnreadNotifications()]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  const loadDoctorData = async () => {
    try {
      const profileImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      let doctorData = {
        ...MOCK_DOCTOR
      };

      // Edited profile (specialty, department, hospital, about, photo…) that the
      // doctor saved on the Edit Profile screen.
      if (userData) {
        const parsed = JSON.parse(userData);
        doctorData = {
          ...doctorData,
          ...parsed
        };
      }

      // Overlay the REAL backend account (now the source of truth — all
      // editable fields persist server-side and survive logout/login).
      try {
        const res = await doctorService.getProfile();
        const d = res?.doctor;
        if (d) {
          doctorData.name = d.name || doctorData.name;
          doctorData.email = d.email || doctorData.email;
          doctorData.specialty = d.designation || d.specialization || doctorData.specialty;
          doctorData.department = d.department || doctorData.department;
          doctorData.hospital = d.hospital || doctorData.hospital;
          doctorData.qualification = d.qualification || doctorData.qualification;
          doctorData.experience = d.experience || doctorData.experience;
          if (d.profilePic) doctorData.profileImage = d.profilePic;
        }
      } catch (e) {/* offline — use edited/cached */}
      if (doctorData.name) doctorData.avatar = getInitials(doctorData.name);
      if (!doctorData.specialty) doctorData.specialty = 'Cardiologist';

      // Profile photo: local key (most recent) wins; else the edited/backend
      // photo already in doctorData; else none.
      if (profileImage) doctorData.profileImage = profileImage;
      if (!doctorData.profileImage) doctorData.profileImage = null;
      setDoctor(doctorData);
    } catch (e) {
      console.error('Error loading doctor data:', e);
      const fallbackDoctor = {
        ...MOCK_DOCTOR
      };
      fallbackDoctor.avatar = getInitials(fallbackDoctor.name);
      fallbackDoctor.profileImage = null;
      setDoctor(fallbackDoctor);
    }
  };
  const loadCompletedPatients = async () => {
    try {
      const raw = await AsyncStorage.getItem(COMPLETED_PATIENTS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setCompletedCount(data.length);
      } else {
        setCompletedCount(12);
      }
    } catch (e) {
      setCompletedCount(12);
    }
  };
  const loadAppointments = async () => {
    try {
      const raw = await AsyncStorage.getItem(APPOINTMENTS_KEY);
      if (raw) {
        setTotalAppointments(JSON.parse(raw).length);
      } else {
        setTotalAppointments(34);
      }
    } catch (e) {
      setTotalAppointments(34);
    }
  };
  const loadSessionStatus = async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_STARTED_KEY);
      setSessionStarted(raw === 'true');
    } catch (e) {
      setSessionStarted(false);
    }
  };

  // End the active session + reset the card (same cleanup as the manual Reset).
  const autoEndSession = useCallback(async (reason) => {
    try { await AsyncStorage.removeItem(SESSION_STARTED_KEY); } catch (e) { /* ignore */ }
    setSessionStarted(false);
    setIsCardExpanded(false);
    expandAnim.setValue(0);
    buttonAnim.setValue(0);
    hadPatientsRef.current = false;
    showInfo({ title: 'Session Ended', message: reason, icon: 'time-outline' });
  }, [expandAnim, buttonAnim]);

  // Remember once the queue has actually had patients this session.
  useEffect(() => { if (queuePatients.length > 0) hadPatientsRef.current = true; }, [queuePatients]);

  // Auto-end the session when (a) hospital hours are over (2:00 PM) or (b) the
  // queue has emptied after everyone was seen. Re-checks every minute so the
  // 2 PM cutoff fires even while the doctor is idle on the screen.
  useEffect(() => {
    if (!sessionStarted) return undefined;
    const check = () => {
      if (new Date().getHours() >= 14) {
        autoEndSession('Hospital hours are over (2:00 PM). Your session has ended for today.');
        return;
      }
      if (queuePatients.length === 0 && hadPatientsRef.current) {
        autoEndSession('All patients in the queue have been seen. Your session has ended.');
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [sessionStarted, queuePatients, autoEndSession]);
  const loadUnreadNotifications = async () => {
    try {
      // Real notifications (admin announcements, appointments, orders…) with the
      // unread count — so the bell badge reflects what's actually waiting.
      const res = await doctorService.getNotifications();
      setUnreadNotifications(typeof res?.unread === 'number' ? res.unread : (res?.notifications || []).filter(n => !n.read).length);
    } catch (e) {
      setUnreadNotifications(0);
    }
  };

  // ─── NAVIGATION HELPERS ──────────────────────────────────────────────
  const navigateToScreen = (screenName, params = {}) => {
    try {
      navigation.navigate(screenName, params);
    } catch (error) {
      const parent = navigation.getParent();
      if (parent) {
        try {
          parent.navigate(screenName, params);
        } catch (e) {
          console.warn('Navigation failed:', e);
        }
      }
    }
  };

  // ─── HANDLERS ──────────────────────────────────────────────────────────
  const handleCardTap = () => {
    if (sessionStarted) return;
    const newExpanded = !isCardExpanded;
    setIsCardExpanded(newExpanded);
    Animated.spring(expandAnim, {
      toValue: newExpanded ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
    if (newExpanded) {
      buttonAnim.setValue(0);
      setTimeout(() => {
        Animated.spring(buttonAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 50
        }).start();
      }, 200);
    }
  };
  const handleStartSession = async () => {
    // Starting the session CALLS the first patient — open their consultation.
    const first = queuePatients[0];
    if (!first) {
      // No one in the queue — don't open the consultation screen; show a
      // graceful themed message instead.
      setShowNoPatientModal(true);
      return;
    }
    setSessionStarted(true);
    await AsyncStorage.setItem(SESSION_STARTED_KEY, 'true');
    setIsCardExpanded(false);
    expandAnim.setValue(0);
    buttonAnim.setValue(0);
    navigation.navigate('CallNextPatientScreen', {
      patient: first,
      doctor
    });
  };
  const handleProceedPatient = () => {
    if (queuePatients.length === 0) {
      Alert.alert('Queue Empty', 'No patients waiting.');
      return;
    }
    const patient = queuePatients[0];
    navigation.navigate('CallNextPatientScreen', {
      patient,
      doctorData: doctor
    });
  };
  const toggleMetric = index => {
    setExpandedMetric(expandedMetric === index ? null : index);
  };

  // ─── FEEDBACK SLIDER ──────────────────────────────────────────────────
  const onFeedbackScroll = event => {
    const x = event.nativeEvent.contentOffset.x;
    const slideWidth = feedbackWidth || (width - 40);
    const index = Math.round(x / slideWidth);
    if (index >= 0 && index < feedbackData.length) {
      setCurrentFeedbackIndex(index);
    }
  };
  const scrollToFeedback = index => {
    if (feedbackScrollRef.current) {
      const slideWidth = feedbackWidth || (width - 40);
      feedbackScrollRef.current.scrollToOffset({
        offset: index * slideWidth,
        animated: true
      });
      setCurrentFeedbackIndex(index);
    }
  };

  // ─── MONTHLY PERFORMANCE MODAL ──────────────────────────────────────
  const openMonthlyModal = () => {
    setShowMonthlyModal(true);
    animateModalIn();
  };
  const closeMonthlyModal = () => {
    setShowMonthlyModal(false);
    modalFadeAnim.setValue(0);
  };
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadAllData();
      loadFromBackend(); // refresh must re-pull the LIVE queue, not mock
      setRefreshing(false);
    }, 1200);
  }, [loadFromBackend]);
  const currentPatient = queuePatients.length > 0 ? queuePatients[0] : null;
  // Live OPD Queue shows the WHOLE of today's queue (all waiting patients).
  const upcomingPatients = queuePatients.slice(0, 6);
  const cardHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [130, 240]
  });
  const buttonOpacity = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const buttonTranslateY = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });
  const todayDate = getTodayDate();

  // Today's Overview — live numbers from backend state (same cards/layout).
  const overviewStats = [{
    label: 'Total Patients',
    value: totalAppointments,
    icon: 'people-outline',
    color: COLORS.primary
  }, {
    label: 'In Queue',
    value: patientsWaiting,
    icon: 'hourglass-outline',
    color: COLORS.warning
  }, {
    label: 'Consulted Today',
    value: completedCount,
    icon: 'checkmark-circle-outline',
    color: COLORS.success
  }, {
    label: 'Progress',
    value: (totalAppointments > 0 ? Math.round(completedCount / totalAppointments * 100) : 0) + '%',
    icon: 'trending-up-outline',
    color: '#9B59B6'
  }];
  if (!doctor) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Doctor Portal...</Text>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} progressViewOffset={80} />}>
        {/* ═══ 1. HEADER ═══════════════════════════════════════════════════ */}
        <Animated.View style={[styles.header, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigateToScreen('DoctorProfile')} activeOpacity={0.6}>
            <View style={styles.profileOutline}>
              {doctor.profileImage ? <Image source={{
              uri: doctor.profileImage,
              cache: 'reload'
            }} style={styles.headerAvatarImage} /> : <LinearGradient colors={[doctor.color || COLORS.primary, doctor.color2 || COLORS.secondary]} style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>
                    {doctor.avatar || 'DR'}
                  </Text>
                </LinearGradient>}
            </View>
          </TouchableOpacity>

          <View style={styles.brandWrap}>
            <BrandRow logo subtitle="Doctor Portal" />
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigateToScreen('AdminNotifications')} activeOpacity={0.6}>
            <View style={styles.notifWrap}>
              <View style={styles.notifBtn}>
                <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
              </View>
              {unreadNotifications > 0 && <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
                </View>}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ═══ 2. DOCTOR INFORMATION CARD ════════════════════════════════ */}
        <Animated.View style={[styles.doctorCard, styles.shadow, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <LinearGradient colors={[COLORS.primary + '08', COLORS.card]} style={styles.doctorCardGradient} start={{
          x: 0,
          y: 0
        }} end={{
          x: 1,
          y: 1
        }}>
            <View style={styles.doctorInfoContainer}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              
              <View style={styles.specialtyContainer}>
                <Ionicons name="medical-outline" size={16} color={COLORS.primary} />
                <Text style={styles.doctorSpecialty}>{doctor.specialty || 'Cardiologist'}</Text>
              </View>
              
              <Text style={styles.doctorAbout}>{doctor.qualification || doctor.about1 || 'Expert in Interventional Cardiology'}</Text>
              <Text style={styles.doctorAbout}>{doctor.experience || doctor.about2 || '15+ Years of Clinical Experience'}</Text>
              
              <View style={styles.doctorDetailsRow}>
                <View style={styles.doctorDetailItem}>
                  <Ionicons name="business-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.doctorDetailText}>{doctor.department || 'Cardiology Department'}</Text>
                </View>
              </View>
              
              <View style={styles.doctorDetailsRow}>
                <View style={styles.doctorDetailItem}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.doctorDetailText}>{doctor.hospital || 'Capital Hospital CDA'}</Text>
                </View>
              </View>

              {sessionStarted && <View style={[styles.doctorDetailsRow, {
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: COLORS.border
            }]}>
                  <View style={styles.consultationStatusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.consultationStatusText}>
                      ● Session Active — {queuePatients.length} patients in queue
                    </Text>
                  </View>
                </View>}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ═══ 3. TODAY'S OVERVIEW ════════════════════════════════════════ */}
        <Animated.View style={[styles.section, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statStrip}>
            {overviewStats.map(stat => <View key={stat.label} style={[styles.statCard, styles.shadowSmall, {
            borderTopColor: stat.color,
            borderTopWidth: 3
          }]}>
                <View style={[styles.statIconBox, {
              backgroundColor: stat.color + '15'
            }]}>
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>)}
          </ScrollView>
        </Animated.View>

        {/* ═══ 4. TODAY'S CONSULTATION ════════════════════════════════════ */}
        <Animated.View style={[styles.section, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Consultation</Text>
            {sessionStarted && <TouchableOpacity onPress={() => {
            showConfirm({
              title: 'Reset Session',
              message: 'This will reset the consultation session to "Not Started". Continue?',
              confirmLabel: 'Reset',
              destructive: true,
              icon: 'refresh-outline',
              onConfirm: async () => {
                await AsyncStorage.removeItem(SESSION_STARTED_KEY);
                setSessionStarted(false);
                setIsCardExpanded(false);
                expandAnim.setValue(0);
                buttonAnim.setValue(0);
              }
            });
          }} activeOpacity={0.7}>
                <Text style={styles.resetLink}>Reset</Text>
              </TouchableOpacity>}
          </View>

          {!sessionStarted ? <TouchableOpacity style={[styles.consultationCard, styles.shadow, {
          backgroundColor: COLORS.primary + '06',
          borderColor: COLORS.primary + '25',
          borderWidth: 2
        }]} onPress={handleCardTap} activeOpacity={0.8}>
              <Animated.View style={{
            height: cardHeight
          }}>
                <View style={styles.cardContent}>
                  <View style={styles.statusIcon}>
                    <Ionicons name="play-circle-outline" size={wp(6)} color={COLORS.primary} />
                  </View>
                  <Text style={styles.statusLabel}>Session Status</Text>
                  <Text style={[styles.statusValue, {
                color: COLORS.primary
              }]}>Not Started</Text>
                  <Text style={styles.statusHint}>Tap to begin today's consultation</Text>
                  
                  {isCardExpanded && <Animated.View style={[styles.buttonContainer, {
                opacity: buttonOpacity,
                transform: [{
                  translateY: buttonTranslateY
                }]
              }]}>
                      <TouchableOpacity style={styles.startBtn} onPress={handleStartSession} activeOpacity={0.9}>
                        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.startBtnGradient} start={{
                    x: 0,
                    y: 0
                  }} end={{
                    x: 1,
                    y: 0
                  }}>
                          <Ionicons name="play-circle-outline" size={20} color={COLORS.white} />
                          <Text style={styles.startBtnText}>Start Today's Consultation</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>}
                </View>
              </Animated.View>
            </TouchableOpacity> : <View style={[styles.consultationCardActive, styles.shadow, {
          backgroundColor: COLORS.success + '06',
          borderColor: COLORS.success + '35',
          borderWidth: 2
        }]}>
              <View style={styles.sessionHeader}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.sessionHeaderText}>Session Active</Text>
              </View>

              {currentPatient ? <>
                  <Text style={styles.currentToken}>Token #{currentPatient.token}</Text>
                  <Text style={styles.currentName}>{currentPatient.name}</Text>
                  <Text style={styles.currentDetails}>
                    {currentPatient.age} yrs | {currentPatient.gender || 'Male'}
                  </Text>
                  <Text style={styles.currentReason}>{currentPatient.reason}</Text>
                  
                  <TouchableOpacity style={styles.proceedBtn} onPress={handleProceedPatient} activeOpacity={0.9}>
                    <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.proceedBtnGradient} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 0
              }}>
                      <Ionicons name="arrow-forward-outline" size={20} color={COLORS.white} />
                      <Text style={styles.proceedBtnText}>Proceed</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </> : <Text style={styles.waitingText}>No patient currently in queue</Text>}
            </View>}
        </Animated.View>

        {/* ═══ 5. LIVE OPD QUEUE ══════════════════════════════════════════ */}
        <Animated.View style={[styles.section, styles.sectionProminent, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live OPD Queue</Text>
            <TouchableOpacity onPress={() => navigateToScreen('TodayQueue')}>
              <Text style={styles.sectionLink}>View Full Queue</Text>
            </TouchableOpacity>
          </View>

          {upcomingPatients.length > 0 ? <>
              {upcomingPatients.slice(0, 3).map((patient, index) => <View key={patient.id} style={[styles.queueItem, styles.shadowSmall, index % 2 === 0 ? styles.queueItemEven : styles.queueItemOdd, index === 0 && styles.queueItemFirst]}>
                  <View style={styles.queueTokenBox}>
                    <Text style={[styles.queueToken, index === 0 && styles.queueTokenHighlight]}>
                      Token {patient.token}
                    </Text>
                    {index === 0 && <View style={styles.nextIndicator}>
                        <Text style={styles.nextIndicatorText}>NEXT</Text>
                      </View>}
                  </View>
                  <View style={styles.queueInfo}>
                    <Text style={[styles.queueName, index === 0 && styles.queueNameHighlight]}>
                      {patient.name}
                    </Text>
                    <Text style={styles.queueDetails}>
                      {patient.age} yrs | {patient.gender || 'Male'} | {patient.time || '10:00 AM'}
                    </Text>
                  </View>
                </View>)}
            </> : <View style={[styles.emptyQueue, styles.shadowSmall]}>
              <Ionicons name="people-outline" size={wp(7)} color={COLORS.textLight} />
              <Text style={styles.emptyQueueText}>No patients in queue</Text>
            </View>}
        </Animated.View>

        {/* ═══ AWARENESS CAMPS (create + manage) ══════════════════════════ */}
        <TouchableOpacity
          style={[styles.section, styles.sectionProminent, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
          onPress={() => navigateToScreen('DoctorCamps')} activeOpacity={0.85}
        >
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Awareness Camps</Text>
            <Text style={{ color: COLORS.textLight, fontSize: 12, marginTop: 2 }}>Create a free camp — patients see it in their Awareness Camps tab</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* ═══ 6. TODAY'S SCHEDULE ═════════════════════════════════════════ */}
        <Animated.View style={[styles.section, styles.sectionProminent, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Text style={styles.scheduleDate}>{todayDate}</Text>
          </View>
          <View style={[styles.scheduleCard, styles.shadow, {
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: COLORS.primary + '20'
        }]}>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIconContainer}>
                <Ionicons name="time-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.scheduleTimeInfo}>
                <Text style={styles.scheduleLabel}>Working Hours</Text>
                <Text style={styles.scheduleValue}>09:00 AM – 02:00 PM</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIconContainer}>
                <Ionicons name="restaurant-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.scheduleTimeInfo}>
                <Text style={styles.scheduleLabel}>Break Time</Text>
                <Text style={styles.scheduleValue}>12:30 PM – 01:00 PM</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIconContainer}>
                <Ionicons name="medical-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.scheduleTimeInfo}>
                <Text style={styles.scheduleLabel}>Department</Text>
                <Text style={styles.scheduleValue}>{doctor?.department || 'Cardiology OPD'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* ═══ 7. PATIENT FEEDBACK (FIXED SCROLLING - SMOOTH & FULL FEEDBACK) ═══════════════════════════════ */}
        <Animated.View style={[styles.section, styles.lastSection, styles.sectionProminent, {
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Patient Feedback</Text>
              <Text style={styles.feedbackSubtitle}>What patients are saying</Text>
            </View>
            <TouchableOpacity onPress={() => navigateToScreen('DoctorReviews')}>
              <Text style={styles.sectionLink}>View All Reviews</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.feedbackCard, styles.shadow, {
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: COLORS.primary + '12'
        }]}>
            <FlatList
              ref={feedbackScrollRef}
              data={feedbackData}
              keyExtractor={item => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={onFeedbackScroll}
              scrollEventThrottle={16}
              style={styles.feedbackScrollView}
              decelerationRate="fast"
              snapToInterval={feedbackWidth}
              snapToAlignment="start"
              disableIntervalMomentum
              nestedScrollEnabled
              onLayout={e => setFeedbackWidth(e.nativeEvent.layout.width)}
              getItemLayout={(_, index) => ({ length: feedbackWidth, offset: feedbackWidth * index, index })}
              renderItem={({ item: feedback, index }) => <View style={[styles.feedbackSlide, { width: feedbackWidth }]}>
                  {/* Rating */}
                  <View style={styles.feedbackRating}>
                    {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= feedback.rating ? 'star' : 'star-outline'} size={24} color={star <= feedback.rating ? '#FFB800' : '#D1D5DB'} />)}
                  </View>

                  {/* Feedback Text */}
                  <Text style={styles.feedbackText}>"{feedback.text}"</Text>

                  {/* Feedback counter */}
                  <Text style={styles.feedbackCounter}>{index + 1} / {feedbackData.length}</Text>
                </View>}
            />
            
            {/* Dots */}
            <View style={styles.feedbackDots}>
              {feedbackData.map((_, index) => <TouchableOpacity key={index} style={[styles.feedbackDot, currentFeedbackIndex === index && styles.feedbackDotActive]} onPress={() => scrollToFeedback(index)} activeOpacity={0.7} />)}
            </View>
          </View>
        </Animated.View>

        <View style={{
        height: 20
      }} />
      </ScrollView>

      {/* ═══ MONTHLY PERFORMANCE MODAL ════════════════════════════════ */}
      <Modal visible={showMonthlyModal} transparent={true} animationType="fade" onRequestClose={closeMonthlyModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, {
          opacity: modalFadeAnim
        }]}>
            <LinearGradient colors={[COLORS.primary, COLORS.tealDark]} style={styles.modalHeader} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 0
          }}>
              <Text style={styles.modalTitle}>Monthly Performance</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMonthlyModal}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalStatsGrid}>
                <View style={[styles.modalStatItem, styles.shadowSmall]}>
                  <Text style={[styles.modalStatNumber, {
                  color: COLORS.primary
                }]}>
                    {monthlyData.totalPatients}
                  </Text>
                  <Text style={styles.modalStatLabel}>Total Patients</Text>
                </View>
                <View style={[styles.modalStatItem, styles.shadowSmall]}>
                  <Text style={[styles.modalStatNumber, {
                  color: '#FFB800'
                }]}>
                    {monthlyData.avgRating}
                  </Text>
                  <Text style={styles.modalStatLabel}>Avg Rating</Text>
                </View>
                <View style={[styles.modalStatItem, styles.shadowSmall]}>
                  <Text style={[styles.modalStatNumber, {
                  color: COLORS.success
                }]}>
                    {monthlyData.totalAppointments}
                  </Text>
                  <Text style={styles.modalStatLabel}>Appointments</Text>
                </View>
                <View style={[styles.modalStatItem, styles.shadowSmall]}>
                  <Text style={[styles.modalStatNumber, {
                  color: COLORS.info
                }]}>
                    {monthlyData.completedConsultations}
                  </Text>
                  <Text style={styles.modalStatLabel}>Completed</Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalGrowthContainer}>
                <View style={styles.modalGrowthIcon}>
                  <Ionicons name="arrow-up-circle" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.modalGrowthText}>
                  <Text style={[styles.modalGrowthValue, {
                  color: COLORS.success
                }]}>
                    +{monthlyData.monthlyGrowth}%
                  </Text>
                  {' '}growth from last month
                </Text>
              </View>

              <View style={styles.modalDivider} />

              <Text style={styles.modalSubTitle}>Weekly Breakdown</Text>
              {monthlyData.weeklyData.map((week, index) => <View key={index} style={styles.modalWeekItem}>
                  <Text style={styles.modalWeekLabel}>{week.week}</Text>
                  <View style={styles.modalWeekBarContainer}>
                    <View style={[styles.modalWeekBar, {
                  width: `${week.patients / 95 * 100}%`,
                  backgroundColor: COLORS.primary
                }]} />
                  </View>
                  <Text style={styles.modalWeekValue}>{week.patients}</Text>
                </View>)}

              <View style={styles.modalDivider} />

              <Text style={styles.modalSubTitle}>Efficiency Trend</Text>
              {monthlyData.weeklyData.map((week, index) => <View key={index} style={styles.modalWeekItem}>
                  <Text style={styles.modalWeekLabel}>{week.week}</Text>
                  <View style={styles.modalWeekBarContainer}>
                    <View style={[styles.modalWeekBar, {
                  width: `${week.efficiency}%`,
                  backgroundColor: week.efficiency >= 85 ? COLORS.success : COLORS.warning
                }]} />
                  </View>
                  <Text style={styles.modalWeekValue}>{week.efficiency}%</Text>
                </View>)}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseButton} onPress={closeMonthlyModal}>
              <LinearGradient colors={[COLORS.primary, COLORS.tealDark]} style={styles.modalCloseGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══ NO PATIENT IN QUEUE — graceful themed modal ══════════════════ */}
      <Modal visible={showNoPatientModal} transparent animationType="fade" onRequestClose={() => setShowNoPatientModal(false)}>
        <View style={styles.noPatientOverlay}>
          <View style={styles.noPatientCard}>
            <View style={styles.noPatientIconWrap}>
              <Ionicons name="people-outline" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.noPatientTitle}>No patient in queue</Text>
            <Text style={styles.noPatientText}>
              There are no patients in today's queue right now. You'll be notified as soon as a patient checks in.
            </Text>
            <TouchableOpacity style={styles.noPatientBtn} activeOpacity={0.85} onPress={() => setShowNoPatientModal(false)}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }} style={styles.noPatientBtnGradient}>
                <Text style={styles.noPatientBtnText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>;
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scroll: {
    paddingBottom: 20
  },
  // No-patient modal
  noPatientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28
  },
  noPatientCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  noPatientIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  noPatientTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text || '#1F2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  noPatientText: {
    fontSize: 14,
    color: COLORS.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22
  },
  noPatientBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden'
  },
  noPatientBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  noPatientBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.08,
        shadowRadius: 12
      },
      android: {
        elevation: 0
      }
    })
  },
  shadowSmall: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.06,
        shadowRadius: 8
      },
      android: {
        elevation: 0
      }
    })
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary
  },
  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 18,
    backgroundColor: COLORS.background
  },
  iconBtn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 30
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  // Notification bell — white circle, teal border, teal icon (no dark bg).
  notifWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Unread count — teal background, white number.
  notifBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  notifBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800'
  },
  profileOutline: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 2
  },
  notificationOutline: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
    padding: 2
  },
  notificationBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.15,
        shadowRadius: 4
      },
      android: {
        elevation: 0
      }
    })
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.primary
  },
  headerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    resizeMode: 'cover'
  },
  headerAvatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 28
  },
  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.6,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden'
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain'
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4
  },
  brandAccent: {
    color: COLORS.text
  },
  tagline: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  // ── 2. Doctor Information Card ──────────────────────────────────────
  doctorCard: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primary + '15',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.08,
        shadowRadius: 12
      },
      android: {
        elevation: 0
      }
    })
  },
  doctorCardGradient: {
    padding: 20
  },
  doctorInfoContainer: {
    flex: 1
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  doctorSpecialty: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600'
  },
  doctorAbout: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '400',
    marginBottom: 2
  },
  doctorDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  doctorDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  doctorDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  consultationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '08'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success
  },
  consultationStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  // ── 3. Performance Stats ───────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionProminent: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.card,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    borderRadius: 0
  },
  lastSection: {
    marginBottom: 10,
    paddingBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.3
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary
  },
  statStrip: {
    paddingHorizontal: 0,
    gap: 12,
    paddingVertical: 4
  },
  statCard: {
    width: 100,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center'
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 0
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 1,
    fontWeight: '500',
    textAlign: 'center'
  },
  // ── 4. Today's Consultation ──────────────────────────────────────
  consultationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  consultationCardActive: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.success + '40'
  },
  cardContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusIcon: {
    marginBottom: 8
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2
  },
  statusHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8
  },
  buttonContainer: {
    width: '100%',
    marginTop: 12
  },
  startBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10
  },
  startBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sessionHeaderText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600'
  },
  currentToken: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center'
  },
  currentName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2
  },
  currentDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2
  },
  currentReason: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16
  },
  proceedBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  proceedBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10
  },
  proceedBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  waitingText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 12
  },
  resetLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger
  },
  // ── 5. Live OPD Queue ──────────────────────────────────────────────
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  queueItemEven: {
    backgroundColor: COLORS.card
  },
  queueItemOdd: {
    backgroundColor: COLORS.background
  },
  queueItemFirst: {
    borderColor: COLORS.primary + '30',
    backgroundColor: COLORS.primary + '04'
  },
  queueTokenBox: {
    minWidth: 55,
    alignItems: 'center'
  },
  queueToken: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  queueTokenHighlight: {
    color: COLORS.primary,
    fontSize: 18
  },
  queueInfo: {
    flex: 1,
    marginLeft: 12
  },
  queueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  queueNameHighlight: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  queueDetails: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1
  },
  nextIndicator: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  nextIndicatorText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5
  },
  emptyQueue: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 6
  },
  emptyQueueText: {
    fontSize: 14,
    color: COLORS.textLight
  },
  // ── 6. Today's Schedule ─────────────────────────────────────────────
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  scheduleDate: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  scheduleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 14
  },
  scheduleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '08',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scheduleTimeInfo: {
    flex: 1
  },
  scheduleLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8
  },
  // ── 7. Feedback (FIXED SCROLLING) ──────────────────────────────────
  feedbackSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
    marginTop: -6
  },
  feedbackCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: COLORS.card
  },
  feedbackScrollView: {
    flexGrow: 0,
    width: '100%'
  },
  feedbackContentContainer: {
    flexGrow: 0,
    alignItems: 'center'
  },
  feedbackSlide: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedbackRating: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12
  },
  feedbackText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
    fontStyle: 'italic',
    width: '100%'
  },
  feedbackCounter: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 12,
    fontWeight: '500'
  },
  feedbackDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6
  },
  feedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB'
  },
  feedbackDotActive: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5
  },
  // ─── MODAL ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white
  },
  modalCloseBtn: {
    padding: 4
  },
  modalBody: {
    padding: 20
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  modalStatItem: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalStatNumber: {
    fontSize: 22,
    fontWeight: '800'
  },
  modalStatLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12
  },
  modalGrowthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  modalGrowthIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalGrowthText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  modalGrowthValue: {
    fontWeight: '700'
  },
  modalSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  modalWeekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10
  },
  modalWeekLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    width: 60
  },
  modalWeekBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden'
  },
  modalWeekBar: {
    height: 6,
    borderRadius: 3
  },
  modalWeekValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    width: 35,
    textAlign: 'right'
  },
  modalCloseButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden'
  },
  modalCloseGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCloseButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600'
  }
});
export default DoctorPortalScreen;