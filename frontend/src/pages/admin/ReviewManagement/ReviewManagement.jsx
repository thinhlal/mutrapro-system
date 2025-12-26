import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  InputNumber,
  Card,
  Typography,
  message,
  Modal,
  Descriptions,
  DatePicker,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ReloadOutlined,
  EyeOutlined,
  StarFilled,
  FilterOutlined,
} from '@ant-design/icons';
import { getAllReviews } from '../../../services/reviewService';
import dayjs from 'dayjs';
import styles from './ReviewManagement.module.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    reviewType: null,
    specialistId: null,
    requestId: null,
    minRating: null,
    maxRating: null,
    customerId: null,
  });

  // Fetch reviews
  const fetchReviews = async (page = 0, size = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v != null && v !== '')
        ),
      };

      const response = await getAllReviews(params);
      if (response?.status === 'success' && response?.data) {
        setReviews(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.totalElements || 0,
          current: page + 1,
        }));
      }
    } catch (error) {
      toast.error(error?.message || 'Không thể tải danh sách reviews', { duration: 5000, position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(0, pagination.pageSize);
  }, [filters]);

  const handleTableChange = newPagination => {
    fetchReviews(newPagination.current - 1, newPagination.pageSize);
  };

  const handleViewDetail = review => {
    setSelectedReview(review);
    setDetailModalVisible(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      reviewType: null,
      specialistId: null,
      requestId: null,
      minRating: null,
      maxRating: null,
      customerId: null,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getReviewTypeColor = type => {
    switch (type) {
      case 'TASK':
        return 'blue';
      case 'REQUEST':
        return 'purple';
      case 'PARTICIPANT':
        return 'green';
      default:
        return 'default';
    }
  };

  const getReviewTypeLabel = type => {
    switch (type) {
      case 'TASK':
        return 'Task Review';
      case 'REQUEST':
        return 'Request Review';
      case 'PARTICIPANT':
        return 'Participant Review';
      default:
        return type;
    }
  };

  const columns = [
    {
      title: 'Review ID',
      dataIndex: 'reviewId',
      key: 'reviewId',
      width: 200,
      render: text => (
        <Text code copyable={{ text }} style={{ fontSize: '12px' }}>
          {text?.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Review Type',
      dataIndex: 'reviewType',
      key: 'reviewType',
      width: 140,
      render: type => (
        <Tag color={getReviewTypeColor(type)}>{getReviewTypeLabel(type)}</Tag>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: rating => (
        <Space>
          <StarFilled style={{ color: '#faad14' }} />
          <Text strong>{rating}</Text>
          <Text type="secondary">/ 5</Text>
        </Space>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Specialist',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 150,
      render: (id, record) => (
        <div>
          {id ? (
            <Text code copyable={{ text: id }} style={{ fontSize: '11px' }}>
              {id?.substring(0, 8)}...
            </Text>
          ) : (
            <Text type="secondary">N/A</Text>
          )}
          {record.specialistName && (
            <div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {record.specialistName}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Request ID',
      dataIndex: 'requestId',
      key: 'requestId',
      width: 150,
      render: id =>
        id ? (
          <Text code copyable={{ text: id }} style={{ fontSize: '11px' }}>
            {id?.substring(0, 8)}...
          </Text>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: 'Customer ID',
      dataIndex: 'customerId',
      key: 'customerId',
      width: 150,
      render: id => (
        <Text code copyable={{ text: id }} style={{ fontSize: '11px' }}>
          {id?.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: text =>
        text ? (
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        ) : (
          <Text type="secondary">No comment</Text>
        ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: date =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
      sorter: (a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.reviewManagement}>
      <Card>
        <Title level={2}>Review Management</Title>

        {/* Filters */}
        <Card
          size="small"
          title={
            <Space>
              <FilterOutlined />
              <span>Filters</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space wrap size="middle">
            <div>
              <Text strong>Review Type: </Text>
              <Select
                style={{ width: 150 }}
                placeholder="All Types"
                allowClear
                value={filters.reviewType}
                onChange={value => handleFilterChange('reviewType', value)}
              >
                <Option value="TASK">Task Review</Option>
                <Option value="REQUEST">Request Review</Option>
                <Option value="PARTICIPANT">Participant Review</Option>
              </Select>
            </div>

            <div>
              <Text strong>Min Rating: </Text>
              <InputNumber
                min={1}
                max={5}
                placeholder="Min"
                style={{ width: 80 }}
                value={filters.minRating}
                onChange={value => handleFilterChange('minRating', value)}
              />
            </div>

            <div>
              <Text strong>Max Rating: </Text>
              <InputNumber
                min={1}
                max={5}
                placeholder="Max"
                style={{ width: 80 }}
                value={filters.maxRating}
                onChange={value => handleFilterChange('maxRating', value)}
              />
            </div>

            <div>
              <Text strong>Specialist ID: </Text>
              <Input
                placeholder="Enter specialist ID"
                style={{ width: 200 }}
                value={filters.specialistId}
                onChange={e =>
                  handleFilterChange('specialistId', e.target.value)
                }
                allowClear
              />
            </div>

            <div>
              <Text strong>Request ID: </Text>
              <Input
                placeholder="Enter request ID"
                style={{ width: 200 }}
                value={filters.requestId}
                onChange={e => handleFilterChange('requestId', e.target.value)}
                allowClear
              />
            </div>

            <div>
              <Text strong>Customer ID: </Text>
              <Input
                placeholder="Enter customer ID"
                style={{ width: 200 }}
                value={filters.customerId}
                onChange={e => handleFilterChange('customerId', e.target.value)}
                allowClear
              />
            </div>

            <Button onClick={handleResetFilters}>Reset Filters</Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() =>
                fetchReviews(pagination.current - 1, pagination.pageSize)
              }
            >
              Refresh
            </Button>
          </Space>
        </Card>

        {/* Reviews Table */}
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="reviewId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: total => `Total ${total} reviews`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1500 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Review Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedReview(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedReview(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedReview && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Review ID" span={2}>
              <Text code copyable={{ text: selectedReview.reviewId }}>
                {selectedReview.reviewId}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Review Type">
              <Tag color={getReviewTypeColor(selectedReview.reviewType)}>
                {getReviewTypeLabel(selectedReview.reviewType)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Rating">
              <Space>
                <StarFilled style={{ color: '#faad14' }} />
                <Text strong>{selectedReview.rating}</Text>
                <Text type="secondary">/ 5</Text>
              </Space>
            </Descriptions.Item>
            {selectedReview.specialistId && (
              <>
                <Descriptions.Item label="Specialist ID">
                  <Text code copyable={{ text: selectedReview.specialistId }}>
                    {selectedReview.specialistId}
                  </Text>
                </Descriptions.Item>
                {selectedReview.specialistName && (
                  <Descriptions.Item label="Specialist Name">
                    {selectedReview.specialistName}
                  </Descriptions.Item>
                )}
              </>
            )}
            {selectedReview.requestId && (
              <Descriptions.Item label="Request ID">
                <Text code copyable={{ text: selectedReview.requestId }}>
                  {selectedReview.requestId}
                </Text>
              </Descriptions.Item>
            )}
            {selectedReview.assignmentId && (
              <Descriptions.Item label="Assignment ID">
                <Text code copyable={{ text: selectedReview.assignmentId }}>
                  {selectedReview.assignmentId}
                </Text>
              </Descriptions.Item>
            )}
            {selectedReview.participantId && (
              <Descriptions.Item label="Participant ID">
                <Text code copyable={{ text: selectedReview.participantId }}>
                  {selectedReview.participantId}
                </Text>
              </Descriptions.Item>
            )}
            {selectedReview.bookingId && (
              <Descriptions.Item label="Booking ID">
                <Text code copyable={{ text: selectedReview.bookingId }}>
                  {selectedReview.bookingId}
                </Text>
              </Descriptions.Item>
            )}
            {selectedReview.contractId && (
              <Descriptions.Item label="Contract ID">
                <Text code copyable={{ text: selectedReview.contractId }}>
                  {selectedReview.contractId}
                </Text>
              </Descriptions.Item>
            )}
            {selectedReview.milestoneId && (
              <Descriptions.Item label="Milestone ID">
                <Text code copyable={{ text: selectedReview.milestoneId }}>
                  {selectedReview.milestoneId}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Customer ID" span={2}>
              <Text code copyable={{ text: selectedReview.customerId }}>
                {selectedReview.customerId}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Comment" span={2}>
              {selectedReview.comment ? (
                <Text>{selectedReview.comment}</Text>
              ) : (
                <Text type="secondary">No comment</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {selectedReview.createdAt
                ? dayjs(selectedReview.createdAt).format('YYYY-MM-DD HH:mm:ss')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {selectedReview.updatedAt
                ? dayjs(selectedReview.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ReviewManagement;
