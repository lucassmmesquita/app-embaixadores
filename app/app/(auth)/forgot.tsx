/**
 * ═══════════════════════════════════════════════════════════════
 *  Forgot Password Screen — Password recovery flow
 *  Fase 2: RF-AUTH-16/17/18 — Solicitar e-mail + feedback
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError = touched ? (
    !email.trim() ? 'E-mail é obrigatório' :
    !EMAIL_REGEX.test(email.trim()) ? 'E-mail inválido' :
    null
  ) : null;

  const handleSubmit = async () => {
    setTouched(true);
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) return;

    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // RF-AUTH-16: Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  // ═══ SUCCESS STATE ═══
  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: Colors.success + '15' }]}>
              <MaterialIcons name="mark-email-read" size={56} color={Colors.success} />
            </View>
            <Text style={[Typography.title2, { color: theme.text, textAlign: 'center', marginTop: Spacing.xl }]}>
              Verifique seu e-mail
            </Text>
            <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.base, lineHeight: 24 }]}>
              Se o e-mail <Text style={{ fontWeight: '600', color: theme.text }}>{email}</Text> estiver cadastrado,
              você receberá instruções para redefinir sua senha.
            </Text>
            <Text style={[Typography.caption1, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.lg }]}>
              Não recebeu? Verifique a pasta de spam ou tente novamente em alguns minutos.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1, marginTop: Spacing['2xl'] },
              ]}
              onPress={() => router.replace('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="Voltar para o login"
            >
              <Text style={styles.buttonText}>Voltar para o Login</Text>
            </Pressable>

            <Pressable
              style={styles.resendButton}
              onPress={() => { setSent(false); setTouched(false); }}
              accessibilityRole="button"
              accessibilityLabel="Tentar outro e-mail"
            >
              <Text style={[Typography.subhead, { color: Colors.primary }]}>Tentar outro e-mail</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ═══ FORM STATE ═══
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        {/* Icon */}
        <View style={[styles.headerIcon, { backgroundColor: Colors.primary + '12' }]}>
          <MaterialIcons name="lock-reset" size={48} color={Colors.primary} />
        </View>

        <Text style={[Typography.title2, { color: theme.text, textAlign: 'center' }]}>
          Esqueceu a senha?
        </Text>
        <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.base, lineHeight: 24 }]}>
          Sem problemas! Informe o e-mail da sua conta e enviaremos instruções para redefinir sua senha.
        </Text>

        {/* Email Field */}
        <View style={{ marginTop: Spacing['2xl'] }}>
          <View style={[
            styles.inputContainer,
            { backgroundColor: theme.surface, borderColor: emailError ? Colors.danger : theme.border },
          ]}>
            <Text style={[styles.inputLabel, { color: emailError ? Colors.danger : theme.textSecondary }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              placeholder="seu@email.com"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
              accessibilityLabel="Campo de e-mail"
            />
          </View>
          {emailError && (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={14} color={Colors.danger} />
              <Text style={[Typography.caption2, { color: Colors.danger }]}>{emailError}</Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1, marginTop: Spacing.xl },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Enviar instruções"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar Instruções</Text>
          )}
        </Pressable>

        {/* Back to Login */}
        <Pressable
          style={styles.loginLink}
          onPress={() => router.back()}
          accessibilityRole="link"
        >
          <Text style={[Typography.subhead, { color: theme.textSecondary }]}>
            Lembrou a senha? <Text style={{ color: Colors.primary, fontWeight: '600' }}>Fazer login</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.xl,
    left: 0,
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputLabel: { ...Typography.caption1, marginBottom: Spacing.xs },
  input: { ...Typography.body, paddingVertical: Spacing.xs },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  button: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.headline, color: '#FFFFFF' },
  loginLink: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButton: {
    marginTop: Spacing.base,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
