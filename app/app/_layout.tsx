/**
 * ═══════════════════════════════════════════════════════════════
 *  Root Layout — App entry point with auth routing + onboarding
 *  Updated with routes for all new screens
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useReferralStore } from '../stores/referralStore';
import { Colors } from '../constants/theme';
import { ToastProvider } from '../components/ui/Toast';
import { ReferralCodeModal } from '../components/ui/ReferralCodeModal';
import { RewardOverlay } from '../components/feedback/RewardOverlay';
import { RichSplash } from '../components/ui/RichSplash';

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
  const [showRichSplash, setShowRichSplash] = useState(true);

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

  // ═══ DEEP LINK HANDLER — Capture referral codes from invite URLs ═══
  useEffect(() => {
    const extractReferralCode = (url: string) => {
      // Match patterns: /convite/{code} or embaixadores://convite/{code}
      const match = url.match(/\/convite\/([A-Za-z0-9]+)/);
      if (match?.[1]) {
        const code = match[1].toUpperCase();
        useReferralStore.getState().setPendingReferralCode(code);
        // The ReferralCodeModal will auto-show when user is authenticated
      }
    };

    // Handle initial URL (app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) extractReferralCode(url);
    });

    // Handle URLs while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      extractReferralCode(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && hasSeenOnboarding !== null) {
      // Esconde o splash nativo — o RichSplash assume a transição visual
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

  const modalScreenOptions = {
    headerShown: true,
    headerTransparent: true,
    headerBlurEffect: isDark ? 'dark' as const : 'light' as const,
    headerTitle: '',
    headerBackTitle: 'Voltar',
    headerTintColor: Colors.primary,
    presentation: 'card' as const,
  };

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

        {/* ═══ DETAIL SCREENS ═══ */}
        <Stack.Screen name="mission/[id]" options={modalScreenOptions} />
        <Stack.Screen name="event/[id]" options={modalScreenOptions} />
        <Stack.Screen name="content/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="content/[id]" options={modalScreenOptions} />

        {/* ═══ NEW SCREENS ═══ */}
        <Stack.Screen name="notifications/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="invitations/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="history/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="badges/index" options={{ headerShown: false, presentation: 'card' }} />

        {/* ═══ LEGAL SCREENS ═══ */}
        <Stack.Screen name="legal/terms" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false, presentation: 'card' }} />

        {/* ═══ PROFILE ═══ */}
        <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
      <ToastProvider />
      <ReferralCodeModal />
      <RewardOverlay />

      {/* ═══ RICH SPLASH — Peça colorida da campanha sobre o app ═══ */}
      {showRichSplash && (
        <RichSplash onDone={() => setShowRichSplash(false)} />
      )}
    </>
  );
}
