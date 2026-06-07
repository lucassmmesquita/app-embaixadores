/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Detail Screen — View and share campaign material
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
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

const SHARE_PLATFORMS: { key: string; icon: IconName; label: string; color: string }[] = [
  { key: 'whatsapp', icon: 'chat', label: 'WhatsApp', color: '#25D366' },
  { key: 'telegram', icon: 'send', label: 'Telegram', color: '#0088cc' },
  { key: 'twitter', icon: 'alternate-email', label: 'Twitter/X', color: '#1DA1F2' },
  { key: 'generic', icon: 'share', label: 'Outros', color: Colors.primary },
];

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadContent();
  }, [id]);

  const loadContent = async () => {
    try {
      // Using generic getContent and finding by id, since no getContentById exists
      const data = await api.getContent(1);
      const item = (data.items || []).find((c: any) => c.id === id);
      setContent(item || null);
    } catch {
      /* placeholder */
    }
    setLoading(false);
  };

  const handleShare = async (platform: string) => {
    if (!content) return;
    setSharing(true);
    try {
      await api.shareContent(id!, platform);

      const shareMessage = `${content.title}\n\n${content.description || ''}\n\n${content.url || 'Confira na Rede de Embaixadores!'}`;

      if (platform === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Share.share({ message: shareMessage, title: content.title });
        }
      } else if (platform === 'telegram') {
        const telegramUrl = `tg://msg?text=${encodeURIComponent(shareMessage)}`;
        const canOpen = await Linking.canOpenURL(telegramUrl);
        if (canOpen) {
          await Linking.openURL(telegramUrl);
        } else {
          await Share.share({ message: shareMessage, title: content.title });
        }
      } else {
        await Share.share({ message: shareMessage, title: content.title });
      }
    } catch {
      // User cancelled or error
    }
    setSharing(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <MaterialIcons name="article" size={64} color={theme.textTertiary} />
        <Text style={[Typography.title3, { color: theme.text }]}>Material não encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[Typography.subhead, { color: Colors.primary }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const CONTENT_TYPE_MAP: Record<string, { icon: IconName; label: string; color: string }> = {
    article: { icon: 'article', label: 'Artigo', color: Colors.primary },
    video: { icon: 'videocam', label: 'Vídeo', color: Colors.danger },
    image: { icon: 'image', label: 'Imagem', color: Colors.success },
    document: { icon: 'description', label: 'Documento', color: Colors.warning },
    infographic: { icon: 'bar-chart', label: 'Infográfico', color: Colors.accent },
    social_post: { icon: 'phone-iphone', label: 'Post Social', color: Colors.info },
  };

  const typeInfo = CONTENT_TYPE_MAP[content.content_type] || {
    icon: 'article' as IconName,
    label: content.content_type,
    color: Colors.primary,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 100 }}
    >
      {/* ═══ HEADER CARD ═══ */}
      <View style={[styles.headerCard, { backgroundColor: typeInfo.color }, Shadows.lg]}>
        <MaterialIcons name={typeInfo.icon} size={56} color="#fff" />
        <View style={styles.headerBadge}>
          <Text style={[Typography.caption1, { color: '#fff', fontWeight: '600' }]}>
            {typeInfo.label}
          </Text>
        </View>
      </View>

      {/* ═══ CONTENT INFO ═══ */}
      <View style={[styles.infoCard, { backgroundColor: theme.surface }, Shadows.md]}>
        <Text style={[Typography.title1, { color: theme.text }]}>{content.title}</Text>

        {content.description && (
          <Text style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.base, lineHeight: 26 }]}>
            {content.description}
          </Text>
        )}

        {content.body && (
          <Text style={[Typography.body, { color: theme.text, marginTop: Spacing.base, lineHeight: 26 }]}>
            {content.body}
          </Text>
        )}
      </View>

      {/* ═══ STATS ═══ */}
      {content.share_count != null && (
        <View style={[styles.statsCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.statRow}>
            <MaterialIcons name="share" size={20} color={typeInfo.color} />
            <View>
              <Text style={[Typography.headline, { color: theme.text }]}>
                {content.share_count} compartilhamentos
              </Text>
              <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
                Ajude a aumentar esse número!
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ═══ SHARE BUTTONS ═══ */}
      <View style={[styles.shareSection, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <MaterialIcons name="share" size={20} color={theme.text} />
            <Text style={[Typography.headline, { color: theme.text }]}>
              Compartilhar Material
            </Text>
          </View>
        <View style={styles.shareGrid}>
          {SHARE_PLATFORMS.map((platform) => (
            <Pressable
              key={platform.key}
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: platform.color + '15', opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleShare(platform.key)}
              disabled={sharing}
            >
              <MaterialIcons name={platform.icon} size={24} color={platform.color} />
              <Text style={[Typography.caption1, { color: platform.color, fontWeight: '600' }]}>
                {platform.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ═══ EXTERNAL LINK ═══ */}
      {content.url && (
        <Pressable
          style={({ pressed }) => [
            styles.linkButton,
            { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
            Shadows.md,
          ]}
          onPress={() => Linking.openURL(content.url)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <MaterialIcons name="open-in-new" size={18} color="#fff" />
            <Text style={[Typography.headline, { color: '#fff' }]}>Abrir Link Original</Text>
          </View>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.base },
  headerCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerEmoji: { fontSize: 56 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  infoCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  statsCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareSection: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  shareButton: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  linkButton: {
    marginHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
});
