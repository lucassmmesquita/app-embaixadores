/**
 * ═══════════════════════════════════════════════════════════════
 *  Social Auth Service — Google, Apple & Facebook Sign In
 *  Platform-aware: native uses Expo modules, web uses browser APIs.
 *  Native behavior is UNCHANGED — web adds browser-specific flows.
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';

// ═══ SUPABASE CONFIG ═══
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Deep link scheme for OAuth redirect (native mobile only)
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

// ═══════════════════════════════════════════════════════════════
//  GOOGLE SIGN IN
// ═══════════════════════════════════════════════════════════════

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

// ═══ NATIVE IMPLEMENTATION ═══

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
  // On web, redirect to the current page (not root) to avoid server-side redirects stripping tokens
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
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

// ═══════════════════════════════════════════════════════════════
//  FACEBOOK SIGN IN
// ═══════════════════════════════════════════════════════════════

/**
 * Sign in with Facebook — platform-aware.
 * - Native: Uses Supabase OAuth via expo-web-browser
 * - Web: Uses popup window for OAuth flow
 */
export async function signInWithFacebook(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  if (Platform.OS === 'web') {
    return signInWithFacebookWeb();
  }
  return signInWithFacebookNative();
}

// ═══ NATIVE IMPLEMENTATION ═══

async function signInWithFacebookNative(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const WebBrowser = await import('expo-web-browser');

  WebBrowser.maybeCompleteAuthSession();

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=facebook&redirect_to=${encodeURIComponent(REDIRECT_URI_NATIVE)}`;
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

async function signInWithFacebookWeb(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=facebook&redirect_to=${encodeURIComponent(redirectUrl)}`;

  return new Promise<{ access_token: string; refresh_token: string }>((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'facebook-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      window.location.href = authUrl;
      reject(new AuthCancelledError());
      return;
    }

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
          console.log('[FB OAuth] Popup URL:', popupUrl);
          const tokens = parseSupabaseTokens(popupUrl);
          console.log('[FB OAuth] Parsed tokens:', { access: !!tokens.access_token, refresh: !!tokens.refresh_token });
          popup.close();

          if (tokens.access_token && tokens.refresh_token) {
            resolve(tokens);
          } else {
            reject(new Error('Não foi possível obter os tokens de autenticação'));
          }
        }
      } catch {
        // Cross-origin error — popup is still on Facebook's domain, keep polling
      }
    }, 500);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (!popup.closed) popup.close();
      reject(new AuthCancelledError());
    }, 120000);
  });
}

// ═══════════════════════════════════════════════════════════════
//  APPLE SIGN IN
// ═══════════════════════════════════════════════════════════════

/**
 * Sign in with Apple (iOS only — not available on web/Android).
 * Returns Supabase session tokens directly (like Google/Facebook).
 *
 * Flow:
 * 1. Generate rawNonce (random string)
 * 2. Hash it (SHA-256) → pass hashedNonce to Apple
 * 3. Apple returns identityToken with hashedNonce embedded
 * 4. Call Supabase REST API with identityToken + rawNonce
 * 5. Supabase hashes rawNonce internally and validates against the JWT
 */
export async function signInWithApple(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }

  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');

  // 1. Generate raw nonce (random string)
  const rawNonce = Math.random().toString(36).substring(2, 15);

  // 2. Hash it for Apple (Apple expects the SHA-256 hash)
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  // 3. Request credential from Apple with the HASHED nonce
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Não foi possível obter o token de autenticação da Apple');
  }

  // 4. Exchange with Supabase using the RAW nonce
  //    Supabase will hash it internally and compare with the nonce in Apple's JWT
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      provider: 'apple',
      id_token: credential.identityToken,
      nonce: rawNonce,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error_description || errorData.msg || 'Falha na autenticação com Apple'
    );
  }

  const data = await response.json();

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Não foi possível obter os tokens de autenticação da Apple');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
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

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

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
