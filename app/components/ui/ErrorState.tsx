/**
 * ═══════════════════════════════════════════════════════════════
 *  ErrorState Component — Mensagem de erro amigável com retry
 *  BLK-02: Substitui catch silencioso por feedback visual
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from './Button';

interface ErrorStateProps {
  /** Mensagem de erro amigável */
  message?: string;
  /** Função de retry (geralmente o reload do useAsync) */
  onRetry?: () => void;
  /** Label do botão de retry */
  retryLabel?: string;
  /** Ícone customizado */
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Compacto (inline) vs expandido (full section) */
  compact?: boolean;
}

export function ErrorState({
  message = 'Algo deu errado. Verifique sua conexão e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  icon = 'cloud-off',
  compact = false,
}: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: Colors.danger + '10', borderColor: Colors.danger + '30' }]}>
        <MaterialIcons name="error-outline" size={18} color={Colors.danger} />
        <Text style={[Typography.footnote, { color: Colors.danger, flex: 1 }]} numberOfLines={2}>
          {message}
        </Text>
        {onRetry && (
          <Button
            title="Retry"
            onPress={onRetry}
            variant="outline"
            size="sm"
            fullWidth={false}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: Colors.danger + '15' }]}>
        <MaterialIcons name={icon} size={40} color={Colors.danger} />
      </View>
      <Text
        style={[Typography.title3, { color: theme.text, textAlign: 'center' }]}
        accessibilityRole="alert"
      >
        Ops!
      </Text>
      <Text
        style={[Typography.subhead, { color: theme.textSecondary, textAlign: 'center', maxWidth: 280 }]}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="primary"
          size="md"
          fullWidth={false}
          icon="↻"
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
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
  },
});
