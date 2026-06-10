/**
 * ═══════════════════════════════════════════════════════════════
 *  AppHeader — Header persistente com identidade visual da campanha
 *  Layout: [IMAGEM] — [MENU + DEP.FEDERAL INÁCIO] — [6565 + 🔔]
 *  Presente em TODAS as telas autenticadas via tabs layout
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ColorBar } from './ColorBar';

type AppHeaderProps = {
  /** Nome do menu/tela atual (ex.: "Início", "Missões") */
  title?: string;
  /** Contagem de notificações não lidas */
  unreadCount?: number;
  /** Callback ao pressionar o logo */
  onLogoPress?: () => void;
  /** Callback ao pressionar o sino */
  onNotificationPress?: () => void;
};

const LOGO_SIZE = 64;

export function AppHeader({
  title,
  unreadCount = 0,
  onLogoPress,
  onNotificationPress,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={{ backgroundColor: theme.surface }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            backgroundColor: theme.surface,
          },
        ]}
      >
        {/* ═══ ESQUERDA — LOGO CIRCULAR ═══ */}
        <Pressable
          onPress={onLogoPress}
          accessibilityRole="button"
          accessibilityLabel="Ir para o início"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.logoContainer}
        >
          <Image
            source={require('../../assets/brand/logo-inacio.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </Pressable>

        {/* ═══ CENTRO — DEP.FEDERAL INÁCIO + NOME MENU ═══ */}
        <View style={styles.centerBlock}>
          {/* DEP. FEDERAL */}
          <Text style={[styles.depLabel, { color: isDark ? '#D4DFE2' : '#1D1D1F' }]}>
            DEP. FEDERAL
          </Text>

          {/* INÁCIO — letras coloridas da campanha */}
          <View style={styles.inacioRow}>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>I</Text>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>N</Text>
            <Text style={[styles.inacioLetter, { color: '#FAD549' }]}>Á</Text>
            <Text style={[styles.inacioLetter, { color: '#4DAA35' }]}>C</Text>
            <Text style={[styles.inacioLetter, { color: '#2171BA' }]}>I</Text>
            <Text style={[styles.inacioLetter, { color: '#E33431' }]}>O</Text>
          </View>

          {/* Nome do menu — abaixo, com destaque */}
          <Text
            style={[styles.menuTitle, { color: isDark ? '#FFFFFF' : '#1D1D1F' }]}
            numberOfLines={1}
          >
            {title ?? 'Rede de Embaixadores'}
          </Text>
        </View>

        {/* ═══ DIREITA — 6565 + SINO (mesma linha) ═══ */}
        <View style={styles.rightSection}>
          {/* Badge 6565 — oculto por enquanto
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>6565</Text>
          </View>
          */}

          {/* Sino de notificações — ao lado do 6565 */}
          <Pressable
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `${unreadCount} notificações não lidas`
                : 'Notificações'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.bellContainer}
          >
            <MaterialIcons
              name="notifications-none"
              size={26}
              color={isDark ? '#D4DFE2' : '#5F6368'}
            />
            {/* Bolinha vermelha de contagem */}
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ═══ BARRA DE CORES — Assinatura visual oficial ═══ */}
      <ColorBar height={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },

  /* ═══ ESQUERDA — LOGO ═══ */
  logoContainer: {
    marginRight: 10,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#F1F2F4',
  },

  /* ═══ CENTRO — TEXTOS ═══ */
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: -2,
  },
  inacioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  inacioLetter: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  /* ═══ DIREITA — 6565 + SINO (linha horizontal) ═══ */
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  numberBadge: {
    backgroundColor: '#E33431',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bellContainer: {
    position: 'relative',
    padding: 2,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#E33431',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
