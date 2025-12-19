import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Form,
  Switch,
  Modal,
  message,
  Card,
  Typography,
  Descriptions,
} from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import {
  getAllDemos,
  getDemoById,
  updateDemoVisibility,
} from '../../../services/specialistService';
import styles from './DemoManagement.module.css';

const { Title } = Typography;

const DemoManagement = () => {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [visibilityForm] = Form.useForm();
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  // Fetch all demos
  const fetchDemos = async () => {
    setLoading(true);
    try {
      const response = await getAllDemos();
      if (response.data) {
        setDemos(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách demos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  // Handle view demo details
  const handleView = async demo => {
    try {
      const response = await getDemoById(demo.demoId);
      setSelectedDemo(response.data);
      setViewModalVisible(true);
    } catch (error) {
      message.error('Không thể tải thông tin demo');
    }
  };

  // Handle update visibility
  const handleUpdateVisibility = async demo => {
    setSelectedDemo(demo);
    visibilityForm.setFieldsValue({
      isPublic: demo.isPublic,
    });
    setVisibilityModalVisible(true);
  };

  const handleVisibilitySubmit = async values => {
    setVisibilityLoading(true);
    try {
      await updateDemoVisibility(selectedDemo.demoId, {
        isPublic: values.isPublic,
      });
      message.success('Cập nhật visibility thành công');
      setVisibilityModalVisible(false);
      fetchDemos();
    } catch (error) {
      const errorMsg =
        error.message || error.error || 'Không thể cập nhật visibility';
      message.error(errorMsg);
    } finally {
      setVisibilityLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Demo ID',
      dataIndex: 'demoId',
      key: 'demoId',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Specialist ID',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Skill',
      dataIndex: ['skill', 'skillName'],
      key: 'skill',
      width: 120,
      render: (skillName, record) =>
        skillName ? <Tag color="blue">{skillName}</Tag> : 'N/A',
    },
    {
      title: 'Public',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      align: 'center',
      render: isPublic => (
        <Tag color={isPublic ? 'green' : 'red'}>
          {isPublic ? 'Public' : 'Private'}
        </Tag>
      ),
      filters: [
        { text: 'Public', value: true },
        { text: 'Private', value: false },
      ],
      onFilter: (value, record) => record.isPublic === value,
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
            onClick={() => handleUpdateVisibility(record)}
          >
            Visibility
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.demoManagement}>
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            Demo Management
          </Title>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDemos}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={demos}
          rowKey="demoId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} demos`,
          }}
        />
      </Card>

      {/* View Demo Details Modal */}
      <Modal
        title="Demo Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedDemo && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Demo ID" span={2}>
              {selectedDemo.demoId}
            </Descriptions.Item>
            <Descriptions.Item label="Specialist ID" span={2}>
              {selectedDemo.specialistId}
            </Descriptions.Item>
            <Descriptions.Item label="Title" span={2}>
              {selectedDemo.title || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {selectedDemo.description || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Skill">
              {selectedDemo.skill?.skillName ? (
                <Tag color="blue">{selectedDemo.skill.skillName}</Tag>
              ) : (
                'N/A'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="File ID">
              {selectedDemo.fileId}
            </Descriptions.Item>
            <Descriptions.Item label="Preview URL" span={2}>
              {selectedDemo.previewUrl ? (
                <a
                  href={selectedDemo.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedDemo.previewUrl}
                </a>
              ) : (
                'N/A'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Public">
              <Tag color={selectedDemo.isPublic ? 'green' : 'red'}>
                {selectedDemo.isPublic ? 'Public' : 'Private'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Update Visibility Modal */}
      <Modal
        title="Update Demo Visibility"
        open={visibilityModalVisible}
        onCancel={() => {
          setVisibilityModalVisible(false);
          setVisibilityLoading(false);
          visibilityForm.resetFields();
        }}
        onOk={() => visibilityForm.submit()}
        confirmLoading={visibilityLoading}
      >
        <Form
          form={visibilityForm}
          layout="vertical"
          onFinish={handleVisibilitySubmit}
        >
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DemoManagement;
