import { Modal, Button, Descriptions, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import FileList from '../../common/FileList/FileList';

const STATUS_COLORS = {
  pending: 'gold',
  contract_sent: 'blue',
  contract_approved: 'cyan',
  contract_signed: 'geekblue',
  awaiting_assignment: 'gold',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  rejected: 'red',
  // Uppercase fallback
  PENDING: 'gold',
  CONTRACT_SENT: 'blue',
  CONTRACT_APPROVED: 'cyan',
  CONTRACT_SIGNED: 'geekblue',
  AWAITING_ASSIGNMENT: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  REJECTED: 'red',
};

const STATUS_LABELS = {
  pending: 'Pending',
  contract_sent: 'Contract sent',
  contract_approved: 'Contract approved',
  contract_signed: 'Contract signed',
  awaiting_assignment: 'Deposit paid - awaiting assignment',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
};

export default function ServiceRequestDetailModal({
  visible,
  onCancel,
  request,
  currentUserId,
  onAssign,
  isAssigning = false,
  onCreateContract,
}) {
  if (!request) return null;

  const isAssigned = !!request.managerUserId;
  const isAssignedToCurrentUser = request.managerUserId === currentUserId;

  return (
    <Modal
      title="Request Details"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
        !isAssigned && onAssign && (
          <Button
            key="assign"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={isAssigning}
            onClick={() => onAssign(request.id)}
          >
            Assign to Me
          </Button>
        ),
      ]}
      width={1000}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Request ID">
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {request.id}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="User ID">{request.userId}</Descriptions.Item>
        <Descriptions.Item label="Title">{request.title}</Descriptions.Item>
        <Descriptions.Item label="Description">
          {request.description}
        </Descriptions.Item>
        <Descriptions.Item label="Type">
          <Tag color="cyan">
            {REQUEST_TYPE_LABELS[request.requestType] || request.requestType}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={STATUS_COLORS[request.status] || 'default'}>
            {STATUS_LABELS[request.status] ||
              request.status?.toUpperCase() ||
              'UNKNOWN'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Total Price">
          <Tag color="green" style={{ fontSize: 16, padding: '6px 16px' }}>
            ${Number(request.totalPrice || 0).toFixed(2)}
          </Tag>
        </Descriptions.Item>
        {request.requestType === 'arrangement' && (
          <Descriptions.Item label="Has Vocalist">
            {request.hasVocalist ? 'Yes' : 'No'}
          </Descriptions.Item>
        )}
        {request.requestType === 'recording' && (
          <Descriptions.Item label="External Guest Count">
            {request.externalGuestCount || 0}
          </Descriptions.Item>
        )}
        {request.requestType === 'transcription' && (
          <Descriptions.Item label="Tempo Percentage">
            {request.tempoPercentage}%
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Contact Name">
          {request.contactName}
        </Descriptions.Item>
        <Descriptions.Item label="Contact Email">
          {request.contactEmail}
        </Descriptions.Item>
        <Descriptions.Item label="Contact Phone">
          {request.contactPhone}
        </Descriptions.Item>
        <Descriptions.Item label="Assigned To">
          {isAssigned ? (
            <Tag color={isAssignedToCurrentUser ? 'green' : 'blue'}>
              {isAssignedToCurrentUser ? 'You' : 'Assigned to Manager'}
            </Tag>
          ) : (
            <Tag color="default">Unassigned</Tag>
          )}
        </Descriptions.Item>
        {request.files && request.files.length > 0 && (
          <Descriptions.Item label="Uploaded Files">
            <FileList files={request.files} />
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Created At">
          {new Date(request.createdAt).toLocaleString('vi-VN')}
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          {new Date(request.updatedAt).toLocaleString('vi-VN')}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

ServiceRequestDetailModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  request: PropTypes.object,
  currentUserId: PropTypes.string,
  onAssign: PropTypes.func,
  isAssigning: PropTypes.bool,
  onCreateContract: PropTypes.func,
};
