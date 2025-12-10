import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  DatePicker,
  Select,
  Steps,
  Alert,
  Empty,
  Row,
  Col,
  Radio,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getMilestoneById, getContractById } from '../../../services/contractService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import {
  getAvailableSlots,
  getAvailableArtists,
  createBookingForRecordingMilestone,
} from '../../../services/studioBookingService';
import styles from './StudioBookingPage.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

const StudioBookingPage = () => {
  const { contractId, milestoneId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState(null);
  const [contract, setContract] = useState(null);
  const [request, setRequest] = useState(null);
  const [studio, setStudio] = useState(null); // Tạm thời, sẽ lấy từ API sau

  // Step 1: Chọn Studio + Date
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 2: Chọn time slot
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 3: Chọn artist (chỉ 1 artist)
  const [availableArtists, setAvailableArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [loadingArtists, setLoadingArtists] = useState(false);

  // Step 4: Submit
  const [submitting, setSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

  // Load milestone và contract
  useEffect(() => {
    const loadData = async () => {
      if (!contractId || !milestoneId) return;

      try {
        setLoading(true);
        const [milestoneResponse, contractResponse] = await Promise.all([
          getMilestoneById(contractId, milestoneId),
          getContractById(contractId),
        ]);
        
        if (milestoneResponse?.status === 'success' && milestoneResponse?.data) {
          setMilestone(milestoneResponse.data);
        }

        if (contractResponse?.status === 'success' && contractResponse?.data) {
          setContract(contractResponse.data);
          
          // Load request info nếu có requestId
          if (contractResponse.data.requestId) {
            try {
              const requestResponse = await getServiceRequestById(contractResponse.data.requestId);
              if (requestResponse?.status === 'success' && requestResponse?.data) {
                setRequest(requestResponse.data);
              }
            } catch (error) {
              console.warn('Error loading request info:', error);
              // Không block UI nếu không load được request
            }
          }
        }
      } catch (error) {
        console.error('Error loading milestone:', error);
        message.error('Lỗi khi tải thông tin milestone');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contractId, milestoneId, navigate]);

  // Load available slots khi chọn date
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate) return;

      try {
        setLoadingSlots(true);
        const response = await getAvailableSlots(
          selectedDate.format('YYYY-MM-DD')
        );
        
        if (response?.status === 'success' && response?.data) {
          setAvailableSlots(response.data);
        }
      } catch (error) {
        console.error('Error loading slots:', error);
        message.error('Lỗi khi tải available slots');
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [selectedDate, studio]);

  // Load available artists khi chọn slot
  useEffect(() => {
    const loadArtists = async () => {
      if (!selectedSlot || !selectedDate || !milestoneId) return;

      try {
        setLoadingArtists(true);
        // Truyền genres và preferredSpecialistIds từ request để backend không cần gọi request-service
        const genres = request?.genres || null;
        const preferredSpecialistIds = request?.preferredSpecialists?.map(ps => ps.specialistId) || null;
        const response = await getAvailableArtists(
          milestoneId,
          selectedDate.format('YYYY-MM-DD'),
          selectedSlot.startTime,
          selectedSlot.endTime,
          genres,
          preferredSpecialistIds
        );
        
        if (response?.status === 'success' && response?.data) {
          setAvailableArtists(response.data);
        }
      } catch (error) {
        console.error('Error loading artists:', error);
        message.error('Lỗi khi tải available artists');
      } finally {
        setLoadingArtists(false);
      }
    };

    loadArtists();
  }, [selectedSlot, selectedDate, milestoneId]);

  // Tạm thời: lấy studio từ API (sẽ implement sau)
  useEffect(() => {
    // TODO: Gọi API lấy studio active
    setStudio({ studioId: 'default-studio', studioName: 'MuTraPro Studio' });
  }, []);

  const handleDateChange = date => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSelectedArtist(null);
    setCurrentStep(0);
  };

  const handleSlotSelect = slot => {
    if (!slot.available) {
      message.warning('Slot này đã được book');
      return;
    }
    setSelectedSlot(slot);
    setSelectedArtist(null); // Reset artist khi chọn slot mới
    setCurrentStep(1);
  };

  const handleArtistSelect = (artistId) => {
    const artist = availableArtists.find(a => a.specialistId === artistId);
    if (artist) {
      setSelectedArtist(artist);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || !selectedArtist) {
      message.error('Vui lòng chọn đầy đủ thông tin');
      return;
    }

    try {
      setSubmitting(true);

      const bookingData = {
        milestoneId: milestoneId,
        bookingDate: selectedDate.format('YYYY-MM-DD'),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationHours: dayjs(selectedSlot.endTime, 'HH:mm:ss')
          .diff(dayjs(selectedSlot.startTime, 'HH:mm:ss'), 'hour', true),
        artists: [{
          specialistId: selectedArtist.specialistId,
          role: selectedArtist.role || 'VOCALIST',
          isPrimary: selectedArtist.isPreferred || false,
        }],
      };

      const response = await createBookingForRecordingMilestone(bookingData);

      if (response?.status === 'success') {
        message.success('Tạo booking thành công!');
        navigate(-1); // Quay lại milestone detail
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      message.error(error?.message || 'Lỗi khi tạo booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Không tìm thấy milestone" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          Book Studio cho Recording Milestone
        </Title>
      </div>

      {/* Thông tin Request */}
      {request && (
        <Card title="Thông tin Request" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {request.title && (
              <div>
                <Text strong>Tiêu đề: </Text>
                <Text>{request.title}</Text>
              </div>
            )}
            {request.description && (
              <div>
                <Text strong>Mô tả: </Text>
                <Text>{request.description}</Text>
              </div>
            )}
            {request.genres && request.genres.length > 0 && (
              <div>
                <Text strong>Thể loại: </Text>
                <Space wrap>
                  {request.genres.map((genre, idx) => (
                    <Tag key={idx} color="blue">{genre}</Tag>
                  ))}
                </Space>
              </div>
            )}
            {request.purpose && (
              <div>
                <Text strong>Mục đích: </Text>
                <Text>{request.purpose}</Text>
              </div>
            )}
          </Space>
        </Card>
      )}

      <Card>
        <Steps
          current={currentStep}
          items={[
            {
              title: 'Chọn Studio & Date',
              icon: <CalendarOutlined />,
            },
            {
              title: 'Chọn Time Slot',
              icon: <ClockCircleOutlined />,
            },
            {
              title: 'Chọn Artists',
              icon: <UserOutlined />,
            },
            {
              title: 'Xác nhận',
              icon: <CheckCircleOutlined />,
            },
          ]}
        />
      </Card>

      {/* Step 1: Chọn Studio + Date */}
      <Card title="Bước 1: Chọn Studio & Ngày" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Studio: </Text>
            <Tag>{studio?.studioName || 'MuTraPro Studio'}</Tag>
          </div>
          <div>
            <Text strong>Chọn ngày: </Text>
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              format="DD/MM/YYYY"
              disabledDate={current => {
                if (!current) return false;
                const today = dayjs().startOf('day');
                const tomorrow = today.add(1, 'day');
                
                // Không cho chọn ngày trong quá khứ và hôm nay
                // Chỉ cho chọn từ ngày mai trở đi (cần thời gian chuẩn bị)
                if (current < tomorrow) return true;
                
                // Nếu có milestone, chỉ cho chọn ngày trong milestone timeline
                // Milestone bắt đầu tính SLA từ hôm nay, nhưng chỉ cho book từ ngày mai
                // End date = hôm nay + SLA days (không phải ngày mai + SLA days)
                if (milestone && milestone.milestoneSlaDays) {
                  const milestoneEnd = today.add(milestone.milestoneSlaDays, 'day').endOf('day');
                  
                  return current > milestoneEnd;
                }
                
                return false;
              }}
              style={{ width: 200 }}
            />
            {milestone && milestone.milestoneSlaDays && (() => {
              const today = dayjs().startOf('day');
              const tomorrow = today.add(1, 'day');
              // Milestone bắt đầu tính SLA từ hôm nay, nhưng chỉ cho book từ ngày mai
              // End date = hôm nay + SLA days (không phải ngày mai + SLA days)
              const endDate = today.add(milestone.milestoneSlaDays, 'day');
              
              return (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  (Khoảng: {tomorrow.format('DD/MM/YYYY')} - {endDate.format('DD/MM/YYYY')})
                </Text>
              );
            })()}
          </div>
          {selectedDate && (
            <div>
              <Text strong>Available Slots: </Text>
              {loadingSlots ? (
                <Spin />
              ) : availableSlots.length > 0 ? (
                <Space wrap style={{ marginTop: 8 }}>
                  {availableSlots.map((slot, idx) => (
                    <Button
                      key={idx}
                      type={selectedSlot?.startTime === slot.startTime ? 'primary' : 'default'}
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot.startTime} - {slot.endTime}
                      {!slot.available && <Tag color="red" style={{ marginLeft: 4 }}>Booked</Tag>}
                    </Button>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">Không có slot available</Text>
              )}
            </div>
          )}
        </Space>
      </Card>

      {/* Step 2: Chọn Artists (hiện khi đã chọn slot) */}
      {selectedSlot && (
        <Card title="Bước 2: Chọn Artists" style={{ marginTop: 16 }}>
          {loadingArtists ? (
            <Spin />
          ) : availableArtists.length > 0 ? (
            <Radio.Group
              value={selectedArtist?.specialistId}
              onChange={e => handleArtistSelect(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {availableArtists.map(artist => (
                  <Card
                    key={artist.specialistId}
                    size="small"
                    style={{
                      border: selectedArtist?.specialistId === artist.specialistId
                        ? '2px solid #52c41a'
                        : '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleArtistSelect(artist.specialistId)}
                  >
                    <Row align="middle" justify="space-between">
                      <Col flex="auto">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Space>
                            <Radio value={artist.specialistId} />
                            {artist.avatarUrl && (
                              <img
                                src={artist.avatarUrl}
                                alt={artist.name}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            )}
                            <div>
                              <div>
                                <Text strong>{artist.name}</Text>
                                {artist.isPreferred && (
                                  <Tag color="gold" icon={<StarFilled />} style={{ marginLeft: 8 }}>
                                    Preferred
                                  </Tag>
                                )}
                                <Tag color={artist.isAvailable ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                                  {artist.availabilityStatus === 'available' ? 'Available' : 'Busy'}
                                </Tag>
                              </div>
                              {artist.email && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{artist.email}</Text>
                                </div>
                              )}
                            </div>
                          </Space>
                          <Space wrap>
                            {artist.role && (
                              <Tag color={artist.role === 'VOCALIST' ? 'orange' : 'blue'}>
                                {artist.role === 'VOCALIST'
                                  ? 'Vocal'
                                  : artist.role === 'INSTRUMENT_PLAYER'
                                    ? 'Instrument'
                                    : artist.role}
                              </Tag>
                            )}
                            {artist.experienceYears && (
                              <Tag color="blue">{artist.experienceYears} năm kinh nghiệm</Tag>
                            )}
                            {artist.rating && (
                              <Tag color="orange">
                                <StarFilled /> {artist.rating.toFixed(1)}
                              </Tag>
                            )}
                            {artist.totalProjects && (
                              <Tag color="cyan">{artist.totalProjects} projects</Tag>
                            )}
                            {artist.genres && artist.genres.length > 0 && (
                              <>
                                {artist.genres.map((genre, idx) => (
                                  <Tag key={idx} color="purple">{genre}</Tag>
                                ))}
                              </>
                            )}
                          </Space>
                          {!artist.isAvailable && artist.conflictStartTime && artist.conflictEndTime && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Conflict: {artist.conflictStartTime} - {artist.conflictEndTime}
                            </Text>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </Radio.Group>
          ) : (
            <Empty description="Không có artists available" />
          )}
        </Card>
      )}

      {/* Step 3: Submit */}
      {selectedSlot && selectedArtist && (
        <Card style={{ marginTop: 16 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="Xác nhận thông tin booking"
              description={
                <div>
                  <div>Ngày: {selectedDate?.format('DD/MM/YYYY')}</div>
                  <div>
                    Thời gian: {selectedSlot.startTime} - {selectedSlot.endTime}
                  </div>
                  <div>
                    Artist: {selectedArtist.name}
                  </div>
                </div>
              }
              type="info"
            />
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
              block
            >
              Tạo Booking
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default StudioBookingPage;

