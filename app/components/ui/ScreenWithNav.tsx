/**
 * ═══════════════════════════════════════════════════════════════
 *  ScreenWithNav — Wrapper que adiciona AppHeader + TabBar
 *  Para telas fora do grupo (tabs) que precisam manter
 *  header e footer consistentes com o resto do app
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useRouter, usePathname, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';
import { AppHeader } from './AppHeader';
import api from '../../services/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface Tab {
  key: string;
  route: string;
  label: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { key: 'home', route: '/(tabs)/home', label: 'Início', icon: 'home' },
  { key: 'missions', route: '/(tabs)/missions', label: 'Missões', icon: 'flag' },
  { key: 'ranking', route: '/(tabs)/ranking', label: 'Ranking', icon: 'emoji-events' },
  { key: 'events', route: '/(tabs)/events', label: 'Eventos', icon: 'event' },
  { key: 'profile', route: '/(tabs)/profile', label: 'Perfil', icon: 'person' },
];

interface ScreenWithNavProps {
  /** Título exibido no header */
  title?: string;
  /** Conteúdo da tela */
  children: React.ReactNode;
  /** Se true, mostra botão de voltar abaixo do header */
  showBack?: boolean;
}

export function ScreenWithNav({ title, children, showBack = false }: ScreenWithNavProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();

  // If inside (tabs) group, the tabs layout already provides header + tab bar
  const isInsideTabs = segments[0] === '(tabs)';

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isInsideTabs) return; // tabs layout handles this
    const loadUnread = async () => {
      try {
        const data = await api.getUnreadCount();
        setUnreadCount(data.unread_count || 0);
      } catch {
        // silent
      }
    };
    loadUnread();
  }, [isInsideTabs]);

  // When re-exported inside (tabs), just render children — no wrapper needed
  if (isInsideTabs) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ═══ HEADER ═══ */}
      <AppHeader
        title={title}
        unreadCount={unreadCount}
        onLogoPress={() => router.push('/(tabs)/home')}
        onNotificationPress={() => router.push('/(tabs)/notifications' as any)}
      />

      {/* ═══ BACK BAR ═══ */}
      {showBack && (
        <Pressable
          style={[styles.backBar, { borderBottomColor: theme.separator }]}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/home');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back-ios" size={16} color={Colors.primary} />
          <Text style={[styles.backText, { color: Colors.primary }]}>Voltar</Text>
        </Pressable>
      )}

      {/* ═══ CONTENT ═══ */}
      <View style={styles.content}>
        {children}
      </View>

      {/* ═══ TAB BAR ═══ */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.separator,
            paddingBottom: Platform.OS === 'web'
              ? 0
              : insets.bottom || Spacing.xs,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.key);
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? Colors.primary : theme.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? Colors.primary : theme.textTertiary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    ...Platform.select({
      web: {
        // @ts-ignore — web-only CSS
        position: 'sticky',
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
