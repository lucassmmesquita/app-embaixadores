/**
 * ═══════════════════════════════════════════════════════════════
 *  Events Screen — Browse campaign events
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const EVENT_TYPE_LABELS: Record<string, { icon: IconName; label: string }> = {
  meeting: { icon: 'handshake', label: 'Reunião' },
  rally: { icon: 'campaign', label: 'Comício' },
  training: { icon: 'school', label: 'Treinamento' },
  community: { icon: 'location-city', label: 'Comunitário' },
  online: { icon: 'laptop', label: 'Online' },
  exclusive: { icon: 'star', label: 'Exclusivo' },
};

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getEvents(1);
      setEvents(data.items || []);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: Spacing.base,
          paddingTop: insets.top + 100,
          paddingBottom: 120,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const typeInfo = EVENT_TYPE_LABELS[item.event_type] || { icon: 'event' as IconName, label: item.event_type };
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
                  <MaterialIcons name={typeInfo.icon} size={12} color={theme.textSecondary} />
                  <Text style={[Typography.caption2, { color: theme.textSecondary }]}>{typeInfo.label}</Text>
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
          <View style={styles.emptyState}>
            <MaterialIcons name="event" size={64} color={theme.textTertiary} />
            <Text style={[Typography.title3, { color: theme.text }]}>Nenhum evento próximo</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Novos eventos serão publicados em breve!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
