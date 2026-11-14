// HealthTipSlider — an auto-advancing horizontal slider of health tips.
// Swipeable, with pagination dots and gradient cards. Pauses briefly after a
// manual swipe, then resumes auto-advance.

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const CARD_W = width - 32;

const TIPS = [
  { icon: 'water', title: 'Stay Hydrated', text: 'Drink 8–10 glasses of water daily to keep your body healthy.', colors: ['#0BAA9D', '#089082'] },
  { icon: 'walk', title: 'Move More', text: '30 minutes of walking a day keeps your heart strong.', colors: ['#10B981', '#059669'] },
  { icon: 'nutrition', title: 'Eat Fresh', text: 'Add more fruits and vegetables for essential vitamins.', colors: ['#F59E0B', '#D97706'] },
  { icon: 'bed', title: 'Rest Well', text: 'Aim for 7–8 hours of quality sleep every night.', colors: ['#8B5CF6', '#6D28D9'] },
  { icon: 'heart', title: 'Check Your Heart', text: 'Get your blood pressure checked regularly.', colors: ['#EF4444', '#B91C1C'] },
];

export default function HealthTipSlider() {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  // Auto-advance.
  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      const next = (index + 1) % TIPS.length;
      scrollRef.current?.scrollTo({ x: next * CARD_W, animated: true });
      setIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [index]);

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setIndex(i);
    pausedRef.current = true;
    setTimeout(() => { pausedRef.current = false; }, 6000);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
        snapToInterval={CARD_W}
      >
        {TIPS.map((tip, i) => (
          <LinearGradient key={i} colors={tip.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name={tip.icon} size={26} color="#FFF" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{tip.title}</Text>
              <Text style={styles.text}>{tip.text}</Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.dots}>
        {TIPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: {
    width: CARD_W, borderRadius: 20, padding: 20, marginHorizontal: 0,
    flexDirection: 'row', alignItems: 'center', minHeight: 110,
  },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textWrap: { flex: 1 },
  title: { color: '#FFF', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  text: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD5E1' },
  dotActive: { width: 20, backgroundColor: '#0BAA9D' },
});
