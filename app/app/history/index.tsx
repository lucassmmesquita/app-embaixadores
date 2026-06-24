/**
 * ═══════════════════════════════════════════════════════════════
 *  Points History Screen — Timeline de point_transactions
 *  PRD §6.1.4: Histórico de atividades e pontos (transparência do ledger)
 *  Fase 3: RF-GAM-15 — useAsync + error/loading states
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
import { SkeletonList } from '../../components/ui/Skeleton';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';
import type { PointTransaction } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const SOURCE_META: Record<string, { icon: IconName; color: string; label: string }> = {
  registration: { icon: 'person-add', color: Colors.success, label: 'Cadastro' },
  mission: { icon: 'flag', color: Colors.success, label: 'Missão' },
  event: { icon: 'event', color: Colors.primary, label: 'Evento' },
  event_share: { icon: 'share', color: Colors.primary, label: 'Compartilhamento de Evento' },
  event_click: { icon: 'touch-app', color: Colors.primary, label: 'Clique em Evento' },
  invitation: { icon: 'group-add', color: Colors.themes.youth, label: 'Convite' },
  invite: { icon: 'group-add', color: Colors.themes.youth, label: 'Convite' },
  content_share: { icon: 'share', color: Colors.themes.science, label: 'Compartilhamento' },
  material_click: { icon: 'touch-app', color: Colors.themes.science, label: 'Clique em Material' },
  badge: { icon: 'military-tech', color: Colors.warning, label: 'Badge' },
  level_up: { icon: 'trending-up', color: Colors.themes.workers, label: 'Nível' },
  admin: { icon: 'admin-panel-settings', color: Colors.accent, label: 'Admin' },
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Fase 3: useAsync instead of silent catch
  const loadHistory = useCallback(() => api.getPointsHistory(100), []);
  const { data: transactions, loading, error, reload } = useAsync<PointTransaction[]>(loadHistory, []);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const filteredTransactions = filter
    ? (transactions || []).filter((t) => t.source_type === filter)
    : (transactions || []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const filterOptions = [
    { key: null, label: 'Todos' },
    { key: 'registration', label: 'Cadastro' },
    { key: 'mission', label: 'Missões' },
    { key: 'event', label: 'Eventos' },
    { key: 'invitation', label: 'Convites' },
    { key: 'content_share', label: 'Compartilhamentos' },
  ];

  return (
    <ScreenWithNav title="Histórico de Pontos" showBack>
      <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ═══ FILTERS ═══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filterOptions.map((item) => (
          <Pressable
            key={item.key || 'all'}
            style={[
              styles.filterChip,
              { borderColor: theme.border },
              filter === item.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[
              Typography.caption1,
              { color: filter === item.key ? '#fff' : theme.text, fontWeight: '500' },
            ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ═══ TRANSACTIONS LIST ═══ */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const meta = SOURCE_META[item.source_type] || { icon: 'star' as IconName, color: Colors.primary, label: item.source_type };
          const isPositive = item.points > 0;

          return (
            <View style={[styles.transactionCard, { backgroundColor: theme.surface }, Shadows.sm]}>
              <View style={[styles.transactionIcon, { backgroundColor: meta.color + '15' }]}>
                <MaterialIcons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>
                  {item.description || meta.label}
                </Text>
                <Text style={[Typography.caption2, { color: theme.textTertiary }]}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: (isPositive ? Colors.success : Colors.danger) + '15' }]}>
                <Text style={[Typography.headline, { color: isPositive ? Colors.success : Colors.danger }]}>
                  {isPositive ? '+' : ''}{item.points}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={theme.textTertiary} />
            <Text style={[Typography.title3, { color: theme.text }]}>Nenhum registro</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Complete missões para acumular pontos!
            </Text>
          </View>
        }
      />
    </View>
    </ScreenWithNav>
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
  filtersContainer: { marginBottom: Spacing.xs, maxHeight: 44, flexShrink: 0 },
  filtersContent: { paddingHorizontal: Spacing.base, gap: Spacing.sm, alignItems: 'center', height: 44 },
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
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: { flex: 1, gap: 2 },
  pointsBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
