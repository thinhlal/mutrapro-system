import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getContractsByRequestId } from '../../../services/contractService';
import FileList from '../../../components/common/FileList/FileList';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import styles from './ServiceRequestContracts.module.css';

const { Title, Text, Paragraph } = Typography;

const REQUEST_STATUS_COLORS = {
  pending: 'gold',
  contract_sent: 'geekblue',
  contract_approved: 'purple',
  contract_signed: 'green',
  awaiting_assignment: 'gold',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  rejected: 'red',
};

const REQUEST_STATUS_TEXT = {
  pending: 'Pending',
  contract_sent: 'Contract sent',
  contract_approved: 'Contract approved',
  contract_signed: 'Contract signed',
  awaiting_assignment: 'Awaiting assignment',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording',
  recording: 'Recording',
  bundle: 'Bundle',
};

const CONTRACT_STATUS_COLORS = {
  draft: 'default',
  sent: 'geekblue',
  approved: 'green',
  signed: 'orange',
  active_pending_assignment: 'gold',
  active: 'green',
  completed: 'success',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'orange',
  expired: 'volcano',
};

const CONTRACT_STATUS_TEXT = {
  draft: 'Draft',
  sent: 'Đã gửi',
  approved: 'Đã duyệt',
  signed: 'Đã ký - Chờ thanh toán deposit',
  active_pending_assignment: 'Đã nhận cọc - Chờ gán task',
  active: 'Đang thực thi',
  completed: 'Đã hoàn thành',
  rejected_by_customer: 'Khách từ chối',
  need_revision: 'Cần chỉnh sửa',
  canceled_by_customer: 'Khách hủy',
  canceled_by_manager: 'Manager thu hồi',
  expired: 'Hết hạn',
};

const CONTRACT_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording',
  recording: 'Recording',
  bundle: 'Bundle (T+A+R)',
};

const formatCurrency = (amount, currency = 'VND') => {
  if (amount === null || amount === undefined) return 'N/A';
  const value = Number(amount);
  if (Number.isNaN(value)) return 'N/A';
  return `${value.toLocaleString('vi-VN')} ${currency}`;
};

const formatDateTime = value =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';

