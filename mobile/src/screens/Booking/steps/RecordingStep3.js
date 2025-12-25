// RecordingStep3.js - Instrument Setup (which instruments, who plays, from where)
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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../config/constants';
import axiosInstance from '../../../utils/axiosInstance';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import { getAvailableArtistsForRequest } from '../../../services/studioBookingService';
import { getAllEquipment } from '../../../services/equipmentService';
import { getItem, setItem } from '../../../utils/storage';

const PERFORMER_SOURCE = {
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
};

const INSTRUMENT_SOURCE = {
  CUSTOMER_SIDE: 'CUSTOMER_SIDE',
  STUDIO_SIDE: 'STUDIO_SIDE',
};

const RecordingStep3 = ({ data, onComplete, onBack, navigation }) => {
  const [hasLiveInstruments, setHasLiveInstruments] = useState(
    data?.hasLiveInstruments !== undefined ? data.hasLiveInstruments : null
  );
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState(
    data?.instruments || []
  );
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [showCustomInstrumentInput, setShowCustomInstrumentInput] = useState(false);
  const [customInstrumentName, setCustomInstrumentName] = useState('');
  const [instrumentsViewMode, setInstrumentsViewMode] = useState('horizontal'); // 'horizontal' or 'vertical'

  const { bookingDate, bookingStartTime, bookingEndTime, vocalChoice } = data || {};

  // Sync selectedInstruments from data
  useEffect(() => {
    if (data) {
      if (data.instruments && Array.isArray(data.instruments)) {
        // Ensure custom instruments always have CUSTOMER_SELF, no specialist, and CUSTOMER_SIDE
        const normalizedInstruments = data.instruments.map(inst => {
          if (inst.isCustomInstrument) {
            return {
              ...inst,
              performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
              specialistId: null,
              specialistName: null,
              instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
              equipmentId: null,
              equipmentName: null,
              rentalFee: 0,
            };
          }
          return inst;
        });
        setSelectedInstruments(normalizedInstruments);
      }
      
      if (data.hasLiveInstruments !== undefined) {
        setHasLiveInstruments(data.hasLiveInstruments);
      }
    }
  }, [data]);

  // Reload data from storage when screen comes into focus (after returning from InstrumentalistSelection)
  useFocusEffect(
    React.useCallback(() => {
      const loadFlowData = async () => {
        try {
          const stored = await getItem('recordingFlowData');
          if (stored?.step3) {
            if (stored.step3.instruments && Array.isArray(stored.step3.instruments)) {
              // Ensure custom instruments always have CUSTOMER_SELF, no specialist, and CUSTOMER_SIDE
              const normalizedInstruments = stored.step3.instruments.map(inst => {
                if (inst.isCustomInstrument) {
                  return {
                    ...inst,
                    performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
                    specialistId: null,
                    specialistName: null,
                    instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
                    equipmentId: null,
                    equipmentName: null,
                    rentalFee: 0,
                  };
                }
                return inst;
              });
              setSelectedInstruments(normalizedInstruments);
            }
            if (stored.step3.hasLiveInstruments !== undefined) {
              setHasLiveInstruments(stored.step3.hasLiveInstruments);
            }
          }
        } catch (error) {
          console.error('Error loading flow data:', error);
        }
      };
      loadFlowData();
    }, [])
  );

  // Fetch available instrument skills
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);
        // Use public endpoint /public/skills (no authentication required)
        const response = await axiosInstance.get(
          API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_ALL_SKILLS
        );

        if (response.data?.status === 'success' && response.data?.data) {
          // Filter skills with skillType = RECORDING_ARTIST and recordingCategory = INSTRUMENT
          const instrumentSkills = response.data.data.filter(
            skill =>
              skill.skillType === 'RECORDING_ARTIST' &&
              skill.recordingCategory === 'INSTRUMENT'
          );
          setAvailableSkills(instrumentSkills);
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        Alert.alert('Error', 'Unable to load instrument list');
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, []);

  const handleLiveInstrumentsChange = (value) => {
    setHasLiveInstruments(value);

    if (value === false) {
      setSelectedInstruments([]);
    }
  };

  const handleInstrumentToggle = (skill, checked) => {
    if (checked) {
      // Add instrument
      const newInstrument = {
        skillId: skill.skillId,
        skillName: skill.skillName,
        performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
        specialistId: null,
        specialistName: null,
        instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
        equipmentId: null,
        equipmentName: null,
        quantity: 1,
        rentalFee: 0,
        isCustomInstrument: false,
      };
      setSelectedInstruments([...selectedInstruments, newInstrument]);
    } else {
      // Remove instrument
      const updated = selectedInstruments.filter(inst => inst.skillId !== skill.skillId);
      setSelectedInstruments(updated);
    }
  };

  const updateInstrument = (identifier, updates) => {
    // identifier can be skillId (for regular instruments) or skillName (for custom instruments)
    const updated = selectedInstruments.map(inst => {
      if (inst.isCustomInstrument) {
        // For custom instruments, match by skillName
        return inst.skillName === identifier ? { ...inst, ...updates } : inst;
      } else {
        // For regular instruments, match by skillId
        return inst.skillId === identifier ? { ...inst, ...updates } : inst;
      }
    });
    setSelectedInstruments(updated);
  };

  const handleAddCustomInstrument = () => {
    const name = customInstrumentName.trim();
    if (!name) {
      Alert.alert('Warning', 'Please enter an instrument name');
      return;
    }

    // Check if already exists
    const exists = selectedInstruments.some(
      inst =>
        inst.isCustomInstrument &&
        inst.skillName.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      Alert.alert('Warning', `"${name}" is already added as a custom instrument`);
      return;
    }

    const customInstrument = {
      skillId: null, // Custom instruments: skillId = null
      skillName: name,
      isCustomInstrument: true,
      performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
      specialistId: null,
      specialistName: null,
      instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
      equipmentId: null,
      equipmentName: null,
      quantity: 1,
      rentalFee: 0,
    };

    setSelectedInstruments([...selectedInstruments, customInstrument]);
    setCustomInstrumentName('');
    setShowCustomInstrumentInput(false);
  };

  const handleRemoveCustomInstrument = (inst) => {
    const updated = selectedInstruments.filter(i => {
      if (i.isCustomInstrument && inst.isCustomInstrument) {
        return i.skillName !== inst.skillName;
      } else if (!i.isCustomInstrument && !inst.isCustomInstrument) {
        return i.skillId !== inst.skillId;
      } else {
        return true;
      }
    });
    setSelectedInstruments(updated);
  };

  const handleContinue = () => {
    // Validation
    if (hasLiveInstruments === null) {
      Alert.alert('Error', 'Please choose whether live instruments will be used');
      return;
    }

    // If no vocal needed, must have at least one instrument
    if (vocalChoice === 'NONE') {
      if (hasLiveInstruments === false) {
        Alert.alert(
          'Error',
          'Since you selected "No vocal needed", you must use at least one live instrument. Please select "Yes, use live instruments" and choose instruments.'
        );
        return;
      }
      if (hasLiveInstruments === true && selectedInstruments.length === 0) {
        Alert.alert(
          'Error',
          'Since you selected "No vocal needed", you must select at least one instrument to record.'
        );
        return;
      }
    }

    if (hasLiveInstruments === true && selectedInstruments.length === 0) {
      Alert.alert('Error', 'Please select at least one instrument');
      return;
    }

    // Validate each instrument
    for (const inst of selectedInstruments) {
      // Custom instruments should always be CUSTOMER_SELF
      if (
        inst.isCustomInstrument &&
        inst.performerSource !== PERFORMER_SOURCE.CUSTOMER_SELF
      ) {
        Alert.alert(
          'Error',
          `Custom instruments can only be played by yourself: ${inst.skillName}`
        );
        return;
      }

      if (
        inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
        !inst.specialistId
      ) {
        Alert.alert('Error', `Please choose an instrumentalist for ${inst.skillName}`);
        return;
      }

      // Custom instruments should always be CUSTOMER_SIDE
      if (
        inst.isCustomInstrument &&
        inst.instrumentSource !== INSTRUMENT_SOURCE.CUSTOMER_SIDE
      ) {
        Alert.alert(
          'Error',
          `Custom instruments must be brought by yourself: ${inst.skillName}`
        );
        return;
      }

      if (
        inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
        !inst.equipmentId
      ) {
        Alert.alert('Error', `Please choose equipment for ${inst.skillName}`);
        return;
      }
    }

    // Normalize custom instruments before passing to parent
    const normalizedInstruments = selectedInstruments.map(inst => {
      if (inst.isCustomInstrument) {
        return {
          ...inst,
          performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
          specialistId: null,
          specialistName: null,
          instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
          equipmentId: null,
          equipmentName: null,
          rentalFee: 0,
        };
      }
      return inst;
    });

    onComplete({
      hasLiveInstruments,
      instruments: normalizedInstruments,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Step 3: Instrument Setup</Text>
          <Text style={styles.description}>
            Which instruments will be used in the session?
          </Text>
        </View>

        {/* Slot info */}
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

        {/* Has Live Instruments Section */}
        <View style={styles.liveInstrumentsSection}>
          <Text style={styles.sectionLabel}>
            Will the session use live instruments?
          </Text>
          {vocalChoice === 'NONE' && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={18} color={COLORS.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>
                  Required: At least one instrument needed
                </Text>
                <Text style={styles.warningText}>
                  Since you selected 'No vocal needed', you must use at least one live
                  instrument for the recording session.
                </Text>
              </View>
            </View>
          )}
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                hasLiveInstruments === false && styles.radioOptionSelected,
                vocalChoice === 'NONE' && styles.radioOptionDisabled,
              ]}
              onPress={() => handleLiveInstrumentsChange(false)}
              disabled={vocalChoice === 'NONE'}
            >
              <View style={styles.radioCircle}>
                {hasLiveInstruments === false && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>No, only beat/backing track</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>No live instruments</Text>
                </View>
                {vocalChoice === 'NONE' && (
                  <View style={[styles.tag, styles.tagError]}>
                    <Text style={[styles.tagText, styles.tagTextError]}>
                      Not allowed (no vocal selected)
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioOption,
                hasLiveInstruments === true && styles.radioOptionSelected,
              ]}
              onPress={() => handleLiveInstrumentsChange(true)}
            >
              <View style={styles.radioCircle}>
                {hasLiveInstruments === true && (
                  <View style={styles.radioCircleInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>Yes, use live instruments</Text>
                <View style={[styles.tag, styles.tagInfo]}>
                  <Text style={[styles.tagText, styles.tagTextInfo]}>
                    Live performance
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instrument Selection */}
        {hasLiveInstruments === true && (
          <View style={styles.instrumentSelectionSection}>
            {loadingSkills ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading instrument list...</Text>
              </View>
            ) : availableSkills.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No instruments available</Text>
              </View>
            ) : (
              <>
                <View style={styles.instrumentsHeader}>
                  <Text style={styles.sectionLabel}>Select instruments:</Text>
                  <TouchableOpacity
                    style={styles.viewModeToggle}
                    onPress={() =>
                      setInstrumentsViewMode(
                        instrumentsViewMode === 'horizontal' ? 'vertical' : 'horizontal'
                      )
                    }
                  >
                    <Ionicons
                      name={
                        instrumentsViewMode === 'horizontal'
                          ? 'list-outline'
                          : 'grid-outline'
                      }
                      size={20}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
                {instrumentsViewMode === 'horizontal' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.skillsGrid}
                  >
                    {availableSkills.map(skill => {
                      const isSelected = selectedInstruments.some(
                        inst => inst.skillId === skill.skillId
                      );
                      return (
                        <TouchableOpacity
                          key={skill.skillId}
                          style={[
                            styles.skillCheckbox,
                            isSelected && styles.skillCheckboxSelected,
                          ]}
                          onPress={() => handleInstrumentToggle(skill, !isSelected)}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'checkbox-outline'}
                            size={20}
                            color={isSelected ? COLORS.primary : COLORS.textSecondary}
                          />
                          <Text
                            style={[
                              styles.skillText,
                              isSelected && styles.skillTextSelected,
                            ]}
                          >
                            {skill.skillName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.skillsGridVertical}>
                    {availableSkills.map(skill => {
                      const isSelected = selectedInstruments.some(
                        inst => inst.skillId === skill.skillId
                      );
                      return (
                        <TouchableOpacity
                          key={skill.skillId}
                          style={[
                            styles.skillCheckboxVertical,
                            isSelected && styles.skillCheckboxSelected,
                          ]}
                          onPress={() => handleInstrumentToggle(skill, !isSelected)}
                        >
                          <View style={styles.skillCheckboxContent}>
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'checkbox-outline'}
                              size={20}
                              color={isSelected ? COLORS.primary : COLORS.textSecondary}
                            />
                            <Text
                              style={[
                                styles.skillText,
                                isSelected && styles.skillTextSelected,
                              ]}
                            >
                              {skill.skillName}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Custom Instruments Section */}
                <View style={styles.customInstrumentsSection}>
                  <Text style={styles.sectionLabel}>Custom Instruments:</Text>

                  {/* List of added custom instruments */}
                  {selectedInstruments
                    .filter(inst => inst.isCustomInstrument)
                    .map((inst, idx) => (
                      <View key={idx} style={styles.customInstrumentItem}>
                        <Text style={styles.customInstrumentName}>{inst.skillName}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveCustomInstrument(inst)}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ))}

                  {/* Add Custom Instrument Input */}
                  {showCustomInstrumentInput ? (
                    <View style={styles.customInputWrapper}>
                      <TextInput
                        style={styles.customInput}
                        placeholder="Enter instrument name (e.g., Didgeridoo, Sitar, etc.)"
                        value={customInstrumentName}
                        onChangeText={setCustomInstrumentName}
                        onSubmitEditing={handleAddCustomInstrument}
                        autoFocus
                      />
                      <Text style={styles.helperText}>
                        If your instrument is not in the list above, you can add it here
                      </Text>
                      <View style={styles.customInputButtons}>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={handleAddCustomInstrument}
                        >
                          <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setShowCustomInstrumentInput(false);
                            setCustomInstrumentName('');
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.addCustomButton}
                        onPress={() => setShowCustomInstrumentInput(true)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.addCustomButtonText}>Add Custom Instrument</Text>
                      </TouchableOpacity>
                      <Text style={styles.helperText}>
                        If your instrument is not in the list above, you can add it here
                      </Text>
                    </>
                  )}
                </View>

                {selectedInstruments.length > 0 && (
                  <View style={styles.instrumentConfigSection}>
                    <Text style={styles.configTitle}>Configure each instrument:</Text>
                    {selectedInstruments.map((instrument, idx) => (
                      <InstrumentConfig
                        key={idx}
                        instrument={instrument}
                        bookingDate={bookingDate}
                        bookingStartTime={bookingStartTime}
                        bookingEndTime={bookingEndTime}
                        onUpdate={(updates) =>
                          updateInstrument(
                            instrument.isCustomInstrument
                              ? instrument.skillName
                              : instrument.skillId,
                            updates
                          )
                        }
                        navigation={navigation}
                        onSaveState={async () => {
                          // Save current state including selectedInstruments and hasLiveInstruments
                          try {
                            const stored = await getItem('recordingFlowData') || {};
                            stored.step3 = {
                              hasLiveInstruments,
                              instruments: selectedInstruments,
                            };
                            await setItem('recordingFlowData', stored);
                          } catch (error) {
                            console.error('Error saving flow data:', error);
                          }
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back to Vocal Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (hasLiveInstruments === null || loadingSkills) &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={hasLiveInstruments === null || loadingSkills}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.continueButtonText}>Continue to Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// Component for configuring each instrument
function InstrumentConfig({
  instrument,
  bookingDate,
  bookingStartTime,
  bookingEndTime,
  onUpdate,
  navigation,
  onSaveState,
}) {
  const [availableInstrumentalists, setAvailableInstrumentalists] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [loadingInstrumentalists, setLoadingInstrumentalists] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Fetch instrumentalists when performer source is INTERNAL_ARTIST
  useEffect(() => {
    if (
      instrument.performerSource !== PERFORMER_SOURCE.INTERNAL_ARTIST ||
      !bookingDate ||
      !bookingStartTime ||
      !bookingEndTime ||
      instrument.isCustomInstrument ||
      !instrument.skillId
    ) {
      setAvailableInstrumentalists([]);
      return;
    }

    const fetchInstrumentalists = async () => {
      try {
        setLoadingInstrumentalists(true);
        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          instrument.skillId,
          'INSTRUMENT',
          null
        );

        if (response?.status === 'success' && response?.data) {
          setAvailableInstrumentalists(response.data);
        } else {
          setAvailableInstrumentalists([]);
        }
      } catch (error) {
        console.error('Error fetching instrumentalists:', error);
        setAvailableInstrumentalists([]);
      } finally {
        setLoadingInstrumentalists(false);
      }
    };

    fetchInstrumentalists();
  }, [
    instrument.performerSource,
    instrument.skillId,
    instrument.isCustomInstrument,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
  ]);

  // Fetch equipment when instrument source is STUDIO_SIDE
  useEffect(() => {
    if (
      instrument.instrumentSource !== INSTRUMENT_SOURCE.STUDIO_SIDE ||
      instrument.isCustomInstrument
    ) {
      setAvailableEquipment([]);
      return;
    }

    const fetchEquipment = async () => {
      try {
        setLoadingEquipment(true);
        const response = await getAllEquipment(
          instrument.skillId,
          false, // includeInactive
          false // includeUnavailable
        );

        if (response?.status === 'success' && response?.data) {
          setAvailableEquipment(response.data);
        }
      } catch (error) {
        console.error('Error fetching equipment:', error);
      } finally {
        setLoadingEquipment(false);
      }
    };

    fetchEquipment();
  }, [instrument.instrumentSource, instrument.skillId]);

  return (
    <View style={configStyles.container}>
      <View style={configStyles.instrumentHeader}>
        <Ionicons name="musical-notes" size={18} color={COLORS.primary} />
        <Text style={configStyles.instrumentName}>{instrument.skillName}</Text>
        {instrument.specialistId && (
          <View style={configStyles.tag}>
            <Text style={configStyles.tagText}>{instrument.specialistName}</Text>
          </View>
        )}
        {instrument.equipmentId && (
          <View style={[configStyles.tag, configStyles.tagSuccess]}>
            <Text style={[configStyles.tagText, configStyles.tagTextSuccess]}>
              {instrument.equipmentName}
            </Text>
          </View>
        )}
      </View>

      {/* Performer Source */}
      <View style={configStyles.configItem}>
        <Text style={configStyles.configLabel}>
          Who will play {instrument.skillName}?
        </Text>
        <View style={configStyles.radioGroup}>
          <TouchableOpacity
            style={[
              configStyles.radioOption,
              (instrument.isCustomInstrument ||
                instrument.performerSource === PERFORMER_SOURCE.CUSTOMER_SELF) &&
                configStyles.radioOptionSelected,
            ]}
            onPress={() => {
              if (instrument.isCustomInstrument) {
                Alert.alert(
                  'Warning',
                  'Custom instruments can only be played by yourself. To hire a specialist, the instrument must be added to our system first.'
                );
                return;
              }
              onUpdate({
                performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
                specialistId: null,
                specialistName: null,
              });
            }}
          >
            <View style={configStyles.radioCircle}>
              {(instrument.isCustomInstrument ||
                instrument.performerSource === PERFORMER_SOURCE.CUSTOMER_SELF) && (
                <View style={configStyles.radioCircleInner} />
              )}
            </View>
            <Text style={configStyles.radioLabel}>I will play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              configStyles.radioOption,
              !instrument.isCustomInstrument &&
                instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
                configStyles.radioOptionSelected,
            ]}
            onPress={() => {
              if (instrument.isCustomInstrument) {
                Alert.alert(
                  'Warning',
                  'Custom instruments can only be played by yourself. To hire a specialist, the instrument must be added to our system first.'
                );
                return;
              }
              onUpdate({
                performerSource: PERFORMER_SOURCE.INTERNAL_ARTIST,
                specialistId: null,
                specialistName: null,
              });
            }}
            disabled={instrument.isCustomInstrument}
          >
            <View style={configStyles.radioCircle}>
              {!instrument.isCustomInstrument &&
                instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST && (
                  <View style={configStyles.radioCircleInner} />
                )}
            </View>
            <Text style={configStyles.radioLabel}>Hire in-house instrumentalist</Text>
          </TouchableOpacity>
        </View>

        {/* Instrumentalist Selection */}
        {instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
          !instrument.isCustomInstrument && (
            <View style={configStyles.selectionContainer}>
              {instrument.specialistId ? (
                <View style={configStyles.selectedItem}>
                  <Text style={configStyles.selectedItemName}>
                    {instrument.specialistName}
                  </Text>
                  {instrument.hourlyRate && (
                    <Text style={configStyles.selectedItemDetail}>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(instrument.hourlyRate)}
                      /hour
                    </Text>
                  )}
                </View>
              ) : (
                <View style={configStyles.alertContainer}>
                  <Ionicons name="information-circle" size={14} color={COLORS.info} />
                  <Text style={configStyles.alertText}>
                    Click 'Browse All Instrumentalists' to select an instrumentalist
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={configStyles.browseButton}
                onPress={async () => {
                  // Save current state to storage before navigating
                  if (onSaveState) {
                    await onSaveState();
                  } else {
                    // Fallback: save basic state
                    try {
                      const stored = await getItem('recordingFlowData') || {};
                      if (!stored.step3) {
                        stored.step3 = { instruments: [] };
                      }
                      await setItem('recordingFlowData', stored);
                    } catch (error) {
                      console.error('Error saving flow data:', error);
                    }
                  }

                  // Navigate to instrumentalist selection screen in HomeStack
                  navigation.navigate('Home', {
                    screen: 'InstrumentalistSelection',
                    params: {
                      fromFlow: true,
                      skillId: instrument.skillId,
                      skillName: instrument.skillName,
                      bookingDate,
                      bookingStartTime,
                      bookingEndTime,
                      selectedInstrumentalistId: instrument.specialistId,
                    },
                  });
                }}
              >
                <Ionicons name="search" size={14} color={COLORS.primary} />
                <Text style={configStyles.browseButtonText}>
                  {instrument.specialistId
                    ? 'Change Instrumentalist'
                    : 'Browse All Instrumentalists'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </View>

      {/* Divider */}
      <View style={configStyles.divider} />

      {/* Instrument Source */}
      <View style={configStyles.configItem}>
        <Text style={configStyles.configLabel}>
          Where will the instrument come from?
        </Text>
        <View style={configStyles.radioGroup}>
          <TouchableOpacity
            style={[
              configStyles.radioOption,
              (instrument.isCustomInstrument ||
                instrument.instrumentSource === INSTRUMENT_SOURCE.CUSTOMER_SIDE) &&
                configStyles.radioOptionSelected,
            ]}
            onPress={() => {
              onUpdate({
                instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
                equipmentId: null,
                equipmentName: null,
                quantity: 1,
                rentalFee: 0,
              });
            }}
          >
            <View style={configStyles.radioCircle}>
              {(instrument.isCustomInstrument ||
                instrument.instrumentSource === INSTRUMENT_SOURCE.CUSTOMER_SIDE) && (
                <View style={configStyles.radioCircleInner} />
              )}
            </View>
            <Text style={configStyles.radioLabel}>I will bring my own</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              configStyles.radioOption,
              !instrument.isCustomInstrument &&
                instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
                configStyles.radioOptionSelected,
            ]}
            onPress={() => {
              if (instrument.isCustomInstrument) {
                Alert.alert(
                  'Warning',
                  'Custom instruments must be brought by yourself. Studio equipment rental is not available for custom instruments.'
                );
                return;
              }
              onUpdate({
                instrumentSource: INSTRUMENT_SOURCE.STUDIO_SIDE,
                equipmentId: null,
                equipmentName: null,
                quantity: 1,
                rentalFee: 0,
              });
            }}
            disabled={instrument.isCustomInstrument}
          >
            <View style={configStyles.radioCircle}>
              {!instrument.isCustomInstrument &&
                instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && (
                  <View style={configStyles.radioCircleInner} />
                )}
            </View>
            <Text style={configStyles.radioLabel}>Rent from studio</Text>
          </TouchableOpacity>
        </View>

        {/* Equipment Selection */}
        {instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
          !instrument.isCustomInstrument && (
            <View style={configStyles.selectionContainer}>
              {loadingEquipment ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : availableEquipment.length === 0 ? (
                <Text style={configStyles.emptyText}>No equipment available</Text>
              ) : (
                <View style={configStyles.equipmentContainer}>
                  {availableEquipment.map((eq) => (
                    <TouchableOpacity
                      key={eq.equipmentId}
                      style={[
                        configStyles.equipmentOption,
                        instrument.equipmentId === eq.equipmentId &&
                          configStyles.equipmentOptionSelected,
                      ]}
                      onPress={() => {
                        onUpdate({
                          equipmentId: eq.equipmentId,
                          equipmentName: eq.equipmentName,
                          rentalFee: eq.rentalFee || 0,
                        });
                      }}
                    >
                      <Text style={configStyles.equipmentName}>
                        {eq.brand} {eq.model} - {eq.equipmentName}
                      </Text>
                      {eq.rentalFee && (
                        <Text style={configStyles.equipmentPrice}>
                          {eq.rentalFee.toLocaleString('vi-VN')} VND
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {instrument.equipmentId && (
                <View style={configStyles.quantityContainer}>
                  <View style={configStyles.quantityRow}>
                    <Text style={configStyles.quantityLabel}>Quantity:</Text>
                    <TextInput
                      style={configStyles.quantityInput}
                      value={instrument.quantity?.toString() || '1'}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 1;
                        if (num >= 1) {
                          onUpdate({ quantity: num });
                        }
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={configStyles.rentalFeeText}>
                    Fee: {instrument.rentalFee?.toLocaleString('vi-VN')} VND
                  </Text>
                </View>
              )}
            </View>
          )}
      </View>
    </View>
  );
}

const configStyles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  instrumentName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '400',
    color: COLORS.info,
  },
  tagSuccess: {
    backgroundColor: COLORS.success + '20',
  },
  tagTextSuccess: {
    color: COLORS.success,
  },
  configItem: {
    marginTop: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  configLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  radioGroup: {
    gap: SPACING.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  selectionContainer: {
    marginTop: SPACING.sm,
    marginLeft: SPACING.md,
  },
  selectedItem: {
    marginBottom: SPACING.sm,
  },
  selectedItemName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
  },
  selectedItemDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '15',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  alertText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
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
  equipmentContainer: {
    gap: SPACING.xs,
  },
  equipmentOption: {
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.white,
  },
  equipmentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  equipmentName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
  },
  equipmentPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  quantityContainer: {
    marginTop: SPACING.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quantityLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  quantityInput: {
    width: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  rentalFeeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

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
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 50,
  },
  slotInfoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  liveInstrumentsSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  warningContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  radioGroup: {
    gap: SPACING.sm,
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
  radioOptionDisabled: {
    opacity: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  radioLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
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
  tagInfo: {
    backgroundColor: COLORS.info + '20',
  },
  tagTextInfo: {
    color: COLORS.info,
  },
  tagError: {
    backgroundColor: COLORS.error + '20',
  },
  tagTextError: {
    color: COLORS.error,
  },
  instrumentSelectionSection: {
    marginTop: SPACING.lg,
  },
  instrumentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  viewModeToggle: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary + '15',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  skillsGrid: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
    marginBottom: SPACING.lg,
  },
  skillsGridVertical: {
    flexDirection: 'column',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  skillCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
  },
  skillCheckboxVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    width: '100%',
  },
  skillCheckboxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  skillCheckboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  skillText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
  },
  skillTextSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  customInstrumentsSection: {
    marginTop: SPACING.md,
  },
  customInstrumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.sm,
  },
  customInstrumentName: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  customInputWrapper: {
    marginTop: SPACING.sm,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  customInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addButton: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.text,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
  },
  addCustomButtonText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    fontWeight: '400',
    color: COLORS.primary,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  instrumentConfigSection: {
    marginTop: SPACING.lg,
  },
  configTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
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

export default RecordingStep3;

