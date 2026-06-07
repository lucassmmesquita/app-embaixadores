/**
 * ═══════════════════════════════════════════════════════════════
 *  Badge Component — Status, level, points badges
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

interface BadgeProps {
  text: string;
  color?: string;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
  icon?: string;
}

export function Badge({ text, color = Colors.primary, variant = 'subtle', size = 'md', icon }: BadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: size === 'sm' ? Spacing.sm : Spacing.md,
      paddingVertical: size === 'sm' ? 2 : Spacing.xs,
      borderRadius: BorderRadius.full,
      ...(variant === 'solid' && { backgroundColor: color }),
      ...(variant === 'subtle' && { backgroundColor: color + '20' }),
      ...(variant === 'outline' && { borderWidth: 1, borderColor: color }),
    },
    text: {
      ...(size === 'sm' ? Typography.caption2 : Typography.caption1),
      color: variant === 'solid' ? '#FFFFFF' : color,
      fontWeight: '600',
    },
    icon: {
      fontSize: size === 'sm' ? 10 : 12,
    },
  });

  return (
    <View style={styles.badge}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}
