// CropEditor — lets the user position a crop box over a captured photo.
//
// Why manual: auto-cropping to the camera's guide frame is unreliable because
// the preview is cover-cropped (the sensor is 4:3, the screen is ~9:19), so
// the region the user *saw* isn't the region we can compute from the photo
// alone. Letting them drag/resize removes the guesswork — and a tightly
// cropped card is what makes OCR actually work.
//
// Gestures: drag inside the box to move it, drag the bottom-right handle to
// resize. The box keeps the CNIC aspect ratio.

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions,
  PanResponder, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../theme';

let ImageManipulator = null;
try {
  // eslint-disable-next-line global-require
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  ImageManipulator = null;
}

const { width: SW, height: SH } = Dimensions.get('window');
const CNIC_RATIO = 1.585;
const HANDLE = 34;
const MIN_W = 120;

export default function CropEditor({ photo, side, onDone, onRetake, busy = false }) {
  // The working image — starts as the captured photo, updated when rotated.
  const [current, setCurrent] = useState(photo);
  useEffect(() => { setCurrent(photo); }, [photo]);

  // Area the image is laid out in (letterboxed to fit).
  const stage = useMemo(() => {
    const availW = SW;
    const availH = SH * 0.62;
    if (!current?.width || !current?.height) {
      return { x: 0, y: 0, w: availW, h: availH, scale: 1 };
    }
    const s = Math.min(availW / current.width, availH / current.height);
    const w = current.width * s;
    const h = current.height * s;
    return { x: (availW - w) / 2, y: (availH - h) / 2, w, h, scale: s };
  }, [current]);

  // Crop box in *stage* coordinates (relative to the displayed image).
  const initW = Math.min(stage.w * 0.9, stage.h * 0.9 * CNIC_RATIO);
  const [box, setBox] = useState({
    x: (stage.w - initW) / 2,
    y: (stage.h - initW / CNIC_RATIO) / 2,
    w: initW,
    h: initW / CNIC_RATIO,
  });
  const [cropping, setCropping] = useState(false);
  const boxRef = useRef(box);
  boxRef.current = box;

  // Re-centre the crop box whenever the stage changes (e.g. after a rotate,
  // where the image dimensions swap).
  useEffect(() => {
    const iw = Math.min(stage.w * 0.9, stage.h * 0.9 * CNIC_RATIO);
    setBox({ x: (stage.w - iw) / 2, y: (stage.h - iw / CNIC_RATIO) / 2, w: iw, h: iw / CNIC_RATIO });
  }, [stage.w, stage.h]);

  // Rotate the image 90° clockwise (for sideways captures). The backend also
  // auto-rotates during OCR, but this lets the user straighten it to crop.
  const rotate = async () => {
    if (busy || cropping || !ImageManipulator || !current?.uri) return;
    setCropping(true);
    try {
      const res = await ImageManipulator.manipulateAsync(
        current.uri, [{ rotate: 90 }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrent({ uri: res.uri, width: res.width, height: res.height });
    } catch (e) { /* keep current */ }
    setCropping(false);
  };

  const clamp = (b) => {
    let { x, y, w, h } = b;
    w = Math.max(MIN_W, Math.min(w, stage.w));
    h = w / CNIC_RATIO;
    if (h > stage.h) { h = stage.h; w = h * CNIC_RATIO; }
    x = Math.max(0, Math.min(x, stage.w - w));
    y = Math.max(0, Math.min(y, stage.h - h));
    return { x, y, w, h };
  };

  // Drag to move.
  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { moveResponder.start = { ...boxRef.current }; },
      onPanResponderMove: (_, g) => {
        const s = moveResponder.start;
        setBox(clamp({ ...s, x: s.x + g.dx, y: s.y + g.dy }));
      },
    })
  ).current;

  // Drag the corner handle to resize.
  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { resizeResponder.start = { ...boxRef.current }; },
      onPanResponderMove: (_, g) => {
        const s = resizeResponder.start;
        setBox(clamp({ ...s, w: s.w + g.dx }));
      },
    })
  ).current;

  const applyCrop = async () => {
    if (busy || cropping) return;
    if (!ImageManipulator || !current?.width) {
      onDone(current.uri);          // no manipulator → send as-is
      return;
    }
    setCropping(true);
    try {
      // Stage coords → original photo pixels.
      const k = current.width / stage.w;
      const crop = {
        originX: Math.max(0, Math.round(box.x * k)),
        originY: Math.max(0, Math.round(box.y * k)),
        width: Math.min(current.width, Math.round(box.w * k)),
        height: Math.min(current.height, Math.round(box.h * k)),
      };

      const actions = [{ crop }];
      // Normalise the output to a consistent OCR-friendly size on BOTH iOS and
      // Android: upscale tiny crops, and cap large ones. A ~1500px-wide JPEG is
      // sharp enough for the 13-digit number yet small enough to upload and OCR
      // within the server's time limit (large iOS photos were timing out).
      if (crop.width < 1000) actions.push({ resize: { width: 1400 } });
      else if (crop.width > 1600) actions.push({ resize: { width: 1500 } });

      const result = await ImageManipulator.manipulateAsync(
        current.uri, actions,
        // Re-encoding here also BAKES the EXIF orientation into the pixels, so
        // the backend always receives an upright image (fixes iOS rotation).
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCropping(false);
      onDone(result.uri);
    } catch (e) {
      setCropping(false);
      onDone(current.uri);          // crop failed → send the full photo
    }
  };

  const label = side === 'front' ? 'Front' : 'Back';
  const working = busy || cropping;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => !working && onRetake()} disabled={working}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop {label}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={rotate} disabled={working}>
          <Ionicons name="refresh" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Image + crop box */}
      <View style={[styles.stageWrap, { height: SH * 0.62 }]}>
        <View style={{ position: 'absolute', left: stage.x, top: stage.y, width: stage.w, height: stage.h }}>
          <Image source={{ uri: current.uri }} style={{ width: stage.w, height: stage.h }} resizeMode="contain" />

          {/* Dim everything outside the box */}
          <View style={[styles.dim, { left: 0, top: 0, right: 0, height: box.y }]} pointerEvents="none" />
          <View style={[styles.dim, { left: 0, top: box.y + box.h, right: 0, bottom: 0 }]} pointerEvents="none" />
          <View style={[styles.dim, { left: 0, top: box.y, width: box.x, height: box.h }]} pointerEvents="none" />
          <View style={[styles.dim, { left: box.x + box.w, top: box.y, right: 0, height: box.h }]} pointerEvents="none" />

          {/* The crop box */}
          <View
            style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]}
            {...moveResponder.panHandlers}
          >
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />

            {/* Resize handle (bottom-right) */}
            <View style={styles.handle} {...resizeResponder.panHandlers}>
              <Ionicons name="resize" size={16} color="#FFF" />
            </View>
          </View>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hintWrap}>
        <Ionicons name="move" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.hint}>Drag to move · pull the corner to resize</Text>
      </View>
      <Text style={styles.hintSub}>Fit the box tightly around the card — no background</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.retakeBtn, working && styles.disabled]} onPress={onRetake} disabled={working} activeOpacity={0.85}>
          <Ionicons name="camera-reverse" size={20} color="#FFF" />
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.doneBtn, working && styles.disabled]} onPress={applyCrop} disabled={working} activeOpacity={0.9}>
          {working ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.doneText}>{cropping ? 'Cropping…' : 'Verifying…'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark" size={22} color="#FFF" />
              <Text style={styles.doneText}>Use This</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 28) + 10,
    paddingBottom: 10,
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  stageWrap: { width: SW, justifyContent: 'center' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.62)' },

  box: {
    position: 'absolute',
    borderWidth: 2, borderColor: '#FFF', borderRadius: 6,
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: COLORS.primary },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  handle: {
    position: 'absolute', right: -HANDLE / 2, bottom: -HANDLE / 2,
    width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },

  hintWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  hintSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', marginTop: 6 },

  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 30,
  },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
  },
  retakeText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  doneBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.primary,
  },
  doneText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
