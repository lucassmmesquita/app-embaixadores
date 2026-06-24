/**
 * ═══════════════════════════════════════════════════════════════
 *  Terms of Use Screen — RF-AUTH-15
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScreenWithNav title="Termos de Uso" showBack>
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconBadge, { backgroundColor: Colors.primary + '12' }]}>
          <MaterialIcons name="description" size={32} color={Colors.primary} />
        </View>

        <Text style={[Typography.title3, { color: theme.text, textAlign: 'center', marginBottom: Spacing.xl }]}>
          Termos de Uso da Rede de Embaixadores
        </Text>

        <Section theme={theme} title="1. Aceitação dos Termos">
          Ao acessar e usar o aplicativo Rede de Embaixadores ("App"), você concorda com estes Termos de Uso.
          Se não concordar com algum dos termos, não utilize o App.
        </Section>

        <Section theme={theme} title="2. Descrição do Serviço">
          O App é uma plataforma de engajamento cívico que permite aos usuários ("Embaixadores")
          participar de missões, eventos, compartilhar conteúdo e acumular pontos em um sistema de gamificação.
        </Section>

        <Section theme={theme} title="3. Cadastro e Conta">
          Para utilizar o App, é necessário criar uma conta com informações verdadeiras e completas.
          Você é responsável por manter a confidencialidade de sua senha e por todas as atividades
          realizadas com sua conta.
        </Section>

        <Section theme={theme} title="4. Uso Aceitável">
          Você concorda em utilizar o App de forma ética e legal, sem:{'\n'}
          • Publicar conteúdo ofensivo, difamatório ou ilegal{'\n'}
          • Tentar manipular o sistema de pontos ou rankings{'\n'}
          • Criar contas falsas ou múltiplas{'\n'}
          • Acessar dados de outros usuários sem autorização
        </Section>

        <Section theme={theme} title="5. Pontos e Recompensas">
          Os pontos acumulados são de caráter simbólico e representam o engajamento do Embaixador.
          A organização se reserva o direito de ajustar o sistema de pontuação a qualquer momento.
        </Section>

        <Section theme={theme} title="6. Privacidade">
          O tratamento de dados pessoais está descrito em nossa Política de Privacidade,
          em conformidade com a LGPD (Lei nº 13.709/2018).
        </Section>

        <Section theme={theme} title="7. Exclusão de Conta">
          Você pode solicitar a exclusão de sua conta a qualquer momento através do menu Perfil.
          Seus dados serão anonimizados conforme previsto na LGPD.
        </Section>

        <Section theme={theme} title="8. Alterações nos Termos">
          Podemos atualizar estes Termos a qualquer momento. Alterações significativas serão
          comunicadas pelo App. O uso continuado após as alterações implica aceitação dos novos termos.
        </Section>

        <Text style={[Typography.caption1, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xl }]}>
          Última atualização: Junho de 2026
        </Text>
      </ScrollView>
    </View>
    </ScreenWithNav>
  );
}

function Section({ theme, title, children }: { theme: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>{title}</Text>
      <Text style={[Typography.body, { color: theme.textSecondary, lineHeight: 24 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
});
