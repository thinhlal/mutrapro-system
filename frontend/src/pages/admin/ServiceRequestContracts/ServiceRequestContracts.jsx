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
  StarFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getContractsByRequestId } from '../../../services/contractService';
import { getFilesByRequestId } from '../../../services/fileService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import FileList from '../../../components/common/FileList/FileList';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { formatPrice } from '../../../services/pricingMatrixService';
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
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  console.log('files', files);

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

  const fetchFiles = async () => {
    if (!requestId) return;
    try {
      setLoadingFiles(true);
      const response = await getFilesByRequestId(requestId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        // Filter chỉ lấy customer_upload files
        const customerFiles = response.data.filter(
          file => file.fileSource === 'customer_upload'
        );
        setFiles(customerFiles);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
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
    fetchFiles();
  }, [requestId]);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!requestId || request?.requestType !== 'recording') return;

      try {
        setLoadingBooking(true);
        const response = await getBookingByRequestId(requestId);
        console.log('Booking data:', response.data);
        console.log('Participants:', response.data?.participants);
        console.log('Required Equipment:', response.data?.requiredEquipment);
        if (response.status === 'success' && response.data) {
          setBooking(response.data);
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        // Do not show error because booking may not exist yet
      } finally {
        setLoadingBooking(false);
      }
    };

    if (request?.requestType === 'recording') {
      fetchBooking();
    }
  }, [requestId, request?.requestType]);

  const handleRefresh = () => {
    fetchRequest();
    fetchContracts();
    fetchFiles();
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
              return Math.round(
                (totalPriceNumber * depositPercentNumber) / 100
              );
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
            return lastMilestone?.targetDeadline || null;
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
            return (
              actualEnd || plannedEnd || record.updatedAt || record.createdAt
            );
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
            Detail Request
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
              <Table
                dataSource={[
                  {
                    key: 'requestId',
                    label: 'Request ID',
                    value: <Text code>{request.requestId || request.id}</Text>,
                  },
                  {
                    key: 'status',
                    label: 'Trạng thái',
                    value: (
                      <Tag
                        color={
                          REQUEST_STATUS_COLORS[
                            request.status?.toLowerCase()
                          ] || 'default'
                        }
                      >
                        {REQUEST_STATUS_TEXT[request.status?.toLowerCase()] ||
                          request.status?.toUpperCase() ||
                          'N/A'}
                      </Tag>
                    ),
                  },
                  {
                    key: 'requestType',
                    label: 'Loại dịch vụ',
                    value:
                      REQUEST_TYPE_LABELS[request.requestType?.toLowerCase()] ||
                      request.requestType ||
                      'N/A',
                  },
                  ...(request.requestType?.toLowerCase() === 'transcription'
                    ? [
                        ...(request.durationMinutes
                          ? [
                              {
                                key: 'duration',
                                label: 'Duration',
                                value: `${request.durationMinutes} phút`,
                              },
                            ]
                          : []),
                        ...(request.tempoPercentage
                          ? [
                              {
                                key: 'tempo',
                                label: 'Tempo Reference',
                                value: `${request.tempoPercentage}%`,
                              },
                            ]
                          : []),
                      ]
                    : []),
                  ...(request.requestType?.toLowerCase() ===
                  'arrangement_with_recording'
                    ? [
                        {
                          key: 'hasVocalist',
                          label: 'Has Vocalist',
                          value: request.hasVocalist ? 'Có' : 'Không',
                        },
                        ...(request.preferredSpecialists &&
                        request.preferredSpecialists.length > 0
                          ? [
                              {
                                key: 'preferredSpecialists',
                                label: 'Preferred Vocalists',
                                value: (
                                  <Space wrap>
                                    {request.preferredSpecialists.map(
                                      (specialist, idx) => (
                                        <Tag key={idx} color="pink">
                                          {specialist.name ||
                                            `Vocalist ${specialist.specialistId}`}
                                        </Tag>
                                      )
                                    )}
                                  </Space>
                                ),
                              },
                            ]
                          : []),
                      ]
                    : []),
                  ...(request.requestType?.toLowerCase() === 'recording'
                    ? [
                        {
                          key: 'externalGuests',
                          label: 'External Guests',
                          value: request.externalGuestCount ?? 0,
                        },
                      ]
                    : []),
                  ...(request.requestType === 'arrangement' ||
                  request.requestType === 'arrangement_with_recording'
                    ? [
                        {
                          key: 'genres',
                          label: 'Genres',
                          value:
                            request.genres && request.genres.length > 0 ? (
                              <Space wrap>
                                {request.genres.map((genre, idx) => (
                                  <Tag key={idx} color="purple">
                                    {getGenreLabel(genre)}
                                  </Tag>
                                ))}
                              </Space>
                            ) : (
                              <Text type="secondary">Not specified</Text>
                            ),
                        },
                        {
                          key: 'purpose',
                          label: 'Purpose',
                          value: request.purpose ? (
                            getPurposeLabel(request.purpose)
                          ) : (
                            <Text type="secondary">Not specified</Text>
                          ),
                        },
                      ]
                    : []),
                  ...((request.instruments && request.instruments.length > 0) ||
                  (request.instrumentIds && request.instrumentIds.length > 0)
                    ? [
                        {
                          key: 'instruments',
                          label: 'Instruments',
                          value: (
                            <Space wrap>
                              {request.instruments &&
                              request.instruments.length > 0
                                ? request.instruments.map((inst, idx) => {
                                    const isMain = inst.isMain === true;
                                    const isArrangement =
                                      request.requestType === 'arrangement' ||
                                      request.requestType ===
                                        'arrangement_with_recording';
                                    return (
                                      <Tag
                                        key={inst.instrumentId || idx}
                                        color={
                                          isMain && isArrangement
                                            ? 'gold'
                                            : 'purple'
                                        }
                                        icon={
                                          isMain && isArrangement ? (
                                            <StarFilled />
                                          ) : null
                                        }
                                      >
                                        {inst.instrumentName ||
                                          inst.name ||
                                          inst}
                                        {isMain && isArrangement && ' (Main)'}
                                      </Tag>
                                    );
                                  })
                                : request.instrumentIds?.map((id, idx) => (
                                    <Tag key={id || idx} color="purple">
                                      {id}
                                    </Tag>
                                  ))}
                            </Space>
                          ),
                        },
                      ]
                    : []),
                  ...(request.servicePrice
                    ? [
                        {
                          key: 'servicePrice',
                          label: 'Service Price',
                          value: (
                            <Text strong>
                              {formatPrice(
                                request.servicePrice,
                                request.currency || 'VND'
                              )}
                            </Text>
                          ),
                        },
                      ]
                    : []),
                  ...(request.instrumentPrice && request.instrumentPrice > 0
                    ? [
                        {
                          key: 'instrumentPrice',
                          label: 'Instruments Price',
                          value: (
                            <Text strong>
                              {formatPrice(
                                request.instrumentPrice,
                                request.currency || 'VND'
                              )}
                            </Text>
                          ),
                        },
                      ]
                    : []),
                  ...(request.totalPrice
                    ? [
                        {
                          key: 'totalPrice',
                          label: 'Total Price',
                          value: (
                            <Text
                              strong
                              style={{ fontSize: 16, fontWeight: 600 }}
                            >
                              {formatPrice(
                                request.totalPrice,
                                request.currency || 'VND'
                              )}
                            </Text>
                          ),
                        },
                      ]
                    : []),
                  {
                    key: 'createdAt',
                    label: 'Ngày tạo',
                    value: formatDateTime(request.createdAt),
                  },
                  {
                    key: 'updatedAt',
                    label: 'Cập nhật gần nhất',
                    value: formatDateTime(request.updatedAt),
                  },
                  ...(files.length > 0 ||
                  (request.files && request.files.length > 0)
                    ? [
                        {
                          key: 'files',
                          label: 'Uploaded Files',
                          value: (
                            <Spin spinning={loadingFiles}>
                              <FileList
                                files={
                                  files.length > 0 ? files : request.files || []
                                }
                              />
                            </Spin>
                          ),
                        },
                      ]
                    : []),
                ]}
                columns={[
                  {
                    title: 'Thông tin',
                    dataIndex: 'label',
                    key: 'label',
                    width: '40%',
                    render: text => <Text strong>{text}</Text>,
                  },
                  {
                    title: 'Giá trị',
                    dataIndex: 'value',
                    key: 'value',
                    width: '60%',
                  },
                ]}
                pagination={false}
                showHeader={true}
                size="small"
                bordered
              />
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

      {/* Studio Booking Section - only for recording requests */}
      {request?.requestType === 'recording' && (
        <Card
          title="🎙️ Studio Booking Information"
          style={{ marginBottom: '1.5rem' }}
          loading={loadingBooking}
          bordered
        >
          {booking ? (
            <Descriptions bordered column={2} size="middle">
              {booking.bookingDate && (
                <Descriptions.Item label="📅 Booking Date">
                  {booking.bookingDate}
                </Descriptions.Item>
              )}
              {booking.startTime && booking.endTime && (
                <Descriptions.Item label="🕒 Time Slot">
                  {booking.startTime} - {booking.endTime}
                </Descriptions.Item>
              )}
              {booking.durationHours && (
                <Descriptions.Item label="⏱️ Duration">
                  {booking.durationHours} hours
                </Descriptions.Item>
              )}
              {booking.status && (
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      booking.status === 'CONFIRMED'
                        ? 'green'
                        : booking.status === 'TENTATIVE'
                          ? 'orange'
                          : 'default'
                    }
                  >
                    {booking.status}
                  </Tag>
                </Descriptions.Item>
              )}

              {booking.participants && booking.participants.length > 0 && (
                <Descriptions.Item label="👥 Participants" span={2}>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    {booking.participants.map((p, index) => (
                      <div key={index}>
                        <Tag color={p.roleType === 'VOCAL' ? 'blue' : 'purple'}>
                          {p.roleType}
                        </Tag>
                        {p.specialistName || 'Self'}
                        {p.participantFee && (
                          <span style={{ marginLeft: 8, color: '#666' }}>
                            - {p.participantFee.toLocaleString('vi-VN')} VND
                          </span>
                        )}
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {booking.requiredEquipment &&
                booking.requiredEquipment.length > 0 && (
                  <Descriptions.Item label="🎸 Equipment" span={2}>
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {booking.requiredEquipment.map((eq, index) => (
                        <div key={index}>
                          {eq.equipmentName || 'Equipment'} x {eq.quantity}
                          {eq.totalRentalFee && (
                            <span style={{ marginLeft: 8, color: '#666' }}>
                              - {eq.totalRentalFee.toLocaleString('vi-VN')} VND
                            </span>
                          )}
                        </div>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

              {booking.artistFee && booking.artistFee > 0 && (
                <Descriptions.Item label="💰 Participant Fee">
                  {booking.artistFee.toLocaleString('vi-VN')} VND
                </Descriptions.Item>
              )}
              {booking.equipmentRentalFee && booking.equipmentRentalFee > 0 && (
                <Descriptions.Item label="🔧 Equipment Fee">
                  {booking.equipmentRentalFee.toLocaleString('vi-VN')} VND
                </Descriptions.Item>
              )}
              {booking.totalCost && (
                <Descriptions.Item label="💵 Total Cost" span={2}>
                  <Space>
                    <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                      {booking.totalCost.toLocaleString('vi-VN')} VND
                    </Text>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Empty description="No booking information yet" />
          )}
        </Card>
      )}

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
