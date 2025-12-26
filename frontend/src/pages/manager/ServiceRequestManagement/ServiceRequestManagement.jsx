// src/pages/manager/ServiceRequestManagement/ServiceRequestManagement.jsx
import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  message,
  Card,
  Typography,
  Select,
  Tooltip,
  Tabs,
  Badge,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ReloadOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  getAllServiceRequests,
  assignServiceRequest,
  getMyAssignedRequests,
} from '../../../services/serviceRequestService';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../../../services/pricingMatrixService';
import styles from './ServiceRequestManagement.module.css';

const { Title } = Typography;
const { TabPane } = Tabs;

// Màu sắc cho từng trạng thái (lowercase từ API)
const STATUS_COLORS = {
  pending: 'gold',
  contract_sent: 'blue',
  contract_approved: 'cyan',
  contract_signed: 'geekblue',
  awaiting_assignment: 'gold',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  // Uppercase fallback
  PENDING: 'gold',
  CONTRACT_SENT: 'blue',
  CONTRACT_APPROVED: 'cyan',
  CONTRACT_SIGNED: 'geekblue',
  AWAITING_ASSIGNMENT: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

// Nhãn hiển thị thân thiện cho status
const STATUS_LABELS = {
  pending: 'Pending',
  contract_sent: 'Contract sent',
  contract_approved: 'Contract approved',
  contract_signed: 'Contract signed',
  awaiting_assignment: 'Awaiting assignment',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

// Label cho request type
const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement with Recording',
  recording: 'Recording',
};

export default function ServiceRequestManagement() {
  const [allRequests, setAllRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [myAssignedRequests, setMyAssignedRequests] = useState([]);
  const [loadingMyAssigned, setLoadingMyAssigned] = useState(false);
  const [activeTab, setActiveTab] = useState('my-assigned');
  const [assigning, setAssigning] = useState(false);

  // Pagination state
  const [allPagination, setAllPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [myAssignedPagination, setMyAssignedPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Sort state
  const [allSort, setAllSort] = useState('createdAt,desc');
  const [myAssignedSort, setMyAssignedSort] = useState('createdAt,desc');

  // Filter state
  const [allRequestTypeFilter, setAllRequestTypeFilter] = useState(null);
  const [allStatusFilter, setAllStatusFilter] = useState(null);
  const [myAssignedRequestTypeFilter, setMyAssignedRequestTypeFilter] =
    useState(null);
  const [myAssignedStatusFilter, setMyAssignedStatusFilter] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch tất cả requests với phân trang
  const fetchAllRequests = async (
    page = 0,
    size = 10,
    sort = allSort,
    requestType = allRequestTypeFilter,
    status = allStatusFilter
  ) => {
    try {
      setLoadingAll(true);
      const response = await getAllServiceRequests({
        page: page,
        size: size,
        sort: sort,
        requestType: requestType,
        status: status,
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
      toast.error('Failed to load service requests', { duration: 5000, position: 'top-center' });
    } finally {
      setLoadingAll(false);
    }
  };

  // Fetch my assigned requests
  const fetchMyAssignedRequests = async (
    page = 0,
    size = 10,
    sort = myAssignedSort,
    requestType = myAssignedRequestTypeFilter,
    status = myAssignedStatusFilter
  ) => {
    if (!user?.id) return;

    try {
      setLoadingMyAssigned(true);
      const response = await getMyAssignedRequests(user.id, {
        page: page,
        size: size,
        sort: sort,
        requestType: requestType,
        status: status,
      });

      if (response?.status === 'success') {
        const pageData = response.data;
        const data = pageData?.content || [];

        const mappedData = data.map(item => ({
          ...item,
          id: item.requestId || item.id,
          contactName: item.contactName || item.userId || 'N/A',
          contactEmail: item.contactEmail || item.userId || 'N/A',
          contactPhone: item.contactPhone || 'N/A',
        }));

        setMyAssignedRequests(mappedData);
        setMyAssignedPagination({
          current: (pageData?.number || 0) + 1,
          pageSize: pageData?.size || size,
          total: pageData?.totalElements || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching my assigned requests:', error);
      toast.error('Failed to load my assigned requests', { duration: 5000, position: 'top-center' });
    } finally {
      setLoadingMyAssigned(false);
    }
  };

  // Handle assign to me
  const handleAssign = async record => {
    if (!user?.id) return;

    const requestId = record.requestId || record.id;
    if (!requestId) {
      toast.error('Request ID not found', { duration: 5000, position: 'top-center' });
      return;
    }

    try {
      setAssigning(true);
      await assignServiceRequest(requestId, user.id);
      message.success('Request assigned successfully');
      // Refresh cả 2 tab
      fetchAllRequests(
        allPagination.current - 1,
        allPagination.pageSize,
        allSort,
        allRequestTypeFilter,
        allStatusFilter
      );
      if (activeTab === 'my-assigned') {
        fetchMyAssignedRequests(
          myAssignedPagination.current - 1,
          myAssignedPagination.pageSize,
          myAssignedSort,
          myAssignedRequestTypeFilter,
          myAssignedStatusFilter
        );
      }
    } catch (error) {
      console.error('Error assigning request:', error);
      toast.error(error.response?.data?.message || 'Cannot assign request', { duration: 5000, position: 'top-center' });
    } finally {
      setAssigning(false);
    }
  };

  // Navigate đến Contract Builder với requestId
  const handleCreateContract = record => {
    const requestId = record.requestId || record.id;
    const basePath = location.pathname.startsWith('/admin')
      ? '/admin'
      : '/manager';
    // Navigate đến contract builder với requestId trong query params
    navigate(`${basePath}/contract-builder?requestId=${requestId}`);
  };

  // Điều hướng đến trang danh sách contracts của request
  const handleViewContracts = record => {
    const requestId = record.requestId || record.id;
    if (!requestId) {
      toast.error('Request ID not found', { duration: 5000, position: 'top-center' });
      return;
    }
    const basePath = location.pathname.startsWith('/admin')
      ? '/admin'
      : '/manager';
    navigate(`${basePath}/service-requests/${requestId}`, {
      state: { requestSnapshot: record },
    });
  };

  useEffect(() => {
    fetchAllRequests(0, allPagination.pageSize, allSort);
    fetchMyAssignedRequests(0, myAssignedPagination.pageSize, myAssignedSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle tab change
  const handleTabChange = key => {
    setActiveTab(key);
    if (key === 'my-assigned' && myAssignedRequests.length === 0) {
      fetchMyAssignedRequests(
        0,
        myAssignedPagination.pageSize,
        myAssignedSort
      );
    }
  };

  // Base columns (dùng chung)
  const baseColumns = [
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
      width: 220,
      render: type => (
        <Tag color="cyan">{REQUEST_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 200,
      render: status => {
        const statusText =
          STATUS_LABELS[status] || status?.toUpperCase() || 'UNKNOWN';
        return (
          <Tooltip title={statusText}>
            <Tag
              color={STATUS_COLORS[status] || 'default'}
              style={{
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {statusText}
            </Tag>
          </Tooltip>
        );
      },
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
      width: 150,
      render: (price, record) => (
        <span style={{ fontWeight: 600, color: '#52c41a', fontSize: '14px' }}>
          {price ? formatPrice(price, record.currency || 'VND') : 'N/A'}
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
  ];

  // Column "Assigned To" chỉ hiển thị ở tab "All Requests"
  const assignedToColumn = {
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
  };

  // Actions column
  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (_, record) => {
      const isAssignedToMe = record.managerUserId === user?.id;
      const isUnassigned = !record.managerUserId;
      // Sử dụng field hasContract từ response (đã được enrich từ backend)
      const hasContract = record.hasContract === true;
      const status = (record.status || '').toLowerCase();

      // Các trạng thái mà contract đã đi vào flow thực thi / chờ task,
      // không cho tạo contract mới từ màn này nữa
      const isContractFlowLocked =
        status === 'awaiting_assignment' ||
        status === 'in_progress' ||
        status === 'completed' ||
        status === 'cancelled' ||
        status === 'rejected';

      return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* Assign to Me button - chỉ hiển thị ở tab "All Requests", và request chưa được assign */}
          {activeTab === 'all' &&
            isUnassigned &&
            status === 'pending' && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAssign(record)}
                loading={assigning}
                block
              >
                Assign to Me
              </Button>
            )}
          {isAssignedToMe && !hasContract && !isContractFlowLocked && (
            <Button
              type="default"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleCreateContract(record)}
            >
              Create Contract
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => handleViewContracts(record)}
            block
          >
            Details
          </Button>
        </Space>
      );
    },
  };

  // Columns cho tab "All Requests" (có cột "Assigned To")
  const allColumns = [...baseColumns, assignedToColumn, actionsColumn];
  // Columns cho tab "My Assigned Requests" (không có cột "Assigned To")
  const myAssignedColumns = [...baseColumns, actionsColumn];

  const sortOptions = [
    { value: 'createdAt,desc', label: 'Created Date (Newest)' },
    { value: 'createdAt,asc', label: 'Created Date (Oldest)' },
    { value: 'updatedAt,desc', label: 'Updated Date (Newest)' },
    { value: 'updatedAt,asc', label: 'Updated Date (Oldest)' },
    { value: 'totalPrice,desc', label: 'Price (High to Low)' },
    { value: 'totalPrice,asc', label: 'Price (Low to High)' },
    { value: 'title,asc', label: 'Title (A-Z)' },
    { value: 'title,desc', label: 'Title (Z-A)' },
  ];

  const requestTypeOptions = [
    { value: null, label: 'All Types' },
    { value: 'transcription', label: 'Transcription' },
    { value: 'arrangement', label: 'Arrangement' },
    {
      value: 'arrangement_with_recording',
      label: 'Arrangement with Recording',
    },
    { value: 'recording', label: 'Recording' },
  ];

  const statusOptions = [
    { value: null, label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'contract_sent', label: 'Contract Sent' },
    { value: 'contract_approved', label: 'Contract Approved' },
    { value: 'contract_signed', label: 'Contract Signed' },
    { value: 'awaiting_assignment', label: 'Awaiting Assignment' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const handleAllSortChange = value => {
    setAllSort(value);
    fetchAllRequests(
      0,
      allPagination.pageSize,
      value,
      allRequestTypeFilter,
      allStatusFilter
    );
  };

  const handleAllRequestTypeFilterChange = value => {
    setAllRequestTypeFilter(value);
    fetchAllRequests(
      0,
      allPagination.pageSize,
      allSort,
      value,
      allStatusFilter
    );
  };

  const handleAllStatusFilterChange = value => {
    setAllStatusFilter(value);
    fetchAllRequests(
      0,
      allPagination.pageSize,
      allSort,
      allRequestTypeFilter,
      value
    );
  };

  const handleMyAssignedSortChange = value => {
    setMyAssignedSort(value);
    fetchMyAssignedRequests(
      0,
      myAssignedPagination.pageSize,
      value,
      myAssignedRequestTypeFilter,
      myAssignedStatusFilter
    );
  };

  const handleMyAssignedRequestTypeFilterChange = value => {
    setMyAssignedRequestTypeFilter(value);
    fetchMyAssignedRequests(
      0,
      myAssignedPagination.pageSize,
      myAssignedSort,
      value,
      myAssignedStatusFilter
    );
  };

  const handleMyAssignedStatusFilterChange = value => {
    setMyAssignedStatusFilter(value);
    fetchMyAssignedRequests(
      0,
      myAssignedPagination.pageSize,
      myAssignedSort,
      myAssignedRequestTypeFilter,
      value
    );
  };

  const renderTable = (
    dataSource,
    columns,
    loading,
    pagination,
    requestTypeFilter,
    statusFilter,
    sort,
    onRequestTypeFilterChange,
    onStatusFilterChange,
    onSortChange,
    onRefresh
  ) => (
    <>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size="middle">
          <span style={{ fontWeight: 500 }}>Filter:</span>
          <Select
            value={requestTypeFilter}
            onChange={onRequestTypeFilterChange}
            style={{ width: 200 }}
            placeholder="Request Type"
            allowClear
            options={requestTypeOptions}
          />
          <Select
            value={statusFilter}
            onChange={onStatusFilterChange}
            style={{ width: 200 }}
            placeholder="Status"
            allowClear
            options={statusOptions}
          />
        </Space>
        <Space>
          <span style={{ fontWeight: 500 }}>Sort by:</span>
          <Select
            value={sort}
            onChange={onSortChange}
            style={{ width: 200 }}
            options={sortOptions}
          />
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: total => `Total ${total} requests`,
          onChange: (page, pageSize) => {
            if (activeTab === 'all') {
              setAllPagination(prev => ({ ...prev, current: page, pageSize }));
              fetchAllRequests(
                page - 1,
                pageSize,
                allSort,
                allRequestTypeFilter,
                allStatusFilter
              );
            } else {
              setMyAssignedPagination(prev => ({ ...prev, current: page, pageSize }));
              fetchMyAssignedRequests(
                page - 1,
                pageSize,
                myAssignedSort,
                myAssignedRequestTypeFilter,
                myAssignedStatusFilter
              );
            }
          },
          onShowSizeChange: (current, size) => {
            if (activeTab === 'all') {
              setAllPagination(prev => ({ ...prev, current: 1, pageSize: size }));
              fetchAllRequests(
                0,
                size,
                allSort,
                allRequestTypeFilter,
                allStatusFilter
              );
            } else {
              setMyAssignedPagination(prev => ({ ...prev, current: 1, pageSize: size }));
              fetchMyAssignedRequests(
                0,
                size,
                myAssignedSort,
                myAssignedRequestTypeFilter,
                myAssignedStatusFilter
              );
            }
          },
        }}
      />
    </>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Service Request Management</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              if (activeTab === 'all') {
                fetchAllRequests(
                  allPagination.current - 1,
                  allPagination.pageSize,
                  allSort,
                  allRequestTypeFilter,
                  allStatusFilter
                );
              } else {
                fetchMyAssignedRequests(
                  myAssignedPagination.current - 1,
                  myAssignedPagination.pageSize,
                  myAssignedSort,
                  myAssignedRequestTypeFilter,
                  myAssignedStatusFilter
                );
              }
            }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane
            tab={
              <Badge
                count={myAssignedPagination.total}
                overflowCount={99}
                style={{ backgroundColor: '#52c41a' }}
              >
                <span>My Assigned Requests</span>
              </Badge>
            }
            key="my-assigned"
          >
            {renderTable(
              myAssignedRequests,
              myAssignedColumns,
              loadingMyAssigned,
              myAssignedPagination,
              myAssignedRequestTypeFilter,
              myAssignedStatusFilter,
              myAssignedSort,
              handleMyAssignedRequestTypeFilterChange,
              handleMyAssignedStatusFilterChange,
              handleMyAssignedSortChange,
              () =>
                fetchMyAssignedRequests(
                  myAssignedPagination.current - 1,
                  myAssignedPagination.pageSize,
                  myAssignedSort,
                  myAssignedRequestTypeFilter,
                  myAssignedStatusFilter
                )
            )}
          </TabPane>
          <TabPane
            tab="All Requests"
            key="all"
          >
            {renderTable(
              allRequests,
              allColumns,
              loadingAll,
              allPagination,
              allRequestTypeFilter,
              allStatusFilter,
              allSort,
              handleAllRequestTypeFilterChange,
              handleAllStatusFilterChange,
              handleAllSortChange,
              () =>
                fetchAllRequests(
                  allPagination.current - 1,
                  allPagination.pageSize,
                  allSort,
                  allRequestTypeFilter,
                  allStatusFilter
                )
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

