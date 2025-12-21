import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Button,
  Space,
  Tag,
  Typography,
  Spin,
  message,
  Popconfirm,
  Tooltip,
  Modal,
  Checkbox,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getDaySlots,
  getSlotsByDateRange,
  bulkUpdateSlots,
  bulkUpdateSlotsForDateRange,
  updateSlotStatus,
  createOrUpdateSlot,
} from '../../../services/specialistService';
import styles from './MySlotsPage.module.css';

const { Title, Text } = Typography;

// Slot status colors
const SLOT_STATUS_COLORS = {
  UNAVAILABLE: 'default',
  AVAILABLE: 'success',
  HOLD: 'warning',
  BOOKED: 'error',
};

const SLOT_STATUS_LABELS = {
  UNAVAILABLE: 'Not available',
  AVAILABLE: 'Available',
  HOLD: 'Hold',
  BOOKED: 'Booked',
};

// Grid slots: 08:00, 10:00, 12:00, 14:00, 16:00
const SLOT_TIMES = [
  { start: '08:00', end: '10:00' },
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '14:00', end: '16:00' },
  { start: '16:00', end: '18:00' },
];

const MySlotsPage = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [daySlots, setDaySlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]); // Array of startTime strings
  const [open7DaysModal, setOpen7DaysModal] = useState(false);
  const [selectedSlotsFor7Days, setSelectedSlotsFor7Days] = useState(
    SLOT_TIMES.map(s => s.start)
  ); // Default: select all slots
  const [monthSlots, setMonthSlots] = useState({}); // Map date -> count of AVAILABLE slots

  // Load slots for selected date
  const loadDaySlots = async date => {
    setLoading(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const response = await getDaySlots(dateStr);
      if (response.data) {
        const slots = response.data.slots;
        setDaySlots(slots);
      }
    } catch (error) {
      message.error(
        error.message || 'Lỗi khi tải slots. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDaySlots(selectedDate);
    // Load month slots on mount
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    loadMonthSlots(startOfMonth, endOfMonth);
  }, [selectedDate]);

  // Load slots for current month when calendar month changes
  const loadMonthSlots = async (startDate, endDate) => {
    try {
      const response = await getSlotsByDateRange(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      if (response?.data) {
        // Process slots data: group by date and count AVAILABLE slots
        const slotsMap = {};
        response.data.forEach(daySlot => {
          if (daySlot.slots) {
            const availableCount = daySlot.slots.filter(
              slot => slot.slotStatus === 'AVAILABLE'
            ).length;
            slotsMap[daySlot.date] = availableCount;
          }
        });
        setMonthSlots(slotsMap);
      }
    } catch (error) {
      // Silent fail for month slots loading
      console.error('Error loading month slots:', error);
    }
  };

  // Load slots when calendar month changes
  const onCalendarPanelChange = (date) => {
    const startOfMonth = date.startOf('month');
    const endOfMonth = date.endOf('month');
    loadMonthSlots(startOfMonth, endOfMonth);
  };

  // Handle date change
  const onDateChange = date => {
    setSelectedDate(date);
    setSelectedSlots([]); // Clear selection when changing date
  };

  // Toggle slot selection
  const toggleSlotSelection = startTime => {
    setSelectedSlots(prev => {
      if (prev.includes(startTime)) {
        return prev.filter(t => t !== startTime);
      } else {
        return [...prev, startTime];
      }
    });
  };

  // Get slot by startTime
  // Normalize time format for comparison (handle both "08:00" and "08:00:00")
  const getSlotByStartTime = startTime => {
    return daySlots.find(slot => {
      if (!slot.startTime) return false;
      // Normalize both times to HH:mm format for comparison
      const slotTime = slot.startTime.substring(0, 5); // "08:00:00" -> "08:00"
      const searchTime = startTime.substring(0, 5); // "08:00" -> "08:00"
      return slotTime === searchTime;
    });
  };

  // Handle bulk update slots (toggle AVAILABLE/UNAVAILABLE)
  const handleBulkUpdate = async newStatus => {
    if (selectedSlots.length === 0) {
      message.warning('Vui lòng chọn ít nhất một slot');
      return;
    }

    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const startTimes = selectedSlots.map(time => {
        // Convert "08:00" to LocalTime format
        return time;
      });

      await bulkUpdateSlots({
        slotDate: dateStr,
        startTimes: startTimes,
        slotStatus: newStatus,
        isRecurring: false,
      });

      message.success(
        `Đã cập nhật ${selectedSlots.length} slot thành ${SLOT_STATUS_LABELS[newStatus]}`
      );
      setSelectedSlots([]);
      await loadDaySlots(selectedDate);
      // Reload month slots to update calendar display
      const startOfMonth = selectedDate.startOf('month');
      const endOfMonth = selectedDate.endOf('month');
      await loadMonthSlots(startOfMonth, endOfMonth);
    } catch (error) {
      message.error(
        error.message || 'Lỗi khi cập nhật slots. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle single slot toggle (click on slot card)
  const handleSlotToggle = async slot => {
    if (!slot.slotId) {
      // Slot chưa tồn tại, tạo mới với status AVAILABLE
      setLoading(true);
      try {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        await createOrUpdateSlot({
          slotDate: dateStr,
          startTime: slot.startTime,
          slotStatus: 'AVAILABLE',
          isRecurring: false,
        });
        message.success('Đã mở slot');
        await loadDaySlots(selectedDate);
        // Reload month slots to update calendar display
        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        await loadMonthSlots(startOfMonth, endOfMonth);
      } catch (error) {
        message.error(error.message || 'Lỗi khi mở slot');
      } finally {
        setLoading(false);
      }
    } else {
      // Slot đã tồn tại, toggle AVAILABLE/UNAVAILABLE
      const newStatus =
        slot.slotStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
      setLoading(true);
      try {
        await updateSlotStatus(slot.slotId, newStatus);
        message.success(
          `Đã ${newStatus === 'AVAILABLE' ? 'mở' : 'đóng'} slot`
        );
        await loadDaySlots(selectedDate);
        // Reload month slots to update calendar display
        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        await loadMonthSlots(startOfMonth, endOfMonth);
      } catch (error) {
        message.error(error.message || 'Lỗi khi cập nhật slot');
      } finally {
        setLoading(false);
      }
    }
  };

  // Select all slots
  const selectAllSlots = () => {
    const allStartTimes = SLOT_TIMES.map(s => s.start);
    setSelectedSlots(allStartTimes);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSlots([]);
  };

  // Check if slot is selected
  const isSlotSelected = startTime => {
    return selectedSlots.includes(startTime);
  };

  // Handle open slots for 7 days
  const handleOpen7Days = async () => {
    if (selectedSlotsFor7Days.length === 0) {
      message.warning('Vui lòng chọn ít nhất một slot');
      return;
    }

    setLoading(true);
    try {
      const startDate = selectedDate;
      const endDate = startDate.clone().add(6, 'day');

      // Sử dụng API mới để bulk update nhiều ngày cùng lúc (nhanh hơn nhiều)
      const response = await bulkUpdateSlotsForDateRange({
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        startTimes: selectedSlotsFor7Days,
        slotStatus: 'AVAILABLE',
        isRecurring: false,
      });

      const updatedCount = response?.data?.length || 0;
      message.success(
        `Đã mở ${selectedSlotsFor7Days.length} slot(s) cho 7 ngày thành công (${updatedCount} slots đã được cập nhật)`
      );

      setOpen7DaysModal(false);
      await loadDaySlots(selectedDate);
      // Reload month slots to update calendar display
      const startOfMonth = selectedDate.startOf('month');
      const endOfMonth = selectedDate.endOf('month');
      await loadMonthSlots(startOfMonth, endOfMonth);
    } catch (error) {
      message.error(
        error.message || 'Lỗi khi mở slots cho 7 ngày. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle slot selection for 7 days
  const toggleSlotFor7Days = startTime => {
    setSelectedSlotsFor7Days(prev => {
      if (prev.includes(startTime)) {
        return prev.filter(t => t !== startTime);
      } else {
        return [...prev, startTime];
      }
    });
  };

  // Custom date cell renderer to show number of available slots
  const dateCellRender = date => {
    const dateKey = date.format('YYYY-MM-DD');
    const availableCount = monthSlots[dateKey] || 0;
    
    if (availableCount > 0) {
      return (
        <div className={styles.dateSlotInfo}>
          <Tag color="success" size="small">
            {availableCount} slots
          </Tag>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>
          <CalendarOutlined /> Quản lý Work Slots
        </Title>
        <Text type="secondary">
          Chọn ngày và quản lý các slot thời gian làm việc của bạn
        </Text>
      </div>

      <Card className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <Calendar
            value={selectedDate}
            onChange={onDateChange}
            onPanelChange={onCalendarPanelChange}
            dateCellRender={dateCellRender}
            fullscreen={false}
            className={styles.calendar}
            disabledDate={date => date.isBefore(dayjs(), 'day')}
          />
          <div className={styles.quickActions}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={() => setOpen7DaysModal(true)}
            >
              Mở slots cho 7 ngày
            </Button>
          </div>
        </div>
      </Card>

      <Card
        className={styles.slotsCard}
        title={
          <Space>
            <Text strong>
              Slots ngày {selectedDate.format('DD/MM/YYYY')}
            </Text>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadDaySlots(selectedDate)}
              loading={loading}
              size="small"
            >
              Làm mới
            </Button>
          </Space>
        }
        extra={
          selectedSlots.length > 0 && (
            <Space>
              <Text type="secondary">
                Đã chọn: {selectedSlots.length} slot
              </Text>
              <Button size="small" onClick={clearSelection}>
                Bỏ chọn
              </Button>
            </Space>
          )
        }
      >
        <Spin spinning={loading}>
          <div className={styles.slotsGrid}>
            {SLOT_TIMES.map(({ start, end }) => {
              const slot = getSlotByStartTime(start);
              // Handle both camelCase and snake_case field names
              const status = slot?.slotStatus || slot?.slot_status || 'UNAVAILABLE';
              const isSelected = isSlotSelected(start);
              const isBooked = status === 'BOOKED';
              const isHold = status === 'HOLD';

              return (
                <Card
                  key={start}
                  className={`${styles.slotCard} ${
                    isSelected ? styles.slotCardSelected : ''
                  } ${styles[`slotCard${status}`]}`}
                  hoverable={!isBooked && !isHold}
                  onClick={() => {
                    if (!isBooked && !isHold) {
                      toggleSlotSelection(start);
                    }
                  }}
                  actions={[
                    <Tooltip
                      key="toggle"
                      title={
                        isBooked
                          ? 'Slot đã được book'
                          : isHold
                          ? 'Slot đang được giữ'
                          : slot?.slotId
                          ? 'Click để toggle AVAILABLE/UNAVAILABLE'
                          : 'Click để mở slot'
                      }
                    >
                      <Button
                        type="text"
                        icon={
                          status === 'AVAILABLE' ? (
                            <CheckOutlined />
                          ) : (
                            <CloseOutlined />
                          )
                        }
                        onClick={e => {
                          e.stopPropagation();
                          if (!isBooked && !isHold) {
                            handleSlotToggle(slot || { startTime: start });
                          }
                        }}
                        disabled={isBooked || isHold}
                      >
                        {slot?.slotId
                          ? status === 'AVAILABLE'
                            ? 'Đóng'
                            : 'Mở'
                          : 'Mở slot'}
                      </Button>
                    </Tooltip>,
                  ]}
                >
                  <div className={styles.slotContent}>
                    <div className={styles.slotTime}>
                      <Text strong>{start}</Text>
                      <Text type="secondary"> - </Text>
                      <Text strong>{end}</Text>
                    </div>
                    <Tag color={SLOT_STATUS_COLORS[status]}>
                      {SLOT_STATUS_LABELS[status]}
                    </Tag>
                    {isSelected && (
                      <Tag color="blue" className={styles.selectedTag}>
                        Đã chọn
                      </Tag>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {selectedSlots.length > 0 && (
            <div className={styles.bulkActions}>
              <Space>
                <Button onClick={selectAllSlots}>Chọn tất cả</Button>
                <Button onClick={clearSelection}>Bỏ chọn tất cả</Button>
                <Popconfirm
                  title="Xác nhận mở các slots đã chọn?"
                  onConfirm={() => handleBulkUpdate('AVAILABLE')}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button type="primary" icon={<CheckOutlined />}>
                    Mở {selectedSlots.length} slot đã chọn
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Xác nhận đóng các slots đã chọn?"
                  onConfirm={() => handleBulkUpdate('UNAVAILABLE')}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button danger icon={<CloseOutlined />}>
                    Đóng {selectedSlots.length} slot đã chọn
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )}
        </Spin>
      </Card>

      {/* Modal for selecting slots for 7 days */}
      <Modal
        title="Chọn slots để mở cho 7 ngày"
        open={open7DaysModal}
        onOk={handleOpen7Days}
        onCancel={() => {
          if (!loading) {
            setOpen7DaysModal(false);
          }
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        width={500}
        confirmLoading={loading}
        okButtonProps={{ loading: loading }}
      >
        <Spin spinning={loading} tip="Đang mở slots cho 7 ngày...">
          <div className={styles.slotsSelection}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Chọn các slots bạn muốn mở từ ngày{' '}
              {selectedDate.format('DD/MM/YYYY')} đến{' '}
              {selectedDate.clone().add(6, 'day').format('DD/MM/YYYY')}:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              {SLOT_TIMES.map(({ start, end }) => {
                const isSelected = selectedSlotsFor7Days.includes(start);
                return (
                  <Checkbox
                    key={start}
                    checked={isSelected}
                    onChange={() => toggleSlotFor7Days(start)}
                    disabled={loading}
                  >
                    <Text strong>
                      {start} - {end}
                    </Text>
                  </Checkbox>
                );
              })}
            </Space>
            <div style={{ marginTop: 16 }}>
              <Button
                size="small"
                onClick={() => {
                  setSelectedSlotsFor7Days(SLOT_TIMES.map(s => s.start));
                }}
                disabled={loading}
              >
                Chọn tất cả
              </Button>
              <Button
                size="small"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setSelectedSlotsFor7Days([]);
                }}
                disabled={loading}
              >
                Bỏ chọn tất cả
              </Button>
            </div>
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default MySlotsPage;

