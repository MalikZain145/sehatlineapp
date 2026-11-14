import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  SafeAreaView, Alert, Animated 
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { showConfirm } from '../../../components/confirm';

const TokenTransferScreen = ({ navigation }) => {
  const [transferType, setTransferType] = useState('Department'); // 'Department' or 'User'

  const handleTransfer = () => {
    showConfirm({
      title: 'Transfer Token',
      message: 'Are you sure you want to transfer this active token? This action cannot be undone.',
      confirmLabel: 'Confirm Transfer',
      destructive: true,
      icon: 'swap-horizontal-outline',
      onConfirm: () => {
        Alert.alert('Success', 'Token SHL-99281 has been transferred successfully.');
        navigation.goBack();
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000033', '#000022']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#00EAFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOKEN TRANSFER</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* Active Token Preview */}
        <View style={styles.tokenPreview}>
          <Text style={styles.previewLabel}>Active Token</Text>
          <Text style={styles.previewNumber}>A-12</Text>
          <Text style={styles.previewDoc}>Current: Dr. Sarah Ahmed</Text>
        </View>

        {/* Transfer Options */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, transferType === 'Department' && styles.activeTab]} 
            onPress={() => setTransferType('Department')}
          >
            <Text style={[styles.tabText, transferType === 'Department' && styles.activeTabText]}>To Department</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, transferType === 'User' && styles.activeTab]} 
            onPress={() => setTransferType('User')}
          >
            <Text style={[styles.tabText, transferType === 'User' && styles.activeTabText]}>To Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Selection Box */}
        <TouchableOpacity style={styles.selectorBox}>
          <View style={styles.selectorContent}>
            <Ionicons 
              name={transferType === 'Department' ? "business-outline" : "person-add-outline"} 
              size={24} color="#00EAFF" 
            />
            <Text style={styles.selectorText}>
              {transferType === 'Department' ? "Select New Department" : "Enter Recipient CNIC/ID"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#4CAF50" />
          <Text style={styles.noteText}>
            Transferring to another department maintains your priority in the general hospital queue.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.transferBtn} onPress={handleTransfer}>
          <LinearGradient colors={['#FF4B2B', '#FF416C']} style={styles.btnGradient}>
            <Ionicons name="swap-horizontal" size={20} color="#FFF" />
            <Text style={styles.btnText}>INITIATE TRANSFER</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000033' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  content: { flex: 1, padding: 25 },

  tokenPreview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 255, 0.2)',
    marginBottom: 30
  },
  previewLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  previewNumber: { color: '#00EAFF', fontSize: 60, fontWeight: '900', marginVertical: 10 },
  previewDoc: { color: '#FFF', fontSize: 14, opacity: 0.8 },

  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 12, 
    padding: 5,
    marginBottom: 20 
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'rgba(0, 234, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(0, 234, 255, 0.3)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', fontSize: 13 },
  activeTabText: { color: '#00EAFF' },

  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20
  },
  selectorContent: { flexDirection: 'row', alignItems: 'center' },
  selectorText: { color: '#FFF', marginLeft: 15, fontSize: 15 },

  infoNote: { flexDirection: 'row', padding: 15, backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: 12 },
  noteText: { color: '#4CAF50', fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 18 },

  transferBtn: { marginTop: 'auto', borderRadius: 15, overflow: 'hidden', elevation: 10 },
  btnGradient: { height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});

export default TokenTransferScreen;