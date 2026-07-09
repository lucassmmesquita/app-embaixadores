/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Detail Screen — View and share campaign material
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
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
import { useAuthStore } from '../../stores/authStore';
import { useGamificationStore } from '../../stores/gamificationStore';
import { showToast } from '../../components/ui/Toast';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';
import { getContentShareMessage, getMaterialLink, getInviteLink } from '../../utils/shareMessages';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface ContentTypeInfo {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const DEFAULT_TYPE: { icon: IconName; label: string; color: string } = {
  icon: 'article', label: 'Conteúdo', color: Colors.primary,
};



export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showReward = useGamificationStore((s) => s.showReward);

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ points?: number; remaining?: number } | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);

  useEffect(() => {
    api.getContentTypes().then(setContentTypes).catch(() => {});
    loadContent();
  }, [id]);

  const loadContent = async () => {
    try {
      const item = await api.getContentById(id!);
      setContent(item || null);
    } catch {
      /* placeholder */
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!content) return;
    setSharing(true);
    try {
      // Record share in backend (rate-limited, no points)
      await api.shareContent(id!, 'whatsapp');

      // Build tracked material link with referral code
      const referralCode = useAuthStore.getState().user?.referral_code || '';
      const materialLink = getMaterialLink(content.id, referralCode);
      const inviteLink = getInviteLink(referralCode);

      const shareMessage = getContentShareMessage(content.content_type, materialLink, inviteLink);

      // Platform-aware share
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ title: content.title, text: shareMessage });
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
        await Share.share({ message: shareMessage, title: content.title });
      }
    } catch {
      // User cancelled share — no error needed
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

  // Build type map from API data
  const typeMap: Record<string, { icon: IconName; label: string; color: string }> = {};
  for (const ct of contentTypes) {
    typeMap[ct.value] = { icon: ct.icon as IconName, label: ct.label, color: ct.color };
  }

  const typeInfo = typeMap[content.content_type] || DEFAULT_TYPE;

  return (
    <ScreenWithNav title={content.title} showBack>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 100 }}
    >
      {/* ═══ TITLE + DESCRIPTION ═══ */}
      <View style={[styles.infoCard, { backgroundColor: theme.surface }, Shadows.md]}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
          <MaterialIcons name={typeInfo.icon} size={14} color={typeInfo.color} />
          <Text style={[Typography.caption1, { color: typeInfo.color, fontWeight: '700' }]}>
            {typeInfo.label}
          </Text>
        </View>

        <Text style={[Typography.title1, { color: theme.text, marginTop: Spacing.sm }]}>{content.title}</Text>

        {content.description && (
          <Text style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.sm, lineHeight: 26 }]}>
            {content.description}
          </Text>
        )}
      </View>

      {/* ═══ THUMBNAIL PREVIEW ═══ */}
      {(content.file_url || content.thumbnail_url) && (
        <View style={[styles.previewCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <Image
            source={{ uri: content.thumbnail_url || content.file_url }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* ═══ SHARE BUTTON ═══ */}
      <Pressable
        style={({ pressed }) => [
          styles.shareButton,
          { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
          Shadows.md,
        ]}
        onPress={handleShare}
        disabled={sharing}
      >
        <MaterialIcons name="share" size={20} color="#fff" />
        <Text style={[Typography.headline, { color: '#fff' }]}>Compartilhar Material</Text>
      </Pressable>

      {/* ═══ VIEW MATERIAL BUTTON ═══ */}
      {content.file_url && (
        <Pressable
          style={({ pressed }) => [
            styles.viewMaterialButton,
            { backgroundColor: theme.surface, borderColor: Colors.primary + '40', opacity: pressed ? 0.85 : 1 },
            Shadows.sm,
          ]}
          onPress={() => Linking.openURL(content.file_url)}
        >
          <MaterialIcons name="open-in-new" size={20} color={Colors.primary} />
          <Text style={[Typography.headline, { color: Colors.primary }]}>Ver material</Text>
        </Pressable>
      )}
    </ScrollView>
    </ScreenWithNav>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.base },
  infoCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  previewCard: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.xl,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.sm,
  },
  viewMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
});
