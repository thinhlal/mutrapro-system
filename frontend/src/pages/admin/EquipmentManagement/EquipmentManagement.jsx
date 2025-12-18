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
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
} from '../../../services/equipmentService';
import EquipmentFormModal from '../../../components/modal/EquipmentFormModal/EquipmentFormModal';
import styles from './EquipmentManagement.module.css';

const { Title } = Typography;

const EquipmentManagement = () => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form] = Form.useForm();

  // Fetch all equipment
  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await getAllEquipment(null, true);
      if (response.data) {
        setEquipments(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load equipment list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Handle create new equipment
  const handleCreate = () => {
    setEditMode(false);
    setSelectedEquipment(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Handle edit equipment
  const handleEdit = async equipment => {
    setEditMode(true);
    setSelectedEquipment(equipment);
    setModalVisible(true);
    setEditLoading(true);

    // Fetch equipment detail to get skillIds
    try {
      const response = await getEquipmentById(equipment.equipmentId);
      if (response.data) {
        const equipmentDetail = response.data;
        form.setFieldsValue({
          equipmentName: equipmentDetail.equipmentName,
          brand: equipmentDetail.brand,
          model: equipmentDetail.model,
          description: equipmentDetail.description,
          rentalFee: equipmentDetail.rentalFee,
          totalQuantity: equipmentDetail.totalQuantity,
          isActive: equipmentDetail.isActive,
          skillIds: equipmentDetail.skillIds || [],
        });
        setSelectedEquipment(equipmentDetail);
      }
    } catch (error) {
      message.error('Unable to load equipment details');
      // Fallback to basic data
      form.setFieldsValue({
        equipmentName: equipment.equipmentName,
        brand: equipment.brand,
        model: equipment.model,
        description: equipment.description,
        rentalFee: equipment.rentalFee,
        totalQuantity: equipment.totalQuantity,
        isActive: equipment.isActive,
        skillIds: [],
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (values, imageFile) => {
    setSubmitting(true);
    try {
      const formData = new FormData();

      formData.append('equipmentName', values.equipmentName);
      if (values.brand) {
        formData.append('brand', values.brand);
      }
      if (values.model) {
        formData.append('model', values.model);
      }
      if (values.description) {
        formData.append('description', values.description);
      }
      if (values.rentalFee !== undefined && values.rentalFee !== null) {
        formData.append('rentalFee', values.rentalFee);
      }
      if (values.totalQuantity !== undefined && values.totalQuantity !== null) {
        formData.append('totalQuantity', values.totalQuantity);
      }

      if (editMode) {
        if (values.isActive !== undefined) {
          formData.append('isActive', values.isActive);
        }
        if (values.skillIds) {
          values.skillIds.forEach(skillId => {
            formData.append('skillIds', skillId);
          });
        }
      } else {
        if (values.skillIds) {
          values.skillIds.forEach(skillId => {
            formData.append('skillIds', skillId);
          });
        }
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editMode) {
        await updateEquipment(selectedEquipment.equipmentId, formData);
        message.success('Equipment updated successfully');
      } else {
        await createEquipment(formData);
        message.success('Equipment created successfully');
      }

      setModalVisible(false);
      setSubmitting(false);
      fetchEquipment();
    } catch (error) {
      setSubmitting(false);
      message.error(error.message || 'An error occurred');
    }
  };

  // Format currency
  const formatCurrency = amount => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount);
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
            alt={record.equipmentName}
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
      title: 'Equipment Name',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      sorter: (a, b) => a.equipmentName.localeCompare(b.equipmentName),
    },
    {
      title: 'Brand / Model',
      key: 'brandModel',
      render: (_, record) => (
        <span>
          {record.brand && record.model
            ? `${record.brand} ${record.model}`
            : record.brand || record.model || '-'}
        </span>
      ),
    },
    {
      title: 'Rental Fee',
      dataIndex: 'rentalFee',
      key: 'rentalFee',
      width: 150,
      render: fee => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          {formatCurrency(fee)} VND
        </span>
      ),
      sorter: (a, b) => (a.rentalFee || 0) - (b.rentalFee || 0),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 150,
      render: (_, record) => (
        <Tooltip
          title={`Total: ${record.totalQuantity}, Available: ${record.availableQuantity}`}
        >
          <span>
            {record.availableQuantity || 0} / {record.totalQuantity || 0}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => {
        const available = record.availableQuantity > 0;
        if (!isActive) {
          return <Tag color="error">Inactive</Tag>;
        }
        if (!available) {
          return <Tag color="warning">Unavailable</Tag>;
        }
        return <Tag color="success">Available</Tag>;
      },
      filters: [
        { text: 'Available', value: 'available' },
        { text: 'Unavailable', value: 'unavailable' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => {
        if (value === 'inactive') return !record.isActive;
        if (value === 'unavailable')
          return record.isActive && record.availableQuantity === 0;
        return record.isActive && record.availableQuantity > 0;
      },
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
          loading={
            editLoading && selectedEquipment?.equipmentId === record.equipmentId
          }
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
            Equipment Management
          </Title>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Add Equipment
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchEquipment}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={equipments}
          rowKey="equipmentId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} equipment`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <EquipmentFormModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditLoading(false);
          setSubmitting(false);
        }}
        onSubmit={handleSubmit}
        editMode={editMode}
        initialData={selectedEquipment}
        form={form}
        loading={editLoading || submitting}
      />
    </div>
  );
};

export default EquipmentManagement;
