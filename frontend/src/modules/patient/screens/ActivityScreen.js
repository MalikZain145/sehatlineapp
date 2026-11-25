import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const ActivityScreen = ({ navigation }) => {
  const activities = [
    { 
      id: '1', 
      title: 'AI Symptom Analysis', 
      description: 'Chest pain & shortness of breath analyzed', 
      time: 'Today, 10:45 AM',
      icon: 'pulse',
      color: '#EF4444'
    },
    { 
      id: '2', 
      title: 'Appointment Booked', 
      description: 'Follow-up with Dr. Sara Malik - Cardiology', 
      time: 'Yesterday, 2:30 PM',
      icon: 'calendar',
      color: '#00D4FF'
    },
    { 
      id: '3', 
      title: 'Medicine Reminder', 
      description: 'Took Amoxicillin 500mg', 
      time: 'Yesterday, 8:00 AM',
      icon: 'pill',
      color: '#10B981'
    },
    { 
      id: '4', 
      title: 'Added Family Member', 
      description: 'Added Ahmed Khan (Son)', 
      time: '2 days ago',
      icon: 'people',
      color: '#F59E0B'
    },
    { 
      id: '5', 
      title: 'Prescription Scanned', 
      description: 'AI analyzed handwritten prescription', 
      time: '5 days ago',
      icon: 'document-text',
      color: '#8B5CF6'
    },
  ];

  return (
    <View style={styles.container}>
      <CustomHeader title="Activity History" navigation={navigation} />

      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.activityCard}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDesc}>{item.description}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  activityCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 17, fontWeight: '600', color: '#1E3A8A' },
  activityDesc: { fontSize: 15, color: '#334155', marginVertical: 6 },
  activityTime: { fontSize: 13, color: '#64748B' },
});

export default ActivityScreen;