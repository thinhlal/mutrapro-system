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
  Select,
  Input,
  Switch,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  getPricingMatrix,
  createPricingMatrix,
  updatePricingMatrix,
  deletePricingMatrix,
  formatPrice,
} from '../../../services/pricingMatrixService';
import styles from './PricingMatrixManagement.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const SERVICE_TYPE_OPTIONS = [
  { value: 'transcription', label: 'Transcription' },
  { value: 'arrangement', label: 'Arrangement' },
  { value: 'arrangement_with_recording', label: 'Arrangement + Recording' },
  // NOTE: Recording không có trong options vì không được phép tạo pricing matrix
];

// Unit type options - sẽ được filter dựa trên serviceType
const ALL_UNIT_TYPE_OPTIONS = [
  { value: 'per_minute', label: 'Per Minute' },
  { value: 'per_song', label: 'Per Song' },
];

const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND (Vietnamese Dong)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
];

const PricingMatrixManagement = () => {
  const [pricingList, setPricingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [form] = Form.useForm();

  // Fetch all pricing matrix
  const fetchPricingMatrix = async () => {
    setLoading(true);
    try {
      const response = await getPricingMatrix();
      if (response.status === 'success' && response.data) {
        // Filter out recording pricing (không hiển thị trong admin)
        const filtered = response.data.filter(
          p => p.serviceType !== 'recording'
        );
        setPricingList(filtered);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load pricing matrix list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingMatrix();
  }, []);

  // Handle create new pricing
  const handleCreate = () => {
    setEditMode(false);
    setSelectedPricing(null);
    form.resetFields();
    form.setFieldsValue({
      currency: 'VND',
      isActive: true,
    });
    setModalVisible(true);
  };

  // Handle edit pricing
  const handleEdit = pricing => {
    setEditMode(true);
    setSelectedPricing(pricing);
    form.setFieldsValue({
      unitType: pricing.unitType,
      basePrice: pricing.basePrice,
      currency: pricing.currency,
      description: pricing.description,
      isActive: pricing.active,
    });
    setModalVisible(true);
  };

  // Handle delete pricing
  const handleDelete = pricing => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete pricing matrix for ${pricing.serviceType}? This will deactivate it (soft delete).`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deletePricingMatrix(pricing.pricingId);
          message.success('Pricing matrix deleted successfully');
          fetchPricingMatrix();
        } catch (error) {
          message.error(error.message || 'Failed to delete pricing matrix');
        }
      },
    });
  };

  // Handle form submit
  const handleSubmit = async values => {
    try {
      if (editMode) {
        await updatePricingMatrix(selectedPricing.pricingId, {
          unitType: values.unitType,
          basePrice: values.basePrice,
          currency: values.currency,
          description: values.description,
          isActive: values.isActive,
        });
        message.success('Pricing matrix updated successfully');
      } else {
        await createPricingMatrix({
          serviceType: values.serviceType,
          unitType: values.unitType,
          basePrice: values.basePrice,
          currency: values.currency || 'VND',
          description: values.description,
          isActive: values.isActive !== undefined ? values.isActive : true,
        });
        message.success('Pricing matrix created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchPricingMatrix();
    } catch (error) {
      const errorMessage =
        error.message || error.response?.data?.message || 'An error occurred';
      message.error(errorMessage);
    }
  };

  // Get service type display name
  const getServiceTypeName = serviceType => {
    const names = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
      arrangement_with_recording: 'Arrangement + Recording',
      recording: 'Recording',
    };
    return names[serviceType] || serviceType;
  };

  // Get unit type display name
  const getUnitTypeName = unitType => {
    const names = {
      per_minute: 'Per Minute',
      per_song: 'Per Song',
    };
    return names[unitType] || unitType;
  };

  // Get allowed unit types based on service type
  const getAllowedUnitTypes = serviceType => {
    if (serviceType === 'transcription') {
      return [{ value: 'per_minute', label: 'Per Minute' }];
    }
    if (
      serviceType === 'arrangement' ||
      serviceType === 'arrangement_with_recording'
    ) {
      return [{ value: 'per_song', label: 'Per Song' }];
    }
    return ALL_UNIT_TYPE_OPTIONS;
  };

  // Table columns
  const columns = [
    {
      title: 'Service Type',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 200,
      render: serviceType => (
        <Tag color="blue">{getServiceTypeName(serviceType)}</Tag>
      ),
      filters: SERVICE_TYPE_OPTIONS.map(opt => ({
        text: opt.label,
        value: opt.value,
      })),
      onFilter: (value, record) => record.serviceType === value,
    },
    {
      title: 'Unit Type',
      dataIndex: 'unitType',
      key: 'unitType',
      width: 150,
      render: unitType => <Tag color="green">{getUnitTypeName(unitType)}</Tag>,
    },
    {
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 200,
      render: (price, record) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatPrice(price, record.currency)}
        </Text>
      ),
      sorter: (a, b) => (a.basePrice || 0) - (b.basePrice || 0),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
      render: currency => <Tag>{currency}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: description => description || '-',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
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
      onFilter: (value, record) => record.active === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            Pricing Matrix Management
          </Title>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Add Pricing
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPricingMatrix}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={pricingList}
          rowKey="pricingId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} pricing matrices`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editMode ? 'Edit Pricing Matrix' : 'Create Pricing Matrix'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            currency: 'VND',
            isActive: true,
          }}
        >
          {!editMode && (
            <Form.Item
              label="Service Type"
              name="serviceType"
              rules={[
                { required: true, message: 'Please select service type' },
              ]}
            >
              <Select
                placeholder="Select service type"
                onChange={value => {
                  // Auto-set unit type based on service type
                  const allowedUnitTypes = getAllowedUnitTypes(value);
                  if (allowedUnitTypes.length === 1) {
                    form.setFieldsValue({
                      unitType: allowedUnitTypes[0].value,
                    });
                  } else {
                    form.setFieldsValue({ unitType: undefined });
                  }
                }}
              >
                {SERVICE_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {editMode && (
            <Form.Item label="Service Type">
              <Tag color="blue">
                {getServiceTypeName(selectedPricing?.serviceType)}
              </Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                (Cannot be changed)
              </Text>
            </Form.Item>
          )}

          <Form.Item
            label="Unit Type"
            name="unitType"
            dependencies={!editMode ? ['serviceType'] : []}
            rules={[
              { required: true, message: 'Please select unit type' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (editMode) {
                    return Promise.resolve();
                  }
                  const serviceType = getFieldValue('serviceType');
                  if (!serviceType || !value) {
                    return Promise.resolve();
                  }
                  const allowedUnitTypes = getAllowedUnitTypes(serviceType);
                  if (allowedUnitTypes.some(opt => opt.value === value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      `Unit type must be ${allowedUnitTypes[0].label} for ${getServiceTypeName(serviceType)}`
                    )
                  );
                },
              }),
            ]}
          >
            <Select
              placeholder="Select unit type"
              disabled={editMode}
              options={
                editMode
                  ? getAllowedUnitTypes(selectedPricing?.serviceType)
                  : form.getFieldValue('serviceType')
                    ? getAllowedUnitTypes(form.getFieldValue('serviceType'))
                    : ALL_UNIT_TYPE_OPTIONS
              }
            />
          </Form.Item>

          <Form.Item
            label="Base Price"
            name="basePrice"
            rules={[
              { required: true, message: 'Please enter base price' },
              {
                type: 'number',
                min: 0.01,
                message: 'Base price must be greater than 0',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter base price"
              min={0.01}
              step={1000}
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Currency"
            name="currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select placeholder="Select currency">
              {CURRENCY_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              rows={3}
              placeholder="Enter description (optional)"
              maxLength={500}
              showCount
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

export default PricingMatrixManagement;
