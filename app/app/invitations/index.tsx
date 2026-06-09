/**
 * ═══════════════════════════════════════════════════════════════
 *  Invitations Screen — Create + track invitations
 *  PRD §6.1.8: Convidar — link/deep-link rastreável + acompanhamento
 *  100% funcional: share registra convite, código copiável, funil real
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Share as RNShare,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useInvitationStore } from '../../stores/invitationStore';
import { useAuthStore } from '../../stores/authStore';
import { showToast } from '../../components/ui/Toast';
import api from '../../services/api';
import type { Invitation, InviteStatus } from '../../services/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app-embaixadores.onrender.com';

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

  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const { tracking, isLoading, loadInvitations } = useInvitationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    loadInvitations();
    // Ensure user has a referral code
    if (user && !user.referral_code) {
      api.generateReferralCode().then(() => refreshProfile()).catch(() => {});
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
    setRefreshing(false);
  };

  const referralCode = user?.referral_code || '';
  const inviteLink = `${API_BASE_URL}/convite/${referralCode}`;

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(referralCode);
    } catch {
      // Fallback: use share dialog
      await RNShare.share({ message: referralCode });
    }
    setCodeCopied(true);
    showToast('success', 'Código copiado! 📋');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!referralCode) return;
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(inviteLink);
    } catch {
      await RNShare.share({ message: inviteLink });
    }
    showToast('success', 'Link copiado! 🔗');
  };

  const handleShareLink = async () => {
    if (!referralCode) return;

    try {
      // Record the share in the backend FIRST
      await api.recordShare();

      // Then open native share
      await RNShare.share({
        message: `Junte-se à Rede de Embaixadores! Use meu código: ${referralCode}\n\nBaixe o app: ${inviteLink}`,
      });

      // Reload to show the new pending invitation
      await loadInvitations();
    } catch {
      // If share was cancelled, still reload since we already recorded
      await loadInvitations();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={tracking?.invitations || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: 120 }}
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

            {/* ═══ YOUR CODE ═══ */}
            {referralCode ? (
              <Pressable
                onPress={handleCopyCode}
                style={[styles.codeCard, { backgroundColor: theme.surface, borderColor: codeCopied ? Colors.success + '60' : theme.border }, Shadows.sm]}
              >
                <View style={styles.codeHeader}>
                  <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
                    Seu código de convite
                  </Text>
                  <View style={styles.copyBadge}>
                    <MaterialIcons
                      name={codeCopied ? 'check-circle' : 'content-copy'}
                      size={14}
                      color={codeCopied ? Colors.success : Colors.primary}
                    />
                    <Text style={[Typography.caption2, { color: codeCopied ? Colors.success : Colors.primary, fontWeight: '600' }]}>
                      {codeCopied ? 'Copiado!' : 'Toque para copiar'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.codeText, { color: Colors.primary }]}>
                  {referralCode}
                </Text>
              </Pressable>
            ) : null}

            {/* ═══ ACTION BUTTONS ═══ */}
            <View style={styles.actionButtons}>
              {/* Share button */}
              <Pressable
                style={({ pressed }) => [
                  styles.shareButton,
                  { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
                  Shadows.md,
                ]}
                onPress={handleShareLink}
              >
                <MaterialIcons name="share" size={20} color="#fff" />
                <Text style={[Typography.headline, { color: '#fff' }]}>Compartilhar Convite</Text>
              </Pressable>

              {/* Copy link button */}
              <Pressable
                style={({ pressed }) => [
                  styles.copyLinkButton,
                  { backgroundColor: theme.surface, borderColor: Colors.primary + '40', opacity: pressed ? 0.85 : 1 },
                  Shadows.sm,
                ]}
                onPress={handleCopyLink}
              >
                <MaterialIcons name="link" size={20} color={Colors.primary} />
                <Text style={[Typography.headline, { color: Colors.primary }]}>Copiar Link</Text>
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
          const date = new Date(item.created_at);
          const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          return (
            <View style={[styles.inviteCard, { backgroundColor: theme.surface }, Shadows.sm]}>
              <View style={[styles.inviteIcon, { backgroundColor: meta.color + '15' }]}>
                <MaterialIcons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>
                  {item.invitee_email || item.invitee_phone || 'Convite via link'}
                </Text>
                <Text style={[Typography.caption2, { color: theme.textTertiary }]}>
                  {formattedDate} às {formattedTime}
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
                Compartilhe seu link de convite para ganhar pontos quando seus convidados se cadastrarem e completarem missões!
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
  codeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.base,
    alignItems: 'center',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.sm,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'SpaceMono',
  },
  actionButtons: {
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
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
