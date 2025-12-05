import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';

/**
 * Default header style configuration for Stack Navigators
 * This creates a beautiful, consistent header across all screens
 */
export const defaultStackScreenOptions = {
  headerShown: true,
  headerTitleAlign: 'center',
  headerStyle: {
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: COLORS.white,
  },
  headerTintColor: COLORS.text,
};

/**
 * Default screen options for Drawer Navigator screens
 * Use this when you want screens in Drawer to have the same header style
 */
export const defaultDrawerScreenOptions = {
  ...defaultStackScreenOptions,
  // Additional drawer-specific options can be added here
};

/**
 * Helper function to create a back button for header
 * @param {Object} navigation - Navigation object
 * @param {Function} onPress - Custom onPress handler (optional)
 * @returns {JSX.Element} Back button component
 */
export const createBackButton = (navigation, onPress) => {
  const handlePress = onPress || (() => navigation.goBack());
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ marginLeft: 15, padding: 4 }}
    >
      <Ionicons name="arrow-back" size={24} color={COLORS.text} />
    </TouchableOpacity>
  );
};

/**
 * Header left for RequestDetailScreen
 * Navigates back to MyRequests
 */
export const getRequestDetailHeaderLeft = (navigation) => {
  return createBackButton(navigation, () => navigation.navigate('MyRequests'));
};

/**
 * Header left for ContractDetailScreen
 * Navigates back based on route params (RequestDetail if requestId exists, otherwise ContractsList)
 */
export const getContractDetailHeaderLeft = (navigation, route) => {
  return createBackButton(navigation, () => {
    const { requestId } = route.params || {};
    if (requestId) {
      navigation.navigate('RequestDetail', { requestId });
    } else {
      navigation.navigate('ContractsList');
    }
  });
};

/**
 * Header left for MilestoneDeliveriesScreen
 * Navigates back to ContractDetail
 */
export const getMilestoneDeliveriesHeaderLeft = (navigation, route) => {
  return createBackButton(navigation, () => {
    const { contractId } = route.params || {};
    if (contractId) {
      navigation.navigate('ContractDetail', { contractId });
    } else {
      navigation.goBack();
    }
  });
};

/**
 * Header left for Payment screens (Deposit, Milestone, RevisionFee)
 * Uses default goBack behavior
 */
export const getPaymentHeaderLeft = (navigation) => {
  return createBackButton(navigation);
};

/**
 * Header left for ContractSignedSuccessScreen
 * Uses default goBack behavior
 */
export const getContractSignedSuccessHeaderLeft = (navigation) => {
  return createBackButton(navigation);
};

