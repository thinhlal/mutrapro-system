import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Spin,
  Space,
  Empty,
  Modal,
  Alert,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  EditOutlined,
  StopOutlined,
  InfoCircleOutlined,
  FormOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './RequestContractList.module.css';

const RequestContractList = ({
  contracts,
  loading,
  actionLoading,
  onApprove,
  onRequestChange,
  onCancel,
  formatDate,
}) => {
  const navigate = useNavigate();
  const [cancelReasonModalVisible, setCancelReasonModalVisible] =
    useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  const getDepositAmount = contract => {
    if (!contract) return 0;
    const normalizedDeposit =
      contract.depositAmount !== undefined && contract.depositAmount !== null
        ? Number(contract.depositAmount)
        : null;
    if (!Number.isNaN(normalizedDeposit) && normalizedDeposit !== null) {
      return normalizedDeposit;
    }

    const depositInstallment = contract.installments?.find(
      inst => inst.type === 'DEPOSIT'
    );
    if (
      depositInstallment &&
      depositInstallment.amount !== undefined &&
      depositInstallment.amount !== null
    ) {
      const normalizedInstallmentAmount = Number(depositInstallment.amount);
      if (!Number.isNaN(normalizedInstallmentAmount)) {
        return normalizedInstallmentAmount;
      }
    }

    if (
      contract.totalPrice !== undefined &&
      contract.totalPrice !== null &&
      contract.depositPercent !== undefined &&
      contract.depositPercent !== null
    ) {
      const totalPriceNumber = Number(contract.totalPrice);
      const depositPercentNumber = Number(contract.depositPercent);
      if (
        !Number.isNaN(totalPriceNumber) &&
        !Number.isNaN(depositPercentNumber)
      ) {
        return (totalPriceNumber * depositPercentNumber) / 100;
      }
    }

    return 0;
  };

  const getContractStatusColor = status => {
    const statusLower = status?.toLowerCase() || '';
    const colorMap = {
      draft: 'default',
      sent: 'geekblue',
      approved: 'green',
      signed: 'orange',
      active_pending_assignment: 'gold',
      active: 'green',
      rejected_by_customer: 'red',
      need_revision: 'orange',
      canceled_by_customer: 'default',
      canceled_by_manager: 'orange',
      expired: 'volcano',
    };
    return colorMap[statusLower] || 'default';
  };

  const getContractStatusText = status => {
    const statusLower = status?.toLowerCase() || '';
    const textMap = {
      draft: 'Draft',
      sent: 'Đã gửi',
      approved: 'Đã duyệt',
      signed: 'Đã ký - Chờ thanh toán deposit',
      active_pending_assignment: 'Đã nhận cọc - Chờ gán task',
      active: 'Đã ký - Đã thanh toán deposit',
      rejected_by_customer: 'Bị từ chối',
      need_revision: 'Cần chỉnh sửa',
      canceled_by_customer: 'Đã hủy',
      canceled_by_manager: 'Đã thu hồi',
      expired: 'Hết hạn',
    };
    return textMap[statusLower] || status;
  };

  if (loading) {
    return (
      <Card style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!contracts || contracts.length === 0) {
    return null;
  }

  return (
    <Card
      title="Contracts"
      style={{ marginTop: 16 }}
      extra={<Tag color="blue">{contracts.length} contract(s)</Tag>}
      className={styles.contractListCard}
    >
      {contracts.map(contract => {
        const currentStatus = contract.status?.toLowerCase();
        const isSent = currentStatus === 'sent';
        const isApproved = currentStatus === 'approved';
        const isCanceled = currentStatus === 'canceled_by_customer';
        const isCanceledByManager = currentStatus === 'canceled_by_manager';
        const isNeedRevision = currentStatus === 'need_revision';

        // Contract đã từng được gửi cho customer
        // (Backend đã filter, chỉ trả về contracts có sentToCustomerAt cho customer)
        const wasSentToCustomer = !!contract.sentToCustomerAt;

        // Chỉ cho phép customer action khi status = SENT
        const canCustomerAction = isSent;

        // Cho phép customer ký khi status = APPROVED
        const canSign = isApproved;

        return (
          <Card
            key={contract.contractId}
            type="inner"
            style={{ marginBottom: 16 }}
            className={styles.contractCard}
            title={
              <Space>
                <span>{contract.contractNumber}</span>
                <Tag color={getContractStatusColor(contract.status)}>
                  {getContractStatusText(contract.status)}
                </Tag>
              </Space>
            }
            extra={
              <Space
                direction="horizontal"
                size="small"
                wrap
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {/* View Details Button - Always visible */}
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/contracts/${contract.contractId}`)}
                >
                  View Details
                </Button>

                {canCustomerAction && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => onApprove(contract.contractId)}
                      loading={
                        typeof actionLoading === 'object'
                          ? actionLoading[contract.contractId]
                          : actionLoading
                      }
                    >
                      Duyệt
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => onRequestChange(contract)}
                      loading={
                        typeof actionLoading === 'object'
                          ? actionLoading[contract.contractId]
                          : actionLoading
                      }
                    >
                      Yêu cầu chỉnh sửa
                    </Button>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={() => onCancel(contract)}
                      loading={
                        typeof actionLoading === 'object'
                          ? actionLoading[contract.contractId]
                          : actionLoading
                      }
                    >
                      Hủy
                    </Button>
                  </>
                )}
                {canSign && (
                  <>
                    <Alert
                      message="Bạn đã duyệt contract này. Vui lòng vào chi tiết contract để ký qua OTP."
                      type="success"
                      showIcon
                      style={{ marginBottom: 0 }}
                    />
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() =>
                        navigate(`/contracts/${contract.contractId}`)
                      }
                      size="large"
                    >
                      Vào chi tiết để ký
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
                      <Button
                        type="link"
                        size="small"
                        icon={<InfoCircleOutlined />}
                        onClick={() => {
                          setSelectedContract(contract);
                          setCancelReasonModalVisible(true);
                        }}
                        style={{ padding: 0, height: 'auto', marginTop: 4 }}
                      >
                        Xem lý do chi tiết
                      </Button>
                    )}
                    {wasSentToCustomer && contract.sentToCustomerAt && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: '11px',
                          color: '#999',
                        }}
                      >
                        Đã gửi lúc: {formatDate(contract.sentToCustomerAt)}
                      </div>
                    )}
                  </div>
                )}
                {isNeedRevision && contract.cancellationReason && (
                  <Button
                    type="link"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={() => {
                      setSelectedContract(contract);
                      setCancelReasonModalVisible(true);
                    }}
                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    Xem lý do yêu cầu sửa
                  </Button>
                )}
                {isCanceled && contract.cancellationReason && (
                  <Button
                    type="link"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={() => {
                      setSelectedContract(contract);
                      setCancelReasonModalVisible(true);
                    }}
                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    Xem lý do hủy
                  </Button>
                )}
              </Space>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Loại contract">
                {contract.contractType || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Giá trị">
                {contract.totalPrice?.toLocaleString() || 0}{' '}
                {contract.currency || 'VND'}
              </Descriptions.Item>
              <Descriptions.Item label="Đặt cọc">
                {getDepositAmount(contract).toLocaleString()}{' '}
                {contract.currency || 'VND'}({contract.depositPercent || 0}%)
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

      {/* Modal hiển thị lý do chi tiết */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined
              style={{
                color:
                  selectedContract?.status?.toLowerCase() === 'need_revision'
                    ? '#fa8c16'
                    : '#ff4d4f',
              }}
            />
            <span>
              {selectedContract?.status?.toLowerCase() === 'need_revision'
                ? 'Lý do yêu cầu chỉnh sửa'
                : 'Lý do hủy Contract'}
            </span>
          </Space>
        }
        open={cancelReasonModalVisible}
        onCancel={() => {
          setCancelReasonModalVisible(false);
          setSelectedContract(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setCancelReasonModalVisible(false);
              setSelectedContract(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedContract && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message={
                selectedContract.status?.toLowerCase() === 'need_revision'
                  ? 'Bạn đã yêu cầu chỉnh sửa contract này'
                  : selectedContract.status?.toLowerCase() ===
                      'canceled_by_customer'
                    ? 'Bạn đã hủy contract này'
                    : 'Contract đã bị hủy bởi Manager'
              }
              type={
                selectedContract.status?.toLowerCase() === 'need_revision'
                  ? 'warning'
                  : 'error'
              }
              showIcon
            />

            <div>
              <Typography.Title level={5}>Thông tin Contract:</Typography.Title>
              <div
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <div>
                    <strong>Contract Number:</strong>{' '}
                    {selectedContract.contractNumber}
                  </div>
                  <div>
                    <strong>Loại dịch vụ:</strong>{' '}
                    {selectedContract.contractType}
                  </div>
                  <div>
                    <strong>Giá trị:</strong>{' '}
                    {selectedContract.totalPrice?.toLocaleString() || 0}{' '}
                    {selectedContract.currency || 'VND'}
                  </div>
                  <div>
                    <strong>SLA:</strong> {selectedContract.slaDays} ngày
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <Tag
                      color={getContractStatusColor(selectedContract.status)}
                    >
                      {getContractStatusText(selectedContract.status)}
                    </Tag>
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Typography.Title level={5}>
                {selectedContract.status?.toLowerCase() === 'need_revision'
                  ? 'Lý do yêu cầu sửa:'
                  : 'Lý do hủy:'}
              </Typography.Title>
              <div
                style={{
                  padding: '16px',
                  background:
                    selectedContract.status?.toLowerCase() === 'need_revision'
                      ? '#fff7e6'
                      : '#fff1f0',
                  border:
                    selectedContract.status?.toLowerCase() === 'need_revision'
                      ? '1px solid #ffd591'
                      : '1px solid #ffccc7',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  minHeight: '80px',
                }}
              >
                {selectedContract.cancellationReason || 'Không có lý do cụ thể'}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </Card>
  );
};

RequestContractList.propTypes = {
  contracts: PropTypes.array,
  loading: PropTypes.bool,
  actionLoading: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  onApprove: PropTypes.func.isRequired,
  onRequestChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
};

RequestContractList.defaultProps = {
  contracts: [],
  loading: false,
  actionLoading: {},
};

export default RequestContractList;
