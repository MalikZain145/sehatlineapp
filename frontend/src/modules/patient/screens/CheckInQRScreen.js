import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const CheckInQRScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    setScanned(true);
    // Logic for your defense: "QR code verified for Token #..."
    alert(`QR Code Scanned! Data: ${data}\nChecking in for your appointment...`);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={30} color="#00EAFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HOSPITAL CHECK-IN</Text>
        <View style={{ width: 30 }} /> 
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Scan the QR Code at the hospital desk to confirm your arrival.</Text>
        
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          {/* Scanner Overlay Frame */}
          <View style={styles.overlay}>
             <View style={styles.unfocusedContainer}></View>
             <View style={styles.focusedContainer}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
             </View>
             <View style={styles.unfocusedContainer}></View>
          </View>
        </View>

        {scanned && (
          <TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000033', paddingBottom: BOTTOM_SPACE },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, alignItems: 'center', padding: 20 },
  instruction: { color: '#00EAFF', fontSize: 16, textAlign: 'center', marginBottom: 30 },
  cameraContainer: { width: 300, height: 300, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#00EAFF' },
  camera: { flex: 1 },
  button: { backgroundColor: '#00EAFF', padding: 15, borderRadius: 10, marginTop: 30 },
  buttonText: { color: '#000033', fontWeight: 'bold' },
  message: { color: '#fff', textAlign: 'center', marginBottom: 20 },
  // Frame Styling
  focusedContainer: { width: 200, height: 200, position: 'absolute', top: 50, left: 50 },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 5, borderLeftWidth: 5, borderColor: '#00EAFF' },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 5, borderRightWidth: 5, borderColor: '#00EAFF' },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: '#00EAFF' },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 5, borderRightWidth: 5, borderColor: '#00EAFF' },
});

export default CheckInQRScreen;