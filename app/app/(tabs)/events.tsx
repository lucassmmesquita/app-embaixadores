/**
 * ═══════════════════════════════════════════════════════════════
 *  Events Screen — Browse campaign events
 *  BLK-02: Loading/Error/Empty states reais
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
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
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import type { Event } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const EVENT_TYPE_LABELS: Record<string, { icon: IconName; label: string }> = {
  meeting: { icon: 'handshake', label: 'Reunião' },
  rally: { icon: 'campaign', label: 'Comício' },
  training: { icon: 'school', label: 'Treinamento' },
  community: { icon: 'location-city', label: 'Comunitário' },
  online: { icon: 'laptop', label: 'Online' },
  exclusive: { icon: 'star', label: 'Exclusivo' },
};

const EVENT_FILTERS: { key: string | null; label: string; icon: IconName }[] = [
  { key: null, label: 'Todos', icon: 'list' },
  { key: 'upcoming', label: 'Próximos', icon: 'schedule' },
  { key: 'online', label: 'Online', icon: 'laptop' },
  { key: 'presencial', label: 'Presencial', icon: 'location-on' },
];

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // BLK-02: Proper data loading with error handling
  const loadEvents = useCallback(async () => {
    const data = await api.getEvents(1);
    return data.items || [];
  }, []);

  const { data: events, loading, error, reload } = useAsync<Event[]>(loadEvents, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Apply filters
  const filteredEvents = (() => {
    const all = events || [];
    const now = new Date();
    switch (selectedFilter) {
      case 'upcoming':
        return [...all]
          .filter((e) => new Date(e.start_datetime) >= now)
          .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      case 'online':
        return all.filter((e) => e.event_type === 'online' || !!e.online_url);
      case 'presencial':
        return all.filter((e) => e.event_type !== 'online' && !e.online_url);
      default:
        return all;
    }
  })();

  // ═══ LOADING STATE ═══
  if (loading && !events) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ paddingTop: Spacing.base, paddingHorizontal: Spacing.base }}>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

  // ═══ ERROR STATE ═══
  if (error && !events) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Spacing.base }]}>
        <ErrorState
          message={error.message || 'Não foi possível carregar os eventos.'}
          onRetry={reload}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ FILTER CHIPS ═══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {EVENT_FILTERS.map((filter) => (
          <Pressable
            key={filter.key || 'all'}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive,
              { borderColor: theme.border },
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <MaterialIcons
              name={filter.icon}
              size={14}
              color={selectedFilter === filter.key ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                Typography.caption1,
                { color: selectedFilter === filter.key ? '#fff' : theme.text, fontWeight: '500' },
              ]}
              numberOfLines={1}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ═══ EVENTS LIST ═══ */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: Spacing.base,
          paddingTop: Spacing.sm,
          paddingBottom: 120,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const isOnline = item.event_type === 'online' || !!item.online_url;
          const modeInfo = isOnline
            ? { icon: 'laptop' as IconName, label: 'Online' }
            : { icon: 'location-on' as IconName, label: 'Presencial' };
          return (
            <Pressable
              style={({ pressed }) => [
                styles.eventCard,
                { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
                Shadows.md,
              ]}
              onPress={() => router.push(`/event/${item.id}`)}
            >
              {/* Date badge */}
              <View style={[styles.dateBadge, { backgroundColor: Colors.primary }]}>
                <Text style={[Typography.title2, { color: '#fff' }]}>
                  {new Date(item.start_datetime).getDate()}
                </Text>
                <Text style={[Typography.caption2, { color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }]}>
                  {new Date(item.start_datetime).toLocaleDateString('pt-BR', { month: 'short' })}
                </Text>
              </View>

              <View style={styles.eventInfo}>
                <View style={[styles.eventTypeBadge, { backgroundColor: theme.surfaceElevated }]}>
                  <MaterialIcons name={modeInfo.icon} size={12} color={theme.textSecondary} />
                  <Text style={[Typography.caption2, { color: theme.textSecondary }]}>{modeInfo.label}</Text>
                </View>
                <Text style={[Typography.headline, { color: theme.text }]}>{item.title}</Text>
                {item.location_name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="location-on" size={13} color={theme.textSecondary} />
                    <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
                      {item.location_name}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="schedule" size={13} color={theme.textTertiary} />
                  <Text style={[Typography.caption1, { color: theme.textTertiary }]}>
                    {formatTime(item.start_datetime)}
                  </Text>
                </View>
                {item.points_reward > 0 && (
                  <View style={[styles.rewardBadge, { backgroundColor: Colors.success + '15' }]}>
                    <Text style={[Typography.caption2, { color: Colors.success, fontWeight: '700' }]}>
                      +{item.points_reward} pts por participar
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="event"
            iconColor={Colors.primary}
            title={selectedFilter ? 'Nenhum evento encontrado' : 'Nenhum evento próximo'}
            description={selectedFilter ? 'Tente outro filtro ou volte mais tarde!' : 'Novos eventos serão publicados em breve!'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersContainer: { marginBottom: Spacing.xs, maxHeight: 44, flexShrink: 0 },
  filtersContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    alignItems: 'center',
    height: 44,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 32,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  eventCard: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    gap: Spacing.base,
  },
  dateBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: { flex: 1, gap: Spacing.xs },
  eventTypeBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['5xl'], gap: Spacing.base },
});
