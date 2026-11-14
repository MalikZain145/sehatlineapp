// PharmacyScreen — patient-facing pharmacy view (real backend).
// Shows the pharmacy queue status and the patient's token if they're in the
// pharmacy stage. Also links to medicine ordering.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import tokenService from '../services/tokenService';
import { onQueueUpdate, connectSocket } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
const PURPLE = '#8B5CF6';
export default function PharmacyScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState({
    nowServing: '—',
    waiting: 0
  });
  const [myToken, setMyToken] = useState(null);
  const load = useCallback(async () => {
    try {
      const [summary, active] = await Promise.all([tokenService.getQueuesSummary(), tokenService.getActive()]);
      const ph = summary?.queues?.find(q => q.department === 'pharmacy');
      if (ph) setQueue({
        nowServing: ph.nowServing,
        waiting: ph.waiting
      });
      setMyToken(active?.token && active.token.department === 'pharmacy' ? {
        tokenNumber: active.token.tokenNumber,
        stage: active.stage
      } : null);
    } catch (e) {/* keep */} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    connectSocket();
    load();
    const unsub = onQueueUpdate(() => load());
    const poll = setInterval(load, 15000);
    return () => {
      unsub && unsub();
      clearInterval(poll);
    };
  }, [load]);
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} />
      <ScreenHeader title="Pharmacy" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      load();
    }} colors={[PURPLE]} />}>

        {myToken && <LinearGradient colors={[PURPLE, '#6D28D9']} style={styles.myCard}>
            <Text style={styles.myLabel}>YOUR TOKEN AT PHARMACY</Text>
            <Text style={styles.myToken}>{myToken.tokenNumber}</Text>
            <Text style={styles.myStage}>{myToken.stage}</Text>
          </LinearGradient>}

        {/* Queue status */}
        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Ionicons name="person" size={22} color={PURPLE} />
            <Text style={styles.statusNum}>{queue.nowServing}</Text>
            <Text style={styles.statusLabel}>Now Serving</Text>
          </View>
          <View style={styles.statusCard}>
            <Ionicons name="people" size={22} color={PURPLE} />
            <Text style={styles.statusNum}>{queue.waiting}</Text>
            <Text style={styles.statusLabel}>Waiting</Text>
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Pharmacy Services</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MedicineListScreen')}>
          <View style={[styles.actionIcon, {
          backgroundColor: PURPLE + '18'
        }]}>
            <Ionicons name="medkit" size={24} color={PURPLE} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Order Medicines</Text>
            <Text style={styles.actionSub}>Browse and order from the pharmacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MedsReminderConfig')}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#F59E0B18'
        }]}>
            <Ionicons name="alarm" size={24} color="#F59E0B" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Medicine Reminders</Text>
            <Text style={styles.actionSub}>Set reminders for your doses</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <View style={{
        height: bottomInset
      }} />
      </ScrollView>
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background
  },
  scroll: {
    padding: 16
  },
  myCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center'
  },
  myLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  myToken: {
    color: '#FFF',
    fontSize: 44,
    fontWeight: '900',
    marginVertical: 4
  },
  myStage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600'
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3
        },
        shadowOpacity: 0.06,
        shadowRadius: 8
      },
      android: {
        elevation: 2
      }
    })
  },
  statusNum: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginVertical: 4
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.05,
        shadowRadius: 6
      },
      android: {
        elevation: 1
      }
    })
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  actionInfo: {
    flex: 1
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  actionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  }
});