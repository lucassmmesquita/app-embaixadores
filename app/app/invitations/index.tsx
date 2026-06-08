/**
 * ═══════════════════════════════════════════════════════════════
 *  Invitations Screen — Create + track invitations
 *  PRD §6.1.8: Convidar — link/deep-link rastreável + acompanhamento
 *  Fase 4: RF-INV-01/02/03 — Toast ao invés de Alert
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Share as RNShare,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useInvitationStore } from '../../stores/invitationStore';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../components/ui/Toast';
import type { Invitation, InviteStatus } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const STATUS_META: Record<InviteStatus, { icon: IconName; color: string; label: string }> = {
  pending: { icon: 'hourglass-top', color: Colors.warning, label: 'Pendente' },
  registered: { icon: 'person-add', color: Colors.info, label: 'Cadastrado' },
  verified: { icon: 'verified', color: Colors.success, label: 'Verificado' },
};

export default function InvitationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { tracking, isLoading, loadInvitations, createInvitation } = useInvitationStore();

  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteePhone, setInviteePhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadInvitations(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!inviteeEmail && !inviteePhone) {
      showToast('warning', 'Informe o e-mail ou telefone do convidado');
      return;
    }
    setCreating(true);
    try {
      const invite = await createInvitation({
        invitee_email: inviteeEmail || undefined,
        invitee_phone: inviteePhone || undefined,
      });

      // Share the invitation link
      await RNShare.share({
        message: `Junte-se à Rede de Embaixadores! Use meu código: ${invite.invite_code}\n\nBaixe o app: https://embaixadores.app/convite/${invite.invite_code}`,
      });

      setInviteeEmail('');
      setInviteePhone('');
      showToast('success', 'Convite enviado com sucesso! 🎉');
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao criar convite');
    }
    setCreating(false);
  };

  const handleShareLink = async () => {
    if (user?.referral_code) {
      await RNShare.share({
        message: `Junte-se à Rede de Embaixadores! Use meu código: ${user.referral_code}\n\nBaixe o app: https://embaixadores.app/convite/${user.referral_code}`,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[Typography.title2, { color: theme.text }]}>Convites</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={tracking?.invitations || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* ═══ FUNNEL STATS ═══ */}
            {tracking && (
              <View style={[styles.funnelCard, { backgroundColor: theme.surface }, Shadows.md]}>
                <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.base }]}>
                  Funil de Convites
                </Text>
                <View style={styles.funnelRow}>
                  <FunnelStat
                    theme={theme}
                    icon="send"
                    value={tracking.total_invites}
                    label="Enviados"
                    color={Colors.primary}
                  />
                  <MaterialIcons name="arrow-forward" size={16} color={theme.textTertiary} />
                  <FunnelStat
                    theme={theme}
                    icon="person-add"
                    value={tracking.registered}
                    label="Cadastrados"
                    color={Colors.info}
                  />
                  <MaterialIcons name="arrow-forward" size={16} color={theme.textTertiary} />
                  <FunnelStat
                    theme={theme}
                    icon="verified"
                    value={tracking.verified}
                    label="Verificados"
                    color={Colors.success}
                  />
                </View>
              </View>
            )}

            {/* ═══ SHARE QUICK LINK ═══ */}
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
                Shadows.md,
              ]}
              onPress={handleShareLink}
            >
              <MaterialIcons name="share" size={20} color="#fff" />
              <Text style={[Typography.headline, { color: '#fff' }]}>Compartilhar Link de Convite</Text>
            </Pressable>

            {/* ═══ CREATE INVITATION ═══ */}
            <View style={[styles.createCard, { backgroundColor: theme.surface }, Shadows.sm]}>
              <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>
                Novo Convite
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                value={inviteeEmail}
                onChangeText={setInviteeEmail}
                placeholder="E-mail do convidado"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={[Typography.caption2, { color: theme.textTertiary, textAlign: 'center' }]}>ou</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                value={inviteePhone}
                onChangeText={setInviteePhone}
                placeholder="Telefone do convidado"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: Colors.success, opacity: pressed ? 0.85 : 1 },
                  creating && { opacity: 0.6 },
                ]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <MaterialIcons name="person-add" size={18} color="#fff" />
                    <Text style={[Typography.headline, { color: '#fff' }]}>Enviar Convite</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Invitations list header */}
            {(tracking?.invitations?.length || 0) > 0 && (
              <Text style={[Typography.headline, { color: theme.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
                Convites Enviados
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status as InviteStatus] || STATUS_META.pending;
          return (
            <View style={[styles.inviteCard, { backgroundColor: theme.surface }, Shadows.sm]}>
              <View style={[styles.inviteIcon, { backgroundColor: meta.color + '15' }]}>
                <MaterialIcons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>
                  {item.invitee_email || item.invitee_phone || item.invite_code}
                </Text>
                <Text style={[Typography.caption2, { color: theme.textTertiary }]}>
                  {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.color + '15' }]}>
                <Text style={[Typography.caption2, { color: meta.color, fontWeight: '700' }]}>
                  {meta.label}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="group-add" size={64} color={theme.textTertiary} />
              <Text style={[Typography.title3, { color: theme.text }]}>Nenhum convite enviado</Text>
              <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
                Convide amigos para ganhar pontos quando eles verificarem a conta!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function FunnelStat({ theme, icon, value, label, color }: { theme: any; icon: IconName; value: number; label: string; color: string }) {
  return (
    <View style={styles.funnelStat}>
      <View style={[styles.funnelIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[Typography.title3, { color }]}>{value}</Text>
      <Text style={[Typography.caption2, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funnelCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  funnelStat: { alignItems: 'center', flex: 1 },
  funnelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.base,
  },
  createCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  createButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteInfo: { flex: 1, gap: 2 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.base,
  },
});
