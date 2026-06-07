/**
 * ═══════════════════════════════════════════════════════════════
 *  Avatar Component — User avatar with initials and level badge
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, useColorScheme, View, ViewStyle } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';

interface AvatarProps {
  name?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  levelIndex?: number;
  style?: ViewStyle;
}

const SIZES = {
  sm: { container: 32, font: 13, badge: 16, badgeFont: 8 },
  md: { container: 44, font: 18, badge: 20, badgeFont: 9 },
  lg: { container: 56, font: 24, badge: 22, badgeFont: 10 },
  xl: { container: 88, font: 36, badge: 28, badgeFont: 12 },
};

export function Avatar({ name, color = Colors.primary, size = 'md', levelIndex, style }: AvatarProps) {
  const s = SIZES[size];
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: s.container,
            height: s.container,
            borderRadius: s.container / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize: s.font }]}>{initial}</Text>
      </View>
      {levelIndex != null && (
        <View
          style={[
            styles.badge,
            {
              width: s.badge,
              height: s.badge,
              borderRadius: s.badge / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>{levelIndex}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
