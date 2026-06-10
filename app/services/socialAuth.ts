/**
 * ═══════════════════════════════════════════════════════════════
 *  Social Auth Service — Google & Apple Sign In
 *  Platform-aware: native uses Expo modules, web uses browser APIs.
 *  Native behavior is UNCHANGED — web adds browser-specific flows.
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';

// ═══ SUPABASE CONFIG ═══
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

// Deep link scheme for OAuth redirect
const REDIRECT_URI_NATIVE = 'embaixadores://';

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
 * Sign in with Google — platform-aware.
 * - Native: Uses Supabase OAuth via expo-web-browser
 * - Web: Uses popup window for OAuth flow
 */
export async function signInWithGoogle(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  if (Platform.OS === 'web') {
    return signInWithGoogleWeb();
  }
  return signInWithGoogleNative();
}

// ═══ NATIVE IMPLEMENTATION (unchanged) ═══

async function signInWithGoogleNative(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const WebBrowser = await import('expo-web-browser');

  WebBrowser.maybeCompleteAuthSession();

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(REDIRECT_URI_NATIVE)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI_NATIVE);

  if (result.type !== 'success' || !result.url) {
    throw new AuthCancelledError();
  }

  const tokens = parseSupabaseTokens(result.url);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Não foi possível obter os tokens de autenticação');
  }

  return tokens;
}

// ═══ WEB IMPLEMENTATION ═══

async function signInWithGoogleWeb(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  // On web, redirect to Supabase OAuth and come back to current origin
  const redirectUrl = `${window.location.origin}/`;
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

  return new Promise<{ access_token: string; refresh_token: string }>((resolve, reject) => {
    // Open popup
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      // Popup blocked — fallback to redirect
      window.location.href = authUrl;
      reject(new AuthCancelledError());
      return;
    }

    // Poll for the popup to redirect back with tokens
    const pollInterval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollInterval);
          reject(new AuthCancelledError());
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.startsWith(window.location.origin)) {
          clearInterval(pollInterval);
          const tokens = parseSupabaseTokens(popupUrl);
          popup.close();

          if (tokens.access_token && tokens.refresh_token) {
            resolve(tokens);
          } else {
            reject(new Error('Não foi possível obter os tokens de autenticação'));
          }
        }
      } catch {
        // Cross-origin error — popup is still on Google's domain, keep polling
      }
    }, 500);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!popup.closed) popup.close();
      reject(new AuthCancelledError());
    }, 120000);
  });
}

// ═══ APPLE SIGN IN ═══

/**
 * Perform Apple Sign In (iOS only — not available on web/Android).
 */
export async function signInWithApple(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }

  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');

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
 * Always false on web and Android.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  const AppleAuthentication = await import('expo-apple-authentication');
  return AppleAuthentication.isAvailableAsync();
}

// ═══ HELPERS ═══

/**
 * Parse Supabase tokens from redirect URL (fragment or query params).
 */
function parseSupabaseTokens(url: string): {
  access_token: string;
  refresh_token: string;
} {
  let fragment = '';

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    fragment = url.substring(hashIndex + 1);
  }

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
