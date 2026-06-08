/**
 * ═══════════════════════════════════════════════════════════════
 *  Login Screen — Inácio design system
 *  Fase 2: RF-AUTH-03/04 — Validação inline + erros específicos
 * ═══════════════════════════════════════════════════════════════
 */

import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { ColorBar } from '../../components/ui/ColorBar';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../components/ui/Toast';
import {
  useGoogleAuth,
  getGoogleIdToken,
  signInWithApple,
  isAppleSignInAvailable,
} from '../../services/socialAuth';
import { ApiError } from '../../services/api';

// ═══ VALIDATION HELPERS ═══
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'E-mail é obrigatório';
  if (!EMAIL_REGEX.test(email.trim())) return 'E-mail inválido';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Senha é obrigatória';
  if (password.length < 6) return 'Mínimo de 6 caracteres';
  return null;
}

/** Map backend error codes to user-friendly messages */
function mapLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet.';
    if (error.status === 401) return 'E-mail ou senha incorretos.';
    if (error.status === 404) return 'Conta não encontrada. Verifique seu e-mail.';
    if (error.status === 422) return 'E-mail ou senha em formato inválido.';
    if (error.status === 429) return 'Muitas tentativas. Aguarde alguns minutos.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Falha na autenticação. Tente novamente.';
}

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, socialLogin, isLoading } = useAuthStore();

  // Inline validation state — only show after first submit attempt
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const emailError = (touched.email || submitted) ? validateEmail(email) : null;
  const passwordError = (touched.password || submitted) ? validatePassword(password) : null;

  // ═══ GOOGLE AUTH HOOK ═══
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync } = useGoogleAuth();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    const idToken = getGoogleIdToken(googleResponse);
    if (idToken) {
      handleSocialLogin('google', idToken);
    } else if (googleResponse?.type === 'error') {
      setSocialLoading(null);
      showToast('error', 'Falha na autenticação com Google');
    } else if (googleResponse?.type === 'dismiss') {
      setSocialLoading(null);
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    setSubmitted(true);

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    if (eErr || pErr) {
      // Focus on first errored field
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (error: unknown) {
      showToast('error', mapLoginError(error));
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple', idToken: string) => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider, idToken);
    } catch (error: unknown) {
      showToast('error', mapLoginError(error));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      await googlePromptAsync();
    } catch {
      setSocialLoading(null);
      showToast('error', 'Não foi possível iniciar a autenticação com Google');
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const identityToken = await signInWithApple();
      await handleSocialLogin('apple', identityToken);
    } catch (error: any) {
      setSocialLoading(null);
      if (error.code !== 'ERR_REQUEST_CANCELED' && error.code !== '1001') {
        showToast('error', 'Falha na autenticação com Apple');
      }
    }
  };

  const isBusy = isLoading || socialLoading !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* ═══ HEADER — Logo Inácio estilizado ═══ */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="groups" size={48} color={Colors.primary} />
          </View>
          <Text style={[Typography.largeTitle, { color: theme.text }]}>Rede de</Text>
          <Text style={[Typography.largeTitle, { color: Colors.primary }]}>Embaixadores</Text>
          <ColorBar height={4} style={{ width: 120, borderRadius: 2, marginTop: Spacing.md, overflow: 'hidden' }} />
          <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.md }]}>
            Junte-se a nós. Faça parte da mudança.
          </Text>
        </View>

        {/* ═══ FORM ═══ */}
        <View style={styles.form}>
          {/* EMAIL FIELD */}
          <View>
            <View style={[
              styles.inputContainer,
              { backgroundColor: theme.surface, borderColor: emailError ? Colors.danger : theme.border },
            ]}>
              <Text style={[styles.inputLabel, { color: emailError ? Colors.danger : theme.textSecondary }]}>E-mail</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="seu@email.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isBusy}
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

          {/* PASSWORD FIELD */}
          <View>
            <View style={[
              styles.inputContainer,
              { backgroundColor: theme.surface, borderColor: passwordError ? Colors.danger : theme.border },
            ]}>
              <Text style={[styles.inputLabel, { color: passwordError ? Colors.danger : theme.textSecondary }]}>Senha</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.text, flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isBusy}
                  accessibilityLabel="Campo de senha"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.textTertiary}
                  />
                </Pressable>
              </View>
            </View>
            {passwordError && (
              <View style={styles.errorRow}>
                <MaterialIcons name="error-outline" size={14} color={Colors.danger} />
                <Text style={[Typography.caption2, { color: Colors.danger }]}>{passwordError}</Text>
              </View>
            )}
          </View>

          {/* SUBMIT BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
              isBusy && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          {/* FORGOT PASSWORD LINK */}
          <Pressable
            style={styles.forgotButton}
            onPress={() => router.push('/(auth)/forgot' as any)}
            accessibilityRole="link"
            accessibilityLabel="Esqueci minha senha"
          >
            <Text style={[Typography.subhead, { color: Colors.primary }]}>Esqueci minha senha</Text>
          </Pressable>
        </View>

        {/* ═══ DIVIDER ═══ */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
          <Text style={[Typography.caption1, { color: theme.textTertiary, marginHorizontal: Spacing.base }]}>
            ou continue com
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
        </View>

        {/* ═══ SOCIAL LOGIN ═══ */}
        <View style={styles.socialButtons}>
          {appleAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
                isBusy && styles.buttonDisabled,
              ]}
              onPress={handleAppleSignIn}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Entrar com Apple"
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <>
                  <MaterialIcons name="apple" size={24} color={theme.text} />
                  <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Apple</Text>
                </>
              )}
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
              isBusy && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Entrar com Google"
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <MaterialIcons name="mail" size={24} color={Colors.accent} />
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Google</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ═══ REGISTER LINK ═══ */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base }]}>
          <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Ainda não tem conta? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Cadastre-se">
              <Text style={[Typography.subhead, { color: Colors.primary, fontWeight: '600' }]}>Cadastre-se</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  form: { gap: Spacing.base },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputLabel: { ...Typography.caption1, marginBottom: Spacing.xs },
  input: { ...Typography.body, paddingVertical: Spacing.xs },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
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
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.headline, color: '#FFFFFF' },
  forgotButton: { alignItems: 'center', paddingVertical: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  socialButtons: { flexDirection: 'row', gap: Spacing.base },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    minHeight: 48,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});
