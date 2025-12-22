// RecordingStep1.js - Slot Selection (Date & Time)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../../config/constants';
import { getAvailableSlots } from '../../../services/studioBookingService';

const RecordingStep1 = ({ data, onComplete }) => {
  const [selectedDate, setSelectedDate] = useState(
    data?.bookingDate ? dayjs(data.bookingDate).format('YYYY-MM-DD') : null
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState(
    data?.bookingStartTime && data?.bookingEndTime
      ? {
          start: data.bookingStartTime,
          end: data.bookingEndTime,
        }
      : null
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [externalGuestCount, setExternalGuestCount] = useState(
    typeof data?.externalGuestCount === 'number' ? data.externalGuestCount : 0
  );

  // Fetch available slots from backend when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const response = await getAvailableSlots(selectedDate);

        if (response?.status === 'success' && response?.data) {
          // Map backend slots to frontend format
          const slots = response.data.map(slot => {
            // Normalize time format: remove seconds if present (08:00:00 -> 08:00)
            const normalizeTime = time => {
              if (!time) return time;
              // If format is HH:mm:ss, extract only HH:mm
              if (time.includes(':') && time.split(':').length === 3) {
                return time.substring(0, 5); // Take first 5 chars (HH:mm)
              }
              return time;
            };

            return {
              start: normalizeTime(slot.startTime || slot.start_time),
              end: normalizeTime(slot.endTime || slot.end_time),
              available: slot.available !== false, // Default true if not specified
              status: slot.status || (slot.available ? 'available' : 'booked'),
            };
          });
          setAvailableSlots(slots);
        } else {
          // Fallback: generate slots locally if API fails
          generateDefaultSlots();
        }
      } catch (error) {
        console.error('Error fetching available slots:', error);
        Alert.alert('Warning', 'Unable to load available slots. Using default slots.');
        // Fallback: generate slots locally
        generateDefaultSlots();
      } finally {
        setLoadingSlots(false);
      }
    };

    const generateDefaultSlots = () => {
      // Generate slots theo logic backend: startHour = 8, slotDuration = 2, endHour = 18
      const slots = [];
      const startHour = 8; // 8 AM - same as backend
      const endHour = 18; // 6 PM
      const slotDuration = 2; // 2 hours per slot

      for (let hour = startHour; hour < endHour; hour += slotDuration) {
        const start = `${hour.toString().padStart(2, '0')}:00`;
        const end = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;
        if (hour + slotDuration <= endHour) {
          slots.push({ start, end, available: true, status: 'available' });
        }
      }
      setAvailableSlots(slots);
    };

    fetchSlots();
  }, [selectedDate]);

  // Check if time slot is available (from backend slots)
  const isTimeSlotAvailable = (start, end) => {
    if (!availableSlots.length) return true;

    const slotStart = dayjs(start, 'HH:mm');
    const slotEnd = dayjs(end, 'HH:mm');

    // Check if there's an available slot matching this time range
    return availableSlots.some(slot => {
      const slotStartTime = dayjs(slot.start, 'HH:mm');
      const slotEndTime = dayjs(slot.end, 'HH:mm');

      // Exact match or within slot range
      return (
        slot.available &&
        ((slotStart.isSame(slotStartTime) && slotEnd.isSame(slotEndTime)) ||
          (slotStart.isAfter(slotStartTime) && slotEnd.isBefore(slotEndTime)))
      );
    });
  };

  const handleDateSelect = (day) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);
    setSelectedTimeRange(null); // Reset time when date changes
    setAvailableSlots([]); // Clear previous slots
    setLoadingSlots(true); // Show loading immediately
  };

  const handleSlotSelect = (start, end) => {
    // Validate slot is available
    if (!isTimeSlotAvailable(start, end)) {
      Alert.alert(
        'Warning',
        'This time slot is already booked. Please select another time.'
      );
      return;
    }

    // If clicking on already selected slot, deselect it
    if (
      selectedTimeRange &&
      selectedTimeRange.start === start &&
      selectedTimeRange.end === end
    ) {
      setSelectedTimeRange(null);
      return;
    }

    setSelectedTimeRange({ start, end });
  };

  const handleContinue = () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    // Validate that selected date is not today or in the past
    const today = dayjs().startOf('day');
    const selectedDay = dayjs(selectedDate).startOf('day');
    if (selectedDay.isBefore(today) || selectedDay.isSame(today)) {
      Alert.alert(
        'Error',
        'Cannot book for today or past dates. Please select a future date.'
      );
      return;
    }

    if (!selectedTimeRange) {
      Alert.alert('Error', 'Please select a time range');
      return;
    }

    const { start, end } = selectedTimeRange;
    const startTime = dayjs(start, 'HH:mm');
    const endTime = dayjs(end, 'HH:mm');
    const durationHours = endTime.diff(startTime, 'hour', true); // Calculate duration in hours (decimal)

    if (!isTimeSlotAvailable(start, end)) {
      Alert.alert('Error', 'Selected time slot is no longer available');
      return;
    }

    onComplete({
      bookingDate: selectedDate,
      bookingStartTime: start,
      bookingEndTime: end,
      durationHours, // Save duration for fee calculation
      externalGuestCount,
    });
  };

  // Marked dates for calendar
  const markedDates = selectedDate
    ? {
        [selectedDate]: {
          selected: true,
          selectedColor: COLORS.primary,
          selectedTextColor: COLORS.white,
        },
      }
    : {};

  // Disable past dates and today
  const minDate = dayjs().add(1, 'day').format('YYYY-MM-DD');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Step 1: Select Booking Date & Time</Text>
          <Text style={styles.description}>
            Choose your preferred date and time slot for the recording session
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.calendarSection}>
            <Calendar
              current={selectedDate || dayjs().format('YYYY-MM-DD')}
              minDate={minDate}
              onDayPress={handleDateSelect}
              markedDates={markedDates}
              theme={{
                todayTextColor: COLORS.primary,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.text,
                textDayFontWeight: '600',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
              }}
            />
          </View>

          {selectedDate ? (
            <View style={styles.timeSelectionSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Time Slot</Text>
                <Text style={styles.sectionSubtitle}>
                  Selected Date: {dayjs(selectedDate).format('dddd, MMMM DD, YYYY')}
                </Text>
              </View>

              {loadingSlots && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading available slots...</Text>
                </View>
              )}

              {!loadingSlots &&
                availableSlots.length > 0 &&
                availableSlots.some(slot => !slot.available) && (
                  <View style={styles.alertContainer}>
                    <Ionicons name="information-circle" size={20} color={COLORS.info} />
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>Booked Slots</Text>
                      <View style={styles.bookedSlotsContainer}>
                        {availableSlots
                          .filter(slot => !slot.available)
                          .map((slot, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.bookedSlotTag,
                                slot.status === 'tentative' && styles.tentativeSlotTag,
                              ]}
                            >
                              <Text style={styles.bookedSlotText}>
                                {slot.start} - {slot.end} ({slot.status})
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  </View>
                )}

              {!loadingSlots && availableSlots.length > 0 && (
                <View style={styles.quickSlots}>
                  <Text style={styles.slotsTitle}>Available Time Slots:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slotsContainer}
                  >
                    {availableSlots.map((slot, idx) => {
                      // Normalize slot times to ensure format consistency (HH:mm)
                      const normalizeTime = time => {
                        if (!time) return time;
                        // If format is HH:mm:ss, extract only HH:mm
                        if (time.includes(':') && time.split(':').length === 3) {
                          return time.substring(0, 5); // Take first 5 chars (HH:mm)
                        }
                        // If format is just number, convert to HH:00
                        if (!time.includes(':')) {
                          return `${String(time).padStart(2, '0')}:00`;
                        }
                        return time;
                      };

                      const slotStart = normalizeTime(slot.start);
                      const slotEnd = normalizeTime(slot.end);

                      // Check if this slot is selected
                      const isSelected =
                        selectedTimeRange &&
                        selectedTimeRange.start === slotStart &&
                        selectedTimeRange.end === slotEnd;

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.slotButton,
                            isSelected && styles.slotButtonSelected,
                            !slot.available && styles.slotButtonDisabled,
                          ]}
                          onPress={() => {
                            if (slot.available) {
                              handleSlotSelect(slotStart, slotEnd);
                            }
                          }}
                          disabled={!slot.available}
                        >
                          <Text
                            style={[
                              styles.slotButtonText,
                              isSelected && styles.slotButtonTextSelected,
                              !slot.available && styles.slotButtonTextDisabled,
                            ]}
                          >
                            {slotStart} - {slotEnd}
                          </Text>
                          {!slot.available && (
                            <View style={styles.bookedBadge}>
                              <Text style={styles.bookedBadgeText}>Booked</Text>
                            </View>
                          )}
                          {isSelected && slot.available && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={COLORS.white}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {selectedTimeRange && (
                <View style={styles.selectedInfo}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <View style={styles.selectedContent}>
                    <View style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>Time:</Text>
                      <Text style={styles.selectedValue}>
                        {selectedTimeRange.start} - {selectedTimeRange.end}
                      </Text>
                    </View>
                    <View style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>Duration:</Text>
                      <Text style={styles.selectedValue}>
                        {dayjs(selectedTimeRange.end, 'HH:mm').diff(
                          dayjs(selectedTimeRange.start, 'HH:mm'),
                          'hour'
                        )}{' '}
                        hours
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* External Guests */}
              <View style={styles.guestsSection}>
                <Text style={styles.guestsTitle}>External Guests</Text>
                <Text style={styles.guestsSubtitle}>
                  Number of guests accompanying you to the session (if any)
                </Text>
                <View style={styles.guestsInputContainer}>
                  <Text style={styles.guestsLabel}>Guests:</Text>
                  <TextInput
                    style={styles.guestsInput}
                    value={externalGuestCount.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0 && num <= 50) {
                        setExternalGuestCount(num);
                      }
                    }}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.timeSelectionSection}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Please select a date to view available time slots
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedDate || !selectedTimeRange) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedDate || !selectedTimeRange}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.continueButtonText}>Continue to Vocal Setup</Text>
        </TouchableOpacity>
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
  contentWrapper: {
    marginBottom: SPACING.lg,
  },
  calendarSection: {
    marginBottom: SPACING.xl,
  },
  timeSelectionSection: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    // borderLeftWidth: 3,
    // borderLeftColor: COLORS.info,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  alertContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  alertTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  bookedSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  bookedSlotTag: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
    marginTop: SPACING.xs,
  },
  tentativeSlotTag: {
    backgroundColor: COLORS.warning,
  },
  bookedSlotText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  quickSlots: {
    marginBottom: SPACING.lg,
  },
  slotsTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  slotsContainer: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  slotButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotButtonDisabled: {
    backgroundColor: COLORS.gray[200],
    opacity: 0.6,
  },
  slotButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  slotButtonTextSelected: {
    color: COLORS.white,
  },
  slotButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  bookedBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  bookedBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  guestsSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  guestsTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  guestsSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  guestsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestsLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  guestsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.success + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  selectedContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  selectedLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 80,
  },
  selectedValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
  continueButtonText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default RecordingStep1;

