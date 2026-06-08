/**
 * ═══════════════════════════════════════════════════════════════
 *  Toast Component — Feedback não bloqueante para ações
 *  BLK-02: Substitui Alert/console.log por notificações visuais
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

// ═══ Types ═══
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ═══ Global state (singleton) ═══
type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

/** Show a toast from anywhere in the app */
export function showToast(type: ToastType, message: string, duration = 3000) {
  const toast: ToastMessage = {
    id: Date.now().toString(),
    type,
    message,
    duration,
  };
  listeners.forEach((fn) => fn(toast));
}

// ═══ Config ═══
const TOAST_CONFIG: Record<ToastType, { icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string }> = {
  success: { icon: 'check-circle', color: Colors.success },
  error: { icon: 'error', color: Colors.danger },
  info: { icon: 'info', color: Colors.info },
  warning: { icon: 'warning', color: Colors.warning },
};

// ═══ Toast Item ═══
function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 200 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, translateY, opacity, onDismiss]);

  return (
    <Animated.View style={[{ transform: [{ translateY }], opacity }]}>
      <Pressable
        style={[
          styles.toast,
          { backgroundColor: theme.surface, borderLeftColor: config.color },
          Shadows.md,
        ]}
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
      >
        <MaterialIcons name={config.icon} size={22} color={config.color} />
        <Text
          style={[Typography.subhead, { color: theme.text, flex: 1 }]}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
        <MaterialIcons name="close" size={18} color={theme.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ═══ Toast Provider ═══
/** Place <ToastProvider /> once at the root of your app (in _layout.tsx) */
export function ToastProvider() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-2), toast]); // Max 3 toasts
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.add(handleToast);
    return () => { listeners.delete(handleToast); };
  }, [handleToast]);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    gap: Spacing.sm,
  },
});
