/**
 * ═══════════════════════════════════════════════════════════════
 *  Login Screen — Apple-inspired authentication
 * ═══════════════════════════════════════════════════════════════
 */

import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha na autenticação');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <Text style={[styles.emoji]}>🏛️</Text>
          <Text style={[Typography.largeTitle, { color: theme.text }]}>Rede de</Text>
          <Text style={[Typography.largeTitle, { color: Colors.primary }]}>Embaixadores</Text>
          <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
            Faça parte da mudança. Entre na rede.
          </Text>
        </View>

        {/* ═══ FORM ═══ */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Senha</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textTertiary}
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <Pressable style={styles.forgotButton}>
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
          <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 24 }}>🍎</Text>
            <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Apple</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 24 }}>🔵</Text>
            <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Google</Text>
          </Pressable>
        </View>

        {/* ═══ REGISTER LINK ═══ */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base }]}>
          <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Ainda não tem conta? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
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
  header: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  emoji: { fontSize: 64, marginBottom: Spacing.base },
  form: { gap: Spacing.base },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputLabel: { ...Typography.caption1, marginBottom: Spacing.xs },
  input: { ...Typography.body, paddingVertical: Spacing.xs },
  button: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.headline, color: '#FFFFFF' },
  forgotButton: { alignItems: 'center', paddingVertical: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.xl },
  dividerLine: { flex: 1, height: 1 },
  socialButtons: { flexDirection: 'row', gap: Spacing.base },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});