export default function ServiceRequestContracts() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(
    location.state?.requestSnapshot || null
  );
  const [contracts, setContracts] = useState([]);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(false);

  const basePath = location.pathname.startsWith('/admin')
    ? '/admin'
    : '/manager';

  const fetchRequest = async () => {
    if (!requestId) {
      message.error('Không tìm thấy requestId trên URL');
      return;
    }
    try {
      setLoadingRequest(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success') {
        setRequest(response.data);
      } else {
        throw new Error(response?.message || 'Không thể tải request');
      }
    } catch (error) {
      console.error('Error fetching request detail:', error);
      message.error(error?.message || 'Không thể tải thông tin request');
    } finally {
      setLoadingRequest(false);
    }
  };

  const fetchContracts = async () => {
    if (!requestId) return;
    try {
      setLoadingContracts(true);
      const response = await getContractsByRequestId(requestId);
      if (response?.status === 'success') {
        setContracts(response.data || []);
      } else {
        throw new Error(
          response?.message || 'Không thể tải danh sách hợp đồng'
        );
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      message.error(error?.message || 'Không thể tải danh sách hợp đồng');
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    fetchRequest();
    fetchContracts();
  }, [requestId]);

  const handleRefresh = () => {
    fetchRequest();
    fetchContracts();
  };

  const handleBack = () => {
    navigate(`${basePath}/service-requests`);
  };

  const handleViewContract = contractId => {
    const basePath = location.pathname.startsWith('/admin')
      ? '/admin'
      : '/manager';
    navigate(`${basePath}/contracts/${contractId}`);
  };

  const contractColumns = [
    {
      title: 'Contract No.',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 200,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{value || record.contractId}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.contractId}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 180,
      render: type => (
        <Tag color="processing">
          {CONTRACT_TYPE_LABELS[type?.toLowerCase()] || type || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: status => {
        const statusKey = status?.toLowerCase();
        return (
          <Tag color={CONTRACT_STATUS_COLORS[statusKey] || 'default'}>
            {CONTRACT_STATUS_TEXT[statusKey] || status || 'N/A'}
          </Tag>
        );
      },
    },
    {
      title: 'Giá trị',
      key: 'totalPrice',
      width: 160,
      render: (_, record) => {
        // Helper function để lấy deposit amount
        const getDepositAmount = contract => {
          if (!contract) return null;

          // 1. Ưu tiên lấy từ installments với type DEPOSIT (nếu backend enrich installments)
          if (contract.installments && contract.installments.length > 0) {
            const depositInstallment = contract.installments.find(
              inst => inst.type === 'DEPOSIT'
            );
            if (
              depositInstallment &&
              depositInstallment.amount !== undefined &&
              depositInstallment.amount !== null &&
              !isNaN(depositInstallment.amount) &&
              Number(depositInstallment.amount) > 0
            ) {
              return Number(depositInstallment.amount);
            }
          }

          // 2. Fallback: Tính từ totalPrice * depositPercent / 100
          // (Vì backend không enrich installments khi lấy danh sách contracts)
          if (
            contract.totalPrice !== undefined &&
            contract.totalPrice !== null &&
            contract.depositPercent !== undefined &&
            contract.depositPercent !== null
          ) {
            const totalPriceNumber = Number(contract.totalPrice);
            const depositPercentNumber = Number(contract.depositPercent);
            if (
              !isNaN(totalPriceNumber) &&
              !isNaN(depositPercentNumber) &&
              totalPriceNumber > 0 &&
              depositPercentNumber > 0
            ) {
              return Math.round((totalPriceNumber * depositPercentNumber) / 100);
            }
          }

          return null;
        };

        const depositAmount = getDepositAmount(record);
        const depositPercent = Number(record.depositPercent || 0);

        return (
          <div>
            <Text strong>
              {formatCurrency(record.totalPrice, record.currency)}
            </Text>
            <div className={styles.subText}>
              Đặt cọc {depositPercent}% ={' '}
              {depositAmount !== null
                ? formatCurrency(depositAmount, record.currency)
                : 'N/A'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Tiến độ',
      key: 'timeline',
      width: 220,
      render: (_, record) => {

        // Get actual start from first milestone that has actualStartAt
        const getActualStart = () => {
          if (!record?.milestones || record.milestones.length === 0) {
            return null;
          }
          
          // Tìm milestone đầu tiên có actualStartAt (sắp xếp theo orderIndex)
          const sortedMilestones = [...record.milestones].sort(
            (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
          );
          
          for (const milestone of sortedMilestones) {
            if (milestone.actualStartAt) {
              return milestone.actualStartAt;
            }
          }
          return null;
        };

        // Get actual end from last milestone that has actualEndAt
        const getActualEnd = () => {
          if (!record?.milestones || record.milestones.length === 0) {
            return null;
          }
          
          // Tìm milestone cuối cùng có actualEndAt (sắp xếp theo orderIndex)
          const sortedMilestones = [...record.milestones].sort(
            (a, b) => (b.orderIndex || 0) - (a.orderIndex || 0)
          );
          
          for (const milestone of sortedMilestones) {
            if (milestone.actualEndAt) {
              return milestone.actualEndAt;
            }
          }
          return null;
        };

        // Get planned end from last milestone
        const getPlannedEnd = () => {
          if (record?.milestones && record.milestones.length > 0) {
            const sortedMilestones = [...record.milestones].sort(
              (a, b) => (b.orderIndex || 0) - (a.orderIndex || 0)
            );
            const lastMilestone = sortedMilestones[0];
            return lastMilestone?.plannedDueDate || null;
          }
          return null;
        };

        const actualStart = getActualStart();
        const actualEnd = getActualEnd();
        const plannedEnd = getPlannedEnd();

        // Nếu contract đã completed nhưng không có actualEnd, có thể dùng createdAt hoặc updatedAt của contract
        const getCompletedDate = () => {
          if (record.status?.toLowerCase() === 'completed') {
            // Ưu tiên: actualEnd > plannedEnd > updatedAt > createdAt
            return actualEnd || plannedEnd || record.updatedAt || record.createdAt;
          }
          return null;
        };

        const completedDate = getCompletedDate();

        return (
          <div className={styles.timeline}>
            <div>
              <span className={styles.subText}>
                {actualStart ? 'Actual Start:' : 'Start:'}
              </span>{' '}
              {actualStart
                ? dayjs(actualStart).format('DD/MM/YYYY')
                : record.expectedStartDate
                ? dayjs(record.expectedStartDate).format('DD/MM/YYYY')
                : 'Chưa lên lịch'}
            </div>
            <div>
              <span className={styles.subText}>
                {actualEnd || completedDate ? 'Actual End:' : 'Due:'}
              </span>{' '}
              {actualEnd
                ? dayjs(actualEnd).format('DD/MM/YYYY')
                : completedDate
                ? dayjs(completedDate).format('DD/MM/YYYY')
                : plannedEnd
                ? dayjs(plannedEnd).format('DD/MM/YYYY')
                : 'N/A'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: value => dayjs(value).format('DD/MM/YYYY'),
      sorter: (a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => handleViewContract(record.contractId)}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
        <div className={styles.headerInfo}>
          <Title level={3} style={{ margin: 0 }}>
            Contracts cho Request {requestId}
          </Title>
          <Text type="secondary">
            {request?.title || 'Đang tải tiêu đề request...'}
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Tải lại
          </Button>
        </Space>
      </div>

      <Spin spinning={loadingRequest && !request}>
        <div className={styles.infoGrid}>
          <Card
            title="Thông tin Request"
            loading={loadingRequest && !request}
            bordered
          >
            {request ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Request ID">
                  <Text code>{request.requestId || request.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={
                      REQUEST_STATUS_COLORS[request.status?.toLowerCase()] ||
                      'default'
                    }
                  >
                    {REQUEST_STATUS_TEXT[request.status?.toLowerCase()] ||
                      request.status?.toUpperCase() ||
                      'N/A'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Loại dịch vụ">
                  {REQUEST_TYPE_LABELS[request.requestType?.toLowerCase()] ||
                    request.requestType ||
                    'N/A'}
                </Descriptions.Item>
                {request.requestType?.toLowerCase() === 'transcription' && (
                  <Descriptions.Item label="Tempo Reference">
                    {request.tempoPercentage
                      ? `${request.tempoPercentage}%`
                      : 'N/A'}
                  </Descriptions.Item>
                )}
                {request.requestType?.toLowerCase() === 'arrangement' && (
                  <Descriptions.Item label="Has Vocalist">
                    {request.hasVocalist ? 'Có' : 'Không'}
                  </Descriptions.Item>
                )}
                {request.requestType?.toLowerCase() === 'recording' && (
                  <Descriptions.Item label="External Guests">
                    {request.externalGuestCount ?? 0}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Manager phụ trách">
                  {request.managerUserId ? (
                    <Tag color="blue">{request.managerUserId}</Tag>
                  ) : (
                    <Text type="secondary">Chưa có</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {formatDateTime(request.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật gần nhất">
                  {formatDateTime(request.updatedAt)}
                </Descriptions.Item>
                {request.files && request.files.length > 0 && (
                  <Descriptions.Item label="Uploaded Files">
                    <FileList files={request.files} />
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Empty description="Không tìm thấy request" />
            )}
          </Card>

          <Card title="Người liên hệ & ghi chú" bordered>
            {request ? (
              <>
                <div className={styles.contactList}>
                  <div className={styles.contactItem}>
                    <UserOutlined className={styles.contactIcon} />
                    <span>{request.contactName || 'N/A'}</span>
                  </div>
                  <div className={styles.contactItem}>
                    <MailOutlined className={styles.contactIcon} />
                    <span>{request.contactEmail || 'N/A'}</span>
                  </div>
                  <div className={styles.contactItem}>
                    <PhoneOutlined className={styles.contactIcon} />
                    <span>{request.contactPhone || 'N/A'}</span>
                  </div>
                </div>
                <div className={styles.descriptionBox}>
                  <Text strong>Mô tả yêu cầu</Text>
                  <Paragraph style={{ marginTop: 8 }}>
                    {request.description || (
                      <Text type="secondary">Không có mô tả</Text>
                    )}
                  </Paragraph>
                </div>
              </>
            ) : (
              <Empty description="Không có dữ liệu" />
            )}
          </Card>
        </div>
      </Spin>

      <Card
        title={`Danh sách Contracts (${contracts.length})`}
        className={styles.contractCard}
        extra={
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={fetchContracts}
            loading={loadingContracts}
          >
            Làm mới
          </Button>
        }
      >
        <Table
          columns={contractColumns}
          dataSource={contracts}
          rowKey={record => record.contractId}
          loading={loadingContracts}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: loadingContracts ? (
              <Spin />
            ) : (
              <Empty description="Request này chưa có contract nào" />
            ),
          }}
        />
      </Card>

      {/* Chat Popup */}
      {requestId && <ChatPopup requestId={requestId} roomType="REQUEST_CHAT" />}
    </div>
  );
}
