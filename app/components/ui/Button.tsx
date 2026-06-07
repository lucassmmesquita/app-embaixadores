/**
 * ═══════════════════════════════════════════════════════════════
 *  Button Component — Reusable button with variants and loading
 * ═══════════════════════════════════════════════════════════════
 */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  size = 'md',
  fullWidth = true,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const variantColors: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: Colors.primary, text: '#FFFFFF' },
    secondary: { bg: theme.surfaceElevated, text: theme.text },
    outline: { bg: 'transparent', text: Colors.primary, border: Colors.primary },
    danger: { bg: Colors.danger, text: '#FFFFFF' },
    ghost: { bg: 'transparent', text: Colors.primary },
  };

  const sizeStyles: Record<string, { paddingVertical: number; fontSize: number }> = {
    sm: { paddingVertical: Spacing.sm, fontSize: 14 },
    md: { paddingVertical: Spacing.md, fontSize: 16 },
    lg: { paddingVertical: Spacing.base, fontSize: 17 },
  };

  const colors = variantColors[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.bg,
          paddingVertical: sizeStyle.paddingVertical,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          borderWidth: colors.border ? 1.5 : 0,
          borderColor: colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant !== 'ghost' && Shadows.sm,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: colors.text, fontSize: sizeStyle.fontSize }]}>
          {icon ? `${icon} ${title}` : title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
