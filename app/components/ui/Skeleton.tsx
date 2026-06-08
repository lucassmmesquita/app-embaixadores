/**
 * ═══════════════════════════════════════════════════════════════
 *  Skeleton Component — Shimmer loading placeholders
 *  BLK-02: Substitui spinners genéricos por skeletons visuais
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = BorderRadius.sm, style }: SkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const bgColor = isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceHighest;

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: bgColor, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton para um cartão de lista (ex.: missão, evento) */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBox width={44} height={44} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonBox width="70%" height={16} />
        <SkeletonBox width="90%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={60} height={24} borderRadius={12} />
    </View>
  );
}

/** Skeleton para uma lista de cartões */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Skeleton para o hero card da home */
export function SkeletonHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <SkeletonBox width={56} height={56} borderRadius={28} />
        <View style={styles.heroInfo}>
          <SkeletonBox width="60%" height={20} />
          <SkeletonBox width="30%" height={14} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonBox width="100%" height={6} borderRadius={3} style={{ marginTop: Spacing.base }} />
    </View>
  );
}

/** Skeleton para a grade de stats */
export function SkeletonStats() {
  return (
    <View style={styles.statsGrid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.statCard}>
          <SkeletonBox width={40} height={40} borderRadius={20} />
          <SkeletonBox width={40} height={22} style={{ marginTop: 4 }} />
          <SkeletonBox width={50} height={11} style={{ marginTop: 2 }} />
        </View>
      ))}
    </View>
  );
}

export { SkeletonBox as Skeleton };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  list: {
    gap: Spacing.xs,
  },
  hero: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  heroInfo: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.xs,
  },
});
