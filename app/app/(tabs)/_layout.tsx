/**
 * ═══════════════════════════════════════════════════════════════
 *  Tabs Layout — Bottom navigation with AppHeader + notification badge
 *  Usa AppHeader com logo do candidato em todas as telas autenticadas
 * ═══════════════════════════════════════════════════════════════
 */

import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme, View, type ColorValue } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { AppHeader } from '../../components/ui/AppHeader';
import api from '../../services/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabBarIcon({ name, color, size }: { name: IconName; color: string | ColorValue; size: number }) {
  return <MaterialIcons name={name} size={size} color={color as string} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notifications count
  useEffect(() => {
    const loadUnread = async () => {
      try {
        const data = await api.getUnreadCount();
        setUnreadCount(data.count || 0);
      } catch {
        // silent
      }
    };
    loadUnread();
    // Refresh every 60 seconds
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          header: ({ options }) => (
            <AppHeader
              title={options.headerTitle as string || options.title}
              unreadCount={unreadCount}
              onLogoPress={() => router.push('/(tabs)/home')}
              onNotificationPress={() => router.push('/(tabs)/notifications' as any)}
            />
          ),
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.separator,
            borderTopWidth: 0.5,
            ...(Platform.OS === 'web' ? {
              // @ts-ignore — web-only CSS
              position: 'sticky',
              bottom: 0,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            } : {}),
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Início',
            headerTitle: 'Rede de Embaixadores',
            tabBarIcon: ({ color, size }) => <TabBarIcon name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="missions"
          options={{
            title: 'Missões',
            tabBarIcon: ({ color, size }) => <TabBarIcon name="flag" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            tabBarIcon: ({ color, size }) => <TabBarIcon name="emoji-events" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Eventos',
            tabBarIcon: ({ color, size }) => <TabBarIcon name="event" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <TabBarIcon name="person" color={color} size={size} />,
          }}
        />

        {/* ═══ TELAS OCULTAS — Ações Rápidas (sem ícone no tab bar) ═══ */}
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notificações',
            href: null, // oculta do tab bar
          }}
        />
        <Tabs.Screen
          name="invitations"
          options={{
            title: 'Convites',
            href: null,
          }}
        />
        <Tabs.Screen
          name="content"
          options={{
            title: 'Materiais',
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
