import React, { useState, useEffect } from 'react';
import { Select, Spin, Empty, Tag, Card, message } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import styles from './MyRequestsPage.module.css';
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import { getMyRequests } from '../../../services/serviceRequestService';

const { Option } = Select;

const MyRequestsContent = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  // Load requests
  const loadRequests = async (status = '') => {
    try {
      setLoading(true);
      const filters = status ? { status } : {};
      const response = await getMyRequests(filters);
      
      if (response.status === 'success') {
        setRequests(response.data || []);
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

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        color: 'orange', 
        icon: <ClockCircleOutlined />, 
        text: 'Chờ xử lý' 
      },
      contract_sent: { 
        color: 'blue', 
        icon: <FileTextOutlined />, 
        text: 'Đã gửi hợp đồng' 
      },
      contract_signed: { 
        color: 'cyan', 
        icon: <FileTextOutlined />, 
        text: 'Đã ký hợp đồng' 
      },
      approved: { 
        color: 'green', 
        icon: <CheckCircleOutlined />, 
        text: 'Đã duyệt' 
      },
      in_progress: { 
        color: 'processing', 
        icon: <SyncOutlined spin />, 
        text: 'Đang xử lý' 
      },
      completed: { 
        color: 'success', 
        icon: <CheckCircleOutlined />, 
        text: 'Hoàn thành' 
      },
      cancelled: { 
        color: 'default', 
        icon: <CloseCircleOutlined />, 
        text: 'Đã hủy' 
      },
      rejected: { 
        color: 'error', 
        icon: <ExclamationCircleOutlined />, 
        text: 'Bị từ chối' 
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
          style={{ width: 250 }}
          placeholder="Tất cả trạng thái"
          value={selectedStatus || undefined}
          onChange={handleStatusChange}
          allowClear
        >
          <Option value="">Tất cả</Option>
          <Option value="pending">Chờ xử lý</Option>
          <Option value="contract_sent">Đã gửi hợp đồng</Option>
          <Option value="contract_signed">Đã ký hợp đồng</Option>
          <Option value="approved">Đã duyệt</Option>
          <Option value="in_progress">Đang xử lý</Option>
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
            const statusConfig = getStatusConfig(request.status);
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
                      {getRequestTypeText(request.requestType)}
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

                  {request.hasVocalist !== undefined && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Ca sĩ:</span>
                      <span className={styles.infoValue}>
                        {request.hasVocalist ? 'Có' : 'Không'}
                      </span>
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
                  <span className={styles.dateInfo}>
                    <ClockCircleOutlined /> Tạo lúc: {formatDate(request.createdAt)}
                  </span>
                  <span className={styles.dateInfo}>
                    Cập nhật: {formatDate(request.updatedAt)}
                  </span>
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

