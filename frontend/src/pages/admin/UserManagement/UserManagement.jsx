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
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  searchUsers,
  getUserProfile,
  updateFullUser,
  deleteUser,
  createFullUser,
} from '../../../services/userService';
import UserEditModal from '../../../components/modal/UserEditModal/UserEditModal';
import UserDetailModal from '../../../components/modal/UserDetailModal/UserDetailModal';
import UserCreateModal from '../../../components/modal/UserCreateModal/UserCreateModal';
import styles from './UserManagement.module.css';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  // Search and filter state
  const [filters, setFilters] = useState({
    keyword: null,
    role: null,
    emailVerified: null,
    authProvider: null,
    page: 0,
    size: 20,
    sortBy: 'createdAt',
    sortDirection: 'DESC',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Fetch users with search and filters
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await searchUsers(filters);
      if (response.status === 'success' && response.data) {
        setUsers(response.data.users || []);
        setPagination({
          current: response.data.currentPage + 1,
          pageSize: response.data.pageSize,
          total: response.data.totalElements,
        });
      }
    } catch (error) {
      message.error(error.message || 'Unable to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Handle search
  const handleSearch = value => {
    setFilters(prev => ({
      ...prev,
      keyword: value || null,
      page: 0,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value !== undefined && value !== null && value !== '' ? value : null,
      page: 0,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      keyword: null,
      role: null,
      emailVerified: null,
      authProvider: null,
      page: 0,
      size: 20,
      sortBy: 'createdAt',
      sortDirection: 'DESC',
    });
    setPagination({
      current: 1,
      pageSize: 20,
      total: 0,
    });
  };

  // Handle pagination change
  const handlePaginationChange = (page, pageSize) => {
    setFilters(prev => ({
      ...prev,
      page: page - 1,
      size: pageSize,
    }));
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize,
    }));
  };

  // Handle table change (sorting, etc.)
  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter && sorter.field) {
      // Map frontend field names to backend field names (UsersAuth entity fields)
      // Note: fullName is not sortable as it's in User entity, not UsersAuth
      const fieldMapping = {
        email: 'email',
        role: 'role',
        createdAt: 'createdAt',
      };
      
      // Only sort if field is in mapping (backend supports it)
      if (fieldMapping[sorter.field]) {
        const sortBy = fieldMapping[sorter.field];
        const sortDirection = sorter.order === 'ascend' ? 'ASC' : 'DESC';
        
        setFilters(prev => ({
          ...prev,
          sortBy: sortBy,
          sortDirection: sortDirection,
          page: 0,
        }));
        setPagination(prev => ({ ...prev, current: 1 }));
      }
    }
  };

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

  // Handle create user
  const handleCreate = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  // Handle create user submit
  const handleCreateSubmit = async values => {
    setCreateLoading(true);
    try {
      await createFullUser({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        role: values.role,
        phone: values.phone || null,
        address: values.address || null,
        emailVerified: values.emailVerified || false,
        isActive: values.isActive !== undefined ? values.isActive : true,
      });
      message.success('User created successfully');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Create user error:', error);
      const errorMsg = error.message || error.error || 'Unable to create user';
      message.error(errorMsg, 5);
    } finally {
      setCreateLoading(false);
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
      width: 150,
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: false, // Not sortable (field is in User entity, not UsersAuth)
      ellipsis: true,
    },
    {
      title: 'Email',
      width: 200,
      dataIndex: 'email',
      key: 'email',
      sorter: true, // Sortable (field is in UsersAuth entity)
      ellipsis: true,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 130,
      key: 'role',
      render: role => (
        <Tag color={getRoleColor(role)}>{getRoleDisplayName(role)}</Tag>
      ),
      sorter: true, // Sortable (field is in UsersAuth entity)
    },
    {
      title: 'Status',
      width: 150,
      key: 'status',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color={record.active ? 'success' : 'error'}>
            {record.active ? 'Active' : 'Inactive'}
          </Tag>
          <Tag color={record.emailVerified ? 'success' : 'warning'}>
            {record.emailVerified ? 'Verified' : 'Unverified'}
          </Tag>
        </Space>
      ),
    },
    // {
    //   title: 'Phone',
    //   width: 140,
    //   dataIndex: 'phone',
    //   key: 'phone',
    // },
    {
      title: 'Auth Provider',
      dataIndex: 'authProvider',
      width: 120,
      key: 'authProvider',
      render: provider => (
        <Tag color={provider === 'LOCAL' ? 'default' : 'blue'}>{provider}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size="small">
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
        title={
          <Title level={3} style={{ margin: 0 }}>
            User Management
          </Title>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create User
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {/* Search and Filters */}
        <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="Search by email, name, phone..."
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                size="large"
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Role"
                allowClear
                style={{ width: '100%' }}
                size="large"
                value={filters.role}
                onChange={value => handleFilterChange('role', value)}
              >
                <Option value="SYSTEM_ADMIN">System Admin</Option>
                <Option value="MANAGER">Manager</Option>
                <Option value="CUSTOMER">Customer</Option>
                <Option value="TRANSCRIPTION">Transcription</Option>
                <Option value="ARRANGEMENT">Arrangement</Option>
                <Option value="RECORDING_ARTIST">Recording Artist</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Email Verified"
                allowClear
                style={{ width: '100%' }}
                size="large"
                value={filters.emailVerified}
                onChange={value => handleFilterChange('emailVerified', value)}
              >
                <Option value={true}>Verified</Option>
                <Option value={false}>Unverified</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Auth Provider"
                allowClear
                style={{ width: '100%' }}
                size="large"
                value={filters.authProvider}
                onChange={value => handleFilterChange('authProvider', value)}
              >
                <Option value="LOCAL">Local</Option>
                <Option value="GOOGLE">Google</Option>
              </Select>
            </Col>
          </Row>
          {(filters.keyword ||
            filters.role ||
            filters.emailVerified !== null ||
            filters.authProvider) && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          )}
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="userId"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} users`,
            onChange: handlePaginationChange,
            onShowSizeChange: handlePaginationChange,
          }}
          onChange={handleTableChange}
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

      {/* Create User Modal */}
      <UserCreateModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSubmit={handleCreateSubmit}
        form={createForm}
        loading={createLoading}
      />
    </div>
  );
};

export default UserManagement;
