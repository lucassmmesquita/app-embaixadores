/**
 * ═══════════════════════════════════════════════════════════════
 *  EmptyState Component — Placeholder para listas vazias
 *  BLK-02: Com ícone MaterialIcons + emoji, ação opcional
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Button } from './Button';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface EmptyStateProps {
  /** Emoji (fallback visual) */
  emoji?: string;
  /** Ícone MaterialIcons (preferido sobre emoji quando ambos presentes) */
  icon?: IconName;
  /** Cor do ícone */
  iconColor?: string;
  /** Título */
  title: string;
  /** Descrição */
  description: string;
  /** Label do botão de ação */
  actionLabel?: string;
  /** Callback do botão de ação */
  onAction?: () => void;
}

export function EmptyState({
  emoji,
  icon,
  iconColor,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const resolvedIconColor = iconColor || theme.textTertiary;

  return (
    <View style={styles.container} accessibilityRole="text">
      {icon ? (
        <View style={[styles.iconCircle, { backgroundColor: resolvedIconColor + '12' }]}>
          <MaterialIcons name={icon} size={40} color={resolvedIconColor} />
        </View>
      ) : (
        <Text style={styles.emoji}>{emoji || '📭'}</Text>
      )}
      <Text style={[Typography.title3, { color: theme.text, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center', maxWidth: 280 }]}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          fullWidth={false}
          style={{ marginTop: Spacing.sm }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
});
