/**
 * Firebase Messaging Service Worker
 * Handles push notifications when the PWA is in the background or closed.
 * This file MUST be served at the root of the web app.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config is injected at build time via env vars.
// For now, we initialize with the project config directly.
// In production, this should be replaced by the build process.
firebase.initializeApp({
  apiKey: 'AIzaSyBbRgfk3ubFJwEeLcXFqav5EKlFPbrC0Kc',
  authDomain: 'embaixadores-app-staging.firebaseapp.com',
  projectId: 'embaixadores-app-staging',
  storageBucket: 'embaixadores-app-staging.firebasestorage.app',
  messagingSenderId: '113451274573',
  appId: '1:113451274573:web:19b48a26d9d315d59d6704',
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || payload.data || {};

  const notificationTitle = title || 'Nova notificação';
  const notificationOptions = {
    body: body || '',
    icon: '/app/assets/images/icon.png',
    badge: '/app/assets/images/icon.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open the app
      return clients.openWindow('/app');
    })
  );
});
