import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, FlatList, Modal, Share, Alert, Linking, Platform, StatusBar, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
const {
  width,
  height
} = Dimensions.get('window');

// Complete Doctor Data
const doctorsData = [{
  id: 1,
  name: 'Dr. Sarah Ahmed',
  title: 'Senior Consultant',
  specialty: 'Cardiologist',
  department: 'Chronic OPD',
  experience: '15 years',
  rating: 4.8,
  totalReviews: 127,
  patients: '5,200+',
  about: 'Dr. Sarah Ahmed is a highly experienced cardiologist with over 15 years of practice. She specializes in the diagnosis and treatment of heart conditions, with a focus on preventive cardiology and chronic heart disease management.',
  specializations: ['Preventive Cardiology', 'Heart Failure Management', 'Hypertension', 'ECG Interpretation'],
  hospital: 'CDA Hospital Islamabad',
  address: 'OPD Block, Chronic Care Center',
  room: 'Room 204 • OPD Block',
  availableTimes: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM'],
  education: ['MBBS - King Edward Medical University, Lahore', 'FCPS (Cardiology) - College of Physicians and Surgeons Pakistan', 'Fellowship in Interventional Cardiology - Aga Khan University Hospital'],
  certifications: ['Board Certified Cardiologist - Pakistan Medical Commission', 'Advanced Cardiac Life Support (ACLS) Certified', 'American Heart Association Member'],
  reviews: [{
    id: 1,
    patient: 'Ahmed Khan',
    rating: 5,
    comment: 'Excellent doctor! Very thorough and caring.',
    date: '2 days ago',
    verified: true
  }, {
    id: 2,
    patient: 'Fatima Bibi',
    rating: 4,
    comment: 'Very professional and patient.',
    date: '1 week ago',
    verified: true
  }],
  tokenPrefix: 'A',
  tokenColor: '#20D3C2'
}, {
  id: 2,
  name: 'Dr. Muhammad Khan',
  title: 'Consultant',
  specialty: 'Endocrinologist',
  department: 'Chronic OPD',
  experience: '12 years',
  rating: 4.6,
  totalReviews: 98,
  patients: '3,800+',
  about: 'Dr. Muhammad Khan is a specialist in endocrinology with expertise in diabetes management, thyroid disorders, and hormonal imbalances.',
  specializations: ['Diabetes Management', 'Thyroid Disorders', 'Hormonal Imbalances', 'Metabolic Syndrome'],
  hospital: 'CDA Hospital Islamabad',
  address: 'Chronic Care Center',
  room: 'Room 310 • Chronic Care Center',
  availableTimes: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
  education: ['MBBS - Rawalpindi Medical College', 'FCPS (Endocrinology) - College of Physicians and Surgeons Pakistan'],
  certifications: ['Board Certified Endocrinologist - Pakistan Medical Commission', 'Diabetes Education Certification'],
  reviews: [{
    id: 1,
    patient: 'Sana Malik',
    rating: 5,
    comment: 'Great doctor! Helped me control my diabetes.',
    date: '3 days ago',
    verified: true
  }],
  tokenPrefix: 'B',
  tokenColor: '#F59E0B'
}];

