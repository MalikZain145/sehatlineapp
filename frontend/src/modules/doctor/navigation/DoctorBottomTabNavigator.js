// src/screens/doctor/navigation/DoctorBottomTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import DoctorPortalScreen from '../screens/DoctorPortalScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import DoctorNotificationsScreen from '../screens/DoctorNotificationsScreen';
import DoctorSettingsScreen from '../screens/DoctorSettingsScreen';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_INSET } from '../../../utils/bottomInset';
const Tab = createBottomTabNavigator();

// Custom Tab Bar Background Component with Gradient
const TabBarBackground = () => {
  const {
    colors: COLORS
  } = useTheme();
  return <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 0
  }} style={StyleSheet.absoluteFillObject} />;
};
export default function DoctorBottomTabNavigator() {
  const {
    colors: COLORS
  } = useTheme();
  return <Tab.Navigator initialRouteName="DoctorPortal" screenOptions={({
    route
  }) => ({
    headerShown: false,
    tabBarActiveTintColor: COLORS.white,
    tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
    tabBarStyle: {
      // Tab bar sits ABOVE the phone's nav bar / home indicator; its gradient
      // background still extends underneath it.
      height: 64 + Math.max(BOTTOM_INSET, 8),
      paddingBottom: Math.max(BOTTOM_INSET, 8),
      paddingTop: 10,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4
      },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden'
    },
    tabBarBackground: () => <TabBarBackground />,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
      marginTop: 4,
      textTransform: 'uppercase'
    },
    tabBarIcon: ({
      color,
      size,
      focused
    }) => {
      let iconName;
      switch (route.name) {
        case 'DoctorPortal':
          iconName = focused ? 'home' : 'home-outline';
          break;
        case 'DoctorNotifications':
          iconName = focused ? 'notifications' : 'notifications-outline';
          break;
        case 'DoctorProfile':
          iconName = focused ? 'person' : 'person-outline';
          break;
        case 'DoctorSettings':
          iconName = focused ? 'settings' : 'settings-outline';
          break;
        default:
          iconName = 'ellipse-outline';
      }
      return <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />;
    }
  })}>
      <Tab.Screen name="DoctorPortal" component={DoctorPortalScreen} options={{
      title: 'Home'
    }} />

      <Tab.Screen name="DoctorNotifications" component={DoctorNotificationsScreen} options={{
      title: 'Alerts'
    }} />

      <Tab.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{
      title: 'Profile'
    }} />

      <Tab.Screen name="DoctorSettings" component={DoctorSettingsScreen} options={{
      title: 'Settings'
    }} />
    </Tab.Navigator>;
}
const makeStyles = COLORS => StyleSheet.create({});