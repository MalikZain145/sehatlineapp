// src/screens/doctor/DoctorNotificationScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, Image, RefreshControl, FlatList, Alert, Modal, TextInput, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandRow from '../../../components/BrandRow';
import { showConfirm } from '../../../components/confirm';
import doctorService from '../services/doctorService';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { COLORS } from "../../../theme"; // static brand palette for module-scope maps; components shadow it via useTheme()
const {
  width,
  height
} = Dimensions.get('window');
const hp = p => height * p / 100;

// ── Storage Keys ──────────────────────────────────────────────────────
const NOTIFICATIONS_KEY = '@sehatline_notifications';
const USER_DATA_KEY = '@sehatline_userData';
const PROFILE_IMAGE_KEY = '@sehatline_profile_image';
const QUEUE_KEY = '@sehatline_queue';

// ── Helper ────────────────────────────────────────────────────────────
const getInitials = name => {
  if (!name) return 'DR';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// ─── OPD TIME VALIDATION ─────────────────────────────────────────────
const isValidOPDTime = date => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const opdStart = 9 * 60;
  const breakStart = 12 * 60 + 30;
  const breakEnd = 13 * 60;
  const opdEnd = 14 * 60;
  if (totalMinutes < opdStart || totalMinutes >= opdEnd) {
    return false;
  }
  if (totalMinutes >= breakStart && totalMinutes < breakEnd) {
    return false;
  }
  return true;
};

// ─── GENERATE IMPORTANT NOTIFICATIONS ONLY ───────────────────────────
const generateImportantNotifications = queueData => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifications = [];
  const queueLength = queueData ? queueData.length : 0;

  // 1. OPD Session Started (Always)
  notifications.push({
    id: `admin1_${Date.now()}`,
    title: 'OPD Session Started',
    message: 'Morning OPD session started successfully at 9:00 AM. All services are operational.',
    timestamp: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
    read: false,
    icon: 'time-outline',
    category: 'Admin'
  });

  // 2. Multiple patients checked in (Summary notification)
  if (queueLength >= 3) {
    const firstThree = queueData.slice(0, 3);
    const tokenList = firstThree.map(p => p.token || 'N/A').join(', ');
    notifications.push({
      id: `appt1_${Date.now()}`,
      title: `${Math.min(queueLength, 5)} New Patients Checked In`,
      message: `Patients with tokens ${tokenList} and ${queueLength - 3} more have checked in since your last refresh.`,
      timestamp: new Date(today.setHours(9, 15, 0, 0)).toISOString(),
      read: false,
      icon: 'people-outline',
      category: 'Appointment'
    });
  }

  // 3. Patient waiting longer than expected (if queue has 10+ patients)
  if (queueLength >= 10) {
    const waitPatient = queueData[5];
    const waitToken = waitPatient ? waitPatient.token : 'N/A';
    notifications.push({
      id: `appt2_${Date.now() + 1}`,
      title: 'Patient Waiting Longer Than Expected',
      message: `Token #${waitToken} has been waiting for approximately 20 minutes. Please attend as soon as possible.`,
      timestamp: new Date(today.setHours(9, 40, 0, 0)).toISOString(),
      read: false,
      icon: 'time-outline',
      category: 'Appointment'
    });
  }

  // 4. OPD Break Time
  notifications.push({
    id: `admin2_${Date.now() + 2}`,
    title: 'Break Time Started',
    message: 'OPD lunch break from 12:30 PM to 1:00 PM. All consultations will resume at 1:00 PM.',
    timestamp: new Date(today.setHours(12, 30, 0, 0)).toISOString(),
    read: true,
    icon: 'restaurant-outline',
    category: 'Admin'
  });

  // 5. OPD Resumed
  notifications.push({
    id: `admin3_${Date.now() + 3}`,
    title: 'OPD Resumed',
    message: 'Morning OPD resumed at 1:00 PM. Consultations are now active.',
    timestamp: new Date(today.setHours(13, 0, 0, 0)).toISOString(),
    read: true,
    icon: 'time-outline',
    category: 'Admin'
  });

  // 6. Last consultation of the day
  if (queueLength >= 3) {
    const lastToken = queueData[queueLength - 1]?.token || 'N/A';
    notifications.push({
      id: `appt3_${Date.now() + 4}`,
      title: 'Last Consultation of the Day',
      message: `Token #${lastToken} is the last patient in today\'s queue. OPD session will close after this consultation.`,
      timestamp: new Date(today.setHours(13, 45, 0, 0)).toISOString(),
      read: true,
      icon: 'checkmark-circle-outline',
      category: 'Appointment'
    });
  }

  // 7. OPD Session Closed
  notifications.push({
    id: `admin4_${Date.now() + 5}`,
    title: 'OPD Session Closed',
    message: 'Morning OPD session closed at 2:00 PM. Total patients attended: ' + queueLength,
    timestamp: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
    read: true,
    icon: 'time-outline',
    category: 'Admin'
  });

  // 8. Lab Services Notification (If applicable)
  if (queueLength > 5) {
    notifications.push({
      id: `appt4_${Date.now() + 6}`,
      title: 'Lab Services Available',
      message: 'Laboratory services are available today for all patients. Please send lab requests before 1:30 PM.',
      timestamp: new Date(today.setHours(10, 30, 0, 0)).toISOString(),
      read: true,
      icon: 'flask-outline',
      category: 'Admin'
    });
  }
  return notifications;
};

