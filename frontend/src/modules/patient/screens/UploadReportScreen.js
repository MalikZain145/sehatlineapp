import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';

const UploadReportScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reportName, setReportName] = useState('');

  const pickReport = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadReport = () => {
    if (!selectedImage || !reportName) {
      Alert.alert("Incomplete", "Please select a report and enter a title");
      return;
    }

    setUploading(true);

    setTimeout(() => {
      setUploading(false);
      Alert.alert(
        "Upload Successful",
        "Your report has been uploaded and is now available in Reports section.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }, 1600);
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Upload Report" navigation={navigation} />

      <View style={styles.content}>
        <Ionicons name="cloud-upload" size={90} color="#00D4FF" style={styles.icon} />

        <Text style={styles.title}>Upload Medical Report</Text>
        <Text style={styles.subtitle}>Lab reports, scans, or prescriptions</Text>

        <TouchableOpacity style={styles.uploadArea} onPress={pickReport}>
          {selectedImage ? (
            <Text style={styles.uploadedText}>✓ Report Selected</Text>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={50} color="#64748B" />
              <Text style={styles.uploadText}>Tap to select report image</Text>
            </>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Report Title (e.g. Blood Test March 2026)"
          value={reportName}
          onChangeText={setReportName}
        />

        <TouchableOpacity 
          style={[styles.uploadButton, (!selectedImage || !reportName) && styles.disabledButton]}
          onPress={uploadReport}
          disabled={!selectedImage || !reportName || uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? "Uploading..." : "Upload Report"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 25, alignItems: 'center' },
  icon: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 40, textAlign: 'center' },
  uploadArea: {
    width: '100%',
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  uploadedText: { fontSize: 18, color: '#10B981', fontWeight: 'bold' },
  uploadText: { marginTop: 15, fontSize: 16, color: '#64748B' },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadButton: {
    backgroundColor: '#00D4FF',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#94A3B8' },
  uploadButtonText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
});

export default UploadReportScreen;