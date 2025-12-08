import { Modal, Button, Descriptions, Tag, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import FileList from '../../common/FileList/FileList';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import { formatPrice } from '../../../services/pricingMatrixService';

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
  awaiting_assignment: 'Awaiting assignment',
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
        {request.totalPrice && (
          <Descriptions.Item label="Total Price">
            <Tag color="green" style={{ fontSize: 16, padding: '6px 16px' }}>
              {formatPrice(request.totalPrice, request.currency || 'VND')}
            </Tag>
          </Descriptions.Item>
        )}
        {request.requestType === 'transcription' && request.durationMinutes && (
          <Descriptions.Item label="Duration">
            <Tag color="green">
              {formatDurationMMSS(request.durationMinutes)}
            </Tag>
          </Descriptions.Item>
        )}
        {request.requestType === 'transcription' && request.tempoPercentage && (
          <Descriptions.Item label="Tempo Percentage">
            {request.tempoPercentage}%
          </Descriptions.Item>
        )}
        {(request.requestType === 'arrangement' ||
          request.requestType === 'arrangement_with_recording') && (
          <>
            {request.genres && request.genres.length > 0 && (
              <Descriptions.Item label="Genres">
                <Space wrap>
                  {request.genres.map((genre, idx) => (
                    <Tag key={idx} color="purple">
                      {getGenreLabel(genre)}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {request.purpose && (
              <Descriptions.Item label="Purpose">
                {getPurposeLabel(request.purpose)}
              </Descriptions.Item>
            )}
          </>
        )}
        {request.requestType === 'arrangement_with_recording' &&
          request.hasVocalist !== undefined && (
            <Descriptions.Item label="Has Vocalist">
              <Tag color={request.hasVocalist ? 'green' : 'default'}>
                {request.hasVocalist ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
          )}
        {request.requestType === 'arrangement_with_recording' &&
          request.preferredSpecialists &&
          request.preferredSpecialists.length > 0 && (
            <Descriptions.Item label="Preferred Vocalists">
              <Space wrap>
                {request.preferredSpecialists.map((specialist, idx) => (
                  <Tag key={idx} color="pink">
                    {specialist.name || `Vocalist ${specialist.specialistId}`}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        {request.requestType === 'recording' && (
          <Descriptions.Item label="External Guest Count">
            {request.externalGuestCount || 0}
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
