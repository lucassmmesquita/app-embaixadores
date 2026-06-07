/**
 * ═══════════════════════════════════════════════════════════════
 *  Design System — Inácio Arruda
 *  Paleta institucional, tipografia e tokens de design
 * ═══════════════════════════════════════════════════════════════
 */

export const Colors = {
  // ═══ PALETA INSTITUCIONAL ═══
  primary: '#2171BA',        // ia-blue-500 — Confiança, botões, navegação
  primaryLight: '#399BD8',   // ia-theme-youth
  primaryDark: '#315DA6',    // ia-theme-science

  // ═══ ACCENT / BRAND ═══
  accent: '#E33431',         // ia-red-500 — Energia, urgência, CTAs
  accentLight: '#F05E5C',
  success: '#4DAA35',        // ia-green-500 — Esperança, cultura
  warning: '#FAD549',        // ia-yellow-500 — Otimismo, destaque
  danger: '#E33431',         // ia-red-500
  info: '#399BD8',           // ia-theme-youth

  // ═══ LOGO COLORS ═══
  logo: {
    red: '#ED1C22',
    yellow: '#FDD303',
    green: '#3AB54A',
    cyan: '#027AC3',
  },

  // ═══ COLOR BAR (Assinatura Visual) ═══
  colorBar: {
    red: '#E33431',
    yellow: '#FAD549',
    green: '#4DAA35',
    blue: '#2171BA',
  },

  // ═══ PALETA TEMÁTICA ═══
  themes: {
    workers: '#7A3F8F',      // Trabalhadoras — roxo
    women: '#FEBA0F',        // Mulheres — amarelo forte
    youth: '#399BD8',        // Juventude — azul claro
    culture: '#3A8E36',      // Cultura — verde
    science: '#315DA6',      // Ciência/Tech/Edu — azul escuro
  },

  // ═══ LEVEL COLORS (Gamificação) ═══
  levels: {
    apoiador: '#4DAA35',       // Verde — Apoiador
    mobilizador: '#399BD8',    // Azul claro — Mobilizador
    lider: '#FAD549',          // Amarelo — Líder
    embaixador: '#E33431',     // Vermelho — Embaixador
    coordenador: '#7A3F8F',    // Roxo — Coordenador de Rede
  },

  // ═══ BADGE RARITY ═══
  rarity: {
    common: '#8E8E93',
    uncommon: '#4DAA35',
    rare: '#2171BA',
    epic: '#7A3F8F',
    legendary: '#FAD549',
  },

  // ═══ DARK THEME ═══
  dark: {
    background: '#0A0A0F',
    surface: '#1A1A24',
    surfaceElevated: '#252530',
    surfaceHighest: '#32323E',
    text: '#FFFFFF',
    textSecondary: '#A0A0AB',
    textTertiary: '#6B6B78',
    border: '#32323E',
    borderLight: '#252530',
    separator: 'rgba(100, 100, 112, 0.45)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: 'rgba(26, 26, 36, 0.85)',
    glass: 'rgba(26, 26, 36, 0.65)',
  },

  // ═══ LIGHT THEME ═══
  light: {
    background: '#F1F2F4',     // ia-offwhite
    surface: '#FFFFFF',        // ia-white
    surfaceElevated: '#F1F2F4',
    surfaceHighest: '#D4DFE2', // ia-gray-200
    text: '#1D1D1F',           // ia-ink
    textSecondary: '#5F6368',  // ia-muted
    textTertiary: '#8E8E93',
    border: '#D4DFE2',        // ia-gray-200
    borderLight: '#E8EAED',
    separator: 'rgba(60, 60, 67, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.3)',
    card: 'rgba(255, 255, 255, 0.9)',
    glass: 'rgba(255, 255, 255, 0.7)',
  },
};

export const Typography = {
  // Mantém a escala SF Pro / Roboto nativa, com ajustes de peso
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,  // Extra bold para títulos (estilo campanha)
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '800' as const,
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
    fontWeight: '700' as const,
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
  xs: 4,       // ia-space-1
  sm: 8,       // ia-space-2
  md: 12,      // ia-space-3
  base: 16,    // ia-space-4
  lg: 24,      // ia-space-5
  xl: 32,      // ia-space-6
  '2xl': 48,   // ia-space-7
  '3xl': 64,   // ia-space-8
  '4xl': 96,   // ia-space-9
  '5xl': 128,
};

export const BorderRadius = {
  xs: 4,       // ia-radius-sm
  sm: 8,       // ia-radius-md
  md: 12,
  lg: 16,      // ia-radius-lg
  xl: 20,
  '2xl': 24,
  pill: 999,   // ia-radius-pill
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,      // ia-shadow-card
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
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
