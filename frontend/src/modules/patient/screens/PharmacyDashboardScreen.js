import React, { useState, useEffect, useRef } from 'react';
import BrandLogo from '../../../components/ui/BrandLogo';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, ActivityIndicator, RefreshControl, Alert, Modal, Platform, TextInput, Share, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;

// ─── COMPLETE LAB TESTS LIST ──────────────────────────────────────────────
const getAllLabTests = () => [
// Cardiac Tests
{
  id: '1',
  name: 'ECG',
  category: 'Cardiac Tests',
  icon: 'heart-outline',
  color: '#EF4444'
}, {
  id: '2',
  name: 'Echocardiogram',
  category: 'Cardiac Tests',
  icon: 'scan-outline',
  color: '#EF4444'
}, {
  id: '3',
  name: 'Stress Test',
  category: 'Cardiac Tests',
  icon: 'fitness-outline',
  color: '#EF4444'
}, {
  id: '4',
  name: 'Holter Monitoring',
  category: 'Cardiac Tests',
  icon: 'watch-outline',
  color: '#EF4444'
}, {
  id: '5',
  name: 'Troponin Test',
  category: 'Cardiac Tests',
  icon: 'water-outline',
  color: '#EF4444'
},
// Blood Tests
{
  id: '6',
  name: 'Complete Blood Count (CBC)',
  category: 'Blood Tests',
  icon: 'water-outline',
  color: '#F59E0B'
}, {
  id: '7',
  name: 'Lipid Profile',
  category: 'Blood Tests',
  icon: 'heart-outline',
  color: '#F59E0B'
}, {
  id: '8',
  name: 'Blood Sugar (Fasting)',
  category: 'Blood Tests',
  icon: 'pulse-outline',
  color: '#F59E0B'
}, {
  id: '9',
  name: 'HbA1c',
  category: 'Blood Tests',
  icon: 'fitness-outline',
  color: '#F59E0B'
}, {
  id: '10',
  name: 'Thyroid Function Test',
  category: 'Blood Tests',
  icon: 'flash-outline',
  color: '#F59E0B'
}, {
  id: '11',
  name: 'Vitamin D',
  category: 'Blood Tests',
  icon: 'sunny-outline',
  color: '#F59E0B'
}, {
  id: '12',
  name: 'Liver Function Tests (LFT)',
  category: 'Blood Tests',
  icon: 'leaf-outline',
  color: '#F59E0B'
}, {
  id: '13',
  name: 'Kidney Function Tests (KFT)',
  category: 'Blood Tests',
  icon: 'filter-outline',
  color: '#F59E0B'
},
// Hormonal Tests
{
  id: '14',
  name: 'TSH',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '15',
  name: 'T3',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '16',
  name: 'T4',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '17',
  name: 'Cortisol',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '18',
  name: 'Testosterone',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '19',
  name: 'FSH',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '20',
  name: 'LH',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
}, {
  id: '21',
  name: 'Prolactin',
  category: 'Hormonal Tests',
  icon: 'flash-outline',
  color: '#8B5CF6'
},
// Infectious Diseases
{
  id: '22',
  name: 'Hepatitis B',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
}, {
  id: '23',
  name: 'Hepatitis C',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
}, {
  id: '24',
  name: 'HIV Test',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
}, {
  id: '25',
  name: 'Dengue Test',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
}, {
  id: '26',
  name: 'Malaria Test',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
}, {
  id: '27',
  name: 'Typhoid Test',
  category: 'Infectious Diseases',
  icon: 'bug-outline',
  color: '#10B981'
},
// Imaging
{
  id: '28',
  name: 'X-Ray (Chest)',
  category: 'Imaging',
  icon: 'scan-outline',
  color: '#6366F1'
}, {
  id: '29',
  name: 'Ultrasound (Abdomen)',
  category: 'Imaging',
  icon: 'radio-outline',
  color: '#6366F1'
}, {
  id: '30',
  name: 'CT Scan (Brain)',
  category: 'Imaging',
  icon: 'scan-outline',
  color: '#6366F1'
}, {
  id: '31',
  name: 'MRI (Brain)',
  category: 'Imaging',
  icon: 'scan-outline',
  color: '#6366F1'
}, {
  id: '32',
  name: 'MRI (Spine)',
  category: 'Imaging',
  icon: 'scan-outline',
  color: '#6366F1'
},
// Other Tests
{
  id: '33',
  name: 'Urine Routine (R/E)',
  category: 'Other Tests',
  icon: 'flask-outline',
  color: '#06B6D4'
}, {
  id: '34',
  name: 'Urine Culture',
  category: 'Other Tests',
  icon: 'bug-outline',
  color: '#06B6D4'
}, {
  id: '35',
  name: 'Stool Examination',
  category: 'Other Tests',
  icon: 'flask-outline',
  color: '#06B6D4'
}, {
  id: '36',
  name: 'Sputum Examination',
  category: 'Other Tests',
  icon: 'flask-outline',
  color: '#06B6D4'
}, {
  id: '37',
  name: 'Pap Smear',
  category: 'Other Tests',
  icon: 'flask-outline',
  color: '#06B6D4'
}];
const LabDashboardScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // ─── State ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useMinLoading(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeToken, setActiveToken] = useState(null);
  const [currentServing, setCurrentServing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTests, setFilteredTests] = useState([]);

  // ─── Statistics ────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    todayTests: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    total: 0,
    sampleCollected: 0
  });

  // ─── Lab Tests ──────────────────────────────────────────────────────────
  const [labTests, setLabTests] = useState([]);

  // ─── Test History ──────────────────────────────────────────────────────
  const [testHistory, setTestHistory] = useState([]);

  // ─── Notifications ──────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);

  // ─── Modals ──────────────────────────────────────────────────────────────
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [reportNotes, setReportNotes] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportToUpload, setReportToUpload] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // ─── Refs for scrolling ────────────────────────────────────────────────
  const scrollViewRef = useRef(null);
  const testsRef = useRef(null);
  const notificationsRef = useRef(null);

  // ─── Load Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAllData();
  }, []);
  const loadAllData = async () => {
    setLoading(true);
    try {
      let data = route?.params?.userData || null;
      if (!data) {
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) data = JSON.parse(storedData);
      }
      setUserData(data);
      const stored = await AsyncStorage.getItem('appointments');
      let allAppts = [];
      if (stored) allAppts = JSON.parse(stored);

      // Get lab appointments
      const labAppts = allAppts.filter(app => app.department === 'Laboratory' || app.department === 'Lab');

      // Sort by date (newest first)
      const sortedAppts = [...labAppts].sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

      // Get the latest lab token
      const latestToken = sortedAppts.length > 0 ? sortedAppts[0] : null;

      // ─── SET ACTIVE TOKEN ──────────────────────────────────────────────
      if (latestToken) {
        setActiveToken(latestToken);
        const tokenNum = parseInt(latestToken.token.split('-')[1]);
        const servingNum = tokenNum + Math.floor(Math.random() * 5) + 3;
        setCurrentServing({
          token: `L-${String(servingNum).padStart(3, '0')}`,
          position: Math.floor(Math.random() * 4) + 2,
          waitTime: Math.floor(Math.random() * 20) + 15
        });
      } else {
        setActiveToken(null);
        setCurrentServing({
          token: 'L-036',
          position: 0,
          waitTime: 0
        });
      }

      // ─── Statistics ──────────────────────────────────────────────────
      const today = new Date().toDateString();
      const todayTests = labAppts.filter(app => new Date(app.bookedAt).toDateString() === today);
      const pending = labAppts.filter(app => app.status === 'pending' || app.status === 'Confirmed');
      const processing = labAppts.filter(app => app.status === 'processing' || app.status === 'sample_collected');
      const completed = labAppts.filter(app => app.status === 'completed' || app.status === 'Report Ready');
      const sampleCollected = labAppts.filter(app => app.status === 'sample_collected');
      setStats({
        todayTests: todayTests.length || 5,
        pending: pending.length || 3,
        processing: processing.length || 2,
        completed: completed.length || 4,
        total: labAppts.length || 0,
        sampleCollected: sampleCollected.length || 1
      });

      // ─── Lab Tests ────────────────────────────────────────────────────
      const testsStr = await AsyncStorage.getItem('labTests');
      let tests = [];
      if (testsStr) {
        tests = JSON.parse(testsStr);
      } else {
        tests = getAllLabTests();
        await AsyncStorage.setItem('labTests', JSON.stringify(tests));
      }
      setLabTests(tests);
      setFilteredTests(tests);

      // ─── Test History ─────────────────────────────────────────────────
      const history = labAppts.filter(app => app.status === 'completed' || app.status === 'Report Ready').slice(0, 5).map(app => ({
        id: app.id,
        test: app.departmentData?.testType || 'Lab Test',
        date: app.date,
        status: app.status,
        report: app.report,
        token: app.token
      }));
      if (history.length === 0 && latestToken) {
        setTestHistory([{
          id: 'h1',
          test: latestToken.departmentData?.testType || 'CBC',
          date: new Date().toISOString(),
          status: 'completed',
          token: latestToken.token
        }]);
      } else if (history.length === 0) {
        setTestHistory([{
          id: 'h1',
          test: 'CBC',
          date: new Date().toISOString(),
          status: 'completed',
          token: 'L-042'
        }]);
      } else {
        setTestHistory(history);
      }

      // ─── Notifications ──────────────────────────────────────────────
      const tokenMsg = latestToken ? `Your token ${latestToken.token} is in queue` : 'No lab token found';
      setNotifications([{
        id: '1',
        type: 'token',
        message: tokenMsg
      }, {
        id: '2',
        type: 'ready',
        message: 'Report ready for collection - Lab 05'
      }, {
        id: '3',
        type: 'reminder',
        message: 'Sample collection reminder'
      }]);
      setStats({
        todayTests: todayTests.length || 5,
        pending: pending.length || 3,
        processing: processing.length || 2,
        completed: completed.length || 4,
        total: labAppts.length || 0,
        sampleCollected: sampleCollected.length || 1
      });
    } catch (error) {
      console.log('Error loading lab data:', error);
    }
    setLoading(false);
  };

  // ─── Helper Functions ──────────────────────────────────────────────────
  const getStatusColor = status => {
    switch (status) {
      case 'Available':
        return '#2ECC71';
      case 'Limited Stock':
        return '#F39C12';
      case 'Out of Stock':
        return '#E74C3C';
      default:
        return COLORS.textSecondary;
    }
  };
  const getStatusBgColor = status => {
    switch (status) {
      case 'Available':
        return '#2ECC7115';
      case 'Limited Stock':
        return '#F39C1215';
      case 'Out of Stock':
        return '#E74C3C15';
      default:
        return COLORS.border;
    }
  };
  const getStatusIcon = status => {
    switch (status) {
      case 'Available':
        return 'checkmark-circle';
      case 'Limited Stock':
        return 'alert-circle';
      case 'Out of Stock':
        return 'close-circle';
      default:
        return 'ellipse-outline';
    }
  };

  // ─── Search Function ──────────────────────────────────────────────────
  const handleSearch = query => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredTests(labTests);
    } else {
      const filtered = labTests.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()));
      setFilteredTests(filtered);
    }
  };

  // ─── All Actions ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };
  const handleShareToken = async () => {
    if (!activeToken) {
      Alert.alert('No Token', 'You don\'t have any active lab token.');
      return;
    }
    try {
      const msg = `CDA Hospital - Laboratory Token\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `Token: ${activeToken.token}\n` + `Patient: ${activeToken.patientName || userData?.name || 'Patient'}\n` + `Position: ${currentServing?.position || 'N/A'}\n` + `Wait Time: ${currentServing?.waitTime || 'N/A'} mins\n` + `Test: ${activeToken.departmentData?.testType || 'Lab Test'}\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `CDA Hospital Islamabad\n` + `SehatLine - Digital Laboratory`;
      await Share.share({
        message: msg,
        title: 'Laboratory Token'
      });
    } catch (e) {
      Alert.alert('Error', 'Unable to share token');
    }
  };
  const handleDownloadToken = () => {
    if (!activeToken) {
      Alert.alert('No Token', 'You don\'t have any active lab token.');
      return;
    }
    Alert.alert('Download Token', `Token ${activeToken.token} PDF would download here`);
  };
  const handleGenerateToken = () => {
    navigation.navigate('GenerateTokenScreen', {
      userData,
      defaultDepartment: 'Laboratory Token'
    });
  };
  const handleViewQueue = () => {
    navigation.navigate('LiveTokenQueueScreen', {
      userData,
      department: 'Laboratory'
    });
  };
  const handleTestTypes = () => {
    navigation.navigate('LabTestsPriceScreen', {
      userData
    });
  };
  const handleUploadReport = async () => {
    if (!reportToUpload || !reportNotes.trim()) {
      Alert.alert('Missing Info', 'Please add report notes.');
      return;
    }
    try {
      const stored = await AsyncStorage.getItem('appointments');
      if (stored) {
        const allAppointments = JSON.parse(stored);
        const index = allAppointments.findIndex(a => a.id === reportToUpload.id);
        if (index !== -1) {
          allAppointments[index].report = {
            notes: reportNotes,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
          };
          allAppointments[index].status = 'Report Ready';
          await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));
          Alert.alert('Success', 'Report uploaded successfully!');
          setShowReportModal(false);
          setReportNotes('');
          setReportToUpload(null);
          loadAllData();
        }
      }
    } catch (error) {
      console.log('Error uploading report:', error);
      Alert.alert('Error', 'Failed to upload report');
    }
  };
  const handleShareReport = async item => {
    if (!item.report) {
      Alert.alert('No Report', 'Report has not been uploaded yet.');
      return;
    }
    try {
      const message = `LABORATORY REPORT\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `CDA Hospital Islamabad\n` + `Patient: ${item.patientName}\n` + `Token: ${item.token}\n` + `Date: ${item.date}\n` + `Test: ${item.departmentData?.testType || 'Lab Test'}\n` + `Notes: ${item.report.notes}\n` + `━━━━━━━━━━━━━━━━━━━━━\n` + `Status: Report Ready`;
      await Share.share({
        message: message,
        title: 'Lab Report'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share report');
    }
  };
  const handleNotificationPress = notification => {
    Alert.alert('Notification', notification.message);
  };

  // ─── Scroll to sections ──────────────────────────────────────────────
  const scrollToTests = () => {
    if (testsRef.current) {
      testsRef.current.measureLayout(scrollViewRef.current, (x, y) => {
        scrollViewRef.current.scrollTo({
          y,
          animated: true
        });
      });
    }
  };
  const scrollToNotifications = () => {
    if (notificationsRef.current) {
      notificationsRef.current.measureLayout(scrollViewRef.current, (x, y) => {
        scrollViewRef.current.scrollTo({
          y,
          animated: true
        });
      });
    }
  };

  // ─── Render Header ────────────────────────────────────────────────────
  const renderHeader = () => <View style={styles.headerContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.logoContainer}>
            <BrandLogo style={styles.logoImage} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>SehatLine</Text>
            <Text style={styles.headerSubtitle}>Laboratory Dashboard</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('ProfileScreen', {
        userData
      })}>
          <Ionicons name="person-circle-outline" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>;

  // ─── Render Current Token ──────────────────────────────────────────────
  const renderCurrentToken = () => {
    const tokenNumber = activeToken?.token || 'No Token';
    const waitTime = currentServing?.waitTime || 'N/A';
    const position = currentServing?.position || 'N/A';
    const hasToken = !!activeToken;
    if (!hasToken) {
      return <View style={styles.noTokenCard}>
          <View style={styles.noTokenContent}>
            <Ionicons name="ticket-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.noTokenTitle}>No Laboratory Token</Text>
            <Text style={styles.noTokenSubtitle}>Generate a token to get started</Text>
            <TouchableOpacity style={styles.noTokenBtn} onPress={handleGenerateToken}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.noTokenBtnGradient} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.noTokenBtnText}>Generate Token</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>;
    }
    return <View style={styles.tokenCard}>
        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.tokenCardOutline} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }}>
          <View style={styles.tokenCardInner}>
            <Text style={styles.tokenCardLabel}>Your Laboratory Token</Text>
            <Text style={styles.tokenCardNumber}>{tokenNumber}</Text>
            
            <View style={styles.waitTimeContainer}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
              <Text style={styles.waitTimeLabel}>Estimated Wait</Text>
              <Text style={styles.waitTimeValue}>{waitTime} mins</Text>
            </View>

            <View style={styles.tokenCardRow}>
              <View style={styles.tokenCardStatus}>
                <Text style={styles.tokenCardStatusLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={[styles.tokenCardStatusValue, {
                  color: '#F59E0B'
                }]}>Waiting</Text>
                </View>
              </View>
              <View style={styles.tokenDivider} />
              <View style={styles.tokenCardStatus}>
                <Text style={styles.tokenCardStatusLabel}>Position</Text>
                <Text style={styles.tokenCardStatusValue}>#{position}</Text>
              </View>
              <View style={styles.tokenDivider} />
              <View style={styles.tokenCardStatus}>
                <Text style={styles.tokenCardStatusLabel}>Serving</Text>
                <Text style={styles.tokenCardStatusValue}>{currentServing?.token || 'L-036'}</Text>
              </View>
            </View>

            <View style={styles.tokenCardActions}>
              <TouchableOpacity style={styles.tokenActionBtn} onPress={handleShareToken}>
                <Ionicons name="share-outline" size={18} color="#F59E0B" />
                <Text style={[styles.tokenActionText, {
                color: '#F59E0B'
              }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tokenActionBtn, styles.tokenActionPrimary]} onPress={handleDownloadToken}>
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={[styles.tokenActionText, {
                color: COLORS.white
              }]}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tokenActionBtn, styles.tokenActionPrimary]} onPress={handleViewQueue}>
                <Ionicons name="timer-outline" size={18} color={COLORS.white} />
                <Text style={[styles.tokenActionText, {
                color: COLORS.white
              }]}>Queue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>;
  };

  // ─── Render Queue Status ──────────────────────────────────────────────
  const renderQueueStatus = () => {
    const hasToken = !!activeToken;
    return <View style={styles.queueCard}>
        <Text style={styles.cardTitle}>Live Queue Status</Text>
        <View style={styles.queueRow}>
          <View style={styles.queueItem}>
            <Text style={styles.queueLabel}>Currently Serving</Text>
            <Text style={[styles.queueValue, {
            color: '#F39C12'
          }]}>{currentServing?.token || 'L-036'}</Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueItem}>
            <Text style={styles.queueLabel}>Your Token</Text>
            <Text style={[styles.queueValue, {
            color: hasToken ? '#F59E0B' : COLORS.textLight
          }]}>
              {activeToken?.token || 'No Token'}
            </Text>
          </View>
          <View style={styles.queueDivider} />
          <View style={styles.queueItem}>
            <Text style={styles.queueLabel}>People Before</Text>
            <Text style={styles.queueValue}>{hasToken ? currentServing?.position || '0' : 'N/A'}</Text>
          </View>
        </View>
        {hasToken && <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
            width: `${Math.min(100, 1 / (currentServing?.position || 1) * 100)}%`
          }]} />
            </View>
            <Text style={styles.progressText}>
              {`${Math.min(100, Math.floor(1 / (currentServing?.position || 1) * 100))}% complete`}
            </Text>
          </View>}
      </View>;
  };

  // ─── Render Quick Actions ──────────────────────────────────────────────
  const renderQuickActions = () => <View style={styles.actionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={handleGenerateToken} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="add-circle-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Generate Token</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={() => setShowTokenModal(true)} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="ticket-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>My Token</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={handleViewQueue} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="timer-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Queue Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={() => setShowHistoryModal(true)} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Test History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={handleTestTypes} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="list-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Test Types</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={scrollToTests} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="flask-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Available Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={scrollToNotifications} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="notifications-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {
        borderColor: '#F59E0B40'
      }]} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="help-circle-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Help</Text>
        </TouchableOpacity>
      </View>
    </View>;

  // ─── Render Workflow ──────────────────────────────────────────────────
  const renderWorkflow = () => {
    const steps = [{
      id: 'registered',
      label: 'Registered',
      icon: 'file-tray-outline',
      active: true
    }, {
      id: 'sample',
      label: 'Sample Collected',
      icon: 'flask-outline',
      active: true
    }, {
      id: 'processing',
      label: 'Processing',
      icon: 'time-outline',
      active: false
    }, {
      id: 'ready',
      label: 'Report Ready',
      icon: 'checkmark-done-circle-outline',
      active: false
    }];
    return <View style={styles.workflowContainer}>
        <Text style={styles.cardTitle}>Test Status</Text>
        <View style={styles.workflowSteps}>
          {steps.map((step, index) => <View key={step.id} style={styles.workflowStep}>
              <View style={[styles.workflowIcon, step.active && styles.workflowIconActive]}>
                <Ionicons name={step.icon} size={20} color={step.active ? COLORS.white : COLORS.textLight} />
              </View>
              {index < steps.length - 1 && <View style={[styles.workflowLine, step.active && styles.workflowLineActive]} />}
              <Text style={[styles.workflowLabel, step.active && styles.workflowLabelActive]}>
                {step.label}
              </Text>
            </View>)}
        </View>
      </View>;
  };

  // ─── Render Available Tests ──────────────────────────────────────────
  const renderAvailableTests = () => {
    const displayData = searchQuery.trim() ? filteredTests : labTests;
    return <View style={styles.testsContainer} ref={testsRef} collapsable={false}>
        <Text style={styles.cardTitle}>Available Tests</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search tests..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={handleSearch} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>}
        </View>
        {displayData.length === 0 ? <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
            <Text style={styles.noResultsText}>No tests found</Text>
          </View> : displayData.slice(0, 5).map(item => <View key={item.id} style={styles.testItem}>
              <View style={styles.testInfo}>
                <Text style={styles.testName}>{item.name}</Text>
                <Text style={styles.testCategory}>{item.category}</Text>
              </View>
              <TouchableOpacity style={[styles.testActionBtn, {
          backgroundColor: '#F59E0B'
        }]} onPress={handleGenerateToken}>
                <Text style={styles.testActionText}>Book</Text>
              </TouchableOpacity>
            </View>)}
      </View>;
  };

  // ─── Render Test History ──────────────────────────────────────────────
  const renderTestHistory = () => <View style={styles.historyContainer}>
      <Text style={styles.cardTitle}>Test History</Text>
      {testHistory.length === 0 ? <View style={styles.noResultsContainer}>
          <Ionicons name="document-text-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.noResultsText}>No test history</Text>
        </View> : testHistory.slice(0, 2).map(item => <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTest}>
                {item.test}
              </Text>
              <View style={[styles.historyBadge, {
          backgroundColor: item.status === 'Report Ready' ? '#2ECC7115' : '#F59E0B15'
        }]}>
                <Text style={[styles.historyBadgeText, {
            color: item.status === 'Report Ready' ? '#2ECC71' : '#F59E0B'
          }]}>
                  {item.status === 'Report Ready' ? 'Ready' : 'Pending'}
                </Text>
              </View>
            </View>
            <View style={styles.historyDetails}>
              <View style={styles.historyDetail}>
                <Text style={styles.historyLabel}>Date</Text>
                <Text style={styles.historyValue}>{item.date}</Text>
              </View>
              <View style={styles.historyDetail}>
                <Text style={styles.historyLabel}>Token</Text>
                <Text style={styles.historyValue}>{item.token}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.historyBtn} onPress={() => {
        setSelectedTest(item);
        setShowTestModal(true);
      }}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.historyBtnGradient} start={{
          x: 0,
          y: 0
        }} end={{
          x: 1,
          y: 0
        }}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
                <Text style={styles.historyBtnText}>View Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>)}
    </View>;

  // ─── Render Statistics ──────────────────────────────────────────────────
  const renderStatistics = () => <View style={styles.statsContainer}>
      <Text style={styles.cardTitle}>Test Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statItem, {
        borderColor: '#F59E0B'
      }]}>
          <Text style={styles.statNumber}>{stats.todayTests}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statItem, {
        borderColor: '#3498DB'
      }]}>
          <Text style={[styles.statNumber, {
          color: '#3498DB'
        }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statItem, {
        borderColor: '#8B5CF6'
      }]}>
          <Text style={[styles.statNumber, {
          color: '#8B5CF6'
        }]}>{stats.processing}</Text>
          <Text style={styles.statLabel}>Processing</Text>
        </View>
        <View style={[styles.statItem, {
        borderColor: '#2ECC71'
      }]}>
          <Text style={[styles.statNumber, {
          color: '#2ECC71'
        }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
    </View>;

  // ─── Render Notifications ──────────────────────────────────────────────
  const renderNotifications = () => <View style={styles.notificationContainer} ref={notificationsRef} collapsable={false}>
      <Text style={styles.cardTitle}>Notifications</Text>
      {notifications.slice(0, 3).map(item => <TouchableOpacity key={item.id} style={[styles.notificationItem, {
      borderLeftColor: '#F59E0B'
    }]} onPress={() => handleNotificationPress(item)}>
          <View style={styles.notificationIcon}>
            <Ionicons name={item.type === 'token' ? 'timer-outline' : item.type === 'ready' ? 'checkmark-circle-outline' : 'repeat-outline'} size={20} color="#F59E0B" />
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>
        </TouchableOpacity>)}
    </View>;

  // ─── Render Help Section ──────────────────────────────────────────────
  const renderHelp = () => <View style={styles.helpContainer}>
      <Text style={styles.cardTitle}>Need Help?</Text>
      <View style={styles.helpGrid}>
        <TouchableOpacity style={[styles.helpItem, {
        borderColor: '#F59E0B40'
      }]} onPress={() => Alert.alert('Lost Token', 'Go to "My Token" section to view your current token. You can also download or share it.')}>
          <View style={[styles.helpIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="help-circle-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.helpLabel}>Lost Token</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.helpItem, {
        borderColor: '#F59E0B40'
      }]} onPress={() => Alert.alert('Test Unavailable', 'Check "Available Tests" section to see current test listings. Contact lab for alternatives.')}>
          <View style={[styles.helpIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.helpLabel}>Test Unavailable</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.helpItem, {
        borderColor: '#F59E0B40'
      }]} onPress={() => Alert.alert('Contact Lab', 'Visit the laboratory counter at CDA Hospital or call 051-1234567 during working hours (8:00 AM - 4:00 PM).')}>
          <View style={[styles.helpIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="call-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.helpLabel}>Contact Lab</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.helpItem, {
        borderColor: '#F59E0B40'
      }]} onPress={() => setShowHelpModal(true)}>
          <View style={[styles.helpIcon, {
          backgroundColor: '#F59E0B10'
        }]}>
            <Ionicons name="document-text-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.helpLabel}>FAQ</Text>
        </TouchableOpacity>
      </View>
    </View>;

  // ─── TOKEN MODAL ──────────────────────────────────────────────────────
  const renderTokenModal = () => {
    const tokenToShow = activeToken;
    const hasToken = !!tokenToShow;
    const tokenNumber = tokenToShow?.token || 'No Token';
    const patientName = tokenToShow?.patientName || userData?.name || 'Patient';
    const waitTime = currentServing?.waitTime || 'N/A';
    const position = currentServing?.position || 'N/A';
    const testType = tokenToShow?.departmentData?.testType || 'Lab Test';
    const sampleType = tokenToShow?.departmentData?.sampleType || 'N/A';
    return <Modal visible={showTokenModal} transparent animationType="slide" onRequestClose={() => setShowTokenModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Token</Text>
              <TouchableOpacity onPress={() => setShowTokenModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tokenModalContent}>
              {!hasToken ? <View style={styles.noTokenModalContent}>
                  <Ionicons name="ticket-outline" size={64} color={COLORS.textLight} />
                  <Text style={styles.noTokenModalTitle}>No Token Found</Text>
                  <Text style={styles.noTokenModalSubtitle}>You don't have any active laboratory token.</Text>
                  <TouchableOpacity style={styles.noTokenModalBtn} onPress={() => {
                setShowTokenModal(false);
                handleGenerateToken();
              }}>
                    <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.noTokenModalBtnGradient} start={{
                  x: 0,
                  y: 0
                }} end={{
                  x: 1,
                  y: 0
                }}>
                      <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                      <Text style={styles.noTokenModalBtnText}>Generate Token</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View> : <>
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.tokenModalCard} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 1
              }}>
                    <Text style={styles.tokenModalLabel}>CDA HOSPITAL</Text>
                    <Text style={styles.tokenModalNumber}>{tokenNumber}</Text>
                    
                    <View style={styles.tokenModalQR}>
                      <Ionicons name="qr-code" size={80} color={COLORS.white} />
                      <Text style={styles.tokenModalQrText}>Scan at laboratory</Text>
                    </View>
                    
                    <View style={styles.tokenModalWaitTime}>
                      <Ionicons name="time-outline" size={24} color={COLORS.white} />
                      <Text style={styles.tokenModalWaitLabel}>Wait Time</Text>
                      <Text style={styles.tokenModalWaitValue}>{waitTime} mins</Text>
                    </View>
                    
                    <View style={styles.tokenModalDetails}>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Patient</Text>
                        <Text style={styles.tokenModalValue}>{patientName}</Text>
                      </View>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Status</Text>
                        <Text style={[styles.tokenModalValue, {
                      color: '#F59E0B'
                    }]}>Waiting</Text>
                      </View>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Position</Text>
                        <Text style={styles.tokenModalValue}>#{position}</Text>
                      </View>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Currently Serving</Text>
                        <Text style={styles.tokenModalValue}>{currentServing?.token || 'L-036'}</Text>
                      </View>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Test</Text>
                        <Text style={styles.tokenModalValue}>{testType}</Text>
                      </View>
                      <View style={styles.tokenModalRow}>
                        <Text style={styles.tokenModalLabel}>Sample</Text>
                        <Text style={styles.tokenModalValue}>{sampleType}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                  
                  <View style={styles.tokenModalActions}>
                    <TouchableOpacity style={[styles.tokenModalBtn, {
                  borderColor: '#F59E0B'
                }]} onPress={handleShareToken}>
                      <Ionicons name="share-outline" size={20} color="#F59E0B" />
                      <Text style={[styles.tokenModalBtnText, {
                    color: '#F59E0B'
                  }]}>Share</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.tokenModalBtn, {
                  backgroundColor: '#F59E0B',
                  borderColor: '#F59E0B'
                }]} onPress={handleDownloadToken}>
                      <Ionicons name="download-outline" size={20} color={COLORS.white} />
                      <Text style={[styles.tokenModalBtnText, {
                    color: COLORS.white
                  }]}>Download</Text>
                    </TouchableOpacity>
                  </View>
                </>}
            </View>
          </View>
        </View>
      </Modal>;
  };

  // ─── Other Modals ──────────────────────────────────────────────────────
  const renderTestModal = () => {
    if (!selectedTest) return null;
    return <Modal visible={showTestModal} transparent animationType="slide" onRequestClose={() => setShowTestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Test Details</Text>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.testDetailCard}>
                <View style={styles.testDetailRow}>
                  <Text style={styles.testDetailLabel}>Test</Text>
                  <Text style={styles.testDetailValue}>{selectedTest.test}</Text>
                </View>
                <View style={styles.testDetailRow}>
                  <Text style={styles.testDetailLabel}>Date</Text>
                  <Text style={styles.testDetailValue}>{selectedTest.date}</Text>
                </View>
                <View style={styles.testDetailRow}>
                  <Text style={styles.testDetailLabel}>Token</Text>
                  <Text style={[styles.testDetailValue, {
                  color: '#F59E0B',
                  fontWeight: 'bold'
                }]}>{selectedTest.token}</Text>
                </View>
                <View style={styles.testDetailRow}>
                  <Text style={styles.testDetailLabel}>Status</Text>
                  <Text style={[styles.testDetailValue, {
                  color: selectedTest.status === 'Report Ready' ? '#2ECC71' : '#F59E0B'
                }]}>
                    {selectedTest.status === 'Report Ready' ? 'Ready' : 'Pending'}
                  </Text>
                </View>
                {selectedTest.report && <View style={styles.testDetailRow}>
                    <Text style={styles.testDetailLabel}>Report Notes</Text>
                    <Text style={styles.testDetailValue}>{selectedTest.report.notes}</Text>
                  </View>}
              </View>
              
              {selectedTest.report && <TouchableOpacity style={styles.shareReportBtn} onPress={() => handleShareReport(selectedTest)}>
                  <LinearGradient colors={['#2ECC71', '#27AE60']} style={styles.shareReportGradient} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 0
              }}>
                    <Ionicons name="share-outline" size={18} color={COLORS.white} />
                    <Text style={styles.shareReportText}>Share Report</Text>
                  </LinearGradient>
                </TouchableOpacity>}
            </View>
          </View>
        </View>
      </Modal>;
  };
  const renderHistoryModal = () => <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Test History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {testHistory.map(item => <View key={item.id} style={styles.historyModalCard}>
                <Text style={styles.historyModalTest}>{item.test}</Text>
                <Text style={styles.historyModalDate}>{item.date}</Text>
                <Text style={styles.historyModalToken}>Token: {item.token}</Text>
                <View style={[styles.historyModalBadge, {
              backgroundColor: item.status === 'Report Ready' ? '#2ECC7115' : '#F59E0B15'
            }]}>
                  <Text style={[styles.historyModalBadgeText, {
                color: item.status === 'Report Ready' ? '#2ECC71' : '#F59E0B'
              }]}>
                    {item.status === 'Report Ready' ? 'Ready' : 'Pending'}
                  </Text>
                </View>
              </View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>;
  const renderHelpModal = () => <Modal visible={showHelpModal} transparent animationType="slide" onRequestClose={() => setShowHelpModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>FAQ</Text>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How to get a lab token?</Text>
              <Text style={styles.faqAnswer}>Go to "Generate Token" in Quick Actions.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What if I lost my token?</Text>
              <Text style={styles.faqAnswer}>Go to "My Token" section to view your token.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How to check test availability?</Text>
              <Text style={styles.faqAnswer}>Click "Available Tests" in Quick Actions.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How to view test history?</Text>
              <Text style={styles.faqAnswer}>Go to "Test History" section.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How to contact lab?</Text>
              <Text style={styles.faqAnswer}>Visit lab counter or call 051-1234567.</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>;

  // ─── ROOT ──────────────────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.container}><SkeletonScreen cards={3} /></View>;
  }
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
        x: 0,
        y: 0
      }} end={{
        x: 0,
        y: 0.4
      }} style={styles.gradientBackground} />

        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}

          <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#F59E0B']} tintColor="#F59E0B" />}>
            {renderCurrentToken()}
            {renderQueueStatus()}
            {renderQuickActions()}
            {renderWorkflow()}
            {renderAvailableTests()}
            {renderTestHistory()}
            {renderStatistics()}
            {renderNotifications()}
            {renderHelp()}
          </ScrollView>
        </SafeAreaView>

        {renderTokenModal()}
        {renderTestModal()}
        {renderHistoryModal()}
        {renderHelpModal()}
      </View>
    </TouchableWithoutFeedback>;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
    height: hp(22)
  },
  safeArea: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  loadingText: {
    marginTop: hp(2),
    color: COLORS.textSecondary,
    fontSize: wp(3.5)
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(2)
  },
  // ─── Header ────────────────────────────────────────────────────────────
  headerContainer: {
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1) : hp(1.5),
    paddingBottom: hp(1.5)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
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
  headerTitles: {
    flexDirection: 'column'
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: wp(2.8)
  },
  cardTitle: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1.2)
  },
  sectionTitle: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1.2)
  },
  // ─── No Token Card ──────────────────────────────────────────────────
  noTokenCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(6),
    marginBottom: hp(1.8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderStyle: 'dashed',
    ...SHADOWS.small
  },
  noTokenContent: {
    alignItems: 'center'
  },
  noTokenTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1)
  },
  noTokenSubtitle: {
    fontSize: wp(3.5),
    color: COLORS.textSecondary,
    marginTop: hp(0.5),
    marginBottom: hp(1.5)
  },
  noTokenBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  noTokenBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    gap: 8
  },
  noTokenBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ─── Token Card ──────────────────────────────────────────────────────────
  tokenCard: {
    marginBottom: hp(1.8),
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium
  },
  tokenCardOutline: {
    padding: 3
  },
  tokenCardInner: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: wp(4.5)
  },
  tokenCardLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(3.2),
    textAlign: 'center'
  },
  tokenCardNumber: {
    color: COLORS.text,
    fontSize: wp(10),
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: hp(0.5),
    letterSpacing: 2
  },
  waitTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B15',
    borderRadius: 12,
    padding: hp(0.8),
    marginVertical: hp(0.5),
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40'
  },
  waitTimeLabel: {
    fontSize: wp(3),
    color: COLORS.textSecondary
  },
  waitTimeValue: {
    fontSize: wp(5.5),
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  tokenCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: hp(0.5),
    paddingVertical: hp(0.5),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  tokenCardStatus: {
    alignItems: 'center',
    flex: 1
  },
  tokenCardStatusLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.6)
  },
  tokenCardStatusValue: {
    fontSize: wp(3.8),
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B'
  },
  tokenDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: COLORS.border
  },
  tokenCardActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: hp(0.8)
  },
  tokenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.6),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: COLORS.card
  },
  tokenActionPrimary: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B'
  },
  tokenActionText: {
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  // ─── Queue Status ─────────────────────────────────────────────────────
  queueCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: hp(0.5)
  },
  queueItem: {
    alignItems: 'center',
    flex: 1
  },
  queueLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8)
  },
  queueValue: {
    fontSize: wp(4.2),
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2
  },
  queueDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: COLORS.border
  },
  progressContainer: {
    marginTop: hp(0.8)
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F59E0B20',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    marginTop: hp(0.3),
    textAlign: 'center'
  },
  // ─── Quick Actions ──────────────────────────────────────────────────
  actionsContainer: {
    marginBottom: hp(1.8)
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  actionCard: {
    width: (width - wp(8) - 30) / 4,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3)
  },
  actionLabel: {
    fontSize: wp(2.6),
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500'
  },
  // ─── Workflow ────────────────────────────────────────────────────────
  workflowContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  workflowSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  workflowStep: {
    alignItems: 'center',
    flex: 1
  },
  workflowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  workflowIconActive: {
    backgroundColor: '#F59E0B'
  },
  workflowLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.border,
    position: 'absolute',
    top: 18,
    left: '60%'
  },
  workflowLineActive: {
    backgroundColor: '#F59E0B'
  },
  workflowLabel: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: hp(0.3)
  },
  workflowLabelActive: {
    color: COLORS.text,
    fontWeight: '600'
  },
  // ─── Available Tests ──────────────────────────────────────────────────
  testsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: hp(1),
    gap: 8
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.5),
    paddingVertical: hp(0.6)
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.6),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  testInfo: {
    flex: 1
  },
  testName: {
    fontSize: wp(3.6),
    fontWeight: '600',
    color: COLORS.text
  },
  testCategory: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  testActionBtn: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: 6
  },
  testActionText: {
    color: COLORS.white,
    fontSize: wp(2.6),
    fontWeight: '600'
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: hp(2)
  },
  noResultsText: {
    fontSize: wp(3.5),
    color: COLORS.textSecondary,
    marginTop: hp(0.5)
  },
  // ─── Test History ──────────────────────────────────────────────────────
  historyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  historyCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(1)
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5)
  },
  historyTest: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: COLORS.text
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  historyBadgeText: {
    fontSize: wp(2.6),
    fontWeight: '600'
  },
  historyDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: hp(0.8)
  },
  historyDetail: {
    flex: 1
  },
  historyLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  historyValue: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2
  },
  historyBtn: {
    borderRadius: 10,
    overflow: 'hidden'
  },
  historyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.6),
    gap: 8
  },
  historyBtnText: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '600'
  },
  // ─── Statistics ──────────────────────────────────────────────────────
  statsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  statItem: {
    flex: 1,
    minWidth: (width - wp(8) - 30) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: wp(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B40'
  },
  statNumber: {
    fontSize: wp(5.5),
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  statLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    marginTop: 2
  },
  // ─── Notifications ──────────────────────────────────────────────────
  notificationContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: hp(0.6),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderLeftWidth: 3,
    paddingLeft: 12
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B10',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notificationMessage: {
    flex: 1,
    fontSize: wp(3.2),
    color: COLORS.text
  },
  // ─── Help ─────────────────────────────────────────────────────────────
  helpContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#F59E0B40',
    ...SHADOWS.small
  },
  helpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  helpItem: {
    flex: 1,
    minWidth: (width - wp(8) - 30) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: wp(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B40'
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.2)
  },
  helpLabel: {
    fontSize: wp(2.6),
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500'
  },
  // ─── Modals ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: wp(4),
    width: width * 0.92,
    maxHeight: height * 0.85,
    ...SHADOWS.large
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  modalTitle: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: COLORS.text
  },
  modalContent: {
    maxHeight: height * 0.7
  },
  // ─── No Token Modal ──────────────────────────────────────────────
  noTokenModalContent: {
    alignItems: 'center',
    paddingVertical: hp(2)
  },
  noTokenModalTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1)
  },
  noTokenModalSubtitle: {
    fontSize: wp(3.5),
    color: COLORS.textSecondary,
    marginTop: hp(0.5),
    marginBottom: hp(1.5),
    textAlign: 'center'
  },
  noTokenModalBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  noTokenModalBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    gap: 8
  },
  noTokenModalBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ─── Token Modal ────────────────────────────────────────────────────
  tokenModalContent: {
    flex: 1
  },
  tokenModalCard: {
    borderRadius: 16,
    padding: wp(5),
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  tokenModalLabel: {
    color: COLORS.white + '80',
    fontSize: wp(3),
    fontWeight: '600'
  },
  tokenModalNumber: {
    color: COLORS.white,
    fontSize: wp(10),
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: hp(0.5)
  },
  tokenModalQR: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(1)
  },
  tokenModalQrText: {
    color: COLORS.white + '70',
    fontSize: wp(2.8),
    marginTop: hp(0.2)
  },
  tokenModalWaitTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: hp(0.8),
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: hp(1)
  },
  tokenModalWaitLabel: {
    color: COLORS.white,
    fontSize: wp(3)
  },
  tokenModalWaitValue: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  tokenModalDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: wp(3)
  },
  tokenModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(0.2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  tokenModalValue: {
    color: COLORS.white,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  tokenModalActions: {
    flexDirection: 'row',
    gap: 10
  },
  tokenModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: hp(1),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B'
  },
  tokenModalBtnText: {
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ─── Test Detail Modal ──────────────────────────────────────────────
  testDetailCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: wp(3)
  },
  testDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(0.4),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  testDetailLabel: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary
  },
  testDetailValue: {
    fontSize: wp(3.2),
    fontWeight: '500',
    color: COLORS.text
  },
  shareReportBtn: {
    marginTop: hp(1),
    borderRadius: 10,
    overflow: 'hidden'
  },
  shareReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
    gap: 8
  },
  shareReportText: {
    color: COLORS.white,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  // ─── History Modal ──────────────────────────────────────────────────
  historyModalCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(1)
  },
  historyModalTest: {
    fontSize: wp(4),
    fontWeight: '600',
    color: COLORS.text
  },
  historyModalDate: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  historyModalToken: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    marginTop: hp(0.05)
  },
  historyModalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: hp(0.3),
    alignSelf: 'flex-start'
  },
  historyModalBadgeText: {
    fontSize: wp(2.6),
    fontWeight: '600'
  },
  // ─── Help Modal ────────────────────────────────────────────────────
  faqItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(1)
  },
  faqQuestion: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: hp(0.3)
  },
  faqAnswer: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary,
    lineHeight: 20
  }
});
export default LabDashboardScreen;