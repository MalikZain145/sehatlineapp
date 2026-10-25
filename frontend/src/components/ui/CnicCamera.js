// CnicCamera — full-screen in-app camera for capturing a CNIC.
//
// This screen only CAPTURES. Cropping happens next, in CropEditor, where the
// user positions the box themselves. We deliberately do not auto-crop to the
// guide frame: the camera preview is cover-cropped (4:3 sensor on a ~9:19
// screen), so the region the user saw inside the frame cannot be derived
// reliably from the photo alone.
//
// Gallery uploads are not supported — the card must be captured live so the
// OCR check on the backend is meaningful.

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme';

// expo-camera is loaded defensively so a missing/old install never crashes the app.
let CameraView = null;
let useCameraPermissions = null;
try {
  // eslint-disable-next-line global-require
  const cam = require('expo-camera');
  CameraView = cam.CameraView || cam.Camera;
  useCameraPermissions = cam.useCameraPermissions;
} catch (e) {
  CameraView = null;
}

// Loaded defensively too — used to NORMALISE the freshly captured photo.
let ImageManipulator = null;
try {
  // eslint-disable-next-line global-require
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  ImageManipulator = null;
}

const { width, height } = Dimensions.get('window');
const CNIC_RATIO = 1.585;                      // real CNIC aspect ratio
const FRAME_W = width * 0.86;
const FRAME_H = FRAME_W / CNIC_RATIO;

export default function CnicCamera({ side = 'front', onCapture, onCancel }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, null];
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Manual capture only — the user frames the card inside the box and taps the
  // shutter. (Auto-capture was removed: it fired before the card was lined up,
  // and behaved differently on iOS vs Android.)
  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        // iOS must PROCESS the frame so the image is written upright; skipping
        // it leaves an EXIF-rotated file. Android is already upright.
        skipProcessing: Platform.OS === 'android',
        // We bake orientation into the pixels below, so raw EXIF is not needed.
        exif: false,
      });

      // NORMALISE before cropping. On iOS, takePictureAsync's reported
      // width/height (and EXIF orientation) are unreliable, so CropEditor's
      // pixel math could crop the WRONG region — the backend OCR then reads
      // background instead of the card and rejects it ("Not a CNIC"). Re-encoding
      // once here bakes orientation into the pixels and returns dimensions that
      // actually match the image, so the crop box maps correctly on both
      // platforms. We cap the long edge to keep detail high but uploads small.
      let normalised = photo;
      if (ImageManipulator && photo?.uri) {
        try {
          const actions = [];
          const longEdge = Math.max(photo.width || 0, photo.height || 0);
          if (longEdge > 2200) {
            actions.push(
              (photo.width || 0) >= (photo.height || 0)
                ? { resize: { width: 2200 } }
                : { resize: { height: 2200 } }
            );
          }
          const res = await ImageManipulator.manipulateAsync(
            photo.uri, actions,
            { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
          );
          normalised = { uri: res.uri, width: res.width, height: res.height };
        } catch (_) {
          normalised = photo;   // manipulation failed → fall back to raw capture
        }
      }

      setCapturing(false);
      onCapture(normalised);  // { uri, width, height } → crop editor
    } catch (e) {
      setCapturing(false);
      onCapture(null, e);
    }
  };

  // --- Camera unavailable / permission states ---
  if (!CameraView) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="camera-outline" size={54} color="#94A3B8" />
        <Text style={styles.fallbackTitle}>Camera unavailable</Text>
        <Text style={styles.fallbackText}>Please reinstall the app or update Expo Go.</Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={onCancel}>
          <Text style={styles.fallbackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.fallback}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="lock-closed-outline" size={54} color="#94A3B8" />
        <Text style={styles.fallbackTitle}>Camera permission needed</Text>
        <Text style={styles.fallbackText}>
          SehatLine needs the camera to verify your CNIC. Photos are used only for verification.
        </Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={requestPermission}>
          <Text style={styles.fallbackBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 14 }}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const label = side === 'front' ? 'Front side of CNIC' : 'Back side of CNIC';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setReady(true)}
      />

      {/* Darkened surround with a clear rectangular window in the middle */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.dim} />
        <View style={styles.middleRow}>
          <View style={styles.dimSide} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.dimSide} />
        </View>
        <View style={styles.dim} />
      </View>

      {/* Header */}
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Hint */}
      <View style={styles.hintWrap} pointerEvents="none">
        <Text style={styles.hint}>Line the card up inside the frame</Text>
        <Text style={styles.hintSub}>
          Get close, keep it flat, avoid glare — you can crop &amp; rotate next
        </Text>
      </View>

      {/* Shutter */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.shutter, (!ready || capturing) && styles.shutterDisabled]}
          onPress={capture}
          disabled={!ready || capturing}
          activeOpacity={0.85}
        >
          {capturing
            ? <ActivityIndicator color={COLORS.secondary} />
            : <View style={styles.shutterInner} />}
        </TouchableOpacity>
        <Text style={styles.footerText}>{capturing ? 'Capturing…' : 'Tap the shutter to capture'}</Text>
      </View>
    </View>
  );
}

const DIM = 'rgba(0,0,0,0.6)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  overlay: { ...StyleSheet.absoluteFillObject },
  dim: { flex: 1, backgroundColor: DIM },
  middleRow: { flexDirection: 'row', height: FRAME_H },
  dimSide: { flex: 1, backgroundColor: DIM },
  frame: {
    width: FRAME_W, height: FRAME_H,
    borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },

  corner: { position: 'absolute', width: 26, height: 26, borderColor: COLORS.primary },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 28) + 10,
    zIndex: 2,
  },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  hintWrap: {
    position: 'absolute', left: 0, right: 0,
    top: (height - FRAME_H) / 2 + FRAME_H + 24,
    alignItems: 'center', paddingHorizontal: 24,
  },
  hint: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  hintSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, marginTop: 4, textAlign: 'center' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 44 : 30 },
  shutter: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFF', borderWidth: 5, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
  footerText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 10, fontWeight: '600' },

  fallback: { flex: 1, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center', padding: 30 },
  fallbackTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 16 },
  fallbackText: { color: '#94A3B8', fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  fallbackBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 26, paddingVertical: 13, borderRadius: 14, marginTop: 22 },
  fallbackBtnText: { color: '#FFF', fontWeight: '800' },
  cancelLink: { color: '#94A3B8', fontWeight: '600' },
});
