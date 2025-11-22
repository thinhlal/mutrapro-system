import React, { useState } from 'react';
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
import { Button, ImageSlider, DiscoverServices } from '../../components';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../config/constants';

const HomeScreen = ({ navigation }) => {
  const { logout, loading } = useAuth();
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
      {/* Image Slider */}
      <ImageSlider />

      {/* Discover Our Services */}
      <DiscoverServices />

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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: 0, // Bỏ padding top để slider tràn lên
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xl,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.md,
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
  logoutButton: {
    marginBottom: SPACING.lg,
  },
});

export default HomeScreen;

