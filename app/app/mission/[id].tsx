/**
 * ═══════════════════════════════════════════════════════════════
 *  Mission Detail Screen
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMission();
  }, [id]);

  const loadMission = async () => {
    try {
      const data = await api.getMission(id!);
      setMission(data);
    } catch { /* placeholder */ }
    setLoading(false);
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await api.startMission(id!);
      Alert.alert('Missão Iniciada!', 'Boa sorte! Complete as atividades para ganhar pontos.');
      loadMission();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
    setActionLoading(false);
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const result = await api.submitMission(id!);
      if (result.status === 'completed') {
        Alert.alert('Missão Completada!', `Você ganhou ${mission.points_reward} pontos!`);
      } else {
        Alert.alert('Enviado', 'Sua submissão será analisada pela equipe.');
      }
      loadMission();
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

  if (!mission) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 100 }}
    >
      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { backgroundColor: theme.surface }, Shadows.lg]}>
        {mission.is_featured && (
          <View style={[styles.featuredBadge, { backgroundColor: Colors.warning + '20' }]}>
            <Text style={[Typography.caption1, { color: Colors.warning, fontWeight: '700' }]}><MaterialIcons name="star" size={12} color={Colors.warning} /> DESTAQUE</Text>
          </View>
        )}
        <Text style={[Typography.title1, { color: theme.text }]}>{mission.title}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: Colors.success + '15' }]}>
            <Text style={[Typography.headline, { color: Colors.success }]}>+{mission.points_reward} pts</Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: theme.surfaceElevated }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name={mission.mission_type === 'recurring' ? 'loop' : 'check-circle'} size={14} color={theme.textSecondary} />
              <Text style={[Typography.caption1, { color: theme.textSecondary }]}>
                {mission.mission_type === 'recurring' ? 'Recorrente' : 'Única'}
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

      {/* ═══ DETAILS ═══ */}
      <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
        <Text style={[Typography.headline, { color: theme.text, marginBottom: Spacing.base }]}>Detalhes</Text>
        <DetailRow theme={theme} label="Contagem necessária" value={`${mission.required_count}x`} />
        <DetailRow theme={theme} label="Verificação" value={mission.requires_verification ? 'Necessária' : 'Automática'} />
        {mission.category && (
          <DetailRow theme={theme} label="Categoria" value={`${mission.category.icon || ''} ${mission.category.name}`} />
        )}
      </View>

      {/* ═══ CTA ═══ */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
            actionLoading && { opacity: 0.6 },
          ]}
          onPress={handleStart}
          disabled={actionLoading}
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
      </View>
    </ScrollView>
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  ctaContainer: { paddingHorizontal: Spacing.base, marginTop: Spacing.base },
  ctaButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    ...Shadows.md,
  },
  ctaText: { ...Typography.headline, color: '#fff' },
});