// ─── FALLBACK NOTIFICATIONS ──────────────────────────────────────────
const generateFallbackNotifications = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [{
    id: `admin1_${Date.now()}`,
    title: 'OPD Session Started',
    message: 'Morning OPD session started successfully at 9:00 AM. All services are operational.',
    timestamp: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
    read: false,
    icon: 'time-outline',
    category: 'Admin'
  }, {
    id: `admin2_${Date.now() + 1}`,
    title: 'OPD Session Closed',
    message: 'Morning OPD session closed at 2:00 PM. All consultations completed successfully.',
    timestamp: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
    read: true,
    icon: 'time-outline',
    category: 'Admin'
  }, {
    id: `appt1_${Date.now() + 2}`,
    title: 'No Active Queue',
    message: 'No patients in queue. Please check back later for updates.',
    timestamp: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
    read: true,
    icon: 'people-outline',
    category: 'Appointment'
  }];
};

// ─── CATEGORY COLORS ──────────────────────────────────────────────
const CATEGORY_COLORS = {
  Appointment: {
    bg: COLORS.primary,
    icon: COLORS.white
  },
  Admin: {
    bg: COLORS.warning,
    icon: COLORS.white
  },
  Default: {
    bg: COLORS.primary,
    icon: COLORS.white
  }
};
const DoctorNotificationScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const filters = ['All', 'Appointment', 'Admin', 'Unread'];
  const animateModalIn = () => {
    Animated.parallel([Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }), Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    })]).start();
  };
  const animateModalOut = () => {
    Animated.parallel([Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }), Animated.spring(slideAnim, {
      toValue: 50,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    })]).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
    });
  };
  const loadDoctorData = async () => {
    try {
      const profileImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      let doctorData = {
        name: 'Dr. Ahmed Khan',
        color: COLORS.primary,
        color2: COLORS.secondary,
        profileImage: null
      };
      if (userData) {
        const parsed = JSON.parse(userData);
        doctorData = {
          ...doctorData,
          ...parsed
        };
      }
      if (profileImage) {
        doctorData.profileImage = profileImage;
      }
      doctorData.avatar = getInitials(doctorData.name);
      return doctorData;
    } catch (error) {
      console.error('Error loading doctor data:', error);
      return null;
    }
  };
  const safeParseDate = timestamp => {
    if (!timestamp) return new Date();
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch (e) {
      return new Date();
    }
  };
  const isToday = date => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // ─── MAIN LOAD NOTIFICATIONS - IMPORTANT EVENTS ONLY ──────────────
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      await loadDoctorData();

      // Get Today's Queue
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      let queue = [];
      if (queueData) {
        try {
          queue = JSON.parse(queueData);
        } catch (e) {
          queue = [];
        }
      }

      // Generate important notifications only
      let allNotifs = [];

      // 1) REAL important updates from backend (appointments, admin/system).
      //    Queue/token spam is excluded server-side.
      let serverNotifs = [];
      try {
        const res = await doctorService.getNotifications();
        if (Array.isArray(res?.notifications)) {
          serverNotifs = res.notifications.map(n => ({
            id: String(n._id),
            title: n.title,
            message: n.body || '',
            timestamp: n.createdAt || new Date().toISOString(),
            read: !!n.read,
            icon: n.icon && n.icon !== 'notifications' ? n.icon : 'megaphone-outline',
            category: n.type === 'appointment' ? 'Appointment' : 'Admin'
          }));
        }
      } catch (e) {/* offline — fall back to local */}

      // Only REAL backend notifications — no mock. Empty → empty state.
      allNotifs = serverNotifs;

      // Save to storage
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(allNotifs));

      // Sort - unread first, then by timestamp
      const sorted = [...allNotifs].sort((a, b) => {
        if (a.read !== b.read) {
          return a.read ? 1 : -1;
        }
        const dateA = safeParseDate(a.timestamp);
        const dateB = safeParseDate(b.timestamp);
        return dateB - dateA;
      });
      setNotifications(sorted);
      applyFilters(sorted, selectedFilter, searchQuery);
      const unreadCount = sorted.filter(n => !n.read).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
      const fallback = generateFallbackNotifications();
      setNotifications(fallback);
      applyFilters(fallback, selectedFilter, searchQuery);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, searchQuery]);
  const applyFilters = (notifs, filter, query) => {
    if (!notifs || !Array.isArray(notifs)) {
      setFilteredNotifications([]);
      return;
    }
    let result = [...notifs];
    if (filter !== 'All') {
      if (filter === 'Unread') {
        result = result.filter(n => !n.read);
      } else {
        result = result.filter(n => n.category === filter);
      }
    }
    if (query && query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(n => n.title && n.title.toLowerCase().includes(q) || n.message && n.message.toLowerCase().includes(q));
    }
    setFilteredNotifications(result);
  };
  const markAsRead = async id => {
    const updated = notifications.map(n => n.id === id ? {
      ...n,
      read: true
    } : n);
    const sorted = [...updated].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      const dateA = safeParseDate(a.timestamp);
      const dateB = safeParseDate(b.timestamp);
      return dateB - dateA;
    });
    setNotifications(sorted);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(sorted));
    applyFilters(sorted, selectedFilter, searchQuery);
    setUnreadCount(sorted.filter(n => !n.read).length);
  };
  const markAllRead = async () => {
    showConfirm({
      title: 'Mark All Read',
      message: 'Mark all notifications as read?',
      confirmLabel: 'Yes',
      icon: 'checkmark-done-outline',
      onConfirm: async () => {
        const updated = notifications.map(n => ({
          ...n,
          read: true
        }));
        const sorted = [...updated].sort((a, b) => safeParseDate(b.timestamp) - safeParseDate(a.timestamp));
        setNotifications(sorted);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(sorted));
        applyFilters(sorted, selectedFilter, searchQuery);
        setUnreadCount(0);
        // Persist to the backend so it stays read after logout/login.
        try {
          await doctorService.markAllNotificationsRead();
        } catch (e) {/* offline */}
      }
    });
  };
  const deleteNotification = async id => {
    showConfirm({
      title: 'Delete',
      message: 'Delete this notification?',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        const updated = notifications.filter(n => n.id !== id);
        const sorted = [...updated].sort((a, b) => {
          if (a.read !== b.read) {
            return a.read ? 1 : -1;
          }
          const dateA = safeParseDate(a.timestamp);
          const dateB = safeParseDate(b.timestamp);
          return dateB - dateA;
        });
        setNotifications(sorted);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(sorted));
        applyFilters(sorted, selectedFilter, searchQuery);
        setUnreadCount(sorted.filter(n => !n.read).length);
      }
    });
  };
  const handleNotificationPress = notif => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    setSelectedNotification(notif);
    setModalVisible(true);
    animateModalIn();
  };
  const closeModal = () => {
    animateModalOut();
  };
  const formatDateDisplay = timestamp => {
    if (!timestamp) return 'Just now';
    try {
      const date = safeParseDate(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Just now';
    }
  };

  // Full date + time for the detail modal (e.g. "3 Aug 2026 • 09:15 AM").
  const formatFullDateTime = timestamp => {
    try {
      const d = safeParseDate(timestamp);
      const date = d.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const time = d.toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${date} • ${time}`;
    } catch (e) {
      return '';
    }
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);
  const renderNotificationCard = ({
    item
  }) => {
    const isUnread = !item.read;
    const categoryColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Default;
    const iconName = item.icon || 'notifications-outline';
    return <TouchableOpacity key={item.id} style={[styles.notifCard, isUnread && styles.unreadCard]} activeOpacity={0.7} onPress={() => handleNotificationPress(item)}>
        <View style={[styles.iconContainer, {
        backgroundColor: categoryColors.bg
      }]}>
          <Ionicons name={iconName} size={20} color={categoryColors.icon} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.time, isUnread && styles.unreadTime]}>
              {formatDateDisplay(item.timestamp)}
            </Text>
          </View>
          <Text style={[styles.message, isUnread && styles.unreadMessage]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={e => {
        e.stopPropagation();
        deleteNotification(item.id);
      }} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>;
  };
  const NotificationModal = () => {
    if (!selectedNotification) return null;
    const categoryColors = CATEGORY_COLORS[selectedNotification.category] || CATEGORY_COLORS.Default;
    const iconName = selectedNotification.icon || 'notifications-outline';
    return <Modal visible={modalVisible} transparent={true} animationType="none" onRequestClose={closeModal} statusBarTranslucent={true}>
        <Animated.View style={[styles.modalOverlay, {
        opacity: fadeAnim,
        backgroundColor: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']
        })
      }]}>
          <Animated.View style={[styles.modalContainer, {
          transform: [{
            translateY: slideAnim
          }]
        }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Notification</Text>
              <View style={{
              width: 28
            }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
              <View style={styles.modalIconWrapper}>
                <View style={[styles.modalIconCircle, {
                backgroundColor: categoryColors.bg
              }]}>
                  <Ionicons name={iconName} size={36} color={categoryColors.icon} />
                </View>
              </View>

              <Text style={styles.modalTitle}>{selectedNotification.title}</Text>

              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaItem}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.modalMetaText}>{formatFullDateTime(selectedNotification.timestamp)}</Text>
                </View>
                <View style={styles.modalMetaDot} />
                <View style={[styles.modalCategoryBadge, {
                backgroundColor: categoryColors.bg
              }]}>
                  <Text style={[styles.modalCategoryText, {
                  color: categoryColors.icon
                }]}>
                    {selectedNotification.category}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalMessageContainer}>
                <Text style={styles.modalMessageLabel}>Details</Text>
                <View style={styles.modalMessageBox}>
                  <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.modalActionButton} onPress={closeModal} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalActionGradient} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 0
              }}>
                  <Text style={styles.modalActionText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>;
  };
  const getFilterCount = filter => {
    if (filter === 'All') return notifications.length;
    if (filter === 'Unread') return notifications.filter(n => !n.read).length;
    return notifications.filter(n => n.category === filter).length;
  };
  useEffect(() => {
    loadNotifications();
  }, []);
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={26} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Notifications</Text>

          {unreadCount > 0 && <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.textLight} />
            <TextInput style={styles.searchInput} placeholder="Search notifications..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={text => {
            setSearchQuery(text);
            applyFilters(notifications, selectedFilter, text);
          }} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => {
            setSearchQuery('');
            applyFilters(notifications, selectedFilter, '');
          }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>}
          </View>
          {/* Funnel filter icon on the right of the search box */}
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowFilterMenu(true)} activeOpacity={0.7}>
            <Ionicons name="funnel-outline" size={18} color={COLORS.primary} />
            {selectedFilter !== 'All' && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>

        {selectedFilter !== 'All' && <View style={styles.activeFilterRow}>
            <Text style={styles.activeFilterText}>Showing: {selectedFilter}</Text>
            <TouchableOpacity onPress={() => {
          setSelectedFilter('All');
          applyFilters(notifications, 'All', searchQuery);
        }}>
              <Text style={styles.activeFilterClear}>Clear</Text>
            </TouchableOpacity>
          </View>}

        <FlatList data={filteredNotifications} keyExtractor={item => item.id} renderItem={renderNotificationCard} contentContainerStyle={styles.listContainer} scrollEnabled={false} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            </View>} />

        <View style={{
        height: 20
      }} />
      </ScrollView>

      <NotificationModal />

      {/* ─── FILTER MENU (funnel) ─────────────────────────────────────── */}
      <Modal visible={showFilterMenu} transparent animationType="fade" onRequestClose={() => setShowFilterMenu(false)}>
        <TouchableOpacity style={styles.filterMenuOverlay} activeOpacity={1} onPress={() => setShowFilterMenu(false)}>
          <View style={styles.filterMenuCard}>
            <Text style={styles.filterMenuTitle}>Filter</Text>
            {filters.map(f => <TouchableOpacity key={f} style={styles.filterMenuItem} onPress={() => {
            setSelectedFilter(f);
            applyFilters(notifications, f, searchQuery);
            setShowFilterMenu(false);
          }}>
                <Ionicons name={f === 'All' ? 'albums-outline' : f === 'Appointment' ? 'calendar-outline' : f === 'Admin' ? 'shield-outline' : 'mail-unread-outline'} size={18} color={selectedFilter === f ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.filterMenuText, selectedFilter === f && {
              color: COLORS.primary,
              fontWeight: '700'
            }]}>
                  {f} ({getFilterCount(f)})
                </Text>
                {selectedFilter === f && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
              </TouchableOpacity>)}
            <View style={styles.filterMenuDivider} />
            <TouchableOpacity style={styles.filterMenuItem} onPress={() => {
            setShowFilterMenu(false);
            markAllRead();
          }}>
              <Ionicons name="checkmark-done-outline" size={18} color={COLORS.success || '#10B981'} />
              <Text style={[styles.filterMenuText, {
              color: COLORS.success || '#10B981',
              fontWeight: '700'
            }]}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scrollContent: {
    paddingBottom: 20
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  activeFilterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  activeFilterClear: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700'
  },
  filterMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 150,
    paddingRight: 18
  },
  filterMenuCard: {
    width: 230,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  filterMenuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  filterMenuText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500'
  },
  filterMenuDivider: {
    height: 1,
    backgroundColor: COLORS.border || '#E5E7EB',
    marginVertical: 4,
    marginHorizontal: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 16,
    backgroundColor: COLORS.background
  },
  screenTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  iconBtn: {
    width: 34,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 24
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16
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
  brand: {
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
  unreadBadgeContainer: {
    backgroundColor: COLORS.primary,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.border
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  filterScroll: {
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#D0D7E0'
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  filterTextActive: {
    color: COLORS.white
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 4
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  unreadCard: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary + '15',
    borderWidth: 1
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  content: {
    flex: 1
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    marginRight: 8
  },
  unreadTitle: {
    fontWeight: '700',
    color: COLORS.text
  },
  time: {
    fontSize: 11,
    color: COLORS.textLight
  },
  unreadTime: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18
  },
  unreadMessage: {
    color: COLORS.text
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4
  },
  emptyState: {
    alignItems: 'center',
    marginTop: hp(6),
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0)',
    padding: 16
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 0
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text
  },
  modalCloseBtn: {
    padding: 4
  },
  modalBody: {
    flexGrow: 0
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 24
  },
  modalIconWrapper: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  modalMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  modalMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textLight
  },
  modalCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: '600'
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.surface,
    marginVertical: 16
  },
  modalMessageContainer: {
    marginBottom: 16
  },
  modalMessageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  modalMessageBox: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22
  },
  modalActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4
  },
  modalActionGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3
  }
});
export default DoctorNotificationScreen;