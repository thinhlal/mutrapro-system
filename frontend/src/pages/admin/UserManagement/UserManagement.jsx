import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Card,
  Descriptions,
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
import styles from './UserManagement.module.css';

const { Option } = Select;

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
      message.error(error.message || 'Không thể tải danh sách người dùng');
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
      message.error('Không thể tải thông tin người dùng');
    }
  };

  // Handle view user details
  const handleView = async user => {
    try {
      const response = await getUserProfile(user.userId);
      setSelectedUser(response.data);
      setViewModalVisible(true);
    } catch (error) {
      message.error('Không thể tải thông tin người dùng');
    }
  };

  // Handle update user
  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      await updateFullUser(selectedUser.userId, {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        emailVerified: values.emailVerified,
        isActive: values.active,
      });
      message.success('Cập nhật người dùng thành công');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật người dùng');
    }
  };

  // Handle delete user
  const handleDelete = async userId => {
    try {
      await deleteUser(userId);
      message.success('Xóa người dùng thành công');
      fetchUsers();
    } catch (error) {
      message.error(error.message || 'Không thể xóa người dùng');
    }
  };

  // Get role color
  const getRoleColor = role => {
    const colors = {
      SYSTEM_ADMIN: 'red',
      SERVICE_COORDINATOR: 'blue',
      CUSTOMER: 'green',
      TRANSCRIPTION_SPECIALIST: 'purple',
      ARRANGEMENT_SPECIALIST: 'orange',
      RECORDING_ARTIST: 'cyan',
    };
    return colors[role] || 'default';
  };

  // Get role display name
  const getRoleDisplayName = role => {
    const names = {
      SYSTEM_ADMIN: 'System Admin',
      SERVICE_COORDINATOR: 'Coordinator',
      CUSTOMER: 'Customer',
      TRANSCRIPTION_SPECIALIST: 'Transcription Specialist',
      ARRANGEMENT_SPECIALIST: 'Arrangement Specialist',
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
        { text: 'Coordinator', value: 'SERVICE_COORDINATOR' },
        { text: 'Customer', value: 'CUSTOMER' },
        { text: 'Transcription Specialist', value: 'TRANSCRIPTION_SPECIALIST' },
        { text: 'Arrangement Specialist', value: 'ARRANGEMENT_SPECIALIST' },
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
        title={<h2 style={{ margin: 0 }}>User Management</h2>}
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
      <Modal
        title="Edit User"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => setEditModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please input full name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Email Verified" name="emailVerified" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Active" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* View User Details Modal */}
      <Modal
        title="User Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedUser && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="User ID">
              {selectedUser.userId}
            </Descriptions.Item>
            <Descriptions.Item label="Full Name">
              {selectedUser.fullName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedUser.email}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedUser.phone || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Address">
              {selectedUser.address || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={getRoleColor(selectedUser.role)}>
                {getRoleDisplayName(selectedUser.role)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedUser.active ? 'success' : 'error'}>
                {selectedUser.active ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Email Verified">
              <Tag color={selectedUser.emailVerified ? 'success' : 'warning'}>
                {selectedUser.emailVerified ? 'Verified' : 'Unverified'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Auth Provider">
              <Tag
                color={
                  selectedUser.authProvider === 'LOCAL' ? 'default' : 'blue'
                }
              >
                {selectedUser.authProvider}
              </Tag>
            </Descriptions.Item>
            {selectedUser.authProviderId && (
              <Descriptions.Item label="Provider ID">
                {selectedUser.authProviderId}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Has Password">
              <Tag color={selectedUser.isNoPassword ? 'warning' : 'success'}>
                {selectedUser.isNoPassword ? 'No' : 'Yes'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;

