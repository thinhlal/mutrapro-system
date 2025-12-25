// src/pages/admin/ServiceRequestManagement/AdminServiceRequestManagement.jsx
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
} from 'antd';
import {
  ReloadOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import {
  getAllServiceRequests,
} from '../../../services/serviceRequestService';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../../../services/pricingMatrixService';
import styles from './ServiceRequestManagement.module.css';

const { Title } = Typography;

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

export default function AdminServiceRequestManagement() {
  const [allRequests, setAllRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Pagination state
  const [allPagination, setAllPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Sort state
  const [allSort, setAllSort] = useState('createdAt,desc');

  // Filter state
  const [allRequestTypeFilter, setAllRequestTypeFilter] = useState(null);
  const [allStatusFilter, setAllStatusFilter] = useState(null);

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
      message.error('Failed to load service requests');
    } finally {
      setLoadingAll(false);
    }
  };

  // Navigate đến Contract Builder với requestId
  const handleCreateContract = record => {
    const requestId = record.requestId || record.id;
    // Navigate đến contract builder với requestId trong query params
    navigate(`/admin/contract-builder?requestId=${requestId}`);
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
    navigate(`${basePath}/service-requests/${requestId}`, {
      state: { requestSnapshot: record },
    });
  };

  // Refresh khi tab được focus lại (khi user quay lại từ contract builder)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh danh sách khi tab được focus lại
        fetchAllRequests(
          allPagination.current - 1,
          allPagination.pageSize,
          allSort,
          allRequestTypeFilter,
          allStatusFilter
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [allPagination, allSort, allRequestTypeFilter, allStatusFilter]);

  useEffect(() => {
    fetchAllRequests(0, allPagination.pageSize, allSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      title: 'Tổng giá',
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

  // Column "Assigned To" (Admin chỉ xem, không có chức năng assign)
  const assignedToColumn = {
    title: 'Assigned To',
    dataIndex: 'managerUserId',
    key: 'managerUserId',
    width: 130,
    render: managerId => {
      if (managerId) {
        return <Tag color="blue">Assigned</Tag>;
      }
      return <Tag color="default">Unassigned</Tag>;
    },
  };

  // Actions column (Admin không có nút Assign to Me, chỉ có Create Contract và Details)
  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (_, record) => {
      const isAssignedToMe = record.managerUserId === user?.id;
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

  // Columns (có cột "Assigned To")
  const columns = [...baseColumns, assignedToColumn, actionsColumn];

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Service Request Management</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchAllRequests(
                allPagination.current - 1,
                allPagination.pageSize,
                allSort,
                allRequestTypeFilter,
                allStatusFilter
              );
            }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
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
              value={allRequestTypeFilter}
              onChange={handleAllRequestTypeFilterChange}
              style={{ width: 200 }}
              placeholder="Request Type"
              allowClear
              options={requestTypeOptions}
            />
            <Select
              value={allStatusFilter}
              onChange={handleAllStatusFilterChange}
              style={{ width: 200 }}
              placeholder="Status"
              allowClear
              options={statusOptions}
            />
          </Space>
          <Space>
            <span style={{ fontWeight: 500 }}>Sort by:</span>
            <Select
              value={allSort}
              onChange={handleAllSortChange}
              style={{ width: 200 }}
              options={sortOptions}
            />
          </Space>
        </div>
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
              fetchAllRequests(
                page - 1,
                pageSize,
                allSort,
                allRequestTypeFilter,
                allStatusFilter
              ); // Spring Data page starts from 0
            },
            onShowSizeChange: (current, size) => {
              fetchAllRequests(
                0,
                size,
                allSort,
                allRequestTypeFilter,
                allStatusFilter
              );
            },
          }}
        />
      </Card>
    </div>
  );
}

