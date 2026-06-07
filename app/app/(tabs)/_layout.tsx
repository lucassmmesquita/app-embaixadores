/**
 * ═══════════════════════════════════════════════════════════════
 *  Tabs Layout — Bottom navigation with Apple-style design
 * ═══════════════════════════════════════════════════════════════
 */

import { Tabs } from 'expo-router';
import { Platform, Text, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';

function TabBarIcon({ emoji, size }: { emoji: string; size: number }) {
  return <Text style={{ fontSize: size - 2 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: Platform.OS === 'ios',
        headerBackground: Platform.OS === 'ios'
          ? () => (
              <BlurView
                tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                intensity={100}
                style={{ flex: 1 }}
              />
            )
          : undefined,
        headerStyle: Platform.OS === 'android' ? { backgroundColor: theme.surface } : undefined,
        headerTintColor: theme.text,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.surface,
          borderTopColor: theme.separator,
          borderTopWidth: 0.5,
          ...(Platform.OS === 'ios' && { position: 'absolute' as const }),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          headerTitle: 'Rede de Embaixadores',
          tabBarIcon: ({ size }) => <TabBarIcon emoji="🏠" size={size} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missões',
          tabBarIcon: ({ size }) => <TabBarIcon emoji="🎯" size={size} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ size }) => <TabBarIcon emoji="🏆" size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ size }) => <TabBarIcon emoji="📅" size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ size }) => <TabBarIcon emoji="👤" size={size} />,
        }}
      />
    </Tabs>
  );
}
