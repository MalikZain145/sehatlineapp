import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = [
    { id: '1', title: 'AI Symptom Checker', screen: 'AISymptomCheckerScreen', icon: 'medkit' },
    { id: '2', title: 'Voice Health Assistant', screen: 'VoiceHealthAssistantScreen', icon: 'mic' },
    { id: '3', title: 'Live Token Queue', screen: 'LiveTokenQueueScreen', icon: 'list' },
    { id: '4', title: 'AR Hospital Navigation', screen: 'ARHospitalNavigationScreen', icon: 'navigate' },
    { id: '5', title: 'Family Health Hub', screen: 'FamilyHubScreen', icon: 'people' },
    { id: '6', title: 'Emergency SOS', screen: 'SOSScreen', icon: 'warning' },
    { id: '7', title: 'Prescription Scanner', screen: 'PrescriptionScannerScreen', icon: 'scan' },
    { id: '8', title: 'Doctor Availability', screen: 'DoctorAvailabilityScreen', icon: 'calendar' },
  ];

  const filteredItems = allItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Search" navigation={navigation} />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services, doctors, or features..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={26} color="#00D4FF" />
            <Text style={styles.resultTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      />

      {searchQuery === '' && (
        <Text style={styles.hint}>Try searching for "AI", "Token", "Family", or "Emergency"</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 3.4, elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 55, fontSize: 17 },
  resultCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 3.4, elevation: 3,
  },
  resultTitle: { flex: 1, fontSize: 17, marginLeft: 15, color: '#1E3A8A' },
  hint: { 
    textAlign: 'center', 
    color: '#64748B', 
    marginTop: 40, 
    fontSize: 15 
  },
});

export default SearchScreen;