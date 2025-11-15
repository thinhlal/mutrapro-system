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
  Badge,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import {
  getAllServiceRequests,
  getMyAssignedRequests,
  assignServiceRequest,
  getServiceRequestById,
} from '../../../services/serviceRequestService';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ServiceRequestDetailModal from '../../../components/modal/ServiceRequestDetailModal/ServiceRequestDetailModal';
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

  // Pagination state
  const [allPagination, setAllPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [myPagination, setMyPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch tất cả requests với phân trang
  const fetchAllRequests = async (page = 0, size = 10) => {
    try {
      setLoadingAll(true);
      const response = await getAllServiceRequests({
        page: page,
        size: size,
        sort: 'createdAt,desc',
      });

      if (response?.status === 'success') {
        // API trả về Page object
        const pageData = response.data;
        const data = pageData?.content || [];

        // Map field names từ API sang frontend format
        const mappedData = data.map(item => ({
          ...item,
          id: item.requestId || item.id, // API dùng requestId
          contactName: item.contactName || item.userId || 'N/A',
          contactEmail: item.contactEmail || item.userId || 'N/A',
          contactPhone: item.contactPhone || 'N/A',
        }));

        setAllRequests(mappedData);
        setAllPagination({
          current: (pageData?.number || 0) + 1, // Spring Data page starts from 0
          pageSize: pageData?.size || size,
          total: pageData?.totalElements || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching all requests:', error);
      message.error('Failed to load service requests');
    } finally {
      setLoadingAll(false);
    }
  };

  // Fetch requests đã được assign cho user hiện tại với phân trang
  const fetchMyRequests = async (page = 0, size = 10) => {
    try {
      setLoadingMy(true);
      const response = await getMyAssignedRequests(user?.id, {
        page: page,
        size: size,
        sort: 'createdAt,desc',
      });

      if (response?.status === 'success') {
        // API trả về Page object
        const pageData = response.data;
        const data = pageData?.content || [];

        // Map field names
        const mappedData = data.map(item => ({
          ...item,
          id: item.requestId || item.id,
          contactName: item.contactName || item.userId || 'N/A',
          contactEmail: item.contactEmail || item.userId || 'N/A',
          contactPhone: item.contactPhone || 'N/A',
        }));

        setMyRequests(mappedData);
        setMyPagination({
          current: (pageData?.number || 0) + 1, // Spring Data page starts from 0
          pageSize: pageData?.size || size,
          total: pageData?.totalElements || 0,
        });
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
  const handleViewDetail = async record => {
    const requestId = record.requestId || record.id;
    try {
      // Fetch lại request detail với đầy đủ thông tin (bao gồm files)
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success' && response?.data) {
        // Map field names để tương thích với modal
        const requestData = {
          ...response.data,
          id: response.data.requestId || response.data.id,
        };
        setSelectedRequest(requestData);
        setDetailModalVisible(true);
      } else {
        // Fallback to record if API fails
        setSelectedRequest(record);
        setDetailModalVisible(true);
      }
    } catch (error) {
      console.error('Error fetching request detail:', error);
      // Fallback to record if API fails
      setSelectedRequest(record);
      setDetailModalVisible(true);
    }
  };

  // Navigate đến Contract Builder với requestId
  const handleCreateContract = record => {
    const requestId = record.requestId || record.id;
    // Navigate đến contract builder với requestId trong query params
    navigate(`/manager/contract-builder?requestId=${requestId}`);
  };

  // Điều hướng đến trang danh sách contracts của request
  const handleViewContracts = record => {
    const requestId = record.requestId || record.id;
    if (!requestId) {
      message.error('Không tìm thấy requestId');
      return;
    }
    const basePath = location.pathname.startsWith('/admin')
      ? '/admin'
      : '/manager';
    navigate(`${basePath}/service-requests/${requestId}/contracts`, {
      state: { requestSnapshot: record },
    });
  };

  // Refresh khi tab được focus lại (khi user quay lại từ contract builder)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh danh sách khi tab được focus lại
        fetchAllRequests();
        fetchMyRequests();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    fetchAllRequests(0, allPagination.pageSize);
    fetchMyRequests(0, myPagination.pageSize);
  }, []);

  // Columns cho bảng
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      width: 130,
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
      width: 130,
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
      width: 320,
      fixed: 'right',
      render: (_, record) => {
        const isAssignedToMe = record.managerUserId === user?.id;
        const hasManager = !!record.managerUserId;
        // Sử dụng field hasContract từ response (đã được enrich từ backend)
        const hasContract = record.hasContract === true;

        return (
          <Space wrap>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              View
            </Button>
            <Button
              type="default"
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() => handleViewContracts(record)}
            >
              Contracts
            </Button>
            {!hasManager && (
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
            {isAssignedToMe && !hasContract && (
              <Button
                type="default"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleCreateContract(record)}
              >
                Create Contract
              </Button>
            )}
            {isAssignedToMe && hasContract && (
              <Tag color="green">Contract Created</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Service Request Management</Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchAllRequests(allPagination.current - 1, allPagination.pageSize);
            fetchMyRequests(myPagination.current - 1, myPagination.pageSize);
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
                count={allPagination.total}
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
                current: allPagination.current,
                pageSize: allPagination.pageSize,
                total: allPagination.total,
                showSizeChanger: true,
                showTotal: total => `Total ${total} requests`,
                onChange: (page, pageSize) => {
                  fetchAllRequests(page - 1, pageSize); // Spring Data page starts from 0
                },
                onShowSizeChange: (current, size) => {
                  fetchAllRequests(0, size);
                },
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                My Assigned Requests
                <Badge
                  count={myPagination.total}
                  style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                />
              </span>
            }
            key="my"
          >
            <Table
              columns={columns}
              dataSource={myRequests}
              rowKey="id"
              loading={loadingMy}
              scroll={{ x: 1200 }}
              pagination={{
                current: myPagination.current,
                pageSize: myPagination.pageSize,
                total: myPagination.total,
                showSizeChanger: true,
                showTotal: total => `Total ${total} assigned requests`,
                onChange: (page, pageSize) => {
                  fetchMyRequests(page - 1, pageSize); // Spring Data page starts from 0
                },
                onShowSizeChange: (current, size) => {
                  fetchMyRequests(0, size);
                },
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <ServiceRequestDetailModal
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        request={selectedRequest}
        currentUserId={user?.id}
        onAssign={requestId => {
          handleAssign(requestId);
          setDetailModalVisible(false);
        }}
        isAssigning={assigning[selectedRequest?.id]}
        onCreateContract={handleCreateContract}
      />
    </div>
  );
}
