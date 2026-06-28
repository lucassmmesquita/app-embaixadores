/**
 * ═══════════════════════════════════════════════════════════════
 *  useWebPush — Hook para push notifications no PWA (Firebase Web SDK)
 *  Registra token FCM Web e envia ao backend quando autenticado.
 *  Só executa no contexto web (Platform.OS === 'web').
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

export function useWebPush() {
  const [webPushToken, setWebPushToken] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Only run on web when authenticated
    if (Platform.OS !== 'web' || !isAuthenticated) return;

    // Check if browser supports service workers and notifications
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }

    let isMounted = true;

    const setup = async () => {
      const token = await registerWebPush();
      if (token && isMounted) {
        setWebPushToken(token);
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  return { webPushToken };
}

async function registerWebPush(): Promise<string | null> {
  try {
    // Validate config
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId || !VAPID_KEY) {
      return null;
    }

    // Register service worker for background push.
    // In Expo dev mode, the public/ files aren't served as JS (returns HTML fallback),
    // so SW registration will fail. That's OK — foreground messages still work via onMessage.
    // In production (Render), the SW file is properly served and background push works.
    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      swRegistration = await navigator.serviceWorker.register(
        '/app/firebase-messaging-sw.js'
      );
    } catch {
      // Expected in dev mode — foreground push only
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Dynamically import Firebase (only on web)
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    // Initialize Firebase (only if not already initialized)
    const app = getApps().length === 0
      ? initializeApp(FIREBASE_CONFIG)
      : getApps()[0];

    const messaging = getMessaging(app);

    // Get FCM token
    const getTokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {
      vapidKey: VAPID_KEY!,
    };
    if (swRegistration) {
      getTokenOptions.serviceWorkerRegistration = swRegistration;
    }
    const token = await getToken(messaging, getTokenOptions);

    if (!token) {
      return null;
    }

    // Register token with backend
    try {
      await api.registerDeviceToken(token, 'web');
    } catch (error) {
      console.error('Failed to register web push token with backend:', error);
    }

    // Handle foreground messages — show native notification
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title;
      const body = payload.notification?.body || payload.data?.body;

      if (title && Notification.permission === 'granted') {
        new Notification(title, {
          body: body || '',
          icon: '/app/assets/images/icon.png',
        });
      }

      // Notify app to refresh unread badge and notifications list
      window.dispatchEvent(new Event('notifications-updated'));
    });

    return token;
  } catch (error) {
    console.error('Web push registration failed:', error);
    return null;
  }
}
