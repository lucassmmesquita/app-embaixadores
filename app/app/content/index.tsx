/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Library Screen — Campaign materials and resources
 *  Accessed from Home → Quick Actions → Materiais
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
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

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const CONTENT_TYPE_MAP: Record<string, { icon: IconName; label: string; color: string }> = {
  article: { icon: 'article', label: 'Artigo', color: Colors.primary },
  video: { icon: 'videocam', label: 'Vídeo', color: Colors.danger },
  image: { icon: 'image', label: 'Imagem', color: Colors.success },
  document: { icon: 'description', label: 'Documento', color: Colors.warning },
  infographic: { icon: 'bar-chart', label: 'Infográfico', color: Colors.accent },
  social_post: { icon: 'phone-iphone', label: 'Post Social', color: Colors.info },
};

const FILTER_OPTIONS: { key: string | null; label: string; icon: IconName }[] = [
  { key: null, label: 'Todos', icon: 'library-books' },
  { key: 'article', label: 'Artigos', icon: 'article' },
  { key: 'video', label: 'Vídeos', icon: 'videocam' },
  { key: 'image', label: 'Imagens', icon: 'image' },
  { key: 'document', label: 'Docs', icon: 'description' },
  { key: 'social_post', label: 'Posts', icon: 'phone-iphone' },
];

export default function ContentLibraryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [contents, setContents] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getContent(1, selectedType || undefined);
      setContents(data.items || []);
    } catch {
      // placeholder
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleShare = async (item: any) => {
    try {
      await api.shareContent(item.id, 'whatsapp');
      await Share.share({
        message: `${item.title}\n\n${item.description || ''}\n\n${item.url || 'Confira na Rede de Embaixadores!'}`,
        title: item.title,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base, backgroundColor: theme.surface }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>
        </View>
        <Text style={[Typography.largeTitle, { color: theme.text }]}>Materiais</Text>
        <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
          Conteúdos prontos para compartilhar
        </Text>

        {/* ═══ FILTER CHIPS ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTER_OPTIONS.map((filter) => (
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
                  Typography.subhead,
                  {
                    color: selectedType === filter.key ? '#fff' : theme.text,
                    fontWeight: '500',
                  },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ═══ CONTENT LIST ═══ */}
      <FlatList
        data={contents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => {
          const typeInfo = CONTENT_TYPE_MAP[item.content_type] || {
            icon: 'article' as IconName,
            label: item.content_type,
            color: Colors.primary,
          };

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    ...Shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    paddingVertical: Spacing.xs,
  },
  filtersScroll: {
    marginTop: Spacing.base,
  },
  filtersContent: {
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
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
