import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, FlatList, Platform, StatusBar, Dimensions, Linking, Animated, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
const {
  width
} = Dimensions.get('window');

// Complete Doctors Data - Government Hospital (No Fees)
const doctorsData = [
// ===== CARDIAC DEPARTMENT =====
{
  id: 1,
  name: "Dr. Sara Malik",
  title: "MD, MBBS, FACC",
  specialty: "Interventional Cardiologist",
  department: "Cardiac",
  experience: "12 Years",
  rating: 4.8,
  totalReviews: 324,
  patients: "1,240+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Sara Malik is a board-certified interventional cardiologist with over 12 years of experience...",
  education: ["MD - Aga Khan University Hospital", "MBBS - King Edward Medical University"],
  certifications: ["Board Certified in Cardiovascular Disease", "American College of Cardiology - Fellow"],
  specializations: ["Heart Failure", "Coronary Artery Disease", "Preventive Cardiology"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'A',
  room: 'Room 204 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=1'
}, {
  id: 2,
  name: "Dr. Zain Akhtar",
  title: "MD, FACC",
  specialty: "Cardiothoracic Surgeon",
  department: "Cardiac",
  experience: "18 Years",
  rating: 4.9,
  totalReviews: 412,
  patients: "1,780+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Zain Akhtar is a renowned cardiothoracic surgeon with expertise in heart and lung surgeries...",
  education: ["MD - King Edward Medical University", "FACC - American College of Cardiology"],
  certifications: ["Board Certified in Cardiothoracic Surgery", "Pakistan Society of Cardiovascular Surgeons"],
  specializations: ["Heart Surgery", "Lung Surgery", "Minimally Invasive Surgery"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  availability: "Available Today",
  tokenPrefix: 'B',
  room: 'Room 210 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=2'
}, {
  id: 3,
  name: "Dr. Fatima Noor",
  title: "MD, FSCAI",
  specialty: "Pediatric Cardiologist",
  department: "Cardiac",
  experience: "10 Years",
  rating: 4.8,
  totalReviews: 256,
  patients: "890+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Fatima Noor specializes in diagnosing and treating heart conditions in children...",
  education: ["MD - Aga Khan University Hospital", "FSCAI - Society for Cardiovascular Angiography"],
  certifications: ["Board Certified in Pediatric Cardiology", "Pakistan Pediatric Cardiac Society"],
  specializations: ["Congenital Heart Defects", "Pediatric Heart Surgery", "Cardiac Imaging"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  availableTimes: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Tomorrow",
  tokenPrefix: 'C',
  room: 'Room 215 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=3'
}, {
  id: 4,
  name: "Dr. Usman Riaz",
  title: "MD, FRCP",
  specialty: "Clinical Cardiologist",
  department: "Cardiac",
  experience: "15 Years",
  rating: 4.7,
  totalReviews: 389,
  patients: "1,560+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Usman Riaz is a clinical cardiologist with expertise in non-invasive cardiac diagnostics...",
  education: ["MD - King Edward Medical University", "FRCP - Royal College of Physicians, UK"],
  certifications: ["Board Certified in Cardiology", "Pakistan Cardiac Society - Member"],
  specializations: ["Heart Failure", "Hypertension", "Cardiac Rehabilitation"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  availability: "Available Today",
  tokenPrefix: 'D',
  room: 'Room 220 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=4'
}, {
  id: 5,
  name: "Dr. Ayesha Tariq",
  title: "MD, FASE",
  specialty: "Cardiac Electrophysiologist",
  department: "Cardiac",
  experience: "11 Years",
  rating: 4.9,
  totalReviews: 178,
  patients: "670+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Ayesha Tariq specializes in heart rhythm disorders and performs complex cardiac ablations...",
  education: ["MD - Aga Khan University Hospital", "FASE - American Society of Echocardiography"],
  certifications: ["Board Certified in Cardiac Electrophysiology", "Pakistan Heart Rhythm Society"],
  specializations: ["Arrhythmias", "Pacemaker Implantation", "Cardiac Ablation"],
  availableDays: ["Mon", "Tue", "Thu", "Fri", "Sat"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'E',
  room: 'Room 225 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=5'
},
// ===== PHARMACY DEPARTMENT =====
{
  id: 6,
  name: "Dr. Muhammad Hassan",
  title: "Pharm.D, RPh",
  specialty: "Clinical Pharmacist",
  department: "Pharmacy",
  experience: "12 Years",
  rating: 4.7,
  totalReviews: 234,
  patients: "980+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Muhammad Hassan is a clinical pharmacist specializing in medication management...",
  education: ["Pharm.D - University of Punjab", "RPh - Registered Pharmacist"],
  certifications: ["Board Certified Pharmacotherapy Specialist", "Pakistan Pharmacy Council"],
  specializations: ["Medication Management", "Drug Interactions", "Clinical Pharmacy"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'P1',
  room: 'Pharmacy Wing • Window 1',
  image: 'https://i.pravatar.cc/150?img=6'
}, {
  id: 7,
  name: "Dr. Samina Ali",
  title: "Pharm.D, MBA",
  specialty: "Hospital Pharmacist",
  department: "Pharmacy",
  experience: "9 Years",
  rating: 4.6,
  totalReviews: 189,
  patients: "720+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Samina Ali specializes in hospital pharmacy services, including medication distribution...",
  education: ["Pharm.D - University of Punjab", "MBA - LUMS"],
  certifications: ["Registered Pharmacist - Pakistan", "Pakistan Society of Hospital Pharmacists"],
  specializations: ["Sterile Compounding", "Medication Safety", "Patient Counseling"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Tomorrow",
  tokenPrefix: 'P2',
  room: 'Pharmacy Wing • Window 2',
  image: 'https://i.pravatar.cc/150?img=7'
},
// ===== LABORATORY DEPARTMENT =====
{
  id: 8,
  name: "Dr. Ahmed Khan",
  title: "PhD, MBBS",
  specialty: "Clinical Pathologist",
  department: "Laboratory",
  experience: "14 Years",
  rating: 4.8,
  totalReviews: 312,
  patients: "1,340+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Ahmed Khan is a clinical pathologist with expertise in diagnostic laboratory medicine...",
  education: ["PhD - Aga Khan University", "MBBS - King Edward Medical University"],
  certifications: ["Board Certified in Clinical Pathology", "Pakistan Association of Pathologists"],
  specializations: ["Hematology", "Microbiology", "Chemical Pathology"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'L1',
  room: 'Lab 05 • Ground Floor',
  image: 'https://i.pravatar.cc/150?img=8'
}, {
  id: 9,
  name: "Dr. Sana Javed",
  title: "MD, MRCPath",
  specialty: "Microbiologist",
  department: "Laboratory",
  experience: "10 Years",
  rating: 4.7,
  totalReviews: 198,
  patients: "760+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Sana Javed specializes in medical microbiology, including bacteriology, virology...",
  education: ["MD - Aga Khan University Hospital", "MRCPath - Royal College of Pathologists, UK"],
  certifications: ["Board Certified in Microbiology", "Pakistan Society of Microbiology"],
  specializations: ["Bacteriology", "Virology", "Parasitology"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'L2',
  room: 'Lab 08 • Ground Floor',
  image: 'https://i.pravatar.cc/150?img=9'
},
// ===== OTHER SPECIALISTS =====
{
  id: 10,
  name: "Dr. Ahmed Hassan",
  title: "MD, FRCS",
  specialty: "Orthopedic Surgeon",
  department: "Orthopedics",
  experience: "15 Years",
  rating: 4.9,
  totalReviews: 456,
  patients: "2,100+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Ahmed Hassan is a highly skilled orthopedic surgeon with expertise in joint replacement...",
  education: ["MD - King Edward Medical University", "FRCS - Royal College of Surgeons, UK"],
  certifications: ["Board Certified in Orthopedic Surgery", "Pakistan Orthopedic Association"],
  specializations: ["Joint Replacement", "Sports Medicine", "Trauma Surgery"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  availability: "Available Tomorrow",
  tokenPrefix: 'O1',
  room: 'Room 305 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=10'
}, {
  id: 11,
  name: "Dr. Fatima Khan",
  title: "MD, FAAP",
  specialty: "Pediatrician",
  department: "Pediatrics",
  experience: "8 Years",
  rating: 4.7,
  totalReviews: 289,
  patients: "980+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Fatima Khan is a compassionate pediatrician dedicated to children's health...",
  education: ["MD - Aga Khan University Hospital", "FAAP - American Academy of Pediatrics"],
  certifications: ["Board Certified in Pediatrics", "Pakistan Pediatric Association"],
  specializations: ["Child Health", "Vaccinations", "Growth & Development"],
  availableDays: ["Mon", "Tue", "Thu", "Fri", "Sat"],
  availableTimes: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'P3',
  room: 'Room 315 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=11'
}, {
  id: 12,
  name: "Dr. Muhammad Ali",
  title: "MD, FACP",
  specialty: "Neurologist",
  department: "Neurology",
  experience: "10 Years",
  rating: 4.6,
  totalReviews: 178,
  patients: "760+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Muhammad Ali specializes in neurological disorders including stroke, epilepsy...",
  education: ["MD - Aga Khan University Hospital", "FACP - American College of Physicians"],
  certifications: ["Board Certified in Neurology", "Pakistan Society of Neurology"],
  specializations: ["Stroke", "Epilepsy", "Parkinson's Disease"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  availability: "Available Today",
  tokenPrefix: 'N1',
  room: 'Room 405 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=12'
}, {
  id: 13,
  name: "Dr. Ayesha Malik",
  title: "MD, FACOG",
  specialty: "Gynecologist & Obstetrician",
  department: "Gynecology",
  experience: "11 Years",
  rating: 4.9,
  totalReviews: 523,
  patients: "1,850+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Ayesha Malik provides comprehensive women's health care including pregnancy...",
  education: ["MD - King Edward Medical University", "FACOG - American College of Obstetricians"],
  certifications: ["Board Certified in OB/GYN", "Pakistan Society of Obstetricians"],
  specializations: ["Pregnancy Care", "Fertility", "Gynecological Surgery"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Sat"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Tomorrow",
  tokenPrefix: 'G1',
  room: 'Room 410 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=13'
}, {
  id: 14,
  name: "Dr. Usman Chaudhry",
  title: "MD, FRCS",
  specialty: "General Surgeon",
  department: "Surgery",
  experience: "14 Years",
  rating: 4.7,
  totalReviews: 342,
  patients: "1,560+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Usman Chaudhry is an experienced general surgeon specializing in laparoscopic...",
  education: ["MD - King Edward Medical University", "FRCS - Royal College of Surgeons, UK"],
  certifications: ["Board Certified in General Surgery", "Pakistan Surgical Association"],
  specializations: ["Laparoscopic Surgery", "Hernia Repair", "Gallbladder Surgery"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  availability: "Available Today",
  tokenPrefix: 'S1',
  room: 'Room 505 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=14'
}, {
  id: 15,
  name: "Dr. Samina Tariq",
  title: "MD, FACP",
  specialty: "Endocrinologist",
  department: "Endocrinology",
  experience: "9 Years",
  rating: 4.8,
  totalReviews: 215,
  patients: "890+",
  hospital: "CDA Hospital, Islamabad",
  address: "Sector G-10/4, Islamabad, Pakistan",
  about: "Dr. Samina Tariq specializes in hormonal disorders including diabetes, thyroid...",
  education: ["MD - Aga Khan University Hospital", "FACP - American College of Physicians"],
  certifications: ["Board Certified in Endocrinology", "Pakistan Endocrine Society"],
  specializations: ["Diabetes", "Thyroid Disorders", "Metabolic Syndrome"],
  availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availableTimes: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  availability: "Available Today",
  tokenPrefix: 'E1',
  room: 'Room 510 • OPD Block',
  image: 'https://i.pravatar.cc/150?img=15'
}];
const DoctorListScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [filteredDoctors, setFilteredDoctors] = useState(doctorsData);
  const [isSaved, setIsSaved] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const specialties = ['All', 'Cardiologist', 'Cardiothoracic Surgeon', 'Pediatric Cardiologist', 'Clinical Cardiologist', 'Cardiac Electrophysiologist', 'Clinical Pharmacist', 'Hospital Pharmacist', 'Clinical Pathologist', 'Microbiologist', 'Orthopedic Surgeon', 'Pediatrician', 'Neurologist', 'Gynecologist', 'General Surgeon', 'Endocrinologist'];
  const handleSearch = text => {
    setSearchQuery(text);
    filterDoctors(text, selectedSpecialty);
  };
  const filterDoctors = (query, specialty) => {
    let filtered = doctorsData;
    if (query) {
      filtered = filtered.filter(doc => doc.name.toLowerCase().includes(query.toLowerCase()) || doc.specialty.toLowerCase().includes(query.toLowerCase()) || doc.department.toLowerCase().includes(query.toLowerCase()));
    }
    if (specialty !== 'All') {
      filtered = filtered.filter(doc => doc.specialty.toLowerCase().includes(specialty.toLowerCase()));
    }
    setFilteredDoctors(filtered);
  };
  const handleSpecialtySelect = specialty => {
    setSelectedSpecialty(specialty);
    filterDoctors(searchQuery, specialty);
  };
  const handleSaveToggle = id => {
    const newState = !isSaved[id];
    setIsSaved({
      ...isSaved,
      [id]: newState
    });
    Animated.sequence([Animated.timing(scaleValue, {
      toValue: 1.3,
      duration: 150,
      useNativeDriver: true
    }), Animated.timing(scaleValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true
    })]).start();
  };
  const getInitials = name => {
    return name.split(' ').map(n => n[0]).join('');
  };
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setFilteredDoctors(doctorsData);
      setRefreshing(false);
    }, 1000);
  };
  const renderDoctorCard = ({
    item
  }) => <TouchableOpacity style={styles.doctorCard} onPress={() => navigation.navigate('DoctorDetailScreen', {
    doctor: item
  })} activeOpacity={0.9}>
      <View style={styles.doctorCardContent}>
        <View style={styles.doctorCardHeader}>
          <View style={styles.doctorCardAvatar}>
            {item.image ? <Image source={{
            uri: item.image
          }} style={styles.doctorImage} /> : <View style={styles.doctorImagePlaceholder}>
                <Text style={styles.doctorInitials}>{getInitials(item.name)}</Text>
              </View>}
          </View>
          <View style={styles.doctorCardInfo}>
            <Text style={styles.doctorCardName}>{item.name}</Text>
            <Text style={styles.doctorCardSpecialty}>{item.specialty}</Text>
            <Text style={styles.doctorCardHospital}>{item.department}</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveToggle(item.id)}>
            <Animated.View style={{
            transform: [{
              scale: scaleValue
            }]
          }}>
              <Ionicons name={isSaved[item.id] ? "bookmark" : "bookmark-outline"} size={22} color={isSaved[item.id] ? COLORS.primary : COLORS.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.doctorCardDetails}>
          <View style={styles.doctorCardStat}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.doctorCardStatText}>{item.experience}</Text>
          </View>
          <View style={styles.doctorCardStat}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.doctorCardStatText}>{item.patients}</Text>
          </View>
          <View style={styles.doctorCardStat}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.doctorCardStatText}>{item.rating}</Text>
          </View>
          <View style={styles.doctorCardStat}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.doctorCardStatText}>{item.room || 'OPD Block'}</Text>
          </View>
          <View style={styles.doctorCardStat}>
            <View style={[styles.availabilityDot, {
            backgroundColor: item.availability === 'Available Today' ? COLORS.success : COLORS.warning
          }]} />
            <Text style={[styles.doctorCardStatText, {
            color: item.availability === 'Available Today' ? COLORS.success : COLORS.warning
          }]}>
              {item.availability === 'Available Today' ? 'Today' : 'Tomorrow'}
            </Text>
          </View>
        </View>

        <View style={styles.doctorCardFooter}>
          <View style={styles.doctorCardToken}>
            <Ionicons name="ticket-outline" size={14} color={COLORS.primary} />
            <Text style={styles.doctorCardTokenText}>Token: {item.tokenPrefix}</Text>
          </View>
          <View style={styles.doctorCardActions}>
            <TouchableOpacity style={styles.doctorCardBookBtn} onPress={() => navigation.navigate('DoctorDetailScreen', {
            doctor: item
          })}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
              <Text style={styles.doctorCardBookText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
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
          <Text style={styles.headerTitle}>Find a Doctor</Text>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search doctors by name or specialty..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={handleSearch} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => {
          setSearchQuery('');
          filterDoctors('', selectedSpecialty);
        }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>}
        </View>
      </View>

      {/* Specialty Filter */}
      <View style={styles.specialtyContainer}>
        <FlatList data={specialties} horizontal showsHorizontalScrollIndicator={false} renderItem={({
        item
      }) => <TouchableOpacity style={[styles.specialtyChip, selectedSpecialty === item && styles.specialtyChipActive]} onPress={() => handleSpecialtySelect(item)}>
              <Text style={[styles.specialtyChipText, selectedSpecialty === item && styles.specialtyChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>} keyExtractor={item => item} contentContainerStyle={styles.specialtyList} />
      </View>

      <FlatList data={filteredDoctors} renderItem={renderDoctorCard} keyExtractor={item => item.id.toString()} contentContainerStyle={styles.doctorsList} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />} ListHeaderComponent={<View style={styles.resultHeader}>
            <Text style={styles.resultText}>
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'} Available
            </Text>
          </View>} ListEmptyComponent={<View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={60} color={COLORS.border} />
            <Text style={styles.emptyText}>No doctors found</Text>
            <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
          </View>} />
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
  headerActionBtn: {
    padding: 8
  },
  searchContainer: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
    backgroundColor: COLORS.card
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.small
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: SIZES.body,
    color: COLORS.text
  },
  specialtyContainer: {
    backgroundColor: COLORS.card,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  specialtyList: {
    paddingHorizontal: SIZES.lg
  },
  specialtyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  specialtyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  specialtyChipText: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  specialtyChipTextActive: {
    color: COLORS.white
  },
  resultHeader: {
    paddingHorizontal: SIZES.xs,
    paddingBottom: SIZES.md
  },
  resultText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  doctorsList: {
    padding: SIZES.lg,
    paddingBottom: 100
  },
  doctorCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  doctorCardContent: {
    padding: 16
  },
  doctorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  doctorCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundSecondary
  },
  doctorImage: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  doctorImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  doctorInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary
  },
  doctorCardInfo: {
    flex: 1
  },
  doctorCardName: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text
  },
  doctorCardSpecialty: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500'
  },
  doctorCardHospital: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  saveBtn: {
    padding: 8
  },
  doctorCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4
  },
  doctorCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  doctorCardStatText: {
    fontSize: SIZES.xSmall,
    color: COLORS.textSecondary
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  doctorCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  doctorCardToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  doctorCardTokenText: {
    fontSize: SIZES.xSmall,
    color: COLORS.primary,
    fontWeight: '600'
  },
  doctorCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  doctorCardBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    gap: 6
  },
  doctorCardBookText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.small
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16
  },
  emptySubText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: 4
  }
});
export default DoctorListScreen;