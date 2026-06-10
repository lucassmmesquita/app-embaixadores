/**
 * ═══════════════════════════════════════════════════════════════
 *  WebContainer — Responsive wrapper for web PWA
 *  Centers the app content in a phone-like container on desktop.
 *  On native, renders children directly (no wrapper).
 * ═══════════════════════════════════════════════════════════════
 */

import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import type { ReactNode } from 'react';
import { Colors } from '../../constants/theme';

interface WebContainerProps {
  children: ReactNode;
}

export function WebContainer({ children }: WebContainerProps) {
  // On native, just render children directly
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.webOuter, { backgroundColor: isDark ? '#050508' : '#E8EAED' }]}>
      <View style={[styles.webInner, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore — web-only property
    height: 'var(--app-height, 100vh)',
    overflow: 'hidden' as any,
  },
  webInner: {
    flex: 1,
    width: '100%' as any,
    maxWidth: 480,
    // @ts-ignore — web-only properties
    height: 'var(--app-height, 100vh)',
    maxHeight: 'var(--app-height, 100vh)',
    boxShadow: '0 0 40px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
});
