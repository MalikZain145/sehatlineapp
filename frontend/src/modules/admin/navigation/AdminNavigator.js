// Admin portal navigation — a bottom tab bar (Dashboard · Patients · Doctors ·
// More) wrapped in a stack so the secondary sections (Analytics, Pharmacists,
// System, Reports, Ratings, Announcements, Settings, Notifications) can be
// pushed on top from anywhere.

import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';

import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ManageDoctorsScreen from '../screens/ManageDoctorsScreen';
import ManagePatientsScreen from '../screens/ManagePatientsScreen';
import AdminMoreScreen from '../screens/AdminMoreScreen';

import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';
import AdminSystemScreen from '../screens/AdminSystemScreen';
import ManagePharmacistsScreen from '../screens/ManagePharmacistsScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';
import AdminRatingsScreen from '../screens/AdminRatingsScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import AdminAnnouncementsScreen from '../screens/AdminAnnouncementsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICON = {
  AdminDashboard: 'grid',
  AdminPatients: 'people',
  AdminDoctors: 'medkit',
  AdminMore: 'ellipsis-horizontal',
};

function AdminTabs() {
  const { colors: COLORS } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border || '#E5E7EB',
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? TAB_ICON[route.name] : `${TAB_ICON[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="AdminPatients" component={ManagePatientsScreen} options={{ title: 'Patients' }} />
      <Tab.Screen name="AdminDoctors" component={ManageDoctorsScreen} options={{ title: 'Doctors' }} />
      <Tab.Screen name="AdminMore" component={AdminMoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right' }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminSystem" component={AdminSystemScreen} />
      <Stack.Screen name="AdminPharmacists" component={ManagePharmacistsScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminRatings" component={AdminRatingsScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
      <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    </Stack.Navigator>
  );
}
