// RecordingStep1.jsx - Slot Selection (Date & Time)
import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Calendar,
  Button,
  Space,
  Tag,
  Typography,
  Alert,
  message,
  Spin,
  InputNumber,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAvailableSlots } from '../../../../../../services/studioBookingService';
import styles from './RecordingStep1.module.css';

const { Title, Text } = Typography;

export default function RecordingStep1({ data, onComplete }) {
  const [selectedDate, setSelectedDate] = useState(
    data?.bookingDate ? dayjs(data.bookingDate) : null
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState(
    data?.bookingStartTime && data?.bookingEndTime
      ? [
          dayjs(data.bookingStartTime, 'HH:mm'),
          dayjs(data.bookingEndTime, 'HH:mm'),
        ]
      : null
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [externalGuestCount, setExternalGuestCount] = useState(
    typeof data?.externalGuestCount === 'number'
      ? data.externalGuestCount
      : 0
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
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const response = await getAvailableSlots(dateStr);

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
          console.log('slots', slots);
          setAvailableSlots(slots);
        } else {
          // Fallback: generate slots locally if API fails
          generateDefaultSlots();
        }
      } catch (error) {
        console.error('Error fetching available slots:', error);
        message.warning('Unable to load available slots. Using default slots.');
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

  // Use slots from backend
  const availableTimeSlots = availableSlots;

  const handleDateSelect = date => {
    setSelectedDate(date);
    setSelectedTimeRange(null); // Reset time when date changes
    setAvailableSlots([]); // Clear previous slots
    setLoadingSlots(true); // Show loading immediately
  };

  const handleSlotSelect = (start, end) => {
    // Validate slot is available
    if (!isTimeSlotAvailable(start, end)) {
      message.warning(
        'This time slot is already booked. Please select another time.'
      );
      return;
    }

    const startTime = dayjs(start, 'HH:mm');
    const endTime = dayjs(end, 'HH:mm');

    setSelectedTimeRange([startTime, endTime]);
  };

  const handleContinue = () => {
    if (!selectedDate) {
      message.error('Please select a date');
      return;
    }

    // Validate that selected date is not today or in the past
    const today = dayjs().startOf('day');
    const selectedDay = selectedDate.startOf('day');
    if (selectedDay.isBefore(today) || selectedDay.isSame(today)) {
      message.error(
        'Cannot book for today or past dates. Please select a future date.'
      );
      return;
    }

    if (!selectedTimeRange) {
      message.error('Please select a time range');
      return;
    }

    const [start, end] = selectedTimeRange;
    const startStr = start.format('HH:mm');
    const endStr = end.format('HH:mm');
    const durationHours = end.diff(start, 'hour', true); // Calculate duration in hours (decimal)

    if (!isTimeSlotAvailable(startStr, endStr)) {
      message.error('Selected time slot is no longer available');
      return;
    }

    onComplete({
      bookingDate: selectedDate.format('YYYY-MM-DD'),
      bookingStartTime: startStr,
      bookingEndTime: endStr,
      durationHours, // Save duration for fee calculation
      externalGuestCount,
    });
  };

  // Custom date cell renderer
  const dateCellRender = date => {
    const today = dayjs().startOf('day');
    const selectedDay = date.startOf('day');
    const isPast = selectedDay.isBefore(today);
    const isToday = selectedDay.isSame(today);

    if (isPast) {
      return <div className={styles.pastDate}>Past</div>;
    }

    if (isToday) {
      return <div className={styles.todayDate}>Today</div>;
    }

    return null;
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 1: Select Booking Date & Time
        </Title>
        <Text className={styles.description}>
          Choose your preferred date and time slot for the recording session
        </Text>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.calendarSection}>
          <Calendar
            value={selectedDate}
            onSelect={handleDateSelect}
            dateCellRender={dateCellRender}
            disabledDate={date => {
              // Disable today and past dates - only allow future dates
              const today = dayjs().startOf('day');
              const selectedDay = date.startOf('day');
              return selectedDay.isBefore(today) || selectedDay.isSame(today);
            }}
            className={styles.calendar}
          />
        </div>

        {selectedDate ? (
          <div className={styles.timeSelectionSection}>
            <div className={styles.sectionHeader}>
              <Title level={4}>Select Time Slot</Title>
              <Text type="secondary">
                Selected Date: {selectedDate.format('dddd, MMMM DD, YYYY')}
              </Text>
            </div>

            {loadingSlots && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="Loading available slots..." />
              </div>
            )}

            {!loadingSlots &&
              availableSlots.length > 0 &&
              availableSlots.some(slot => !slot.available) && (
                <Alert
                  message="Booked Slots"
                  description={
                    <div>
                      {availableSlots
                        .filter(slot => !slot.available)
                        .map((slot, idx) => (
                          <Tag
                            key={idx}
                            color={
                              slot.status === 'tentative' ? 'orange' : 'red'
                            }
                            style={{ marginTop: 4 }}
                          >
                            {slot.start} - {slot.end} ({slot.status})
                          </Tag>
                        ))}
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

            {!loadingSlots && availableTimeSlots.length > 0 && (
              <div className={styles.quickSlots}>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  Available Time Slots:
                </Text>
                <Space wrap>
                  {availableTimeSlots.map((slot, idx) => {
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
                    const selectedStart =
                      selectedTimeRange?.[0]?.format('HH:mm');
                    const selectedEnd = selectedTimeRange?.[1]?.format('HH:mm');
                    const isSelected =
                      selectedTimeRange &&
                      selectedStart === slotStart &&
                      selectedEnd === slotEnd;

                    return (
                      <Button
                        key={idx}
                        type={isSelected ? 'primary' : 'default'}
                        disabled={!slot.available}
                        onClick={() => {
                          if (slot.available) {
                            handleSlotSelect(slotStart, slotEnd);
                          }
                        }}
                        className={styles.slotButton}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {slotStart} - {slotEnd}
                          {!slot.available && (
                            <Tag color="red" style={{ margin: 0 }}>
                              Booked
                            </Tag>
                          )}
                          {isSelected && slot.available && (
                            <CheckCircleOutlined style={{ fontSize: '14px' }} />
                          )}
                          {!isSelected && slot.available && (
                            <span
                              style={{ width: '14px', display: 'inline-block' }}
                            />
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </Space>
              </div>
            )}

            {/* External Guests */}
            <div style={{ marginTop: 24 }}>
              <Title level={5}>External Guests</Title>
              <Text type="secondary">
                Number of guests accompanying you to the session (if any)
              </Text>
              <div style={{ marginTop: 8 }}>
                <Space>
                  <span>Guests:</span>
                  <InputNumber
                    min={0}
                    max={50}
                    value={externalGuestCount}
                    onChange={value => setExternalGuestCount(value ?? 0)}
                  />
                </Space>
              </div>
            </div>

            {selectedTimeRange && (
              <div className={styles.selectedInfo}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong>
                    Selected: {selectedTimeRange[0].format('HH:mm')} -{' '}
                    {selectedTimeRange[1].format('HH:mm')}
                  </Text>
                  <Tag color="green">
                    Duration:{' '}
                    {selectedTimeRange[1].diff(selectedTimeRange[0], 'hour')}{' '}
                    hours
                  </Tag>
                </Space>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.timeSelectionSection}>
            <div
              style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}
            >
              <Text>Please select a date to view available time slots</Text>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actionRow}>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTimeRange}
          className={styles.continueButton}
        >
          Continue to Vocal Setup
        </Button>
      </div>
    </Card>
  );
}
