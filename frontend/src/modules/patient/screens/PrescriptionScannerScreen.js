import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const PrescriptionScannerScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const analyzePrescription = () => {
    if (!image) {
      Alert.alert("No Image", "Please upload or take a photo of the prescription first.");
      return;
    }

    setAnalyzing(true);

    setTimeout(() => {
      setAnalyzing(false);
      navigation.navigate('AIPrescriptionAnalysisScreen', { image });
    }, 1800);
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Prescription Scanner" navigation={navigation} />

      <View style={styles.content}>
        <Ionicons name="document-text" size={90} color="#00D4FF" style={styles.icon} />

        <Text style={styles.title}>Upload or Scan Prescription</Text>
        <Text style={styles.subtitle}>
          AI will read your handwritten prescription and set reminders
        </Text>

        {image ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.changeButton}
              onPress={() => setImage(null)}
            >
              <Text style={styles.changeText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
              <Ionicons name="camera" size={40} color="#1E3A8A" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
              <Ionicons name="images" size={40} color="#1E3A8A" />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.analyzeButton, !image && styles.disabledButton]} 
          onPress={analyzePrescription}
          disabled={!image || analyzing}
        >
          <Text style={styles.analyzeButtonText}>
            {analyzing ? "Analyzing with AI..." : "Analyze Prescription"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Our AI will extract medicines, dosage, and timing automatically
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { flex: 1, padding: 25, alignItems: 'center' },
  icon: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 40 },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    width: 140,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5.0, elevation: 5,
  },
  optionText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#1E3A8A' },
  imagePreviewContainer: { 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  changeButton: {
    marginTop: 12,
    padding: 10,
  },
  changeText: { color: '#EF4444', fontSize: 16 },
  analyzeButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 18,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { backgroundColor: '#94A3B8' },
  analyzeButtonText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  note: { 
    marginTop: 30, 
    color: '#64748B', 
    textAlign: 'center', 
    fontSize: 14, 
    lineHeight: 22 
  },
});

export default PrescriptionScannerScreen;