import React, { useState, useEffect } from 'react';
import {
  Select,
  Spin,
  Empty,
  Tag,
  Card,
  message,
  Button,
  Pagination,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './MyRequestsPage.module.css';
import Header from '../../../components/common/Header/Header';
import { getMyRequests } from '../../../services/serviceRequestService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { formatPrice } from '../../../services/pricingMatrixService';
import { Space } from 'antd';
import { useDocumentTitle } from '../../../hooks';

const { Option } = Select;

const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording',
  recording: 'Recording',
};

const MyRequestsContent = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [bookings, setBookings] = useState({}); // Map requestId -> booking data
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Load requests với phân trang
  const loadRequests = async (
    status = '',
    requestType = '',
    page = 0,
    size = 10
  ) => {
    try {
      setLoading(true);

      // Xử lý 2 case pending đặc biệt ở client-side
      const isPendingNoManager = status === 'pending_no_manager';
      const isPendingHasManager = status === 'pending_has_manager';

      // Build filters object
      const filters = {
        page: page,
        size: size,
        sort: 'createdAt,desc',
      };

      // Chỉ thêm status nếu có giá trị (không phải empty string)
      if (isPendingNoManager || isPendingHasManager) {
        filters.status = 'pending';
      } else if (status && status.trim() !== '') {
        filters.status = status;
      }

      // Thêm requestType nếu có giá trị
      if (requestType && requestType.trim() !== '') {
        filters.requestType = requestType;
      }

      const response = await getMyRequests(filters);

      if (response && response.status === 'success') {
        // API trả về Page object hoặc array trực tiếp
        const pageData = response.data;
        console.log('pageData', pageData);
        // Kiểm tra xem pageData là array hay Page object
        let data = [];
        let paginationInfo = {
          current: 1,
          pageSize: size,
          total: 0,
        };

        if (Array.isArray(pageData)) {
          // Nếu là array trực tiếp (Spring có thể serialize Page thành array)
          data = pageData;
          paginationInfo = {
            current: 1,
            pageSize: size,
            total: pageData.length,
          };
        } else if (pageData && typeof pageData === 'object') {
          // Nếu là Page object với structure {content: [...], number: 0, size: 10, ...}
          data = pageData.content || [];
          paginationInfo = {
            current: (pageData.number || 0) + 1, // Spring Data page starts from 0
            pageSize: pageData.size || size,
            total: pageData.totalElements || 0,
          };
        }

        // Filter client-side cho 2 case đặc biệt (chỉ áp dụng cho trang hiện tại)
        if (isPendingNoManager) {
          data = data.filter(r => !r.managerUserId);
        } else if (isPendingHasManager) {
          data = data.filter(r => !!r.managerUserId);
        }

        setRequests(data);
        setPagination(paginationInfo);

        // Clear bookings cũ và load bookings mới cho recording requests
        setBookings({});
        const recordingRequests = data.filter(r => r.requestType === 'recording');
        if (recordingRequests.length > 0) {
          loadBookings(recordingRequests.map(r => r.requestId));
        }
      } else {
        message.error('Không thể tải danh sách requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      message.error(error.message || 'Lỗi khi tải danh sách requests');
    } finally {
      setLoading(false);
    }
  };

  // Load bookings cho recording requests
  const loadBookings = async (requestIds) => {
    if (!requestIds || requestIds.length === 0) return;
    
    try {
      setLoadingBookings(true);
      const bookingPromises = requestIds.map(async (requestId) => {
        try {
          const response = await getBookingByRequestId(requestId);
          if (response.status === 'success' && response.data) {
            return { requestId, booking: response.data };
          }
        } catch (error) {
          // Không hiển thị error vì booking có thể chưa tồn tại
          console.log(`No booking found for requestId: ${requestId}`);
        }
        return null;
      });

      const results = await Promise.all(bookingPromises);
      const bookingsMap = {};
      results.forEach(result => {
        if (result && result.booking) {
          bookingsMap[result.requestId] = result.booking;
        }
      });
      setBookings(bookingsMap);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Load data khi component mount lần đầu
  useEffect(() => {
    loadRequests(selectedStatus, selectedServiceType, 0, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount

  // Load data khi filter thay đổi
  useEffect(() => {
    if (selectedStatus !== undefined || selectedServiceType !== undefined) {
      // Reset về trang 1 khi filter thay đổi
      loadRequests(selectedStatus, selectedServiceType, 0, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedServiceType]); // Chạy khi selectedStatus hoặc selectedServiceType thay đổi

  const handleStatusChange = value => {
    setSelectedStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleServiceTypeChange = value => {
    setSelectedServiceType(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page, pageSize) => {
    loadRequests(selectedStatus, selectedServiceType, page - 1, pageSize); // Spring Data page starts from 0
  };

  const getStatusConfig = (status, hasManager) => {
    const configs = {
      pending: {
        color: hasManager ? 'gold' : 'default',
        icon: hasManager ? (
          <ClockCircleOutlined />
        ) : (
          <ExclamationCircleOutlined />
        ),
        text: hasManager ? 'Assigned - pending' : 'Waiting for manager',
        description: hasManager
          ? 'Manager đang chuẩn bị hợp đồng.'
          : 'Đang chờ manager nhận request.',
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Contract sent',
        description: 'Hợp đồng đã được gửi cho bạn.',
      },
      contract_approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Đã duyệt hợp đồng - Chờ ký',
        description: 'Bạn đã duyệt nội dung, vui lòng hoàn tất e-sign.',
      },
      contract_signed: {
        color: 'geekblue',
        icon: <FileTextOutlined />,
        text: 'Contract signed',
        description: 'Hợp đồng đã ký, chờ thanh toán deposit.',
      },
      awaiting_assignment: {
        color: 'gold',
        icon: <ClockCircleOutlined />,
        text: 'Awaiting assignment',
        description:
          'Bạn đã thanh toán deposit. Chờ manager gán task và bấm Start Work để bắt đầu thực hiện.',
      },
      in_progress: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: 'In progress',
        description: 'Dịch vụ đang được thực hiện.',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Completed',
        description: 'Request đã hoàn thành.',
      },
      cancelled: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: 'Cancelled',
        description: 'Request đã bị hủy.',
      },
      rejected: {
        color: 'error',
        icon: <ExclamationCircleOutlined />,
        text: 'Rejected',
        description: 'Request đã bị từ chối.',
      },
    };
    return (
      configs[status] || {
        color: 'default',
        icon: null,
        text: status,
        description: 'Trạng thái hiện tại của request.',
      }
    );
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBookingDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className={styles.myRequestsContentWrapper}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>My Requests</h1>
        <p className={styles.pageDescription}>Manage your service requests</p>
      </div>

      <div className={styles.filterSection}>
        <Space size="large">
          <div>
            <label className={styles.filterLabel}>Filter by status:</label>
            <Select
              style={{ width: 280, marginLeft: 8 }}
              placeholder="All status"
              value={selectedStatus || undefined}
              onChange={handleStatusChange}
              allowClear
            >
              <Option value="">All</Option>
              <Option value="pending_no_manager">Waiting for manager</Option>
              <Option value="pending_has_manager">Assigned - pending</Option>
              <Option value="contract_sent">Contract sent</Option>
              <Option value="contract_approved">
                Contract approved - awaiting signature
              </Option>
              <Option value="contract_signed">Contract signed</Option>
              <Option value="awaiting_assignment">Awaiting assignment</Option>
              <Option value="in_progress">In progress</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </div>
          <div>
            <label className={styles.filterLabel}>Filter by service:</label>
            <Select
              style={{ width: 200, marginLeft: 8 }}
              placeholder="All services"
              value={selectedServiceType || undefined}
              onChange={handleServiceTypeChange}
              allowClear
            >
              <Option value="">All</Option>
              <Option value="transcription">Transcription</Option>
              <Option value="arrangement">Arrangement</Option>
              <Option value="arrangement_with_recording">
                Arrangement + Recording
              </Option>
              <Option value="recording">Recording</Option>
            </Select>
          </div>
        </Space>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      ) : requests.length === 0 ? (
        <Empty description="No requests" className={styles.emptyState} />
      ) : (
        <>
          <div className={styles.requestsList}>
            {requests.map(request => {
              const statusConfig = getStatusConfig(
                request.status,
                !!request.managerUserId
              );
              return (
                <Card
                  key={request.requestId}
                  className={styles.requestCard}
                  hoverable
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.titleSection}>
                      <h3 className={styles.requestTitle}>{request.title}</h3>
                      <Tag color="blue" className={styles.typeTag}>
                        {REQUEST_TYPE_LABELS[request.requestType] ||
                          request.requestType}
                      </Tag>
                    </div>
                    <Tag
                      color={statusConfig.color}
                      icon={statusConfig.icon}
                      className={styles.statusTag}
                      style={{
                        whiteSpace: 'normal',
                        lineHeight: 1.3,
                        textAlign: 'center',
                        minWidth: 0,
                      }}
                    >
                      {statusConfig.text}
                    </Tag>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Description:</span>
                      <span className={styles.infoValue}>
                        {request.description || 'No description'}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Contact:</span>
                      <span className={styles.infoValue}>
                        {request.contactName} - {request.contactPhone}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>
                        {request.contactEmail}
                      </span>
                    </div>

                    {request.tempoPercentage && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Tempo:</span>
                        <span className={styles.infoValue}>
                          {request.tempoPercentage}%
                        </span>
                      </div>
                    )}

                    {request.externalGuestCount > 0 && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Guests:</span>
                        <span className={styles.infoValue}>
                          {request.externalGuestCount}{' '}
                          {request.externalGuestCount === 1
                            ? 'person'
                            : 'people'}
                        </span>
                      </div>
                    )}

                    {/* Hiển thị genres và purpose cho arrangement requests */}
                    {(request.requestType === 'arrangement' ||
                      request.requestType === 'arrangement_with_recording') &&
                      request.genres &&
                      request.genres.length > 0 && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Genres:</span>
                          <span className={styles.infoValue}>
                            <Space wrap>
                              {request.genres.map((genre, idx) => (
                                <Tag key={idx} color="purple">
                                  {getGenreLabel(genre)}
                                </Tag>
                              ))}
                            </Space>
                          </span>
                        </div>
                      )}

                    {(request.requestType === 'arrangement' ||
                      request.requestType === 'arrangement_with_recording') &&
                      request.purpose && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Purpose:</span>
                          <span className={styles.infoValue}>
                            {getPurposeLabel(request.purpose)}
                          </span>
                        </div>
                      )}

                    { request.requestType !== 'recording' && request.totalPrice && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Total Price:</span>
                        <span
                          className={styles.infoValue}
                          style={{
                            fontWeight: 600,
                            color: '#52c41a',
                            fontSize: '16px',
                          }}
                        >
                          {formatPrice(
                            request.totalPrice,
                            request.currency || 'VND'
                          )}
                        </span>
                      </div>
                    )}

                    {/* Hiển thị thông tin booking cơ bản cho recording requests */}
                    {request.requestType === 'recording' && bookings[request.requestId] && (
                      <>
                        {bookings[request.requestId].bookingDate && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>📅 Date:</span>
                            <span className={styles.infoValue}>
                              {formatBookingDate(bookings[request.requestId].bookingDate)}
                            </span>
                          </div>
                        )}
                        {bookings[request.requestId].startTime && bookings[request.requestId].endTime && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>🕒 Time Slot:</span>
                            <span className={styles.infoValue}>
                              {bookings[request.requestId].startTime} - {bookings[request.requestId].endTime}
                            </span>
                          </div>
                        )}
                        {bookings[request.requestId].totalCost !== undefined && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>💰 Total Cost:</span>
                            <span
                              className={styles.infoValue}
                              style={{
                                fontWeight: 600,
                                color: '#ff4d4f',
                                fontSize: '16px',
                              }}
                            >
                              {bookings[request.requestId].totalCost?.toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.dateInfo}>
                      <ClockCircleOutlined /> Created:{' '}
                      {formatDate(request.createdAt)}
                    </div>
                    <div className={styles.dateInfo}>
                      Updated: {formatDate(request.updatedAt)}
                    </div>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() =>
                        navigate(`/my-requests/${request.requestId}`)
                      }
                      className={styles.viewDetailBtn}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {pagination.total > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger
                showTotal={total => `Total ${total} requests`}
                onChange={handlePageChange}
                onShowSizeChange={(current, size) => {
                  handlePageChange(1, size);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MyRequestsPage = () => {
  useDocumentTitle('My Requests');

  return (
    <>
      <Header />
      <div style={{ paddingTop: '100px' }}>
        <MyRequestsContent />
      </div>
    </>
  );
};

export default MyRequestsPage;
