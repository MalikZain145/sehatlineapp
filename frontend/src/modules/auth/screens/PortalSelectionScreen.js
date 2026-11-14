import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_VERSION } from '../../../constants/version';
import { topPad } from '../../../utils/safeArea';

const PortalSelectionScreen = ({ navigation }) => {
  const portals = [
    { 
      id: 'PATIENT', 
      title: 'Citizen Portal', 
      desc: 'Book appointments & view reports', 
      icon: 'people', 
      color: ['#00EAFF', '#089082'] 
    },
    { 
      id: 'DOCTOR', 
      title: 'Doctor Portal', 
      desc: 'Manage queue & patient consultations', 
      icon: 'medkit', 
      color: ['#7209B7', '#3A0CA3'] 
    },
    { 
      id: 'ADMIN', 
      title: 'Admin Panel', 
      desc: 'Hospital management & analytics', 
      icon: 'shield-checkmark', 
      color: ['#1B4332', '#081C15'] 
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Portal</Text>
        <Text style={styles.headerSub}>Please identify yourself to continue</Text>
      </View>

      <View style={styles.grid}>
        {portals.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login', { role: item.id })}
          >
            <LinearGradient colors={item.color} style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={30} color="#FFF" />
              </View>
              <View style={styles.textDetails}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.footerText}>SehatLine Digital Health v{APP_VERSION}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020914', padding: 20 },
  header: { marginTop: topPad(60), marginBottom: 40 },
  headerTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  headerSub: { color: '#888', fontSize: 16, marginTop: 5 },
  grid: { gap: 20 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 25, 
    borderRadius: 25, 
    elevation: 10 
  },
  iconBox: { 
    width: 60, 
    height: 60, 
    borderRadius: 15, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  textDetails: { flex: 1, marginLeft: 20 },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  footerText: { textAlign: 'center', color: '#333', marginTop: 'auto', marginBottom: 20 }
});

export default PortalSelectionScreen;