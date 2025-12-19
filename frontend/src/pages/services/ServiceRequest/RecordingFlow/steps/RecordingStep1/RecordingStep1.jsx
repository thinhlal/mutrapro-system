// RecordingStep1.jsx - Slot Selection (Date & Time)
import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Calendar,
  TimePicker,
  Button,
  Space,
  Tag,
  Typography,
  Alert,
  message,
  Spin,
} from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAvailableSlots } from '../../../../../../services/studioBookingService';
import styles from './RecordingStep1.module.css';

const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

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
          const slots = response.data.map(slot => ({
            start: slot.startTime || slot.start_time,
            end: slot.endTime || slot.end_time,
            available: slot.available !== false, // Default true if not specified
            status: slot.status || (slot.available ? 'available' : 'booked'),
          }));
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
  };

  const handleTimeRangeChange = range => {
    if (!range) {
      setSelectedTimeRange(null);
      return;
    }

    const [start, end] = range;
    const startStr = start.format('HH:mm');
    const endStr = end.format('HH:mm');

    // Validate time range
    if (end.isBefore(start) || end.isSame(start)) {
      message.error('End time must be after start time');
      return;
    }

    // Check if selected time slot is available
    if (!isTimeSlotAvailable(startStr, endStr)) {
      message.warning(
        'This time slot is already booked. Please select another time.'
      );
      return;
    }

    setSelectedTimeRange(range);
  };

  const handleContinue = () => {
    if (!selectedDate) {
      message.error('Please select a date');
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
    });
  };

  // Custom date cell renderer
  const dateCellRender = date => {
    const isPast = date.isBefore(dayjs(), 'day');
    const isToday = date.isSame(dayjs(), 'day');

    if (isPast && !isToday) {
      return <div className={styles.pastDate}>Past</div>;
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

      <div className={styles.calendarSection}>
        <Calendar
          value={selectedDate}
          onSelect={handleDateSelect}
          dateCellRender={dateCellRender}
          disabledDate={date => date.isBefore(dayjs(), 'day')}
          className={styles.calendar}
        />
      </div>

      {selectedDate && (
        <div className={styles.timeSelectionSection}>
          <div className={styles.sectionHeader}>
            <Title level={4}>Select Time Range</Title>
            <Text type="secondary">
              Selected Date: {selectedDate.format('dddd, MMMM DD, YYYY')}
            </Text>
          </div>

          {loadingSlots && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin tip="Loading available slots..." />
            </div>
          )}

          {!loadingSlots && availableSlots.some(slot => !slot.available) && (
            <Alert
              message="Booked Slots"
              description={
                <div>
                  {availableSlots
                    .filter(slot => !slot.available)
                    .map((slot, idx) => (
                      <Tag
                        key={idx}
                        color={slot.status === 'tentative' ? 'orange' : 'red'}
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

          <div className={styles.timePickerSection}>
            <RangePicker
              value={selectedTimeRange}
              onChange={handleTimeRangeChange}
              format="HH:mm"
              picker="time"
              size="large"
              style={{ width: '100%', maxWidth: 400 }}
              disabledHours={() => []}
              disabledMinutes={() => []}
            />
          </div>

          {availableTimeSlots.length > 0 && (
            <div className={styles.quickSlots}>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                Quick Select (Available Slots):
              </Text>
              <Space wrap>
                {availableTimeSlots.map((slot, idx) => (
                  <Button
                    key={idx}
                    type={
                      selectedTimeRange?.[0]?.format('HH:mm') === slot.start
                        ? 'primary'
                        : 'default'
                    }
                    disabled={!slot.available}
                    onClick={() => {
                      if (slot.available) {
                        handleTimeRangeChange([
                          dayjs(slot.start, 'HH:mm'),
                          dayjs(slot.end, 'HH:mm'),
                        ]);
                      }
                    }}
                    className={styles.slotButton}
                  >
                    {slot.start} - {slot.end}
                    {!slot.available && (
                      <Tag color="red" style={{ marginLeft: 4 }}>
                        Booked
                      </Tag>
                    )}
                  </Button>
                ))}
              </Space>
            </div>
          )}

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
      )}

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
