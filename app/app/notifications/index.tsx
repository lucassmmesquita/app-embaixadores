/**
 * ═══════════════════════════════════════════════════════════════
 *  Notifications Screen — Central de notificações in-app
 *  PRD §6.1.9: Notificações push (FCM) + central in-app
 *  Fase 5: RF-NOT-01/02 — useAsync, Toast, accessibility
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  badge: { icon: 'military-tech', color: Colors.themes.workers },
  invite: { icon: 'group-add', color: Colors.info },
  system: { icon: 'notifications', color: Colors.accent },
  campaign: { icon: 'campaign', color: Colors.primary },
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Fase 5: useAsync instead of silent catch
  const loadNotifications = useCallback(() => api.getNotifications().then(d => d || []), []);
  const { data: notifications, loading, error, reload } = useAsync<Notification[]>(loadNotifications, []);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      reload();
    } catch {
      showToast('error', 'Falha ao marcar como lida');
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[Typography.title2, { color: theme.text }]}>Notificações</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Text style={[Typography.caption1, { color: Colors.primary }]}>Ler todas</Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
        {unreadCount > 0 && (
          <View style={[styles.unreadBanner, { backgroundColor: Colors.primary + '15' }]}>
            <Text style={[Typography.subhead, { color: Colors.primary, fontWeight: '600' }]}>
              {unreadCount} {unreadCount === 1 ? 'nova notificação' : 'novas notificações'}
            </Text>
          </View>
        )}
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
              onPress={() => handleMarkRead(item.id)}
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
                  {formatDate(item.created_at)}
                </Text>
              </View>
              {isUnread && (
                <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />
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
