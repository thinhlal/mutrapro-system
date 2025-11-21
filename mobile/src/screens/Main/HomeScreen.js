import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  SCREEN_NAMES,
} from '../../config/constants';

const HomeScreen = ({ navigation }) => {
  const { user, logout, loading } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Implement data refresh logic
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.white} />
          </View>
          <View style={styles.userText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE)}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            // TODO: Navigate to create request
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
            <Ionicons name="musical-notes" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.actionText}>New Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            // TODO: Navigate to my requests
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
            <Ionicons name="list" size={28} color={COLORS.info} />
          </View>
          <Text style={styles.actionText}>My Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            // TODO: Navigate to contracts
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="document-text" size={28} color={COLORS.success} />
          </View>
          <Text style={styles.actionText}>Contracts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            // TODO: Navigate to wallet
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
            <Ionicons name="wallet" size={28} color={COLORS.warning} />
          </View>
          <Text style={styles.actionText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={COLORS.gray[400]} />
          <Text style={styles.emptyStateText}>No recent activity</Text>
          <Text style={styles.emptyStateSubtext}>
            Your recent activities will appear here
          </Text>
        </View>
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>Our Services</Text>
      <View style={styles.servicesContainer}>
        <View style={styles.serviceCard}>
          <Ionicons name="musical-note" size={32} color={COLORS.primary} />
          <Text style={styles.serviceTitle}>Transcription</Text>
          <Text style={styles.serviceDescription}>
            Professional music transcription services
          </Text>
        </View>

        <View style={styles.serviceCard}>
          <Ionicons name="color-palette" size={32} color={COLORS.secondary} />
          <Text style={styles.serviceTitle}>Arrangement</Text>
          <Text style={styles.serviceDescription}>
            Custom music arrangement solutions
          </Text>
        </View>

        <View style={styles.serviceCard}>
          <Ionicons name="mic" size={32} color={COLORS.success} />
          <Text style={styles.serviceTitle}>Recording</Text>
          <Text style={styles.serviceDescription}>
            High-quality recording services
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        loading={loading}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileButton: {
    padding: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    width: '50%',
    padding: SPACING.xs,
  },
  actionIcon: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginTop: SPACING.md,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  servicesContainer: {
    marginBottom: SPACING.xl,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  serviceTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  serviceDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  logoutButton: {
    marginBottom: SPACING.lg,
  },
});

export default HomeScreen;

