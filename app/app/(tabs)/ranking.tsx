/**
 * ═══════════════════════════════════════════════════════════════
 *  Ranking Screen — Leaderboard
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
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

export default function RankingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getLeaderboard(50);
      setLeaderboard(data || []);
    } catch {
      // placeholder
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const podiumColors = [Colors.warning, '#A8A8A8', '#CD7F32'];
  const podiumIcons: Array<React.ComponentProps<typeof MaterialIcons>['name']> = ['looks-one', 'looks-two', 'looks-3'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ TOP 3 PODIUM ═══ */}
      {leaderboard.length >= 3 && (
        <View style={[styles.podium, { paddingTop: insets.top + 100 }]}>
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const isFirst = idx === 0;
            return (
              <View key={entry.user_id} style={[styles.podiumEntry, isFirst && styles.podiumFirst]}>
                <View style={[
                  styles.podiumAvatar,
                  { backgroundColor: entry.level_color || Colors.primary },
                  isFirst && styles.podiumAvatarFirst,
                ]}>
                  <Text style={[styles.podiumAvatarText, isFirst && { fontSize: 28 }]}>
                    {entry.full_name?.charAt(0)}
                  </Text>
                </View>
                <MaterialIcons name={podiumIcons[idx]} size={isFirst ? 28 : 22} color={podiumColors[idx]} style={{ marginTop: Spacing.xs }} />
                <Text style={[Typography.caption1, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                  {entry.full_name?.split(' ')[0]}
                </Text>
                <Text style={[Typography.caption2, { color: entry.level_color || Colors.primary, fontWeight: '700' }]}>
                  {entry.total_points} pts
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ═══ REST OF LEADERBOARD ═══ */}
      <FlatList
        data={leaderboard.slice(3)}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item, index }) => {
          const isMe = item.user_id === user?.id;
          return (
            <View style={[
              styles.rankRow,
              { backgroundColor: isMe ? Colors.primary + '10' : theme.surface },
              isMe && { borderColor: Colors.primary, borderWidth: 1 },
              Shadows.sm,
            ]}>
              <Text style={[Typography.headline, { color: theme.textSecondary, width: 32 }]}>
                {index + 4}
              </Text>
              <View style={[styles.rankAvatar, { backgroundColor: item.level_color || Colors.primary }]}>
                <Text style={styles.rankAvatarText}>{item.full_name?.charAt(0)}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>
                  {item.full_name} {isMe && '(Você)'}
                </Text>
                <Text style={[Typography.caption2, { color: item.level_color || theme.textTertiary }]}>
                  {item.level_name || 'Apoiador'}
                </Text>
              </View>
              <Text style={[Typography.headline, { color: Colors.primary }]}>
                {item.total_points}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="emoji-events" size={64} color={theme.textTertiary} />
            <Text style={[Typography.title3, { color: theme.text }]}>Ranking vazio</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Complete missões para aparecer no ranking!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  podiumEntry: { alignItems: 'center', flex: 1 },
  podiumFirst: { marginBottom: Spacing.base },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: { width: 64, height: 64, borderRadius: 32 },
  podiumAvatarText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  rankInfo: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['5xl'], gap: Spacing.base },
});
