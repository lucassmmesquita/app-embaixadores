/**
 * ═══════════════════════════════════════════════════════════════
 *  Ranking Screen — Leaderboard redesenhado
 *  "Sua Posição" fixo no topo + pódio visual + lista scrollável
 *  PRD §5.2: Exibir posição do usuário mesmo fora do top-N
 *  BLK-02: Loading/Error/Empty states reais
 * ═══════════════════════════════════════════════════════════════
 */
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import type { LeaderboardEntry, UserRank } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function RankingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [topN, setTopN] = useState<10 | 50 | 100>(50);

  const filters = [
    { key: 10 as const, label: 'Top 10' },
    { key: 50 as const, label: 'Top 50' },
    { key: 100 as const, label: 'Todos' },
  ];

  const loadRanking = useCallback(async () => {
    const [data, rank] = await Promise.all([
      api.getLeaderboard(topN),
      api.getMyRank(),
    ]);
    return { leaderboard: data || [], myRank: rank };
  }, [topN]);

  const { data, loading, error, reload } = useAsync(loadRanking, [topN]);
  const leaderboard = data?.leaderboard || [];
  const myRank = data?.myRank || null;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // ouro, prata, bronze
  const podiumIcons: IconName[] = ['looks-one', 'looks-two', 'looks-3'];

  // ═══ ERROR STATE ═══
  if (error && !data) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Spacing.base }]}>
        <ErrorState
          message={error.message || 'Não foi possível carregar o ranking.'}
          onRetry={reload}
        />
      </View>
    );
  }

  /* ═══ HEADER FIXO: Sua Posição + Filtros ═══ */
  const renderFixedHeader = () => (
    <View style={[styles.fixedHeader, { backgroundColor: theme.background }]}>
      {/* ═══ SUA POSIÇÃO — card destacado ═══ */}
      <View style={[styles.myPositionCard, { backgroundColor: theme.surface }, Shadows.md]}>
        <View style={styles.myPositionLeft}>
          {/* Avatar */}
          <View style={[styles.myAvatar, { backgroundColor: user?.current_level?.color || Colors.primary }]}>
            <Text style={styles.myAvatarText}>{user?.full_name?.charAt(0) || '?'}</Text>
          </View>
          {/* Info */}
          <View style={styles.myInfo}>
            <Text style={[styles.myLabel, { color: theme.textSecondary }]}>Sua posição</Text>
            <Text style={[styles.myName, { color: theme.text }]} numberOfLines={1}>
              {user?.full_name || 'Você'}
            </Text>
            <Text style={[styles.myPoints, { color: user?.current_level?.color || Colors.primary }]}>
              {myRank?.total_points ?? user?.total_points ?? 0} pontos
            </Text>
          </View>
        </View>

        {/* Posição numérica */}
        <View style={styles.myRankBadge}>
          <Text style={styles.myRankHash}>#</Text>
          <Text style={styles.myRankNumber}>{myRank?.rank ?? '—'}</Text>
        </View>
      </View>

      {/* ═══ FILTROS ═══ */}
      <View style={styles.filtersRow}>
        {filters.map((f) => {
          const isActive = topN === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setTopN(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? Colors.primary : theme.surface,
                  borderColor: isActive ? Colors.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={f.label}
            >
              <Text style={[
                styles.filterText,
                { color: isActive ? '#FFFFFF' : theme.text },
              ]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  /* ═══ PÓDIO — Top 3 ═══ */
  const renderPodium = () => {
    if (leaderboard.length < 3) return null;

    // Ordem visual: 2°, 1°, 3° (1° no centro, mais alto)
    const podiumOrder = [1, 0, 2];

    return (
      <View style={[styles.podiumContainer, { backgroundColor: theme.surface }, Shadows.sm]}>
        <Text style={[styles.podiumTitle, { color: theme.text }]}>🏆 Pódio</Text>
        <View style={styles.podiumRow}>
          {podiumOrder.map((idx) => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const isFirst = idx === 0;
            const isMe = entry.user_id === user?.id;
            const avatarSize = isFirst ? 64 : 48;

            return (
              <View key={entry.user_id} style={styles.podiumEntry}>
                {/* Pedestal visual */}
                <View style={[
                  styles.podiumPedestal,
                  { height: isFirst ? 80 : idx === 1 ? 60 : 44 },
                ]}>
                  {/* Avatar */}
                  <View style={[
                    styles.podiumAvatar,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                      backgroundColor: entry.level_color || Colors.primary,
                    },
                    isMe && { borderWidth: 3, borderColor: Colors.primary },
                  ]}>
                    <Text style={[styles.podiumAvatarText, isFirst && { fontSize: 26 }]}>
                      {entry.full_name?.charAt(0)}
                    </Text>
                  </View>

                  {/* Medalha */}
                  <View style={[styles.medalBadge, { backgroundColor: podiumColors[idx] }]}>
                    <Text style={styles.medalText}>{idx + 1}°</Text>
                  </View>
                </View>

                {/* Nome + pontos */}
                <Text style={[styles.podiumName, { color: theme.text }]} numberOfLines={1}>
                  {entry.full_name}
                  {isMe ? ' (Você)' : ''}
                </Text>
                <Text style={[styles.podiumPoints, { color: podiumColors[idx] }]}>
                  {entry.total_points} pts
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  /* ═══ ITEM DA LISTA (4° em diante) ═══ */
  const renderRankItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const position = index + 4;
    const isMe = item.user_id === user?.id;

    return (
      <View style={[
        styles.rankRow,
        {
          backgroundColor: isMe ? Colors.primary + '08' : theme.surface,
          borderColor: isMe ? Colors.primary : 'transparent',
          borderWidth: isMe ? 1.5 : 0,
        },
        Shadows.sm,
      ]}>
        {/* Posição */}
        <View style={styles.positionCol}>
          <Text style={[styles.positionText, { color: theme.textTertiary }]}>
            {position}
          </Text>
        </View>

        {/* Avatar */}
        <View style={[styles.rankAvatar, { backgroundColor: item.level_color || Colors.primary }]}>
          <Text style={styles.rankAvatarText}>{item.full_name?.charAt(0)}</Text>
        </View>

        {/* Nome + nível */}
        <View style={styles.rankInfo}>
          <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>
            {item.full_name}{isMe ? ' (Você)' : ''}
          </Text>
          <View style={[styles.levelPill, { backgroundColor: (item.level_color || Colors.primary) + '18' }]}>
            <Text style={[styles.levelPillText, { color: item.level_color || Colors.primary }]}>
              {item.level_name || 'Apoiador'}
            </Text>
          </View>
        </View>

        {/* Pontos */}
        <View style={styles.pointsCol}>
          <Text style={[styles.pointsValue, { color: Colors.primary }]}>
            {item.total_points}
          </Text>
          <Text style={[styles.pointsLabel, { color: theme.textTertiary }]}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ TOPO FIXO — Sua Posição + Filtros ═══ */}
      {renderFixedHeader()}

      {/* ═══ CONTEÚDO SCROLLÁVEL ═══ */}
      <FlatList
        data={leaderboard.slice(3)}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={renderPodium}
        renderItem={renderRankItem}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: Spacing.base }}>
              <SkeletonList count={5} />
            </View>
          ) : (
            <EmptyState
              icon="emoji-events"
              iconColor={Colors.warning}
              title="Ranking vazio"
              description="Complete missões para aparecer no ranking!"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ═══ HEADER FIXO ═══ */
  fixedHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },

  /* ═══ SUA POSIÇÃO ═══ */
  myPositionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  myPositionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  myAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myAvatarText: { fontSize: 18, color: '#fff', fontWeight: '800' },
  myInfo: { flex: 1 },
  myLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, marginBottom: 1 },
  myName: { fontSize: 16, fontWeight: '800', marginBottom: 1 },
  myPoints: { fontSize: 12, fontWeight: '700' },
  myRankBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 2,
  },
  myRankHash: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  myRankNumber: { fontSize: 24, color: '#FFFFFF', fontWeight: '900' },

  /* ═══ FILTROS ═══ */
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* ═══ LISTA ═══ */
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 120,
  },

  /* ═══ PÓDIO ═══ */
  podiumContainer: {
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.base,
  },
  podiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  podiumEntry: {
    flex: 1,
    alignItems: 'center',
  },
  podiumPedestal: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  podiumAvatarText: { fontSize: 20, color: '#fff', fontWeight: '800' },
  medalBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  medalText: { fontSize: 9, color: '#FFFFFF', fontWeight: '900' },
  podiumName: { fontSize: 12, fontWeight: '700', marginTop: Spacing.sm, textAlign: 'center' },
  podiumPoints: { fontSize: 11, fontWeight: '800' },

  /* ═══ RANK ROW (4° em diante) ═══ */
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  positionCol: {
    width: 28,
    alignItems: 'center',
  },
  positionText: {
    fontSize: 15,
    fontWeight: '800',
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  rankInfo: { flex: 1, gap: 2 },
  rankName: { fontSize: 14, fontWeight: '600' },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  levelPillText: { fontSize: 10, fontWeight: '700' },
  pointsCol: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 16, fontWeight: '900' },
  pointsLabel: { fontSize: 9, fontWeight: '600' },
});
