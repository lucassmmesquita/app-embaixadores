/**
 * ═══════════════════════════════════════════════════════════════
 *  Register Screen — Multi-field registration with LGPD consents
 *  Fase 2: RF-AUTH-11/12/13 — Validação inline, máscara telefone,
 *  indicador de força de senha, código de indicação
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
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../components/ui/Toast';
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  AuthCancelledError,
} from '../../services/socialAuth';
import { ApiError } from '../../services/api';

// ═══ VALIDATION HELPERS ═══
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(name: string): string | null {
  if (!name.trim()) return 'Nome é obrigatório';
  if (name.trim().length < 2) return 'Nome muito curto (mín. 2 caracteres)';
  if (!name.trim().includes(' ')) return 'Informe o nome completo';
  return null;
}

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

function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Confirme a senha';
  if (password !== confirm) return 'As senhas não coincidem';
  return null;
}

/** Returns a score from 0-4 for password strength */
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
  const colors = ['transparent', Colors.danger, Colors.warning, Colors.info, Colors.success, Colors.success];
  const capped = Math.min(score, 5);
  return { score: capped, label: labels[capped], color: colors[capped] };
}

/** Phone mask for BR: (99) 99999-9999 */
function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function mapRegisterError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet.';
    if (error.status === 409) return 'Este e-mail já está cadastrado.';
    if (error.status === 422) return 'Dados inválidos. Verifique os campos.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Falha no cadastro. Tente novamente.';
}

