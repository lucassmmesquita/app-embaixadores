/**
 * ═══════════════════════════════════════════════════════════════
 *  Badges Gallery Screen — Badges conquistados + disponíveis
 *  PRD §5.3: Badges/conquistas configuráveis
 *  Fase 3: RF-GAM-11 — useAsync + error/loading states
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import type { UserBadge, UserStats } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const RARITY_COLORS: Record<string, string> = {
  common: Colors.rarity.common,
  uncommon: Colors.rarity.uncommon,
  rare: Colors.rarity.rare,
  epic: Colors.rarity.epic,
  legendary: Colors.rarity.legendary,
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

const BADGE_ICONS: Record<string, IconName> = {
  achievement: 'military-tech',
  milestone: 'emoji-events',
  special: 'auto-awesome',
  social: 'group',
  event: 'event',
};

export default function BadgesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Fase 3: useAsync instead of silent catch
  const loadBadges = useCallback(() => api.getMyStats(), []);
  const { data: stats, loading, error, reload } = useAsync<UserStats>(loadBadges, []);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const earnedBadges = stats?.badges || [];
  const totalBadges = stats?.total_badges || 0;

  if (loading && !stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60 }]}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ErrorState message="Não foi possível carregar as conquistas" onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[Typography.title2, { color: theme.text }]}>Conquistas</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ═══ STATS SUMMARY ═══ */}
      <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.md]}>
        <View style={[styles.summaryIcon, { backgroundColor: Colors.warning + '15' }]}>
          <MaterialIcons name="military-tech" size={32} color={Colors.warning} />
        </View>
        <Text style={[Typography.title1, { color: Colors.warning }]}>{totalBadges}</Text>
        <Text style={[Typography.subhead, { color: theme.textSecondary }]}>
          {totalBadges === 1 ? 'badge conquistado' : 'badges conquistados'}
        </Text>
      </View>

      {/* ═══ EARNED BADGES ═══ */}
      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={[Typography.title3, { color: theme.text, marginBottom: Spacing.base }]}>
            Suas Conquistas
          </Text>
          <View style={styles.badgesGrid}>
            {earnedBadges.map((userBadge: UserBadge) => {
              const rarityColor = RARITY_COLORS[userBadge.badge.rarity] || Colors.rarity.common;
              const badgeIcon = BADGE_ICONS[userBadge.badge.category] || 'military-tech';

              return (
                <View
                  key={userBadge.id}
                  style={[styles.badgeCard, { backgroundColor: theme.surface, borderColor: rarityColor + '40' }, Shadows.sm]}
                >
                  <View style={[styles.badgeIconContainer, { backgroundColor: rarityColor + '20' }]}>
                    <MaterialIcons name={badgeIcon} size={28} color={rarityColor} />
                  </View>
                  <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600', textAlign: 'center' }]} numberOfLines={2}>
                    {userBadge.badge.name}
                  </Text>
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
                    <Text style={[Typography.caption2, { color: rarityColor, fontWeight: '700' }]}>
                      {RARITY_LABELS[userBadge.badge.rarity] || userBadge.badge.rarity}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: theme.textTertiary, marginTop: Spacing.xs }]}>
                    {new Date(userBadge.awarded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {earnedBadges.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="emoji-events" size={80} color={theme.textTertiary} />
          <Text style={[Typography.title3, { color: theme.text }]}>Nenhum badge ainda</Text>
          <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl }]}>
            Complete missões, participe de eventos e convide amigos para ganhar badges exclusivos!
          </Text>
        </View>
      )}
    </ScrollView>
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
  summaryCard: {
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgeCard: {
    width: '47%',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  badgeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
