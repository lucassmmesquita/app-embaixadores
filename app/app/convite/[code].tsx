/**
 * ═══════════════════════════════════════════════════════════════
 *  Deep Link Catcher — /convite/[code]
 *  Catches embaixadores://convite/{code} deep links
 *  Saves the referral code and redirects to the appropriate screen
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useReferralStore } from '../../stores/referralStore';
import { useAuthStore } from '../../stores/authStore';

export default function ConviteDeepLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Save the referral code
  useEffect(() => {
    if (code) {
      useReferralStore.getState().setPendingReferralCode(code.toUpperCase());
    }
  }, [code]);

  // Redirect based on auth state
  // If logged in → home (the ReferralCodeModal will popup automatically)
  // If not logged in → login (code persists in AsyncStorage for after login)
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
