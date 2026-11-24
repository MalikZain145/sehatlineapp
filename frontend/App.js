// App entry point.
// The logo-fill animation now lives INSIDE the Welcome screen, so there is
// no separate splash screen component. App goes straight to navigation.

import 'react-native-gesture-handler';
import React, { useRef } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';
import { SessionProvider } from './src/context/SessionContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ActivityWrapper from './src/components/common/ActivityWrapper';
import { ConfirmHost } from './src/components/confirm';
import UpdatePrompt from './src/components/common/UpdatePrompt';
import NetworkBanner from './src/components/common/NetworkBanner';
import { startOfflineSync } from './src/services/apiClient';

// Offline-first: cache + outbox sync + connection monitoring (see apiClient).
startOfflineSync();

// Inner shell — runs INSIDE ThemeProvider so the navigation container and the
// root view use the app's own background. Without this the container defaults to
// a dark background that flashes as a black "shadow" behind screens during the
// bottom-to-top transition; painting it with our background removes that.
function AppShell({ navigationRef }) {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <SessionProvider navigationRef={navigationRef}>
          <ActivityWrapper>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator />
            <ConfirmHost />
            {/* OTA: "New update available" → tap → app restarts on new version */}
            <UpdatePrompt />
            {/* Offline / weak-connection notice, sync status */}
            <NetworkBanner />
          </ActivityWrapper>
        </SessionProvider>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const navigationRef = useRef(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell navigationRef={navigationRef} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
