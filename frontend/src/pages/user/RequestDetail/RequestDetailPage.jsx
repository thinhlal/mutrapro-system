import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Tag, 
  Button, 
  Spin, 
  Empty, 
  message,
  Space,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import styles from './RequestDetailPage.module.css';

const RequestDetailPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const { instruments: instrumentsData, fetchInstruments } = useInstrumentStore();

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        const response = await getServiceRequestById(requestId);
        
        if (response.status === 'success' && response.data) {
          setRequest(response.data);
          console.log('Request data:', response.data);
        } else {
          message.error('Không thể tải chi tiết request');
          navigate('/profile/my-requests');
        }
      } catch (error) {
        console.error('Error loading request:', error);
        message.error(error.message || 'Lỗi khi tải chi tiết request');
        navigate('/profile/my-requests');
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      loadRequest();
    }
  }, [requestId, navigate]);

  const getStatusConfig = (status) => {
    const hasManager = !!request?.managerUserId;
    const configs = {
      pending: {
        color: hasManager ? 'gold' : 'default',
        icon: hasManager ? <ClockCircleOutlined /> : <ExclamationCircleOutlined />,
        text: hasManager ? 'Đã gán - chờ xử lý' : 'Chờ manager nhận',
      },
      approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Đã duyệt - chờ triển khai',
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Đã gửi hợp đồng',
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
      arrangement_with_recording: 'Biên soạn với thu âm',
      recording: 'Thu âm',
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

  const getManagerStatusText = () => {
    if (!request) return '';
    const hasManager = !!request.managerUserId;
    const status = request.status;
    if (hasManager) {
      if (status === 'completed') return 'Hoàn thành';
      if (status === 'cancelled' || status === 'rejected') return 'Đã đóng';
      // pending/approved/... nhưng đã có manager
      return 'Manager đang xử lý';
    }
    // Chưa có manager
    if (status === 'completed') return 'Hoàn thành';
    if (status === 'cancelled' || status === 'rejected') return 'Đã đóng';
    return 'Chưa được gán • Chờ xử lý';
  };

  if (loading) {
    return (
      <ProfileLayout>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Đang tải...</p>
        </div>
      </ProfileLayout>
    );
  }

  if (!request) {
    return (
      <ProfileLayout>
        <Empty description="Không tìm thấy request" />
      </ProfileLayout>
    );
  }

  const statusConfig = getStatusConfig(request.status);

  return (
    <ProfileLayout>
      <div className={styles.detailWrapper}>
        <div className={styles.headerSection}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/profile/my-requests')}
            style={{ marginBottom: '1rem' }}
          >
            Quay lại
          </Button>
          <h1 className={styles.pageTitle}>Chi tiết Request</h1>
        </div>

        <Card className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.requestTitle}>{request.title}</h2>
            <Space>
              <Tag color="blue" className={styles.typeTag}>
                {getRequestTypeText(request.requestType)}
              </Tag>
              <Tag 
                color={statusConfig.color} 
                icon={statusConfig.icon}
                className={styles.statusTag}
              >
                {statusConfig.text}
              </Tag>
            </Space>
          </div>

          <Divider />

          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Request ID">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {request.requestId}
              </span>
            </Descriptions.Item>

            <Descriptions.Item label="Tiêu đề">
              {request.title || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Mô tả">
              {request.description || 'Không có mô tả'}
            </Descriptions.Item>

            <Descriptions.Item label="Tên liên hệ">
              {request.contactName || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Email liên hệ">
              {request.contactEmail || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              {request.contactPhone || 'N/A'}
            </Descriptions.Item>

            {request.durationMinutes && (
              <Descriptions.Item label="Thời lượng">
                <Tag color="green">{request.durationMinutes} phút</Tag>
              </Descriptions.Item>
            )}

            {request.tempoPercentage && request.requestType === 'transcription' && (
              <Descriptions.Item label="Tempo">
                <Tag>{request.tempoPercentage}%</Tag>
              </Descriptions.Item>
            )}

            {request.hasVocalist !== undefined && request.requestType !== 'transcription' && (
              <Descriptions.Item label="Ca sĩ">
                {request.hasVocalist ? (
                  <Tag color="green">Có</Tag>
                ) : (
                  <Tag color="default">Không</Tag>
                )}
              </Descriptions.Item>
            )}

            {request.externalGuestCount > 0 && (
              <Descriptions.Item label="Khách mời">
                <Tag>{request.externalGuestCount} người</Tag>
              </Descriptions.Item>
            )}

            {request.instrumentIds && request.instrumentIds.length > 0 && (
              <Descriptions.Item label="Nhạc cụ">
                <Space wrap>
                  {request.instrumentIds.map((id) => {
                    const inst = instrumentsData.find(i => i.instrumentId === id);
                    return inst ? (
                      <Tag key={id} color="purple">
                        {inst.instrumentName}
                      </Tag>
                    ) : (
                      <Tag key={id} color="default">
                        {id}
                      </Tag>
                    );
                  })}
                </Space>
              </Descriptions.Item>
            )}

            {request.managerInfo ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div><strong>Tên:</strong> {request.managerInfo.fullName || 'N/A'}</div>
                  <div><strong>Email:</strong> {request.managerInfo.email || 'N/A'}</div>
                  {request.managerInfo.phone && (
                    <div><strong>Điện thoại:</strong> {request.managerInfo.phone}</div>
                  )}
                  {request.managerInfo.role && (
                    <div><strong>Vai trò:</strong> {request.managerInfo.role}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <Tag color="processing">{getManagerStatusText()}</Tag>
                  </div>
                </div>
              </Descriptions.Item>
            ) : request.managerUserId ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div><strong>ID:</strong> {request.managerUserId}</div>
                  <div style={{ marginTop: 6 }}>
                    <Tag color="processing">{getManagerStatusText()}</Tag>
                  </div>
                </div>
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Manager">
                <div>
                  <Tag color="default">{getManagerStatusText()}</Tag>
                </div>
              </Descriptions.Item>
            )}

            {request.files && request.files.length > 0 && (
              <Descriptions.Item label="Files đã upload">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {request.files.map((file) => (
                    <div key={file.fileId} style={{ marginBottom: 8 }}>
                      <Tag color="cyan" style={{ marginRight: 8 }}>
                        {file.fileName}
                      </Tag>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                        {file.mimeType && ` • ${file.mimeType}`}
                      </span>
                      {file.filePath && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => window.open(file.filePath, '_blank')}
                          style={{ padding: 0, marginLeft: 8 }}
                        >
                          Xem file
                        </Button>
                      )}
                    </div>
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Thời gian tạo">
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {formatDate(request.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật lần cuối">
              {formatDate(request.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </ProfileLayout>
  );
};

export default RequestDetailPage;

