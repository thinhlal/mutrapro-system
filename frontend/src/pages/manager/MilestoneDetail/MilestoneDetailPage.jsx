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
  Table,
  Modal,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CopyOutlined,
  UserAddOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getTaskAssignmentsByMilestone } from '../../../services/taskAssignmentService';
import {
  getContractById,
  getMilestoneById,
} from '../../../services/contractService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './MilestoneDetailPage.module.css';

const { Title, Text } = Typography;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
};

const STATUS_COLORS = {
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Đã gán',
  accepted_waiting: 'Đã nhận - Chờ',
  ready_to_start: 'Sẵn sàng làm',
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

const formatFileSize = bytes => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const MilestoneDetailPage = () => {
  const { contractId, milestoneId } = useParams();
  const navigate = useNavigate();
  const { instruments: instrumentsData, fetchInstruments } =
    useInstrumentStore();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState(null);
  const [contract, setContract] = useState(null);
  const [request, setRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [milestoneTasks, setMilestoneTasks] = useState([]);
  const [milestoneTasksLoading, setMilestoneTasksLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [selectedTaskFiles, setSelectedTaskFiles] = useState([]);
  const [selectedTaskFilesLoading, setSelectedTaskFilesLoading] =
    useState(false);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  useEffect(() => {
    if (contractId && milestoneId) {
      loadData();
    }
  }, [contractId, milestoneId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [milestoneResponse, contractResponse] = await Promise.all([
        getMilestoneById(contractId, milestoneId),
        getContractById(contractId).catch(error => {
          console.warn('Failed to fetch contract info:', error);
          return null;
        }),
      ]);

      if (milestoneResponse?.status === 'success' && milestoneResponse?.data) {
        setMilestone(milestoneResponse.data);
        await fetchMilestoneTasks(contractId, milestoneId);
      } else {
        throw new Error(milestoneResponse?.message || 'Milestone not found');
      }

      if (contractResponse?.status === 'success' && contractResponse?.data) {
        setContract(contractResponse.data);
        // Load request info nếu có requestId
        if (contractResponse.data.requestId) {
          await fetchRequestInfo(contractResponse.data.requestId);
        }
      }
    } catch (error) {
      console.error('Error fetching milestone detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết milestone');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestInfo = async requestId => {
    if (!requestId) return;
    try {
      setRequestLoading(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success' && response?.data) {
        setRequest(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch request info:', error);
      // Không throw error vì request info không bắt buộc
    } finally {
      setRequestLoading(false);
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
      if (
        response?.data?.status === 'success' &&
        Array.isArray(response.data?.data)
      ) {
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

  const milestoneOrder = useMemo(() => {
    if (!milestone) return null;
    return (
      milestone.milestoneOrderIndex ??
      milestone.orderIndex ??
      milestone.sequence ??
      null
    );
  }, [milestone]);

  const workStatus = useMemo(() => {
    if (!milestone) return null;
    return milestone.workStatus?.toLowerCase();
  }, [milestone]);

  const milestoneTitle = useMemo(() => {
    if (!milestone) return 'Milestone';
    return (
      milestone.name ||
      (milestone.orderIndex ? `Milestone ${milestone.orderIndex}` : 'Milestone')
    );
  }, [milestone]);

  // Kiểm tra xem có task active (assigned hoặc in_progress) không
  const hasActiveTask = useMemo(() => {
    return milestoneTasks.some(task => {
      const status = task.status?.toLowerCase();
      return (
        status === 'assigned' ||
        status === 'accepted_waiting' ||
        status === 'ready_to_start' ||
        status === 'in_progress'
      );
    });
  }, [milestoneTasks]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Không tìm thấy milestone" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

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
                  `/manager/task-progress?contractId=${contractId}&milestoneId=${milestoneId}`
                )
              }
            >
              Mở Task Progress
            </Button>
            {!hasActiveTask && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() =>
                  navigate(
                    `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                  )
                }
              >
                Assign Task
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className={styles.sectionStack}>
        {request && (
          <Card
            title="Service Request"
            loading={requestLoading}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  navigate(
                    `/manager/service-requests/${request.requestId}/contracts`
                  )
                }
              >
                View full request
              </Button>
            }
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Request code:{' '}
                </Text>
                <Text
                  strong
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                >
                  {request.requestId}
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Service type:{' '}
                </Text>
                <Tag color="blue" style={{ margin: 0 }}>
                  {(
                    request.serviceType ||
                    request.requestType ||
                    'N/A'
                  ).toUpperCase()}
                </Tag>
              </div>
              {request.durationMinutes && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Audio duration:{' '}
                  </Text>
                  <Text strong>
                    {formatDurationMMSS(request.durationMinutes)}
                  </Text>
                </div>
              )}
              {request.instrumentIds &&
                request.instrumentIds.length > 0 &&
                instrumentsData.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Instruments:{' '}
                    </Text>
                    <Space wrap size={[4, 4]}>
                      {request.instrumentIds.map(id => {
                        const inst = instrumentsData.find(
                          i => i.instrumentId === id
                        );
                        return (
                          <Tag key={id} color="purple" style={{ margin: 0 }}>
                            {inst ? inst.instrumentName : id}
                          </Tag>
                        );
                      })}
                    </Space>
                  </div>
                )}
              {(request.specialNotes || request.description) && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Notes:{' '}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '12px',
                      display: 'block',
                      marginTop: '4px',
                      lineHeight: '1.4',
                    }}
                    ellipsis={{ rows: 2, expandable: false }}
                  >
                    {request.specialNotes || request.description}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        <div className={styles.gridTwoColumn}>
          <Card title="Milestone chi tiết">
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Mã milestone">
                <Space>
                  <Text strong>{milestone.milestoneId}</Text>
                  <Button
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(milestone.milestoneId);
                      message.success('Copied Milestone ID');
                    }}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Thứ tự">
                {milestoneOrder !== null ? `#${milestoneOrder}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tên milestone" span={2}>
                <Space direction="vertical" size={0}>
                  <Text strong>{milestoneTitle}</Text>
                  {milestone.description && (
                    <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {milestone.description}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái công việc">
                {workStatus ? (
                  <Tag color={WORK_STATUS_COLORS[workStatus] || 'default'}>
                    {WORK_STATUS_LABELS[workStatus] || milestone.workStatus}
                  </Tag>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="SLA Days">
                {milestone.milestoneSlaDays
                  ? `${milestone.milestoneSlaDays} ngày`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Planned timeline">
                <Space direction="vertical" size={0}>
                  <Text type="secondary">
                    Start: {formatDateTime(getPlannedStartDayjs(milestone))}
                  </Text>
                  <Text type="secondary">
                    Deadline:{' '}
                    {formatDateTime(getPlannedDeadlineDayjs(milestone))}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Actual timeline">
                <Space direction="vertical" size={0}>
                  <Text>
                    Start: {formatDateTime(getActualStartDayjs(milestone))}
                  </Text>
                  <Text>
                    Deadline:{' '}
                    {formatDateTime(getActualDeadlineDayjs(milestone))}
                  </Text>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <Card
          title="Danh sách task của milestone này"
          extra={
            !hasActiveTask &&
            milestoneTasks.length > 0 && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                size="small"
                onClick={() =>
                  navigate(
                    `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                  )
                }
              >
                Assign Task
              </Button>
            )
          }
        >
          {milestoneTasks.length === 0 && !milestoneTasksLoading ? (
            <Empty
              description={
                <Space direction="vertical" size="middle">
                  <Text type="secondary">
                    Chưa có task nào cho milestone này
                  </Text>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() =>
                      navigate(
                        `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                      )
                    }
                  >
                    Assign Task đầu tiên
                  </Button>
                </Space>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
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
                  render: value => <Text strong>#{value || 'N/A'}</Text>,
                },
                {
                  title: 'Loại task',
                  dataIndex: 'taskType',
                  width: 140,
                  render: type => (
                    <Tag color="cyan">
                      {TASK_TYPE_LABELS[type?.toLowerCase()] || type || 'N/A'}
                    </Tag>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  width: 140,
                  render: (status, record) => (
                    <Space direction="vertical" size={2}>
                      <Tag
                        color={
                          STATUS_COLORS[status?.toLowerCase()] || 'default'
                        }
                      >
                        {STATUS_LABELS[status?.toLowerCase()] ||
                          status ||
                          'N/A'}
                      </Tag>
                      {record.hasIssue && (
                        <Tag
                          color="orange"
                          icon={<ExclamationCircleOutlined />}
                        >
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
                      <Text strong>
                        {record.specialistName ||
                          record.specialistId ||
                          'Chưa gán'}
                      </Text>
                      {record.specialistEmail && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.specialistEmail}
                        </Text>
                      )}
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
                  width: 180,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        size="small"
                        onClick={() => openTaskDetailModal(record)}
                      >
                        Xem
                      </Button>
                      {record.hasIssue && (
                        <Button
                          size="small"
                          type="primary"
                          danger
                          icon={<ExclamationCircleOutlined />}
                          onClick={() =>
                            navigate(
                              `/manager/task-progress?contractId=${contractId}&milestoneId=${milestoneId}&highlightTaskId=${record.assignmentId}`
                            )
                          }
                        >
                          Xử lý Issue
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
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
                  {TASK_TYPE_LABELS[selectedTask.taskType?.toLowerCase()] ||
                    selectedTask.taskType ||
                    'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    STATUS_COLORS[selectedTask.status?.toLowerCase()] ||
                    'default'
                  }
                >
                  {STATUS_LABELS[selectedTask.status?.toLowerCase()] ||
                    selectedTask.status ||
                    'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Specialist" span={2}>
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {selectedTask.specialistName ||
                      selectedTask.specialistId ||
                      'Chưa gán'}
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
                        <Space
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Space wrap>
                            <Tag
                              color={
                                FILE_STATUS_COLORS[
                                  file.fileStatus?.toLowerCase()
                                ] || 'default'
                              }
                            >
                              {FILE_STATUS_LABELS[
                                file.fileStatus?.toLowerCase()
                              ] ||
                                file.fileStatus ||
                                'N/A'}
                            </Tag>
                            <Text strong>{file.fileName}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ({formatFileSize(file.fileSize)})
                            </Text>
                          </Space>
                          <Space>
                            {file.uploadDate && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(file.uploadDate).format(
                                  'HH:mm DD/MM/YYYY'
                                )}
                              </Text>
                            )}
                          </Space>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description="Chưa có file nào được upload"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </Card>
          </Space>
        ) : (
          <Empty
            description="Không có dữ liệu task"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Modal>
    </div>
  );
};

export default MilestoneDetailPage;
