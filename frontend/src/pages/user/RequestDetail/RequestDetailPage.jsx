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
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  StarFilled,
} from '@ant-design/icons';
import Header from '../../../components/common/Header/Header';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { formatPrice } from '../../../services/pricingMatrixService';
import {
  getContractsByRequestId,
  approveContract,
  requestChangeContract,
  cancelContract,
} from '../../../services/contractService';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import RequestContractList from '../../../components/contract/RequestContractList/RequestContractList';
import FileList from '../../../components/common/FileList/FileList';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import styles from './RequestDetailPage.module.css';
import { useDocumentTitle } from '../../../hooks';

const { TextArea } = Input;

const RequestDetailPage = () => {
  useDocumentTitle('Request Details');
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [requestChangeModalVisible, setRequestChangeModalVisible] =
    useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading per contractId
  const [changeReason, setChangeReason] = useState('');
  const { instruments: instrumentsData, fetchInstruments } =
    useInstrumentStore();

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
          navigate('/my-requests');
        }
      } catch (error) {
        console.error('Error loading request:', error);
        message.error(error.message || 'Lỗi khi tải chi tiết request');
        navigate('/my-requests');
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      loadRequest();
    }
  }, [requestId, navigate]);

  useEffect(() => {
    const loadBooking = async () => {
      if (!requestId || request?.requestType !== 'recording') return;
      
      try {
        setLoadingBooking(true);
        const response = await getBookingByRequestId(requestId);
        console.log('Booking data:', response.data);
        if (response.status === 'success' && response.data) {
          setBooking(response.data);
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        // Không hiển thị error message vì booking có thể chưa tồn tại
      } finally {
        setLoadingBooking(false);
      }
    };

    if (request?.requestType === 'recording') {
      loadBooking();
    }
  }, [requestId, request?.requestType]);

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

  const getStatusConfig = status => {
    const hasManager = !!request?.managerUserId;
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
          ? 'Manager đã nhận request và đang chuẩn bị hợp đồng.'
          : 'Đang chờ manager nhận xử lý request của bạn.',
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Contract sent',
        description: 'Hợp đồng đã được gửi. Vui lòng kiểm tra và phê duyệt.',
      },
      contract_approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Đã duyệt hợp đồng - Chờ ký',
        description: 'Bạn đã duyệt nội dung. Hoàn tất e-sign để tiếp tục.',
      },
      contract_signed: {
        color: 'geekblue',
        icon: <FileTextOutlined />,
        text: 'Contract signed',
        description: 'Hợp đồng đã ký, chờ thanh toán deposit để bắt đầu.',
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

  const getRequestTypeText = type => {
    const types = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
      arrangement_with_recording: 'Arrangement with Recording',
      recording: 'Recording',
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
  console.log('request', request);
  const getManagerStatusText = () => {
    if (!request) return '';
    const hasManager = !!request.managerUserId;
    const status = request.status;
    if (hasManager) {
      if (status === 'completed') return 'Completed';
      if (status === 'cancelled' || status === 'rejected') return 'Closed';
      // pending/approved/... but has manager
      return 'Manager processing';
    }
    // No manager yet
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled' || status === 'rejected') return 'Closed';
    return 'Not assigned • Pending';
  };

  const handleApproveContract = async contractId => {
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
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
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleRequestChange = async () => {
    if (!selectedContract || !changeReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu chỉnh sửa');
      return;
    }
    const contractId = selectedContract.contractId;
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
      await requestChangeContract(contractId, changeReason);
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
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleCancelContract = async reason => {
    if (!selectedContract) return;
    const contractId = selectedContract.contractId;
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
      await cancelContract(contractId, reason);
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
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleOpenRequestChangeModal = contract => {
    setSelectedContract(contract);
    setRequestChangeModalVisible(true);
  };

  const handleOpenCancelModal = contract => {
    setSelectedContract(contract);
    setCancelModalVisible(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      );
    }

    if (!request) {
      return <Empty description="Request not found" />;
    }

    const statusConfig = getStatusConfig(request.status);

    return (
      <div className={styles.detailWrapper}>
        <div className={styles.headerSection}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/my-requests')}
            style={{ marginBottom: '1rem' }}
          >
            Back
          </Button>
          <h1 className={styles.pageTitle}>Request Detail</h1>
        </div>

        <Card className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.requestTitle}>{request.title}</h2>
            <Space>
              <Tag color="orange" className={styles.typeTag}>
                {getRequestTypeText(request.requestType)}
              </Tag>
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
            </Space>
          </div>

          <Divider />

          {/* Phần đầu: 2 cột - 6 mục trái, 6 mục phải */}
          <Descriptions bordered column={2} size="middle">
            {/* Cột trái - 6 mục đầu tiên */}
            <Descriptions.Item label="Request ID">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {request.requestId}
              </span>
            </Descriptions.Item>

            {/* Cột phải - Duration - Chỉ hiển thị cho transcription */}
            {request.requestType === 'transcription' ? (
              request.durationMinutes ? (
                <Descriptions.Item label="Duration">
                  {formatDurationMMSS(request.durationMinutes)}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Duration">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            ) : null}

            <Descriptions.Item label="Title">
              {request.title || 'N/A'}
            </Descriptions.Item>

            {/* Cột phải - Tempo - Chỉ hiển thị cho transcription */}
            {request.requestType === 'transcription' ? (
              request.tempoPercentage ? (
                <Descriptions.Item label="Tempo">
                  <Tag>{request.tempoPercentage}%</Tag>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Tempo">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            ) : null}

            <Descriptions.Item label="Description">
              {request.description || 'No description'}
            </Descriptions.Item>

            {/* Cột phải - Instruments */}
            {request.requestType !== 'recording' 
            && (request.instruments && request.instruments.length > 0) ||
            (request.instrumentIds && request.instrumentIds.length > 0) && (
              <Descriptions.Item label="Instruments">
                <Space wrap>
                  {request.instruments && request.instruments.length > 0
                    ? request.instruments.map((inst, idx) => {
                        const isMain = inst.isMain === true;
                        const isArrangement =
                          request.requestType === 'arrangement' ||
                          request.requestType === 'arrangement_with_recording';
                        return (
                          <Tag
                            key={inst.instrumentId || idx}
                            color={isMain && isArrangement ? 'gold' : 'purple'}
                            icon={
                              isMain && isArrangement ? <StarFilled /> : null
                            }
                          >
                            {inst.instrumentName || inst.name || inst}
                            {isMain && isArrangement && ' (Main)'}
                          </Tag>
                        );
                      })
                    : request.instrumentIds.map(id => {
                        const inst = instrumentsData.find(
                          i => i.instrumentId === id
                        );
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

            <Descriptions.Item label="Contact Name">
              {request.contactName || 'N/A'}
            </Descriptions.Item>

            {/* Service Price - Ẩn cho recording */}
            {request.requestType !== 'recording' && (
              request.servicePrice ? (
                <Descriptions.Item label="Service Price">
                  {formatPrice(request.servicePrice, request.currency || 'VND')}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Service Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            )}

            <Descriptions.Item label="Contact Email">
              {request.contactEmail || 'N/A'}
            </Descriptions.Item>

            {/* Instruments Price - Ẩn cho recording */}
            {request.requestType !== 'recording' && (
              request.instrumentPrice && request.instrumentPrice > 0 ? (
                <Descriptions.Item label="Instruments Price">
                  {formatPrice(
                    request.instrumentPrice,
                    request.currency || 'VND'
                  )}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Instruments Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            )}

            <Descriptions.Item label="Phone Number">
              {request.contactPhone || 'N/A'}
            </Descriptions.Item>

            {/* Total Price - Ẩn cho recording (dùng booking totalCost) */}
            {request.requestType !== 'recording' && (
              request.totalPrice ? (
                <Descriptions.Item label="Total Price">
                  <Tag color="green">
                    {formatPrice(request.totalPrice, request.currency || 'VND')}
                  </Tag>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Total Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            )}
          </Descriptions>

          {/* Phần sau: 1 cột - các mục còn lại */}
          <Descriptions
            bordered
            column={1}
            size="middle"
            style={{ marginTop: 16 }}
          >
            {/* Các mục có điều kiện cho arrangement/recording */}
            {request.hasVocalist !== undefined &&
              request.requestType === 'arrangement_with_recording' && (
                <Descriptions.Item label="Vocalist">
                  {request.hasVocalist ? (
                    <Tag color="green">Yes</Tag>
                  ) : (
                    <Tag color="default">No</Tag>
                  )}
                </Descriptions.Item>
              )}

            {request.requestType === 'arrangement_with_recording' &&
              request.preferredSpecialists &&
              request.preferredSpecialists.length > 0 && (
                <Descriptions.Item label="Preferred Vocalists">
                  <Space wrap>
                    {request.preferredSpecialists.map((specialist, idx) => (
                      <Tag key={idx} color="pink">
                        {specialist.name ||
                          `Vocalist ${specialist.specialistId}`}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

            {request.externalGuestCount > 0 &&
              request.requestType === 'recording' && (
                <Descriptions.Item label="Guests">
                  <Tag>
                    {request.externalGuestCount}{' '}
                    {request.externalGuestCount === 1 ? 'person' : 'people'}
                  </Tag>
                </Descriptions.Item>
              )}

            {/* Hiển thị genres và purpose cho arrangement requests */}
            {(request.requestType === 'arrangement' ||
              request.requestType === 'arrangement_with_recording') && (
              <>
                <Descriptions.Item label="Genres">
                  {request.genres && request.genres.length > 0 ? (
                    <Space wrap>
                      {request.genres.map((genre, idx) => (
                        <Tag key={idx} color="purple">
                          {getGenreLabel(genre)}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>Not specified</span>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Purpose">
                  {request.purpose ? (
                    getPurposeLabel(request.purpose)
                  ) : (
                    <span style={{ color: '#999' }}>Not specified</span>
                  )}
                </Descriptions.Item>
              </>
            )}

            {request.managerInfo ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div>
                    <strong>Name:</strong>{' '}
                    {request.managerInfo.fullName || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {request.managerInfo.email || 'N/A'}
                  </div>
                  {request.managerInfo.phone && (
                    <div>
                      <strong>Phone:</strong> {request.managerInfo.phone}
                    </div>
                  )}
                  {request.managerInfo.role && (
                    <div>
                      <strong>Role:</strong> {request.managerInfo.role}
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <Tag color="processing">{getManagerStatusText()}</Tag>
                  </div>
                </div>
              </Descriptions.Item>
            ) : request.managerUserId ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div>
                    <strong>ID:</strong> {request.managerUserId}
                  </div>
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
              <Descriptions.Item label="Uploaded Files">
                <FileList files={request.files} />
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Created At">
              {/* <ClockCircleOutlined style={{ marginRight: 8 }} /> */}
              {formatDate(request.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Last Updated">
              {formatDate(request.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Studio Booking Section - CHỈ hiển thị cho recording requests */}
        {request.requestType === 'recording' && (
          <Card 
            title="🎙️ Studio Booking Information" 
            style={{ marginTop: '1.5rem' }}
            loading={loadingBooking}
          >
            {booking ? (
              <Descriptions bordered column={2} size="middle">
                {booking.bookingDate && (
                  <Descriptions.Item label="📅 Booking Date">
                    {booking.bookingDate}
                  </Descriptions.Item>
                )}
                {(booking.startTime && booking.endTime) && (
                  <Descriptions.Item label="🕒 Time Slot">
                    {booking.startTime} - {booking.endTime}
                  </Descriptions.Item>
                )}
                {booking.durationHours && (
                  <Descriptions.Item label="⏱️ Duration">
                    {booking.durationHours} giờ
                  </Descriptions.Item>
                )}
                {booking.status && (
                  <Descriptions.Item label="Status">
                    <Tag color={
                      booking.status === 'CONFIRMED' ? 'green' : 
                      booking.status === 'TENTATIVE' ? 'orange' : 
                      'default'
                    }>
                      {booking.status}
                    </Tag>
                  </Descriptions.Item>
                )}
                
                {booking.participants && booking.participants.length > 0 && (
                  <Descriptions.Item label="👥 Participants" span={2}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
                
                {booking.requiredEquipment && booking.requiredEquipment.length > 0 && (
                  <Descriptions.Item label="🎸 Equipment" span={2}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {booking.requiredEquipment.map((eq, index) => (
                        <div key={index}>
                          {eq.equipmentName || 'Equipment'} × {eq.quantity}
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
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4d4f' }}>
                        {booking.totalCost.toLocaleString('vi-VN')} VND
                      </span>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Empty description="Chưa có thông tin booking" />
            )}
          </Card>
        )}

        {/* Contracts Section */}
        <RequestContractList
          contracts={contracts}
          loading={loadingContracts}
          actionLoading={actionLoading}
          onApprove={handleApproveContract}
          onRequestChange={handleOpenRequestChangeModal}
          onCancel={handleOpenCancelModal}
          formatDate={formatDate}
        />

        {/* Cancel Contract Modal */}
        <CancelContractModal
          visible={cancelModalVisible}
          onCancel={() => {
            setCancelModalVisible(false);
            setSelectedContract(null);
          }}
          onConfirm={handleCancelContract}
          loading={
            selectedContract
              ? actionLoading[selectedContract.contractId]
              : false
          }
          isManager={false}
        />

        {/* Request Change Modal */}
        <Modal
          title="Request Contract Change"
          open={requestChangeModalVisible}
          onOk={handleRequestChange}
          onCancel={() => {
            setRequestChangeModalVisible(false);
            setChangeReason('');
            setSelectedContract(null);
          }}
          confirmLoading={
            selectedContract
              ? actionLoading[selectedContract.contractId]
              : false
          }
          okText="Send Request"
          cancelText="Close"
          width={600}
        >
          <div style={{ marginBottom: 16 }}>
            <p>
              Please enter the reason you want to change contract{' '}
              <strong>{selectedContract?.contractNumber}</strong>
            </p>
          </div>
          <TextArea
            rows={4}
            placeholder="Please enter the reason for requesting changes (minimum 10 characters)..."
            value={changeReason}
            onChange={e => setChangeReason(e.target.value)}
            showCount
            maxLength={500}
          />
        </Modal>

        {/* Chat Popup - Facebook Messenger style */}
        {requestId && (
          <ChatPopup requestId={requestId} roomType="REQUEST_CHAT" />
        )}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className={styles.pageContainer}>{renderContent()}</div>
    </>
  );
};

export default RequestDetailPage;
