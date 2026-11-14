import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar, Animated, RefreshControl, ScrollView, ActivityIndicator, Alert } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const LiveTokenQueueScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('opd');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [queueStats, setQueueStats] = useState({
    totalPatientsToday: 0,
    averageWaitTime: 0,
    tokensIssued: 0,
    patientsServed: 0
  });

  // Department configuration
  const departments = {
    opd: {
      id: 1,
      key: 'opd',
      prefix: 'A',
      name: 'Chronic OPD',
      icon: 'medical-outline',
      color: '#8B5CF6',
      bgColor: '#8B5CF6',
      doctor: 'Dr. Sarah Ahmed',
      room: 'Room 4 • OPD Block',
      label: 'OPD Consultation',
      description: 'Chronic Disease Care',
      counter: 'Counter 1-3',
      floor: 'Ground Floor',
      maxPatientsPerDay: 40,
      averageServiceTime: 12 // minutes per patient
    },
    pharmacy: {
      id: 2,
      key: 'pharmacy',
      prefix: 'P',
      name: 'Pharmacy',
      icon: 'medkit-outline',
      color: '#F59E0B',
      bgColor: '#F59E0B',
      doctor: 'Dr. Usman Malik',
      room: 'Window 2 • Pharmacy Wing',
      label: 'Pharmacy Pickup',
      description: 'Medicine Collection',
      counter: 'Window 1-4',
      floor: 'First Floor',
      maxPatientsPerDay: 60,
      averageServiceTime: 8
    },
    lab: {
      id: 3,
      key: 'lab',
      prefix: 'L',
      name: 'Laboratory',
      icon: 'flask-outline',
      color: '#10B981',
      bgColor: '#10B981',
      doctor: 'Dr. Ayesha Khan',
      room: 'Lab 05 • Ground Floor',
      label: 'Laboratory Test',
      description: 'Tests & Reports',
      counter: 'Counter A-C',
      floor: 'Ground Floor',
      maxPatientsPerDay: 35,
      averageServiceTime: 15
    }
  };

  // Queue state with real patient data
  const [queues, setQueues] = useState({
    opd: {
      tokens: [],
      currentServing: null,
      lastTokenNumber: 0,
      totalServed: 0,
      isActive: false,
      servingHistory: []
    },
    pharmacy: {
      tokens: [],
      currentServing: null,
      lastTokenNumber: 0,
      totalServed: 0,
      isActive: false,
      servingHistory: []
    },
    lab: {
      tokens: [],
      currentServing: null,
      lastTokenNumber: 0,
      totalServed: 0,
      isActive: false,
      servingHistory: []
    }
  });
  const [activeToken, setActiveToken] = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    loadUserData();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateQueues();
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load user data from signup
      let data = null;
      if (route?.params?.userData) {
        data = route.params.userData;
      } else {
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) data = JSON.parse(storedData);
      }
      let dept = 'opd';
      if (route?.params?.department) {
        const deptMap = {
          'Chronic OPD': 'opd',
          'Pharmacy': 'pharmacy',
          'Laboratory': 'lab'
        };
        dept = deptMap[route.params.department] || 'opd';
        setSelectedDepartment(dept);
      }
      if (data) {
        setUserData(data);
        await loadAllPatients(data, dept);
      } else {
        // Fallback data if no user data
        const fallbackData = {
          name: 'Patient',
          cdaCard: 'CDA-12345678',
          phone: '0300-1234567',
          age: 30,
          gender: 'Male'
        };
        setUserData(fallbackData);
        await loadAllPatients(fallbackData, dept);
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  };
  const loadAllPatients = async (user, defaultDept) => {
    try {
      // Try to load patients from AsyncStorage
      let patients = [];
      const storedPatients = await AsyncStorage.getItem('patients');
      if (storedPatients) {
        patients = JSON.parse(storedPatients);
      } else {
        // Generate realistic patient data
        patients = generateRealisticPatients(user);
        await AsyncStorage.setItem('patients', JSON.stringify(patients));
      }
      setAllPatients(patients);
      initializeQueues(user, defaultDept, patients);
    } catch (error) {
      console.log('Error loading patients:', error);
      const patients = generateRealisticPatients(user);
      setAllPatients(patients);
      initializeQueues(user, defaultDept, patients);
    }
  };
  const generateRealisticPatients = user => {
    const patients = [];
    const firstNames = ['Ahmed', 'Muhammad', 'Ali', 'Hassan', 'Fatima', 'Ayesha', 'Sara', 'Omar', 'Zain', 'Hina', 'Usman', 'Iqbal', 'Rashid', 'Nadia', 'Saima', 'Tariq', 'Shahid', 'Asma', 'Khalid', 'Rizwan'];
    const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hussain', 'Shah', 'Malik', 'Sheikh', 'Bhatti', 'Siddiqui', 'Raja'];
    const departments = ['opd', 'pharmacy', 'lab'];

    // Add current user first
    patients.push({
      id: 'P-001',
      name: user.name || 'Patient',
      cdaCard: user.cdaCard || 'CDA-12345678',
      phone: user.phone || '0300-1234567',
      age: user.age || 30,
      gender: user.gender || 'Male',
      department: 'opd',
      token: null,
      status: 'waiting'
    });

    // Generate other patients
    const totalPatients = Math.floor(Math.random() * 30) + 20;
    for (let i = 0; i < totalPatients; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const dept = departments[Math.floor(Math.random() * departments.length)];
      patients.push({
        id: `P-${String(i + 2).padStart(3, '0')}`,
        name: `${firstName} ${lastName}`,
        cdaCard: `CDA-${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`,
        phone: `03${Math.floor(Math.random() * 9)}0-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
        age: Math.floor(Math.random() * 50) + 18,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        department: dept,
        token: null,
        status: 'waiting'
      });
    }
    return patients;
  };
  const initializeQueues = (user, defaultDept, patients) => {
    const newQueues = {
      ...queues
    };
    let totalPatientsToday = 0;
    let totalTokensIssued = 0;
    let totalServed = 0;
    Object.keys(departments).forEach(key => {
      const dept = departments[key];
      const deptPatients = patients.filter(p => p.department === key);
      const tokenCount = Math.min(deptPatients.length, dept.maxPatientsPerDay);
      const tokens = [];
      const baseNumber = Math.floor(Math.random() * 10) + 1;

      // Sort patients - user first if in this department
      const sortedPatients = deptPatients.sort((a, b) => {
        if (a.name === user.name) return -1;
        if (b.name === user.name) return 1;
        return 0;
      });

      // Generate tokens for each patient
      for (let i = 0; i < Math.min(sortedPatients.length, 25); i++) {
        const patient = sortedPatients[i];
        const number = baseNumber + i;
        const tokenStr = `${dept.prefix}-${String(number).padStart(3, '0')}`;

        // Determine status - some patients already served
        let status = 'waiting';
        let servedTime = null;
        if (i < Math.floor(tokenCount * 0.25) && i < 5) {
          status = 'served';
          servedTime = new Date(Date.now() - (i + 1) * 300000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (i === 0 && tokenCount > 0) {
          status = 'serving';
        }
        const isUser = patient.name === user.name;
        tokens.push({
          id: tokenStr,
          number: number,
          token: tokenStr,
          status: status,
          patient: patient,
          patientName: patient.name,
          cdaCard: patient.cdaCard,
          age: patient.age,
          gender: patient.gender,
          time: new Date(Date.now() - i * 180000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          servedTime: servedTime,
          estimatedWait: (i + 1) * dept.averageServiceTime,
          isUser: isUser,
          position: i + 1
        });
      }
      const servedTokens = tokens.filter(t => t.status === 'served');
      const waitingTokens = tokens.filter(t => t.status === 'waiting');
      const currentServing = tokens.find(t => t.status === 'serving');
      newQueues[key] = {
        tokens: tokens,
        currentServing: currentServing || null,
        lastTokenNumber: baseNumber + tokenCount - 1,
        totalServed: servedTokens.length,
        totalWaiting: waitingTokens.length,
        totalTokens: tokens.length,
        isActive: tokens.some(t => t.isUser),
        servingHistory: servedTokens.map(t => ({
          token: t.token,
          patient: t.patientName,
          time: t.servedTime || t.time
        }))
      };
      totalPatientsToday += tokens.length;
      totalTokensIssued += tokens.length;
      totalServed += servedTokens.length;
    });
    setQueues(newQueues);
    setQueueStats({
      totalPatientsToday,
      averageWaitTime: Math.floor(Math.random() * 10) + 10,
      tokensIssued: totalTokensIssued,
      patientsServed: totalServed
    });

    // Set active token for the selected department
    const deptKey = defaultDept || 'opd';
    const userToken = newQueues[deptKey].tokens.find(t => t.isUser);
    if (userToken) {
      setActiveToken({
        key: deptKey,
        ...userToken,
        ...departments[deptKey]
      });
    } else {
      // Add user to queue if not present
      addUserToQueue(deptKey, user);
    }
  };
  const addUserToQueue = (deptKey, user) => {
    const dept = departments[deptKey];
    const queue = queues[deptKey];
    const newNumber = queue.lastTokenNumber + 1;
    const tokenStr = `${dept.prefix}-${String(newNumber).padStart(3, '0')}`;
    const newToken = {
      id: tokenStr,
      number: newNumber,
      token: tokenStr,
      status: 'waiting',
      patient: {
        name: user.name || 'Patient',
        cdaCard: user.cdaCard || 'CDA-12345678',
        phone: user.phone || '0300-1234567',
        age: user.age || 30,
        gender: user.gender || 'Male'
      },
      patientName: user.name || 'Patient',
      cdaCard: user.cdaCard || 'CDA-12345678',
      age: user.age || 30,
      gender: user.gender || 'Male',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      estimatedWait: (queue.tokens.filter(t => t.status === 'waiting').length + 1) * dept.averageServiceTime,
      isUser: true,
      position: queue.tokens.filter(t => t.status === 'waiting').length + 1
    };
    setQueues(prev => ({
      ...prev,
      [deptKey]: {
        ...prev[deptKey],
        tokens: [...prev[deptKey].tokens, newToken],
        lastTokenNumber: newNumber,
        totalTokens: prev[deptKey].totalTokens + 1,
        totalWaiting: prev[deptKey].totalWaiting + 1,
        isActive: true
      }
    }));
    setActiveToken({
      key: deptKey,
      ...newToken,
      ...dept
    });
  };
  const updateQueues = () => {
    const updatedQueues = {
      ...queues
    };
    let totalServed = 0;
    let totalWaiting = 0;
    Object.keys(updatedQueues).forEach(key => {
      const dept = departments[key];
      const queue = updatedQueues[key];
      const waitingTokens = queue.tokens.filter(t => t.status === 'waiting');
      const servingTokens = queue.tokens.filter(t => t.status === 'serving');

      // Update waiting times for all waiting tokens
      waitingTokens.forEach((token, index) => {
        token.estimatedWait = Math.max(2, (index + 1) * dept.averageServiceTime - Math.floor(Math.random() * 3));
        token.position = index + 1;
      });

      // Serve next patient if none being served and there are waiting
      if (servingTokens.length === 0 && waitingTokens.length > 0) {
        const nextToServe = waitingTokens[0];
        nextToServe.status = 'serving';

        // Move previous serving to served if exists
        const prevServing = queue.tokens.find(t => t.status === 'serving' && t.id !== nextToServe.id);
        if (prevServing) {
          prevServing.status = 'served';
          prevServing.servedTime = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
          queue.servingHistory.unshift({
            token: prevServing.token,
            patient: prevServing.patientName,
            time: prevServing.servedTime
          });
          queue.totalServed += 1;
        }
        queue.currentServing = nextToServe;
      }

      // Update counts
      const servedCount = queue.tokens.filter(t => t.status === 'served').length;
      const waitingCount = queue.tokens.filter(t => t.status === 'waiting').length;
      totalServed += servedCount;
      totalWaiting += waitingCount;
      queue.totalServed = servedCount;
      queue.totalWaiting = waitingCount;

      // Remove old served tokens (keep last 20)
      const servedTokens = queue.tokens.filter(t => t.status === 'served');
      if (servedTokens.length > 20) {
        const toRemove = servedTokens.slice(0, servedTokens.length - 20);
        queue.tokens = queue.tokens.filter(t => !toRemove.includes(t));
      }
    });
    setQueues(updatedQueues);
    setQueueStats(prev => ({
      ...prev,
      totalPatientsToday: totalServed + totalWaiting,
      patientsServed: totalServed
    }));

    // Update active token if it exists
    if (activeToken) {
      const updatedToken = updatedQueues[activeToken.key]?.tokens.find(t => t.id === activeToken.id);
      if (updatedToken) {
        setActiveToken(prev => ({
          ...prev,
          ...updatedToken
        }));
      }
    }
  };
  const switchDepartment = deptKey => {
    setSelectedDepartment(deptKey);
    const dept = departments[deptKey];
    const queue = queues[deptKey];
    const userToken = queue.tokens.find(t => t.isUser);
    if (userToken) {
      setActiveToken({
        key: deptKey,
        ...userToken,
        ...dept
      });
    } else if (userData) {
      addUserToQueue(deptKey, userData);
    }
  };
  const getStatusColor = status => {
    switch (status) {
      case 'waiting':
        return '#F59E0B';
      case 'serving':
        return '#34D399';
      case 'served':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };
  const getStatusText = status => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'serving':
        return 'Now Serving';
      case 'served':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await loadAllPatients(userData, selectedDepartment);
    setRefreshing(false);
  };
  const formatTime = date => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Department Selector
  const renderDepartmentSelector = () => <View style={styles.deptSelector}>
      {Object.keys(departments).map(key => {
      const dept = departments[key];
      const isActive = selectedDepartment === key;
      const queue = queues[key];
      const waitingCount = queue?.tokens?.filter(t => t.status === 'waiting').length || 0;
      const servingCount = queue?.tokens?.filter(t => t.status === 'serving').length || 0;
      return <TouchableOpacity key={key} style={[styles.deptSelectorBtn, isActive && styles.deptSelectorActive, {
        borderColor: isActive ? dept.color : COLORS.border
      }]} onPress={() => switchDepartment(key)} activeOpacity={0.7}>
            <View style={[styles.deptSelectorIcon, {
          backgroundColor: dept.color + '15'
        }]}>
              <Ionicons name={dept.icon} size={18} color={dept.color} />
            </View>
            <Text style={[styles.deptSelectorName, isActive && {
          color: dept.color
        }]}>
              {dept.name}
            </Text>
            <View style={styles.deptSelectorStats}>
              {servingCount > 0 && <View style={[styles.deptServingBadge, {
            backgroundColor: '#34D399'
          }]}>
                  <Text style={styles.deptBadgeText}>● {servingCount}</Text>
                </View>}
              {waitingCount > 0 && <View style={[styles.deptWaitingBadge, {
            backgroundColor: '#F59E0B'
          }]}>
                  <Text style={styles.deptBadgeText}>{waitingCount}</Text>
                </View>}
            </View>
          </TouchableOpacity>;
    })}
    </View>;

  // Render Active Token
  const renderActiveToken = () => {
    if (!activeToken) {
      return <View style={styles.noTokenCard}>
          <Ionicons name="ticket-outline" size={50} color={COLORS.textLight} />
          <Text style={styles.noTokenTitle}>No Active Token</Text>
          <Text style={styles.noTokenText}>Please generate a token from the department</Text>
        </View>;
    }
    const dept = departments[activeToken.key];
    const queue = queues[activeToken.key];
    const waitingTokens = queue?.tokens?.filter(t => t.status === 'waiting') || [];
    const position = waitingTokens.findIndex(t => t.id === activeToken.id) + 1;
    const totalWaiting = waitingTokens.length;
    const patientsAhead = position > 1 ? position - 1 : 0;
    return <View style={[styles.activeTokenCard, {
      borderTopColor: dept?.color || COLORS.primary
    }]}>
        <View style={styles.tokenHeader}>
          <View>
            <Text style={styles.tokenDept}>{dept?.name}</Text>
            <Text style={styles.tokenLabel}>Your Token</Text>
          </View>
          <View style={[styles.tokenBadge, {
          backgroundColor: dept?.color + '15'
        }]}>
            <Text style={[styles.tokenBadgeText, {
            color: dept?.color
          }]}>
              {activeToken.token}
            </Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientInfoCard}>
          <View style={styles.patientInfoRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.primary} />
            <Text style={styles.patientInfoLabel}>Name:</Text>
            <Text style={styles.patientInfoValue}>{activeToken.patientName}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Ionicons name="card-outline" size={16} color={COLORS.primary} />
            <Text style={styles.patientInfoLabel}>CDA Card:</Text>
            <Text style={styles.patientInfoValue}>{activeToken.cdaCard}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.patientInfoLabel}>Age:</Text>
            <Text style={styles.patientInfoValue}>{activeToken.age} years</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.patientInfoLabel}>Gender:</Text>
            <Text style={styles.patientInfoValue}>{activeToken.gender}</Text>
          </View>
        </View>

        {/* Queue Position */}
        <View style={styles.positionContainer}>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Your Position in Queue</Text>
            <Text style={styles.positionValue}>
              {activeToken.status === 'serving' ? 'Now Serving' : `#${position} of ${totalWaiting}`}
            </Text>
          </View>
          
          {activeToken.status !== 'serving' && <>
              <View style={styles.positionBar}>
                <View style={[styles.positionFill, {
              width: `${totalWaiting > 0 ? (totalWaiting - position) / totalWaiting * 100 : 0}%`,
              backgroundColor: dept?.color || COLORS.primary
            }]} />
              </View>
              <View style={styles.positionInfo}>
                <Text style={styles.positionInfoText}>
                  👥 {patientsAhead} patient{patientsAhead > 1 ? 's' : ''} ahead of you
                </Text>
                <Text style={styles.positionInfoText}>
                  ⏱️ Estimated Wait: {activeToken.estimatedWait || position * dept?.averageServiceTime || 15} mins
                </Text>
              </View>
            </>}

          {activeToken.status === 'serving' && <View style={styles.servingAlert}>
              <Ionicons name="alert-circle" size={20} color="#34D399" />
              <Text style={styles.servingAlertText}>Please proceed to {dept?.counter || 'the counter'}</Text>
            </View>}
        </View>

        {/* Status */}
        <View style={[styles.statusContainer, {
        backgroundColor: getStatusColor(activeToken.status) + '15'
      }]}>
          <View style={[styles.statusDot, {
          backgroundColor: getStatusColor(activeToken.status)
        }]} />
          <Text style={[styles.statusText, {
          color: getStatusColor(activeToken.status)
        }]}>
            {getStatusText(activeToken.status)}
          </Text>
          {activeToken.status === 'serving' && <TouchableOpacity style={[styles.proceedBtn, {
          backgroundColor: dept?.color || COLORS.primary
        }]} onPress={() => Alert.alert('Proceed', 'Please proceed to the counter')}>
              <Text style={styles.proceedBtnText}>Go to Counter →</Text>
            </TouchableOpacity>}
          {activeToken.status === 'waiting' && <Text style={styles.waitingHint}>
              {patientsAhead > 5 ? 'You can wait in the waiting area' : 'Please stay nearby'}
            </Text>}
        </View>
      </View>;
  };

  // Render Queue List
  const renderQueueList = () => {
    const deptKey = selectedDepartment;
    const queue = queues[deptKey];
    const dept = departments[deptKey];
    if (!queue || queue.tokens.length === 0) {
      return <View style={styles.emptyQueue}>
          <Ionicons name="people-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyQueueText}>No patients in queue</Text>
        </View>;
    }
    const waitingTokens = queue.tokens.filter(t => t.status === 'waiting');
    const servingTokens = queue.tokens.filter(t => t.status === 'serving');
    const servedTokens = queue.tokens.filter(t => t.status === 'served');
    return <View style={styles.queueListContainer}>
        <Text style={styles.queueListTitle}>📋 Queue Overview</Text>
        
        {/* Now Serving */}
        {servingTokens.length > 0 && <View style={styles.queueSection}>
            <Text style={styles.queueSectionLabel}>🔴 Now Serving</Text>
            {servingTokens.map((token, idx) => <View key={`serving-${token.id ?? token.token ?? 'x'}-${idx}`} style={[styles.queueItem, styles.servingItem]}>
                <View style={styles.queueItemLeft}>
                  <View style={[styles.queueTokenBadge, {
              backgroundColor: dept.color + '15'
            }]}>
                    <Text style={[styles.queueTokenText, {
                color: dept.color
              }]}>{token.token}</Text>
                  </View>
                  <View>
                    <Text style={styles.queuePatientName}>{token.patientName}</Text>
                    <Text style={styles.queueTime}>CDA: {token.cdaCard}</Text>
                  </View>
                </View>
                <View style={[styles.servingBadge, {
            backgroundColor: dept.color
          }]}>
                  <Text style={styles.servingBadgeText}>Serving</Text>
                </View>
              </View>)}
          </View>}

        {/* Waiting */}
        {waitingTokens.length > 0 && <View style={styles.queueSection}>
            <Text style={styles.queueSectionLabel}>⏳ Waiting ({waitingTokens.length})</Text>
            {waitingTokens.slice(0, 15).map((token, idx) => <View key={`waiting-${token.id ?? token.token ?? 'x'}-${idx}`} style={[styles.queueItem, token.isUser && styles.userQueueItem]}>
                <View style={styles.queueItemLeft}>
                  <Text style={styles.queuePosition}>#{token.position}</Text>
                  <View style={styles.queueTokenBadge}>
                    <Text style={styles.queueTokenText}>{token.token}</Text>
                  </View>
                  <View>
                    <Text style={[styles.queuePatientName, token.isUser && styles.userName]}>
                      {token.patientName} {token.isUser && '⭐'}
                    </Text>
                    <Text style={styles.queueTime}>Age: {token.age} | {token.gender}</Text>
                  </View>
                </View>
                <View style={styles.queueRightInfo}>
                  <Text style={styles.queueWaitTime}>{token.estimatedWait || token.position * dept?.averageServiceTime || 15}m</Text>
                  {token.isUser && <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>}
                </View>
              </View>)}
            {waitingTokens.length > 15 && <Text style={styles.moreText}>+{waitingTokens.length - 15} more waiting</Text>}
          </View>}

        {/* Recently Served */}
        {servedTokens.length > 0 && <View style={styles.queueSection}>
            <Text style={styles.queueSectionLabel}>✅ Recently Served ({servedTokens.length})</Text>
            {servedTokens.slice(-8).reverse().map((token, idx) => <View key={`served-${token.id ?? token.token ?? 'x'}-${idx}`} style={[styles.queueItem, styles.servedItem]}>
                <View style={styles.queueItemLeft}>
                  <View style={styles.queueTokenBadge}>
                    <Text style={[styles.queueTokenText, styles.servedTokenText]}>{token.token}</Text>
                  </View>
                  <View>
                    <Text style={[styles.queuePatientName, styles.servedName]}>{token.patientName}</Text>
                    <Text style={styles.queueTime}>{token.servedTime || token.time}</Text>
                  </View>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              </View>)}
          </View>}
      </View>;
  };

  // Render Stats
  const renderStats = () => <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{queueStats.totalPatientsToday}</Text>
        <Text style={styles.statLabel}>Total Patients</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{queueStats.tokensIssued}</Text>
        <Text style={styles.statLabel}>Tokens Issued</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{queueStats.patientsServed}</Text>
        <Text style={styles.statLabel}>Served Today</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{queueStats.averageWaitTime}m</Text>
        <Text style={styles.statLabel}>Avg. Wait Time</Text>
      </View>
    </View>;
  if (loading) {
    return <SafeAreaView style={styles.container}>
        <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        <SkeletonList count={6} topInset />
      </SafeAreaView>;
  }
  return <SafeAreaView style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <LinearGradient colors={[COLORS.primary + '08', COLORS.background, COLORS.background]} style={styles.gradientBackground} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Queue Status</Text>
        <TouchableOpacity style={styles.refreshBtnSmall} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />} showsVerticalScrollIndicator={false}>
        {renderDepartmentSelector()}
        {renderStats()}
        {renderActiveToken()}
        {renderQueueList()}

        <View style={styles.liveUpdates}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live updates every 30 seconds</Text>
          <Text style={styles.liveTime}>⏰ {formatTime(currentTime)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>;
};
const makeStyles = COLORS => StyleSheet.create({
  // Empty state: these were referenced but never defined, so the block
  // rendered unstyled.
  noTokenCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24
  },
  noTokenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 14
  },
  noTokenText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: wp(3.5),
    color: COLORS.textSecondary
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1) : StatusBar.currentHeight + hp(1),
    paddingBottom: hp(1.5),
    gap: wp(3)
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text
  },
  refreshBtnSmall: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
    paddingTop: hp(1)
  },
  // Department Selector
  deptSelector: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.5)
  },
  deptSelectorBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(2.5),
    alignItems: 'center',
    borderWidth: 2,
    ...SHADOWS.small,
    position: 'relative'
  },
  deptSelectorActive: {
    backgroundColor: COLORS.card,
    borderWidth: 2.5
  },
  deptSelectorIcon: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.3)
  },
  deptSelectorName: {
    fontSize: wp(2.6),
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center'
  },
  deptSelectorStats: {
    flexDirection: 'row',
    gap: wp(1),
    marginTop: hp(0.2)
  },
  deptServingBadge: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.1),
    borderRadius: wp(1.5)
  },
  deptWaitingBadge: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.1),
    borderRadius: wp(1.5)
  },
  deptBadgeText: {
    color: COLORS.white,
    fontSize: wp(2),
    fontWeight: '600'
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginBottom: hp(1.5)
  },
  statCard: {
    flex: 1,
    minWidth: wp(20),
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small
  },
  statNumber: {
    fontSize: wp(4.5),
    fontWeight: '800',
    color: COLORS.text
  },
  statLabel: {
    fontSize: wp(2.2),
    color: COLORS.textSecondary,
    marginTop: hp(0.1),
    textAlign: 'center'
  },
  // Active Token
  activeTokenCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    padding: wp(4),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 4,
    ...SHADOWS.medium,
    marginBottom: hp(1.5)
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1)
  },
  tokenDept: {
    fontSize: wp(3),
    color: COLORS.textSecondary
  },
  tokenLabel: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  tokenBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(2)
  },
  tokenBadgeText: {
    fontSize: wp(4.5),
    fontWeight: '900'
  },
  patientInfoCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(2.5),
    padding: wp(2.5),
    marginBottom: hp(1),
    gap: hp(0.2)
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1)
  },
  patientInfoLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  patientInfoValue: {
    fontSize: wp(2.8),
    color: COLORS.text,
    fontWeight: '600'
  },
  // Position
  positionContainer: {
    marginVertical: hp(0.5)
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.3)
  },
  positionLabel: {
    fontSize: wp(3),
    color: COLORS.textSecondary
  },
  positionValue: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  positionBar: {
    height: hp(0.6),
    backgroundColor: COLORS.border,
    borderRadius: wp(1),
    overflow: 'hidden',
    marginBottom: hp(0.3)
  },
  positionFill: {
    height: '100%',
    borderRadius: wp(1)
  },
  positionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(0.2)
  },
  positionInfoText: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(2.5),
    borderRadius: wp(3),
    marginTop: hp(0.5),
    gap: wp(2)
  },
  statusDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1)
  },
  statusText: {
    flex: 1,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  proceedBtn: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(2)
  },
  proceedBtnText: {
    color: COLORS.white,
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  waitingHint: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary
  },
  servingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#34D39915',
    padding: wp(2),
    borderRadius: wp(2),
    marginTop: hp(0.3)
  },
  servingAlertText: {
    fontSize: wp(3),
    color: '#34D399',
    fontWeight: '600'
  },
  // Queue List
  queueListContainer: {
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    padding: wp(4),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    marginBottom: hp(1.5)
  },
  queueListTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1)
  },
  queueSection: {
    marginBottom: hp(1)
  },
  queueSectionLabel: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: hp(0.5)
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40'
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flex: 1
  },
  queuePosition: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    width: wp(4),
    fontWeight: '600'
  },
  queueTokenBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(1.5),
    backgroundColor: COLORS.backgroundSecondary,
    minWidth: wp(8),
    alignItems: 'center'
  },
  queueTokenText: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: COLORS.text
  },
  queuePatientName: {
    fontSize: wp(3),
    color: COLORS.text,
    fontWeight: '500'
  },
  queueTime: {
    fontSize: wp(2.4),
    color: COLORS.textLight
  },
  queueRightInfo: {
    alignItems: 'flex-end',
    gap: hp(0.1)
  },
  queueWaitTime: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: COLORS.primary
  },
  servingItem: {
    backgroundColor: COLORS.primary + '05',
    borderRadius: wp(2),
    borderBottomWidth: 0
  },
  servingBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(2)
  },
  servingBadgeText: {
    color: COLORS.white,
    fontSize: wp(2.2),
    fontWeight: '600'
  },
  userQueueItem: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: wp(2),
    borderBottomWidth: 0
  },
  userName: {
    fontWeight: '700',
    color: COLORS.primary
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.1),
    borderRadius: wp(1.5)
  },
  youBadgeText: {
    color: COLORS.white,
    fontSize: wp(2),
    fontWeight: '700'
  },
  servedItem: {
    opacity: 0.7
  },
  servedTokenText: {
    color: COLORS.success
  },
  servedName: {
    color: COLORS.textSecondary
  },
  moreText: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: hp(0.3)
  },
  emptyQueue: {
    padding: wp(4),
    alignItems: 'center',
    gap: hp(0.5)
  },
  emptyQueueText: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary
  },
  // Live Updates
  liveUpdates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1)
  },
  liveDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
    backgroundColor: '#EF4444'
  },
  liveText: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  liveTime: {
    fontSize: wp(2.8),
    color: COLORS.textLight
  }
});
export default LiveTokenQueueScreen;