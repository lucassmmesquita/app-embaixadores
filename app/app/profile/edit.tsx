/**
 * ═══════════════════════════════════════════════════════════════
 *  Edit Profile Screen — Update name, phone, city, bio
 *  Fase 5: RF-PRF-02 — Editar dados pessoais
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    fullName !== (user?.full_name || '') ||
    phone !== (user?.phone || '') ||
    city !== (user?.city || '') ||
    bio !== (user?.bio || '');

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      if (setUser && user) {
        setUser({ ...user, ...updated });
      }
      showToast('success', 'Perfil atualizado com sucesso!');
      router.back();
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao atualizar perfil');
    }
    setSaving(false);
  };

  const levelColor = user?.current_level?.color || Colors.primary;

  return (
    <ScreenWithNav title="Editar Perfil" showBack>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ═══ AVATAR ═══ */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: levelColor }]}>
            <Text style={styles.avatarText}>{fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={[Typography.caption1, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
            Foto de perfil (em breve)
          </Text>
        </View>

        {/* ═══ FORM ═══ */}
        <View style={[styles.formCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <InputField
            theme={theme}
            label="Nome completo *"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Seu nome"
            autoCapitalize="words"
            accessibilityLabel="Nome completo"
          />
          <InputField
            theme={theme}
            label="Telefone"
            value={phone}
            onChangeText={setPhone}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            accessibilityLabel="Telefone"
          />
          <InputField
            theme={theme}
            label="Cidade"
            value={city}
            onChangeText={setCity}
            placeholder="Sua cidade"
            autoCapitalize="words"
            accessibilityLabel="Cidade"
          />
          <InputField
            theme={theme}
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Fale um pouco sobre você..."
            multiline
            accessibilityLabel="Biografia"
          />
        </View>

        {/* ═══ INFO ═══ */}
        <View style={[styles.infoRow, { backgroundColor: theme.surface }, Shadows.sm]}>
          <MaterialIcons name="email" size={18} color={theme.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.caption2, { color: theme.textTertiary }]}>E-mail (não editável)</Text>
            <Text style={[Typography.body, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        {/* ═══ SAVE BUTTON ═══ */}
        <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.xl }}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: hasChanges ? Colors.primary : theme.surfaceElevated,
                opacity: pressed ? 0.85 : 1,
              },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
            accessibilityRole="button"
            accessibilityLabel="Salvar perfil"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <MaterialIcons name="check" size={18} color={hasChanges ? '#fff' : theme.textTertiary} />
                <Text style={[Typography.headline, { color: hasChanges ? '#fff' : theme.textTertiary }]}>
                  Salvar Alterações
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenWithNav>
  );
}

function InputField({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  accessibilityLabel,
}: {
  theme: any;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[Typography.caption1, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surfaceElevated,
          },
          multiline && { minHeight: 80, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  formCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.base,
  },
  inputGroup: {},
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.base,
  },
  saveButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
});
