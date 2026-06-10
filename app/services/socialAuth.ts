/**
 * ═══════════════════════════════════════════════════════════════
 *  Social Auth Service — Google, Apple & Facebook Sign In
 *  Google:   Uses Supabase OAuth flow via WebBrowser (works in Expo Go)
 *  Facebook: Uses Supabase OAuth flow via WebBrowser (works in Expo Go)
 *  Apple:    Uses expo-apple-authentication (native iOS)
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

// ═══ SUPABASE CONFIG ═══
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

// Deep link scheme for OAuth redirect — must exactly match Supabase Redirect URLs config
const REDIRECT_URI = 'embaixadores://';

/**
 * Sign in with Google via Supabase OAuth flow.
 * Opens a browser to Google's consent screen via Supabase,
 * then returns the Supabase access/refresh tokens.
 *
 * Flow:
 * 1. Opens ${SUPABASE_URL}/auth/v1/authorize?provider=google
 * 2. Google authenticates → redirects to Supabase callback
 * 3. Supabase processes → redirects to embaixadores://auth/callback#access_token=...
 * 4. WebBrowser intercepts the redirect and returns the URL
 */
export async function signInWithGoogle(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  // Ensure any previous browser sessions are dismissed
  WebBrowser.maybeCompleteAuthSession();

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(REDIRECT_URI)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  if (result.type !== 'success' || !result.url) {
    throw new AuthCancelledError();
  }

  // Parse tokens from the URL fragment: embaixadores://auth/callback#access_token=...&refresh_token=...
  const tokens = parseSupabaseTokens(result.url);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Não foi possível obter os tokens de autenticação');
  }

  return tokens;
}

/**
 * Sign in with Facebook via Supabase OAuth flow.
 * Opens a browser to Facebook's login screen via Supabase,
 * then returns the Supabase access/refresh tokens.
 *
 * Flow:
 * 1. Opens ${SUPABASE_URL}/auth/v1/authorize?provider=facebook
 * 2. Facebook authenticates → redirects to Supabase callback
 * 3. Supabase processes → redirects to embaixadores://#access_token=...
 * 4. WebBrowser intercepts the redirect and returns the URL
 */
export async function signInWithFacebook(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  WebBrowser.maybeCompleteAuthSession();

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=facebook&redirect_to=${encodeURIComponent(REDIRECT_URI)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  if (result.type !== 'success' || !result.url) {
    throw new AuthCancelledError();
  }

  const tokens = parseSupabaseTokens(result.url);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Não foi possível obter os tokens de autenticação');
  }

  return tokens;
}

/**
 * Parse Supabase tokens from the redirect URL.
 * Supabase returns tokens in the URL fragment (hash):
 * embaixadores://auth/callback#access_token=xxx&refresh_token=yyy&token_type=bearer&...
 */
function parseSupabaseTokens(url: string): {
  access_token: string;
  refresh_token: string;
} {
  let fragment = '';

  // The fragment can be after # in the URL
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    fragment = url.substring(hashIndex + 1);
  }

  // Sometimes Supabase puts them as query params instead
  if (!fragment) {
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      fragment = url.substring(queryIndex + 1);
    }
  }

  const params = new URLSearchParams(fragment);

  return {
    access_token: params.get('access_token') || '',
    refresh_token: params.get('refresh_token') || '',
  };
}

/**
 * Custom error for when user cancels the auth flow.
 */
export class AuthCancelledError extends Error {
  code = 'ERR_REQUEST_CANCELED';
  constructor() {
    super('Autenticação cancelada pelo usuário');
    this.name = 'AuthCancelledError';
  }
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
