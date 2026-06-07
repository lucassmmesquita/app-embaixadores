/**
 * ═══════════════════════════════════════════════════════════════
 *  Card Component — Reusable card with variants
 * ═══════════════════════════════════════════════════════════════
 */

import { Pressable, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'outlined';
  onPress?: () => void;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
}

export function Card({ children, variant = 'default', onPress, style, padding = 'lg' }: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const variantStyles: Record<string, ViewStyle> = {
    default: { backgroundColor: theme.surface, ...Shadows.sm },
    elevated: { backgroundColor: theme.surface, ...Shadows.lg },
    glass: { backgroundColor: theme.glass },
    outlined: { backgroundColor: theme.surface, borderWidth: 0.5, borderColor: theme.border },
  };

  const cardStyle: ViewStyle = {
    borderRadius: BorderRadius.xl,
    padding: Spacing[padding],
    ...variantStyles[variant],
    ...(style as any),
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.9 : 1 }]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
