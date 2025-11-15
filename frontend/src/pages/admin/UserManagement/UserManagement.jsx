import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  message,
  Popconfirm,
  Card,
  Typography,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getAllUsers,
  getUserProfile,
  updateFullUser,
  deleteUser,
} from '../../../services/userService';
import UserEditModal from '../../../components/modal/UserEditModal/UserEditModal';
import UserDetailModal from '../../../components/modal/UserDetailModal/UserDetailModal';
import styles from './UserManagement.module.css';

const { Title } = Typography;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getAllUsers();
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle edit user
  const handleEdit = async user => {
    try {
      const response = await getUserProfile(user.userId);
      setSelectedUser(response.data);
      form.setFieldsValue({
        fullName: response.data.fullName,
        phone: response.data.phone,
        address: response.data.address,
        role: response.data.role,
        emailVerified: response.data.emailVerified,
        active: response.data.active,
      });
      setEditModalVisible(true);
    } catch (error) {
      message.error('Unable to load user information');
    }
  };

  // Handle view user details
  const handleView = async user => {
    try {
      const response = await getUserProfile(user.userId);
      setSelectedUser(response.data);
      setViewModalVisible(true);
    } catch (error) {
      message.error('Unable to load user information');
    }
  };

  // Handle update user
  const handleUpdate = async values => {
    try {
      await updateFullUser(selectedUser.userId, {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        emailVerified: values.emailVerified,
        isActive: values.active,
      });
      message.success('User updated successfully');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('Update user error:', error);
      const errorMsg = error.message || error.error || 'Unable to update user';
      message.error(errorMsg, 5); // Show error for 5 seconds
    }
  };

  // Handle delete user
  const handleDelete = async userId => {
    try {
      await deleteUser(userId);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      message.error(error.message || 'Unable to delete user');
    }
  };

  // Get role color
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

  // Get role display name
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

  // Table columns
  const columns = [
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: role => (
        <Tag color={getRoleColor(role)}>{getRoleDisplayName(role)}</Tag>
      ),
      filters: [
        { text: 'System Admin', value: 'SYSTEM_ADMIN' },
        { text: 'Manager', value: 'MANAGER' },
        { text: 'Customer', value: 'CUSTOMER' },
        { text: 'Transcription', value: 'TRANSCRIPTION' },
        { text: 'Arrangement', value: 'ARRANGEMENT' },
        { text: 'Recording Artist', value: 'RECORDING_ARTIST' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Space>
          <Tag color={record.active ? 'success' : 'error'}>
            {record.active ? 'Active' : 'Inactive'}
          </Tag>
          <Tag color={record.emailVerified ? 'success' : 'warning'}>
            {record.emailVerified ? 'Verified' : 'Unverified'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Auth Provider',
      dataIndex: 'authProvider',
      key: 'authProvider',
      render: provider => (
        <Tag color={provider === 'LOCAL' ? 'default' : 'blue'}>{provider}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa người dùng này?"
            onConfirm={() => handleDelete(record.userId)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.userManagement}>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>User Management</Title>}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="userId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} users`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Edit User Modal */}
      <UserEditModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onSubmit={handleUpdate}
        form={form}
      />

      {/* View User Details Modal */}
      <UserDetailModal
        visible={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default UserManagement;
