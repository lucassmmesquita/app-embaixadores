/**
 * ═══════════════════════════════════════════════════════════════
 *  Home Screen — Dashboard com gamificação (Design Inácio)
 *  BLK-02: Loading/Error/Empty states reais, sem catch silencioso
 * ═══════════════════════════════════════════════════════════════
 */

import { useFocusEffect, useRouter } from 'expo-router';
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
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHero, SkeletonStats, SkeletonList } from '../../components/ui/Skeleton';
import LevelJourney from '../../components/gamification/LevelJourney';
import type { Mission, UserStats } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface HomeData {
  stats: UserStats;
  featuredMissions: Mission[];
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // BLK-02: Use useAsync instead of silent catch
  const loadHomeData = useCallback(async (): Promise<HomeData> => {
    const [statsData, missionsData] = await Promise.all([
      api.getMyStats(),
      api.getMissions(1, undefined, true),
    ]);
    return {
      stats: statsData,
      featuredMissions: missionsData.items?.slice(0, 3) || [],
    };
  }, []);

  const { data, loading, error, reload } = useAsync(loadHomeData, []);
  const [refreshing, setRefreshing] = useState(false);

  const stats = data?.stats;
  const featuredMissions = data?.featuredMissions || [];

  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), refreshProfile()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      // Silent refresh when screen is focused
      reload();
      refreshProfile();
    }, [reload, refreshProfile])
  );

  const levelColor = user?.current_level?.color || Colors.primary;
  const levelName = user?.current_level?.name || 'Apoiador';
  const progressPct = stats?.progress_percentage || 0;
  const isMaxLevel = stats && stats.points_to_next_level === 0 && stats.current_level_order > 0;

  // ═══ LOADING STATE ═══
  if (loading && !data) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 120 }}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.surface }, Shadows.lg]}>
          <SkeletonHero />
        </View>
        <SkeletonStats />
        <View style={styles.section}>
          <SkeletonList count={3} />
        </View>
      </ScrollView>
    );
  }

  // ═══ ERROR STATE ═══
  if (error && !data) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <ErrorState
          message={error.message || 'Não foi possível carregar os dados. Verifique sua conexão.'}
          onRetry={reload}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* ═══ GREETING CARD ═══ */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface }, Shadows.lg]}>
        <View style={styles.heroTop}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: levelColor }]}>
              <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || '?'}</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelBadgeText}>{user?.current_level?.order_index || 1}</Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={[Typography.title3, { color: theme.text }]}>
              Olá, {user?.full_name?.split(' ')[0] || 'Embaixador'}!
            </Text>
            <View style={[styles.levelTag, { backgroundColor: levelColor + '20' }]}>
              <Text style={[Typography.caption1, { color: levelColor, fontWeight: '600' }]}>
                {levelName}
              </Text>
            </View>
          </View>
        </View>

        {/* Level Journey Trail — visual level progression */}
        <LevelJourney
          currentLevelOrder={stats?.current_level_order || user?.current_level?.order_index || 1}
          totalPoints={stats?.total_points ?? user?.total_points ?? 0}
          theme={theme}
        />

        {/* Points to next level hint */}
        {isMaxLevel && !stats?.level_pending_approval ? (
          <Text style={[Typography.caption2, { color: Colors.success, marginTop: Spacing.sm, textAlign: 'center' }]}>
            🏆 Parabéns! Você alcançou o nível máximo!
          </Text>
        ) : stats?.level_pending_approval ? (
          <Text style={[Typography.caption2, { color: Colors.warning, marginTop: Spacing.sm, textAlign: 'center' }]}>
            ⏳ Promoção para {stats.next_level_name} aguardando aprovação
          </Text>
        ) : stats?.points_to_next_level != null && stats.points_to_next_level > 0 ? (
          <Text style={[Typography.caption2, { color: theme.textTertiary, marginTop: Spacing.sm, textAlign: 'center' }]}>
            Faltam {stats.points_to_next_level} pontos para {stats.next_level_name || 'o próximo nível'}
          </Text>
        ) : null}
      </View>

      {/* ═══ QUICK ACTIONS — RF-HOME-06 ═══ */}
      <View style={styles.section}>
        <Text style={[Typography.title3, { color: theme.text, marginBottom: Spacing.base }]}>
          Ações Rápidas
        </Text>
        <View style={styles.quickActions}>
          <QuickAction theme={theme} icon="group-add" label="Convidar" color={Colors.success} onPress={() => router.push('/(tabs)/invitations' as any)} />
          <QuickAction theme={theme} icon="library-books" label="Materiais" color={Colors.themes.science} onPress={() => router.push('/(tabs)/content' as any)} />
          <QuickAction theme={theme} icon="notifications" label="Avisos" color={Colors.accent} onPress={() => router.push('/(tabs)/notifications' as any)} />
        </View>
      </View>

      {/* ═══ STATS GRID ═══ */}
      <View style={styles.statsGrid}>
        <StatCard
          theme={theme}
          icon="star"
          value={stats?.total_points ?? user?.total_points ?? 0}
          label="Pontos"
          color={Colors.warning}
          onPress={() => router.push('/history' as any)}
        />
        <StatCard
          theme={theme}
          icon="flag"
          value={stats?.total_missions_completed || 0}
          label="Missões"
          color={Colors.success}
          onPress={() => router.push('/(tabs)/missions' as any)}
        />
        <StatCard
          theme={theme}
          icon="emoji-events"
          value={stats?.rank_position || '-'}
          label="Ranking"
          color={Colors.primary}
          onPress={() => router.push('/(tabs)/ranking' as any)}
        />
        <StatCard
          theme={theme}
          icon="military-tech"
          value={stats?.total_badges || 0}
          label="Conquistas"
          color={Colors.themes.workers}
          onPress={() => router.push('/badges')}
        />
      </View>

      {/* ═══ FEATURED MISSIONS — RF-HOME-03 ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.title3, { color: theme.text }]}>Missões em Destaque</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/missions')}
            accessibilityRole="button"
            accessibilityLabel="Ver todas as missões"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={[Typography.subhead, { color: Colors.primary }]}>Ver todas</Text>
          </Pressable>
        </View>

        {featuredMissions.length > 0 ? (
          featuredMissions.map((mission: Mission) => (
            <Pressable
              key={mission.id}
              style={[styles.missionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(`/mission/${mission.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Missão: ${mission.title}, ${mission.points_reward} pontos`}
            >
              <View style={[styles.missionIcon, { backgroundColor: Colors.primary + '15' }]}>
                <MaterialIcons name="flag" size={22} color={Colors.primary} />
              </View>
              <View style={styles.missionInfo}>
                <Text style={[Typography.headline, { color: theme.text }]}>{mission.title}</Text>
                <Text style={[Typography.caption1, { color: theme.textSecondary }]} numberOfLines={2}>
                  {mission.description}
                </Text>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: Colors.success + '20' }]}>
                <Text style={[Typography.caption1, { color: Colors.success, fontWeight: '700' }]}>
                  +{mission.points_reward} pts
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="flag"
            iconColor={Colors.primary}
            title="Nenhuma missão em destaque"
            description="Novas missões serão publicadas em breve!"
          />
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ theme, icon, value, label, color, onPress }: { theme: any; icon: IconName; value: any; label: string; color: string; onPress?: () => void }) {
  return (
    <Pressable style={[styles.statCard, { backgroundColor: theme.surface }, Shadows.sm]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Stat: ${label}`}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[Typography.title2, { color }]}>{value}</Text>
      <Text style={[Typography.caption1, { color: theme.textSecondary, marginTop: Spacing.xs }]}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({ theme, icon, label, color, onPress }: { theme: any; icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
        Shadows.sm,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[Typography.caption1, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, marginBottom: Spacing.lg },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, color: '#fff', fontWeight: '700' },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  levelBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  heroInfo: { flex: 1 },
  levelTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  missionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionInfo: { flex: 1, gap: Spacing.xs },
  pointsBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    gap: Spacing.base,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
