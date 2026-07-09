/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Library Screen — Campaign materials and resources
 *  Accessed from Home → Quick Actions → Materiais
 *  Fase 4: RF-LIB-01/04/05 — useAsync, Toast, RewardOverlay
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import { showToast } from '../../components/ui/Toast';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';
import { useGamificationStore } from '../../stores/gamificationStore';
import { useAuthStore } from '../../stores/authStore';
import type { Content } from '../../services/types';
import { getContentShareMessage, getMaterialLink, getInviteLink } from '../../utils/shareMessages';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface ContentTypeInfo {
  value: string;
  label: string;
  icon: string;
  emoji: string;
  color: string;
  filterable: boolean;
}

// Fallback inline while API loads
const DEFAULT_TYPE: { icon: IconName; label: string; color: string } = {
  icon: 'article', label: 'Conteúdo', color: Colors.primary,
};

export default function ContentLibraryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showReward = useGamificationStore((s) => s.showReward);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);

  // Build derived maps from API data
  const contentTypeMap: Record<string, { icon: IconName; label: string; color: string }> = {};
  const filterOptions: { key: string | null; label: string; icon: IconName }[] = [
    { key: null, label: 'Todos', icon: 'library-books' },
  ];
  for (const ct of contentTypes) {
    contentTypeMap[ct.value] = { icon: ct.icon as IconName, label: ct.label, color: ct.color };
    if (ct.filterable) {
      filterOptions.push({ key: ct.value, label: ct.label, icon: ct.icon as IconName });
    }
  }

  // Fetch content types from backend (single source of truth)
  useEffect(() => {
    api.getContentTypes().then(setContentTypes).catch(() => {});
  }, []);

  // Fase 4: useAsync for proper loading/error
  const loadContent = useCallback(
    () => api.getContent(1, selectedType || undefined).then((d) => d.items || []),
    [selectedType]
  );
  const { data: contents, loading, error, reload } = useAsync<Content[]>(loadContent, [selectedType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleShare = async (item: Content) => {
    try {
      // Record share in backend (rate-limited, no points)
      await api.shareContent(item.id, 'whatsapp');

      // Build tracked material link: /material/{id}?ref=REFERRAL_CODE
      const referralCode = useAuthStore.getState().user?.referral_code || '';
      const materialLink = getMaterialLink(item.id, referralCode);
      const inviteLink = getInviteLink(referralCode);

      const shareMessage = getContentShareMessage(item.content_type, materialLink, inviteLink);

      // Platform-aware share
      if (Platform.OS === 'web') {
        // Try Web Share API first
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ title: item.title, text: shareMessage });
          } catch { /* cancelled */ }
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(shareMessage);
            showToast('success', 'Link copiado!');
          } catch {
            window.prompt('Copie o link abaixo:', materialLink);
          }
        } else {
          window.prompt('Copie o link abaixo:', materialLink);
        }
      } else {
        await Share.share({ message: shareMessage, title: item.title });
      }
    } catch {
      // User cancelled share — no error needed
    }
  };

  return (
    <ScreenWithNav title="Materiais" showBack>
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ FILTER CHIPS ═══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
          {filterOptions.map((filter) => (
            <Pressable
              key={filter.key || 'all'}
              style={[
                styles.filterChip,
                selectedType === filter.key && styles.filterChipActive,
                { borderColor: theme.border },
              ]}
              onPress={() => setSelectedType(filter.key)}
            >
              <MaterialIcons name={filter.icon} size={14} color={selectedType === filter.key ? '#fff' : theme.textSecondary} />
              <Text
                style={[
                  Typography.caption1,
                  {
                    color: selectedType === filter.key ? '#fff' : theme.text,
                    fontWeight: '500',
                  },
                ]}
                numberOfLines={1}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      {/* ═══ CONTENT LIST ═══ */}
      <FlatList
        data={contents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => {
          const typeInfo = contentTypeMap[item.content_type] || DEFAULT_TYPE;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.contentCard,
                { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
                Shadows.sm,
              ]}
              onPress={() => router.push(`/content/${item.id}`)}
            >
              {/* Type Badge */}
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
                  <MaterialIcons name={typeInfo.icon} size={12} color={typeInfo.color} />
                  <Text style={[Typography.caption2, { color: typeInfo.color, fontWeight: '600' }]}>
                    {typeInfo.label}
                  </Text>
                </View>
                {item.is_featured && (
                  <View style={[styles.featuredTag, { backgroundColor: Colors.warning + '20' }]}>
                    <Text style={[Typography.caption2, { color: Colors.warning, fontWeight: '700' }]}>
                      <MaterialIcons name="star" size={10} color={Colors.warning} /> DESTAQUE
                    </Text>
                  </View>
                )}
              </View>

              {/* Title & Description */}
              <Text style={[Typography.headline, { color: theme.text, marginTop: Spacing.sm }]}>
                {item.title}
              </Text>
              {item.description && (
                <Text
                  style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.xs }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                {item.share_count != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="share" size={12} color={theme.textTertiary} />
                    <Text style={[Typography.caption2, { color: theme.textTertiary }]}>
                      {item.share_count} compartilhamentos
                    </Text>
                  </View>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.shareButton,
                    { backgroundColor: Colors.success + '15', opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShare(item);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="share" size={14} color={Colors.success} />
                    <Text style={[Typography.caption1, { color: Colors.success, fontWeight: '700' }]}>
                      Compartilhar
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="library-books" size={64} color={theme.textTertiary} />
            <Text style={[Typography.title3, { color: theme.text }]}>Nenhum material encontrado</Text>
            <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
              Novos materiais de campanha serão publicados em breve!
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
  contentCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  featuredTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  shareButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
