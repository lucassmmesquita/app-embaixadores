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
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { useReferralStore } from '../../stores/referralStore';
import { showToast } from '../../components/ui/Toast';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
  isAppleSignInAvailable,
  AuthCancelledError,
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
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | 'facebook' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, socialSessionLogin, isLoading } = useAuthStore();
  const { pendingReferralCode, clearPendingReferralCode } = useReferralStore();

  // Inline validation state — only show after first submit attempt
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const emailError = (touched.email || submitted) ? validateEmail(email) : null;
  const passwordError = (touched.password || submitted) ? validatePassword(password) : null;

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

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

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const tokens = await signInWithGoogle();
      await socialSessionLogin(tokens.access_token, tokens.refresh_token, pendingReferralCode || undefined);
      clearPendingReferralCode();
    } catch (error: any) {
      if (!(error instanceof AuthCancelledError)) {
        showToast('error', 'Falha na autenticação com Google');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const tokens = await signInWithApple();
      await socialSessionLogin(tokens.access_token, tokens.refresh_token, pendingReferralCode || undefined);
      clearPendingReferralCode();
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED' && error.code !== '1001') {
        showToast('error', 'Falha na autenticação com Apple');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSignIn = async () => {
    setSocialLoading('facebook');
    try {
      const tokens = await signInWithFacebook();
      await socialSessionLogin(tokens.access_token, tokens.refresh_token, pendingReferralCode || undefined);
      clearPendingReferralCode();
    } catch (error: any) {
      if (!(error instanceof AuthCancelledError)) {
        console.error('[Facebook Login Error]', error);
        showToast('error', error?.message || 'Falha na autenticação com Facebook');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const isBusy = isLoading || socialLoading !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'web' ? undefined : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.base },
          Platform.OS === 'web' && styles.webScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ BRANDED HEADER — Identidade visual Inácio ═══ */}
        <View style={styles.brandHeader}>
          {/* Foto do candidato — destaque grande */}
          <Image
            source={require('../../assets/brand/logo-inacio.png')}
            style={styles.candidatePhoto}
            resizeMode="cover"
          />

          {/* DEP. FEDERAL */}
          <Text style={[styles.depLabel, { color: isDark ? '#D4DFE2' : '#1D1D1F' }]}>
            DEP. FEDERAL
          </Text>

          {/* INÁCIO — letras coloridas da campanha */}
          <View style={styles.inacioRow}>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>I</Text>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>N</Text>
            <Text style={[styles.inacioLetter, { color: '#FAD549' }]}>Á</Text>
            <Text style={[styles.inacioLetter, { color: '#4DAA35' }]}>C</Text>
            <Text style={[styles.inacioLetter, { color: '#2171BA' }]}>I</Text>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>O</Text>
          </View>

          {/* Badge 6565 — oculto por enquanto
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>6565</Text>
          </View>
          */}

          {/* Barra de cores */}
          <ColorBar height={4} style={{ width: 140, borderRadius: 2, marginTop: Spacing.md, overflow: 'hidden' }} />

          {/* Nome do App */}
          <Text style={[styles.appName, { color: theme.text }]}>
            Rede de Embaixadores
          </Text>

          {/* Slogan */}
          <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
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
          {/* ═══ GOOGLE ═══ */}
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
                <View style={styles.googleLogoContainer}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Entrar com Google</Text>
              </>
            )}
          </Pressable>

          {/* ═══ FACEBOOK ═══ */}
          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: '#1877F2',
                borderColor: '#1877F2',
                opacity: pressed ? 0.85 : 1,
              },
              isBusy && styles.buttonDisabled,
            ]}
            onPress={handleFacebookSignIn}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Entrar com Facebook"
          >
            {socialLoading === 'facebook' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <View style={styles.fbLogoContainer}>
                  <Text style={styles.fbF}>f</Text>
                </View>
                <Text style={[Typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>Entrar com Facebook</Text>
              </>
            )}
          </Pressable>

          {/* ═══ APPLE — iOS only ═══ */}
          {Platform.OS === 'ios' && (
          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#FFFFFF' : '#000000',
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
              <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
            ) : (
              <>
                <Image
                  source={require('../../assets/brand/apple-logo-white.png')}
                  style={{ width: 18, height: 22, tintColor: isDark ? '#000000' : '#FFFFFF' }}
                  resizeMode="contain"
                />
                <Text style={[Typography.subhead, { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '600' }]}>Entrar com Apple</Text>
              </>
            )}
          </Pressable>
          )}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },
  webScrollContent: {
    maxWidth: 480,
    alignSelf: 'center' as const,
    width: '100%' as any,
  },

  /* ═══ BRANDED HEADER ═══ */
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  candidatePhoto: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F1F2F4',
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  depLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: -2,
  },
  inacioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  inacioLetter: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  numberBadge: {
    backgroundColor: '#E33431',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: Spacing.xs,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* ═══ FORM ═══ */
  form: { gap: Spacing.sm },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  inputLabel: { ...Typography.caption1, marginBottom: 2 },
  input: { ...Typography.body, paddingVertical: 2 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    marginTop: Spacing.xs,
    ...Shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.headline, color: '#FFFFFF' },
  forgotButton: { alignItems: 'center', paddingVertical: Spacing.xs, minHeight: 36, justifyContent: 'center' },

  /* ═══ DIVIDER ═══ */
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.base },
  dividerLine: { flex: 1, height: 1 },

  /* ═══ SOCIAL ═══ */
  socialButtons: { gap: Spacing.sm },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    minHeight: 46,
  },
  googleLogoContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  fbLogoContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbF: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1877F2',
    marginTop: -1,
  },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
