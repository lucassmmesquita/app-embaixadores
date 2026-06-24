/**
 * ═══════════════════════════════════════════════════════════════
 *  Event Detail Screen — Check-in with code + geo
 *  PRD §4.3: Check-in = código + janela temporal + geo
 *  Fase 4: RF-EVT-05/06 — Toast, useAsync, maps deep link, 
 *          back button, cancel registration, RewardOverlay
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { showToast } from '../../components/ui/Toast';
import { ScreenWithNav } from '../../components/ui/ScreenWithNav';
import { useGamificationStore } from '../../stores/gamificationStore';
import { useAuthStore } from '../../stores/authStore';
import type { Event as EventType } from '../../services/types';
import { getEventShareMessage, getEventLink, getInviteLink } from '../../utils/shareMessages';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const EVENT_TYPE_LABELS: Record<string, { icon: IconName; label: string }> = {
  meeting: { icon: 'handshake', label: 'Reunião' },
  rally: { icon: 'campaign', label: 'Comício' },
  training: { icon: 'school', label: 'Treinamento' },
  community: { icon: 'location-city', label: 'Comunitário' },
  online: { icon: 'laptop', label: 'Online' },
  exclusive: { icon: 'star', label: 'Exclusivo' },
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showReward = useGamificationStore((s) => s.showReward);

  // Fase 4: useAsync instead of silent catch
  const loadEvent = useCallback(() => api.getEvent(id!), [id]);
  const { data: event, loading, error, reload } = useAsync<EventType>(loadEvent, [id]);

  const [actionLoading, setActionLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Check-in modal state
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinCode, setCheckinCode] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleRegister = async () => {
    setActionLoading(true);
    try {
      await api.registerForEvent(id!);
      showToast('success', 'Inscrição confirmada! Não esqueça do check-in 🎉');
      reload();
    } catch (error: any) {
      const msg = error.message || 'Falha ao inscrever-se';
      if (msg.includes('já') || msg.includes('already')) {
        showToast('warning', 'Você já está inscrito neste evento');
      } else {
        showToast('error', msg);
      }
    }
    setActionLoading(false);
  };

  const handleCancelRegistration = async () => {
    setActionLoading(true);
    try {
      await api.cancelEventRegistration(id!);
      showToast('info', 'Inscrição cancelada');
      reload();
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao cancelar inscrição');
    }
    setActionLoading(false);
  };

  const handleShare = async () => {
    if (!event) return;
    setSharing(true);
    try {
      // Record share in backend (awards points)
      const result = await api.shareEvent(id!, 'whatsapp');

      // Build tracked event link with referral code
      const referralCode = useAuthStore.getState().user?.referral_code || '';
      const eventLink = getEventLink(event.id, referralCode);
      const inviteLnk = getInviteLink(referralCode);

      const eventDate = new Date(event.start_datetime);
      const dateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isOnline = event.event_type === 'online' || !!event.online_url;

      const shareMessage = getEventShareMessage(
        isOnline,
        dateStr,
        timeStr,
        event.location_name || '',
        eventLink,
        inviteLnk,
        event.online_url,
      );

      // Platform-aware share
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ title: event.title, text: shareMessage });
          } catch { /* cancelled */ }
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(shareMessage);
            showToast('success', 'Link copiado!');
          } catch {
            window.prompt('Copie o link abaixo:', eventLink);
          }
        } else {
          window.prompt('Copie o link abaixo:', eventLink);
        }
      } else {
        await Share.share({ message: shareMessage, title: event.title });
      }

      if (result.points_awarded && result.points_awarded > 0) {
        showReward({ type: 'points', points: result.points_awarded });
        showToast('success', `+${result.points_awarded} pontos por compartilhar! 🎉`);
      }
    } catch {
      // User cancelled share — no error needed
    }
    setSharing(false);
  };

  const requestLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const Location = await import('expo-location').catch(() => null);
      if (Location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } else {
          setLocationError('Permissão de localização negada. Apenas o código será usado.');
        }
      } else {
        setLocationError('Localização não disponível. Apenas o código será usado.');
      }
    } catch {
      setLocationError('Não foi possível obter sua localização. Apenas o código será usado.');
    }
    setLocationLoading(false);
  };

  const openCheckinModal = () => {
    setShowCheckinModal(true);
    setCheckinCode('');
    setUserLocation(null);
    setLocationError(null);
    requestLocation();
  };

  const handleCheckin = async () => {
    const hasGeo = !!(event?.latitude && event?.longitude);
    
    // Only require code for events without geo-validation
    if (!hasGeo && !checkinCode.trim()) {
      showToast('warning', 'Informe o código do evento');
      return;
    }

    setActionLoading(true);
    try {
      const result = await api.checkinEvent(id!, {
        checkin_code: checkinCode.trim() || undefined,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
      });

      setShowCheckinModal(false);

      if (result.gamification) {
        showReward({ type: 'points', points: result.gamification.points_awarded });
        showToast('success', `Check-in realizado! +${result.gamification.points_awarded} pontos 🎉`);
      } else {
        showToast('success', 'Check-in realizado! Presença confirmada ✓');
      }
      reload();
    } catch (error: any) {
      const msg = error.message || 'Falha no check-in';
      if (msg.includes('código') || msg.includes('code')) {
        showToast('error', 'Código incorreto. Verifique e tente novamente.');
      } else if (msg.includes('janela') || msg.includes('window') || msg.includes('encerr')) {
        showToast('error', 'Janela de check-in encerrada.');
      } else if (msg.includes('distância') || msg.includes('distance')) {
        showToast('error', 'Você está muito longe do local do evento.');
      } else {
        showToast('error', msg);
      }
    }
    setActionLoading(false);
  };

  const openMaps = () => {
    if (!event?.latitude || !event?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
    Linking.openURL(url);
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
  if (error || !event) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ErrorState message="Não foi possível carregar o evento" onRetry={reload} />
      </View>
    );
  }

  const eventDate = new Date(event.start_datetime);
  const now = new Date();
  const checkinStart = event.checkin_start ? new Date(event.checkin_start) : null;
  const checkinEnd = event.checkin_end ? new Date(event.checkin_end) : null;
  const isCheckinOpen = checkinStart && checkinEnd
    ? now >= checkinStart && now <= checkinEnd
    : now >= eventDate;

  const typeInfo = EVENT_TYPE_LABELS[event.event_type] || { icon: 'event' as IconName, label: event.event_type };
  const hasLocation = !!(event.latitude && event.longitude);
  const capacityFull = event.max_capacity ? (event.participants_count || 0) >= event.max_capacity : false;

  return (
    <ScreenWithNav title={event.title} showBack>
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: 100 }}
      >

        {/* ═══ DATE HEADER ═══ */}
        <View style={[styles.header, { backgroundColor: Colors.primary }, Shadows.lg]}>
          <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialIcons name={typeInfo.icon} size={14} color="#fff" />
            <Text style={[Typography.caption1, { color: '#fff', fontWeight: '600' }]}>{typeInfo.label}</Text>
          </View>
          <Text style={[Typography.title3, { color: 'rgba(255,255,255,0.8)' }]}>
            {eventDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
          </Text>
          <Text style={[Typography.largeTitle, { color: '#fff' }]}>
            {eventDate.getDate()} {eventDate.toLocaleDateString('pt-BR', { month: 'long' })}
          </Text>
          <Text style={[Typography.headline, { color: 'rgba(255,255,255,0.9)' }]}>
            {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {event.end_datetime && ` — ${new Date(event.end_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>

        {/* ═══ EVENT INFO ═══ */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <Text style={[Typography.title2, { color: theme.text }]}>{event.title}</Text>
          {event.description && (
            <Text style={[Typography.body, { color: theme.textSecondary, marginTop: Spacing.sm, lineHeight: 24 }]}>
              {event.description}
            </Text>
          )}
        </View>

        {/* ═══ DETAILS ═══ */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          {(event.location_name || hasLocation) && (
            <Pressable
              style={styles.detailRow}
              onPress={hasLocation ? openMaps : undefined}
              accessibilityRole={hasLocation ? 'link' : undefined}
              accessibilityLabel={hasLocation ? 'Abrir localização no mapa' : undefined}
            >
              <MaterialIcons name="location-on" size={22} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.headline, { color: theme.text }]}>
                  {event.location_name || 'Evento Presencial'}
                </Text>
                {event.address && (
                  <Text style={[Typography.caption1, { color: theme.textSecondary }]}>{event.address}</Text>
                )}
                {event.city && (
                  <Text style={[Typography.caption2, { color: theme.textTertiary }]}>{event.city}</Text>
                )}
              </View>
              {hasLocation && (
                <View style={[styles.mapBadge, { backgroundColor: Colors.primary + '15' }]}>
                  <MaterialIcons name="map" size={16} color={Colors.primary} />
                  <Text style={[Typography.caption2, { color: Colors.primary, fontWeight: '600' }]}>Mapa</Text>
                </View>
              )}
            </Pressable>
          )}

          {event.online_url && (
            <Pressable
              style={styles.detailRow}
              onPress={() => Linking.openURL(event.online_url!)}
              accessibilityRole="link"
            >
              <MaterialIcons name="laptop" size={22} color={Colors.info} />
              <Text style={[Typography.subhead, { color: Colors.info }]}>Acessar evento online</Text>
              <MaterialIcons name="open-in-new" size={16} color={Colors.info} />
            </Pressable>
          )}

          {event.points_reward > 0 && (
            <View style={styles.detailRow}>
              <MaterialIcons name="star" size={22} color={Colors.success} />
              <Text style={[Typography.headline, { color: Colors.success }]}>+{event.points_reward} pontos por participar</Text>
            </View>
          )}

          {event.max_capacity && (
            <View style={styles.detailRow}>
              <MaterialIcons name="group" size={22} color={capacityFull ? Colors.danger : Colors.primary} />
              <Text style={[Typography.subhead, { color: capacityFull ? Colors.danger : theme.text }]}>
                {event.participants_count || 0}/{event.max_capacity} inscritos
                {capacityFull && ' (lotado)'}
              </Text>
            </View>
          )}

          {checkinStart && checkinEnd && (
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={22} color={isCheckinOpen ? Colors.success : theme.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.subhead, { color: isCheckinOpen ? Colors.success : theme.text }]}>
                  {isCheckinOpen ? 'Check-in aberto!' : 'Check-in fechado'}
                </Text>
                <Text style={[Typography.caption2, { color: theme.textTertiary }]}>
                  {checkinStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {checkinEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ═══ CTA BUTTONS ═══ */}
        <View style={styles.ctaContainer}>
          {/* Share */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: '#25D366', opacity: pressed ? 0.85 : 1 },
              sharing && { opacity: 0.6 },
            ]}
            onPress={handleShare}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar evento"
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <MaterialIcons name="share" size={18} color="#fff" />
                <Text style={styles.ctaText}>Compartilhar Evento</Text>
              </View>
            )}
          </Pressable>

          {/* Register */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: capacityFull ? theme.surfaceElevated : Colors.primary, opacity: pressed ? 0.85 : 1 },
              actionLoading && { opacity: 0.6 },
            ]}
            onPress={handleRegister}
            disabled={actionLoading || capacityFull}
            accessibilityRole="button"
            accessibilityLabel="Inscrever-se no evento"
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <MaterialIcons name="how-to-reg" size={18} color={capacityFull ? theme.textTertiary : '#fff'} />
                <Text style={[styles.ctaText, capacityFull && { color: theme.textTertiary }]}>
                  {capacityFull ? 'Evento Lotado' : 'Inscrever-se'}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Check-in */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: isCheckinOpen ? Colors.success : theme.surfaceElevated,
                opacity: pressed ? 0.85 : 1,
              },
              !isCheckinOpen && { opacity: 0.6 },
            ]}
            onPress={openCheckinModal}
            disabled={!isCheckinOpen}
            accessibilityRole="button"
            accessibilityLabel="Fazer check-in"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <MaterialIcons name="qr-code-scanner" size={18} color={isCheckinOpen ? '#fff' : theme.textTertiary} />
              <Text style={[styles.ctaText, !isCheckinOpen && { color: theme.textTertiary }]}>
                Fazer Check-in
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* ═══ CHECK-IN MODAL ═══ */}
      <Modal
        visible={showCheckinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.title3, { color: theme.text }]}>Check-in</Text>
              <Pressable onPress={() => setShowCheckinModal(false)} accessibilityRole="button" accessibilityLabel="Fechar">
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            {/* Code input — only for events without geo-validation */}
            {!(event?.latitude && event?.longitude) && (
              <View style={styles.modalSection}>
                <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.sm }]}>
                  Código do Evento
                </Text>
                <TextInput
                  style={[styles.codeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                  value={checkinCode}
                  onChangeText={setCheckinCode}
                  placeholder="Digite o código"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCheckin}
                  accessibilityLabel="Código do evento"
                />
              </View>
            )}

            {/* Location status — only for presencial events */}
            {!!(event?.latitude && event?.longitude) && (
            <View style={styles.modalSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <Text style={[Typography.headline, { color: theme.text }]}>
                  Verificação de Localização
                </Text>
                <View style={{ backgroundColor: Colors.danger + '15', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full }}>
                  <Text style={[Typography.caption2, { color: Colors.danger, fontWeight: '700' }]}>OBRIGATÓRIA</Text>
                </View>
              </View>
              {locationLoading ? (
                <View style={styles.locationStatus}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={[Typography.subhead, { color: theme.textSecondary }]}>Obtendo localização...</Text>
                </View>
              ) : userLocation ? (
                <View style={[styles.locationStatus, { backgroundColor: Colors.success + '10' }]}>
                  <MaterialIcons name="my-location" size={18} color={Colors.success} />
                  <Text style={[Typography.subhead, { color: Colors.success }]}>Localização obtida ✓</Text>
                </View>
              ) : (
                <View style={[styles.locationStatus, { backgroundColor: Colors.danger + '10' }]}>
                  <MaterialIcons name="location-off" size={18} color={Colors.danger} />
                  <Text style={[Typography.caption1, { color: Colors.danger }]}>
                    {locationError || 'Ative o GPS e permita o acesso à sua localização para confirmar presença.'}
                  </Text>
                  <Pressable onPress={requestLocation} style={{ marginLeft: 'auto' }}>
                    <Text style={[Typography.caption1, { color: Colors.primary, fontWeight: '600' }]}>Tentar novamente</Text>
                  </Pressable>
                </View>
              )}
            </View>
            )}

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: (event?.latitude && !userLocation) ? theme.surfaceElevated : Colors.success,
                  opacity: pressed ? 0.85 : 1,
                },
                (actionLoading || (event?.latitude && !userLocation)) && { opacity: 0.6 },
              ]}
              onPress={handleCheckin}
              disabled={actionLoading || !!(event?.latitude && !userLocation)}
              accessibilityRole="button"
              accessibilityLabel="Confirmar check-in"
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <MaterialIcons name="check-circle" size={18} color={(event?.latitude && !userLocation) ? theme.textTertiary : '#fff'} />
                  <Text style={[styles.ctaText, (event?.latitude && !userLocation) && { color: theme.textTertiary }]}>Confirmar Check-in</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </ScreenWithNav>
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
  header: {
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  ctaContainer: { paddingHorizontal: Spacing.base, gap: Spacing.sm, marginTop: Spacing.base },
  ctaButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
  ctaText: { ...Typography.headline, color: '#fff' },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSection: { gap: Spacing.xs },
  codeInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.title3,
    textAlign: 'center',
    letterSpacing: 4,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
});
