/**
 * ═══════════════════════════════════════════════════════════════
 *  Profile Screen — User profile with badges and settings
 * ═══════════════════════════════════════════════════════════════
 */

import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const levelColor = user?.current_level?.color || Colors.primary;
  const levelName = user?.current_level?.name || 'Apoiador';

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

  const MenuRow = ({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress?: () => void; danger?: boolean }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={20} color={danger ? Colors.danger : Colors.primary} />
      <Text style={[Typography.body, { color: danger ? Colors.danger : theme.text, flex: 1 }]}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 100, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ PROFILE HEADER ═══ */}
      <View style={[styles.profileCard, { backgroundColor: theme.surface }, Shadows.lg]}>
        <View style={[styles.largeAvatar, { backgroundColor: levelColor }]}>
          <Text style={styles.largeAvatarText}>{user?.full_name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={[Typography.title2, { color: theme.text, marginTop: Spacing.base }]}>
          {user?.full_name || 'Embaixador'}
        </Text>
        <Text style={[Typography.subhead, { color: theme.textSecondary }]}>{user?.email}</Text>
        <View style={[styles.levelTag, { backgroundColor: levelColor + '20' }]}>
          <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
          <Text style={[Typography.subhead, { color: levelColor, fontWeight: '600' }]}>{levelName}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.primary }]}>{user?.total_points || 0}</Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Pontos</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.success }]}>
              {user?.current_level?.order_index || 1}
            </Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Nível</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.profileStat}>
            <Text style={[Typography.title3, { color: Colors.warning }]}>
              {user?.referral_code || '—'}
            </Text>
            <Text style={[Typography.caption2, { color: theme.textSecondary }]}>Código</Text>
          </View>
        </View>
      </View>

      {/* ═══ MENU ═══ */}
      <View style={styles.menuSection}>
        <Text style={[Typography.footnote, { color: theme.textTertiary, marginBottom: Spacing.sm, paddingHorizontal: Spacing.base }]}>
          CONTA
        </Text>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="edit" label="Editar Perfil" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="notifications" label="Notificações" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="military-tech" label="Minhas Conquistas" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="bar-chart" label="Meu Histórico" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={[Typography.footnote, { color: theme.textTertiary, marginBottom: Spacing.sm, paddingHorizontal: Spacing.base }]}>
          GERAL
        </Text>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="group-add" label="Convidar Amigos" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="description" label="Termos de Uso" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="shield" label="Política de Privacidade" onPress={() => {}} />
          <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />
          <MenuRow icon="info" label="Sobre o App" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.menuSection}>
        <View style={[styles.menuGroup, { borderColor: theme.border }]}>
          <MenuRow icon="logout" label="Sair da Conta" onPress={handleLogout} danger />
        </View>
      </View>

      <Text style={[Typography.caption2, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xl }]}>
        Rede de Embaixadores v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  largeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  levelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xl,
  },
  profileStat: { alignItems: 'center' },
  statDivider: { width: 1, height: 30 },
  menuSection: { marginBottom: Spacing.xl },
  menuGroup: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuDivider: { height: 0.5, marginLeft: 52 },
});
