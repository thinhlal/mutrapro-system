import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Descriptions,
  Empty,
  Alert,
  Popconfirm,
  Divider,
  Table,
  Modal,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getTaskAssignmentById,
  resolveIssue,
  cancelTaskByManager,
  getTaskAssignmentsByMilestone,
} from '../../../services/taskAssignmentService';
import { getContractById } from '../../../services/contractService';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './MilestoneAssignmentDetailPage.module.css';

const { Title, Text } = Typography;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
};

const STATUS_COLORS = {
  assigned: 'blue',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Đã gán',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const WORK_STATUS_COLORS = {
  planned: 'default',
  active: 'processing',
  completed: 'success',
  on_hold: 'orange',
  cancelled: 'red',
};

const WORK_STATUS_LABELS = {
  planned: 'Chưa bắt đầu',
  active: 'Đang triển khai',
  completed: 'Hoàn thành',
  on_hold: 'Tạm dừng',
  cancelled: 'Đã huỷ',
};

const FILE_STATUS_LABELS = {
  uploaded: 'Đã upload',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  delivered: 'Đã giao',
};

const FILE_STATUS_COLORS = {
  uploaded: 'default',
  pending_review: 'processing',
  approved: 'success',
  rejected: 'error',
  delivered: 'green',
};

const getActualStartDayjs = milestone =>
  milestone?.actualStartAt ? dayjs(milestone.actualStartAt) : null;

const getPlannedStartDayjs = milestone =>
  milestone?.plannedStartAt ? dayjs(milestone.plannedStartAt) : null;

const getPlannedDeadlineDayjs = milestone =>
  milestone?.plannedDueDate ? dayjs(milestone.plannedDueDate) : null;

const getActualDeadlineDayjs = milestone => {
  if (!milestone) return null;
  if (milestone.actualEndAt) {
    return dayjs(milestone.actualEndAt);
  }
  const actualStart = getActualStartDayjs(milestone);
  if (actualStart && milestone.milestoneSlaDays) {
    return actualStart.add(milestone.milestoneSlaDays, 'day');
  }
  return null;
};

const getTaskCompletionDate = task =>
  task?.completedDate || task?.milestone?.actualEndAt || null;

const formatDateTime = value =>
  value ? dayjs(value).format('HH:mm DD/MM/YYYY') : '—';

