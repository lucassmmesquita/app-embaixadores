/**
 * ═══════════════════════════════════════════════════════════════
 *  Root Layout — App entry point with auth routing + onboarding
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = '@onboarding_completed';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(value === 'true');
      } catch {
        setHasSeenOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (fontsLoaded && hasSeenOnboarding !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hasSeenOnboarding]);

  // Auth + onboarding routing guard
  useEffect(() => {
    if (!fontsLoaded || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      if (!hasSeenOnboarding) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, fontsLoaded, hasSeenOnboarding]);

  if (!fontsLoaded || hasSeenOnboarding === null) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="mission/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: isDark ? 'dark' : 'light',
            headerTitle: '',
            headerBackTitle: 'Voltar',
            headerTintColor: Colors.primary,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: isDark ? 'dark' : 'light',
            headerTitle: '',
            headerBackTitle: 'Voltar',
            headerTintColor: Colors.primary,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="content/index"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="content/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: isDark ? 'dark' : 'light',
            headerTitle: '',
            headerBackTitle: 'Voltar',
            headerTintColor: Colors.primary,
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
