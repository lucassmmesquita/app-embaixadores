/**
 * ═══════════════════════════════════════════════════════════════
 *  Privacy Policy Screen — RF-AUTH-15, LGPD §8.1
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[Typography.headline, { color: theme.text }]}>Política de Privacidade</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconBadge, { backgroundColor: Colors.success + '12' }]}>
          <MaterialIcons name="shield" size={32} color={Colors.success} />
        </View>

        <Text style={[Typography.title3, { color: theme.text, textAlign: 'center', marginBottom: Spacing.xl }]}>
          Política de Privacidade e Proteção de Dados
        </Text>

        <Section theme={theme} title="1. Introdução">
          A Rede de Embaixadores valoriza sua privacidade. Esta política descreve como coletamos,
          usamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de
          Dados Pessoais (LGPD — Lei nº 13.709/2018).
        </Section>

        <Section theme={theme} title="2. Dados Coletados">
          Coletamos os seguintes dados:{'\n'}
          • <Text style={{ fontWeight: '600' }}>Cadastro:</Text> nome, e-mail, telefone (opcional), cidade/estado{'\n'}
          • <Text style={{ fontWeight: '600' }}>Uso do App:</Text> missões concluídas, eventos frequentados, conteúdos compartilhados{'\n'}
          • <Text style={{ fontWeight: '600' }}>Gamificação:</Text> pontos, badges, nível, posição no ranking{'\n'}
          • <Text style={{ fontWeight: '600' }}>Técnicos:</Text> modelo do dispositivo, versão do sistema operacional (para suporte)
        </Section>

        <Section theme={theme} title="3. Base Legal (LGPD Art. 7º)">
          Tratamos seus dados com base em:{'\n'}
          • <Text style={{ fontWeight: '600' }}>Consentimento:</Text> para comunicações e ranking público{'\n'}
          • <Text style={{ fontWeight: '600' }}>Execução de contrato:</Text> para funcionamento do App{'\n'}
          • <Text style={{ fontWeight: '600' }}>Legítimo interesse:</Text> para melhorias e segurança
        </Section>

        <Section theme={theme} title="4. Consentimentos Granulares">
          Ao se cadastrar, você pode conceder ou revogar consentimentos individuais:{'\n\n'}
          <Text style={{ fontWeight: '600' }}>• Tratamento de dados:</Text> obrigatório para usar o App{'\n'}
          <Text style={{ fontWeight: '600' }}>• Comunicações:</Text> notificações, e-mails e atualizações{'\n'}
          <Text style={{ fontWeight: '600' }}>• Ranking público:</Text> exibir seu nome no ranking{'\n\n'}
          Você pode alterar esses consentimentos a qualquer momento em Perfil → Privacidade.
        </Section>

        <Section theme={theme} title="5. Compartilhamento de Dados">
          Não vendemos seus dados. Compartilhamos apenas com:{'\n'}
          • Provedores de infraestrutura (hospedagem e banco de dados){'\n'}
          • Serviços de autenticação (Google, Apple){'\n'}
          • Quando exigido por lei ou ordem judicial
        </Section>

        <Section theme={theme} title="6. Seus Direitos (LGPD Art. 18)">
          Você tem direito a:{'\n'}
          • Acessar seus dados pessoais{'\n'}
          • Corrigir dados incompletos ou desatualizados{'\n'}
          • Revogar consentimentos (exceto tratamento obrigatório){'\n'}
          • Solicitar exclusão de conta e anonimização dos dados{'\n'}
          • Portabilidade dos dados
        </Section>

        <Section theme={theme} title="7. Exclusão e Anonimização">
          Ao solicitar exclusão de conta (Perfil → Excluir Conta), seus dados pessoais
          serão anonimizados. Dados agregados de gamificação podem ser mantidos de forma
          anonimizada para fins estatísticos.
        </Section>

        <Section theme={theme} title="8. Segurança">
          Utilizamos criptografia, controle de acesso e monitoramento para proteger
          seus dados. Senhas são armazenadas com hash seguro (bcrypt).
        </Section>

        <Section theme={theme} title="9. Contato do Encarregado (DPO)">
          Para exercer seus direitos ou tirar dúvidas sobre privacidade:{'\n\n'}
          📧 privacidade@embaixadores.app
        </Section>

        <Text style={[Typography.caption1, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xl }]}>
          Última atualização: Junho de 2026
        </Text>
      </ScrollView>
    </View>
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
