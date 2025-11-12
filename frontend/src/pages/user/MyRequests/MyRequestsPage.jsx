import React, { useState, useEffect } from 'react';
import { Select, Spin, Empty, Tag, Card, message, Button } from 'antd';
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
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import { getMyRequests } from '../../../services/serviceRequestService';

const { Option } = Select;

const MyRequestsContent = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  // Load requests
  const loadRequests = async (status = '') => {
    try {
      setLoading(true);

      // Xử lý 2 case pending đặc biệt ở client-side
      const isPendingNoManager = status === 'pending_no_manager';
      const isPendingHasManager = status === 'pending_has_manager';

      const filters = (isPendingNoManager || isPendingHasManager)
        ? { status: 'pending' }
        : (status ? { status } : {});

      const response = await getMyRequests(filters);
      if (response.status === 'success') {
        let data = response.data || [];
        if (isPendingNoManager) {
          data = data.filter(r => !r.managerUserId);
        } else if (isPendingHasManager) {
          data = data.filter(r => !!r.managerUserId);
        }
        // Sort newest first by createdAt
        data = data.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRequests(data);
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

  useEffect(() => {
    loadRequests(selectedStatus);
  }, [selectedStatus]);

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
  };

  const getStatusConfig = (status, hasManager) => {
    const configs = {
      pending: {
        color: hasManager ? 'gold' : 'default',
        icon: hasManager ? <ClockCircleOutlined /> : <ExclamationCircleOutlined />,
        text: hasManager ? 'Đã gán - chờ xử lý' : 'Chờ manager nhận',
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Đã gửi hợp đồng',
      },
      contract_approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Đã duyệt hợp đồng - Chờ ký',
      },
      contract_signed: {
        color: 'geekblue',
        icon: <FileTextOutlined />,
        text: 'Đã ký hợp đồng',
      },
      in_progress: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: 'Đang thực hiện',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Hoàn thành',
      },
      cancelled: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: 'Đã hủy',
      },
      rejected: {
        color: 'error',
        icon: <ExclamationCircleOutlined />,
        text: 'Bị từ chối',
      },
    };
    return configs[status] || { color: 'default', icon: null, text: status };
  };

  const getRequestTypeText = (type) => {
    const types = {
      transcription: 'Phiên âm',
      arrangement: 'Biên soạn',
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
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

  return (
    <div className={styles.myRequestsContentWrapper}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>My Requests</h1>
        <p className={styles.pageDescription}>
          Quản lý các yêu cầu dịch vụ của bạn
        </p>
      </div>

      <div className={styles.filterSection}>
        <label className={styles.filterLabel}>Lọc theo trạng thái:</label>
        <Select
          style={{ width: 280 }}
          placeholder="Tất cả trạng thái"
          value={selectedStatus || undefined}
          onChange={handleStatusChange}
          allowClear
        >
          <Option value="">Tất cả</Option>
          <Option value="pending_no_manager">Chờ manager nhận</Option>
          <Option value="pending_has_manager">Đã gán - chờ xử lý</Option>
          <Option value="contract_sent">Đã gửi hợp đồng</Option>
          <Option value="contract_approved">Đã duyệt hợp đồng - Chờ ký</Option>
          <Option value="contract_signed">Đã ký hợp đồng</Option>
          <Option value="in_progress">Đang thực hiện</Option>
          <Option value="completed">Hoàn thành</Option>
          <Option value="cancelled">Đã hủy</Option>
          <Option value="rejected">Bị từ chối</Option>
        </Select>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Đang tải...</p>
        </div>
      ) : requests.length === 0 ? (
        <Empty 
          description="Không có requests nào"
          className={styles.emptyState}
        />
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => {
            const statusConfig = getStatusConfig(request.status, !!request.managerUserId);
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
                      {request.requestType === 'transcription' ? 'Phiên âm' : 'Biên soạn'}
                    </Tag>
                  </div>
                  <Tag 
                    color={statusConfig.color} 
                    icon={statusConfig.icon}
                    className={styles.statusTag}
                  >
                    {statusConfig.text}
                  </Tag>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Mô tả:</span>
                    <span className={styles.infoValue}>
                      {request.description || 'Không có mô tả'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Liên hệ:</span>
                    <span className={styles.infoValue}>
                      {request.contactName} - {request.contactPhone}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{request.contactEmail}</span>
                  </div>

                  {request.tempoPercentage && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Tempo:</span>
                      <span className={styles.infoValue}>{request.tempoPercentage}%</span>
                    </div>
                  )}

                  {request.externalGuestCount > 0 && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Khách mời:</span>
                      <span className={styles.infoValue}>
                        {request.externalGuestCount} người
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.dateInfo}>
                    <ClockCircleOutlined /> Tạo lúc: {formatDate(request.createdAt)}
                  </div>
                  <div className={styles.dateInfo}>
                    Cập nhật: {formatDate(request.updatedAt)}
                  </div>
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/profile/my-requests/${request.requestId}`)}
                    className={styles.viewDetailBtn}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MyRequestsPage = () => {
  return (
    <ProfileLayout>
      <MyRequestsContent />
    </ProfileLayout>
  );
};

export default MyRequestsPage;

