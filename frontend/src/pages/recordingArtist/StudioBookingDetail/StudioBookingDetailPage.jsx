import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Descriptions,
  Empty,
  Avatar,
} from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getStudioBookingById } from '../../../services/studioBookingService';
import { getSpecialistById } from '../../../services/specialistService';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import styles from './StudioBookingDetailPage.module.css';

const { Title, Text } = Typography;

// Booking Status
const bookingStatusColor = {
  TENTATIVE: 'default',
  PENDING: 'processing',
  CONFIRMED: 'success',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const bookingStatusLabels = {
  TENTATIVE: 'Tạm thời',
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// Session Type Labels
const sessionTypeLabels = {
  ARTIST_ASSISTED: 'Artist Assisted',
  SELF_SERVICE: 'Self Service',
};

const StudioBookingDetailPage = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [artistsInfo, setArtistsInfo] = useState({});
  const [loadingArtists, setLoadingArtists] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    if (booking?.artists && booking.artists.length > 0) {
      loadArtistsInfo();
    }
  }, [booking]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await getStudioBookingById(bookingId);
      if (response?.status === 'success' && response?.data) {
        setBooking(response.data);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết booking');
    } finally {
      setLoading(false);
    }
  };

  const loadArtistsInfo = async () => {
    try {
      setLoadingArtists(true);
      const artistIds = booking.artists
        .map(a => a.specialistId)
        .filter(Boolean);
      const infoPromises = artistIds.map(id =>
        getSpecialistById(id).catch(err => {
          console.warn(`Failed to load specialist ${id}:`, err);
          return null;
        })
      );
      const results = await Promise.all(infoPromises);
      const infoMap = {};
      results.forEach((result, index) => {
        if (result?.status === 'success' && result?.data) {
          infoMap[artistIds[index]] = result.data;
        }
      });
      setArtistsInfo(infoMap);
    } catch (error) {
      console.error('Error loading artists info:', error);
    } finally {
      setLoadingArtists(false);
    }
  };

  const handleCopyBookingId = () => {
    if (booking?.bookingId) {
      navigator.clipboard.writeText(booking.bookingId);
      message.success('Đã copy Booking ID');
    }
  };

  const handleBack = () => {
    navigate('/recording-artist/studio-bookings');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.container}>
        <Empty description="Không tìm thấy booking" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div className={styles.header}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Quay lại
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Studio Booking Detail
              </Title>
            </Space>
            <Button icon={<CopyOutlined />} onClick={handleCopyBookingId}>
              Copy Booking ID
            </Button>
          </div>

          {/* Booking Information */}
          <Descriptions
            title="Thông tin Booking"
            bordered
            column={2}
            size="middle"
          >
            <Descriptions.Item label="Booking ID" span={2}>
              <Space>
                <Text code>{booking.bookingId}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={bookingStatusColor[booking.status]}>
                {bookingStatusLabels[booking.status] || booking.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày booking">
              {booking.bookingDate
                ? dayjs(booking.bookingDate).format('DD/MM/YYYY')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {booking.startTime && booking.endTime
                ? `${booking.startTime} - ${booking.endTime}`
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Studio">
              {booking.studioName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Session Type">
              <Tag color="purple">
                {sessionTypeLabels[booking.sessionType] ||
                  booking.sessionType ||
                  'N/A'}
              </Tag>
            </Descriptions.Item>
            {booking.notes && (
              <Descriptions.Item label="Notes" span={2}>
                {booking.notes}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Artists Information */}
          {booking.artists && booking.artists.length > 0 && (
            <div>
              <Title level={4}>Artists</Title>
              <Spin spinning={loadingArtists}>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: '100%' }}
                >
                  {booking.artists.map((artist, index) => {
                    const specialistInfo = artistsInfo[artist.specialistId];
                    return (
                      <Card key={index} size="small">
                        <Space
                          direction="vertical"
                          size="small"
                          style={{ width: '100%' }}
                        >
                          <Space>
                            <Avatar src={specialistInfo?.avatarUrl} size={40}>
                              {specialistInfo?.fullNameSnapshot?.[0] || 'A'}
                            </Avatar>
                            <div>
                              <div>
                                <Text strong>
                                  {specialistInfo?.fullNameSnapshot || 'N/A'}
                                </Text>
                              </div>
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: '12px' }}
                                >
                                  {specialistInfo?.emailSnapshot || 'N/A'}
                                </Text>
                              </div>
                            </div>
                          </Space>
                          <Space>
                            <Text type="secondary">Role:</Text>
                            <Tag>{artist.role || 'N/A'}</Tag>
                          </Space>
                          {artist.isPrimary && (
                            <Tag color="gold">Primary Artist</Tag>
                          )}
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              </Spin>
            </div>
          )}

          {/* Arrangement Final Files (cho recording milestones) */}
          {booking?.context === 'CONTRACT_RECORDING' &&
            booking?.sourceArrangementSubmission && (
              <div>
                <Title level={4}>Arrangement Final Files</Title>
                <div
                  style={{
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {booking.sourceArrangementSubmission.submissionName}
                      (v{booking.sourceArrangementSubmission.version})
                    </Text>
                    {booking.sourceArrangementSubmission.files &&
                      booking.sourceArrangementSubmission.files.length > 0 && (
                        <Space
                          direction="vertical"
                          size="small"
                          style={{ width: '100%' }}
                        >
                          {booking.sourceArrangementSubmission.files.map(
                            (file, idx) => (
                              <Button
                                key={idx}
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() =>
                                  downloadFileHelper(file.fileId, file.fileName)
                                }
                                style={{ padding: 0, height: 'auto' }}
                              >
                                {file.fileName}
                                {file.fileSize && (
                                  <Text
                                    type="secondary"
                                    style={{ marginLeft: 8, fontSize: '11px' }}
                                  >
                                    ({(file.fileSize / 1024 / 1024).toFixed(2)}{' '}
                                    MB)
                                  </Text>
                                )}
                              </Button>
                            )
                          )}
                        </Space>
                      )}
                  </Space>
                </div>
              </div>
            )}
        </Space>
      </Card>
    </div>
  );
};

export default StudioBookingDetailPage;