// Sample appointment data
const doctorDailyLoad = {
  1: {
    maxPatients: 20,
    bookedToday: 15,
    currentToken: 16
  },
  2: {
    maxPatients: 15,
    bookedToday: 14,
    currentToken: 15
  }
};
const DoctorDetailScreen = ({
  navigation,
  route
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const doctor = route.params?.doctor || doctorsData[0];
  const [selectedTab, setSelectedTab] = useState('about');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [consultationType, setConsultationType] = useState('in-person');
  const [showFullBio, setShowFullBio] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentToken, setAppointmentToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const doctorLoad = doctorDailyLoad[doctor.id] || {
    maxPatients: 20,
    bookedToday: 10,
    currentToken: 11
  };
  const isFullyBooked = doctorLoad.bookedToday >= doctorLoad.maxPatients;
  const availableSlots = doctorLoad.maxPatients - doctorLoad.bookedToday;
  useEffect(() => {
    const findAvailableDoctors = () => {
      const available = doctorsData.filter(doc => {
        const load = doctorDailyLoad[doc.id];
        return load && load.bookedToday < load.maxPatients && doc.id !== doctor.id;
      });
      setAvailableDoctors(available.slice(0, 3));
    };
    findAvailableDoctors();
  }, []);
  const handleDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address + ', CDA Hospital Islamabad')}`;
    Linking.openURL(url);
  };
  const handleSave = () => {
    setIsSaved(!isSaved);
    Alert.alert(isSaved ? 'Removed from Favorites' : 'Added to Favorites', isSaved ? `${doctor.name} has been removed.` : `${doctor.name} has been added to favorites.`);
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: `👨‍⚕️ ${doctor.name}\n${doctor.specialty}\n${doctor.department}\n${doctor.hospital}\n\nBook appointment via SehatLine app.`,
        title: 'Doctor Profile'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share profile');
    }
  };
  const handlePrint = () => {
    Alert.alert('Print Token', `Print your appointment token for ${doctor.name}?`, [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Print',
      onPress: () => Alert.alert('Printing', 'Token is being printed...')
    }]);
  };
  const handleBookAppointment = () => {
    if (isFullyBooked) {
      Alert.alert('Doctor Fully Booked!', `Dr. ${doctor.name} is fully booked for today.`, [{
        text: 'OK',
        style: 'cancel'
      }, {
        text: 'View Available Doctors',
        onPress: () => setSelectedTab('availability')
      }]);
      return;
    }
    if (!selectedDate || !selectedTime) {
      Alert.alert('Select Time', 'Please select both date and time for appointment');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const token = doctorLoad.currentToken || 1;
      setAppointmentToken(token);
      doctorLoad.bookedToday += 1;
      doctorLoad.currentToken += 1;
      const newAppointment = {
        id: Date.now(),
        doctorName: doctor.name,
        department: doctor.department,
        date: `${selectedDate.day} ${selectedDate.date}`,
        time: selectedTime,
        token: token,
        tokenPrefix: doctor.tokenPrefix || 'A',
        status: 'Confirmed',
        bookedAt: new Date().toLocaleString()
      };
      setAppointmentHistory([newAppointment, ...appointmentHistory]);
      setShowAppointmentModal(true);
    }, 1500);
  };
  const handleViewHistory = () => {
    setShowHistory(true);
  };
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: days[date.getDay()],
        date: date.getDate(),
        month: date.getMonth() + 1,
        fullDate: date,
        isToday: i === 0
      });
    }
    return dates;
  };
  const dates = generateDates();
  const getInitials = name => {
    return name.split(' ').map(n => n[0]).join('');
  };
  const renderDateItem = ({
    item
  }) => <TouchableOpacity style={[styles.dateItem, selectedDate?.date === item.date && styles.dateItemSelected]} onPress={() => setSelectedDate(item)}>
      <Text style={[styles.dateDay, selectedDate?.date === item.date && styles.dateTextSelected]}>
        {item.isToday ? 'Today' : item.day}
      </Text>
      <Text style={[styles.dateNumber, selectedDate?.date === item.date && styles.dateTextSelected]}>
        {item.date}
      </Text>
    </TouchableOpacity>;
  const renderTimeItem = ({
    item
  }) => <TouchableOpacity style={[styles.timeItem, selectedTime === item && styles.timeItemSelected]} onPress={() => setSelectedTime(item)}>
      <Text style={[styles.timeText, selectedTime === item && styles.timeTextSelected]}>
        {item}
      </Text>
    </TouchableOpacity>;
  const renderReviewItem = ({
    item
  }) => <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewAvatarText}>{item.patient[0]}</Text>
          </View>
          <View>
            <Text style={styles.reviewName}>{item.patient}</Text>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= item.rating ? "star" : "star-outline"} size={14} color={star <= item.rating ? "#FFB800" : "#CBD5E1"} />)}
            </View>
          </View>
        </View>
        {item.verified && <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>}
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewDate}>{item.date}</Text>
    </View>;
  const getAverageRating = () => {
    if (!doctor.reviews || doctor.reviews.length === 0) return doctor.rating;
    const total = doctor.reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / doctor.reviews.length).toFixed(1);
  };
  const renderAvailableDoctor = ({
    item
  }) => <TouchableOpacity style={styles.availableDoctorCard} onPress={() => {
    navigation.replace('DoctorDetailScreen', {
      doctor: item
    });
  }}>
      <View style={styles.availableDoctorAvatar}>
        <View style={styles.availableDoctorPlaceholder}>
          <Text style={styles.availableDoctorInitials}>{getInitials(item.name)}</Text>
        </View>
      </View>
      <View style={styles.availableDoctorInfo}>
        <Text style={styles.availableDoctorName}>{item.name}</Text>
        <Text style={styles.availableDoctorSpecialty}>{item.specialty}</Text>
        <Text style={styles.availableDoctorAvailability}>Available Today</Text>
      </View>
      <TouchableOpacity style={styles.availableDoctorBookBtn} onPress={() => {
      Alert.alert('Switch Doctor', `Book with ${item.name}?`, [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'Yes',
        onPress: () => navigation.replace('DoctorDetailScreen', {
          doctor: item
        })
      }]);
    }}>
        <Text style={styles.availableDoctorBookText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>;
  return <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 1,
      y: 0
    }} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerActionBtn}>
              <Ionicons name="share-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.avatarGradient}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(doctor.name)}</Text>
                </View>
              </LinearGradient>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorTitle}>{doctor.title}</Text>
              <Text style={styles.specialty}>{doctor.specialty}</Text>
              <View style={styles.departmentTag}>
                <Text style={styles.departmentTagText}>{doctor.department}</Text>
              </View>
            </View>
          </View>

          {/* Stats Row - All in One Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{doctor.experience}</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{doctor.rating} ★</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{doctor.totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{doctor.patients}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
          </View>

          {/* Quick Actions - Removed Call & Message, Added Useful Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleDirections}>
              <View style={[styles.quickActionIcon, {
              backgroundColor: COLORS.warning + '20'
            }]}>
                <Ionicons name="location-outline" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.quickActionText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleSave}>
              <View style={[styles.quickActionIcon, {
              backgroundColor: isSaved ? COLORS.primary + '30' : COLORS.appointment + '20'
            }]}>
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? COLORS.primary : COLORS.appointment} />
              </View>
              <Text style={styles.quickActionText}>{isSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleViewHistory}>
              <View style={[styles.quickActionIcon, {
              backgroundColor: COLORS.primary + '20'
            }]}>
                <Ionicons name="time-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => setSelectedTab('availability')}>
              <View style={[styles.quickActionIcon, {
              backgroundColor: COLORS.success + '20'
            }]}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.quickActionText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['About', 'Reviews', 'Availability', 'Education'].map(tab => <TouchableOpacity key={tab} style={[styles.tab, selectedTab === tab.toLowerCase() && styles.tabActive]} onPress={() => setSelectedTab(tab.toLowerCase())}>
              <Text style={[styles.tabText, selectedTab === tab.toLowerCase() && styles.tabTextActive]}>
                {tab}
              </Text>
              {selectedTab === tab.toLowerCase() && <View style={styles.tabIndicator} />}
            </TouchableOpacity>)}
        </View>

        <View style={styles.tabContent}>
          {/* About Tab */}
          {selectedTab === 'about' && <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>About Doctor</Text>
                <Text style={styles.aboutText} numberOfLines={showFullBio ? undefined : 4}>
                  {doctor.about}
                </Text>
                <TouchableOpacity onPress={() => setShowFullBio(!showFullBio)}>
                  <Text style={styles.readMoreText}>{showFullBio ? 'Read Less' : 'Read More'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Specializations</Text>
                <View style={styles.specializationContainer}>
                  {doctor.specializations.map((spec, index) => <View key={index} style={styles.specializationTag}>
                      <Text style={styles.specializationText}>{spec}</Text>
                    </View>)}
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Hospital & Location</Text>
                <View style={styles.hospitalContainer}>
                  <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                  <View>
                    <Text style={styles.hospitalName}>{doctor.hospital}</Text>
                    <Text style={styles.hospitalAddress}>{doctor.address}</Text>
                    <Text style={styles.hospitalRoom}>{doctor.room}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.directionBtn} onPress={handleDirections}>
                  <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
                  <Text style={styles.directionBtnText}>Get Directions</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Department Info</Text>
                <View style={styles.deptInfoContainer}>
                  <View style={styles.deptInfoItem}>
                    <Ionicons name="medical-outline" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={styles.deptInfoLabel}>Department</Text>
                      <Text style={styles.deptInfoValue}>{doctor.department}</Text>
                    </View>
                  </View>
                  <View style={styles.deptInfoItem}>
                    <Ionicons name="ticket-outline" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={styles.deptInfoLabel}>Token Prefix</Text>
                      <Text style={styles.deptInfoValue}>{doctor.tokenPrefix || 'A'}</Text>
                    </View>
                  </View>
                  <View style={styles.deptInfoItem}>
                    <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={styles.deptInfoLabel}>Daily Capacity</Text>
                      <Text style={styles.deptInfoValue}>{doctorLoad.maxPatients} patients</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Current Queue Status */}
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Current Queue Status</Text>
                <View style={styles.queueStatusContainer}>
                  <View style={styles.queueStatusItem}>
                    <Text style={styles.queueStatusLabel}>Booked</Text>
                    <Text style={styles.queueStatusValue}>{doctorLoad.bookedToday}</Text>
                  </View>
                  <View style={styles.queueStatusDivider} />
                  <View style={styles.queueStatusItem}>
                    <Text style={styles.queueStatusLabel}>Available</Text>
                    <Text style={[styles.queueStatusValue, {
                  color: availableSlots > 0 ? COLORS.success : COLORS.danger
                }]}>
                      {availableSlots}
                    </Text>
                  </View>
                  <View style={styles.queueStatusDivider} />
                  <View style={styles.queueStatusItem}>
                    <Text style={styles.queueStatusLabel}>Next Token</Text>
                    <Text style={styles.queueStatusValue}>{doctorLoad.currentToken}</Text>
                  </View>
                </View>
              </View>
            </View>}

          {/* Reviews Tab */}
          {selectedTab === 'reviews' && <View>
              <View style={styles.reviewSummary}>
                <View style={styles.reviewScore}>
                  <Text style={styles.reviewScoreNumber}>{getAverageRating()}</Text>
                  <View style={styles.reviewStarsLarge}>
                    {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= Math.round(parseFloat(getAverageRating())) ? "star" : "star-outline"} size={20} color={star <= Math.round(parseFloat(getAverageRating())) ? "#FFB800" : "#CBD5E1"} />)}
                  </View>
                  <Text style={styles.reviewScoreTotal}>{doctor.totalReviews} reviews</Text>
                </View>
              </View>

              {doctor.reviews && doctor.reviews.length > 0 ? <FlatList data={doctor.reviews} renderItem={renderReviewItem} keyExtractor={item => item.id.toString()} scrollEnabled={false} style={styles.reviewsList} /> : <View style={styles.noReviewsContainer}>
                  <Ionicons name="chatbubbles-outline" size={40} color={COLORS.border} />
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                </View>}
            </View>}

          {/* Availability Tab */}
          {selectedTab === 'availability' && <View>
              <View style={styles.infoCard}>
                <View style={styles.availabilityStatus}>
                  <View style={styles.availabilityInfo}>
                    <Ionicons name={isFullyBooked ? "alert-circle" : "checkmark-circle"} size={24} color={isFullyBooked ? COLORS.danger : COLORS.success} />
                    <View>
                      <Text style={styles.availabilityTitle}>
                        {isFullyBooked ? 'Fully Booked Today' : 'Available Today'}
                      </Text>
                      <Text style={styles.availabilitySubtext}>
                        {isFullyBooked ? `All ${doctorLoad.maxPatients} slots filled` : `${availableSlots} slots available`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tokenDisplay}>
                    <Text style={styles.tokenLabel}>Next Token</Text>
                    <Text style={styles.tokenNumber}>{doctorLoad.currentToken || 1}</Text>
                  </View>
                </View>
              </View>

              {isFullyBooked && availableDoctors.length > 0 && <View style={styles.infoCard}>
                  <Text style={styles.cardTitle}>Available Doctors</Text>
                  <FlatList data={availableDoctors} renderItem={renderAvailableDoctor} keyExtractor={item => item.id.toString()} scrollEnabled={false} />
                </View>}

              {!isFullyBooked && <>
                  <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Consultation Type</Text>
                    <View style={styles.consultationTypeContainer}>
                      <TouchableOpacity style={[styles.consultationType, consultationType === 'in-person' && styles.consultationTypeActive]} onPress={() => setConsultationType('in-person')}>
                        <Ionicons name="medkit-outline" size={20} color={consultationType === 'in-person' ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.consultationTypeText, consultationType === 'in-person' && styles.consultationTypeTextActive]}>
                          In-Person
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.consultationType, consultationType === 'video' && styles.consultationTypeActive]} onPress={() => setConsultationType('video')}>
                        <Ionicons name="videocam-outline" size={20} color={consultationType === 'video' ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.consultationTypeText, consultationType === 'video' && styles.consultationTypeTextActive]}>
                          Video
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Select Date</Text>
                    <FlatList data={dates} renderItem={renderDateItem} keyExtractor={(item, index) => index.toString()} horizontal showsHorizontalScrollIndicator={false} style={styles.datesList} />
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Select Time</Text>
                    <FlatList data={doctor.availableTimes} renderItem={renderTimeItem} keyExtractor={(item, index) => index.toString()} horizontal showsHorizontalScrollIndicator={false} style={styles.timesList} />
                  </View>

                  <TouchableOpacity style={[styles.bookAppointmentBtn, isLoading && styles.bookAppointmentDisabled]} onPress={handleBookAppointment} disabled={isLoading}>
                    <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.bookAppointmentGradient} start={{
                x: 0,
                y: 0
              }} end={{
                x: 1,
                y: 0
              }}>
                      {isLoading ? <ActivityIndicator color={COLORS.white} /> : <>
                          <Ionicons name="calendar-outline" size={22} color={COLORS.white} />
                          <Text style={styles.bookAppointmentText}>Book Appointment</Text>
                        </>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>}
            </View>}

          {/* Education Tab */}
          {selectedTab === 'education' && <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Education</Text>
                {doctor.education.map((edu, index) => <View key={index} style={styles.educationItem}>
                    <View style={styles.educationDot} />
                    <View>
                      <Text style={styles.educationText}>{edu}</Text>
                      {index < doctor.education.length - 1 && <View style={styles.educationLine} />}
                    </View>
                  </View>)}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Certifications</Text>
                {doctor.certifications.map((cert, index) => <View key={index} style={styles.certificationItem}>
                    <Ionicons name="ribbon-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.certificationText}>{cert}</Text>
                  </View>)}
              </View>
            </View>}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Appointment Confirmation Modal */}
      <Modal visible={showAppointmentModal} transparent animationType="slide" onRequestClose={() => setShowAppointmentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>Appointment Confirmed!</Text>
            <Text style={styles.modalSubtitle}>
              Your appointment has been booked successfully
            </Text>

            <View style={styles.appointmentDetails}>
              <View style={styles.appointmentDetailRow}>
                <Text style={styles.appointmentDetailLabel}>Doctor</Text>
                <Text style={styles.appointmentDetailValue}>{doctor.name}</Text>
              </View>
              <View style={styles.appointmentDetailRow}>
                <Text style={styles.appointmentDetailLabel}>Department</Text>
                <Text style={styles.appointmentDetailValue}>{doctor.department}</Text>
              </View>
              <View style={styles.appointmentDetailRow}>
                <Text style={styles.appointmentDetailLabel}>Date</Text>
                <Text style={styles.appointmentDetailValue}>
                  {selectedDate?.day} {selectedDate?.date}
                </Text>
              </View>
              <View style={styles.appointmentDetailRow}>
                <Text style={styles.appointmentDetailLabel}>Time</Text>
                <Text style={styles.appointmentDetailValue}>{selectedTime}</Text>
              </View>
              <View style={styles.appointmentDetailRow}>
                <Text style={styles.appointmentDetailLabel}>Location</Text>
                <Text style={styles.appointmentDetailValue}>{doctor.room}</Text>
              </View>
              <View style={[styles.appointmentDetailRow, styles.tokenRow]}>
                <Text style={styles.appointmentDetailLabel}>Your Token</Text>
                <View style={[styles.tokenBadge, {
                backgroundColor: doctor.tokenColor || COLORS.primary
              }]}>
                  <Text style={styles.tokenBadgeText}>{doctor.tokenPrefix}-{String(appointmentToken).padStart(3, '0')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, styles.modalPrintBtn]} onPress={handlePrint}>
                <Ionicons name="print-outline" size={20} color={COLORS.primary} />
                <Text style={styles.modalPrintText}>Print Token</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, styles.modalDoneBtn]} onPress={() => {
              setShowAppointmentModal(false);
              setSelectedDate(null);
              setSelectedTime(null);
            }}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalDoneGradient}>
                  <Text style={styles.modalDoneText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment History Modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.historyModal]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Appointment History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {appointmentHistory.length > 0 ? <FlatList data={appointmentHistory} keyExtractor={item => item.id.toString()} renderItem={({
            item
          }) => <View style={styles.historyItem}>
                    <View style={styles.historyItemLeft}>
                      <Text style={styles.historyDoctorName}>{item.doctorName}</Text>
                      <Text style={styles.historyDepartment}>{item.department}</Text>
                      <Text style={styles.historyDateTime}>
                        {item.date} at {item.time}
                      </Text>
                    </View>
                    <View style={styles.historyItemRight}>
                      <View style={[styles.historyTokenBadge, {
                backgroundColor: (doctor.tokenColor || COLORS.primary) + '15'
              }]}>
                        <Text style={[styles.historyTokenText, {
                  color: doctor.tokenColor || COLORS.primary
                }]}>
                          #{item.tokenPrefix}-{String(item.token).padStart(3, '0')}
                        </Text>
                      </View>
                      <View style={[styles.historyStatus, {
                backgroundColor: COLORS.success + '15'
              }]}>
                        <Text style={[styles.historyStatusText, {
                  color: COLORS.success
                }]}>
                          {item.status}
                        </Text>
                      </View>
                      <Text style={styles.historyBookedAt}>{item.bookedAt}</Text>
                    </View>
                  </View>} contentContainerStyle={styles.historyList} /> : <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={50} color={COLORS.border} />
                <Text style={styles.emptyHistoryText}>No appointments yet</Text>
              </View>}
          </View>
        </View>
      </Modal>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  headerGradient: {
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
    paddingHorizontal: SIZES.lg
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.white
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12
  },
  headerActionBtn: {
    padding: 8
  },
  profileSection: {
    backgroundColor: COLORS.card,
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarContainer: {
    marginRight: 16
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary
  },
  profileInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text
  },
  doctorTitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  specialty: {
    fontSize: SIZES.h5,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2
  },
  departmentTag: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  departmentTagText: {
    fontSize: SIZES.xSmall,
    color: COLORS.primary,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    minWidth: 60
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border
  },
  statNumber: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text
  },
  statLabel: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  quickAction: {
    alignItems: 'center'
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  quickActionText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative'
  },
  tabText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  tabTextActive: {
    color: COLORS.primary
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3
  },
  tabContent: {
    padding: SIZES.lg
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small
  },
  cardTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  aboutText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 22
  },
  readMoreText: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8
  },
  specializationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  specializationTag: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  specializationText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500'
  },
  hospitalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  hospitalName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  hospitalAddress: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  hospitalRoom: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  directionBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.small
  },
  deptInfoContainer: {
    gap: 12
  },
  deptInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  deptInfoLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  deptInfoValue: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  queueStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8
  },
  queueStatusItem: {
    alignItems: 'center',
    flex: 1
  },
  queueStatusLabel: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary
  },
  queueStatusValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2
  },
  queueStatusDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border
  },
  availabilityStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  availabilityTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  availabilitySubtext: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  tokenDisplay: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12
  },
  tokenLabel: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary
  },
  tokenNumber: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.primary
  },
  availableDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 10
  },
  availableDoctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    overflow: 'hidden'
  },
  availableDoctorPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  availableDoctorInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary
  },
  availableDoctorInfo: {
    flex: 1
  },
  availableDoctorName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  availableDoctorSpecialty: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  availableDoctorAvailability: {
    fontSize: SIZES.xSmall,
    color: COLORS.success,
    fontWeight: '500'
  },
  availableDoctorBookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  availableDoctorBookText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600'
  },
  consultationTypeContainer: {
    flexDirection: 'row',
    gap: 12
  },
  consultationType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flex: 1,
    justifyContent: 'center'
  },
  consultationTypeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  consultationTypeText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    fontWeight: '500'
  },
  consultationTypeTextActive: {
    color: COLORS.white
  },
  datesList: {
    marginTop: 8
  },
  dateItem: {
    width: 52,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginRight: 10
  },
  dateItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  dateDay: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  dateNumber: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2
  },
  dateTextSelected: {
    color: COLORS.white
  },
  timesList: {
    marginTop: 8
  },
  timeItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginRight: 10
  },
  timeItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  timeText: {
    fontSize: SIZES.body,
    color: COLORS.text
  },
  timeTextSelected: {
    color: COLORS.white
  },
  bookAppointmentBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    ...SHADOWS.button
  },
  bookAppointmentDisabled: {
    opacity: 0.7
  },
  bookAppointmentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16
  },
  bookAppointmentText: {
    color: COLORS.white,
    fontSize: SIZES.h5,
    fontWeight: '700'
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  educationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6
  },
  educationText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    flex: 1,
    paddingBottom: 12
  },
  educationLine: {
    height: 24,
    width: 1,
    backgroundColor: COLORS.border,
    marginLeft: 3.5
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6
  },
  certificationText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    flex: 1
  },
  reviewSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small
  },
  reviewScore: {
    alignItems: 'center',
    width: '100%'
  },
  reviewScoreNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text
  },
  reviewStarsLarge: {
    flexDirection: 'row',
    marginVertical: 4
  },
  reviewScoreTotal: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  reviewsList: {
    marginBottom: 16
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.small
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center'
  },
  reviewAvatarText: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.primary
  },
  reviewName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  reviewStars: {
    flexDirection: 'row'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verifiedText: {
    fontSize: SIZES.xSmall,
    color: COLORS.success
  },
  reviewComment: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 4
  },
  reviewDate: {
    fontSize: SIZES.xSmall,
    color: COLORS.textLight
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    ...SHADOWS.small,
    marginBottom: 16
  },
  noReviewsText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12
  },
  bottomSpacer: {
    height: 100
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    ...SHADOWS.large
  },
  modalSuccessIcon: {
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  appointmentDetails: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  appointmentDetailLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary
  },
  appointmentDetailValue: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text
  },
  tokenRow: {
    borderBottomWidth: 0,
    paddingTop: 8
  },
  tokenBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8
  },
  tokenBadgeText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.h4
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalPrintBtn: {
    backgroundColor: COLORS.backgroundSecondary,
    flexDirection: 'row',
    gap: 8
  },
  modalPrintText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.primary
  },
  modalDoneBtn: {
    flex: 2,
    overflow: 'hidden'
  },
  modalDoneGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalDoneText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600'
  },
  historyModal: {
    maxHeight: height * 0.7
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  historyTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text
  },
  historyList: {
    paddingBottom: 16
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 8
  },
  historyItemLeft: {
    flex: 1
  },
  historyDoctorName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text
  },
  historyDepartment: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500'
  },
  historyDateTime: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  historyItemRight: {
    alignItems: 'flex-end'
  },
  historyTokenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  historyTokenText: {
    fontSize: SIZES.xSmall,
    fontWeight: '600'
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  historyStatusText: {
    fontSize: SIZES.xSmall,
    fontWeight: '600'
  },
  historyBookedAt: {
    fontSize: SIZES.xSmall,
    color: COLORS.textLight,
    marginTop: 4
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40
  },
  emptyHistoryText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12
  }
});
export default DoctorDetailScreen;