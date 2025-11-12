import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Alert,
  Spin,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FormOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getContractById, approveContract, signContract } from '../../../services/contractService';
import { API_CONFIG } from '../../../config/apiConfig';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import RevisionRequestModal from '../../../components/modal/RevisionRequestModal/RevisionRequestModal';
import ViewCancellationReasonModal from '../../../components/modal/ViewCancellationReasonModal/ViewCancellationReasonModal';
import styles from './ContractDetailPage.module.css';

const { Title, Text } = Typography;

// Generate contract title from contract type
const getContractTitle = contractType => {
  const titleMap = {
    transcription: 'Transcription Service Agreement',
    arrangement: 'Arrangement Service Agreement',
    arrangement_with_recording: 'Arrangement with Recording Service Agreement',
    recording: 'Recording Service Agreement',
    bundle: 'Bundle Service Agreement (Transcription + Arrangement + Recording)',
  };
  return titleMap[contractType] || 'Service Agreement';
};

const ContractDetailPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);

  // Load contract data
  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setContract(response.data);
      } else {
        throw new Error('Failed to load contract');
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setError(error?.message || 'Failed to load contract');
      message.error('Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await approveContract(contractId);
      if (response?.status === 'success') {
        message.success('Contract approved successfully!');
        loadContract(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error approving contract:', error);
      message.error(error?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle sign
  const handleSign = async () => {
    try {
      setActionLoading(true);
      const response = await signContract(contractId);
      if (response?.status === 'success') {
        message.success('Contract signed successfully!');
        loadContract(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      message.error(error?.message || 'Failed to sign contract');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel success
  const handleCancelSuccess = () => {
    message.success('Contract canceled successfully');
    loadContract();
  };

  // Handle revision request success
  const handleRevisionSuccess = () => {
    message.success('Revision request sent successfully');
    loadContract();
  };

  // Status config
  const getStatusConfig = status => {
    const configs = {
      draft: { color: 'default', text: 'Draft' },
      sent: { color: 'blue', text: 'Sent to Customer' },
      approved: { color: 'cyan', text: 'Approved - Waiting for Signature' },
      signed: { color: 'green', text: 'Signed' },
      rejected_by_customer: { color: 'red', text: 'Rejected by Customer' },
      need_revision: { color: 'orange', text: 'Needs Revision' },
      canceled_by_customer: { color: 'red', text: 'Canceled by Customer' },
      canceled_by_manager: { color: 'volcano', text: 'Canceled by Manager' },
      expired: { color: 'default', text: 'Expired' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  // Preview header
  const header = useMemo(
    () => (
      <div className={styles.header}>
        <div>
          <div className={styles.brand}>MuTraPro</div>
          <div className={styles.tagline}>Contract Document</div>
        </div>
        <div className={styles.meta}>
          <div>Contract ID: {contract?.contractNumber || contract?.contractId}</div>
          <div>Generated: {contract?.createdAt ? dayjs(contract.createdAt).format('YYYY-MM-DD HH:mm') : ''}</div>
        </div>
      </div>
    ),
    [contract]
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading contract...</div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className={styles.page}>
        <Alert
          message="Error Loading Contract"
          description={error || 'Contract not found'}
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          }
        />
      </div>
    );
  }

  const statusConfig = getStatusConfig(contract.status);
  const currentStatus = contract.status?.toLowerCase();
  
  // Determine available actions based on status
  const isSent = currentStatus === 'sent';
  const isApproved = currentStatus === 'approved';
  const isSigned = currentStatus === 'signed';
  const isCanceled = currentStatus === 'canceled_by_customer' || currentStatus === 'canceled_by_manager';
  const isNeedRevision = currentStatus === 'need_revision';
  const isExpired = currentStatus === 'expired';

  // Customer can take action when contract is SENT
  const canCustomerAction = isSent;
  const canSign = isApproved;
  const canViewReason = isCanceled || isNeedRevision;

  return (
    <div className={styles.page}>
      {/* LEFT SECTION: Contract Info & Actions */}
      <div className={styles.infoSection}>
        <Card className={styles.infoCard}>
          {/* Back button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/my-requests/${contract.requestId}`)}
            style={{ marginBottom: 16 }}
          >
            Back to Request
          </Button>

          <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
            Contract Details
          </Title>

          {/* Status Alert */}
          {isApproved && (
            <Alert
              message="Contract Approved"
              description="You have approved this contract. Please sign to proceed with the work."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isSigned && (
            <Alert
              message="Contract Signed"
              description="This contract has been signed and is now in effect."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isCanceled && (
            <Alert
              message="Contract Canceled"
              description="This contract has been canceled."
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              action={
                canViewReason && (
                  <Button size="small" onClick={() => setViewReasonModalOpen(true)}>
                    View Reason
                  </Button>
                )
              }
            />
          )}

          {isExpired && (
            <Alert
              message="Contract Expired"
              description="This contract has expired. Please contact support if you need assistance."
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isNeedRevision && (
            <Alert
              message="Revision Requested"
              description="You have requested revisions to this contract. The manager will create a new version."
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              action={
                canViewReason && (
                  <Button size="small" onClick={() => setViewReasonModalOpen(true)}>
                    View Reason
                  </Button>
                )
              }
            />
          )}

          {/* Contract Metadata */}
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Contract ID">
              <Text 
                copyable={{ text: contract.contractId }}
                style={{ 
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  display: 'block'
                }}
              >
                {contract.contractId}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contract Number">
              <Text strong>{contract.contractNumber || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contract Type">
              <Tag color="blue">{contract.contractType?.toUpperCase() || 'N/A'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Price">
              <Text strong>{contract.totalPrice?.toLocaleString()} {contract.currency || 'VND'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Deposit ({contract.depositPercent}%)">
              {contract.depositAmount?.toLocaleString()} {contract.currency || 'VND'}
            </Descriptions.Item>
            <Descriptions.Item label="Final Amount">
              {contract.finalAmount?.toLocaleString()} {contract.currency || 'VND'}
            </Descriptions.Item>
            <Descriptions.Item label="SLA Days">
              {contract.slaDays || 0} days
            </Descriptions.Item>
            {contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                {dayjs(contract.expectedStartDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {contract.dueDate && (
              <Descriptions.Item label="Due Date">
                {dayjs(contract.dueDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {!contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                <Text type="secondary" italic>Set upon signing</Text>
              </Descriptions.Item>
            )}
            {!contract.dueDate && contract.slaDays && (
              <Descriptions.Item label="Due Date">
                <Text type="secondary" italic>+{contract.slaDays} days from signing</Text>
              </Descriptions.Item>
            )}
            {contract.sentToCustomerAt && (
              <Descriptions.Item label="Sent At">
                {dayjs(contract.sentToCustomerAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.expiresAt && (
              <Descriptions.Item label="Expires At">
                {dayjs(contract.expiresAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.customerReviewedAt && (
              <Descriptions.Item label="Reviewed At">
                {dayjs(contract.customerReviewedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.signedAt && (
              <Descriptions.Item label="Signed At">
                {dayjs(contract.signedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Free Revisions">
              {contract.freeRevisionsIncluded || 0}
            </Descriptions.Item>
            {contract.additionalRevisionFeeVnd && (
              <Descriptions.Item label="Additional Revision Fee">
                {contract.additionalRevisionFeeVnd.toLocaleString()} VND
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {canCustomerAction && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleApprove}
                  loading={actionLoading}
                  block
                  size="large"
                >
                  Approve Contract
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setRevisionModalOpen(true)}
                  loading={actionLoading}
                  block
                >
                  Request Revision
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setCancelModalOpen(true)}
                  loading={actionLoading}
                  block
                >
                  Cancel Contract
                </Button>
              </>
            )}

            {canSign && (
              <Button
                type="primary"
                icon={<FormOutlined />}
                onClick={handleSign}
                loading={actionLoading}
                block
                size="large"
              >
                Sign Contract
              </Button>
            )}

            {canViewReason && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => setViewReasonModalOpen(true)}
                block
              >
                View {isCanceled ? 'Cancellation' : 'Revision'} Reason
              </Button>
            )}
          </Space>
        </Card>
      </div>

      {/* RIGHT SECTION: Contract Preview */}
      <div className={styles.previewSection}>
        <Card className={styles.previewCard}>
          <div className={styles.previewToolbar}>
            <Title level={5} style={{ margin: 0 }}>
              Contract Preview
            </Title>
          </div>

          <div className={styles.preview} ref={previewRef}>
            {header}
            <div className={styles.doc}>
              {/* Watermark - Always show except when signed */}
              {!isSigned && (
                <div className={styles.watermark}>
                  {statusConfig.text.toUpperCase()}
                </div>
              )}

              {/* Company Seal - Always show */}
              <div className={`${styles.seal} ${styles.seal_red}`}>
                <div className={styles.sealInner}>
                  <div className={styles.sealText}>
                    MuTraPro Official
                  </div>
                  <div className={styles.sealDate}>
                    {dayjs(contract.createdAt).format('YYYY-MM-DD')}
                  </div>
                </div>
              </div>

              <h1 className={styles.docTitle}>
                {getContractTitle(contract.contractType)}
              </h1>
              <p>
                <strong>Contract Number:</strong> {contract.contractNumber || 'N/A'}
                <br />
                <strong>Status:</strong> {statusConfig.text}
              </p>

              <h3>Parties</h3>
              <p>
                <strong>Party A (Provider):</strong> {API_CONFIG.PARTY_A_NAME}
                <br />
                <strong>Party B (Customer):</strong> {contract.nameSnapshot || contract.userId || 'N/A'}
                {contract.phoneSnapshot && contract.phoneSnapshot !== 'N/A' && ` | Phone: ${contract.phoneSnapshot}`}
                {contract.emailSnapshot && contract.emailSnapshot !== 'N/A' && ` | Email: ${contract.emailSnapshot}`}
              </p>

              <h3>Pricing & Payment</h3>
              <p>
                <strong>Currency:</strong> {contract.currency || 'VND'} &nbsp;|&nbsp;
                <strong>Total Price:</strong> {contract.totalPrice?.toLocaleString()} &nbsp;|&nbsp;
                <strong>Deposit:</strong> {contract.depositPercent}% = {contract.depositAmount?.toLocaleString()} &nbsp;|&nbsp;
                <strong>Final Amount:</strong> {contract.finalAmount?.toLocaleString()}
              </p>

              <h3>Timeline & SLA</h3>
              <p>
                <strong>SLA Days:</strong> {contract.slaDays || 0} days &nbsp;|&nbsp;
                <strong>Expected Start:</strong>{' '}
                {contract.expectedStartDate 
                  ? dayjs(contract.expectedStartDate).format('YYYY-MM-DD')
                  : <span style={{ fontStyle: 'italic', color: '#999' }}>Upon signing</span>
                }
                &nbsp;|&nbsp;
                <strong>Due Date:</strong>{' '}
                {contract.dueDate 
                  ? dayjs(contract.dueDate).format('YYYY-MM-DD')
                  : <span style={{ fontStyle: 'italic', color: '#999' }}>+{contract.slaDays || 0} days from signing</span>
                }
              </p>

              {contract.termsAndConditions && (
                <>
                  <h3>Terms & Conditions</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{contract.termsAndConditions}</p>
                </>
              )}

              {contract.specialClauses && (
                <>
                  <h3>Special Clauses</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{contract.specialClauses}</p>
                </>
              )}

              <Divider />
              <div className={styles.signRow}>
                <div>
                  <div className={styles.sigLabel}>Party A Representative</div>
                  <div className={styles.sigLine} />
                  <div className={styles.sigHint}>Name, Title</div>
                </div>
                <div>
                  <div className={styles.sigLabel}>Party B Representative</div>
                  <div className={styles.sigLine} />
                  <div className={styles.sigHint}>
                    {contract.signedAt 
                      ? `Signed: ${dayjs(contract.signedAt).format('YYYY-MM-DD HH:mm')}`
                      : 'Name, Title'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <CancelContractModal
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
        contractId={contractId}
        isManager={false}
        isDraft={false}
      />

      <RevisionRequestModal
        open={revisionModalOpen}
        onCancel={() => setRevisionModalOpen(false)}
        onSuccess={handleRevisionSuccess}
        contractId={contractId}
      />

      {canViewReason && (
        <ViewCancellationReasonModal
          open={viewReasonModalOpen}
          onCancel={() => setViewReasonModalOpen(false)}
          reason={contract.cancellationReason || 'No reason provided'}
          isCanceled={isCanceled}
        />
      )}
    </div>
  );
};

export default ContractDetailPage;

