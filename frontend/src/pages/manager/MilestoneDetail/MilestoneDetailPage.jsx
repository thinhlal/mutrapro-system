import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CopyOutlined,
  UserAddOutlined,
  ExclamationCircleOutlined,
  StarFilled,
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
import { getGenreLabel, getPurposeLabel } from '../../../constants/musicOptionsConstants';
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
  in_revision: 'processing',
  waiting_customer_review: 'purple',
  ready_for_review: 'orange',
  revision_requested: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Đã gán',
  accepted_waiting: 'Đã nhận - Chờ',
  ready_to_start: 'Sẵn sàng làm',
  in_progress: 'Đang thực hiện',
  in_revision: 'Đang chỉnh sửa',
  waiting_customer_review: 'Chờ khách hàng review',
  ready_for_review: 'Chờ duyệt',
  revision_requested: 'Yêu cầu chỉnh sửa',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const WORK_STATUS_COLORS = {
  planned: 'default',
  ready_to_start: 'purple',
  in_progress: 'processing',
  waiting_customer: 'orange',
  ready_for_payment: 'gold',
  completed: 'success',
  cancelled: 'error',
};

const WORK_STATUS_LABELS = {
  planned: 'Chưa bắt đầu',
  ready_to_start: 'Sẵn sàng bắt đầu',
  in_progress: 'Đang thực hiện',
  waiting_customer: 'Chờ khách hàng',
  ready_for_payment: 'Sẵn sàng thanh toán',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
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

const getPlannedDeadlineDayjs = milestone => {
  if (!milestone) return null;
  if (milestone.plannedDueDate) {
    return dayjs(milestone.plannedDueDate);
  }
  if (milestone.plannedStartAt && milestone.milestoneSlaDays) {
    return dayjs(milestone.plannedStartAt).add(
      Number(milestone.milestoneSlaDays || 0),
      'day'
    );
  }
  return null;
};

const getActualDeadlineDayjs = milestone => {
  // SLA tính từ khi bắt đầu làm việc (actualStartAt), không phải từ khi giao bản đầu tiên
  if (!milestone?.actualStartAt || !milestone?.milestoneSlaDays) {
    return null;
  }
  return dayjs(milestone.actualStartAt).add(
    Number(milestone.milestoneSlaDays || 0),
    'day'
  );
};

const getEstimatedDeadlineDayjs = (milestone, contractMilestones = []) => {
  if (!milestone) return null;
  const slaDays = Number(milestone.milestoneSlaDays || 0);
  if (!slaDays) return null;

  const plannedStart = getPlannedStartDayjs(milestone);
  if (plannedStart) {
    return plannedStart.add(slaDays, 'day');
  }

  const orderIndex = milestone.orderIndex;
  if (!orderIndex || orderIndex <= 1) {
    return dayjs().add(slaDays, 'day');
  }

  const previousMilestone =
    contractMilestones.find(
      item =>
        item &&
        item.orderIndex === orderIndex - 1 &&
        (item.contractId
          ? item.contractId === (milestone.contractId || item.contractId)
          : true)
    ) || null;

  if (!previousMilestone) {
    return dayjs().add(slaDays, 'day');
  }

  const previousDeadline =
    getActualDeadlineDayjs(previousMilestone) ||
    getPlannedDeadlineDayjs(previousMilestone) ||
    getEstimatedDeadlineDayjs(previousMilestone, contractMilestones);

  if (!previousDeadline) {
    return dayjs().add(slaDays, 'day');
  }

  return previousDeadline.add(slaDays, 'day');
};

const formatDateTime = value =>
  value ? dayjs(value).format('HH:mm DD/MM/YYYY') : '—';

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

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const fetchRequestInfo = useCallback(async requestId => {
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
  }, []);

  const fetchMilestoneTasks = useCallback(async (contractIdValue, milestoneIdValue) => {
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
  }, []);

  const loadData = useCallback(async () => {
    if (!contractId || !milestoneId) return;
    
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
      } else {
        throw new Error(milestoneResponse?.message || 'Milestone not found');
      }

      if (contractResponse?.status === 'success' && contractResponse?.data) {
        setContract(contractResponse.data);
      }

      // Load tất cả dữ liệu song song để tối ưu performance
      const promises = [
        fetchMilestoneTasks(contractId, milestoneId),
      ];

      // Chỉ load request info nếu có requestId
      if (contractResponse?.status === 'success' && contractResponse?.data?.requestId) {
        promises.push(fetchRequestInfo(contractResponse.data.requestId));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching milestone detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết milestone');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [contractId, milestoneId, fetchMilestoneTasks, fetchRequestInfo, navigate]);

  useEffect(() => {
    if (contractId && milestoneId) {
      loadData();
    }
  }, [contractId, milestoneId, loadData]);


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

  // Kiểm tra xem có task active (assigned, in_progress, in_revision, waiting_customer_review, revision_requested) không
  const hasActiveTask = useMemo(() => {
    return milestoneTasks.some(task => {
      const status = task.status?.toLowerCase();
      return (
        status === 'assigned' ||
        status === 'accepted_waiting' ||
        status === 'ready_to_start' ||
        status === 'in_progress' ||
        status === 'ready_for_review' ||
        status === 'revision_requested' ||
        status === 'in_revision' ||
        status === 'delivery_pending' ||
        status === 'waiting_customer_review'
      );
    });
  }, [milestoneTasks]);

  // Kiểm tra xem có thể hiển thị nút Assign Task không
  const canShowAssignButton = useMemo(() => {
    // Không hiện nếu milestone đã completed hoặc cancelled
    if (workStatus === 'completed' || workStatus === 'cancelled') {
      return false;
    }
    
    // Không hiện nếu có task đang active
    if (hasActiveTask) {
      return false;
    }
    
    // Chỉ chặn nếu có task đã completed (không chặn nếu cancelled vì có thể assign task mới)
    if (milestoneTasks.length > 0) {
      const hasCompletedTask = milestoneTasks.some(task => {
        const status = task.status?.toLowerCase();
        return status === 'completed';
      });
      if (hasCompletedTask) {
        return false;
      }
    }
    
    return true;
  }, [workStatus, hasActiveTask, milestoneTasks]);

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
            {workStatus && (
              <Tag color={WORK_STATUS_COLORS[workStatus] || 'default'}>
                {WORK_STATUS_LABELS[workStatus] || milestone.workStatus}
              </Tag>
            )}
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
            {canShowAssignButton && (
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
              {request.requestType === 'transcription' &&
                request.durationMinutes && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Audio duration:{' '}
                    </Text>
                    <Text strong>
                      {formatDurationMMSS(request.durationMinutes)}
                    </Text>
                  </div>
                )}
              {((request.instruments && request.instruments.length > 0) ||
                (request.instrumentIds &&
                  request.instrumentIds.length > 0 &&
                  instrumentsData.length > 0)) && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Instruments:{' '}
                    </Text>
                    <Space wrap size={[4, 4]}>
                      {request.instruments && request.instruments.length > 0
                        ? request.instruments.map((inst, idx) => {
                            const isMain = inst.isMain === true;
                            const isArrangement =
                              request.requestType === 'arrangement' ||
                              request.requestType === 'arrangement_with_recording';
                            return (
                              <Tag
                                key={inst.instrumentId || idx}
                                color={
                                  isMain && isArrangement ? 'gold' : 'purple'
                                }
                                icon={
                                  isMain && isArrangement ? (
                                    <StarFilled />
                                  ) : null
                                }
                                style={{ margin: 0 }}
                              >
                                {inst.instrumentName || inst.name || inst}
                                {isMain && isArrangement && ' (Main)'}
                              </Tag>
                            );
                          })
                        : request.instrumentIds.map(id => {
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
              {/* Hiển thị genres và purpose cho arrangement requests */}
              {(request.requestType === 'arrangement' ||
                request.requestType === 'arrangement_with_recording') && (
                <>
                  {request.genres && request.genres.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Genres:{' '}
                      </Text>
                      <Space wrap size={[4, 4]}>
                        {request.genres.map((genre, idx) => (
                          <Tag key={idx} color="purple" style={{ margin: 0 }}>
                            {getGenreLabel(genre)}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                  {request.purpose && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Purpose:{' '}
                      </Text>
                      <Text strong>{getPurposeLabel(request.purpose)}</Text>
                    </div>
                  )}
                </>
              )}
              {request.description && (
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
                    {request.description}
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
              <Descriptions.Item label="Milestone Deadline" span={2}>
                {(() => {
                  const actualStart = getActualStartDayjs(milestone);
                  const actualDeadline = getActualDeadlineDayjs(milestone);
                  const plannedStart = getPlannedStartDayjs(milestone);
                  const plannedDeadline = getPlannedDeadlineDayjs(milestone);
                  const estimatedDeadline = getEstimatedDeadlineDayjs(
                    milestone,
                    contract?.milestones || []
                  );
                  return (
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>Actual</Text>
                        <Space direction="vertical" size={0}>
                          <Text>Start: {formatDateTime(actualStart)}</Text>
                          <Text>
                            Deadline: {formatDateTime(actualDeadline)}
                            {milestone.milestoneSlaDays && (
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                (+{milestone.milestoneSlaDays} ngày SLA)
                              </Text>
                            )}
                          </Text>
                        </Space>
                      </div>
                      <div>
                        <Text strong type="secondary">
                          Planned
                        </Text>
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            Start: {formatDateTime(plannedStart)}
                          </Text>
                          <Text type="secondary">
                            Deadline: {formatDateTime(plannedDeadline)}
                          </Text>
                        </Space>
                      </div>
                      {!actualDeadline &&
                        !plannedDeadline &&
                        estimatedDeadline && (
                          <div>
                            <Text strong type="warning">
                              Estimated
                            </Text>
                            <Space direction="vertical" size={0}>
                              <Text type="secondary">
                                Deadline:{' '}
                                {estimatedDeadline.format('HH:mm DD/MM/YYYY')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                (Ước tính khi chưa có planned/actual)
                              </Text>
                            </Space>
                          </div>
                        )}
                    </Space>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="First Submission" span={2}>
                {milestone.firstSubmissionAt
                  ? formatDateTime(milestone.firstSubmissionAt)
                  : '—'}
                {milestone.firstSubmissionAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (Lần giao đầu tiên - để check SLA)
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Work Completed" span={2}>
                {milestone.finalCompletedAt
                  ? formatDateTime(milestone.finalCompletedAt)
                  : '—'}
                {milestone.finalCompletedAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (Customer đã chấp nhận)
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Completed" span={2}>
                {milestone.actualEndAt
                  ? formatDateTime(milestone.actualEndAt)
                  : '—'}
                {milestone.actualEndAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (Milestone đã được thanh toán)
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <Card
          title="Danh sách task của milestone này"
          extra={
            canShowAssignButton && (
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
                        onClick={() =>
                          navigate(
                            `/manager/tasks/${contractId}/${record.assignmentId}`
                          )
                        }
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
    </div>
  );
};

export default MilestoneDetailPage;
