import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const DietPrecautionScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <CustomHeader title="Diet & Precautions" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="leaf" size={80} color="#10B981" style={styles.icon} />

        <Text style={styles.title}>Diet & Precaution Guidelines</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Diet</Text>
          <Text style={styles.tip}>• Eat fresh fruits and vegetables daily</Text>
          <Text style={styles.tip}>• Take high-fiber foods (oats, beans, whole grains)</Text>
          <Text style={styles.tip}>• Drink 8-10 glasses of water</Text>
          <Text style={styles.tip}>• Include lean protein (fish, chicken, eggs)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Things to Avoid</Text>
          <Text style={styles.warningTip}>• Oily and fried food</Text>
          <Text style={styles.warningTip}>• Sugary drinks and desserts</Text>
          <Text style={styles.warningTip}>• Excessive salt intake</Text>
          <Text style={styles.warningTip}>• Smoking and alcohol</Text>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>I Understand</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { padding: 25, alignItems: 'center' },
  icon: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 30, textAlign: 'center' },
  section: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E3A8A', marginBottom: 15 },
  tip: { fontSize: 16, color: '#10B981', marginVertical: 6 },
  warningTip: { fontSize: 16, color: '#EF4444', marginVertical: 6 },
  doneButton: {
    backgroundColor: '#00D4FF',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default DietPrecautionScreen;