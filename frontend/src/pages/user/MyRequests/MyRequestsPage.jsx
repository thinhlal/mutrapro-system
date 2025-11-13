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

      const filters =
        isPendingNoManager || isPendingHasManager
          ? { status: 'pending' }
          : status
            ? { status }
            : {};

      const response = await getMyRequests(filters);
      if (response.status === 'success') {
        let data = response.data || [];
        if (isPendingNoManager) {
          data = data.filter(r => !r.managerUserId);
        } else if (isPendingHasManager) {
          data = data.filter(r => !!r.managerUserId);
        }
        // Sort newest first by createdAt
        data = data
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  const handleStatusChange = value => {
    setSelectedStatus(value);
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
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Contract sent',
      },
      contract_approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Đã duyệt hợp đồng - Chờ ký',
      },
      contract_signed: {
        color: 'geekblue',
        icon: <FileTextOutlined />,
        text: 'Contract signed',
      },
      in_progress: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: 'In progress',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Completed',
      },
      cancelled: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: 'Cancelled',
      },
      rejected: {
        color: 'error',
        icon: <ExclamationCircleOutlined />,
        text: 'Rejected',
      },
    };
    return configs[status] || { color: 'default', icon: null, text: status };
  };

  const getRequestTypeText = type => {
    const types = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
    };
    return types[type] || type;
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

  return (
    <div className={styles.myRequestsContentWrapper}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>My Requests</h1>
        <p className={styles.pageDescription}>Manage your service requests</p>
      </div>

      <div className={styles.filterSection}>
        <label className={styles.filterLabel}>Filter by status:</label>
        <Select
          style={{ width: 280 }}
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
          <Option value="in_progress">In progress</Option>
          <Option value="completed">Completed</Option>
          <Option value="cancelled">Cancelled</Option>
          <Option value="rejected">Rejected</Option>
        </Select>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      ) : requests.length === 0 ? (
        <Empty description="No requests" className={styles.emptyState} />
      ) : (
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
                      {request.requestType === 'transcription'
                        ? 'Transcription'
                        : 'Arrangement'}
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
                        {request.externalGuestCount === 1 ? 'person' : 'people'}
                      </span>
                    </div>
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
