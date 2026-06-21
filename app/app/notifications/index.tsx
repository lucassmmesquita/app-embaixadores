/**
 * ═══════════════════════════════════════════════════════════════
 *  Notifications Screen — Central de notificações in-app
 *  PRD §6.1.9: Notificações push (FCM) + central in-app
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { showToast } from '../../components/ui/Toast';
import type { Notification } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const NOTIFICATION_ICONS: Record<string, { icon: IconName; color: string }> = {
  mission: { icon: 'flag', color: Colors.success },
  event: { icon: 'event', color: Colors.primary },
  level_up: { icon: 'trending-up', color: Colors.warning },
  level_approval: { icon: 'verified', color: Colors.warning },
  badge: { icon: 'military-tech', color: Colors.themes.workers },
  invite: { icon: 'group-add', color: Colors.info },
  system: { icon: 'notifications', color: Colors.accent },
  campaign: { icon: 'campaign', color: Colors.primary },
  info: { icon: 'info', color: Colors.primary },
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const loadNotifications = useCallback(() => api.getNotifications().then(d => d || []), []);
  const { data: notifications, loading, error, reload } = useAsync<Notification[]>(loadNotifications, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handlePress = async (item: Notification) => {
    // Mark as read
    if (!item.is_read) {
      try {
        await api.markNotificationRead(item.id);
        reload();
      } catch {
        // silent
      }
    }

    // Navigate via action_url if present
    if (item.action_url) {
      try {
        // Internal routes start with /
        if (item.action_url.startsWith('/')) {
          router.push(item.action_url as any);
        }
      } catch {
        // Ignore invalid routes
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showToast('success', 'Todas as notificações foram lidas ✓');
      reload();
    } catch {
      showToast('error', 'Falha ao marcar notificações');
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await api.clearAllNotifications();
      showToast('success', `${result.deleted_count} notificação(ões) removida(s)`);
      reload();
    } catch {
      showToast('error', 'Falha ao limpar notificações');
    }
  };

  const allNotifications = notifications || [];
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // ═══ LOADING / ERROR ═══
  if (loading && !notifications) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error && !notifications) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState message="Não foi possível carregar notificações" onRetry={reload} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ SUB-HEADER — contagem + ações ═══ */}
      <View style={styles.subHeader}>
        {unreadCount > 0 ? (
          <View style={[styles.unreadBanner, { backgroundColor: Colors.primary + '15' }]}>
            <Text style={[Typography.subhead, { color: Colors.primary, fontWeight: '600' }]}>
              {unreadCount} {unreadCount === 1 ? 'nova notificação' : 'novas notificações'}
            </Text>
          </View>
        ) : (
          <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Todas lidas ✓</Text>
        )}
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Text style={[Typography.caption1, { color: Colors.primary }]}>Ler todas</Text>
            </Pressable>
          )}
          {allNotifications.length > 0 && (
            <Pressable onPress={handleClearAll} style={styles.markAllButton}>
              <Text style={[Typography.caption1, { color: Colors.accent }]}>Limpar todas</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ═══ NOTIFICATIONS LIST ═══ */}
      <FlatList
        data={allNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const meta = NOTIFICATION_ICONS[item.notification_type] || NOTIFICATION_ICONS.system;
          const isUnread = !item.is_read;

          return (
            <Pressable
              style={[
                styles.notificationCard,
                { backgroundColor: isUnread ? Colors.primary + '08' : theme.surface },
                isUnread && { borderLeftWidth: 3, borderLeftColor: Colors.primary },
                Shadows.sm,
              ]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.notifIcon, { backgroundColor: meta.color + '15' }]}>
                <MaterialIcons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.notifContent}>
                <Text style={[Typography.headline, { color: theme.text }]}>{item.title}</Text>
                <Text style={[Typography.subhead, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[Typography.caption2, { color: theme.textTertiary, marginTop: Spacing.xs }]}>
                  {formatDate(item.sent_at)}
                </Text>
              </View>
              {isUnread && (
                <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />
              )}
              {item.action_url && (
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} style={{ marginTop: 4 }} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={64} color={theme.textTertiary} />
              <Text style={[Typography.title3, { color: theme.text }]}>Sem notificações</Text>
              <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center' }]}>
                Você será notificado sobre missões, eventos e conquistas!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  markAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  unreadBanner: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: { flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.base,
  },
});
