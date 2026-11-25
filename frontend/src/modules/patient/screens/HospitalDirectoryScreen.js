import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, Platform, StatusBar, SafeAreaView, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, SHADOWS } from '../../../theme';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');

// Responsive sizing
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const HospitalDirectoryScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const floors = [{
    id: 'basement',
    floor: 'Basement',
    icon: 'layers-outline',
    color: '#8B5CF6',
    depts: [{
      name: 'Radiology',
      room: 'B-101',
      icon: 'scan-outline',
      description: 'X-Ray, CT Scan, MRI',
      x: 1,
      y: 1,
      color: '#8B5CF6'
    }, {
      name: 'MRI/CT Scan',
      room: 'B-105',
      icon: 'medical-outline',
      description: 'Advanced Imaging',
      x: 3,
      y: 1,
      color: '#8B5CF6'
    }, {
      name: 'Mortuary',
      room: 'B-LL',
      icon: 'fitness-outline',
      description: '24/7 Service',
      x: 1,
      y: 3,
      color: '#6B7280'
    }, {
      name: 'Parking',
      room: 'P1-P3',
      icon: 'car-outline',
      description: 'Patient & Visitor Parking',
      x: 3,
      y: 3,
      color: '#3B82F6'
    }]
  }, {
    id: 'ground',
    floor: 'Ground Floor',
    icon: 'business-outline',
    color: '#10B981',
    depts: [{
      name: 'Emergency',
      room: 'ER-Main',
      icon: 'flash-outline',
      description: '24/7 Emergency Care',
      x: 1,
      y: 1,
      color: '#EF4444'
    }, {
      name: 'OPD Registration',
      room: 'G-20',
      icon: 'clipboard-outline',
      description: 'New Patient Registration',
      x: 3,
      y: 1,
      color: '#F59E0B'
    }, {
      name: 'Pharmacy',
      room: 'G-12',
      icon: 'medkit-outline',
      description: '24/7 Medicine Dispensary',
      x: 1,
      y: 3,
      color: '#10B981'
    }, {
      name: 'Lab Collection',
      room: 'G-05',
      icon: 'flask-outline',
      description: 'Blood & Sample Collection',
      x: 3,
      y: 3,
      color: '#8B5CF6'
    }]
  }, {
    id: 'first',
    floor: '1st Floor',
    icon: 'chevron-up-circle-outline',
    color: '#3B82F6',
    depts: [{
      name: 'Cardiology',
      room: '101-C',
      icon: 'heart-outline',
      description: 'Heart Specialist',
      x: 1,
      y: 1,
      color: '#EF4444'
    }, {
      name: 'Neurology',
      room: '108-N',
      icon: 'pulse-outline',
      description: 'Brain & Nerve Specialist',
      x: 3,
      y: 1,
      color: '#8B5CF6'
    }, {
      name: 'Dialysis Unit',
      room: '115-D',
      icon: 'water-outline',
      description: 'Kidney Dialysis',
      x: 1,
      y: 3,
      color: '#3B82F6'
    }, {
      name: 'Cafeteria',
      room: 'C-Wing',
      icon: 'restaurant-outline',
      description: 'Food & Refreshments',
      x: 3,
      y: 3,
      color: '#F59E0B'
    }]
  }, {
    id: 'second',
    floor: '2nd Floor',
    icon: 'chevron-up-circle-outline',
    color: '#F59E0B',
    depts: [{
      name: 'Pediatrics',
      room: '201-P',
      icon: 'happy-outline',
      description: 'Child Specialist',
      x: 1,
      y: 1,
      color: '#EC4899'
    }, {
      name: 'Gynecology',
      room: '208-G',
      icon: 'female-outline',
      description: 'Women\'s Health',
      x: 3,
      y: 1,
      color: '#EC4899'
    }, {
      name: 'Physiotherapy',
      room: '215-PT',
      icon: 'fitness-outline',
      description: 'Rehabilitation',
      x: 1,
      y: 3,
      color: '#10B981'
    }, {
      name: 'Laboratory',
      room: '220-L',
      icon: 'flask-outline',
      description: 'Pathology Tests',
      x: 3,
      y: 3,
      color: '#8B5CF6'
    }]
  }, {
    id: 'third',
    floor: '3rd Floor',
    icon: 'chevron-up-circle-outline',
    color: '#EF4444',
    depts: [{
      name: 'ICU',
      room: '301-ICU',
      icon: 'alert-circle-outline',
      description: 'Intensive Care Unit',
      x: 1,
      y: 1,
      color: '#EF4444'
    }, {
      name: 'Operation Theatre',
      room: '305-OT',
      icon: 'medical-outline',
      description: 'Surgical Suites',
      x: 3,
      y: 1,
      color: '#EF4444'
    }, {
      name: 'Recovery Room',
      room: '310-RR',
      icon: 'bed-outline',
      description: 'Post-op Care',
      x: 1,
      y: 3,
      color: '#10B981'
    }, {
      name: 'Administration',
      room: '315-AD',
      icon: 'business-outline',
      description: 'Hospital Management',
      x: 3,
      y: 3,
      color: '#6B7280'
    }]
  }];

  // Filter departments based on search
  const filteredFloors = floors.map(floor => ({
    ...floor,
    depts: floor.depts.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(floor => floor.depts.length > 0);

  // Get unique departments for legend
  const allDepartments = [...new Set(floors.flatMap(f => f.depts.map(d => d.name)))];
  const renderFloorGrid = floor => {
    // Create a 4x4 grid (x: 1-4, y: 1-4)
    const grid = [];
    const deptMap = {};
    floor.depts.forEach(d => {
      deptMap[`${d.x},${d.y}`] = d;
    });
    for (let row = 1; row <= 4; row++) {
      const rowItems = [];
      for (let col = 1; col <= 4; col++) {
        const key = `${col},${row}`;
        const dept = deptMap[key];
        rowItems.push(<TouchableOpacity key={key} style={[styles.gridCell, dept ? {
          backgroundColor: dept.color + '20',
          borderColor: dept.color
        } : styles.emptyCell]} onPress={() => {
          if (dept) {
            Alert.alert(dept.name, `Room: ${dept.room}\n${dept.description}\n\nFloor: ${floor.floor}`, [{
              text: 'Get Directions',
              onPress: () => Alert.alert('Directions', `Navigating to ${dept.name} (${dept.room})`)
            }, {
              text: 'Close',
              style: 'cancel'
            }]);
          }
        }} activeOpacity={0.7} disabled={!dept}>
            {dept ? <>
                <Ionicons name={dept.icon} size={wp(4)} color={dept.color} />
                <Text style={[styles.gridCellText, {
              color: dept.color
            }]} numberOfLines={1}>
                  {dept.name.split(' ').slice(0, 2).join(' ')}
                </Text>
                <Text style={styles.gridRoomText}>{dept.room}</Text>
              </> : <View style={styles.emptyCellContent} />}
          </TouchableOpacity>);
      }
      grid.push(<View key={row} style={styles.gridRow}>
          {rowItems}
        </View>);
    }
    return grid;
  };
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
            <Text style={styles.headerTitle}>Hospital Map</Text>
            <View style={{
            width: wp(10)
          }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={wp(4.5)} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search departments, services..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={wp(4)} color={COLORS.textSecondary} />
              </TouchableOpacity>}
          </View>

          {/* Legend */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendScroll}>
            {floors.map(floor => <TouchableOpacity key={floor.id} style={[styles.legendChip, selectedFloor === floor.id && styles.legendChipActive]} onPress={() => setSelectedFloor(selectedFloor === floor.id ? null : floor.id)}>
                <View style={[styles.legendDot, {
              backgroundColor: floor.color
            }]} />
                <Text style={[styles.legendText, selectedFloor === floor.id && styles.legendTextActive]}>
                  {floor.floor}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>
        </View>

        {/* Directory List with Grid View */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {(selectedFloor ? floors.filter(f => f.id === selectedFloor) : filteredFloors).length > 0 ? (selectedFloor ? floors.filter(f => f.id === selectedFloor) : filteredFloors).map((item, index) => <View key={index} style={[styles.floorCard, styles.cardShadow]}>
                {/* Floor Header */}
                <View style={[styles.floorHeader, {
            borderBottomColor: item.color + '30'
          }]}>
                  <View style={[styles.floorIconWrapper, {
              backgroundColor: item.color + '15'
            }]}>
                    <Ionicons name={item.icon} size={wp(4.5)} color={item.color} />
                  </View>
                  <Text style={[styles.floorText, {
              color: item.color
            }]}>{item.floor.toUpperCase()}</Text>
                  <View style={[styles.floorBadge, {
              backgroundColor: item.color + '15'
            }]}>
                    <Text style={[styles.floorBadgeText, {
                color: item.color
              }]}>{item.depts.length}</Text>
                  </View>
                </View>

                {/* Floor Map Grid */}
                <View style={styles.gridContainer}>
                  <View style={styles.gridLegend}>
                    <Text style={styles.gridLegendText}>Department Map View</Text>
                    <Text style={styles.gridLegendSub}>Tap any department for details</Text>
                  </View>
                  {renderFloorGrid(item)}
                </View>

                {/* Department List below grid */}
                <View style={styles.deptListContainer}>
                  <Text style={styles.deptListTitle}>Departments on this floor:</Text>
                  {item.depts.map((dept, i) => <TouchableOpacity key={i} style={[styles.deptListItem, {
              borderLeftColor: dept.color || item.color
            }]} onPress={() => {
              Alert.alert(dept.name, `Room: ${dept.room}\n${dept.description}`, [{
                text: 'Get Directions',
                onPress: () => Alert.alert('Directions', `Navigating to ${dept.name} (${dept.room})`)
              }, {
                text: 'Close',
                style: 'cancel'
              }]);
            }}>
                      <Ionicons name={dept.icon} size={wp(3.5)} color={dept.color || item.color} />
                      <View style={styles.deptListItemInfo}>
                        <Text style={styles.deptListItemName}>{dept.name}</Text>
                        <Text style={styles.deptListItemRoom}>{dept.room}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={wp(3.5)} color={COLORS.textSecondary} />
                    </TouchableOpacity>)}
                </View>
              </View>) : <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={wp(12)} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptySubtitle}>Try searching with different keywords</Text>
            </View>}

          {/* Help Section */}
          <View style={[styles.helpSection, styles.cardShadow]}>
            <View style={styles.helpCard}>
              <Ionicons name="help-circle-outline" size={wp(5)} color={COLORS.primary} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>Need Help Finding a Department?</Text>
                <Text style={styles.helpText}>Visit the information desk on Ground Floor or ask any staff member for assistance.</Text>
                <TouchableOpacity style={styles.helpButton} onPress={() => Alert.alert('Reception', 'Connecting to hospital reception...')}>
                  <Text style={styles.helpButtonText}>Contact Reception →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{
          height: hp(10)
        }} />
        </ScrollView>
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
    flex: 1,
    paddingBottom: BOTTOM_SPACE
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
    fontWeight: 'bold',
    letterSpacing: 0.5
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
  // Legend
  legendScroll: {
    paddingHorizontal: wp(5),
    marginTop: hp(1.2),
    marginBottom: hp(0.5)
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: wp(4),
    marginRight: wp(2),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small
  },
  legendChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10'
  },
  legendDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    marginRight: wp(1.5)
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '500'
  },
  legendTextActive: {
    color: COLORS.primary
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(15)
  },
  floorCard: {
    marginBottom: hp(2.5),
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    padding: wp(3.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    gap: wp(2)
  },
  floorIconWrapper: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(2),
    justifyContent: 'center',
    alignItems: 'center'
  },
  floorText: {
    fontWeight: 'bold',
    fontSize: wp(3.5),
    letterSpacing: 0.5,
    flex: 1
  },
  floorBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(3)
  },
  floorBadgeText: {
    fontSize: wp(2.5),
    fontWeight: '600'
  },
  // Grid
  gridContainer: {
    marginTop: hp(1.5),
    marginBottom: hp(1)
  },
  gridLegend: {
    marginBottom: hp(1)
  },
  gridLegendText: {
    color: COLORS.text,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  gridLegendSub: {
    color: COLORS.textSecondary,
    fontSize: wp(2.5),
    marginTop: hp(0.2)
  },
  gridRow: {
    flexDirection: 'row',
    gap: wp(1),
    marginBottom: wp(1)
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: wp(2),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(1),
    minHeight: wp(15),
    backgroundColor: COLORS.backgroundSecondary
  },
  emptyCell: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.border,
    borderWidth: 0.5
  },
  emptyCellContent: {
    opacity: 0.3
  },
  gridCellText: {
    fontSize: wp(2.2),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: wp(0.5)
  },
  gridRoomText: {
    fontSize: wp(1.8),
    color: COLORS.textSecondary,
    marginTop: wp(0.3)
  },
  // Department List
  deptListContainer: {
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  deptListTitle: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    fontWeight: '500',
    marginBottom: hp(0.8)
  },
  deptListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(2),
    borderLeftWidth: 3,
    marginBottom: hp(0.3),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(1),
    gap: wp(2)
  },
  deptListItemInfo: {
    flex: 1
  },
  deptListItemName: {
    color: COLORS.text,
    fontSize: wp(3),
    fontWeight: '500'
  },
  deptListItemRoom: {
    color: COLORS.textSecondary,
    fontSize: wp(2.2)
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
  helpSection: {
    marginTop: hp(2),
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    padding: wp(3.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3)
  },
  helpContent: {
    flex: 1,
    gap: hp(0.3)
  },
  helpTitle: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  helpText: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    lineHeight: wp(4)
  },
  helpButton: {
    marginTop: hp(0.3)
  },
  helpButtonText: {
    color: COLORS.primary,
    fontSize: wp(3),
    fontWeight: '600'
  }
});
export default HospitalDirectoryScreen;