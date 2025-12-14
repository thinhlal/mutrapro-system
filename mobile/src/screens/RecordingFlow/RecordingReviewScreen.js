import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

  const renderSummary = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Booking</Text>
      <Text style={styles.text}>
        Date: <Text style={styles.bold}>{step1?.bookingDate || '—'}</Text>
      </Text>
      <Text style={styles.text}>
        Time: <Text style={styles.bold}>{step1?.bookingStartTime} - {step1?.bookingEndTime}</Text>
      </Text>
      <Text style={styles.text}>
        Duration: <Text style={styles.bold}>{step1?.durationHours?.toFixed(2) || '—'} hrs</Text>
      </Text>
    </View>
  );

  const renderVocal = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Vocal</Text>
      <Text style={styles.text}>Choice: <Text style={styles.bold}>{step2?.vocalChoice || 'NONE'}</Text></Text>
      {step2?.selectedVocalists?.length > 0 &&
        step2.selectedVocalists.map((v) => (
          <Text key={v.specialistId} style={styles.text}>
            • {v.name}
          </Text>
        ))}
    </View>
  );

  const renderInstruments = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Instruments</Text>
      {step3?.hasLiveInstruments === false ? (
        <Text style={styles.text}>No live instruments (beat/backing track only)</Text>
      ) : step3?.instruments?.length > 0 ? (
        step3.instruments.map((inst) => (
          <View key={inst.instrumentId} style={{ marginBottom: SPACING.xs }}>
            <Text style={styles.text}>
              • {inst.instrumentName} ({inst.skillId})
            </Text>
            <Text style={styles.helperText}>
              Performer: {inst.performerSource === 'INTERNAL_ARTIST' ? inst.specialistName || 'In-house' : 'Self'}
            </Text>
            <Text style={styles.helperText}>
              Source: {inst.instrumentSource === 'STUDIO_SIDE' ? 'Rent studio' : 'Bring my own'}
            </Text>
            {inst.instrumentSource === 'STUDIO_SIDE' && inst.equipmentId && (
              <Text style={styles.helperText}>
                Equipment: {inst.equipmentName || 'N/A'} (Qty: {inst.quantity || 1})
              </Text>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.text}>None selected.</Text>
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
        <Text style={styles.cardTitle}>Estimated Total Fee</Text>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Participant Fee:</Text>
          <Text style={styles.feeValue}>
            {fees.participantFee.toLocaleString('vi-VN')} VND
          </Text>
        </View>
        <Text style={styles.feeSubtext}>(Vocalists + Instrumentalists)</Text>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Equipment Fee:</Text>
          <Text style={styles.feeValue}>
            {fees.equipmentRentalFee.toLocaleString('vi-VN')} VND
          </Text>
        </View>
        <Text style={styles.feeSubtext}>(Equipment from studio)</Text>
        <View style={[styles.feeRow, styles.totalFeeRow]}>
          <Text style={styles.totalFeeLabel}>Total:</Text>
          <Text style={styles.totalFeeValue}>
            {fees.totalFee.toLocaleString('vi-VN')} VND
          </Text>
        </View>
        {fees.totalFee === 0 && (
          <Text style={styles.helperText}>
            Total fee = 0 VND (You are self-performing)
          </Text>
        )}
        {breakdown.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <Text style={[styles.cardTitle, { fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs }]}>
              Breakdown Details:
            </Text>
            {breakdown.map((item, index) => (
              <View key={index} style={{ marginBottom: SPACING.xs }}>
                <Text style={styles.text}>
                  {item.type === 'vocalist' ? '🎤' : item.type === 'instrumentalist' ? '🎸' : '🔧'}{' '}
                  {item.name}
                </Text>
                <Text style={styles.helperText}>
                  {item.rate.toLocaleString('vi-VN')} VND/hour
                  {item.quantity ? ` x ${item.quantity} unit(s)` : ''} x {item.hours} hrs = {item.fee.toLocaleString('vi-VN')} VND
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
        <Text style={styles.cardTitle}>Contact</Text>
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
        <Text style={styles.cardTitle}>Upload</Text>
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
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  text: { fontSize: FONT_SIZES.base, color: COLORS.text },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  bold: { fontWeight: '700' },
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
});

export default RecordingReviewScreen;

