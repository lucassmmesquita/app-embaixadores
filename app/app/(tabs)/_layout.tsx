/**
 * ═══════════════════════════════════════════════════════════════
 *  Tabs Layout — Bottom navigation with notification badge
 * ═══════════════════════════════════════════════════════════════
 */

import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme, View, Text, type ColorValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../../constants/theme';
import { ColorBar } from '../../components/ui/ColorBar';
import api from '../../services/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabBarIcon({ name, color, size }: { name: IconName; color: string | ColorValue; size: number }) {
  return <MaterialIcons name={name} size={size} color={color as string} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

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
          headerShown: true,
          headerTransparent: Platform.OS === 'ios',
          headerBackground: Platform.OS === 'ios'
            ? () => (
                <View style={{ flex: 1 }}>
                  <BlurView
                    tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                    intensity={100}
                    style={{ flex: 1 }}
                  />
                  <ColorBar height={3} />
                </View>
              )
            : () => (
                <View style={{ flex: 1 }}>
                  <View style={{ flex: 1, backgroundColor: theme.surface }} />
                  <ColorBar height={3} />
                </View>
              ),
          headerStyle: { elevation: 0, shadowOpacity: 0 },
          headerTintColor: theme.text,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.separator,
            borderTopWidth: 0.5,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
          // Notification badge in header
          headerRight: () =>
            unreadCount > 0 ? (
              <View style={{ marginRight: 16 }}>
                <View style={{
                  backgroundColor: Colors.accent,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ ...Typography.caption2, color: '#fff', fontWeight: '700' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              </View>
            ) : null,
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
      </Tabs>
    </View>
  );
}
