/**
 * ═══════════════════════════════════════════════════════════════
 *  Tabs Layout — Bottom navigation with Inácio design system
 * ═══════════════════════════════════════════════════════════════
 */

import { Tabs } from 'expo-router';
import { Platform, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { ColorBar } from '../../components/ui/ColorBar';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabBarIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

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
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.surface,
            borderTopColor: theme.separator,
            borderTopWidth: 0.5,
            ...(Platform.OS === 'ios' && { position: 'absolute' as const }),
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
      </Tabs>
    </View>
  );
}
