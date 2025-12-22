// RecordingStep4.js - Review & Submit
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../config/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { createServiceRequest } from '../../../services/serviceRequestService';
import { createBookingFromServiceRequest } from '../../../services/studioBookingService';
import FileUploader from '../../../components/FileUploader';

const RecordingStep4 = ({ formData, onBack, onSubmit, navigation }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState(user?.fullName || '');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');

  // Destructure formData
  const { step0, step1, step2, step3 } = formData;

  // Initialize form with user info
  useEffect(() => {
    if (user) {
      setContactName(user.fullName || '');
      setContactEmail(user.email || '');
    }
  }, [user]);

  // Calculate fees (studio + participant + equipment + guests)
  const calculateFees = () => {
    let studioFee = 0;
    let participantFee = 0;
    let equipmentRentalFee = 0;
    let guestFee = 0;
    let chargeableGuests = 0;

    // Studio fee = hourlyRate * durationHours
    const studio = step0?.studio;
    const hours = step1?.durationHours || 2;
    if (studio?.hourlyRate) {
      studioFee = studio.hourlyRate * hours;
    }

    // Vocal fees (when hiring internal vocalists)
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        const rate = vocalist.hourlyRate || 500000;
        participantFee += rate * hours;
      });
    }

    // Instrument fees
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Performer fee (when hiring internal artist)
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          const rate = instrument.hourlyRate || 300000;
          participantFee += rate * hours;
        }

        // Equipment rental fee (when renting from studio)
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          equipmentRentalFee += rentalFee * quantity * hours;
        }
      });
    }

    // Guest fee
    const externalGuestCount =
      typeof step1?.externalGuestCount === 'number' ? step1.externalGuestCount : 0;

    if (
      studio &&
      typeof studio.extraGuestFeePerPerson === 'number' &&
      externalGuestCount > 0
    ) {
      const freeLimit =
        typeof studio.freeExternalGuestsLimit === 'number'
          ? studio.freeExternalGuestsLimit
          : 0;
      chargeableGuests = Math.max(0, externalGuestCount - freeLimit);
      if (chargeableGuests > 0) {
        guestFee = chargeableGuests * studio.extraGuestFeePerPerson;
      }
    }

    return {
      studioFee,
      participantFee,
      equipmentRentalFee,
      guestFee,
      chargeableGuests,
      totalFee: studioFee + participantFee + equipmentRentalFee + guestFee,
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
      step2.selectedVocalists.forEach(vocalist => {
        const hourlyRate = vocalist.hourlyRate || 500000;
        const totalFee = hourlyRate * hours;

        participants.push({
          specialistId: vocalist.specialistId,
          roleType: 'VOCAL',
          performerSource: 'INTERNAL_ARTIST',
          participantFee: totalFee,
        });
      });
    }

    // Add customer self vocalist if any
    if (
      step2?.vocalChoice === 'CUSTOMER_SELF' ||
      step2?.vocalChoice === 'BOTH'
    ) {
      participants.push({
        roleType: 'VOCAL',
        performerSource: 'CUSTOMER_SELF',
      });
    }

    // Add instrumentalists and equipment from step3
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Add performer
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          const hourlyRate = instrument.hourlyRate || 400000;
          const totalFee = hourlyRate * hours;

          participants.push({
            specialistId: instrument.specialistId,
            roleType: 'INSTRUMENT',
            performerSource: 'INTERNAL_ARTIST',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId:
              instrument.instrumentSource === 'STUDIO_SIDE'
                ? instrument.equipmentId
                : null,
            participantFee: totalFee,
          });
        } else if (instrument.performerSource === 'CUSTOMER_SELF') {
          const isCustomInstrument = instrument.isCustomInstrument;
          participants.push({
            roleType: 'INSTRUMENT',
            performerSource: 'CUSTOMER_SELF',
            skillId: isCustomInstrument ? null : instrument.skillId,
            skillName: isCustomInstrument ? instrument.skillName : null,
            instrumentSource: instrument.instrumentSource,
            equipmentId:
              instrument.instrumentSource === 'STUDIO_SIDE'
                ? instrument.equipmentId
                : null,
          });
        }

        // Add equipment
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFeePerHour = instrument.rentalFee || 0;
          const totalRentalFee = rentalFeePerHour * quantity * hours;

          requiredEquipment.push({
            equipmentId: instrument.equipmentId,
            quantity: quantity,
            rentalFeePerUnit: rentalFeePerHour,
            totalRentalFee: totalRentalFee,
          });
        }
      });
    }

    return {
      bookingDate: step1.bookingDate,
      startTime: step1.bookingStartTime,
      endTime: step1.bookingEndTime,
      durationHours: step1.durationHours,
      externalGuestCount: typeof step1.externalGuestCount === 'number'
        ? step1.externalGuestCount
        : 0,
      participants,
      requiredEquipment,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      // Validate file upload (MANDATORY)
      if (!uploadedFile) {
        Alert.alert(
          'Error',
          'Please upload a file (reference track, backing track, or sheet music)'
        );
        return;
      }

      // Validate form
      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }

      if (!description.trim() || description.trim().length < 10) {
        Alert.alert(
          'Error',
          'Please enter a description (at least 10 characters)'
        );
        return;
      }

      if (!contactName.trim()) {
        Alert.alert('Error', 'Please enter a contact name');
        return;
      }

      if (!contactPhone.trim()) {
        Alert.alert('Error', 'Please enter a phone number');
        return;
      }

      if (!contactEmail.trim() || !contactEmail.includes('@')) {
        Alert.alert('Error', 'Please enter a valid email');
        return;
      }

      setSubmitting(true);

      // Calculate duration in minutes
      const durationMinutes = Math.round((step1?.durationHours || 2) * 60);

      // 1. Create service request
      const requestData = {
        requestType: 'recording',
        title: title.trim(),
        description: description.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        durationMinutes,
        hasVocalist: step2?.vocalChoice !== 'NONE',
        instrumentIds: [],
        files: uploadedFile ? [uploadedFile] : [],
      };

      const requestResponse = await createServiceRequest(requestData);
      const requestId = requestResponse?.data?.requestId;

      if (!requestId) {
        throw new Error('Unable to get requestId from response');
      }

      // 2. Create booking from service request
      const bookingData = transformBookingData();
      const bookingResponse = await createBookingFromServiceRequest(
        requestId,
        bookingData
      );

      // Clear storage
      await onSubmit();

      Alert.alert(
        'Success',
        'Created request and booking successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to request detail
              navigation.navigate('RequestDetail', { requestId });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Submit error:', error);
      
      let errorMessage =
        error?.message || error?.data?.message || 'Failed to create request and booking';
      
      // Check for artist availability errors
      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('no registered slots') ||
        errorMessage.includes('missing slots')
      ) {
        errorMessage =
          'One or more selected artists are no longer available for the requested time slot. Please go back and select different artists or choose a different time slot.';
      } else if (errorMessage.includes('Artist') && errorMessage.includes('conflict')) {
        errorMessage =
          'One or more selected artists have a scheduling conflict. Please go back and select different artists or choose a different time slot.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (amount) => {
    if (!amount) return '0';
    return `${amount.toLocaleString('vi-VN')} ₫`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Review booking details</Text>
          <Text style={styles.description}>
            Please double-check the information before confirming
          </Text>
        </View>

        {/* Booking Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking time</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Date</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeValueText}>
                  {step1?.bookingDate || 'Not selected'}
                </Text>
              </View>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Start time</Text>
              <View style={[styles.timeValue, styles.timeValueGreen]}>
                <Text style={styles.timeValueText}>
                  {step1?.bookingStartTime || 'Not selected'}
                </Text>
              </View>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>End time</Text>
              <View style={[styles.timeValue, styles.timeValueOrange]}>
                <Text style={styles.timeValueText}>
                  {step1?.bookingEndTime || 'Not selected'}
                </Text>
              </View>
            </View>
          </View>

          {/* External guests */}
          {typeof step1?.externalGuestCount === 'number' && (
            <View style={styles.guestsRow}>
              <Text style={styles.timeLabel}>Guests</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeValueText}>
                  {step1.externalGuestCount} guest{step1.externalGuestCount === 1 ? '' : 's'}
                </Text>
              </View>
              {fees.chargeableGuests > 0 && fees.guestFee > 0 && (
                <Text style={styles.guestFeeText}>
                  Guest fee: {formatPrice(fees.guestFee)} ({fees.chargeableGuests} paid guest
                  {fees.chargeableGuests === 1 ? '' : 's'})
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Vocal Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vocal Setup</Text>
          {step2?.vocalChoice === 'NONE' && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>No vocal recording</Text>
            </View>
          )}

          {step2?.vocalChoice === 'CUSTOMER_SELF' && (
            <View style={[styles.alertBox, styles.alertBoxSuccess]}>
              <Text style={styles.alertText}>I will sing</Text>
            </View>
          )}

          {(step2?.vocalChoice === 'INTERNAL_ARTIST' ||
            step2?.vocalChoice === 'BOTH') && (
            <>
              {step2.vocalChoice === 'BOTH' && (
                <View style={[styles.alertBox, styles.alertBoxSuccess]}>
                  <Text style={styles.alertText}>
                    I will sing + hire in-house vocalist(s)
                  </Text>
                </View>
              )}
              {step2?.selectedVocalists?.map((vocalist, index) => (
                <View key={index} style={styles.vocalistItem}>
                  <Text style={styles.vocalistLabel}>Vocalist {index + 1}</Text>
                  <Text style={styles.vocalistValue}>{vocalist.name}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Instrument Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrument Setup</Text>
          {step3?.hasLiveInstruments === false ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                No live instruments (beat/backing track only)
              </Text>
            </View>
          ) : (
            step3?.instruments?.map((instrument, index) => (
              <View key={index} style={styles.instrumentItem}>
                <Text style={styles.instrumentName}>{instrument.skillName}</Text>
                <Text style={styles.instrumentDetail}>
                  Performer:{' '}
                  {instrument.performerSource === 'CUSTOMER_SELF'
                    ? 'I will play'
                    : instrument.specialistName || 'Not selected'}
                </Text>
                <Text style={styles.instrumentDetail}>
                  Instrument source:{' '}
                  {instrument.instrumentSource === 'CUSTOMER_SIDE'
                    ? 'I will bring my own'
                    : instrument.equipmentName || 'Not selected'}
                </Text>
                {instrument.quantity && (
                  <Text style={styles.instrumentDetail}>
                    Quantity: {instrument.quantity}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Fee Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimated total fee</Text>
          <View style={styles.feeGrid}>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Studio fee</Text>
              <Text style={[styles.feeValue, styles.feeValueBlue]}>
                {formatPrice(fees.studioFee)}
              </Text>
              <Text style={styles.feeNote}>(Studio hourly rate)</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Participant fee</Text>
              <Text style={[styles.feeValue, styles.feeValueGreen]}>
                {formatPrice(fees.participantFee)}
              </Text>
              <Text style={styles.feeNote}>(Vocalists + Instrumentalists)</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Equipment fee</Text>
              <Text style={[styles.feeValue, styles.feeValueGreen]}>
                {formatPrice(fees.equipmentRentalFee)}
              </Text>
              <Text style={styles.feeNote}>(Equipment from studio)</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Guest fee</Text>
              <Text style={[styles.feeValue, styles.feeValueOrange]}>
                {formatPrice(fees.guestFee)}
              </Text>
              <Text style={styles.feeNote}>(Extra guests beyond free limit)</Text>
            </View>
            <View style={[styles.feeItem, styles.feeItemTotal]}>
              <Text style={styles.feeLabelTotal}>Total</Text>
              <Text style={styles.feeValueTotal}>{formatPrice(fees.totalFee)}</Text>
            </View>
          </View>
        </View>

        {/* Service Request Information Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Request Information</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. Record my new song"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your recording request in detail..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                Contact name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={contactName}
                onChangeText={setContactName}
              />
            </View>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                Phone number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+84 ..."
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Contact email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* File Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upload File <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.alertBox}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={styles.alertText}>
              Please upload a reference track, backing track, or sheet music (PDF/XML)
            </Text>
          </View>
          <FileUploader
            onFileSelect={setUploadedFile}
            selectedFile={uploadedFile}
            onClearFile={() => setUploadedFile(null)}
            allowedFileTypes={null} // Allow all file types for recording
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={submitting}
          >
            <Text style={styles.backButtonText}>Back to Instrument Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>
                  Confirm & Submit Booking
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timeValue: {
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  timeValueGreen: {
    backgroundColor: COLORS.success + '20',
  },
  timeValueOrange: {
    backgroundColor: COLORS.warning + '20',
  },
  timeValueText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  guestsRow: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  guestFeeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  alertBoxSuccess: {
    backgroundColor: COLORS.success + '15',
  },
  alertText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  vocalistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  vocalistLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  vocalistValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  instrumentItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  instrumentName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  instrumentDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  feeGrid: {
    gap: SPACING.md,
  },
  feeItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  feeItemTotal: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  feeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  feeLabelTotal: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  feeValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  feeValueBlue: {
    color: COLORS.info,
  },
  feeValueGreen: {
    color: COLORS.success,
  },
  feeValueOrange: {
    color: COLORS.warning,
  },
  feeValueTotal: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.error,
  },
  feeNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default RecordingStep4;

