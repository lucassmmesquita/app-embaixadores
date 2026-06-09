/**
 * ═══════════════════════════════════════════════════════════════
 *  ReferralCodeModal — Global popup for applying referral codes
 *  Appears automatically when:
 *    1. User is authenticated
 *    2. A pendingReferralCode exists in the referral store
 *  Works across ALL login flows (email, social, deep link)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useReferralStore } from '../../stores/referralStore';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from './Toast';
import api from '../../services/api';

export function ReferralCodeModal() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { pendingReferralCode, clearPendingReferralCode } = useReferralStore();

  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Show modal when authenticated AND there's a pending code
  useEffect(() => {
    if (isAuthenticated && pendingReferralCode) {
      setCode(pendingReferralCode);
      // Small delay to let the app settle after login
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, pendingReferralCode]);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      showToast('warning', 'Digite o código de indicação');
      return;
    }
    setIsApplying(true);
    try {
      await api.applyReferralCode(trimmed);
      showToast('success', 'Código aplicado com sucesso! 🎉');
      clearPendingReferralCode();
      setVisible(false);
    } catch (error: any) {
      const msg = typeof error?.message === 'string'
        ? error.message
        : 'Código inválido ou já utilizado';
      showToast('error', msg);
    }
    setIsApplying(false);
  };

  const handleDismiss = () => {
    clearPendingReferralCode();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={styles.overlay}
      >
        <Pressable style={styles.overlayTouch} onPress={handleDismiss}>
          <View />
        </Pressable>

        <View style={[styles.modal, { backgroundColor: theme.surface }, Shadows.lg]}>
          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={12}
            accessibilityLabel="Fechar"
          >
            <MaterialIcons name="close" size={22} color={theme.textTertiary} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="card-giftcard" size={36} color="#fff" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Código de Indicação
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Você recebeu um convite! Valide o código abaixo para registrar quem te indicou.
          </Text>

          {/* Code input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceElevated, borderColor: Colors.primary + '40' }]}>
            <MaterialIcons name="vpn-key" size={20} color={Colors.primary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="Ex: ABC12345"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          {/* Apply button */}
          <Pressable
            style={({ pressed }) => [
              styles.applyBtn,
              { opacity: pressed ? 0.85 : 1 },
              isApplying && { opacity: 0.6 },
            ]}
            onPress={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.applyBtnText}>Validar Código</Text>
              </>
            )}
          </Pressable>

          {/* Skip link */}
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Text style={[styles.skipText, { color: theme.textTertiary }]}>
              Não tenho código, pular
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.overlayTouch} onPress={handleDismiss}>
          <View />
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  overlayTouch: {
    flex: 1,
    width: '100%',
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  title: {
    ...Typography.title2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.subhead,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  applyBtnText: {
    ...Typography.headline,
    color: '#fff',
    fontWeight: '700',
  },
  skipText: {
    ...Typography.caption1,
    textDecorationLine: 'underline',
  },
});
