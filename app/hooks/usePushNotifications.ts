/**
 * ═══════════════════════════════════════════════════════════════
 *  usePushNotifications — Hook para push notifications (iOS/Android)
 *  Usa expo-notifications para registrar o device e receber push.
 *  O token é enviado ao backend automaticamente no login.
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

// Configurar como notificações aparecem quando app está em foreground
// Import is conditional because expo-notifications is not available on web
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Only run on native platforms (iOS/Android) when authenticated
    if (Platform.OS === 'web' || !isAuthenticated || !Notifications || !Device) return;

    let isMounted = true;

    const setup = async () => {
      const token = await registerForPush();
      if (token && isMounted) {
        setExpoPushToken(token);
      }
    };

    setup();

    // Listener: notificação recebida (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Push notification received:', notification.request.content.title);
      }
    );

    // Listener: usuário clicou na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Push notification tapped:', response.notification.request.content.title);
        // TODO: Navigate to relevant screen based on notification data
      }
    );

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  return { expoPushToken };
}

async function registerForPush(): Promise<string | null> {
  if (!Notifications || !Device) return null;

  // Push notifications require a physical device
  if (!Device.isDevice) {
    console.log('⚠️ Push notifications require a physical device');
    return null;
  }

  try {
    // Check/request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification permission denied');
      return null;
    }

    // Get Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'c79e895d-d9c6-41de-88ad-9751b3a2531f',
    });
    const token = tokenData.data;

    // Configure notification channel (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Embaixadores',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }

    // Register token with backend
    try {
      await api.registerDeviceToken(token, Platform.OS as 'ios' | 'android');
      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register push token with backend:', error);
    }

    return token;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
}
