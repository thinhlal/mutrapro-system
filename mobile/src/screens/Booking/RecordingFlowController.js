// RecordingFlowController.js - Controller for multi-step recording flow
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import { setItem, getItem, removeItem } from '../../utils/storage';

// Step components
import RecordingStep0 from './steps/RecordingStep0';
import RecordingStep1 from './steps/RecordingStep1';
import RecordingStep2 from './steps/RecordingStep2';
import RecordingStep3 from './steps/RecordingStep3';
import RecordingStep4 from './steps/RecordingStep4';

const STORAGE_KEY = 'recordingFlowData';

const STEPS = [
  {
    title: 'Studio Info',
    description: 'Studio Information',
  },
  {
    title: 'Slot Selection',
    description: 'Select Date & Time',
  },
  {
    title: 'Vocal Setup',
    description: 'Who will sing?',
  },
  {
    title: 'Instrument Setup',
    description: 'Instruments & Equipment',
  },
  {
    title: 'Summary',
    description: 'Review & Confirm',
  },
];

const RecordingFlowController = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [flowData, setFlowData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const isFocused = useIsFocused();
  const blurTimeoutRef = useRef(null);
  const blurTimeRef = useRef(null);

  // Load flow data from storage on mount
  useEffect(() => {
    const loadFlowData = async () => {
      try {
        setLoading(true);
        const stored = await getItem(STORAGE_KEY);
        if (stored) {
          setFlowData(stored);
          setCurrentStep(stored.currentStep || 0);
        } else {
          // If no stored data, reset to initial state
          setFlowData({});
          setCurrentStep(0);
        }
      } catch (error) {
        console.error('Error loading flow data:', error);
        setFlowData({});
        setCurrentStep(0);
      } finally {
        setLoading(false);
      }
    };

    loadFlowData();
  }, []);

  // Load data when screen comes into focus (after returning from selection screens)
  useFocusEffect(
    React.useCallback(() => {
      // Clear any pending blur timeout
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      // Check if we're regaining focus after being blurred for a while (tab switch)
      const now = Date.now();
      if (blurTimeRef.current && (now - blurTimeRef.current) > 1000) {
        // Screen was blurred for more than 1 second - likely a tab switch
        // Clear data before loading
        const clearData = async () => {
          try {
            await removeItem(STORAGE_KEY);
            setFlowData({});
            setCurrentStep(0);
            console.log('[Mobile] Booking flow cleared - user switched tab and returned');
          } catch (error) {
            console.error('Error clearing flow data on focus after tab switch:', error);
          }
        };
        clearData();
        blurTimeRef.current = null;
        return; // Don't load old data
      }

      const loadFlowData = async () => {
        try {
          const stored = await getItem(STORAGE_KEY);
          if (stored) {
            setFlowData(stored);
            setCurrentStep(stored.currentStep || 0);
          } else {
            // If no stored data, reset to initial state
            setFlowData({});
            setCurrentStep(0);
          }
        } catch (error) {
          console.error('Error loading flow data on focus:', error);
          setFlowData({});
          setCurrentStep(0);
        }
      };
      
      loadFlowData();
      blurTimeRef.current = null; // Reset blur time
      
      // Cleanup: Clear data when screen loses focus (user switches tabs)
      // Use a delay to distinguish between navigation within flow vs tab switch
      return () => {
        // Record blur time
        blurTimeRef.current = Date.now();
        
        // Clear any existing timeout
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
        
        // Set a timeout to clear data after losing focus
        // This allows time for navigation within flow (which will regain focus quickly)
        blurTimeoutRef.current = setTimeout(async () => {
          // Check if screen is still not focused (user switched tab)
          // If screen regains focus within the timeout, the timeout will be cleared above
          try {
            await removeItem(STORAGE_KEY);
            setFlowData({});
            setCurrentStep(0);
            console.log('[Mobile] Booking flow cleared - user switched tab');
          } catch (error) {
            console.error('Error clearing flow data on blur:', error);
          }
          blurTimeoutRef.current = null;
        }, 500); // 500ms delay to allow for navigation within flow
      };
    }, [])
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Save flow data to storage
  const updateFlowData = async (newData, stepOverride = null) => {
    const stepToSave = stepOverride !== null ? stepOverride : currentStep;
    const updated = { ...flowData, ...newData, currentStep: stepToSave };
    setFlowData(updated);
    await setItem(STORAGE_KEY, updated);
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateFlowData({}, nextStep);
    }
  };

  const handlePrev = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      await updateFlowData({}, prevStep);
    }
  };

  const handleStepComplete = async (stepData) => {
    // Update flow data first
    const updated = { ...flowData, ...stepData };
    setFlowData(updated);

    // Then move to next step
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Update storage with new step and data
      const finalData = { ...updated, currentStep: nextStep };
      await setItem(STORAGE_KEY, finalData);
    } else {
      // If at last step, just update data
      await setItem(STORAGE_KEY, { ...updated, currentStep });
    }
  };

  const toggleNavigation = () => {
    setIsNavigationVisible(!isNavigationVisible);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Step 0: Studio Information
        return (
          <RecordingStep0
            data={flowData.step0}
            onComplete={(data) => handleStepComplete({ step0: data })}
          />
        );
      case 1:
        // Step 1: Slot Selection
        return (
          <RecordingStep1
            data={flowData.step1}
            onComplete={(data) => handleStepComplete({ step1: data })}
          />
        );
      case 2:
        // Step 2: Vocal Setup - pass step1 data for booking slot info
        return (
          <RecordingStep2
            data={{
              ...flowData.step2,
              bookingDate: flowData.step1?.bookingDate,
              bookingStartTime: flowData.step1?.bookingStartTime,
              bookingEndTime: flowData.step1?.bookingEndTime,
            }}
            onComplete={(data) => handleStepComplete({ step2: data })}
            onBack={handlePrev}
            navigation={navigation}
          />
        );
      case 3:
        // Step 3: Instrument Setup - pass step1 data for booking slot info and step2 vocalChoice
        return (
          <RecordingStep3
            data={{
              ...flowData.step3,
              bookingDate: flowData.step1?.bookingDate,
              bookingStartTime: flowData.step1?.bookingStartTime,
              bookingEndTime: flowData.step1?.bookingEndTime,
              vocalChoice: flowData.step2?.vocalChoice,
            }}
            onComplete={(data) => handleStepComplete({ step3: data })}
            onBack={handlePrev}
            navigation={navigation}
          />
        );
      case 4:
        // Step 4: Review & Submit (with form and direct submit)
        return (
          <RecordingStep4
            formData={{
              step0: flowData.step0 || {},
              step1: flowData.step1 || {},
              step2: flowData.step2 || {},
              step3: flowData.step3 || {},
            }}
            onBack={handlePrev}
            onSubmit={async () => {
              // Clear storage after successful submit
              await removeItem(STORAGE_KEY);
              // Reset state to initial values
              setFlowData({});
              setCurrentStep(0);
            }}
            navigation={navigation}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Steps Indicator */}
      <View style={styles.stepsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsContent}>
          {STEPS.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index === currentStep && styles.stepCircleActive,
                  index < currentStep && styles.stepCircleCompleted,
                ]}
              >
                {index < currentStep ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                ) : (
                  <Text style={[styles.stepNumber, index === currentStep && styles.stepNumberActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  index === currentStep && styles.stepTitleActive,
                ]}
                numberOfLines={1}
              >
                {step.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={!isNavigationVisible ? styles.scrollContentPadding : undefined}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Navigation */}
      {isNavigationVisible ? (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
            onPress={handlePrev}
            disabled={currentStep === 0}
          >
            <Ionicons name="arrow-back" size={18} color={currentStep === 0 ? COLORS.textSecondary : COLORS.text} />
            <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {STEPS.length}
          </Text>
          <TouchableOpacity style={styles.toggleButton} onPress={toggleNavigation}>
            <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.navigationToggleButton} onPress={toggleNavigation}>
          <Ionicons name="chevron-up" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  stepsContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  stepsContent: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    minWidth: 80,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
  },
  stepNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepNumberActive: {
    color: COLORS.white,
  },
  stepTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  stepTitleActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContentPadding: {
    paddingBottom: 50,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  stepIndicator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  toggleButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationToggleButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default RecordingFlowController;

