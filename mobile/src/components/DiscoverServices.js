import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, SPACING } from '../config/constants';
import { PROS_CATEGORIES } from '../constants';
import { getPricingMatrix } from '../services/pricingMatrixService';
import ServiceCategoryCard from './ServiceCategoryCard';

const DiscoverServices = () => {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pricing data function
  const fetchPricingData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPricingMatrix();

      if (response.status === 'success' && response.data) {
        // Merge pricing data with display data from constants
        const mergedCategories = PROS_CATEGORIES.map((category) => {
          const pricing = response.data.find(
            (p) => p.serviceType === category.serviceType && p.active
          );

          return {
            ...category,
            pricing: pricing || null,
          };
        });

        setCategories(mergedCategories);
      } else {
        // Fallback to original data without pricing
        setCategories(PROS_CATEGORIES);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Fallback to original data
      setCategories(PROS_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pricing data on mount
  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  const handleServicePress = (item) => {
    // Navigate to ServiceRequestScreen with serviceType
    navigation.navigate('ServiceRequest', {
      serviceType: item.serviceType,
    });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={styles.sectionTitle}>Discover Our Services</Text>
      <Text style={styles.sectionSubtitle}>
        Mix & Mastering Engineers, Singers, Recording Studios & Session Musicians
      </Text>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <View style={styles.servicesGrid}>
          {categories.map((item) => (
            <ServiceCategoryCard
              key={item.id}
              item={item}
              onPress={handleServicePress}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  servicesGrid: {
    marginBottom: SPACING.xl,
  },
});

export default DiscoverServices;

