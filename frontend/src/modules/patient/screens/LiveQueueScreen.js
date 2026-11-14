// LiveQueueScreen — real-time queue for all departments, backend-driven.
// Shows now-serving + waiting count per department, plus the patient's own
// token position if they have one. Updates live via socket.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import tokenService from '../services/tokenService';
import { onQueueUpdate, connectSocket } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
const {
  width
} = Dimensions.get('window');
const DEPTS = [{
  key: 'chronic_opd',
  label: 'Chronic OPD',
  icon: 'medical',
  color: '#0BAA9D'
}, {
  key: 'pharmacy',
  label: 'Pharmacy',
  icon: 'medkit',
  color: '#8B5CF6'
}, {
  key: 'laboratory',
  label: 'Laboratory',
  icon: 'flask',
  color: '#EF4444'
}];
export default function LiveQueueScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queues, setQueues] = useState([]);
  const [myToken, setMyToken] = useState(null);
  const load = useCallback(async () => {
    try {
      const [summaryRes, activeRes] = await Promise.all([tokenService.getQueuesSummary(), tokenService.getActive()]);
      if (summaryRes?.queues) setQueues(summaryRes.queues);
      if (activeRes?.token) {
        setMyToken({
          tokenNumber: activeRes.token.tokenNumber,
          department: activeRes.token.department,
          stage: activeRes.stage,
          ahead: activeRes.ahead ?? 0,
          isNext: activeRes.isNext
        });
      } else {
        setMyToken(null);
      }
    } catch (e) {
      // keep last data
    } finally {
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
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };
  const deptMeta = key => DEPTS.find(d => d.key === key) || DEPTS[0];
  if (loading) {
    return <View style={styles.container}><SkeletonList count={6} topInset /></View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} />
      <ScreenHeader title="Live Queue" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
        {/* My token highlight */}
        {myToken && <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('TokenJourneyScreen')}>
            <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.myCard}>
              <View style={styles.myCardTop}>
                <Text style={styles.myCardLabel}>YOUR TOKEN</Text>
                <View style={styles.myCardBadge}>
                  <Text style={styles.myCardBadgeText}>{myToken.stage}</Text>
                </View>
              </View>
              <Text style={styles.myCardToken}>{myToken.tokenNumber}</Text>
              <Text style={styles.myCardInfo}>
                {myToken.isNext ? 'You are next!' : `${myToken.ahead} patient(s) ahead of you`}
              </Text>
              <View style={styles.myCardFooter}>
                <Text style={styles.myCardFooterText}>Tap to view journey</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>}

        <Text style={styles.sectionTitle}>Department Queues</Text>

        {queues.map(q => {
        const meta = deptMeta(q.department);
        const isMine = myToken && myToken.department === q.department;
        return <View key={q.department} style={[styles.deptCard, isMine && {
          borderColor: meta.color,
          borderWidth: 2
        }]}>
              <View style={[styles.deptIcon, {
            backgroundColor: meta.color + '18'
          }]}>
                <Ionicons name={meta.icon} size={24} color={meta.color} />
              </View>
              <View style={styles.deptInfo}>
                <Text style={styles.deptLabel}>{meta.label}</Text>
                <Text style={styles.deptServing}>
                  Now serving: <Text style={{
                color: meta.color,
                fontWeight: '800'
              }}>{q.nowServing}</Text>
                </Text>
              </View>
              <View style={styles.deptWaiting}>
                <Text style={[styles.deptWaitingNum, {
              color: meta.color
            }]}>{q.waiting}</Text>
                <Text style={styles.deptWaitingLabel}>waiting</Text>
              </View>
            </View>;
      })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Queue updates live as patients are served. Priority patients (elderly, critical) are served first.</Text>
        </View>
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
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399'
  },
  scroll: {
    padding: 16
  },
  myCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20
  },
  myCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  myCardLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  myCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  myCardBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  myCardToken: {
    color: '#FFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 4
  },
  myCardInfo: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500'
  },
  myCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10
  },
  myCardFooterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12
  },
  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#089082',
        shadowOffset: {
          width: 0,
          height: 3
        },
        shadowOpacity: 0.08,
        shadowRadius: 8
      },
      android: {
        elevation: 2
      }
    })
  },
  deptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  deptInfo: {
    flex: 1
  },
  deptLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  deptServing: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  deptWaiting: {
    alignItems: 'center'
  },
  deptWaitingNum: {
    fontSize: 24,
    fontWeight: '900'
  },
  deptWaitingLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18
  }
});