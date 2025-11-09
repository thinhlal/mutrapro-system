// src/pages/admin/ServiceRequestManagement/ServiceRequestManagement.jsx
import { useState, useEffect } from 'react';
import {
  Table,
  Tabs,
  Tag,
  Button,
  Space,
  message,
  Card,
  Typography,
  Modal,
  Descriptions,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getAllServiceRequests,
  getMyAssignedRequests,
  assignServiceRequest,
} from '../../../services/serviceRequestService';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './ServiceRequestManagement.module.css';

const { Title } = Typography;
const { TabPane } = Tabs;

// Màu sắc cho từng trạng thái (lowercase từ API)
const STATUS_COLORS = {
  pending: 'gold',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  // Uppercase fallback
  PENDING: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

// Label cho request type
const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
};

export default function ServiceRequestManagement() {
  const [activeTab, setActiveTab] = useState('all');
  const [allRequests, setAllRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMy, setLoadingMy] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { user } = useAuth();

  // Fetch tất cả requests
  const fetchAllRequests = async () => {
    try {
      setLoadingAll(true);
      const response = await getAllServiceRequests({
        page: 0,
        size: 100,
        sort: 'createdAt,desc',
      });

      console.log('API Response:', response);

      if (response?.status === 'success') {
        // API trả về array trực tiếp trong data, không có content
        const data = Array.isArray(response.data) ? response.data : (response.data?.content || []);
        
        // Map field names từ API sang frontend format
        const mappedData = data.map(item => ({
          ...item,
          id: item.requestId || item.id, // API dùng requestId
          contactName: item.contactName || item.userId || 'N/A',
          contactEmail: item.contactEmail || item.userId || 'N/A',
          contactPhone: item.contactPhone || 'N/A',
        }));
        
        setAllRequests(mappedData);
      }
    } catch (error) {
      console.error('Error fetching all requests:', error);
      message.error('Failed to load service requests');
    } finally {
      setLoadingAll(false);
    }
  };

  // Fetch requests đã được assign cho user hiện tại
  const fetchMyRequests = async () => {
    try {
      setLoadingMy(true);
      const response = await getMyAssignedRequests(user?.id, {
        page: 0,
        size: 100,
        sort: 'createdAt,desc',
      });

      if (response?.status === 'success') {
        // API trả về array trực tiếp trong data
        const data = Array.isArray(response.data) ? response.data : (response.data?.content || []);
        
        // Map field names
        const mappedData = data.map(item => ({
          ...item,
          id: item.requestId || item.id,
          contactName: item.contactName || item.userId || 'N/A',
          contactEmail: item.contactEmail || item.userId || 'N/A',
          contactPhone: item.contactPhone || 'N/A',
        }));
        
        setMyRequests(mappedData);
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
      message.error('Failed to load assigned requests');
    } finally {
      setLoadingMy(false);
    }
  };

  // Assign request
  const handleAssign = async requestId => {
    if (!user?.id) {
      message.error('User ID not found');
      return;
    }

    try {
      setAssigning(prev => ({ ...prev, [requestId]: true }));
      const response = await assignServiceRequest(requestId, user.id);

      if (response?.status === 'success') {
        message.success('Request assigned successfully!');
        // Refresh cả 2 danh sách
        fetchAllRequests();
        fetchMyRequests();
      } else {
        throw new Error(response?.message || 'Failed to assign request');
      }
    } catch (error) {
      console.error('Error assigning request:', error);
      message.error(error?.message || 'Failed to assign request');
    } finally {
      setAssigning(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Xem chi tiết request
  const handleViewDetail = record => {
    setSelectedRequest(record);
    setDetailModalVisible(true);
  };

  useEffect(() => {
    fetchAllRequests();
    fetchMyRequests();
  }, []);

  // Columns cho bảng
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      width: 250,
      ellipsis: true,
      render: text => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'requestType',
      key: 'requestType',
      width: 120,
      render: type => (
        <Tag color="cyan">{REQUEST_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.contactName}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.contactEmail}
          </div>
        </div>
      ),
    },
    {
      title: 'Total Price',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: price => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          ${price ? Number(price).toFixed(2) : '0.00'}
        </span>
      ),
      sorter: (a, b) => (a.totalPrice || 0) - (b.totalPrice || 0),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: date => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Assigned To',
      dataIndex: 'managerUserId',
      key: 'managerUserId',
      width: 150,
      render: (managerId, record) => {
        if (managerId) {
          // Nếu có manager ID, hiển thị badge
          const isCurrentUser = managerId === user?.id;
          return (
            <Tag color={isCurrentUser ? 'green' : 'blue'}>
              {isCurrentUser ? 'You' : 'Assigned'}
            </Tag>
          );
        }
        return <Tag color="default">Unassigned</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            View
          </Button>
          {!record.managerUserId && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={assigning[record.id]}
              onClick={() => handleAssign(record.id)}
            >
              Assign to Me
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Service Request Management</Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchAllRequests();
            fetchMyRequests();
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Badge
                count={allRequests.length}
                style={{ backgroundColor: '#52c41a' }}
              />
            </Space>
          }
        >
          <TabPane tab="All Requests" key="all">
            <Table
              columns={columns}
              dataSource={allRequests}
              rowKey="id"
              loading={loadingAll}
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Total ${total} requests`,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                My Assigned Requests
                <Badge
                  count={myRequests.length}
                  style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                />
              </span>
            }
            key="my"
          >
            <Table
              columns={columns.filter(col => col.key !== 'actions')}
              dataSource={myRequests}
              rowKey="id"
              loading={loadingMy}
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Total ${total} assigned requests`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Request Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          !selectedRequest?.managerUserId && (
            <Button
              key="assign"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={assigning[selectedRequest?.id]}
              onClick={() => {
                handleAssign(selectedRequest.id);
                setDetailModalVisible(false);
              }}
            >
              Assign to Me
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedRequest && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Request ID">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {selectedRequest.id}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="User ID">
              {selectedRequest.userId}
            </Descriptions.Item>
            <Descriptions.Item label="Title">
              {selectedRequest.title}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedRequest.description}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="cyan">
                {REQUEST_TYPE_LABELS[selectedRequest.requestType] ||
                  selectedRequest.requestType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[selectedRequest.status] || 'default'}>
                {selectedRequest.status?.toUpperCase() || 'UNKNOWN'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Price">
              <Tag color="green" style={{ fontSize: 16, padding: '6px 16px' }}>
                ${Number(selectedRequest.totalPrice || 0).toFixed(2)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Has Vocalist">
              {selectedRequest.hasVocalist ? 'Yes' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="External Guest Count">
              {selectedRequest.externalGuestCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Tempo Percentage">
              {selectedRequest.tempoPercentage}%
            </Descriptions.Item>
            <Descriptions.Item label="Contact Name">
              {selectedRequest.contactName}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email">
              {selectedRequest.contactEmail}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Phone">
              {selectedRequest.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned To">
              {selectedRequest.managerUserId ? (
                <Tag color={selectedRequest.managerUserId === user?.id ? 'green' : 'blue'}>
                  {selectedRequest.managerUserId === user?.id ? 'You' : 'Assigned to Manager'}
                </Tag>
              ) : (
                <Tag color="default">Unassigned</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {new Date(selectedRequest.updatedAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

