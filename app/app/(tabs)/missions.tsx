/**
 * ═══════════════════════════════════════════════════════════════
 *  Missions Screen — Browse and track missions
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
import api from '../../services/api';

export default function MissionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [cats, missionsData] = await Promise.all([
        api.getMissionCategories(),
        api.getMissions(1, selectedCategory || undefined),
      ]);
      setCategories(cats || []);
      setMissions(missionsData.items || []);
    } catch {
      // placeholder
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ CATEGORY FILTER ═══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoriesContainer, { paddingTop: insets.top + 100 }]}
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
            Typography.subhead,
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
            <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
            <Text style={[
              Typography.subhead,
              { color: selectedCategory === cat.id ? '#fff' : theme.text, fontWeight: '500' },
            ]}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ═══ MISSIONS LIST ═══ */}
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.missionCard,
              { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
              Shadows.sm,
            ]}
            onPress={() => router.push(`/mission/${item.id}`)}
          >
            {item.is_featured && (
              <View style={[styles.featuredBadge, { backgroundColor: Colors.warning + '20' }]}>
                <Text style={[Typography.caption2, { color: Colors.warning, fontWeight: '700' }]}><MaterialIcons name="star" size={10} /> DESTAQUE</Text>
              </View>
            )}
            <Text style={[Typography.headline, { color: theme.text }]}>{item.title}</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.xs }]} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.missionMeta}>
              <View style={[styles.typeBadge, { backgroundColor: theme.surfaceElevated }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name={item.mission_type === 'recurring' ? 'loop' : 'check-circle'} size={12} color={theme.textSecondary} />
                  <Text style={[Typography.caption2, { color: theme.textSecondary }]}>
                    {item.mission_type === 'recurring' ? 'Recorrente' : 'Única'}
                  </Text>
                </View>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: Colors.success + '15' }]}>
                <Text style={[Typography.subhead, { color: Colors.success, fontWeight: '700' }]}>
                  +{item.points_reward} pts
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="flag" size={64} color={theme.textTertiary} />
            <Text style={[Typography.title3, { color: theme.text }]}>Nenhuma missão encontrada</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Novas missões serão adicionadas em breve!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  categoriesContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  missionCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
