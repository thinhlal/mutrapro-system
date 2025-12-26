import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Switch,
  Modal,
  message,
  Card,
  Typography,
  Popconfirm,
  Select,
} from 'antd';
import toast from 'react-hot-toast';
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
} from '../../../services/specialistService';
import styles from './SkillManagement.module.css';

const { Title } = Typography;
const { TextArea } = Input;

const SkillManagement = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch all skills
  const fetchSkills = async () => {
    setLoading(true);
    try {
      const response = await getAllSkills();
      if (response.data) {
        setSkills(response.data);
      }
    } catch (error) {
      toast.error(error.message || 'Không thể tải danh sách skills', { duration: 5000, position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Handle create skill
  const handleCreate = async values => {
    setCreateLoading(true);
    try {
      await createSkill({
        skillName: values.skillName,
        skillType: values.skillType,
        recordingCategory:
          values.skillType === 'RECORDING_ARTIST'
            ? values.recordingCategory
            : undefined,
        description: values.description,
        isActive: values.isActive !== false,
      });
      message.success('Tạo skill thành công');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchSkills();
    } catch (error) {
      const errorMsg = error.message || error.error || 'Không thể tạo skill';
      toast.error(errorMsg, { duration: 5000, position: 'top-center' });
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle edit skill
  const handleEdit = async skill => {
    setSelectedSkill(skill);
    editForm.setFieldsValue({
      skillName: skill.skillName,
      skillType: skill.skillType,
      recordingCategory: skill.recordingCategory,
      description: skill.description,
      isActive: skill.isActive,
    });
    setEditModalVisible(true);
  };

  // Handle update skill
  const handleUpdate = async values => {
    setEditLoading(true);
    try {
      await updateSkill(selectedSkill.skillId, {
        skillName: values.skillName,
        skillType: values.skillType,
        recordingCategory:
          values.skillType === 'RECORDING_ARTIST'
            ? values.recordingCategory
            : undefined,
        description: values.description,
        isActive: values.isActive,
      });
      message.success('Cập nhật skill thành công');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchSkills();
    } catch (error) {
      const errorMsg =
        error.message || error.error || 'Không thể cập nhật skill';
      toast.error(errorMsg, { duration: 5000, position: 'top-center' });
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete skill
  const handleDelete = async skillId => {
    try {
      await deleteSkill(skillId);
      message.success('Xóa skill thành công');
      fetchSkills();
    } catch (error) {
      const errorMsg = error.message || error.error || 'Không thể xóa skill';
      toast.error(errorMsg, { duration: 5000, position: 'top-center' });
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Skill ID',
      dataIndex: 'skillId',
      key: 'skillId',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Skill Name',
      dataIndex: 'skillName',
      key: 'skillName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => (a.skillName || '').localeCompare(b.skillName || ''),
    },
    {
      title: 'Skill Type',
      dataIndex: 'skillType',
      key: 'skillType',
      width: 130,
      render: skillType => {
        const typeColors = {
          TRANSCRIPTION: 'blue',
          ARRANGEMENT: 'green',
          RECORDING_ARTIST: 'purple',
        };
        const typeLabels = {
          TRANSCRIPTION: 'Transcription',
          ARRANGEMENT: 'Arrangement',
          RECORDING_ARTIST: 'Recording Artist',
        };
        return (
          <Tag color={typeColors[skillType] || 'default'}>
            {typeLabels[skillType] || skillType}
          </Tag>
        );
      },
      filters: [
        { text: 'Transcription', value: 'TRANSCRIPTION' },
        { text: 'Arrangement', value: 'ARRANGEMENT' },
        { text: 'Recording Artist', value: 'RECORDING_ARTIST' },
      ],
      onFilter: (value, record) => record.skillType === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: isActive => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: date => (date ? new Date(date).toLocaleString() : 'N/A'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa skill này?"
            description="Chỉ có thể xóa khi skill không được sử dụng bởi specialist hoặc demo nào."
            onConfirm={() => handleDelete(record.skillId)}
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
    <div className={styles.skillManagement}>
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            Skill Management
          </Title>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Create Skill
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchSkills}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={skills}
          rowKey="skillId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} skills`,
          }}
        />
      </Card>

      {/* Create Skill Modal */}
      <Modal
        title="Create Skill"
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
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="skillName"
            label="Skill Name"
            rules={[
              { required: true, message: 'Vui lòng nhập skill name' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
          >
            <Input placeholder="e.g., Piano Transcription, Guitar Arrangement" />
          </Form.Item>
          <Form.Item
            name="skillType"
            label="Skill Type"
            rules={[{ required: true, message: 'Vui lòng chọn skill type' }]}
          >
            <Select
              placeholder="Chọn skill type"
              onChange={() => {
                // Reset recordingCategory when skillType changes
                createForm.setFieldsValue({ recordingCategory: undefined });
              }}
            >
              <Select.Option value="TRANSCRIPTION">Transcription</Select.Option>
              <Select.Option value="ARRANGEMENT">Arrangement</Select.Option>
              <Select.Option value="RECORDING_ARTIST">
                Recording Artist
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.skillType !== currentValues.skillType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('skillType') === 'RECORDING_ARTIST' ? (
                <Form.Item
                  name="recordingCategory"
                  label="Recording Category"
                  rules={[
                    {
                      required: true,
                      message: 'Vui lòng chọn recording category',
                    },
                  ]}
                >
                  <Select placeholder="Chọn recording category">
                    <Select.Option value="VOCAL">Vocal</Select.Option>
                    <Select.Option value="INSTRUMENT">Instrument</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 1000, message: 'Tối đa 1000 ký tự' }]}
          >
            <TextArea rows={4} placeholder="Enter description" />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Skill Modal */}
      <Modal
        title="Edit Skill"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditLoading(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            name="skillName"
            label="Skill Name"
            rules={[
              { required: true, message: 'Vui lòng nhập skill name' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
          >
            <Input placeholder="e.g., Piano Transcription, Guitar Arrangement" />
          </Form.Item>
          <Form.Item
            name="skillType"
            label="Skill Type"
            rules={[{ required: true, message: 'Vui lòng chọn skill type' }]}
          >
            <Select
              placeholder="Chọn skill type"
              onChange={() => {
                // Reset recordingCategory when skillType changes
                editForm.setFieldsValue({ recordingCategory: undefined });
              }}
            >
              <Select.Option value="TRANSCRIPTION">Transcription</Select.Option>
              <Select.Option value="ARRANGEMENT">Arrangement</Select.Option>
              <Select.Option value="RECORDING_ARTIST">
                Recording Artist
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.skillType !== currentValues.skillType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('skillType') === 'RECORDING_ARTIST' ? (
                <Form.Item
                  name="recordingCategory"
                  label="Recording Category"
                  rules={[
                    {
                      required: true,
                      message: 'Vui lòng chọn recording category',
                    },
                  ]}
                >
                  <Select placeholder="Chọn recording category">
                    <Select.Option value="VOCAL">Vocal</Select.Option>
                    <Select.Option value="INSTRUMENT">Instrument</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 1000, message: 'Tối đa 1000 ký tự' }]}
          >
            <TextArea rows={4} placeholder="Enter description" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillManagement;
