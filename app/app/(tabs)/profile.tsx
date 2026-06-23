/**
 * ═══════════════════════════════════════════════════════════════
 *  Profile Screen — User profile with badges, consents, delete account
 *  PRD §6.1.3: Perfil com nível, badges, progresso
 *  PRD §8.1: LGPD consents + delete account
 *  BLK-02: Loading/Error states reais
 *  Fase 5: RF-PRF-01/02/03/LGPD — Toast, edit profile, links legais
 * ═══════════════════════════════════════════════════════════════
 */


import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useColorScheme, View } from 'react-native';
import { showToast } from '../../components/ui/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import type { UserStats } from '../../services/types';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const consents = useAuthStore((s) => s.consents);
  const loadConsents = useAuthStore((s) => s.loadConsents);
  const toggleConsent = useAuthStore((s) => s.toggleConsent);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  // BLK-02: Proper data loading with error handling
  const loadStats = useCallback(() => api.getMyStats(), []);
  const { data: stats, error: statsError, reload: reloadStats } = useAsync<UserStats>(loadStats, []);

  useEffect(() => {
    loadConsents();
  }, []);

  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useFocusEffect(
    useCallback(() => {
      reloadStats();
      refreshProfile();
    }, [reloadStats, refreshProfile])
  );

  const levelColor = user?.current_level?.color || Colors.primary;
  const levelName = user?.current_level?.name || 'Apoiador';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
        logout();
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Esta ação é irreversível. Seus dados serão anonimizados e você perderá todo o progresso. Deseja continuar?')) {
        if (window.confirm('Tem CERTEZA ABSOLUTA? Não será possível recuperar sua conta.')) {
          deleteAccount().catch((error: any) => {
            showToast('error', error.message || 'Falha ao excluir conta');
          });
        }
      }
    } else {
      Alert.alert(
        'Excluir Conta',
        'Esta ação é irreversível. Seus dados serão anonimizados e você perderá todo o progresso. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir Permanentemente',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmação Final',
                'Tem CERTEZA ABSOLUTA? Não será possível recuperar sua conta.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sim, excluir',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteAccount();
                      } catch (error: any) {
                        Alert.alert('Erro', error.message || 'Falha ao excluir conta');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const handleToggleConsent = async (consentType: 'data_processing' | 'communication' | 'public_ranking', currentValue: boolean) => {
    if (consentType === 'data_processing' && currentValue) {
      showToast('warning', 'O consentimento de tratamento de dados é obrigatório. Para revogar, exclua sua conta.');
      return;
    }
    try {
      await toggleConsent(consentType, !currentValue);
      showToast('success', 'Preferência atualizada');
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao atualizar consentimento');
    }
  };

  const getConsentValue = (type: string) => {
    return consents.some((c) => c.consent_type === type && c.accepted);
  };

  type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

  const MenuRow = ({ icon, label, onPress, danger, badge }: { icon: IconName; label: string; onPress?: () => void; danger?: boolean; badge?: number }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialIcons name={icon} size={20} color={danger ? Colors.danger : Colors.primary} />
      <Text style={[Typography.body, { color: danger ? Colors.danger : theme.text, flex: 1 }]}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={[styles.menuBadge, { backgroundColor: Colors.accent }]}>
          <Text style={[Typography.caption2, { color: '#fff', fontWeight: '700' }]}>{badge}</Text>
        </View>
      )}
      <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ PROFILE HEADER ═══ */}
      <View style={[styles.profileCard, { backgroundColor: theme.surface }, Shadows.lg]}>
        <View style={[styles.largeAvatar, { backgroundColor: levelColor }]}>
          <Text style={styles.largeAvatarText}>{user?.full_name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={[Typography.title2, { color: theme.text, marginTop: Spacing.base }]} accessibilityLabel="Nome do usuário">
          {user?.full_name || 'Embaixador'}
        </Text>
        <Text style={[Typography.subhead, { color: theme.textSecondary }]} accessibilityLabel="E-mail do usuário">{user?.email}</Text>
        <View style={[styles.levelTag, { backgroundColor: levelColor + '20' }]} accessibilityLabel="Nível do usuário">
          <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
          <Text style={[Typography.subhead, { color: levelColor, fontWeight: '600' }]}>{levelName}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.primary }]}>{user?.total_points || 0}</Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Pontos</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.success }]}>
              {stats?.total_badges || 0}
            </Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Badges</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.warning }]}>
              #{stats?.rank_position || '—'}
            </Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Ranking</Text>
          </View>
        </View>
      </View>

      {/* ═══ BADGES PREVIEW ═══ */}
      {stats && stats.badges.length > 0 && (
        <Pressable
          style={[styles.badgesPreview, { backgroundColor: theme.surface }, Shadows.sm]}
          onPress={() => router.push('/badges' as any)}
        >
          <View style={styles.badgesPreviewHeader}>
            <Text style={[Typography.headline, { color: theme.text }]}>Conquistas Recentes</Text>
            <Text style={[Typography.caption1, { color: Colors.primary }]}>Ver todas</Text>
          </View>
          <View style={styles.badgesRow}>
            {stats.badges.slice(0, 4).map((ub) => (
              <View key={ub.id} style={[styles.badgeMini, { backgroundColor: (Colors.rarity as any)[ub.badge.rarity] + '20' || Colors.primary + '20' }]}>
                <MaterialIcons name="military-tech" size={20} color={(Colors.rarity as any)[ub.badge.rarity] || Colors.primary} />
              </View>
            ))}
            {stats.total_badges > 4 && (
              <View style={[styles.badgeMini, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[Typography.caption1, { color: theme.textSecondary, fontWeight: '700' }]}>
                  +{stats.total_badges - 4}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      )}

      {/* ═══ MENU — CONTA ═══ */}
      <View style={styles.menuSection}>
        <Text style={[Typography.footnote, { color: theme.textTertiary, marginBottom: Spacing.sm, paddingHorizontal: Spacing.base }]}>
          CONTA
        </Text>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="edit" label="Editar Perfil" onPress={() => router.push('/profile/edit' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="notifications" label="Notificações" onPress={() => router.push('/notifications' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="military-tech" label="Minhas Conquistas" badge={stats?.total_badges} onPress={() => router.push('/badges' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="bar-chart" label="Histórico de Pontos" onPress={() => router.push('/history' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="group-add" label="Meus Convites" onPress={() => router.push('/invitations' as any)} />
        </View>
      </View>

      {/* ═══ CONSENTS (LGPD §8.1) ═══ */}
      <View style={styles.menuSection}>
        <Text style={[Typography.footnote, { color: theme.textTertiary, marginBottom: Spacing.sm, paddingHorizontal: Spacing.base }]}>
          PRIVACIDADE (LGPD)
        </Text>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <View style={[styles.consentRow, { backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body, { color: theme.text }]}>Tratamento de dados</Text>
              <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Obrigatório</Text>
            </View>
            <Switch
              value={getConsentValue('data_processing')}
              disabled
              trackColor={{ false: theme.surfaceElevated, true: Colors.primary + '60' }}
              thumbColor={Colors.primary}
            />
          </View>
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <View style={[styles.consentRow, { backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body, { color: theme.text }]}>Comunicações</Text>
              <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Notificações e e-mails</Text>
            </View>
            <Switch
              value={getConsentValue('communication')}
              onValueChange={() => handleToggleConsent('communication', getConsentValue('communication'))}
              trackColor={{ false: theme.surfaceElevated, true: Colors.primary + '60' }}
              thumbColor={getConsentValue('communication') ? Colors.primary : theme.textTertiary}
            />
          </View>
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <View style={[styles.consentRow, { backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body, { color: theme.text }]}>Ranking público</Text>
              <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Exibir nome no ranking</Text>
            </View>
            <Switch
              value={getConsentValue('public_ranking')}
              onValueChange={() => handleToggleConsent('public_ranking', getConsentValue('public_ranking'))}
              trackColor={{ false: theme.surfaceElevated, true: Colors.primary + '60' }}
              thumbColor={getConsentValue('public_ranking') ? Colors.primary : theme.textTertiary}
            />
          </View>
        </View>
      </View>

      {/* ═══ GERAL ═══ */}
      <View style={styles.menuSection}>
        <Text style={[Typography.footnote, { color: theme.textTertiary, marginBottom: Spacing.sm, paddingHorizontal: Spacing.base }]}>
          GERAL
        </Text>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="description" label="Termos de Uso" onPress={() => router.push('/legal/terms' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="shield" label="Política de Privacidade" onPress={() => router.push('/legal/privacy' as any)} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="info" label="Sobre o App" onPress={() => {}} />
        </View>
      </View>

      {/* ═══ DANGER ZONE ═══ */}
      <View style={styles.menuSection}>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="logout" label="Sair da Conta" onPress={handleLogout} danger />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="delete-forever" label="Excluir Conta" onPress={handleDeleteAccount} danger />
        </View>
      </View>

      <Text style={[Typography.caption2, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xl }]}>
        Rede de Embaixadores v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  largeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  levelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xl,
  },
  profileStat: { alignItems: 'center' },
  statDivider: { width: 1, height: 30 },
  badgesPreview: {
    marginHorizontal: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  badgesPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgesRow: { flexDirection: 'row', gap: Spacing.sm },
  badgeMini: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSection: { marginBottom: Spacing.xl },
  menuGroup: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  menuDivider: { height: 0.5, marginLeft: 52 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
});
