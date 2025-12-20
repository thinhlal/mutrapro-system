import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRecordingFlow } from '../../context/RecordingFlowContext';
import { createServiceRequest } from '../../services/serviceRequestService';
import { createBookingFromServiceRequest } from '../../services/studioBookingService';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import FileUploader from '../../components/FileUploader';

const RecordingReviewScreen = ({ navigation }) => {
  const { state, update, reset } = useRecordingFlow();
  const { step1, step2, step3, file, contact } = state;
  const [title, setTitle] = useState(contact?.title || '');
  const [description, setDescription] = useState(contact?.description || '');
  const [contactName, setContactName] = useState(contact?.name || '');
  const [contactEmail, setContactEmail] = useState(contact?.email || '');
  const [contactPhone, setContactPhone] = useState(contact?.phone || '');
  const [uploading, setUploading] = useState(false);

  // Calculate fees (participant + equipment only)
  const calculateFees = () => {
    let participantFee = 0;
    let equipmentRentalFee = 0;
    const hours = step1?.durationHours || 2;

    // Vocal fees (when hiring internal vocalists)
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach((vocalist) => {
        // Use hourlyRate from vocalist data, fallback to 500k if missing
        const rate = vocalist.hourlyRate || 500000;
        // Calculate fee = hourlyRate * booking hours (from step1)
        participantFee += rate * hours;
      });
    }

    // Instrument fees
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach((instrument) => {
        // Performer fee (when hiring internal artist)
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          // Use hourlyRate from instrument data, fallback to 300k if missing
          const rate = instrument.hourlyRate || 300000;
          // Calculate fee = hourlyRate * booking hours (from step1)
          participantFee += rate * hours;
        }

        // Equipment rental fee (when renting from studio)
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          // Calculate fee = rentalFee (per hour) x quantity x booking hours
          equipmentRentalFee += rentalFee * quantity * hours;
        }
      });
    }

    return {
      participantFee,
      equipmentRentalFee,
      totalFee: participantFee + equipmentRentalFee,
    };
  };

  const fees = calculateFees();

  // Transform booking data
  const transformBookingData = () => {
    const participants = [];
    const requiredEquipment = [];
    const hours = step1?.durationHours || 2;

    // Add vocalists from step2
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach((vocalist) => {
        // Calculate total fee = hourlyRate x hours
        const hourlyRate = vocalist.hourlyRate || 500000;
        const totalFee = hourlyRate * hours;

        participants.push({
          specialistId: vocalist.specialistId,
          roleType: 'VOCAL',
          performerSource: 'INTERNAL_ARTIST',
          participantFee: totalFee, // Send calculated value (hourlyRate x hours)
        });
      });
    }

    // Add customer self vocalist if any
    if (step2?.vocalChoice === 'CUSTOMER_SELF' || step2?.vocalChoice === 'BOTH') {
      participants.push({
        roleType: 'VOCAL',
        performerSource: 'CUSTOMER_SELF',
      });
    }

    // Add instrumentalists and equipment from step3
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach((instrument) => {
        // Add performer
        if (instrument.performerSource === 'INTERNAL_ARTIST' && instrument.specialistId) {
          // Calculate total fee = hourlyRate x hours
          const hourlyRate = instrument.hourlyRate || 400000;
          const totalFee = hourlyRate * hours;

          participants.push({
            specialistId: instrument.specialistId,
            roleType: 'INSTRUMENT',
            performerSource: 'INTERNAL_ARTIST',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId: instrument.instrumentSource === 'STUDIO_SIDE' ? instrument.equipmentId : null,
            participantFee: totalFee, // Send calculated value (hourlyRate x hours)
          });
        } else if (instrument.performerSource === 'CUSTOMER_SELF') {
          participants.push({
            roleType: 'INSTRUMENT',
            performerSource: 'CUSTOMER_SELF',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId: instrument.instrumentSource === 'STUDIO_SIDE' ? instrument.equipmentId : null,
          });
        }

        // Add equipment
        if (instrument.instrumentSource === 'STUDIO_SIDE' && instrument.equipmentId) {
          const quantity = instrument.quantity || 1;
          const rentalFeePerHour = instrument.rentalFee || 0;
          // Calculate total: rentalFeePerHour x quantity x hours
          const totalRentalFee = rentalFeePerHour * quantity * hours;

          requiredEquipment.push({
            equipmentId: instrument.equipmentId,
            quantity: quantity,
            rentalFeePerUnit: rentalFeePerHour,
            totalRentalFee: totalRentalFee, // Send calculated value (rentalFee x quantity x hours)
          });
        }
      });
    }

    return {
      bookingDate: step1.bookingDate,
      startTime: step1.bookingStartTime,
      endTime: step1.bookingEndTime,
      durationHours: step1.durationHours,
      participants,
      requiredEquipment,
    };
  };

  const handleSubmit = async () => {
    if (!file) {
      Alert.alert('Validation', 'Please upload a reference file.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation', 'Please enter title and description.');
      return;
    }
    if (!step1?.bookingDate || !step1?.bookingStartTime || !step1?.bookingEndTime) {
      Alert.alert('Validation', 'Missing booking slot.');
      return;
    }
    if (!contactName || !contactEmail || !contactPhone) {
      Alert.alert('Validation', 'Please fill contact info.');
      return;
    }
    try {
      setUploading(true);
      // Build participants from step2/step3 using transformBookingData
      const bookingData = transformBookingData();

      const requestData = {
        requestType: 'recording',
        title: title.trim(),
        description: description.trim(),
        contactName,
        contactEmail,
        contactPhone,
        durationMinutes: step1.durationHours ? step1.durationHours * 60 : 0,
        hasVocalist: step2?.vocalChoice !== 'NONE',
        files: [file],
      };

      const reqResp = await createServiceRequest(requestData);
      const requestId = reqResp?.data?.requestId || reqResp?.requestId;

      if (!requestId) {
        throw new Error('Missing requestId from response');
      }

      // Use transformed booking data
      await createBookingFromServiceRequest(requestId, bookingData);

      Alert.alert('Success', 'Recording request and booking created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            reset();
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Submit recording error:', error);
      Alert.alert('Error', error?.message || 'Failed to submit recording request');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const renderSummary = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Booking Details</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(step1?.bookingDate)}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue}>
            {step1?.bookingStartTime || '—'} - {step1?.bookingEndTime || '—'}
          </Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="hourglass-outline" size={16} color={COLORS.textSecondary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Duration</Text>
          <Text style={styles.infoValue}>
            {step1?.durationHours?.toFixed(2) || '—'} hours
          </Text>
        </View>
      </View>
    </View>
  );

  const getVocalChoiceLabel = (choice) => {
    const labels = {
      NONE: 'No vocal',
      CUSTOMER_SELF: 'I will sing',
      INTERNAL_ARTIST: 'Hire in-house vocalist',
      BOTH: 'I sing + hire vocalist(s)',
    };
    return labels[choice] || choice;
  };

  const renderVocal = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="mic-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Vocal Setup</Text>
      </View>
      <View style={styles.tagContainer}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{getVocalChoiceLabel(step2?.vocalChoice || 'NONE')}</Text>
        </View>
      </View>
      {step2?.selectedVocalists && step2.selectedVocalists.length > 0 && (
        <View style={styles.vocalistsList}>
          <Text style={styles.sectionSubtitle}>Selected Vocalists:</Text>
          {step2.selectedVocalists.map((v) => (
            <View key={v.specialistId} style={styles.vocalistItem}>
              <Ionicons name="person-circle" size={18} color={COLORS.primary} />
              <Text style={styles.vocalistName}>{v.name || v.fullName || 'Vocalist'}</Text>
              {v.hourlyRate && (
                <Text style={styles.vocalistRate}>
                  {v.hourlyRate.toLocaleString('vi-VN')} VND/hr
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderInstruments = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="musical-notes-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Instruments & Equipment</Text>
      </View>
      {step3?.hasLiveInstruments === false ? (
        <View style={styles.emptyState}>
          <Ionicons name="musical-note-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No live instruments</Text>
          <Text style={styles.helperText}>Beat/backing track only</Text>
        </View>
      ) : step3?.instruments && step3.instruments.length > 0 ? (
        <View style={styles.instrumentsList}>
          {step3.instruments.map((inst, index) => (
            <View key={inst.instrumentId || inst.skillId || index}>
              <View style={styles.instrumentItem}>
                <View style={styles.instrumentHeader}>
                  <Ionicons name="musical-note" size={18} color={COLORS.primary} />
                  <Text style={styles.instrumentName}>{inst.instrumentName || inst.skillName}</Text>
                </View>
                <View style={styles.instrumentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {inst.performerSource === 'INTERNAL_ARTIST' 
                        ? `Performer: ${inst.specialistName || 'In-house artist'}` 
                        : 'Performer: Self'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cube-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {inst.instrumentSource === 'STUDIO_SIDE' ? 'Rent from studio' : 'Bring my own'}
                    </Text>
                  </View>
                  {inst.instrumentSource === 'STUDIO_SIDE' && inst.equipmentId && (
                    <>
                      <View style={styles.detailRow}>
                        <Ionicons name="hardware-chip-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>
                          Equipment: {inst.equipmentName || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="layers-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>
                          Quantity: {inst.quantity || 1}
                          {inst.rentalFee ? ` • ${inst.rentalFee.toLocaleString('vi-VN')} VND/hr` : ''}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
              {index < step3.instruments.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="musical-note-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No instruments selected</Text>
        </View>
      )}
    </View>
  );

  const renderFeeBreakdown = () => {
    const hours = step1?.durationHours || 2;
    const breakdown = [];

    // Vocal fees breakdown
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach((vocalist) => {
        const rate = vocalist.hourlyRate || 500000;
        const fee = rate * hours;
        breakdown.push({
          type: 'vocalist',
          name: vocalist.name || 'Vocalist',
          rate: rate,
          hours: hours,
          fee: fee,
        });
      });
    }

    // Instrument performer fees breakdown
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach((instrument) => {
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          const rate = instrument.hourlyRate || 300000;
          const fee = rate * hours;
          breakdown.push({
            type: 'instrumentalist',
            name: instrument.specialistName || instrument.instrumentName || 'Instrumentalist',
            rate: rate,
            hours: hours,
            fee: fee,
          });
        }

        // Equipment rental breakdown
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          const fee = rentalFee * quantity * hours;
          breakdown.push({
            type: 'equipment',
            name: instrument.equipmentName || instrument.instrumentName || 'Equipment',
            rate: rentalFee,
            quantity: quantity,
            hours: hours,
            fee: fee,
          });
        }
      });
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Estimated Total Fee</Text>
        </View>
        
        <View style={styles.feeSection}>
          <View style={styles.feeRow}>
            <View style={styles.feeLabelContainer}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.feeLabel}>Participant Fee</Text>
            </View>
            <Text style={styles.feeValue}>
              {fees.participantFee.toLocaleString('vi-VN')} VND
            </Text>
          </View>
          <Text style={styles.feeSubtext}>Vocalists + Instrumentalists</Text>
        </View>

        <View style={styles.feeSection}>
          <View style={styles.feeRow}>
            <View style={styles.feeLabelContainer}>
              <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.feeLabel}>Equipment Fee</Text>
            </View>
            <Text style={styles.feeValue}>
              {fees.equipmentRentalFee.toLocaleString('vi-VN')} VND
            </Text>
          </View>
          <Text style={styles.feeSubtext}>Equipment rental from studio</Text>
        </View>

        <View style={[styles.feeRow, styles.totalFeeRow]}>
          <Text style={styles.totalFeeLabel}>Total</Text>
          <Text style={styles.totalFeeValue}>
            {fees.totalFee.toLocaleString('vi-VN')} VND
          </Text>
        </View>

        {fees.totalFee === 0 && (
          <View style={styles.zeroFeeNote}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.zeroFeeText}>You are self-performing (No additional fees)</Text>
          </View>
        )}

        {breakdown.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
            {breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Ionicons 
                    name={
                      item.type === 'vocalist' ? 'mic' : 
                      item.type === 'instrumentalist' ? 'musical-note' : 
                      'hardware-chip'
                    } 
                    size={16} 
                    color={COLORS.primary} 
                  />
                  <Text style={styles.breakdownName}>{item.name}</Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  {item.rate.toLocaleString('vi-VN')} VND/hr
                  {item.quantity ? ` × ${item.quantity}` : ''} × {item.hours} hrs = 
                  <Text style={styles.breakdownFee}> {item.fee.toLocaleString('vi-VN')} VND</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review & Submit</Text>
      <Text style={styles.subtitle}>Check your info before submitting.</Text>

      {renderSummary()}
      {renderVocal()}
      {renderInstruments()}
      {renderFeeBreakdown()}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Contact Information</Text>
        </View>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Recording request title"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe your recording session details..."
        />
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={contactName}
          onChangeText={setContactName}
          placeholder="Full name"
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={contactEmail}
          onChangeText={setContactEmail}
          placeholder="email@example.com"
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="+84 ..."
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Reference File</Text>
        </View>
        <FileUploader
          selectedFile={file}
          onFileSelect={(f) => update({ file: f })}
          onClearFile={() => update({ file: null })}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, uploading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Submit Recording</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  text: { fontSize: FONT_SIZES.base, color: COLORS.text },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  bold: { fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  vocalistsList: {
    marginTop: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  vocalistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  vocalistName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  vocalistRate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  instrumentsList: {
    marginTop: SPACING.xs,
  },
  instrumentItem: {
    paddingVertical: SPACING.sm,
  },
  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  instrumentName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  instrumentDetails: {
    marginLeft: 26,
    gap: SPACING.xs / 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  feeSection: {
    marginBottom: SPACING.md,
  },
  feeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  label: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginTop: SPACING.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginTop: SPACING.xs,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  primaryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  feeLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  feeValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  feeSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  totalFeeRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalFeeLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  totalFeeValue: {
    fontSize: FONT_SIZES.lg,
    color: '#ff4d4f',
    fontWeight: '700',
  },
  zeroFeeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  zeroFeeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: '500',
  },
  breakdownSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breakdownTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  breakdownItem: {
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: SPACING.xs / 2,
  },
  breakdownName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  breakdownDetail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 20,
  },
  breakdownFee: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default RecordingReviewScreen;

