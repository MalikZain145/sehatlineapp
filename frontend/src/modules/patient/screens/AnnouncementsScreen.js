import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const AnnouncementsScreen = ({ navigation }) => {
  const news = [
    {
      id: 1,
      title: 'Free Health Camp 2026',
      date: '20th April, 2026',
      desc: 'Join us for a free cardiology and diabetes screening camp at the main OPD block.',
      icon: 'medical',
      color: '#00EAFF'
    },
    {
      id: 2,
      title: 'New Neurology Wing',
      date: '15th March, 2026',
      desc: 'We have inaugurated a state-of-the-art Neurology department with advanced MRI facilities.',
      icon: 'business',
      color: '#8B5CF6'
    },
    {
      id: 3,
      title: 'COVID-19 Booster Drive',
      date: 'Ongoing',
      desc: 'Get your booster shots at the vaccination center from 9 AM to 3 PM daily.',
      icon: 'shield-checkmark',
      color: '#10B981'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#00EAFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {news.map((item) => (
          <View key={item.id} style={styles.card}>
            <LinearGradient colors={['#001D3D', '#000814']} style={styles.cardGradient}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#011027', paddingBottom: BOTTOM_SPACE },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 15 },
  card: { marginBottom: 15, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 234, 255, 0.1)' },
  cardGradient: { padding: 20, flexDirection: 'row', gap: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  date: { color: '#00EAFF', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  title: { color: '#FFF', fontSize: 17, fontWeight: 'bold', marginBottom: 5 },
  desc: { color: '#888', fontSize: 13, lineHeight: 18 }
});

export default AnnouncementsScreen;