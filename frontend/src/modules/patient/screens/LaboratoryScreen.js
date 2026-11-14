// LaboratoryScreen — patient-facing lab view (real backend).
// Shows the lab queue and the patient's token if in the lab stage.

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
const RED = '#EF4444';
export default function LaboratoryScreen({
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
      const lb = summary?.queues?.find(q => q.department === 'laboratory');
      if (lb) setQueue({
        nowServing: lb.nowServing,
        waiting: lb.waiting
      });
      setMyToken(active?.token && active.token.department === 'laboratory' ? {
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
      <ScreenHeader title="Laboratory" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      load();
    }} colors={[RED]} />}>

        {myToken && <LinearGradient colors={[RED, '#B91C1C']} style={styles.myCard}>
            <Text style={styles.myLabel}>YOUR TOKEN AT LABORATORY</Text>
            <Text style={styles.myToken}>{myToken.tokenNumber}</Text>
            <Text style={styles.myStage}>{myToken.stage}</Text>
          </LinearGradient>}

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Ionicons name="person" size={22} color={RED} />
            <Text style={styles.statusNum}>{queue.nowServing}</Text>
            <Text style={styles.statusLabel}>Now Serving</Text>
          </View>
          <View style={styles.statusCard}>
            <Ionicons name="people" size={22} color={RED} />
            <Text style={styles.statusNum}>{queue.waiting}</Text>
            <Text style={styles.statusLabel}>Waiting</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Laboratory Services</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ReportsListScreen')}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#0BAA9D18'
        }]}>
            <Ionicons name="document-text" size={24} color="#0BAA9D" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>My Reports</Text>
            <Text style={styles.actionSub}>View your lab test reports</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('UploadReportScreen')}>
          <View style={[styles.actionIcon, {
          backgroundColor: '#10B98118'
        }]}>
            <Ionicons name="cloud-upload" size={24} color="#10B981" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Upload Report</Text>
            <Text style={styles.actionSub}>Add an external lab report</Text>
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