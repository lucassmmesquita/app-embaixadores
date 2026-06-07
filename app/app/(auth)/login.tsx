/**
 * ═══════════════════════════════════════════════════════════════
 *  Login Screen — Inácio design system
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
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ColorBar } from '../../components/ui/ColorBar';
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
            <MaterialIcons name="apple" size={24} color={theme.text} />
            <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>Apple</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="mail" size={24} color={Colors.accent} />
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
  button: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.headline, color: '#FFFFFF' },
  forgotButton: { alignItems: 'center', paddingVertical: Spacing.sm },
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
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});
