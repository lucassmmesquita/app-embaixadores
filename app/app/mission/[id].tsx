/**
 * ═══════════════════════════════════════════════════════════════
 *  Mission Detail Screen — Full state machine workflow
 *  PRD §4.2: Start → Submit (evidence) → Ver status
 *  PRD §6.2: Animação de pontos ao completar
 *  Fase 3: RF-MIS-06 — Detalhe completo, useAsync, Toast
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMissionStore } from '../../stores/missionStore';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { showToast } from '../../components/ui/Toast';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';
import type { Mission, UserMission } from '../../services/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const STATUS_META: Record<string, { color: string; icon: IconName; label: string; description: string }> = {
  available: { color: Colors.primary, icon: 'play-circle-outline', label: 'Disponível', description: 'Inicie esta missão para começar' },
  in_progress: { color: Colors.warning, icon: 'hourglass-top', label: 'Em Progresso', description: 'Complete as atividades e envie' },
  submitted: { color: Colors.info, icon: 'pending', label: 'Em Revisão', description: 'Aguardando análise da equipe' },
  pending_verification: { color: Colors.info, icon: 'pending', label: 'Enviada', description: 'Aguardando análise da equipe' },
  completed: { color: Colors.success, icon: 'check-circle', label: 'Concluída', description: 'Missão completada com sucesso!' },
  rejected: { color: Colors.danger, icon: 'cancel', label: 'Rejeitada', description: 'Corrija e tente novamente' },
  expired: { color: Colors.danger, icon: 'timer-off', label: 'Expirada', description: 'Esta missão expirou' },
  cancelled: { color: Colors.danger, icon: 'cancel', label: 'Cancelada', description: 'Missão cancelada' },
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONE_TIME: 'Única',
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  PER_EVENT: 'Por Evento',
};

const VERIFICATION_LABELS: Record<string, { label: string; description: string; icon: IconName }> = {
  auto: { label: 'Automática', description: 'Verificação instantânea ao submeter', icon: 'bolt' },
  photo: { label: 'Foto', description: 'Envie uma foto como comprovação', icon: 'photo-camera' },
  gps: { label: 'Localização', description: 'Será verificada sua localização', icon: 'location-on' },
  admin_approval: { label: 'Aprovação manual', description: 'A equipe analisará sua submissão', icon: 'admin-panel-settings' },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { myMissions, startMission, submitMission } = useMissionStore();

  // Fase 3: useAsync for proper loading/error
  const loadMission = useCallback(async () => {
    if (!id || id === 'undefined') {
      // Prevents making an API call during Expo Router's first render on web before params are hydrated
      return new Promise<Mission>(() => {}); 
    }
    return api.getMission(id);
  }, [id]);
  const { data: mission, loading, error, reload } = useAsync<Mission>(loadMission, [id]);

  const [actionLoading, setActionLoading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showEvidence, setShowEvidence] = useState(false);

  // Points animation
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const [showPointsAward, setShowPointsAward] = useState(false);

  // Find this mission in user's missions
  const userMission = myMissions.find((um) => um.mission.id === id);
  const currentStatus = userMission?.status || 'available';
  const hasRejection = currentStatus === 'rejected';
  const statusMeta = STATUS_META[currentStatus] || STATUS_META.available;

  const showPointsAnimation = (points: number) => {
    setShowPointsAward(true);
    pointsAnim.setValue(0);
    Animated.sequence([
      Animated.spring(pointsAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 100 }),
      Animated.delay(1500),
      Animated.timing(pointsAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowPointsAward(false));
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startMission(id!);
      showToast('success', 'Missão iniciada! Boa sorte 🚀');
      reload();
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao iniciar missão');
    }
    setActionLoading(false);
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const result = await submitMission(id!, evidenceUrl || undefined, notes || undefined);
      if (result.status === 'completed') {
        showPointsAnimation(mission?.points_reward || 0);
        showToast('success', `Missão completada! +${mission?.points_reward} pontos 🎉`);
      } else if (result.status === 'submitted') {
        showToast('info', 'Submissão enviada! Aguarde a análise da equipe.');
      } else {
        showToast('success', `Progresso registrado: ${result.progress || 1}/${mission?.required_count || 1}`);
      }
      setShowEvidence(false);
      setEvidenceUrl('');
      setNotes('');
      reload();
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao submeter missão');
    }
    setActionLoading(false);
  };

  // ═══ LOADING STATE ═══
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60 }]}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  // ═══ ERROR STATE ═══
  if (error || !mission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ErrorState message="Não foi possível carregar a missão" onRetry={reload} />
      </View>
    );
  }

  const recurrenceLabel = RECURRENCE_LABELS[mission.recurrence] || mission.recurrence;
  const verType = mission.verification_type || (mission.requires_verification ? 'admin_approval' : 'auto');
  const verInfo = VERIFICATION_LABELS[verType] || VERIFICATION_LABELS.auto;
  const canRetry = hasRejection && (!mission.max_submissions || (userMission?.submission_count || 0) < mission.max_submissions);

  return (
    <ScreenWithNav title={mission.title} showBack>
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 100 }}
      >

        {/* ═══ STATUS BANNER ═══ */}
        {currentStatus !== 'available' && (
          <View style={[styles.statusBanner, { backgroundColor: statusMeta.color + '15', borderLeftColor: statusMeta.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <MaterialIcons name={statusMeta.icon} size={20} color={statusMeta.color} />
              <Text style={[Typography.headline, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
            <Text style={[Typography.caption1, { color: statusMeta.color, marginTop: 2 }]}>
              {statusMeta.description}
            </Text>
            {userMission && (
              <View style={styles.progressRow}>
                <Text style={[Typography.caption2, { color: theme.textSecondary }]}>
                  Progresso: {userMission.progress_count}/{mission.required_count}
                </Text>
                <View style={[styles.miniProgressBar, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={[styles.miniProgressFill, {
                    width: `${Math.min((userMission.progress_count / mission.required_count) * 100, 100)}%`,
                    backgroundColor: statusMeta.color,
                  }]} />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ═══ REJECTION REASON ═══ */}
        {hasRejection && userMission?.rejected_reason && (
          <View style={[styles.rejectedCard, { backgroundColor: Colors.danger + '10' }]}>
            <MaterialIcons name="info" size={18} color={Colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: Colors.danger }]}>Motivo da rejeição</Text>
              <Text style={[Typography.body, { color: theme.text, marginTop: Spacing.xs }]}>
                {userMission.rejected_reason}
              </Text>
              {canRetry && (
                <Text style={[Typography.caption1, { color: Colors.warning, marginTop: Spacing.sm }]}>
                  Tentativas: {userMission.submission_count}/{mission.max_submissions || '∞'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ═══ HEADER ═══ */}
        <View style={[styles.header, { backgroundColor: theme.surface }, Shadows.lg]}>
          {mission.is_featured && (
            <View style={[styles.featuredBadge, { backgroundColor: Colors.warning + '20' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialIcons name="star" size={12} color={Colors.warning} /><Text style={[Typography.caption1, { color: Colors.warning, fontWeight: '700' }]}>DESTAQUE</Text></View>
            </View>
          )}
          <Text style={[Typography.title1, { color: theme.text }]}>{mission.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: Colors.success + '15' }]}>
              <Text style={[Typography.headline, { color: Colors.success }]}>+{mission.points_reward} pts</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: theme.surfaceElevated }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name={mission.recurrence !== 'ONE_TIME' ? 'loop' : 'check-circle'} size={14} color={theme.textSecondary} />
                <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
                  {recurrenceLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ DESCRIPTION ═══ */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>Descrição</Text>
          <Text style={[Typography.body, { color: theme.textSecondary, lineHeight: 24 }]}>
            {mission.description}
          </Text>
        </View>

        {/* ═══ STEPS (se existir) ═══ */}
        {mission.steps && (
          <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
              <MaterialIcons name="checklist" size={16} color={Colors.primary} />
              <Text style={[Typography.headline, { color: theme.text }]}>Passo a passo</Text>
            </View>
            <Text style={[Typography.body, { color: theme.textSecondary, lineHeight: 24 }]}>
              {mission.steps}
            </Text>
          </View>
        )}

        {/* ═══ VERIFICATION INFO ═══ */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.base }}>
              <MaterialIcons name="verified" size={16} color={Colors.primary} />
              <Text style={[Typography.headline, { color: theme.text }]}>Como comprovar</Text>
            </View>
          <View style={[styles.verificationCard, { backgroundColor: verInfo.label === 'Automática' ? Colors.success + '10' : Colors.info + '10' }]}>
            <MaterialIcons name={verInfo.icon} size={24} color={verInfo.label === 'Automática' ? Colors.success : Colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: theme.text }]}>{verInfo.label}</Text>
              <Text style={[Typography.caption1, { color: theme.textSecondary, marginTop: 2 }]}>{verInfo.description}</Text>
            </View>
          </View>
        </View>

        {/* ═══ DETAILS ═══ */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.base }]}>Detalhes</Text>
          <DetailRow theme={theme} label="Contagem necessária" value={`${mission.required_count}x`} />
          <DetailRow theme={theme} label="Recorrência" value={recurrenceLabel} />
          {mission.category && (
            <DetailRow theme={theme} label="Categoria" value={`${mission.category.icon || ''} ${mission.category.name}`} />
          )}
          {mission.start_date && (
            <DetailRow theme={theme} label="Início" value={formatDate(mission.start_date)} />
          )}
          {mission.end_date && (
            <DetailRow theme={theme} label="Prazo" value={formatDate(mission.end_date)} />
          )}
          {mission.max_submissions && mission.max_submissions > 0 && (
            <DetailRow theme={theme} label="Máx. tentativas" value={`${mission.max_submissions}`} />
          )}
          {mission.max_daily_completions && mission.max_daily_completions > 0 && (
            <DetailRow theme={theme} label="Máx. por dia" value={`${mission.max_daily_completions}`} />
          )}
          {mission.min_level && (
            <DetailRow theme={theme} label="Nível mínimo" value={mission.min_level.name} />
          )}
        </View>

        {/* ═══ EVIDENCE FORM (for submit) ═══ */}
        {showEvidence && (
          <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>Evidência</Text>
            <Text style={[Typography.caption1, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
              {verType === 'photo'
                ? 'Adicione o link da foto como comprovação'
                : 'Adicione um link para sua evidência (foto, documento ou URL)'}
            </Text>
            <TextInput
              style={[styles.evidenceInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
              placeholder="https://..."
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
              accessibilityLabel="URL da evidência"
            />
            <TextInput
              style={[styles.evidenceInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceElevated, marginTop: Spacing.sm, minHeight: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações (opcional)"
              placeholderTextColor={theme.textTertiary}
              multiline
              accessibilityLabel="Notas da submissão"
            />
          </View>
        )}

        {/* ═══ CTA ═══ */}
        <View style={styles.ctaContainer}>
          {currentStatus === 'available' && (
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
                actionLoading && { opacity: 0.6 },
              ]}
              onPress={handleStart}
              disabled={actionLoading}
              accessibilityRole="button"
              accessibilityLabel="Iniciar missão"
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <MaterialIcons name="rocket-launch" size={18} color="#fff" />
                  <Text style={styles.ctaText}>Iniciar Missão</Text>
                </View>
              )}
            </Pressable>
          )}

          {(currentStatus === 'in_progress' || canRetry) && !showEvidence && (
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: Colors.success, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                if (mission.requires_verification || verType !== 'auto') {
                  setShowEvidence(true);
                } else {
                  handleSubmit();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={canRetry ? 'Re-submeter missão' : 'Submeter missão'}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={styles.ctaText}>
                  {canRetry ? 'Tentar Novamente' : 'Submeter Missão'}
                </Text>
              </View>
            </Pressable>
          )}

          {showEvidence && (
            <View style={{ gap: Spacing.sm }}>
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: Colors.success, opacity: pressed ? 0.85 : 1 },
                  actionLoading && { opacity: 0.6 },
                ]}
                onPress={handleSubmit}
                disabled={actionLoading}
                accessibilityRole="button"
                accessibilityLabel="Enviar submissão"
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={styles.ctaText}>Enviar Submissão</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: theme.surfaceElevated, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => { setShowEvidence(false); setEvidenceUrl(''); setNotes(''); }}
                accessibilityRole="button"
              >
                <Text style={[Typography.headline, { color: theme.text }]}>Cancelar</Text>
              </Pressable>
            </View>
          )}

          {(currentStatus === 'submitted' || currentStatus === 'pending_verification') && (
            <View style={[styles.infoCard, { backgroundColor: Colors.info + '15' }]}>
              <MaterialIcons name="schedule" size={20} color={Colors.info} />
              <Text style={[Typography.subhead, { color: Colors.info }]}>
                Sua submissão está sendo analisada. Você será notificado quando houver uma resposta.
              </Text>
            </View>
          )}

          {currentStatus === 'completed' && (
            <View style={[styles.infoCard, { backgroundColor: Colors.success + '15' }]}>
              <MaterialIcons name="check-circle" size={20} color={Colors.success} />
              <Text style={[Typography.subhead, { color: Colors.success }]}>
                Missão completada! +{mission.points_reward} pontos
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══ POINTS ANIMATION OVERLAY ═══ */}
      {showPointsAward && (
        <Animated.View
          style={[
            styles.pointsOverlay,
            {
              opacity: pointsAnim,
              transform: [
                { scale: pointsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                { translateY: pointsAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.pointsAwardCard}>
            <MaterialIcons name="star" size={48} color={Colors.warning} />
            <Text style={[Typography.largeTitle, { color: Colors.success }]}>
              +{mission?.points_reward} pts!
            </Text>
            <Text style={[Typography.headline, { color: '#fff' }]}>Parabéns! 🎉</Text>
          </View>
        </Animated.View>
      )}
    </View>
    </ScreenWithNav>
  );
}

function DetailRow({ theme, label, value }: { theme: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[Typography.subhead, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[Typography.subhead, { color: theme.text, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    left: Spacing.base,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  statusBanner: {
    marginHorizontal: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: Spacing.base,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  miniProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  rejectedCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  header: {
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  metaBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  section: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  evidenceInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  ctaContainer: { paddingHorizontal: Spacing.base, marginTop: Spacing.base },
  ctaButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
  ctaText: { ...Typography.headline, color: '#fff' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  pointsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pointsAwardCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
});
