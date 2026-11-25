import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const FamilyHubScreen = ({ navigation }) => {
  const familyMembers = [
    { id: '1', name: 'Ahmed Khan', relation: 'Son', age: 12, status: 'Healthy', avatarColor: '#00D4FF' },
    { id: '2', name: 'Fatima Bibi', relation: 'Mother', age: 67, status: 'Chronic - Monitored', avatarColor: '#EF4444' },
    { id: '3', name: 'Ayesha Malik', relation: 'Wife', age: 34, status: 'Healthy', avatarColor: '#10B981' },
    { id: '4', name: 'Bilal Ahmed', relation: 'Self', age: 38, status: 'Follow-up Due', avatarColor: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <CustomHeader title="Family Health Hub" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Good Morning, Kinza 👋</Text>
        <Text style={styles.subtitle}>Managing health for your entire family</Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Family Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Due for Checkup</Text>
          </View>
        </View>

        {/* Family Members List */}
        <Text style={styles.sectionTitle}>Your Family Members</Text>
        
        <FlatList
          data={familyMembers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.memberCard}
              onPress={() => navigation.navigate('FamilyMemberProfileScreen', { member: item })}
            >
              <View style={[styles.avatar, { backgroundColor: item.avatarColor + '30' }]}>
                <Ionicons name="person" size={32} color={item.avatarColor} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.relation}>{item.relation} • {item.age} years</Text>
              </View>
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.status, 
                  item.status.includes('Chronic') || item.status.includes('Due') 
                    ? styles.warningStatus 
                    : styles.healthyStatus
                ]}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Quick Actions */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFamilyMemberScreen')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Family Member</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.reminderButton}
          onPress={() => navigation.navigate('SharedFamilyRemindersScreen')}
        >
          <Ionicons name="notifications" size={24} color="#1E3A8A" />
          <Text style={styles.reminderButtonText}>Shared Family Reminders</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { padding: 20 },
  welcome: { fontSize: 26, fontWeight: 'bold', color: '#1E3A8A' },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 25 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  statNumber: { fontSize: 32, fontWeight: 'bold', color: '#1E3A8A' },
  statLabel: { fontSize: 14, color: '#64748B', marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1E3A8A', marginBottom: 15 },
  memberCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 19, fontWeight: 'bold', color: '#1E3A8A' },
  relation: { fontSize: 15, color: '#64748B' },
  statusContainer: { alignItems: 'flex-end' },
  status: { fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  healthyStatus: { backgroundColor: '#D1FAE5', color: '#10B981' },
  warningStatus: { backgroundColor: '#FEE2E2', color: '#EF4444' },
  addButton: {
    backgroundColor: '#00D4FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  reminderButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reminderButtonText: { color: '#1E3A8A', fontSize: 18, fontWeight: '600', marginLeft: 10 },
});

export default FamilyHubScreen;