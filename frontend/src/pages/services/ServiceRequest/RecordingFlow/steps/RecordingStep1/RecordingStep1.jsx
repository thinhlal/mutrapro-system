// RecordingStep1.jsx - Slot Selection (Date & Time)
import { useState, useMemo } from 'react';
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
} from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './RecordingStep1.module.css';

const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

// Mock data - sẽ thay bằng API call thực tế
const MOCK_BOOKINGS = {
  '2024-12-20': [
    { start: '09:00', end: '12:00', status: 'booked' },
    { start: '14:00', end: '17:00', status: 'tentative' },
  ],
  '2024-12-21': [{ start: '10:00', end: '13:00', status: 'booked' }],
  '2024-12-22': [],
};

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

  // Get bookings for selected date
  const dateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.format('YYYY-MM-DD');
    return MOCK_BOOKINGS[dateKey] || [];
  }, [selectedDate]);

  // Check if time slot is available
  const isTimeSlotAvailable = (start, end) => {
    if (!dateBookings.length) return true;

    const slotStart = dayjs(start, 'HH:mm');
    const slotEnd = dayjs(end, 'HH:mm');

    return !dateBookings.some(booking => {
      const bookingStart = dayjs(booking.start, 'HH:mm');
      const bookingEnd = dayjs(booking.end, 'HH:mm');

      // Check for overlap
      return (
        (slotStart.isBefore(bookingEnd) && slotEnd.isAfter(bookingStart)) ||
        (slotStart.isSame(bookingStart) && slotEnd.isSame(bookingEnd))
      );
    });
  };

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const slotDuration = 2; // 2 hours per slot

    for (let hour = startHour; hour <= endHour - slotDuration; hour++) {
      const start = `${hour.toString().padStart(2, '0')}:00`;
      const end = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;

      if (isTimeSlotAvailable(start, end)) {
        slots.push({ start, end, available: true });
      } else {
        slots.push({ start, end, available: false });
      }
    }

    return slots;
  }, [selectedDate, dateBookings]);

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

    if (!isTimeSlotAvailable(startStr, endStr)) {
      message.error('Selected time slot is no longer available');
      return;
    }

    onComplete({
      bookingDate: selectedDate.format('YYYY-MM-DD'),
      bookingStartTime: startStr,
      bookingEndTime: endStr,
    });
  };

  // Custom date cell renderer
  const dateCellRender = date => {
    const dateKey = date.format('YYYY-MM-DD');
    const bookings = MOCK_BOOKINGS[dateKey] || [];
    const isPast = date.isBefore(dayjs(), 'day');
    const isToday = date.isSame(dayjs(), 'day');

    if (isPast && !isToday) {
      return <div className={styles.pastDate}>Past</div>;
    }

    if (bookings.length > 0) {
      const bookedCount = bookings.filter(b => b.status === 'booked').length;
      const tentativeCount = bookings.filter(
        b => b.status === 'tentative'
      ).length;

      return (
        <div className={styles.dateInfo}>
          {bookedCount > 0 && (
            <div className={styles.bookedBadge}>{bookedCount} booked</div>
          )}
          {tentativeCount > 0 && (
            <div className={styles.tentativeBadge}>
              {tentativeCount} tentative
            </div>
          )}
        </div>
      );
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

          {dateBookings.length > 0 && (
            <Alert
              message="Existing Bookings"
              description={
                <div>
                  {dateBookings.map((booking, idx) => (
                    <Tag
                      key={idx}
                      color={booking.status === 'booked' ? 'red' : 'orange'}
                      style={{ marginTop: 4 }}
                    >
                      {booking.start} - {booking.end} ({booking.status})
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
