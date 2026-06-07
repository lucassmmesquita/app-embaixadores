/**
 * ═══════════════════════════════════════════════════════════════
 *  Event Detail Screen
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import api from '../../services/api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadEvent(); }, [id]);

  const loadEvent = async () => {
    try {
      const data = await api.getEvent(id!);
      setEvent(data);
    } catch { /* placeholder */ }
    setLoading(false);
  };

  const handleRegister = async () => {
    setActionLoading(true);
    try {
      await api.registerForEvent(id!);
      Alert.alert('Inscrição Confirmada!', 'Você está inscrito neste evento. Não esqueça de fazer check-in!');
      loadEvent();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
    setActionLoading(false);
  };

  const handleCheckin = async () => {
    setActionLoading(true);
    try {
      const result = await api.checkinEvent(id!);
      Alert.alert('Check-in Realizado!', `Presença confirmada!${result.gamification ? ` Você ganhou ${event.points_reward} pontos!` : ''}`);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.start_datetime);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 100 }}
    >
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { backgroundColor: Colors.primary }, Shadows.lg]}>
        <Text style={[Typography.title3, { color: 'rgba(255,255,255,0.8)' }]}>
          {eventDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
        </Text>
        <Text style={[Typography.largeTitle, { color: '#fff' }]}>
          {eventDate.getDate()} {eventDate.toLocaleDateString('pt-BR', { month: 'long' })}
        </Text>
        <Text style={[Typography.headline, { color: 'rgba(255,255,255,0.9)' }]}>
          {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
        {event.location_name && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: theme.text }]}>{event.location_name}</Text>
              {event.address && (
                <Text style={[Typography.caption1, { color: theme.textSecondary }]}>{event.address}</Text>
              )}
            </View>
          </View>
        )}
        {event.online_url && (
          <View style={styles.detailRow}>
            <MaterialIcons name="laptop" size={22} color={Colors.primary} />
            <Text style={[Typography.subhead, { color: Colors.primary }]}>Evento Online</Text>
          </View>
        )}
        {event.points_reward > 0 && (
          <View style={styles.detailRow}>
            <MaterialIcons name="star" size={22} color={Colors.success} />
            <Text style={[Typography.headline, { color: Colors.success }]}>+{event.points_reward} pontos por participar</Text>
          </View>
        )}
        {event.max_capacity && (
          <View style={styles.detailRow}>
            <MaterialIcons name="group" size={22} color={Colors.primary} />
            <Text style={[Typography.subhead, { color: theme.text }]}>
              Capacidade: {event.max_capacity} pessoas
            </Text>
          </View>
        )}
      </View>

      {/* ═══ CTA BUTTONS ═══ */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
            actionLoading && { opacity: 0.6 },
          ]}
          onPress={handleRegister}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <MaterialIcons name="how-to-reg" size={18} color="#fff" />
              <Text style={styles.ctaText}>Inscrever-se</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: Colors.success, opacity: pressed ? 0.85 : 1 },
            actionLoading && { opacity: 0.6 },
          ]}
          onPress={handleCheckin}
          disabled={actionLoading}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <MaterialIcons name="location-on" size={18} color="#fff" />
            <Text style={styles.ctaText}>Fazer Check-in</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
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
  ctaContainer: { paddingHorizontal: Spacing.base, gap: Spacing.sm, marginTop: Spacing.base },
  ctaButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
  ctaText: { ...Typography.headline, color: '#fff' },
});
