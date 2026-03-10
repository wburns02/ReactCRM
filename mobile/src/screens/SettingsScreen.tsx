/**
 * Settings Screen for CRM Mobile
 * Profile info, app settings, and logout
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useCurrentUser, useCurrentTechnician } from '../api/hooks';
import { useOffline } from '../hooks/useOffline';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import Constants from 'expo-constants';

export interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
  const { data: user } = useCurrentUser();
  const { data: technician } = useCurrentTechnician();
  const { pendingCount, clearQueue, syncNow, isOnline } = useOffline();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const handleClearQueue = () => {
    if (pendingCount === 0) return;
    Alert.alert(
      'Clear Pending Changes',
      `This will discard ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearQueue(),
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    const result = await syncNow();
    if (result.errors.length > 0) {
      Alert.alert('Sync Errors', result.errors.join('\n'));
    } else if (result.success > 0) {
      Alert.alert('Sync Complete', `${result.success} change${result.success !== 1 ? 's' : ''} synced successfully.`);
    } else {
      Alert.alert('No Changes', 'No pending changes to sync.');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@macseptic.com?subject=CRM%20Mobile%20App%20Support');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
          </Text>
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
          {user?.role && (
            <Badge
              label={user.role}
              color={colors.primary}
              backgroundColor="#bee3f8"
              size="md"
            />
          )}
        </Card>

        {/* Technician Info */}
        {technician && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Technician Profile</Text>
            <SettingsRow label="Name" value={`${technician.first_name} ${technician.last_name}`} />
            {technician.email && <SettingsRow label="Email" value={technician.email} />}
            {technician.phone && <SettingsRow label="Phone" value={technician.phone} />}
            {technician.skills.length > 0 && (
              <View style={styles.skillsContainer}>
                <Text style={styles.skillsLabel}>Skills</Text>
                <View style={styles.skillsRow}>
                  {technician.skills.map((skill) => (
                    <Badge
                      key={skill}
                      label={skill}
                      color={colors.textSecondary}
                      backgroundColor={colors.border}
                      size="sm"
                    />
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Sync Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Sync</Text>
          <SettingsRow
            label="Connection"
            value={isOnline ? 'Online' : 'Offline'}
            valueColor={isOnline ? colors.success : colors.warning}
          />
          <SettingsRow
            label="Pending Changes"
            value={String(pendingCount)}
            valueColor={pendingCount > 0 ? colors.warning : colors.textSecondary}
          />
          <View style={styles.syncActions}>
            <Button
              variant="secondary"
              size="sm"
              onPress={handleSyncNow}
              disabled={pendingCount === 0 || !isOnline}
              style={styles.syncButton}
            >
              Sync Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={handleClearQueue}
              disabled={pendingCount === 0}
              style={styles.syncButton}
            >
              Clear Queue
            </Button>
          </View>
        </Card>

        {/* About Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingsRow label="App Version" value={appVersion} />
          <SettingsRow label="Platform" value="Mac Septic CRM" />
          <TouchableOpacity onPress={handleContactSupport} style={styles.supportRow}>
            <Text style={styles.supportText}>Contact Support</Text>
          </TouchableOpacity>
        </Card>

        {/* Logout */}
        <Button
          variant="danger"
          size="lg"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Sign Out
        </Button>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingsRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function SettingsRow({ label, value, valueColor }: SettingsRowProps) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={[styles.settingsValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  settingsValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  skillsContainer: {
    paddingVertical: spacing.sm,
  },
  skillsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  syncActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  syncButton: {
    flex: 1,
  },
  supportRow: {
    paddingVertical: spacing.sm,
  },
  supportText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