const formatCurrency = (value, currency = 'VND') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Number(value).toLocaleString()} ${currency}`;
};

const MilestoneAssignmentDetailPage = () => {
  const { contractId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [contract, setContract] = useState(null);
  const [milestoneTasks, setMilestoneTasks] = useState([]);
  const [milestoneTasksLoading, setMilestoneTasksLoading] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(false);
  const [cancellingTask, setCancellingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [selectedTaskFiles, setSelectedTaskFiles] = useState([]);
  const [selectedTaskFilesLoading, setSelectedTaskFilesLoading] = useState(false);

  useEffect(() => {
    if (contractId && assignmentId) {
      loadData();
    }
  }, [contractId, assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskResponse, contractResponse] = await Promise.all([
        getTaskAssignmentById(contractId, assignmentId),
        getContractById(contractId).catch(error => {
          console.warn('Failed to fetch contract info:', error);
          return null;
        }),
      ]);

      if (taskResponse?.status === 'success' && taskResponse?.data) {
        setTask(taskResponse.data);
        const milestoneIdValue =
          taskResponse.data.milestoneId || taskResponse.data.milestone?.milestoneId;
        await fetchMilestoneTasks(contractId, milestoneIdValue);
      } else {
        throw new Error(taskResponse?.message || 'Task assignment not found');
      }

      if (contractResponse?.status === 'success' && contractResponse?.data) {
        setContract(contractResponse.data);
      }
    } catch (error) {
      console.error('Error fetching task detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết task assignment');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };


  const fetchMilestoneTasks = async (contractIdValue, milestoneIdValue) => {
    if (!contractIdValue || !milestoneIdValue) {
      setMilestoneTasks([]);
      return;
    }
    try {
      setMilestoneTasksLoading(true);
      const response = await getTaskAssignmentsByMilestone(
        contractIdValue,
        milestoneIdValue
      );
      if (response?.status === 'success' && Array.isArray(response.data)) {
        const sorted = [...response.data].sort((a, b) => {
          const aTime = a.assignedDate || a.createdAt || null;
          const bTime = b.assignedDate || b.createdAt || null;
          if (!aTime && !bTime) return 0;
          if (!aTime) return 1;
          if (!bTime) return -1;
          return dayjs(bTime).valueOf() - dayjs(aTime).valueOf();
        });
        setMilestoneTasks(sorted);
      } else {
        setMilestoneTasks([]);
      }
    } catch (error) {
      console.warn('Không thể tải danh sách task của milestone:', error);
      setMilestoneTasks([]);
    } finally {
      setMilestoneTasksLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    try {
      setResolvingIssue(true);
      await resolveIssue(contractId, assignmentId);
      message.success('Issue đã được giải quyết. Specialist có thể tiếp tục làm task.');
      await loadData();
    } catch (error) {
      console.error('Error resolving issue:', error);
      message.error(error?.message || 'Lỗi khi giải quyết issue');
    } finally {
      setResolvingIssue(false);
    }
  };

  const handleCancelAndCreateNew = async () => {
    try {
      setCancellingTask(true);
      await cancelTaskByManager(contractId, assignmentId);
      message.success('Task đã được hủy. Đang chuyển đến trang tạo task mới...');
      const milestoneId = task?.milestoneId || task?.milestone?.milestoneId;
      const taskType = task?.taskType;
      navigate(
        `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}&taskType=${taskType}`
      );
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.message || 'Lỗi khi hủy task');
    } finally {
      setCancellingTask(false);
    }
  };

  const openTaskDetailModal = async record => {
    setSelectedTask(record);
    setTaskDetailModalVisible(true);
    if (!record?.assignmentId) {
      setSelectedTaskFiles([]);
      return;
    }
    try {
      setSelectedTaskFilesLoading(true);
      const response = await axiosInstance.get(
        `/api/v1/projects/files/by-assignment/${record.assignmentId}`
      );
      if (response?.data?.status === 'success' && Array.isArray(response.data?.data)) {
        setSelectedTaskFiles(response.data.data);
      } else {
        setSelectedTaskFiles([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setSelectedTaskFiles([]);
    } finally {
      setSelectedTaskFilesLoading(false);
    }
  };

  const closeTaskDetailModal = () => {
    setTaskDetailModalVisible(false);
    setSelectedTask(null);
    setSelectedTaskFiles([]);
  };

  const milestoneDetail = useMemo(() => {
    if (!task) return null;

    if (contract?.milestones?.length) {
      return (
        contract.milestones.find(
          milestone =>
            milestone.milestoneId ===
            (task.milestoneId || task.milestone?.milestoneId)
        ) || task.milestone || null
      );
    }
    return task.milestone || null;
  }, [contract, task]);

  const milestoneOrder =
    milestoneDetail?.milestoneOrderIndex ??
    milestoneDetail?.orderIndex ??
    milestoneDetail?.sequence ??
    null;

  const workStatus = milestoneDetail?.workStatus?.toLowerCase();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Không tìm thấy task assignment" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

  const milestoneTitle =
    milestoneDetail?.name ||
    (milestoneDetail?.orderIndex
      ? `Milestone ${milestoneDetail.orderIndex}`
      : task.milestone?.milestoneName || 'Milestone');
  const canEditTask =
    task.status && !['assigned', 'in_progress'].includes(task.status.toLowerCase());

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.backRow}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
          <Space size="small" wrap className={styles.headerMeta}>
            {contract?.contractNumber && <Tag>{contract.contractNumber}</Tag>}
            {milestoneTitle && <Tag color="blue">{milestoneTitle}</Tag>}
            {task.assignmentId && <Tag color="purple">Task #{task.assignmentId}</Tag>}
          </Space>
        </div>
        <div className={styles.headerInfo}>
          <Title level={3} style={{ margin: 0 }}>
            Chi tiết Milestone
          </Title>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/manager/contracts/${contractId}`)}
            >
              Xem contract
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `/manager/task-progress?contractId=${contractId}&milestoneId=${
                    milestoneDetail?.milestoneId || task.milestoneId
                  }`
                )
              }
            >
              Mở Task Progress
            </Button>
            {canEditTask && (
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  navigate(`/manager/milestone-assignments/${contractId}/edit/${assignmentId}`)
                }
              >
                Chỉnh sửa task
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className={styles.sectionStack}>

        <div className={styles.gridTwoColumn}>
          <Card title="Milestone chi tiết">
            {milestoneDetail ? (
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Tên milestone" span={2}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{milestoneTitle}</Text>
                    {milestoneDetail.description && (
                      <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {milestoneDetail.description}
                      </Text>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Mã milestone">
                  <Text copyable>{milestoneDetail.milestoneId || task.milestoneId || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Thứ tự">
                  {milestoneOrder !== null ? `#${milestoneOrder}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái công việc" span={2}>
                  {workStatus ? (
                    <Tag color={WORK_STATUS_COLORS[workStatus] || 'default'}>
                      {WORK_STATUS_LABELS[workStatus] || milestoneDetail.workStatus}
                    </Tag>
                  ) : (
                    <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Planned timeline">
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      Start: {formatDateTime(getPlannedStartDayjs(milestoneDetail))}
                    </Text>
                    <Text type="secondary">
                      Deadline: {formatDateTime(getPlannedDeadlineDayjs(milestoneDetail))}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Actual timeline">
                  <Space direction="vertical" size={0}>
                    <Text>
                      Start: {formatDateTime(getActualStartDayjs(milestoneDetail))}
                    </Text>
                    <Text>
                      Deadline: {formatDateTime(getActualDeadlineDayjs(milestoneDetail))}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="SLA Days">
                  {milestoneDetail.milestoneSlaDays
                    ? `${milestoneDetail.milestoneSlaDays} ngày`
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty
                description="Không tìm thấy thông tin milestone"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </div>

        <Card title="Danh sách task của milestone này">
          <Table
            dataSource={milestoneTasks}
            loading={milestoneTasksLoading}
            rowKey="assignmentId"
            pagination={false}
            columns={[
              {
                title: 'Task ID',
                dataIndex: 'assignmentId',
                width: 160,
                render: (value, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>#{value || 'N/A'}</Text>
                    {record.assignmentId === task.assignmentId && (
                      <Tag color="purple">Task đang xem</Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: 'Loại task',
                dataIndex: 'taskType',
                width: 140,
                render: type => <Tag color="cyan">{type || 'N/A'}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 140,
                render: (status, record) => (
                  <Space direction="vertical" size={2}>
                    <Tag color={STATUS_COLORS[status?.toLowerCase()] || 'default'}>
                      {STATUS_LABELS[status?.toLowerCase()] || status}
                    </Tag>
                    {record.hasIssue && (
                      <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                        Issue
                      </Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: 'Specialist',
                dataIndex: 'specialistName',
                width: 220,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.specialistName || record.specialistId || 'Chưa gán'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {record.specialistEmail || '—'}
                    </Text>
                  </Space>
                ),
              },
              {
                title: 'Thời gian',
                width: 220,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text>
                      Assigned: {formatDateTime(record.assignedDate)}
                    </Text>
                    <Text>
                      Completed: {formatDateTime(record.completedDate)}
                    </Text>
                  </Space>
                ),
              },
              {
                title: 'Actions',
                width: 120,
                render: (_, record) => (
                  <Button size="small" onClick={() => openTaskDetailModal(record)}>
                    Xem
                  </Button>
                ),
              },
            ]}
            locale={{
              emptyText: (
                <Empty
                  description="Chưa có task nào cho milestone này"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </Card>

        {task.hasIssue && (
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text strong>Issue / Vấn đề</Text>
              </Space>
            }
            style={{ borderColor: '#ff4d4f' }}
            extra={
              <Space>
                <Button type="primary" onClick={handleResolveIssue} loading={resolvingIssue}>
                  Cho tiếp tục
                </Button>
                <Popconfirm
                  title="Xác nhận hủy task và tạo task mới?"
                  description="Task hiện tại sẽ bị hủy và bạn sẽ được chuyển đến trang tạo task mới với thông tin tương tự (milestone, task type). Bạn chỉ cần chọn specialist mới."
                  onConfirm={handleCancelAndCreateNew}
                  okText="Xác nhận"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger loading={cancellingTask}>
                    Cancel and create new
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Alert
                message="Task này có issue"
                description={task.issueReason || 'Specialist đã báo có vấn đề với task này'}
                type="warning"
                showIcon
              />
              {task.issueReportedAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Báo lúc: {formatDateTime(task.issueReportedAt)}
                </Text>
              )}
            </Space>
          </Card>
        )}
      </div>

      <Modal
        title="Chi tiết task"
        open={taskDetailModalVisible}
        onCancel={closeTaskDetailModal}
        footer={[
          <Button key="close" onClick={closeTaskDetailModal}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedTask ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Task Type">
                <Tag color="cyan">
                  {TASK_TYPE_LABELS[selectedTask.taskType] || selectedTask.taskType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[selectedTask.status] || 'default'}>
                  {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Specialist" span={2}>
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {selectedTask.specialistName || selectedTask.specialistId || 'Chưa gán'}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned">
                {formatDateTime(selectedTask.assignedDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Accepted">
                {formatDateTime(selectedTask.specialistRespondedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Completed" span={2}>
                {formatDateTime(getTaskCompletionDate(selectedTask))}
              </Descriptions.Item>
              {selectedTask.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {selectedTask.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card title="Files đã upload" size="small">
              <Spin spinning={selectedTaskFilesLoading}>
                {selectedTaskFiles.length > 0 ? (
                  <List
                    dataSource={selectedTaskFiles}
                    renderItem={file => (
                      <List.Item>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space wrap>
                            <Tag color={FILE_STATUS_COLORS[file.fileStatus?.toLowerCase()] || 'default'}>
                              {FILE_STATUS_LABELS[file.fileStatus?.toLowerCase()] ||
                                file.fileStatus ||
                                'N/A'}
                            </Tag>
                            <Text strong>{file.fileName}</Text>
                            {file.uploadDate && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(file.uploadDate).format('HH:mm DD/MM/YYYY')}
                              </Text>
                            )}
                          </Space>
                          {file.deliveredToCustomer && <Tag color="green">Đã giao khách</Tag>}
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Chưa có file nào được upload" />
                )}
              </Spin>
            </Card>
          </Space>
        ) : (
          <Empty description="Chưa chọn task" />
        )}
      </Modal>
    </div>
  );
};

export default MilestoneAssignmentDetailPage;

