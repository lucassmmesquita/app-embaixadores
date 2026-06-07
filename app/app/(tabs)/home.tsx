/**
 * ═══════════════════════════════════════════════════════════════
 *  Home Screen — Dashboard com gamificação (Design Inácio)
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share as RNShare,
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

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<any>(null);
  const [featuredMissions, setFeaturedMissions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, missionsData] = await Promise.all([
        api.getMyStats(),
        api.getMissions(1, undefined, true),
      ]);
      setStats(statsData);
      setFeaturedMissions(missionsData.items?.slice(0, 3) || []);
    } catch {
      // Use placeholder data on error
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const levelColor = user?.current_level?.color || Colors.primary;
  const levelName = user?.current_level?.name || 'Apoiador';
  const progressPct = stats?.progress_percentage || 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 100, paddingBottom: 120 }}
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

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
              Progresso para o próximo nível
            </Text>
            <Text style={[Typography.caption1, { color: levelColor, fontWeight: '700' }]}>
              {Math.round(progressPct)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPct, 100)}%`, backgroundColor: levelColor },
              ]}
            />
          </View>
          {stats?.points_to_next_level > 0 && (
            <Text style={[Typography.caption2, { color: theme.textTertiary, marginTop: Spacing.xs }]}>
              Faltam {stats.points_to_next_level} pontos para {stats.next_level_name}
            </Text>
          )}
        </View>
      </View>

      {/* ═══ STATS GRID ═══ */}
      <View style={styles.statsGrid}>
        <StatCard
          theme={theme}
          icon="star"
          value={user?.total_points || 0}
          label="Pontos"
          color={Colors.warning}
        />
        <StatCard
          theme={theme}
          icon="flag"
          value={stats?.total_missions_completed || 0}
          label="Missões"
          color={Colors.success}
        />
        <StatCard
          theme={theme}
          icon="emoji-events"
          value={stats?.rank_position || '-'}
          label="Ranking"
          color={Colors.primary}
        />
        <StatCard
          theme={theme}
          icon="military-tech"
          value={stats?.total_badges || 0}
          label="Badges"
          color={Colors.themes.workers}
        />
      </View>

      {/* ═══ FEATURED MISSIONS ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.title3, { color: theme.text }]}>Missões em Destaque</Text>
          <Pressable onPress={() => router.push('/(tabs)/missions')}>
            <Text style={[Typography.subhead, { color: Colors.primary }]}>Ver todas</Text>
          </Pressable>
        </View>

        {featuredMissions.length > 0 ? (
          featuredMissions.map((mission: any, index: number) => (
            <Pressable
              key={mission.id || index}
              style={[styles.missionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(`/mission/${mission.id}`)}
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
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="flag" size={40} color={theme.textTertiary} />
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Nenhuma missão em destaque no momento
            </Text>
          </View>
        )}
      </View>

      {/* ═══ QUICK ACTIONS ═══ */}
      <View style={styles.section}>
        <Text style={[Typography.title3, { color: theme.text, marginBottom: Spacing.base }]}>
          Ações Rápidas
        </Text>
        <View style={styles.quickActions}>
          <QuickAction theme={theme} icon="share" label="Compartilhar" color={Colors.primary} onPress={() => router.push('/content')} />
          <QuickAction theme={theme} icon="group-add" label="Convidar" color={Colors.success} onPress={() => {
            if (user?.referral_code) {
              RNShare.share({
                message: `Junte-se à Rede de Embaixadores! Use meu código: ${user.referral_code}\n\nBaixe o app: https://embaixadores.app`,
              });
            }
          }} />
          <QuickAction theme={theme} icon="library-books" label="Materiais" color={Colors.themes.science} onPress={() => router.push('/content')} />
          <QuickAction theme={theme} icon="notifications" label="Avisos" color={Colors.accent} onPress={() => {}} />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ theme, icon, value, label, color }: { theme: any; icon: IconName; value: any; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }, Shadows.sm]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[Typography.title2, { color }]}>{value}</Text>
      <Text style={[Typography.caption2, { color: theme.textSecondary }]}>{label}</Text>
    </View>
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
  progressSection: { marginTop: Spacing.xs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
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
