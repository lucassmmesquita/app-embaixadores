/**
 * ═══════════════════════════════════════════════════════════════
 *  RewardOverlay — Animated feedback for gamification events
 *  Fase 3: RF-HOME-08 — "+N pontos", level up, new badge
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useGamificationStore } from '../../stores/gamificationStore';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const REWARD_CONFIG: Record<string, { icon: IconName; color: string; title: string }> = {
  points: { icon: 'star', color: Colors.warning, title: 'Pontos Ganhos!' },
  level_up: { icon: 'trending-up', color: Colors.primary, title: 'Subiu de Nível!' },
  badge: { icon: 'military-tech', color: Colors.accent, title: 'Nova Conquista!' },
};

export function RewardOverlay() {
  const currentReward = useGamificationStore((s) => s.currentReward);
  const dismiss = useGamificationStore((s) => s.dismissReward);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentReward) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 120,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 2.5s
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => dismiss());
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [currentReward?.id]);

  if (!currentReward) return null;

  const config = REWARD_CONFIG[currentReward.type] || REWARD_CONFIG.points;

  let subtitle = '';
  if (currentReward.type === 'points' && currentReward.points) {
    subtitle = `+${currentReward.points} pontos`;
  } else if (currentReward.type === 'level_up' && currentReward.levelName) {
    subtitle = currentReward.levelName;
  } else if (currentReward.type === 'badge' && currentReward.badgeName) {
    subtitle = currentReward.badgeName;
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} pointerEvents="box-only">
      <Pressable style={styles.backdropTouch} onPress={dismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
            <MaterialIcons name={config.icon} size={48} color={config.color} />
          </View>
          <Text style={[Typography.title2, { color: '#fff', marginTop: Spacing.base }]}>
            {config.title}
          </Text>
          {subtitle ? (
            <Text style={[Typography.largeTitle, { color: config.color, marginTop: Spacing.sm }]}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={[Typography.caption1, { color: 'rgba(255,255,255,0.6)', marginTop: Spacing.base }]}>
            Toque para continuar
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,30,0.95)',
    padding: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    maxWidth: 300,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
