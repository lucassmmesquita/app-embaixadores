/**
 * ═══════════════════════════════════════════════════════════════
 *  Missions Screen — Browse and track with status tabs
 *  PRD §4.2: AVAILABLE→IN_PROGRESS→SUBMITTED→COMPLETED/REJECTED
 *  BLK-02: Loading/Error/Empty states reais
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useMissionStore } from '../../stores/missionStore';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import type { Mission, UserMission, UserMissionStatus } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const STATUS_META: Record<string, { color: string; icon: IconName; label: string }> = {
  in_progress: { color: Colors.warning, icon: 'hourglass-top', label: 'Em Progresso' },
  submitted: { color: Colors.info, icon: 'pending', label: 'Em Revisão' },
  pending_verification: { color: Colors.info, icon: 'pending', label: 'Enviada' },
  completed: { color: Colors.success, icon: 'check-circle', label: 'Concluída' },
  rejected: { color: Colors.danger, icon: 'cancel', label: 'Rejeitada' },
  expired: { color: Colors.danger, icon: 'timer-off', label: 'Expirada' },
  cancelled: { color: Colors.danger, icon: 'cancel', label: 'Cancelada' },
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONE_TIME: 'Única',
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  PER_EVENT: 'Por Evento',
};

type TabKey = 'available' | 'in_progress' | 'completed';

export default function MissionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    missions,
    categories,
    myMissions,
    selectedCategory,
    isLoadingMissions,
    missionsError,
    loadMissions,
    loadCategories,
    loadMyMissions,
    setSelectedCategory,
  } = useMissionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('available');

  useEffect(() => {
    loadCategories();
    loadMissions(1, selectedCategory || undefined);
    loadMyMissions();
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMissions(1, selectedCategory || undefined),
      loadMyMissions(),
    ]);
    setRefreshing(false);
  };

  // Group my missions by status
  const inProgressMissions = myMissions.filter(
    (m) => ['in_progress', 'submitted', 'pending_verification'].includes(m.status)
  );
  const completedMissions = myMissions.filter(
    (m) => ['completed'].includes(m.status)
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'available', label: 'Disponíveis', count: missions.length },
    { key: 'in_progress', label: 'Em Progresso', count: inProgressMissions.length },
    { key: 'completed', label: 'Concluídas', count: completedMissions.length },
  ];

  const renderMissionCard = (mission: Mission) => {
    const recurrenceLabel = RECURRENCE_LABELS[mission.recurrence] || mission.recurrence;
    const isRecurring = mission.recurrence !== 'ONE_TIME';
    const categoryName = mission.category?.name;

    return (
      <Pressable
        key={mission.id}
        style={({ pressed }) => [
          styles.missionCard,
          { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
          Shadows.sm,
        ]}
        onPress={() => router.push(`/mission/${mission.id}`)}
      >
        {mission.is_featured && (
          <View style={[styles.featuredBadge, { backgroundColor: Colors.warning + '20' }]}>
            <Text style={[Typography.caption2, { color: Colors.warning, fontWeight: '700' }]}><MaterialIcons name="star" size={10} /> DESTAQUE</Text>
          </View>
        )}
        <Text style={[Typography.headline, { color: theme.text }]}>{mission.title}</Text>
        <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.xs }]} numberOfLines={2}>
          {mission.description}
        </Text>
        <View style={styles.missionMeta}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, flexShrink: 1 }}>
            <View style={[styles.typeBadge, { backgroundColor: theme.surfaceElevated }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name={isRecurring ? 'loop' : 'check-circle'} size={12} color={theme.textSecondary} />
                <Text style={[Typography.caption2, { color: theme.textSecondary }]}>
                  {recurrenceLabel}
                </Text>
              </View>
            </View>
            {categoryName && (
              <View style={[styles.typeBadge, { backgroundColor: (mission.category?.color || Colors.primary) + '15' }]}>
                <Text style={[Typography.caption2, { color: mission.category?.color || Colors.primary, fontWeight: '600' }]} numberOfLines={1}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.pointsBadge, { backgroundColor: Colors.success + '15' }]}>
            <Text style={[Typography.subhead, { color: Colors.success, fontWeight: '700' }]}>
              +{mission.points_reward} pts
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderUserMissionCard = (um: UserMission) => {
    const statusMeta = STATUS_META[um.status] || STATUS_META.in_progress;
    const hasRejection = !!um.rejected_reason;

    return (
      <Pressable
        key={um.id}
        style={({ pressed }) => [
          styles.missionCard,
          { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1, borderLeftWidth: 3, borderLeftColor: statusMeta.color },
          Shadows.sm,
        ]}
        onPress={() => router.push(`/mission/${um.mission_id}`)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[Typography.headline, { color: theme.text, flex: 1 }]}>{um.mission?.title || 'Missão'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.color + '15' }]}>
            <MaterialIcons name={statusMeta.icon} size={12} color={statusMeta.color} />
            <Text style={[Typography.caption2, { color: statusMeta.color, fontWeight: '600' }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>
        {um.rejected_reason && (
          <View style={[styles.rejectedBanner, { backgroundColor: Colors.danger + '10' }]}>
            <MaterialIcons name="info" size={14} color={Colors.danger} />
            <Text style={[Typography.caption1, { color: Colors.danger }]}>{um.rejected_reason}</Text>
          </View>
        )}
        <View style={styles.missionMeta}>
          <Text style={[Typography.caption1, { color: theme.textTertiary }]}>
            Progresso: {um.progress_count}/{um.mission?.required_count || 1}
          </Text>
          <View style={[styles.pointsBadge, { backgroundColor: Colors.success + '15' }]}>
            <Text style={[Typography.subhead, { color: Colors.success, fontWeight: '700' }]}>
              +{um.mission?.points_reward || 0} pts
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const getListData = () => {
    switch (activeTab) {
      case 'in_progress': return inProgressMissions;
      case 'completed': return completedMissions;
      default: return [];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ TABS ═══ */}
      <View style={[styles.tabsContainer, { paddingTop: insets.top + 56 }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              Typography.subhead,
              { color: activeTab === tab.key ? Colors.primary : theme.textSecondary, fontWeight: '600' },
            ]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? Colors.primary : theme.surfaceElevated }]}>
                <Text style={[Typography.caption2, { color: activeTab === tab.key ? '#fff' : theme.textSecondary, fontWeight: '700' }]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* ═══ CATEGORY FILTER (only for available tab) ═══ */}
      {activeTab === 'available' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <Pressable
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
              { borderColor: theme.border },
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              Typography.caption1,
              { color: !selectedCategory ? '#fff' : theme.text, fontWeight: '600' },
            ]}>
              Todas
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
                { borderColor: theme.border },
              ]}
              onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            >
              {cat.icon ? <Text style={{ fontSize: 12 }}>{cat.icon}</Text> : null}
              <Text
                style={[
                  Typography.caption1,
                  { color: selectedCategory === cat.id ? '#fff' : theme.text, fontWeight: '500' },
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ═══ CONTENT ═══ */}
      {activeTab === 'available' ? (
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => renderMissionCard(item)}
          ListEmptyComponent={
            isLoadingMissions ? (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <SkeletonList count={5} />
              </View>
            ) : missionsError ? (
              <ErrorState
                message={missionsError.message || 'Não foi possível carregar as missões.'}
                onRetry={() => loadMissions(1, selectedCategory || undefined)}
              />
            ) : (
              <EmptyState
                icon="flag"
                iconColor={Colors.success}
                title="Nenhuma missão encontrada"
                description="Novas missões serão adicionadas em breve!"
              />
            )
          }
        />
      ) : (
        <FlatList
          data={getListData()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => renderUserMissionCard(item)}
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'in_progress' ? 'hourglass-empty' : 'check-circle-outline'}
              iconColor={activeTab === 'in_progress' ? Colors.warning : Colors.success}
              title={activeTab === 'in_progress' ? 'Nenhuma missão em progresso' : 'Nenhuma missão concluída'}
              description={activeTab === 'in_progress' ? 'Inicie uma missão na aba "Disponíveis"!' : 'Complete missões para ver aqui!'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoriesContainer: { marginBottom: Spacing.xs },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 32,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  missionCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  missionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  pointsBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
