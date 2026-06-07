/**
 * ═══════════════════════════════════════════════════════════════
 *  Input Component — Styled text input with label and validation
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, Text, TextInput, TextInputProps, useColorScheme, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  optional?: boolean;
}

export function Input({ label, error, optional, ...inputProps }: InputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const borderColor = error ? Colors.danger : theme.border;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor },
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: error ? Colors.danger : theme.textSecondary }]}>
          {label}
        </Text>
        {optional && (
          <Text style={[Typography.caption2, { color: theme.textTertiary }]}>Opcional</Text>
        )}
      </View>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholderTextColor={theme.textTertiary}
        autoCorrect={false}
        {...inputProps}
      />
      {error && (
        <Text style={[Typography.caption2, { color: Colors.danger, marginTop: Spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption1,
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    paddingVertical: Spacing.xs,
  },
});
