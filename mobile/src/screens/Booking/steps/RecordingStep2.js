// RecordingStep2.js - Vocal Setup (who will sing?)
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../config/constants';
import { getItem, setItem } from '../../../utils/storage';
import VocalistSelectionModal from '../../../components/VocalistSelectionModal';

const VOCAL_CHOICES = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

const RecordingStep2 = ({ data, onComplete, onBack, navigation }) => {
  const [vocalChoice, setVocalChoice] = useState(
    data?.vocalChoice || VOCAL_CHOICES.NONE
  );
  const [selectedVocalists, setSelectedVocalists] = useState(
    data?.selectedVocalists || []
  );
  const [showVocalistModal, setShowVocalistModal] = useState(false);

  // Extract slot info from previous step
  const { bookingDate, bookingStartTime, bookingEndTime } = data || {};

  // Sync selectedVocalists and vocalChoice from data (when returning from VocalistSelectionScreen)
  useEffect(() => {
    if (data) {
      // Always sync from data props to ensure we have the latest data
      if (data.selectedVocalists && Array.isArray(data.selectedVocalists)) {
        setSelectedVocalists(data.selectedVocalists);
      }
      
      if (data.vocalChoice) {
        setVocalChoice(data.vocalChoice);
      }
    }
  }, [data]);

  // Reload data from storage when screen comes into focus (after returning from VocalistSelection)
  useFocusEffect(
    React.useCallback(() => {
      const loadFlowData = async () => {
        try {
          const stored = await getItem('recordingFlowData');
          if (stored?.step2) {
            if (stored.step2.selectedVocalists && Array.isArray(stored.step2.selectedVocalists)) {
              setSelectedVocalists(stored.step2.selectedVocalists);
            }
            if (stored.step2.vocalChoice) {
              setVocalChoice(stored.step2.vocalChoice);
            }
          }
        } catch (error) {
          console.error('Error loading flow data:', error);
        }
      };
      loadFlowData();
    }, [])
  );

  const handleVocalChoiceChange = async (newChoice) => {
    setVocalChoice(newChoice);

    // Reset selected vocalists if switching away from hiring options
    if (
      newChoice !== VOCAL_CHOICES.INTERNAL_ARTIST &&
      newChoice !== VOCAL_CHOICES.BOTH
    ) {
      setSelectedVocalists([]);
    }

    // Save vocalChoice to storage immediately to ensure it's preserved
    try {
      const stored = await getItem('recordingFlowData') || {};
      stored.step2 = {
        ...stored.step2,
        vocalChoice: newChoice,
        selectedVocalists: newChoice !== VOCAL_CHOICES.INTERNAL_ARTIST && 
                          newChoice !== VOCAL_CHOICES.BOTH 
                          ? [] 
                          : (stored.step2?.selectedVocalists || []),
      };
      await setItem('recordingFlowData', stored);
    } catch (error) {
      console.error('Error saving vocal choice to storage:', error);
    }
  };

  const handleVocalistSelect = (vocalist) => {
    const isSelected = selectedVocalists.some(
      v => v.specialistId === vocalist.specialistId
    );

    if (isSelected) {
      // Remove vocalist from selection
      setSelectedVocalists(
        selectedVocalists.filter(v => v.specialistId !== vocalist.specialistId)
      );
    } else {
      // Add vocalist to selection (allow multiple)
      setSelectedVocalists([...selectedVocalists, vocalist]);
    }
  };

  const handleContinue = () => {
    // Validation
    if (
      (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
        vocalChoice === VOCAL_CHOICES.BOTH) &&
      selectedVocalists.length === 0
    ) {
      Alert.alert('Error', 'Please select at least one vocalist');
      return;
    }

    onComplete({
      vocalChoice,
      selectedVocalists,
    });
  };

  const needsVocalistSelection =
    vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
    vocalChoice === VOCAL_CHOICES.BOTH;

  const handleBrowseVocalists = async () => {
    // Save current state to storage before opening modal
    try {
      const stored = await getItem('recordingFlowData') || {};
      stored.step2 = {
        ...stored.step2,
        vocalChoice,
        selectedVocalists,
      };
      // Preserve currentStep (should be 2 for RecordingStep2)
      stored.currentStep = 2;
      await setItem('recordingFlowData', stored);
    } catch (error) {
      console.error('Error saving flow data:', error);
    }

    // Open vocalist selection modal
    setShowVocalistModal(true);
  };

  const handleVocalistModalConfirm = async (selected) => {
    // Save selected vocalists to storage
    try {
      const stored = await getItem('recordingFlowData') || {};
      const existingStep2 = stored.step2 || {};
      stored.step2 = {
        ...existingStep2,
        selectedVocalists: selected,
        vocalChoice: existingStep2.vocalChoice || vocalChoice,
      };
      stored.currentStep = 2;
      await setItem('recordingFlowData', stored);
      
      // Update local state
      setSelectedVocalists(selected);
    } catch (error) {
      console.error('Error saving vocalists to flow data:', error);
      Alert.alert('Error', 'Failed to save vocalist selection. Please try again.');
    }
    
    setShowVocalistModal(false);
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Step 2: Vocal Setup</Text>
          <Text style={styles.description}>
            Who will sing in this recording session?
          </Text>
        </View>

        {/* Slot info from previous step */}
        {bookingDate && bookingStartTime && bookingEndTime && (
          <View style={styles.alertContainer}>
            <Ionicons name="information-circle" size={18} color={COLORS.info} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Selected Slot</Text>
              <View style={styles.slotInfoRow}>
                <Text style={styles.slotInfoLabel}>Date:</Text>
                <Text style={styles.slotInfoValue}>
                  {dayjs(bookingDate).format('dddd, MMMM DD, YYYY')}
                </Text>
              </View>
              <View style={styles.slotInfoRow}>
                <Text style={styles.slotInfoLabel}>Time:</Text>
                <Text style={styles.slotInfoValue}>
                  {bookingStartTime} - {bookingEndTime}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Vocal Choice Section */}
        <View style={styles.vocalChoiceSection}>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                vocalChoice === VOCAL_CHOICES.NONE && styles.radioOptionSelected,
              ]}
              onPress={() => handleVocalChoiceChange(VOCAL_CHOICES.NONE)}
            >
              <View style={styles.radioCircle}>
                {vocalChoice === VOCAL_CHOICES.NONE && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>
                  No vocal needed (instrumental / playback only)
                </Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Instrumental only</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioOption,
                vocalChoice === VOCAL_CHOICES.CUSTOMER_SELF &&
                  styles.radioOptionSelected,
              ]}
              onPress={() => handleVocalChoiceChange(VOCAL_CHOICES.CUSTOMER_SELF)}
            >
              <View style={styles.radioCircle}>
                {vocalChoice === VOCAL_CHOICES.CUSTOMER_SELF && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>I will sing</Text>
                <View style={[styles.tag, styles.tagSuccess]}>
                  <Text style={[styles.tagText, styles.tagTextSuccess]}>
                    Self-performance
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioOption,
                vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST &&
                  styles.radioOptionSelected,
              ]}
              onPress={() =>
                handleVocalChoiceChange(VOCAL_CHOICES.INTERNAL_ARTIST)
              }
            >
              <View style={styles.radioCircle}>
                {vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>
                  I want to hire an in-house vocalist
                </Text>
                <View style={[styles.tag, styles.tagInfo]}>
                  <Text style={[styles.tagText, styles.tagTextInfo]}>
                    Professional vocalist
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioOption,
                vocalChoice === VOCAL_CHOICES.BOTH && styles.radioOptionSelected,
              ]}
              onPress={() => handleVocalChoiceChange(VOCAL_CHOICES.BOTH)}
            >
              <View style={styles.radioCircle}>
                {vocalChoice === VOCAL_CHOICES.BOTH && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>
                  I will sing & hire in-house vocalist(s) (backing/duet)
                </Text>
                <View style={[styles.tag, styles.tagPurple]}>
                  <Text style={[styles.tagText, styles.tagTextPurple]}>
                    Collaboration
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vocalist Selection Section */}
        {needsVocalistSelection && (
          <View style={styles.vocalistSelectionSection}>
            <Text style={styles.sectionTitle}>Select Vocalist</Text>
            <Text style={styles.sectionSubtitle}>
              {vocalChoice === VOCAL_CHOICES.BOTH
                ? 'Select vocalists to support you (backing/duet)'
                : 'Choose a professional vocalist for the session'}
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={handleBrowseVocalists}
            >
              <Ionicons name="search" size={16} color={COLORS.primary} />
              <Text style={styles.browseButtonText}>Browse All Vocalists</Text>
            </TouchableOpacity>

            {/* Only show selected vocalists summary */}
            {selectedVocalists.length > 0 ? (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryTitle}>
                  Selected Vocalist{selectedVocalists.length > 1 ? 's' : ''} (
                  {selectedVocalists.length})
                </Text>
                {selectedVocalists.map((vocalist, idx) => {
                  const avatarUrl = vocalist.avatar || vocalist.avatarUrl;
                  const vocalistName = vocalist.name || vocalist.fullName || 'Unknown Vocalist';
                  const avatarSource = avatarUrl 
                    ? { uri: avatarUrl }
                    : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(vocalistName)}&size=64&background=random` };
                  
                  return (
                    <View key={idx} style={styles.vocalistItem}>
                      <Image 
                        source={avatarSource}
                        style={styles.vocalistAvatar}
                      />
                      <View style={styles.vocalistInfo}>
                        <Text style={styles.vocalistName}>
                          {vocalistName}
                        </Text>
                        {vocalist.rating && typeof vocalist.rating === 'number' && (
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color={COLORS.warning} />
                            <Text style={styles.ratingText}>
                              {vocalist.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {vocalist.experienceYears && typeof vocalist.experienceYears === 'number' && (
                          <Text style={styles.vocalistDetail}>
                            {vocalist.experienceYears} years experience
                          </Text>
                        )}
                        {vocalist.hourlyRate && typeof vocalist.hourlyRate === 'number' && (
                          <Text style={styles.vocalistDetail}>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(vocalist.hourlyRate)}
                            /hour
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleVocalistSelect(vocalist)}
                      >
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.alertContainer}>
                <Ionicons name="information-circle" size={18} color={COLORS.info} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>No vocalists selected</Text>
                  <Text style={styles.alertText}>
                    Click 'Browse All Vocalists' to select vocalists for your session
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back to Slot Selection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              needsVocalistSelection &&
                selectedVocalists.length === 0 &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={needsVocalistSelection && selectedVocalists.length === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.continueButtonText}>
              Continue to Instrument Setup
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>

      {/* Vocalist Selection Modal */}
      <VocalistSelectionModal
        visible={showVocalistModal}
        onClose={() => setShowVocalistModal(false)}
        onConfirm={handleVocalistModalConfirm}
        allowMultiple={true}
        maxSelections={10}
        selectedVocalists={selectedVocalists}
        bookingDate={bookingDate}
        bookingStartTime={bookingStartTime}
        bookingEndTime={bookingEndTime}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  alertContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  alertTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  alertText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  slotInfoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 50,
  },
  slotInfoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.text,
    flex: 1,
  },
  vocalChoiceSection: {
    marginBottom: SPACING.lg,
  },
  radioGroup: {
    gap: SPACING.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  radioContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  radioLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  tagSuccess: {
    backgroundColor: COLORS.success + '20',
  },
  tagTextSuccess: {
    color: COLORS.success,
  },
  tagInfo: {
    backgroundColor: COLORS.info + '20',
  },
  tagTextInfo: {
    color: COLORS.info,
  },
  tagPurple: {
    backgroundColor: '#722ed1' + '20',
  },
  tagTextPurple: {
    color: '#722ed1',
  },
  vocalistSelectionSection: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  browseButtonText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.primary,
  },
  selectedSummary: {
    marginTop: SPACING.md,
  },
  selectedSummaryTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  vocalistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  vocalistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray[200],
  },
  vocalistInfo: {
    flex: 1,
  },
  vocalistName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ratingText: {
    marginLeft: SPACING.xs / 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  vocalistDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  actionRow: {
    flexDirection: 'column',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  backButton: {
    width: '100%',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
  continueButtonText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.white,
  },
});

export default RecordingStep2;

