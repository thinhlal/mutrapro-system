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
   Divider,
  Modal,
  Input
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CheckOutlined,
  EditOutlined,
  StopOutlined,
} from '@ant-design/icons';
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import { 
  getContractsByRequestId, 
  approveContract, 
  requestChangeContract, 
  cancelContract 
} from '../../../services/contractService';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import styles from './RequestDetailPage.module.css';

const { TextArea } = Input;

const RequestDetailPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [requestChangeModalVisible, setRequestChangeModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changeReason, setChangeReason] = useState('');
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

  useEffect(() => {
    const loadContracts = async () => {
      if (!requestId) return;
      try {
        setLoadingContracts(true);
        const response = await getContractsByRequestId(requestId);
        if (response.status === 'success' && response.data) {
          setContracts(response.data || []);
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
        // Không hiển thị error nếu chưa có contract
      } finally {
        setLoadingContracts(false);
      }
    };

    loadContracts();
  }, [requestId]);

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

  const getContractStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const colorMap = {
      draft: 'default',
      sent: 'geekblue',
      approved: 'green',
      signed: 'green',
      rejected_by_customer: 'red',
      need_revision: 'orange',
      canceled_by_customer: 'default',
      canceled_by_manager: 'orange',
      expired: 'volcano',
    };
    return colorMap[statusLower] || 'default';
  };

  const getContractStatusText = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const textMap = {
      draft: 'Draft',
      sent: 'Đã gửi',
      approved: 'Đã duyệt',
      signed: 'Đã ký',
      rejected_by_customer: 'Bị từ chối',
      need_revision: 'Cần chỉnh sửa',
      canceled_by_customer: 'Đã hủy',
      canceled_by_manager: 'Đã thu hồi',
      expired: 'Hết hạn',
    };
    return textMap[statusLower] || status;
  };

  const handleApproveContract = async (contractId) => {
    try {
      setActionLoading(true);
      await approveContract(contractId);
      message.success('Đã duyệt contract thành công');
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi duyệt contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!selectedContract || !changeReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu chỉnh sửa');
      return;
    }
    try {
      setActionLoading(true);
      await requestChangeContract(selectedContract.contractId, changeReason);
      message.success('Đã gửi yêu cầu chỉnh sửa contract');
      setRequestChangeModalVisible(false);
      setChangeReason('');
      setSelectedContract(null);
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi yêu cầu chỉnh sửa contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelContract = async (reason) => {
    if (!selectedContract) return;
    try {
      setActionLoading(true);
      await cancelContract(selectedContract.contractId, reason);
      message.success('Đã hủy contract thành công');
      setCancelModalVisible(false);
      setSelectedContract(null);
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi hủy contract');
    } finally {
      setActionLoading(false);
    }
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

        {/* Contracts Section */}
        {loadingContracts ? (
          <Card style={{ marginTop: 16 }}>
            <Spin />
          </Card>
        ) : contracts.length > 0 ? (
          <Card 
            title="Contracts" 
            style={{ marginTop: 16 }}
            extra={
              <Tag color="blue">{contracts.length} contract(s)</Tag>
            }
          >
            {contracts.map((contract) => {
              const currentStatus = contract.status?.toLowerCase();
              const isSent = currentStatus === 'sent';
              const isApproved = currentStatus === 'approved';
              const isCanceled = currentStatus === 'canceled_by_customer';
              const isCanceledByManager = currentStatus === 'canceled_by_manager';
              const isNeedRevision = currentStatus === 'need_revision';
              
              // Contract đã từng được gửi cho customer (check sentToCustomerAt thay vì chỉ check status)
              // Vì khi manager hủy, status sẽ thành canceled_by_manager, nhưng sentToCustomerAt vẫn giữ nguyên
              const wasSentToCustomer = !!contract.sentToCustomerAt;
              
              // Chỉ cho phép customer action khi:
              // - Status hiện tại = SENT (chưa bị hủy)
              // - VÀ không bị manager hủy
              const canCustomerAction = isSent && !isCanceledByManager;

              return (
                <Card
                  key={contract.contractId}
                  type="inner"
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <span>{contract.contractNumber}</span>
                      <Tag color={getContractStatusColor(contract.status)}>
                        {getContractStatusText(contract.status)}
                      </Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      {canCustomerAction && (
                        <>
                          <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleApproveContract(contract.contractId)}
                            loading={actionLoading}
                          >
                            Duyệt
                          </Button>
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => {
                              setSelectedContract(contract);
                              setRequestChangeModalVisible(true);
                            }}
                            loading={actionLoading}
                          >
                            Yêu cầu chỉnh sửa
                          </Button>
                          <Button
                            danger
                            icon={<StopOutlined />}
                            onClick={() => {
                              setSelectedContract(contract);
                              setCancelModalVisible(true);
                            }}
                            loading={actionLoading}
                          >
                            Hủy
                          </Button>
                        </>
                      )}
                      {isCanceledByManager && (
                        <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                          <strong>
                            {wasSentToCustomer 
                              ? 'Đã thu hồi bởi manager (contract đã từng được gửi cho bạn)' 
                              : 'Đã hủy bởi manager'}
                          </strong>
                          {contract.cancellationReason && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Lý do:</strong> {contract.cancellationReason}
                            </div>
                          )}
                          {wasSentToCustomer && contract.sentToCustomerAt && (
                            <div style={{ marginTop: 4, fontSize: '11px', color: '#999' }}>
                              Đã gửi lúc: {formatDate(contract.sentToCustomerAt)}
                            </div>
                          )}
                        </div>
                      )}
                      {isNeedRevision && contract.cancellationReason && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>Lý do:</strong> {contract.cancellationReason}
                        </div>
                      )}
                      {isCanceled && contract.cancellationReason && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>Lý do hủy:</strong> {contract.cancellationReason}
                        </div>
                      )}
                    </Space>
                  }
                >
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Loại contract">
                      {contract.contractType || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giá trị">
                      {contract.totalPrice?.toLocaleString() || 0} {contract.currency || 'VND'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Đặt cọc">
                      {contract.depositAmount?.toLocaleString() || 0} {contract.currency || 'VND'} 
                      ({contract.depositPercent || 0}%)
                    </Descriptions.Item>
                    <Descriptions.Item label="SLA">
                      {contract.slaDays || 0} ngày
                    </Descriptions.Item>
                    {contract.createdAt && (
                      <Descriptions.Item label="Ngày tạo">
                        {formatDate(contract.createdAt)}
                      </Descriptions.Item>
                    )}
                    {contract.expiresAt && (
                      <Descriptions.Item label="Hết hạn">
                        {formatDate(contract.expiresAt)}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              );
            })}
          </Card>
        ) : null}

        {/* Cancel Contract Modal */}
        <CancelContractModal
          visible={cancelModalVisible}
          onCancel={() => {
            setCancelModalVisible(false);
            setSelectedContract(null);
          }}
          onConfirm={handleCancelContract}
          loading={actionLoading}
        />

        {/* Request Change Modal */}
        <Modal
          title="Yêu cầu chỉnh sửa Contract"
          open={requestChangeModalVisible}
          onOk={handleRequestChange}
          onCancel={() => {
            setRequestChangeModalVisible(false);
            setChangeReason('');
            setSelectedContract(null);
          }}
          confirmLoading={actionLoading}
          okText="Gửi yêu cầu"
          cancelText="Đóng"
          width={600}
        >
          <div style={{ marginBottom: 16 }}>
            <p>
              Vui lòng nhập lý do bạn muốn chỉnh sửa contract <strong>{selectedContract?.contractNumber}</strong>
            </p>
          </div>
          <TextArea
            rows={4}
            placeholder="Vui lòng nhập lý do yêu cầu chỉnh sửa (tối thiểu 10 ký tự)..."
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            showCount
            maxLength={500}
          />
        </Modal>
      </div>
    </ProfileLayout>
  );
};

export default RequestDetailPage;

