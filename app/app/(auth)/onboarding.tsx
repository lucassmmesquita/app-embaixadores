/**
 * ═══════════════════════════════════════════════════════════════
 *  Onboarding Screen — Welcome slides for first-time users
 *  Only shown once (flag saved in AsyncStorage)
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = '@onboarding_completed';

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🏛️',
    title: 'Bem-vindo à Rede\nde Embaixadores',
    subtitle: 'Conecte-se. Mobilize. Transforme.',
    description:
      'Uma plataforma que conecta pessoas engajadas em torno de uma causa comum. Junte-se a milhares de embaixadores em todo o Brasil.',
    accentColor: Colors.primary,
  },
  {
    id: '2',
    emoji: '🎯',
    title: 'Complete Missões\ne Ganhe Pontos',
    subtitle: 'Engajamento que recompensa',
    description:
      'Participe de missões diárias, compartilhe conteúdo, participe de eventos e acumule pontos. Cada ação sua faz a diferença!',
    accentColor: Colors.success,
  },
  {
    id: '3',
    emoji: '🏆',
    title: 'Suba de Nível e\nDesbloqueie Conquistas',
    subtitle: 'Do Apoiador ao Coordenador de Rede',
    description:
      'Evolua do nível Apoiador até Coordenador de Rede. Desbloqueie badges exclusivos, acesse eventos VIP e lidere sua comunidade.',
    accentColor: Colors.warning,
  },
  {
    id: '4',
    emoji: '🚀',
    title: 'Pronto para\nComeçar?',
    subtitle: 'Sua jornada começa agora',
    description:
      'Crie sua conta em segundos e comece a fazer parte da maior rede de mobilização do país.',
    accentColor: Colors.accent,
  },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* ═══ EMOJI CIRCLE ═══ */}
      <View style={[styles.emojiCircle, { backgroundColor: item.accentColor + '15' }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>

      {/* ═══ TEXT ═══ */}
      <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: item.accentColor }]}>{item.subtitle}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* ═══ SKIP BUTTON ═══ */}
      <View style={styles.topBar}>
        {!isLastSlide ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Pular</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* ═══ SLIDES ═══ */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: SLIDES[currentIndex].accentColor,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Main CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: SLIDES[currentIndex].accentColor,
              opacity: pressed ? 0.85 : 1,
            },
            Shadows.md,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Começar Agora' : 'Próximo'}
          </Text>
        </Pressable>

        {/* Login link on last slide */}
        {isLastSlide && (
          <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={[Typography.subhead, { color: theme.textSecondary }]}>
              Já tem conta?{' '}
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>Entrar</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export { ONBOARDING_KEY };

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    ...Typography.largeTitle,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.headline,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  nextButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
