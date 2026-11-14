// NotificationsScreen — the patient's bell menu, backed by the real API.
//
// Opening this screen also delivers the health tip due for the current slot
// (morning or evening), so it lands here without any push infrastructure.

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Platform, Alert, Modal, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList } from '../../../components/ui/Skeleton';
import BottomSheet from '../../../components/ui/BottomSheet';
import useMinLoading from '../../../hooks/useMinLoading';
import { showConfirm } from '../../../components/confirm';
import notificationService from '../services/notificationService';
import useBottomInset from '../../../hooks/useBottomInset';

// Each notification type gets its own accent, so the list is scannable.
import { useTheme } from "../../../context/ThemeContext";
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';
import { COLORS } from "../../../theme"; // static brand palette for module-scope maps; components shadow it via useTheme()
const TYPE_STYLE = {
  health_tip: {
    color: COLORS.success,
    bg: '#E7F8F1',
    fallbackIcon: 'bulb'
  },
  token: {
    color: COLORS.primary,
    bg: COLORS.mintLight,
    fallbackIcon: 'ticket'
  },
  appointment: {
    color: '#8B5CF6',
    bg: '#F1EBFE',
    fallbackIcon: 'calendar'
  },
  order: {
    color: COLORS.warning,
    bg: '#FEF3E2',
    fallbackIcon: 'medkit'
  },
  report: {
    color: COLORS.danger,
    bg: '#FDECEC',
    fallbackIcon: 'document-text'
  },
  system: {
    color: COLORS.textLight,
    bg: '#F1F5F9',
    fallbackIcon: 'notifications'
  }
};
function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
export default function NotificationsScreen({
  navigation
}) {
  const {
    colors: COLORS,
    isDark
  } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const bottomInset = useBottomInset();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    try {
      const res = await notificationService.list();
      setItems(res?.notifications || []);
      setUnread(res?.unread ?? 0);
    } catch (e) {
      // Offline: keep whatever is already on screen.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
    const focus = navigation.addListener?.('focus', load);
    return () => focus && focus();
  }, [load, navigation]);
  const openItem = async item => {
    if (!item.read) {
      // Optimistic: flip it locally, then persist.
      setItems(prev => prev.map(n => n._id === item._id ? {
        ...n,
        read: true
      } : n));
      setUnread(u => Math.max(0, u - 1));
      notificationService.markRead(item._id).catch(() => {});
    }
    // Open the full notification in a scrollable modal so it can be read completely.
    setSelected({
      ...item,
      read: true
    });
  };
  const fullDateTime = iso => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })} • ${d.toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } catch (e) {
      return '';
    }
  };
  const readAll = async () => {
    if (!unread) return;
    setItems(prev => prev.map(n => ({
      ...n,
      read: true
    })));
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch (e) {
      load();
    }
  };
  const removeItem = item => {
    showConfirm({
      title: 'Delete Notification',
      message: 'Remove this from your list?',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        setItems(prev => prev.filter(n => n._id !== item._id));
        if (!item.read) setUnread(u => Math.max(0, u - 1));
        try {
          await notificationService.remove(item._id);
        } catch (e) {
          load();
        }
      }
    });
  };
  const renderItem = ({
    item
  }) => {
    const style = TYPE_STYLE[item.type] || TYPE_STYLE.system;
    return <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} activeOpacity={0.85} onPress={() => openItem(item)} onLongPress={() => removeItem(item)}>
        <View style={[styles.iconBox, {
        backgroundColor: isDark ? style.color + '26' : style.bg
      }]}>
          <Ionicons name={item.icon || style.fallbackIcon} size={21} color={style.color} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          {!!item.body && <Text style={styles.text} numberOfLines={2}>{item.body}</Text>}
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>;
  };
  if (loading) {
    return <View style={styles.container}>
        <SkeletonList count={7} topInset />
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{
        top: 12,
        bottom: 12,
        left: 12,
        right: 12
      }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && <Text style={styles.headerSub}>{unread} unread</Text>}
        </View>

        {unread > 0 ? <TouchableOpacity onPress={readAll} hitSlop={{
        top: 12,
        bottom: 12,
        left: 12,
        right: 12
      }}>
            <Ionicons name="checkmark-done" size={26} color={COLORS.primary} />
          </TouchableOpacity> : <View style={{
        width: 40
      }} />}
      </View>

      <FlatList data={items} keyExtractor={n => n._id} renderItem={renderItem} contentContainerStyle={[items.length ? styles.list : styles.listEmpty, items.length && {
      paddingBottom: bottomInset
    }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      load();
    }} colors={[COLORS.primary]} tintColor={COLORS.primary} />} ListEmptyComponent={<View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={38} color={COLORS.tealLight} />
            </View>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyText}>
              Health tips arrive each morning and evening. Queue and appointment updates will appear here too.
            </Text>
          </View>} ListFooterComponent={items.length ? <Text style={styles.hint}>Long-press a notification to delete it</Text> : null} />

      {/* ─── DETAIL MODAL (read completely, scrollable) ────────────────── */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} overlayStyle={styles.detailOverlay} sheetStyle={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHeaderTitle}>Notification</Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {selected && <ScrollView style={styles.detailBody} contentContainerStyle={{
            paddingBottom: 20
          }} showsVerticalScrollIndicator={false}>
                <View style={[styles.detailIcon, {
              backgroundColor: isDark ? (TYPE_STYLE[selected.type] || TYPE_STYLE.system).color + '26' : (TYPE_STYLE[selected.type] || TYPE_STYLE.system).bg
            }]}>
                  <Ionicons name={selected.icon || (TYPE_STYLE[selected.type] || TYPE_STYLE.system).fallbackIcon} size={30} color={(TYPE_STYLE[selected.type] || TYPE_STYLE.system).color} />
                </View>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                <Text style={styles.detailTime}>{fullDateTime(selected.createdAt)}</Text>
                <View style={styles.detailDivider} />
                <Text style={styles.detailMessage}>{selected.body || 'No further details.'}</Text>
                {!!selected.screen && <TouchableOpacity style={styles.detailBtn} activeOpacity={0.85} onPress={() => {
              const s = selected.screen;
              const refId = selected.refId;
              setSelected(null);
              // Pass the entity id (e.g. a prescription) so the target screen
              // opens that exact record.
              navigation.navigate(s, refId ? { prescriptionId: refId, refId } : undefined);
            }}>
                    <Text style={styles.detailBtnText}>{selected.screen === 'PrescriptionDetailScreen' ? 'View Prescription' : 'Open'}</Text>
                  </TouchableOpacity>}
              </ScrollView>}
      </BottomSheet>
    </View>;
}
const makeStyles = (COLORS, isDark = false) => StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 1
  },
  readAll: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
    width: 56,
    textAlign: 'right'
  },
  list: {
    padding: 16
  },
  listEmpty: {
    flexGrow: 1
  },
  card: {
    flexDirection: 'row',
    gap: 13,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10
  },
  cardUnread: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    // In dark mode a light mint tint would hide the light text, so use a
    // primary-tinted surface that reads in both themes.
    backgroundColor: isDark ? COLORS.primary + '26' : COLORS.mintLightest
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  body: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  titleUnread: {
    fontWeight: '800'
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  text: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 3
  },
  time: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7
  },
  hint: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6
  },
  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '80%'
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  detailBody: {
    flexGrow: 0
  },
  detailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center'
  },
  detailTime: {
    fontSize: 12.5,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border || '#E5E7EB',
    marginVertical: 16
  },
  detailMessage: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textSecondary || '#4B5563'
  },
  detailBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  detailBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});