/**
 * ═══════════════════════════════════════════════════════════════
 *  LevelJourney — Visual level progression trail
 *  Shows all levels as colored dots connected by a line
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import api from '../../services/api';

interface LevelInfo {
  id: string;
  name: string;
  order_index: number;
  min_points: number;
  color: string | null;
}

interface LevelJourneyProps {
  currentLevelOrder: number;
  totalPoints: number;
  theme: any;
}

const DOT_SIZE = 16;
const DOT_CURRENT_SIZE = 22;
const LINE_HEIGHT = 3;

export default function LevelJourney({ currentLevelOrder, totalPoints, theme }: LevelJourneyProps) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);

  useEffect(() => {
    api.getLevels().then(setLevels).catch(() => {});
  }, []);

  if (levels.length === 0) return null;

  // Find the index of the current level for the progress line
  const currentIdx = levels.findIndex((l) => l.order_index === currentLevelOrder);
  const progressPct = levels.length > 1 ? (currentIdx / (levels.length - 1)) * 100 : 0;
  const currentColor = levels[currentIdx]?.color || Colors.primary;

  // Track line goes from center of first dot to center of last dot
  // Each step is flex:1, so center of step i = (i + 0.5) / total * 100%
  const total = levels.length;
  const trackLeft = `${(0.5 / total) * 100}%`;
  const trackRight = `${(0.5 / total) * 100}%`;

  // Filled line goes from first dot to current dot center
  const filledRight = currentIdx >= 0
    ? `${((total - currentIdx - 0.5) / total) * 100}%`
    : '100%';

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {/* ═══ BACKGROUND LINE (gray) ═══ */}
        <View
          style={[
            styles.trackLine,
            { backgroundColor: theme.surfaceElevated, left: trackLeft, right: trackRight },
          ]}
        />

        {/* ═══ FILLED LINE (colored, up to current) ═══ */}
        <View
          style={[
            styles.trackLine,
            { backgroundColor: currentColor, left: trackLeft, right: filledRight, zIndex: 1 },
          ]}
        />

        {/* ═══ LEVEL STEPS ═══ */}
        {levels.map((level) => {
          const isReached = level.order_index <= currentLevelOrder;
          const isCurrent = level.order_index === currentLevelOrder;
          const dotColor = level.color || Colors.primary;
          const size = isCurrent ? DOT_CURRENT_SIZE : DOT_SIZE;

          return (
            <View key={level.id} style={styles.step}>
              {/* Dot container — fixed height so all dots align */}
              <View style={styles.dotContainer}>
                <View
                  style={[
                    styles.dot,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderWidth: isCurrent ? 3 : 2.5,
                      backgroundColor: isReached ? dotColor : theme.surface,
                      borderColor: dotColor,
                    },
                  ]}
                >
                  {isCurrent && (
                    <View style={[styles.dotGlow, { backgroundColor: dotColor + '25' }]} />
                  )}
                </View>
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.label,
                  {
                    color: isReached ? dotColor : theme.textTertiary,
                    fontWeight: isCurrent ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {level.name.split(' ')[0]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  trackLine: {
    position: 'absolute',
    top: DOT_CURRENT_SIZE / 2 - LINE_HEIGHT / 2,
    height: LINE_HEIGHT,
    borderRadius: LINE_HEIGHT / 2,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    zIndex: 2,
  },
  dotContainer: {
    width: DOT_CURRENT_SIZE,
    height: DOT_CURRENT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGlow: {
    position: 'absolute',
    width: DOT_CURRENT_SIZE + 12,
    height: DOT_CURRENT_SIZE + 12,
    borderRadius: (DOT_CURRENT_SIZE + 12) / 2,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: (DOT_CURRENT_SIZE - DOT_SIZE) / 2,
  },
});
