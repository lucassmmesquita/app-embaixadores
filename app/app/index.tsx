/**
 * ═══════════════════════════════════════════════════════════════
 *  Index Route — Redirect to appropriate screen
 *  Expo Router requires an index.tsx at the app root
 * ═══════════════════════════════════════════════════════════════
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
