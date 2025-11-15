import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  InputNumber,
  Modal,
  message,
  Card,
  Typography,
  Descriptions,
} from 'antd';
import {
  EditOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  getAllSpecialists,
  getSpecialistById,
  createSpecialist,
  updateSpecialistStatus,
  updateSpecialistSettings,
  filterSpecialists,
} from '../../../services/specialistService';
import styles from './SpecialistManagement.module.css';

const { Title } = Typography;
const { Option } = Select;

const SpecialistManagement = () => {
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [createForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [filters, setFilters] = useState({
    specialization: null,
    status: null,
  });

  // Fetch all specialists
  const fetchSpecialists = async () => {
    setLoading(true);
    try {
      let response;
      if (filters.specialization || filters.status) {
        response = await filterSpecialists(filters.specialization, filters.status);
      } else {
        response = await getAllSpecialists();
      }
      if (response.data) {
        setSpecialists(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách specialist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialists();
  }, [filters]);

  // Handle create specialist
  const handleCreate = async values => {
    setCreateLoading(true);
    try {
      await createSpecialist({
        email: values.email,
        specialization: values.specialization,
        maxConcurrentTasks: values.maxConcurrentTasks || 5,
      });
      message.success('Tạo specialist thành công');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchSpecialists();
    } catch (error) {
      const errorMsg = error.message || error.error || 'Không thể tạo specialist';
      message.error(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle view specialist details
  const handleView = async specialist => {
    try {
      const response = await getSpecialistById(specialist.specialistId);
      setSelectedSpecialist(response.data);
      setViewModalVisible(true);
    } catch (error) {
      message.error('Không thể tải thông tin specialist');
    }
  };

  // Handle update status
  const handleUpdateStatus = async specialist => {
    setSelectedSpecialist(specialist);
    statusForm.setFieldsValue({ status: specialist.status });
    setStatusModalVisible(true);
  };

  const handleStatusSubmit = async values => {
    setStatusLoading(true);
    try {
      await updateSpecialistStatus(selectedSpecialist.specialistId, values.status);
      message.success('Cập nhật status thành công');
      setStatusModalVisible(false);
      fetchSpecialists();
    } catch (error) {
      const errorMsg = error.message || error.error || 'Không thể cập nhật status';
      message.error(errorMsg);
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle update settings
  const handleUpdateSettings = async specialist => {
    setSelectedSpecialist(specialist);
    settingsForm.setFieldsValue({
      maxConcurrentTasks: specialist.maxConcurrentTasks,
    });
    setSettingsModalVisible(true);
  };

  const handleSettingsSubmit = async values => {
    setSettingsLoading(true);
    try {
      await updateSpecialistSettings(selectedSpecialist.specialistId, values);
      message.success('Cập nhật settings thành công');
      setSettingsModalVisible(false);
      fetchSpecialists();
    } catch (error) {
      const errorMsg = error.message || error.error || 'Không thể cập nhật settings';
      message.error(errorMsg);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Get status color
  const getStatusColor = status => {
    const colors = {
      ACTIVE: 'green',
      SUSPENDED: 'orange',
      INACTIVE: 'red',
    };
    return colors[status] || 'default';
  };

  // Get status display name
  const getStatusDisplayName = status => {
    const names = {
      ACTIVE: 'Active',
      SUSPENDED: 'Suspended',
      INACTIVE: 'Inactive',
    };
    return names[status] || status;
  };

  // Get specialization display name
  const getSpecializationDisplayName = specialization => {
    const names = {
      TRANSCRIPTION: 'Transcription',
      ARRANGEMENT: 'Arrangement',
      RECORDING_ARTIST: 'Recording Artist',
    };
    return names[specialization] || specialization;
  };

  // Table columns
  const columns = [
    {
      title: 'Specialist ID',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 200,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
    },
    {
      title: 'Specialization',
      dataIndex: 'specialization',
      key: 'specialization',
      render: specialization => (
        <Tag color="blue">{getSpecializationDisplayName(specialization)}</Tag>
      ),
      filters: [
        { text: 'Transcription', value: 'TRANSCRIPTION' },
        { text: 'Arrangement', value: 'ARRANGEMENT' },
        { text: 'Recording Artist', value: 'RECORDING_ARTIST' },
      ],
      onFilter: (value, record) => record.specialization === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={getStatusColor(status)}>{getStatusDisplayName(status)}</Tag>
      ),
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Suspended', value: 'SUSPENDED' },
        { text: 'Inactive', value: 'INACTIVE' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Max Concurrent Tasks',
      dataIndex: 'maxConcurrentTasks',
      key: 'maxConcurrentTasks',
      align: 'center',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      align: 'center',
      render: rating => rating?.toFixed(2) || '0.00',
    },
    {
      title: 'Total Projects',
      dataIndex: 'totalProjects',
      key: 'totalProjects',
      align: 'center',
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 300,
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
            onClick={() => handleUpdateStatus(record)}
          >
            Status
          </Button>
          <Button
            type="link"
            onClick={() => handleUpdateSettings(record)}
          >
            Settings
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.specialistManagement}>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>Specialist Management</Title>}
        extra={
          <Space>
            <Select
              placeholder="Filter by Specialization"
              allowClear
              style={{ width: 200 }}
              onChange={value => setFilters({ ...filters, specialization: value })}
            >
              <Option value="TRANSCRIPTION">Transcription</Option>
              <Option value="ARRANGEMENT">Arrangement</Option>
              <Option value="RECORDING_ARTIST">Recording Artist</Option>
            </Select>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 150 }}
              onChange={value => setFilters({ ...filters, status: value })}
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="INACTIVE">Inactive</Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Create Specialist
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchSpecialists}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={specialists}
          rowKey="specialistId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} specialists`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Create Specialist Modal */}
      <Modal
        title="Create Specialist"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setCreateLoading(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createLoading}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="Enter user email" />
          </Form.Item>
          <Form.Item
            name="specialization"
            label="Specialization"
            rules={[{ required: true, message: 'Vui lòng chọn specialization' }]}
          >
            <Select placeholder="Select specialization">
              <Option value="TRANSCRIPTION">Transcription</Option>
              <Option value="ARRANGEMENT">Arrangement</Option>
              <Option value="RECORDING_ARTIST">Recording Artist</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="maxConcurrentTasks"
            label="Max Concurrent Tasks"
            initialValue={5}
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Specialist Details Modal */}
      <Modal
        title="Specialist Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedSpecialist && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Specialist ID" span={2}>
              {selectedSpecialist.specialistId}
            </Descriptions.Item>
            <Descriptions.Item label="User ID" span={2}>
              {selectedSpecialist.userId}
            </Descriptions.Item>
            <Descriptions.Item label="Specialization">
              <Tag color="blue">
                {getSpecializationDisplayName(selectedSpecialist.specialization)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedSpecialist.status)}>
                {getStatusDisplayName(selectedSpecialist.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Experience Years">
              {selectedSpecialist.experienceYears || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Max Concurrent Tasks">
              {selectedSpecialist.maxConcurrentTasks}
            </Descriptions.Item>
            <Descriptions.Item label="Rating">
              {selectedSpecialist.rating?.toFixed(2) || '0.00'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Projects">
              {selectedSpecialist.totalProjects || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Portfolio URL" span={2}>
              {selectedSpecialist.portfolioUrl || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Bio" span={2}>
              {selectedSpecialist.bio || 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal
        title="Update Specialist Status"
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false);
          setStatusLoading(false);
          statusForm.resetFields();
        }}
        onOk={() => statusForm.submit()}
        confirmLoading={statusLoading}
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleStatusSubmit}
        >
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Vui lòng chọn status' }]}
          >
            <Select placeholder="Select status">
              <Option value="ACTIVE">Active</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="INACTIVE">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Settings Modal */}
      <Modal
        title="Update Specialist Settings"
        open={settingsModalVisible}
        onCancel={() => {
          setSettingsModalVisible(false);
          setSettingsLoading(false);
          settingsForm.resetFields();
        }}
        onOk={() => settingsForm.submit()}
        confirmLoading={settingsLoading}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSettingsSubmit}
        >
          <Form.Item
            name="maxConcurrentTasks"
            label="Max Concurrent Tasks"
            rules={[
              { required: true, message: 'Vui lòng nhập max concurrent tasks' },
              { type: 'number', min: 1, max: 20, message: 'Phải từ 1 đến 20' },
            ]}
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SpecialistManagement;

