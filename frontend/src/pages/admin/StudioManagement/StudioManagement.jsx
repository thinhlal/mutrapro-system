import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  message,
  Card,
  Typography,
  Modal,
  InputNumber,
  Input,
  Switch,
  Descriptions,
  Alert,
} from 'antd';
import {
  EditOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import {
  getAllStudios,
  getActiveStudioAdmin,
  updateStudio,
} from '../../../services/studioService';
import { formatPrice } from '../../../services/pricingMatrixService';
import styles from './StudioManagement.module.css';

const { Title, Text } = Typography;

const StudioManagement = () => {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [form] = Form.useForm();

  // Fetch all studios
  const fetchStudios = async () => {
    setLoading(true);
    try {
      const response = await getAllStudios();
      if (response.status === 'success' && response.data) {
        setStudios(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load studios list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  // Handle edit studio
  const handleEdit = studio => {
    setSelectedStudio(studio);
    form.setFieldsValue({
      studioName: studio.studioName,
      location: studio.location,
      hourlyRate: studio.hourlyRate,
      freeExternalGuestsLimit: studio.freeExternalGuestsLimit,
      extraGuestFeePerPerson: studio.extraGuestFeePerPerson,
      isActive: studio.isActive,
    });
    setModalVisible(true);
  };

  // Handle form submit
  const handleSubmit = async values => {
    try {
      await updateStudio(selectedStudio.studioId, {
        studioName: values.studioName,
        location: values.location,
        hourlyRate: values.hourlyRate,
        freeExternalGuestsLimit: values.freeExternalGuestsLimit,
        extraGuestFeePerPerson: values.extraGuestFeePerPerson,
        isActive: values.isActive,
      });
      message.success('Studio updated successfully');
      setModalVisible(false);
      form.resetFields();
      fetchStudios();
    } catch (error) {
      const errorMessage =
        error.message || error.response?.data?.message || 'An error occurred';
      message.error(errorMessage);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Studio Name',
      dataIndex: 'studioName',
      key: 'studioName',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{name}</Text>
          {record.location && (
            <Space size="small">
              <EnvironmentOutlined />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.location}
              </Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Hourly Rate',
      dataIndex: 'hourlyRate',
      key: 'hourlyRate',
      width: 150,
      render: rate => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatPrice(rate, 'VND')}/giờ
        </Text>
      ),
      sorter: (a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0),
    },
    {
      title: 'Free Guests',
      dataIndex: 'freeExternalGuestsLimit',
      key: 'freeExternalGuestsLimit',
      width: 120,
      align: 'center',
      render: limit => <Text>{limit || 0}</Text>,
    },
    {
      title: 'Extra Guest Fee',
      dataIndex: 'extraGuestFeePerPerson',
      key: 'extraGuestFeePerPerson',
      width: 150,
      render: fee => <Text>{fee ? formatPrice(fee, 'VND') : '-'}/khách</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: active => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            Studio Management
          </Title>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchStudios}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Alert
          message="Note"
          description="Currently, the system supports a single active studio. Only one studio should be active at a time."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={studios}
          rowKey="studioId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} studios`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Studio"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Studio Name"
            name="studioName"
            rules={[{ required: true, message: 'Please enter studio name' }]}
          >
            <Input placeholder="Enter studio name" />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please enter location' }]}
          >
            <Input placeholder="Enter location" />
          </Form.Item>

          <Form.Item
            label="Hourly Rate (VND)"
            name="hourlyRate"
            rules={[
              { required: true, message: 'Please enter hourly rate' },
              {
                type: 'number',
                min: 0.01,
                message: 'Hourly rate must be greater than 0',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter hourly rate"
              min={0.01}
              step={10000}
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Free External Guests Limit"
            name="freeExternalGuestsLimit"
            rules={[
              { required: true, message: 'Please enter free guests limit' },
              {
                type: 'number',
                min: 0,
                message: 'Free guests limit must be >= 0',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter free guests limit"
              min={0}
              step={1}
            />
          </Form.Item>

          <Form.Item
            label="Extra Guest Fee Per Person (VND)"
            name="extraGuestFeePerPerson"
            rules={[
              { required: true, message: 'Please enter extra guest fee' },
              {
                type: 'number',
                min: 0,
                message: 'Extra guest fee must be >= 0',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter extra guest fee"
              min={0}
              step={10000}
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudioManagement;
