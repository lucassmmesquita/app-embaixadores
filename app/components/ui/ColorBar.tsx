/**
 * ═══════════════════════════════════════════════════════════════
 *  ColorBar — Barra de cores institucional Inácio Arruda
 *  Vermelho, Amarelo, Verde, Azul
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface ColorBarProps {
  height?: number;
  style?: ViewStyle;
}

export function ColorBar({ height = 4, style }: ColorBarProps) {
  return (
    <View style={[styles.container, { height }, style]}>
      <View style={[styles.segment, { backgroundColor: Colors.colorBar.red }]} />
      <View style={[styles.segment, { backgroundColor: Colors.colorBar.yellow }]} />
      <View style={[styles.segment, { backgroundColor: Colors.colorBar.green }]} />
      <View style={[styles.segment, { backgroundColor: Colors.colorBar.blue }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  segment: {
    flex: 1,
  },
});
