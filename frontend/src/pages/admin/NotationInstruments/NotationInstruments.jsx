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
  Upload,
  message,
  Card,
  Image,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  getAllNotationInstruments,
  createNotationInstrument,
  updateNotationInstrument,
} from '../../../services/notationInstrumentService';
import styles from './NotationInstruments.module.css';

const { Option } = Select;

const NotationInstruments = () => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form] = Form.useForm();

  // Fetch all instruments
  const fetchInstruments = async () => {
    setLoading(true);
    try {
      const response = await getAllNotationInstruments(null, true);
      if (response.data) {
        setInstruments(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách nhạc cụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  // Handle create new instrument
  const handleCreate = () => {
    setEditMode(false);
    setSelectedInstrument(null);
    setImageFile(null);
    setImagePreview(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Handle edit instrument
  const handleEdit = instrument => {
    setEditMode(true);
    setSelectedInstrument(instrument);
    setImageFile(null);
    setImagePreview(instrument.image);
    form.setFieldsValue({
      instrumentName: instrument.instrumentName,
      usage: instrument.usage,
      active: instrument.active,
      basePrice: instrument.basePrice,
    });
    setModalVisible(true);
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();

      formData.append('instrumentName', values.instrumentName);
      formData.append('usage', values.usage);
      formData.append('basePrice', values.basePrice || 0);

      if (editMode) {
        formData.append('isActive', values.active !== undefined ? values.active : true);
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editMode) {
        await updateNotationInstrument(
          selectedInstrument.instrumentId,
          formData
        );
        message.success('Cập nhật nhạc cụ thành công');
      } else {
        await createNotationInstrument(formData);
        message.success('Tạo nhạc cụ mới thành công');
      }

      setModalVisible(false);
      fetchInstruments();
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra');
    }
  };

  // Handle image change
  const handleImageChange = info => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get usage color
  const getUsageColor = usage => {
    const colors = {
      transcription: 'blue',
      arrangement: 'green',
      both: 'purple',
    };
    return colors[usage] || 'default';
  };

  // Get usage display name
  const getUsageDisplayName = usage => {
    const names = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
      both: 'Both',
    };
    return names[usage] || usage;
  };

  // Upload props
  const uploadProps = {
    beforeUpload: file => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ có thể upload file ảnh!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      return false;
    },
    onChange: handleImageChange,
    maxCount: 1,
    accept: 'image/*',
  };

  // Table columns
  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      width: 100,
      render: (image, record) =>
        image ? (
          <Image
            src={image}
            alt={record.instrumentName}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              fontSize: 12,
              color: '#999',
            }}
          >
            No Image
          </div>
        ),
    },
    {
      title: 'Instrument Name',
      dataIndex: 'instrumentName',
      key: 'instrumentName',
      sorter: (a, b) => a.instrumentName.localeCompare(b.instrumentName),
    },
    {
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 120,
      render: price => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          ${price ? Number(price).toFixed(2) : '0.00'}
        </span>
      ),
      sorter: (a, b) => (a.basePrice || 0) - (b.basePrice || 0),
    },
    {
      title: 'Usage',
      dataIndex: 'usage',
      key: 'usage',
      render: usage => (
        <Tag color={getUsageColor(usage)}>{getUsageDisplayName(usage)}</Tag>
      ),
      filters: [
        { text: 'Transcription', value: 'transcription' },
        { text: 'Arrangement', value: 'arrangement' },
        { text: 'Both', value: 'both' },
      ],
      onFilter: (value, record) => record.usage === value,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
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
      width: 120,
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
        title={<h2 style={{ margin: 0 }}>Notation Instruments</h2>}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Add Instrument
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchInstruments}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={instruments}
          rowKey="instrumentId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} instruments`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editMode ? 'Edit Instrument' : 'Create New Instrument'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editMode ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Instrument Name"
            name="instrumentName"
            rules={[
              { required: true, message: 'Please input instrument name!' },
            ]}
          >
            <Input placeholder="e.g., Piano, Guitar, Violin" />
          </Form.Item>

          <Form.Item
            label="Usage"
            name="usage"
            rules={[{ required: true, message: 'Please select usage!' }]}
          >
            <Select placeholder="Select usage type">
              <Option value="transcription">Transcription</Option>
              <Option value="arrangement">Arrangement</Option>
              <Option value="both">Both</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Base Price (USD)"
            name="basePrice"
            rules={[
              { required: true, message: 'Please input base price!' },
              { type: 'number', min: 0, message: 'Price must be positive!' },
            ]}
          >
            <Input
              type="number"
              step="0.01"
              placeholder="e.g., 50.00"
              prefix="$"
            />
          </Form.Item>

          {editMode && (
            <Form.Item
              label="Active"
              name="active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}

          <Form.Item label="Instrument Image">
            <Upload {...uploadProps} listType="picture-card">
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
            {imagePreview && (
              <div style={{ marginTop: 10 }}>
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={200}
                  style={{ borderRadius: 4 }}
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotationInstruments;

