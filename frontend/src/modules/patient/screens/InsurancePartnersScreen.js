import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions, Platform, StatusBar, TextInput, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');

// Responsive sizing
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const InsurancePartnersScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const insuranceTypes = ['All', 'Govt Panel', 'Private', 'Corporate', 'International'];
  const partners = [
  // Govt Panel
  {
    id: '1',
    name: 'State Life Insurance Corporation',
    type: 'Govt Panel',
    coverage: 'Full Coverage',
    color: COLORS.success,
    discount: '100%',
    network: 'All Hospitals',
    cashless: true,
    phone: '0800-12345'
  }, {
    id: '2',
    name: 'Pakistan Bait-ul-Mal',
    type: 'Govt Panel',
    coverage: 'Full Coverage',
    color: COLORS.success,
    discount: '100%',
    network: 'Govt Hospitals',
    cashless: true,
    phone: '0800-67890'
  }, {
    id: '3',
    name: 'Employees Old-Age Benefits',
    type: 'Govt Panel',
    coverage: 'Standard',
    color: COLORS.success,
    discount: '80%',
    network: 'Selected Hospitals',
    cashless: true,
    phone: '051-111-123'
  },
  // Private
  {
    id: '4',
    name: 'Jubilee General Insurance',
    type: 'Private',
    coverage: 'Comprehensive',
    color: COLORS.danger,
    discount: '70%',
    network: 'Nationwide',
    cashless: true,
    phone: '0800-77777'
  }, {
    id: '5',
    name: 'EFU Life Assurance',
    type: 'Private',
    coverage: 'Standard Plus',
    color: COLORS.warning,
    discount: '60%',
    network: 'Major Hospitals',
    cashless: true,
    phone: '0800-33333'
  }, {
    id: '6',
    name: 'Allianz EFU Health',
    type: 'Private',
    coverage: 'Premium',
    color: COLORS.warning,
    discount: '75%',
    network: 'All Hospitals',
    cashless: true,
    phone: '0800-44444'
  }, {
    id: '7',
    name: 'Pak Qatar Takaful',
    type: 'Private',
    coverage: 'Standard',
    color: COLORS.danger,
    discount: '65%',
    network: 'Selected Hospitals',
    cashless: false,
    phone: '0800-55555'
  },
  // Corporate
  {
    id: '8',
    name: 'Adamjee Insurance',
    type: 'Corporate',
    coverage: 'Platinum Plus',
    color: COLORS.primary,
    discount: '80%',
    network: 'All Major Hospitals',
    cashless: true,
    phone: '0800-88888'
  }, {
    id: '9',
    name: 'ICICI Lombard',
    type: 'Corporate',
    coverage: 'Corporate Elite',
    color: COLORS.primary,
    discount: '85%',
    network: 'Nationwide',
    cashless: true,
    phone: '0800-99999'
  }, {
    id: '10',
    name: 'HBL Insurance',
    type: 'Corporate',
    coverage: 'Business Secure',
    color: COLORS.primary,
    discount: '75%',
    network: 'Selected Hospitals',
    cashless: true,
    phone: '0800-11111'
  },
  // International
  {
    id: '11',
    name: 'Aga Khan Health',
    type: 'International',
    coverage: 'Worldwide',
    color: COLORS.appointment,
    discount: '90%',
    network: 'International Network',
    cashless: true,
    phone: '0800-22222'
  }, {
    id: '12',
    name: 'Cigna Global',
    type: 'International',
    coverage: 'Global Elite',
    color: COLORS.appointment,
    discount: '85%',
    network: 'Worldwide',
    cashless: true,
    phone: '0800-66666'
  }, {
    id: '13',
    name: 'Allied Global Health',
    type: 'International',
    coverage: 'International Plus',
    color: COLORS.appointment,
    discount: '80%',
    network: 'International',
    cashless: false,
    phone: '0800-77788'
  }];
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) || partner.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || partner.type === selectedType;
    return matchesSearch && matchesType;
  });
  const getTypeColor = type => {
    switch (type) {
      case 'Govt Panel':
        return COLORS.success;
      case 'Private':
        return COLORS.danger;
      case 'Corporate':
        return COLORS.primary;
      case 'International':
        return COLORS.appointment;
      default:
        return COLORS.textSecondary;
    }
  };
  const getTypeIcon = type => {
    switch (type) {
      case 'Govt Panel':
        return 'shield-checkmark-outline';
      case 'Private':
        return 'business-outline';
      case 'Corporate':
        return 'briefcase-outline';
      case 'International':
        return 'globe-outline';
      default:
        return 'medkit-outline';
    }
  };
  const TypeFilter = () => <View style={styles.filterWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={styles.filterContainer}>
        {insuranceTypes.map((type, index) => <TouchableOpacity key={index} style={[styles.filterChip, selectedType === type && styles.filterChipActive]} onPress={() => setSelectedType(type)}>
            <Text style={[styles.filterText, selectedType === type && styles.filterTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>)}
      </ScrollView>
    </View>;
  const renderPartnerCard = ({
    item
  }) => <View style={[styles.partnerCard, styles.cardShadow]}>
      <View style={styles.cardContent}>
        <View style={[styles.statusLine, {
        backgroundColor: item.color
      }]} />
        
        <View style={styles.partnerContent}>
          <View style={styles.partnerHeader}>
            <View style={[styles.partnerIcon, {
            backgroundColor: item.color + '20'
          }]}>
              <Ionicons name={getTypeIcon(item.type)} size={wp(4.5)} color={item.color} />
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{item.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={[styles.typeText, {
                color: getTypeColor(item.type)
              }]}>{item.type}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="shield-checkmark-outline" size={wp(2.5)} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Coverage:</Text>
              <Text style={styles.detailValue}>{item.coverage}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="percent-outline" size={wp(2.5)} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Discount:</Text>
              <Text style={styles.detailValue}>{item.discount}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={wp(2.5)} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Network:</Text>
              <Text style={styles.detailValue}>{item.network}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name={item.cashless ? "card-outline" : "alert-circle-outline"} size={wp(2.5)} color={item.cashless ? COLORS.success : COLORS.warning} />
              <Text style={styles.detailLabel}>Cashless:</Text>
              <Text style={[styles.detailValue, {
              color: item.cashless ? COLORS.success : COLORS.warning
            }]}>
                {item.cashless ? "Yes" : "Reimbursement"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.contactBtn}>
            <LinearGradient colors={[item.color, item.color + 'CC']} style={styles.contactGradient}>
              <Ionicons name="call-outline" size={wp(3)} color={COLORS.white} />
              <Text style={styles.contactText}>Contact: {item.phone}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.25
    }} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.topHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Insurance Partners</Text>
            <View style={{
            width: wp(10)
          }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={wp(4.5)} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search by insurance company..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={wp(4)} color={COLORS.textSecondary} />
              </TouchableOpacity>}
          </View>
        </View>

        {/* Type Filter */}
        <TypeFilter />

        {/* Stats Banner */}
        <View style={[styles.statsBanner, styles.cardShadow]}>
          <View style={styles.statItem}>
            <Ionicons name="business-outline" size={wp(3.5)} color={COLORS.success} />
            <View>
              <Text style={styles.statValue}>{filteredPartners.length}</Text>
              <Text style={styles.statLabel}>Partners</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="shield-outline" size={wp(3.5)} color={COLORS.primary} />
            <View>
              <Text style={styles.statValue}>13+</Text>
              <Text style={styles.statLabel}>Companies</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={wp(3.5)} color={COLORS.warning} />
            <View>
              <Text style={styles.statValue}>90%</Text>
              <Text style={styles.statLabel}>Max Discount</Text>
            </View>
          </View>
        </View>

        {/* Partners List */}
        <FlatList data={filteredPartners} keyExtractor={item => item.id} renderItem={renderPartnerCard} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={wp(12)} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No Insurance Partners Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filter</Text>
            </View>} />

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={wp(3.5)} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Direct billing available for all partnered insurance companies. Present your insurance card at reception.
          </Text>
        </View>

        <View style={{
        height: hp(1)
      }} />
      </SafeAreaView>
    </View>;
};
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
    height: '100%'
  },
  safeArea: {
    flex: 1
  },
  cardShadow: {
    ...SHADOWS.medium
  },
  // Header
  headerContainer: {
    paddingBottom: hp(1)
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(1) : StatusBar.currentHeight + hp(1),
    paddingBottom: hp(1.5)
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(5),
    fontWeight: 'bold'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(5),
    marginTop: hp(1.5),
    paddingHorizontal: wp(3.5),
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: wp(2),
    ...SHADOWS.small
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.5),
    paddingVertical: hp(1.2)
  },
  filterContainer: {
    marginVertical: hp(1)
  },
  filterScroll: {
    paddingHorizontal: wp(4),
    gap: wp(2)
  },
  filterChip: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(5),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small
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
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    paddingVertical: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  statValue: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.3)
  },
  statDivider: {
    width: 1,
    height: hp(2.5),
    backgroundColor: COLORS.border
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(2),
    gap: hp(1)
  },
  partnerCard: {
    borderRadius: wp(3.5),
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: hp(1)
  },
  cardContent: {
    flexDirection: 'row',
    overflow: 'hidden'
  },
  statusLine: {
    width: wp(1.2)
  },
  partnerContent: {
    flex: 1,
    padding: wp(3),
    paddingLeft: wp(2.5)
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1)
  },
  partnerIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  partnerInfo: {
    flex: 1
  },
  partnerName: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  typeBadge: {
    marginTop: hp(0.2)
  },
  typeText: {
    fontSize: wp(2.3),
    fontWeight: '600'
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1),
    marginBottom: hp(1)
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(1.5)
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.2)
  },
  detailValue: {
    color: COLORS.text,
    fontSize: wp(2.3),
    fontWeight: '500'
  },
  contactBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginTop: hp(0.3)
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.6),
    gap: wp(1)
  },
  contactText: {
    color: COLORS.white,
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8)
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: wp(4),
    fontWeight: 'bold',
    marginTop: hp(2)
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: wp(3.2),
    marginTop: hp(1)
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(4),
    marginTop: hp(1),
    padding: wp(2.5),
    backgroundColor: COLORS.primary + '10',
    borderRadius: wp(2.5),
    gap: wp(2),
    borderWidth: 1,
    borderColor: COLORS.primary + '20'
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    flex: 1
  }
});
export default InsurancePartnersScreen;