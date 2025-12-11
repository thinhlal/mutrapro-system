import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import { useRecordingFlow } from '../../context/RecordingFlowContext';
import { getAvailableArtistsForRequest } from '../../services/studioBookingService';

const VOCAL_CHOICES = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

const RecordingVocalScreen = ({ navigation }) => {
  const { state, update } = useRecordingFlow();
  const { bookingDate, bookingStartTime, bookingEndTime, step2 } = state;

  const [vocalChoice, setVocalChoice] = useState(step2?.vocalChoice || VOCAL_CHOICES.NONE);
  const [loading, setLoading] = useState(false);
  const [vocalists, setVocalists] = useState([]);
  const [selectedIds, setSelectedIds] = useState(
    step2?.selectedVocalists?.map((v) => v.specialistId) || []
  );
  const [selectedVocalists, setSelectedVocalists] = useState(step2?.selectedVocalists || []);

  useEffect(() => {
    const needsVocalists =
      vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICES.BOTH;
    if (!needsVocalists) {
      setVocalists([]);
      return;
    }
    if (!bookingDate || !bookingStartTime || !bookingEndTime) {
      Alert.alert('Missing Slot', 'Please select booking slot first.');
      navigation.goBack();
      return;
    }
    fetchVocalists();
  }, [vocalChoice, bookingDate, bookingStartTime, bookingEndTime]);

  const fetchVocalists = async () => {
    try {
      setLoading(true);
      const resp = await getAvailableArtistsForRequest(
        bookingDate,
        bookingStartTime,
        bookingEndTime,
        null,
        'VOCAL',
        null
      );
      if (resp?.status === 'success' && Array.isArray(resp?.data)) {
        setVocalists(resp.data);
      } else if (Array.isArray(resp?.data)) {
        setVocalists(resp.data);
      } else {
        setVocalists([]);
      }
    } catch (error) {
      console.error('Error loading vocalists:', error);
      Alert.alert('Error', error?.message || 'Failed to load vocalists');
      setVocalists([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (v) => {
    const id = v.specialistId || v.id;
    const exists = selectedIds.includes(id);
    if (exists) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleContinue = () => {
    if (
      (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICES.BOTH) &&
      selectedIds.length === 0
    ) {
      Alert.alert('Validation', 'Please select at least one vocalist.');
      return;
    }
    const selectedVocalistsMapped =
      vocalists
        .filter((v) => selectedIds.includes(v.specialistId || v.id))
        .map((v) => ({
          specialistId: v.specialistId || v.id,
          name: v.name || v.fullName || `Vocalist ${v.specialistId || v.id}`,
          hourlyRate: v.hourlyRate,
          isAvailable: v.isAvailable !== false,
        })) || selectedVocalists;

    update({
      step2: {
        vocalChoice,
        selectedVocalists: selectedVocalistsMapped,
      },
      hasVocalist: vocalChoice !== VOCAL_CHOICES.NONE,
    });
    navigation.navigate('RecordingInstrument');
  };

  const openSelectionScreen = () => {
    navigation.navigate('RecordingVocalistSelect', {
      allowMultiple: true,
      maxSelections: 5,
      selectedVocalists,
      onSelect: (selected) => {
        setSelectedVocalists(selected);
        setSelectedIds(selected.map((v) => v.specialistId || v.id));
      },
    });
  };

  const choiceCard = (value, title, description) => (
    <TouchableOpacity
      style={[
        styles.choiceCard,
        vocalChoice === value && styles.choiceCardSelected,
      ]}
      onPress={() => setVocalChoice(value)}
    >
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceDesc}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vocal Setup</Text>
      <Text style={styles.subtitle}>Who will sing in this session?</Text>

      <View style={styles.section}>
        {choiceCard(VOCAL_CHOICES.NONE, 'No vocal', 'Instrumental / playback only')}
        {choiceCard(VOCAL_CHOICES.CUSTOMER_SELF, 'I will sing', 'Self-performance')}
        {choiceCard(VOCAL_CHOICES.INTERNAL_ARTIST, 'Hire in-house vocalist', 'We will book a vocalist')}
        {choiceCard(
          VOCAL_CHOICES.BOTH,
          'I sing + hire vocalist(s)',
          'Combine your vocal with backing/duet'
        )}
      </View>

      {(vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
        vocalChoice === VOCAL_CHOICES.BOTH) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Vocalists</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={openSelectionScreen}>
            <Text style={styles.secondaryButtonText}>Browse & Select</Text>
          </TouchableOpacity>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : vocalists.length === 0 ? (
            <Text style={styles.helperText}>No vocalists available for this slot.</Text>
          ) : (
            vocalists.map((v) => {
              const id = v.specialistId || v.id;
              const selected = selectedIds.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.vocalistRow, selected && styles.vocalistRowSelected]}
                  onPress={() => toggleSelect(v)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vocalistName}>
                      {v.name || v.fullName || `Vocalist ${id}`}
                    </Text>
                    <Text style={styles.helperText}>
                      {v.isAvailable === false ? 'Busy' : 'Available'}
                    </Text>
                  </View>
                  <Text style={[styles.helperText, { color: COLORS.primary }]}>
                    {v.hourlyRate ? `${v.hourlyRate.toLocaleString('vi-VN')} VND/hr` : '—'}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  choiceCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  choiceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  choiceTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  choiceDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  vocalistRow: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vocalistRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  vocalistName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RecordingVocalScreen;

