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
      // Build participants from step2/step3
      const participants = [];
      const requiredEquipment = [];
      const hours = step1.durationHours || 2;

      if (step2?.selectedVocalists?.length > 0) {
        step2.selectedVocalists.forEach((v) => {
          participants.push({
            specialistId: v.specialistId,
            roleType: 'VOCAL',
            performerSource: 'INTERNAL_ARTIST',
            participantFee: v.hourlyRate ? v.hourlyRate * hours : undefined,
          });
        });
      }
      if (step2?.vocalChoice === 'CUSTOMER_SELF' || step2?.vocalChoice === 'BOTH') {
        participants.push({
          roleType: 'VOCAL',
          performerSource: 'CUSTOMER_SELF',
        });
      }

      if (step3?.instruments?.length > 0) {
        step3.instruments.forEach((inst) => {
          if (inst.performerSource === 'INTERNAL_ARTIST' && inst.specialistId) {
            const fee = inst.hourlyRate ? inst.hourlyRate * hours : undefined;
            participants.push({
              specialistId: inst.specialistId,
              roleType: 'INSTRUMENT',
              performerSource: 'INTERNAL_ARTIST',
              skillId: inst.skillId,
              instrumentSource: inst.instrumentSource,
              equipmentId: inst.instrumentSource === 'STUDIO_SIDE' ? inst.equipmentId : null,
              participantFee: fee,
            });
          } else {
            participants.push({
              roleType: 'INSTRUMENT',
              performerSource: 'CUSTOMER_SELF',
              skillId: inst.skillId,
              instrumentSource: inst.instrumentSource,
              equipmentId: inst.instrumentSource === 'STUDIO_SIDE' ? inst.equipmentId : null,
            });
          }

          if (inst.instrumentSource === 'STUDIO_SIDE' && inst.equipmentId) {
            requiredEquipment.push({
              equipmentId: inst.equipmentId,
              quantity: inst.quantity || 1,
              rentalFeePerUnit: inst.rentalFee || 0,
              totalRentalFee:
                inst.rentalFee && inst.quantity
                  ? inst.rentalFee * inst.quantity * hours
                  : undefined,
            });
          }
        });
      }

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

      const bookingData = {
        bookingDate: step1.bookingDate,
        startTime: step1.bookingStartTime,
        endTime: step1.bookingEndTime,
        durationHours: step1.durationHours,
        participants,
        requiredEquipment,
      };

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
      {step3?.instruments?.length > 0 ? (
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
          </View>
        ))
      ) : (
        <Text style={styles.text}>None selected.</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review & Submit</Text>
      <Text style={styles.subtitle}>Check your info before submitting.</Text>

      {renderSummary()}
      {renderVocal()}
      {renderInstruments()}

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
});

export default RecordingReviewScreen;

