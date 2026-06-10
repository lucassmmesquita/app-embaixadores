/**
 * ═══════════════════════════════════════════════════════════════
 *  Root Layout — App entry point with auth routing + onboarding
 *  Updated with routes for all new screens
 * ═══════════════════════════════════════════════════════════════
 */

import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useReferralStore } from '../stores/referralStore';
import { Colors } from '../constants/theme';
import { ToastProvider } from '../components/ui/Toast';
import { ReferralCodeModal } from '../components/ui/ReferralCodeModal';
import { RewardOverlay } from '../components/feedback/RewardOverlay';
import { RichSplash } from '../components/ui/RichSplash';
import { WebContainer } from '../components/web/WebContainer';
import { getPlatformStorage } from '../services/platformStorage';

// SplashScreen is native-only
if (Platform.OS !== 'web') {
  const SplashScreen = require('expo-splash-screen');
  SplashScreen.preventAutoHideAsync();
}

// Web: fix mobile viewport height (the "100vh problem" on mobile browsers)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const setAppHeight = () => {
    const vh = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
  };
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.visualViewport?.addEventListener('resize', setAppHeight);

  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      height: var(--app-height, 100vh) !important;
      max-height: var(--app-height, 100vh) !important;
      overflow: hidden !important;
    }
    #root > div {
      height: var(--app-height, 100vh) !important;
      max-height: var(--app-height, 100vh) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }
  `;
  document.head.appendChild(style);
}

const ONBOARDING_KEY = '@onboarding_completed';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [showRichSplash, setShowRichSplash] = useState(Platform.OS !== 'web');

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  });

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const storage = getPlatformStorage();
        const value = await storage.getItem(ONBOARDING_KEY);
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
      // Hide native splash on mobile
      if (Platform.OS !== 'web') {
        const SplashScreen = require('expo-splash-screen');
        SplashScreen.hideAsync();
      } else {
        // Hide PWA CSS splash
        (window as any).__hidePwaSplash?.();
      }
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
    <WebContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
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

        {/* ═══ DEEP LINK CATCHER ═══ */}
        <Stack.Screen name="convite/[code]" options={{ headerShown: false }} />
      </Stack>
      <ToastProvider />
      <ReferralCodeModal />
      <RewardOverlay />

      {/* ═══ RICH SPLASH — native only ═══ */}
      {showRichSplash && (
        <RichSplash onDone={() => setShowRichSplash(false)} />
      )}
    </WebContainer>
  );
}
