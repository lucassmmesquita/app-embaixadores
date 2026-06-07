/**
 * ═══════════════════════════════════════════════════════════════
 *  EmptyState Component — Placeholder for empty lists
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[Typography.title3, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center', maxWidth: 280 }]}>
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
    paddingVertical: Spacing['5xl'],
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
});
