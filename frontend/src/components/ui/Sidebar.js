import { useTheme } from "../../context/ThemeContext";
// Sidebar — animated drawer that slides in from the LEFT with a fade, and
// fades out when closing. Glassmorphism panel with the app's brand gradient
// header. Fully controlled via `visible` + `onClose`.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, ScrollView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigationState } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { STATUS_BAR_HEIGHT } from '../../utils/safeArea';
const {
  width,
  height
} = Dimensions.get('window');
const PANEL_W = Math.min(width * 0.78, 320);
const MENU = [{
  key: 'HomeScreen',
  label: 'Home',
  icon: 'home'
}, {
  key: 'ProfileScreen',
  label: 'My Profile',
  icon: 'person'
}, {
  key: 'TokenJourneyScreen',
  label: 'My Token',
  icon: 'ticket'
}, {
  key: 'AppointmentListScreen',
  label: 'Appointments',
  icon: 'calendar'
}, {
  key: 'ReportsListScreen',
  label: 'My Reports',
  icon: 'document-text'
}, {
  key: 'SettingsScreen',
  label: 'Settings',
  icon: 'settings'
}, {
  key: 'HelpSupportScreen',
  label: 'Help & Support',
  icon: 'help-circle'
}];
export default function Sidebar({
  visible,
  onClose,
  navigation,
  user,
  onLogout
}) {
  const {
    colors: COLORS,
    isDark
  } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const currentRoute = useNavigationState(s => s?.routes?.[s.index]?.name);
  const slide = useRef(new Animated.Value(-PANEL_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([Animated.timing(slide, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }), Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })]).start();
    } else {
      Animated.parallel([Animated.timing(slide, {
        toValue: -PANEL_W,
        duration: 260,
        useNativeDriver: true
      }), Animated.timing(fade, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true
      })]).start(() => setMounted(false));
    }
  }, [visible, slide, fade]);
  if (!mounted) return null;
  const go = screen => {
    onClose();
    if (screen !== 'HomeScreen') {
      setTimeout(() => navigation.navigate(screen), 220);
    }
  };
  const firstName = (user?.name || 'Patient').trim().split(/\s+/)[0];
  return <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, {
      opacity: fade
    }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, {
      transform: [{
        translateX: slide
      }],
      opacity: fade
    }]}>
        <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
          <View style={styles.avatarWrap}>
            {user?.profilePic ? <Image source={{
            uri: user.profilePic
          }} style={styles.avatar} /> : <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{user?.name || 'Patient'}</Text>
            {user?.isVerified && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginLeft: 5 }} />}
          </View>
          <Text style={styles.email} numberOfLines={1}>{user?.email || ''}</Text>
        </LinearGradient>

        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          {MENU.map(m => {
          const active = currentRoute === m.key;
          return <TouchableOpacity key={m.key} style={[styles.item, active && styles.itemActive]} onPress={() => go(m.key)} activeOpacity={0.7}>
              <View style={styles.itemIcon}>
                <Ionicons name={`${m.icon}-outline`} size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{m.label}</Text>
            </TouchableOpacity>;
        })}

        </ScrollView>

        {/* Logout — bordered red pill, matching admin & pharmacy */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => {
          onClose();
          setTimeout(() => onLogout && onLogout(), 220);
        }} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={{ color: COLORS.primary }}>Sehat</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1E293B' }}>Line</Text>
          </Text>
          <Text style={styles.footerSub}>CDA Hospital, Islamabad</Text>
        </View>
      </Animated.View>
    </View>;
}
const makeStyles = (COLORS, isDark = false) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,4,94,0.45)'
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_W,
    backgroundColor: COLORS.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 4,
          height: 0
        },
        shadowOpacity: 0.2,
        shadowRadius: 16
      },
      android: {
        elevation: 16
      }
    })
  },
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  avatarWrap: {
    marginBottom: 12
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900'
  },
  name: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  email: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    marginTop: 2
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  menu: {
    flex: 1,
    paddingTop: 12
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 10,
    borderRadius: 12
  },
  // Selected tab: full teal tint, like the admin menu.
  itemActive: {
    backgroundColor: COLORS.primary + '18'
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    // No disc — the icon sits plain in both light and dark.
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 2
  },
  itemLabelActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF444455',
    backgroundColor: '#EF444410'
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700'
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  footerSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center'
  }
});