// ═══ INPUT FIELD COMPONENT (defined outside to avoid remounting on re-render) ═══
function InputField({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType,
  autoCapitalize, optional, error, onBlur, inputRef, returnKeyType, onSubmitEditing,
  showToggle, toggleValue, onToggle, accessibilityLabel, autoComplete, theme, isLoading,
}: any) {
  return (
    <View>
      <View style={[
        fieldStyles.inputContainer,
        { backgroundColor: theme.surface, borderColor: error ? Colors.danger : theme.border },
      ]}>
        <View style={fieldStyles.labelRow}>
          <Text style={[fieldStyles.inputLabel, { color: error ? Colors.danger : theme.textSecondary }]}>{label}</Text>
          {optional && (
            <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Opcional</Text>
          )}
        </View>
        <View style={fieldStyles.passwordRow}>
          <TextInput
            ref={inputRef}
            style={[fieldStyles.input, { color: theme.text, flex: 1 }]}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={theme.textTertiary}
            secureTextEntry={secureTextEntry && !toggleValue}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize || 'sentences'}
            autoComplete={autoComplete}
            autoCorrect={false}
            returnKeyType={returnKeyType || 'next'}
            onSubmitEditing={onSubmitEditing}
            editable={!isLoading}
            accessibilityLabel={accessibilityLabel || label}
          />
          {showToggle && (
            <Pressable
              onPress={onToggle}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={toggleValue ? 'Ocultar' : 'Mostrar'}
            >
              <MaterialIcons
                name={toggleValue ? 'visibility-off' : 'visibility'}
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
          )}
        </View>
      </View>
      {error && (
        <View style={fieldStyles.errorRow}>
          <MaterialIcons name="error-outline" size={14} color={Colors.danger} />
          <Text style={[Typography.caption2, { color: Colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // LGPD Consents (PRD §8.1)
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentCommunication, setConsentCommunication] = useState(false);
  const [consentPublicRanking, setConsentPublicRanking] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | 'facebook' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { register, socialLogin, socialSessionLogin, isLoading } = useAuthStore();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Refs for field navigation
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);

  // Errors
  const isT = (f: string) => touched[f] || submitted;
  const nameError = isT('name') ? validateName(fullName) : null;
  const emailError = isT('email') ? validateEmail(email) : null;
  const passwordError = isT('password') ? validatePassword(password) : null;
  const confirmError = isT('confirm') ? validateConfirmPassword(password, confirmPassword) : null;

  const pwdStrength = getPasswordStrength(password);

  const handlePhoneChange = (text: string) => setPhone(maskPhone(text));
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const handleRegister = async () => {
    setSubmitted(true);

    const errors = [
      validateName(fullName),
      validateEmail(email),
      validatePassword(password),
      validateConfirmPassword(password, confirmPassword),
    ].filter(Boolean);

    if (errors.length > 0) return;

    if (!consentDataProcessing) {
      showToast('warning', 'Consentimento de tratamento de dados é obrigatório (LGPD)');
      return;
    }

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.replace(/\D/g, '') || undefined,
        referral_code: referralCode.trim() || undefined,
        consents: [
          { consent_type: 'data_processing', accepted: consentDataProcessing },
          { consent_type: 'communication', accepted: consentCommunication },
          { consent_type: 'public_ranking', accepted: consentPublicRanking },
        ],
      });
      showToast('success', 'Conta criada com sucesso! 🎉');
    } catch (error: unknown) {
      showToast('error', mapRegisterError(error));
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const tokens = await signInWithGoogle();
      await socialSessionLogin(tokens.access_token, tokens.refresh_token);
      showToast('success', 'Conta criada com sucesso! 🎉');
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
      const identityToken = await signInWithApple();
      await socialLogin('apple', identityToken);
    } catch (error: any) {
      setSocialLoading(null);
      if (error.code !== 'ERR_REQUEST_CANCELED' && error.code !== '1001') {
        showToast('error', 'Falha na autenticação com Apple');
      }
    }
  };

  const handleFacebookSignIn = async () => {
    setSocialLoading('facebook');
    try {
      // TODO: Implementar Facebook Login SDK
      showToast('info', 'Login com Facebook será implementado em breve');
    } catch {
      showToast('error', 'Falha na autenticação com Facebook');
    } finally {
      setSocialLoading(null);
    }
  };

  const isBusy = isLoading || socialLoading !== null;

  const ConsentCheckbox = ({
    checked, onToggle, label, sublabel, required,
  }: {
    checked: boolean; onToggle: () => void; label: string; sublabel?: string; required?: boolean;
  }) => (
    <Pressable
      style={[styles.consentRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[
        styles.checkbox,
        { borderColor: checked ? Colors.primary : theme.textTertiary },
        checked && { backgroundColor: Colors.primary },
      ]}>
        {checked && <MaterialIcons name="check" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Typography.subhead, { color: theme.text }]}>
          {label}
          {required && <Text style={{ color: Colors.danger }}> *</Text>}
        </Text>
        {sublabel && (
          <Text style={[Typography.caption2, { color: theme.textTertiary, marginTop: 2 }]}>
            {sublabel}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <Text style={[Typography.largeTitle, { color: theme.text }]}>Criar Conta</Text>
          <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
            Junte-se à Rede de Embaixadores e faça a diferença
          </Text>
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
            accessibilityLabel="Cadastrar com Google"
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <View style={styles.googleLogoContainer}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Cadastrar com Google</Text>
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
            accessibilityLabel="Cadastrar com Facebook"
          >
            {socialLoading === 'facebook' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <View style={styles.fbLogoContainer}>
                  <Text style={styles.fbF}>f</Text>
                </View>
                <Text style={[Typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>Cadastrar com Facebook</Text>
              </>
            )}
          </Pressable>

          {/* ═══ APPLE ═══ */}
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
            accessibilityLabel="Cadastrar com Apple"
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
                <Text style={[Typography.subhead, { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '600' }]}>Cadastrar com Apple</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ═══ DIVIDER ═══ */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
          <Text style={[Typography.caption1, { color: theme.textTertiary, marginHorizontal: Spacing.base }]}>
            ou cadastre com e-mail
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
        </View>

        {/* ═══ FORM ═══ */}
        <View style={styles.form}>
          <InputField
            label="Nome Completo"
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => touch('name')}
            placeholder="Maria da Silva"
            error={nameError}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            autoComplete="name"
            theme={theme}
            isLoading={isLoading}
          />
          <InputField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            onBlur={() => touch('email')}
            placeholder="maria@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            inputRef={emailRef}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            autoComplete="email"
            theme={theme}
            isLoading={isLoading}
          />
          <InputField
            label="Telefone"
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            optional
            inputRef={phoneRef}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            autoComplete="tel"
            theme={theme}
            isLoading={isLoading}
          />

          {/* PASSWORD WITH STRENGTH INDICATOR */}
          <View>
            <InputField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              onBlur={() => touch('password')}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              showToggle
              toggleValue={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              error={passwordError}
              inputRef={passwordRef}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              autoComplete="new-password"
              theme={theme}
              isLoading={isLoading}
            />
            {password.length > 0 && !passwordError && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= pwdStrength.score ? pwdStrength.color : theme.surfaceElevated },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[Typography.caption2, { color: pwdStrength.color, fontWeight: '600' }]}>
                  {pwdStrength.label}
                </Text>
              </View>
            )}
          </View>

          <InputField
            label="Confirmar Senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => touch('confirm')}
            placeholder="Repita a senha"
            secureTextEntry
            showToggle
            toggleValue={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            error={confirmError}
            inputRef={confirmRef}
            returnKeyType="next"
            onSubmitEditing={() => referralRef.current?.focus()}
            theme={theme}
            isLoading={isLoading}
          />

          {/* REFERRAL CODE WITH VISUAL FEEDBACK */}
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surface,
              borderColor: referralCode.trim() ? Colors.success + '80' : theme.border,
            },
          ]}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Código de Indicação</Text>
              <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Opcional</Text>
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                ref={referralRef}
                style={[styles.input, { color: theme.text, flex: 1 }]}
                value={referralCode}
                onChangeText={(t) => setReferralCode(t.toUpperCase())}
                placeholder="Ex: ABC12345"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isLoading}
                accessibilityLabel="Código de indicação"
              />
              {referralCode.trim() ? (
                <MaterialIcons name="check-circle" size={20} color={Colors.success} />
              ) : null}
            </View>
          </View>

          {/* ═══ LGPD CONSENTS (PRD §8.1) ═══ */}
          <View style={styles.consentSection}>
            <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>
              Consentimentos (LGPD)
            </Text>
            <ConsentCheckbox
              checked={consentDataProcessing}
              onToggle={() => setConsentDataProcessing(!consentDataProcessing)}
              label="Tratamento de dados pessoais"
              sublabel="Necessário para o funcionamento do app"
              required
            />
            <ConsentCheckbox
              checked={consentCommunication}
              onToggle={() => setConsentCommunication(!consentCommunication)}
              label="Receber comunicações da campanha"
              sublabel="Notificações, e-mails e atualizações"
            />
            <ConsentCheckbox
              checked={consentPublicRanking}
              onToggle={() => setConsentPublicRanking(!consentPublicRanking)}
              label="Exibir meu nome no ranking público"
              sublabel="Outros participantes poderão ver sua posição"
            />
          </View>

          {/* SUBMIT */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
              (isBusy || !consentDataProcessing) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isBusy || !consentDataProcessing}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Criar Conta</Text>
            )}
          </Pressable>

          {/* LEGAL LINKS */}
          <View style={styles.legalLinks}>
            <Pressable
              onPress={() => router.push('/legal/terms' as any)}
              accessibilityRole="link"
            >
              <Text style={[Typography.caption1, { color: Colors.primary, textDecorationLine: 'underline' }]}>
                Termos de Uso
              </Text>
            </Pressable>
            <Text style={[Typography.caption1, { color: theme.textTertiary }]}> • </Text>
            <Pressable
              onPress={() => router.push('/legal/privacy' as any)}
              accessibilityRole="link"
            >
              <Text style={[Typography.caption1, { color: Colors.primary, textDecorationLine: 'underline' }]}>
                Política de Privacidade
              </Text>
            </Pressable>
          </View>
          <Text style={[Typography.caption2, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xs }]}>
            Ao criar sua conta, você concorda com os Termos de Uso.
          </Text>
        </View>

        {/* ═══ LOGIN LINK ═══ */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Já tem conta? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link">
              <Text style={[Typography.subhead, { color: Colors.primary, fontWeight: '600' }]}>Entrar</Text>
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
  header: { marginBottom: Spacing.lg },
  socialButtons: { gap: Spacing.sm, marginBottom: Spacing.sm },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    minHeight: 48,
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
    fontWeight: '800' as const,
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
    fontWeight: '800' as const,
    color: '#1877F2',
    marginTop: -1,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.base },
  dividerLine: { flex: 1, height: 1 },
  form: { gap: Spacing.base },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  strengthBars: { flexDirection: 'row', gap: 3, flex: 1 },
  strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  consentSection: { marginTop: Spacing.sm, gap: Spacing.sm },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});

// Styles for the extracted InputField component
const fieldStyles = StyleSheet.create({
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
});
