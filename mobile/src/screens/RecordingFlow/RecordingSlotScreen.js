import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import { getAvailableSlots } from '../../services/studioBookingService';
import { useRecordingFlow } from '../../context/RecordingFlowContext';

// Extend dayjs with customParseFormat plugin
if (!dayjs.prototype.customParseFormat) {
  dayjs.extend(customParseFormat);
}

const RecordingSlotScreen = ({ navigation }) => {
  const { state, update } = useRecordingFlow();
  const [bookingDate, setBookingDate] = useState(state.bookingDate || '');
  const [startTime, setStartTime] = useState(state.bookingStartTime || '');
  const [endTime, setEndTime] = useState(state.bookingEndTime || '');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const normalized = normalizeDate(bookingDate);
    if (normalized) {
      fetchSlots(normalized);
    } else {
      setSlots([]);
    }
  }, [bookingDate]);

  const normalizeDate = (dateString) => {
    if (!dateString) return null;
    const d = dayjs(dateString);
    if (!d.isValid()) return null;
    return d.format('YYYY-MM-DD');
  };

  const fetchSlots = async (date) => {
    try {
      setLoading(true);
      const resp = await getAvailableSlots(date);
      let mapped = [];
      const data = resp?.data || (resp?.status === 'success' ? resp.data : null);
      if (Array.isArray(data) && data.length > 0) {
        mapped = data.map((slot) => ({
          start: normalizeTime(slot.startTime || slot.start_time || slot.start),
          end: normalizeTime(slot.endTime || slot.end_time || slot.end),
          available: slot.available !== false,
          status: slot.status || (slot.available ? 'available' : 'booked'),
        })).filter((s) => s.start && s.end);
        console.log('[SlotScreen] mapped slots from API', mapped);
      }
      if (mapped.length === 0) {
        mapped = generateDefaultSlots();
      }
      setSlots(mapped);
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', error?.message || 'Failed to load available slots');
      setSlots(generateDefaultSlots());
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultSlots = () => {
    const slots = [];
    const startHour = 8;
    const endHour = 18;
    const slotDuration = 2;
    for (let hour = startHour; hour < endHour; hour += slotDuration) {
      const start = `${hour.toString().padStart(2, '0')}:00`;
      const end = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;
      if (hour + slotDuration <= endHour) {
        slots.push({ start, end, available: true, status: 'available' });
      }
    }
    return slots;
  };

  const normalizeTime = (t) => {
    if (!t) return '';
    const trimmed = (t || '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/(\d{1,2}):(\d{2})/);
    if (!match) return '';
    const hh = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleSelectSlot = (slot) => {
    const s = normalizeTime(slot.start);
    const e = normalizeTime(slot.end);
    console.log('[SlotScreen] select slot raw', slot, 'normalized', s, e);
    setSelectedSlot({ start: s, end: e });
    setStartTime(s);
    setEndTime(e);
  };

  const handleContinue = () => {
    const normalizedDate = normalizeDate(bookingDate);
    const startStr = normalizeTime(selectedSlot?.start || startTime);
    const endStr = normalizeTime(selectedSlot?.end || endTime);

    console.log('[SlotScreen] continue payload', {
      normalizedDate,
      startTimeState: startTime,
      endTimeState: endTime,
      selectedSlot,
      startStr,
      endStr,
      slots,
    });

    if (!normalizedDate || !startStr || !endStr) {
      Alert.alert('Validation', 'Please choose booking date (YYYY-MM-DD) and time slot.');
      return;
    }
    const start = dayjs(startStr, 'HH:mm');
    const end = dayjs(endStr, 'HH:mm');
    if (!start.isValid() || !end.isValid()) {
      Alert.alert('Validation', 'Invalid time format. Please use HH:mm.');
      return;
    }
    if (!end.isAfter(start)) {
      Alert.alert('Validation', 'End time must be after start time.');
      return;
    }
    const durationHours = end.diff(start, 'hour', true);
    update({
      bookingDate: normalizedDate,
      bookingStartTime: startStr,
      bookingEndTime: endStr,
      durationHours,
      step1: {
        bookingDate: normalizedDate,
        bookingStartTime: startStr,
        bookingEndTime: endStr,
        durationHours,
      },
    });
    navigation.navigate('RecordingVocal');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recording Slot</Text>
      <Text style={styles.subtitle}>Select your preferred date and time.</Text>

      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day) => setBookingDate(day.dateString)}
          markedDates={
            bookingDate
              ? {
                  [bookingDate]: {
                    selected: true,
                    selectedColor: COLORS.primary,
                  },
                }
              : {}
          }
          enableSwipeMonths
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Booking Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={bookingDate}
          onChangeText={setBookingDate}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Start Time (HH:mm)</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:mm"
          value={startTime}
          editable={false}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>End Time (HH:mm)</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:mm"
          value={endTime}
          editable={false}
        />
      </View>

      <View style={styles.slotSection}>
        <Text style={styles.sectionTitle}>Quick Select (Available Slots)</Text>
        {loading ? (
          <Text style={styles.helperText}>Loading slots...</Text>
        ) : slots.length === 0 ? (
          <Text style={styles.helperText}>No slots available for this date.</Text>
        ) : (
          <View style={styles.slotList}>
            {slots
              .filter((s) => s.available !== false)
              .map((slot, idx) => {
                const selected = startTime === slot.start && endTime === slot.end;
                return (
                  <TouchableOpacity
                    key={`${slot.start}-${slot.end}-${idx}`}
                    style={[styles.slotChip, selected && styles.slotChipSelected]}
                    onPress={() => handleSelectSlot(slot)}
                  >
                    <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                      {slot.start} - {slot.end}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </View>

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
  calendarContainer: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
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
  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  slotSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
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
  slotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  slotChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  slotChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  slotText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
  },
  slotTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
});

export default RecordingSlotScreen;

