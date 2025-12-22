// RecordingStep0.js - Studio Information
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../config/constants';
import { getActiveStudio } from '../../../services/studioBookingService';

const formatPrice = (amount, currency = 'VND') => {
  if (!amount) return '0';
  if (currency === 'VND') {
    return `${amount.toLocaleString('vi-VN')} ₫`;
  }
  return `${currency} ${amount.toLocaleString()}`;
};

const RecordingStep0 = ({ data, onComplete }) => {
  const [studio, setStudio] = useState(data?.studio || null);
  const [loading, setLoading] = useState(!studio);

  useEffect(() => {
    const fetchStudio = async () => {
      if (studio) {
        return; // Already have studio data
      }

      try {
        setLoading(true);
        const response = await getActiveStudio();

        if (response?.status === 'success' && response?.data) {
          setStudio(response.data);
        } else {
          Alert.alert('Error', 'Unable to load studio information');
        }
      } catch (error) {
        console.error('Error fetching studio:', error);
        Alert.alert(
          'Error',
          error.message || 'Unable to load studio information. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudio();
  }, [studio]);

  const handleContinue = () => {
    if (studio) {
      onComplete({ studio });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading studio information...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!studio) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={COLORS.error} />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>
              Unable to load studio information. Please try again later.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Information of Studio</Text>
          <Text style={styles.description}>
            View the information of studio and the booking price before selecting the time
          </Text>
        </View>

        <View style={styles.studioInfo}>
          <View style={styles.studioCard}>
            <View style={styles.studioHeader}>
              <Text style={styles.studioName}>
                {studio.studioName || 'MuTraPro Studio'}
              </Text>
            </View>

            <View style={styles.infoSection}>
              {studio.location && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{studio.location}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Booking price per hour</Text>
                <Text style={styles.priceText}>
                  {formatPrice(studio.hourlyRate, 'VND')}/hour
                </Text>
                <Text style={styles.priceNote}>
                  (Price calculated based on the studio usage time)
                </Text>
              </View>

              {studio.freeExternalGuestsLimit !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Free guest limit</Text>
                  <Text style={styles.infoValue}>
                    {studio.freeExternalGuestsLimit} guests (free)
                  </Text>
                </View>
              )}

              {studio.extraGuestFeePerPerson && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Extra guest fee</Text>
                  <Text style={styles.infoValue}>
                    {formatPrice(studio.extraGuestFeePerPerson, 'VND')}/guest
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.features}>
              <Text style={styles.featuresTitle}>Services include:</Text>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.featureText}>
                  Studio professional with modern equipment
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.featureText}>
                  Support professional technician support
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.featureText}>
                  High-quality recording space
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Continue to select time
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.error,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  studioInfo: {
    marginBottom: SPACING.xl,
  },
  studioCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  studioHeader: {
    marginBottom: SPACING.lg,
  },
  studioName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoSection: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  priceText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  priceNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  features: {
    marginTop: SPACING.md,
  },
  featuresTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  continueButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default RecordingStep0;

