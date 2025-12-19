import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  message,
  Card,
  Image,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  getAllNotationInstruments,
  createNotationInstrument,
  updateNotationInstrument,
} from '../../../services/notationInstrumentService';
import InstrumentFormModal from '../../../components/modal/InstrumentFormModal/InstrumentFormModal';
import styles from './NotationInstruments.module.css';

const { Title } = Typography;

const NotationInstruments = () => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
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
      message.error(error.message || 'Unable to load instruments list');
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
    form.resetFields();
    setModalVisible(true);
  };

  // Handle edit instrument
  const handleEdit = instrument => {
    setEditMode(true);
    setSelectedInstrument(instrument);
    form.setFieldsValue({
      instrumentName: instrument.instrumentName,
      usage: instrument.usage,
      active: instrument.active,
      basePrice: instrument.basePrice,
    });
    setModalVisible(true);
  };

  // Handle form submit
  const handleSubmit = async (values, imageFile) => {
    try {
      const formData = new FormData();

      formData.append('instrumentName', values.instrumentName);
      formData.append('usage', values.usage);
      formData.append('basePrice', values.basePrice || 0);

      if (editMode) {
        formData.append(
          'isActive',
          values.active !== undefined ? values.active : true
        );
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editMode) {
        await updateNotationInstrument(
          selectedInstrument.instrumentId,
          formData
        );
        message.success('Instrument updated successfully');
      } else {
        await createNotationInstrument(formData);
        message.success('Instrument created successfully');
      }

      setModalVisible(false);
      fetchInstruments();
    } catch (error) {
      message.error(error.message || 'An error occurred');
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
      width: 250,
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
      width: 150,
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
        title={
          <Title level={3} style={{ margin: 0 }}>
            Notation Instruments
          </Title>
        }
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
      <InstrumentFormModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        editMode={editMode}
        initialData={selectedInstrument}
        form={form}
      />
    </div>
  );
};

export default NotationInstruments;
