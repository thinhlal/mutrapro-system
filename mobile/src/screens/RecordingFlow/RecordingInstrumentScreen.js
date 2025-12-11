import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import { useRecordingFlow } from '../../context/RecordingFlowContext';
import { getAvailableArtistsForRequest } from '../../services/studioBookingService';
import { getNotationInstruments, getNotationInstrumentsByIds } from '../../services/instrumentService';
import { getAllEquipment } from '../../services/equipmentService';

const PERFORMER_SOURCE = {
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
};

const INSTRUMENT_SOURCE = {
  CUSTOMER_SIDE: 'CUSTOMER_SIDE',
  STUDIO_SIDE: 'STUDIO_SIDE',
};

// Fallback instruments if API has no data
const DEFAULT_INSTRUMENTS = [
  { instrumentId: 'guitar', instrumentName: 'Guitar', skillId: 'guitar' },
  { instrumentId: 'piano', instrumentName: 'Piano', skillId: 'piano' },
  { instrumentId: 'drums', instrumentName: 'Drums', skillId: 'drums' },
];

const RecordingInstrumentScreen = ({ navigation }) => {
  const { state, update } = useRecordingFlow();
  const { bookingDate, bookingStartTime, bookingEndTime, step3 } = state;

  const [instruments, setInstruments] = useState(step3?.instruments || []);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [instrumentOptions, setInstrumentOptions] = useState(DEFAULT_INSTRUMENTS);

  useEffect(() => {
    loadInstrumentOptions();
  }, []);

  const loadInstrumentOptions = async () => {
    try {
      const resp = await getNotationInstruments({ usage: 'arrangement' });
      if (resp?.status === 'success' && Array.isArray(resp?.data) && resp.data.length > 0) {
        setInstrumentOptions(resp.data);
        return;
      }
    } catch (error) {
      console.warn('Using default instrument options');
    }
    // fallback
    setInstrumentOptions(DEFAULT_INSTRUMENTS);
  };

  const toggleInstrument = (instrumentId, skillId, instrumentName) => {
    const exists = instruments.find((i) => i.instrumentId === instrumentId);
    if (exists) {
      setInstruments(instruments.filter((i) => i.instrumentId !== instrumentId));
    } else {
      setInstruments([
        ...instruments,
        {
          instrumentId,
          skillId,
          instrumentName,
          performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
          instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
          specialistId: null,
          equipmentId: null,
          quantity: 1,
        },
      ]);
    }
  };

  const updateInstrument = (instrumentId, updates) => {
    setInstruments((prev) =>
      prev.map((inst) => (inst.instrumentId === instrumentId ? { ...inst, ...updates } : inst))
    );
  };

  const loadInstrumentalists = async (instrumentId, skillId) => {
    try {
      setLoadingArtists(true);
      const resp = await getAvailableArtistsForRequest(
        bookingDate,
        bookingStartTime,
        bookingEndTime,
        skillId,
        'INSTRUMENT',
        null
      );
      const list = Array.isArray(resp?.data) ? resp.data : [];
      updateInstrument(instrumentId, { availableInstrumentalists: list });
    } catch (error) {
      console.error('Error loading instrumentalists:', error);
      Alert.alert('Error', error?.message || 'Failed to load instrumentalists');
    } finally {
      setLoadingArtists(false);
    }
  };

  const loadEquipment = async (instrumentId, skillId) => {
    try {
      setLoadingEquipment(true);
      const resp = await getAllEquipment(skillId, false, false);
      const list = Array.isArray(resp?.data) ? resp.data : [];
      updateInstrument(instrumentId, { availableEquipment: list });
    } catch (error) {
      console.error('Error loading equipment:', error);
      Alert.alert('Error', error?.message || 'Failed to load equipment');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const renderInstrumentCard = (inst) => {
    return (
      <View key={inst.instrumentId} style={styles.instrumentCard}>
        <Text style={styles.instrumentName}>{inst.instrumentName}</Text>

        <Text style={styles.label}>Who will play?</Text>
        <View style={styles.row}>
          {Object.values(PERFORMER_SOURCE).map((val) => {
            const title = val === PERFORMER_SOURCE.CUSTOMER_SELF ? 'I will play' : 'Hire in-house';
            const selected = inst.performerSource === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  updateInstrument(inst.instrumentId, {
                    performerSource: val,
                    specialistId: null,
                    specialistName: null,
                  });
                  if (val === PERFORMER_SOURCE.INTERNAL_ARTIST) {
                    loadInstrumentalists(inst.instrumentId, inst.skillId);
                  }
                }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select instrumentalist</Text>
            {loadingArtists ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : !inst.availableInstrumentalists || inst.availableInstrumentalists.length === 0 ? (
              <Text style={styles.helperText}>No instrumentalists available.</Text>
            ) : (
              inst.availableInstrumentalists.map((artist) => {
                const selected = inst.specialistId === artist.specialistId;
                return (
                  <TouchableOpacity
                    key={artist.specialistId}
                    style={[styles.rowItem, selected && styles.rowItemSelected]}
                    onPress={() =>
                      updateInstrument(inst.instrumentId, {
                        specialistId: artist.specialistId,
                        specialistName: artist.name || artist.fullName,
                        hourlyRate: artist.hourlyRate || 0,
                      })
                    }
                  >
                    <Text style={styles.rowItemText}>
                      {artist.name || artist.fullName || artist.specialistId}
                    </Text>
                    <Text style={styles.helperText}>
                      {artist.hourlyRate
                        ? `${artist.hourlyRate.toLocaleString('vi-VN')} VND/hr`
                        : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <Text style={styles.label}>Instrument source</Text>
        <View style={styles.row}>
          {Object.values(INSTRUMENT_SOURCE).map((val) => {
            const title = val === INSTRUMENT_SOURCE.CUSTOMER_SIDE ? 'Bring my own' : 'Rent studio';
            const selected = inst.instrumentSource === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  updateInstrument(inst.instrumentId, {
                    instrumentSource: val,
                    equipmentId: null,
                    equipmentName: null,
                    rentalFee: 0,
                  });
                  if (val === INSTRUMENT_SOURCE.STUDIO_SIDE) {
                    loadEquipment(inst.instrumentId, inst.skillId);
                  }
                }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select equipment</Text>
            {loadingEquipment ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : !inst.availableEquipment || inst.availableEquipment.length === 0 ? (
              <Text style={styles.helperText}>No equipment available.</Text>
            ) : (
              inst.availableEquipment.map((eq) => {
                const selected = inst.equipmentId === eq.equipmentId;
                return (
                  <TouchableOpacity
                    key={eq.equipmentId}
                    style={[styles.rowItem, selected && styles.rowItemSelected]}
                    onPress={() =>
                      updateInstrument(inst.instrumentId, {
                        equipmentId: eq.equipmentId,
                        equipmentName: `${eq.brand || ''} ${eq.model || ''} ${eq.equipmentName || ''}`.trim(),
                        rentalFee: eq.rentalFee || 0,
                      })
                    }
                  >
                    <Text style={styles.rowItemText}>
                      {eq.equipmentName || eq.model || eq.brand || eq.equipmentId}
                    </Text>
                    <Text style={styles.helperText}>
                      {eq.rentalFee ? `${eq.rentalFee.toLocaleString('vi-VN')} VND/hr` : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
            {inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && inst.equipmentId && (
              <View style={[styles.row, { alignItems: 'center', marginTop: SPACING.xs }]}>
                <Text style={styles.label}>Quantity:</Text>
                <View style={[styles.row, { alignItems: 'center', gap: SPACING.sm }]}>
                  {[1, 2, 3, 4].map((q) => {
                    const selected = (inst.quantity || 1) === q;
                    return (
                      <TouchableOpacity
                        key={q}
                        style={[styles.qtyChip, selected && styles.qtyChipSelected]}
                        onPress={() => updateInstrument(inst.instrumentId, { quantity: q })}
                      >
                        <Text style={[styles.qtyText, selected && styles.qtyTextSelected]}>{q}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
              {inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && inst.equipmentId && (
                <View style={[styles.formGroup, { marginTop: SPACING.xs }]}>
                  <Text style={styles.label}>Rental fee (per hour)</Text>
                  <Text style={styles.helperText}>
                    {inst.rentalFee ? `${inst.rentalFee.toLocaleString('vi-VN')} VND/hr` : '—'}
                  </Text>
                <Text style={[styles.label, { marginTop: SPACING.xs }]}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={String(inst.quantity || 1)}
                  onChangeText={(txt) => {
                    const num = parseInt(txt, 10);
                    updateInstrument(inst.instrumentId, { quantity: isNaN(num) || num <= 0 ? 1 : num });
                  }}
                  placeholder="Qty"
                />
                </View>
              )}
          </View>
        )}
      </View>
    );
  };

  const handleContinue = () => {
    if (instruments.length === 0) {
      Alert.alert('Validation', 'Please select at least one instrument.');
      return;
    }
    update({ step3: { instruments } });
    navigation.navigate('RecordingReview');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Instrument & Equipment</Text>
      <Text style={styles.subtitle}>Choose instruments, who plays, and equipment source.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select instruments</Text>
        <View style={styles.rowWrap}>
          {instrumentOptions.map((inst) => {
            const selected = instruments.some((i) => i.instrumentId === inst.instrumentId);
            return (
              <TouchableOpacity
                key={inst.instrumentId}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleInstrument(inst.instrumentId, inst.skillId || inst.instrumentId, inst.instrumentName)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {inst.instrumentName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.helperText}>Tap to add/remove instruments.</Text>
      </View>

      {instruments.map((inst) => renderInstrumentCard(inst))}

      <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  chipText: { color: COLORS.text, fontSize: FONT_SIZES.sm },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  instrumentCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  instrumentName: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  label: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  formGroup: { marginTop: SPACING.sm },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  rowItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xs,
  },
  rowItemSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  rowItemText: { fontSize: FONT_SIZES.md, color: COLORS.text, marginBottom: 2 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  primaryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
});

export default RecordingInstrumentScreen;

