/**
 * ═══════════════════════════════════════════════════════════════
 *  Social Auth Service — Google & Apple Sign In
 *  Uses expo-auth-session (Google) and expo-apple-authentication (Apple)
 *  to obtain ID tokens, then sends them to the backend.
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri, type AuthSessionResult } from 'expo-auth-session';

// ═══ GOOGLE CONFIG ═══
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

/**
 * Hook that returns the Google Auth request configuration.
 * Must be called at the component level (it's a hook).
 */
export function useGoogleAuth() {
  const redirectUri = makeRedirectUri({
    scheme: 'embaixadores',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    redirectUri,
  });

  return { request, response, promptAsync };
}

/**
 * Extract the id_token from a successful Google auth response.
 */
export function getGoogleIdToken(
  response: AuthSessionResult | null
): string | null {
  if (response?.type === 'success') {
    return response.params?.id_token || null;
  }
  return null;
}

/**
 * Perform Apple Sign In and return the identity token.
 * Only available on iOS.
 */
export async function signInWithApple(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }

  // Generate a secure nonce for the request
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString(36).substring(2, 15)
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });

  if (!credential.identityToken) {
    throw new Error('Não foi possível obter o token de autenticação da Apple');
  }

  return credential.identityToken;
}

/**
 * Check if Apple Sign In is available on this device.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}
