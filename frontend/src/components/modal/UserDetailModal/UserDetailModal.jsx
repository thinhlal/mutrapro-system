import { Modal, Button, Descriptions, Tag } from 'antd';
import PropTypes from 'prop-types';

const getRoleColor = role => {
  const colors = {
    SYSTEM_ADMIN: 'red',
    MANAGER: 'blue',
    CUSTOMER: 'green',
    TRANSCRIPTION: 'purple',
    ARRANGEMENT: 'orange',
    RECORDING_ARTIST: 'cyan',
  };
  return colors[role] || 'default';
};

const getRoleDisplayName = role => {
  const names = {
    SYSTEM_ADMIN: 'System Admin',
    MANAGER: 'Manager',
    CUSTOMER: 'Customer',
    TRANSCRIPTION: 'Transcription',
    ARRANGEMENT: 'Arrangement',
    RECORDING_ARTIST: 'Recording Artist',
  };
  return names[role] || role;
};

export default function UserDetailModal({ visible, onCancel, user }) {
  if (!user) return null;

  return (
    <Modal
      title="User Details"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
      ]}
      width={700}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="User ID">{user.userId}</Descriptions.Item>
        <Descriptions.Item label="Full Name">
          {user.fullName}
        </Descriptions.Item>
        <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        <Descriptions.Item label="Phone">
          {user.phone || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Address">
          {user.address || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Role">
          <Tag color={getRoleColor(user.role)}>
            {getRoleDisplayName(user.role)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={user.active ? 'success' : 'error'}>
            {user.active ? 'Active' : 'Inactive'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Email Verified">
          <Tag color={user.emailVerified ? 'success' : 'warning'}>
            {user.emailVerified ? 'Verified' : 'Unverified'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Auth Provider">
          <Tag color={user.authProvider === 'LOCAL' ? 'default' : 'blue'}>
            {user.authProvider}
          </Tag>
        </Descriptions.Item>
        {user.authProviderId && (
          <Descriptions.Item label="Provider ID">
            {user.authProviderId}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Has Password">
          <Tag color={user.isNoPassword ? 'warning' : 'success'}>
            {user.isNoPassword ? 'No' : 'Yes'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

UserDetailModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  user: PropTypes.object,
};

