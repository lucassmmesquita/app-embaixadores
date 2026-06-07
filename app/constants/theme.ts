/**
 * ═══════════════════════════════════════════════════════════════
 *  Design System — Apple-Inspired Theme
 *  Colors, typography, spacing, and design tokens
 * ═══════════════════════════════════════════════════════════════
 */

export const Colors = {
  // ═══ PRIMARY PALETTE ═══
  primary: '#007AFF',        // Apple Blue
  primaryLight: '#4DA2FF',
  primaryDark: '#0055CC',

  // ═══ ACCENT ═══
  accent: '#5856D6',         // Indigo
  accentLight: '#7A78E3',
  success: '#34C759',        // Green
  warning: '#FF9500',        // Orange
  danger: '#FF3B30',         // Red
  info: '#5AC8FA',           // Teal

  // ═══ LEVEL COLORS ═══
  levels: {
    apoiador: '#60A5FA',
    embaixador: '#34D399',
    mobilizador: '#FBBF24',
    liderComunitario: '#F97316',
    coordenadorDeRede: '#EF4444',
  },

  // ═══ BADGE RARITY ═══
  rarity: {
    common: '#94A3B8',
    uncommon: '#34D399',
    rare: '#60A5FA',
    epic: '#A78BFA',
    legendary: '#FBBF24',
  },

  // ═══ DARK THEME (Primary) ═══
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    surfaceHighest: '#3A3A3C',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    border: '#38383A',
    borderLight: '#2C2C2E',
    separator: 'rgba(84, 84, 88, 0.65)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    card: 'rgba(28, 28, 30, 0.8)',
    glass: 'rgba(28, 28, 30, 0.6)',
  },

  // ═══ LIGHT THEME ═══
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#F2F2F7',
    surfaceHighest: '#E5E5EA',
    text: '#000000',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#C6C6C8',
    borderLight: '#E5E5EA',
    separator: 'rgba(60, 60, 67, 0.29)',
    overlay: 'rgba(0, 0, 0, 0.3)',
    card: 'rgba(255, 255, 255, 0.8)',
    glass: 'rgba(255, 255, 255, 0.6)',
  },
};

export const Typography = {
  // Apple SF Pro inspired sizing
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};

export const Animations = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 0.5,
  },
};
