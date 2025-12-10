import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  Card,
  Spin,
  Typography,
  Tag,
  Row,
  Col,
  Space,
  List,
  Input,
  Button,
  Form,
  Select,
  message,
  Alert,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getContractById } from '../../../services/contractService';
import {
  getServiceRequestById,
  getNotationInstrumentsByIds,
} from '../../../services/serviceRequestService';
import { getAllSpecialists } from '../../../services/specialistService';
import {
  createTaskAssignment,
  getTaskAssignmentsByContract,
  getTaskAssignmentById,
  updateTaskAssignment,
} from '../../../services/taskAssignmentService';
import FileList from '../../../components/common/FileList/FileList';
import styles from './TaskAssignmentWorkspace.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording_supervision: 'Recording Supervision',
};

const defaultStats = {
  total: 0,
  assigned: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
};

const TASK_TYPE_TO_SPECIALIST = {
  transcription: 'TRANSCRIPTION',
  arrangement: 'ARRANGEMENT',
  recording_supervision: 'ARRANGEMENT', // Recording supervision thường do arrangement specialist làm
};

// Milestone work status colors
const MILESTONE_WORK_STATUS_COLORS = {
  PLANNED: 'default',
  WAITING_ASSIGNMENT: 'orange',
  WAITING_SPECIALIST_ACCEPT: 'gold',
  TASK_ACCEPTED_WAITING_ACTIVATION: 'lime',
  READY_TO_START: 'cyan',
  IN_PROGRESS: 'processing',
  WAITING_CUSTOMER: 'warning',
  READY_FOR_PAYMENT: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

// Milestone work status labels
const MILESTONE_WORK_STATUS_LABELS = {
  PLANNED: 'Đã lên kế hoạch',
  WAITING_ASSIGNMENT: 'Chờ assign task',
  WAITING_SPECIALIST_ACCEPT: 'Chờ specialist accept',
  TASK_ACCEPTED_WAITING_ACTIVATION: 'Đã accept, chờ activate',
  READY_TO_START: 'Sẵn sàng bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  WAITING_CUSTOMER: 'Chờ khách hàng',
  READY_FOR_PAYMENT: 'Sẵn sàng thanh toán',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const INSTRUMENT_USAGE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  both: 'Both',
};

const CONTRACT_STATUS_COLORS = {
  draft: 'default',
  sent: 'geekblue',
  approved: 'green',
  signed: 'orange',
  active_pending_assignment: 'gold',
  active: 'green',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'volcano',
  expired: 'volcano',
};

const CONTRACT_STATUS_TEXT = {
  draft: 'Draft',
  sent: 'Đã gửi',
  approved: 'Đã duyệt',
  signed: 'Đã ký - Chờ thanh toán deposit',
  active_pending_assignment: 'Đã nhận cọc - Chờ gán task',
  active: 'Đang thực thi',
  rejected_by_customer: 'Khách từ chối',
  need_revision: 'Cần chỉnh sửa',
  canceled_by_customer: 'Khách hủy',
  canceled_by_manager: 'Manager thu hồi',
  expired: 'Hết hạn',
};

const getInstrumentUsageLabel = usage => {
  if (!usage) return '';
  const key = typeof usage === 'string' ? usage.toLowerCase() : usage;
  return INSTRUMENT_USAGE_LABELS[key] || usage;
};

export default function TaskAssignmentWorkspace() {
  const { contractId, assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const excludedSpecialistId = searchParams.get('excludeSpecialistId');
  const navigate = useNavigate();
  const isEditMode = !!assignmentId;
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [contract, setContract] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [specialistSearch, setSpecialistSearch] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [taskType, setTaskType] = useState(null);
  const [notes, setNotes] = useState('');
  const [milestoneStats, setMilestoneStats] = useState({});
  const [instrumentDetails, setInstrumentDetails] = useState([]);
  const [instrumentFiltersReady, setInstrumentFiltersReady] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const lastFetchParamsRef = useRef({
    specialization: null,
    instruments: [],
    milestoneId: null,
    contractId: null,
    mainInstrumentName: null,
  });

  const fetchContractDetail = useCallback(async () => {
    try {
      setLoading(true);
      setInstrumentFiltersReady(false);
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setContract(response.data);
        const requestId = response.data.requestId;
        if (requestId) {
          await fetchRequestDetail(requestId);
        }
        await fetchTaskStats(contractId);
      }
    } catch (error) {
      console.error('Error fetching contract detail:', error);
      message.error('Không thể tải thông tin contract');
      setInstrumentFiltersReady(true);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const fetchInstrumentDetails = async instrumentIds => {
    try {
      const response = await getNotationInstrumentsByIds(instrumentIds);
      if (response?.status === 'success' && response?.data) {
        const details =
          response.data
            .map(item => ({
              id: item.instrumentId || item.id,
              name: item.instrumentName || item.name,
              usage: item.usage,
            }))
            .filter(detail => detail.name) || [];
        console.log('Loaded notation instruments', details);
        setInstrumentDetails(details);
        setInstrumentFiltersReady(true);
      }
    } catch (error) {
      console.error('Error fetching instrument names:', error);
      setInstrumentDetails([]);
      setInstrumentFiltersReady(true);
    }
  };

  const fetchRequestDetail = async requestId => {
    try {
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success' && response?.data) {
        console.log('Loaded request detail', response.data);
        setRequestData(response.data);
        const instrumentList = (response.data.instruments || [])
          .map(inst => ({
            id: inst.instrumentId || inst.id,
            name: inst.instrumentName || inst.name,
            usage: inst.usage,
            isMain: inst.isMain === true, // Include isMain field
          }))
          .filter(inst => inst.name);
        if (instrumentList.length > 0) {
          console.log('Using instruments from request payload', instrumentList);
          setInstrumentDetails(instrumentList);
          setInstrumentFiltersReady(true);
        } else if (
          response.data.instrumentIds &&
          response.data.instrumentIds.length > 0
        ) {
          await fetchInstrumentDetails(response.data.instrumentIds);
        } else {
          setInstrumentDetails([]);
          setInstrumentFiltersReady(true);
        }
      }
    } catch (error) {
      console.error('Error fetching request detail:', error);
      setInstrumentFiltersReady(true);
    }
  };

  const fetchSpecialists = useCallback(
    async (
      specializationFilter,
      requiredInstrumentNames = [],
      mainInstrumentName = null
    ) => {
      try {
        const response = await getAllSpecialists({
          specialization: specializationFilter,
          skillNames: requiredInstrumentNames,
          milestoneId: selectedMilestoneId, // Truyền milestoneId để tính tasksInSlaWindow
          contractId: contractId, // Truyền contractId để tính tasksInSlaWindow
          mainInstrumentName: mainInstrumentName, // Truyền main instrument name để filter
        });
        if (response?.status === 'success' && response?.data) {
          const activeSpecialists = response.data.filter(
            s => s.status?.toLowerCase() === 'active'
          );
          console.log('Loaded specialists', activeSpecialists);
          setSpecialists(activeSpecialists);
        }
      } catch (error) {
        console.error('Error fetching specialists:', error);
        message.error('Không thể tải danh sách specialists');
      }
    },
    [selectedMilestoneId, contractId] // Thêm dependencies để fetch lại khi milestone thay đổi
  );

  const [allTasks, setAllTasks] = useState([]); // Lưu tất cả tasks để tìm arrangement task

  const fetchTaskStats = async id => {
    try {
      const response = await getTaskAssignmentsByContract(id);
      if (response?.status === 'success' && response?.data) {
        const tasks = response.data;
        setAllTasks(tasks); // Lưu tất cả tasks

        const statsMap = {};
        tasks.forEach(task => {
          if (!task.milestoneId) return;
          if (!statsMap[task.milestoneId]) {
            statsMap[task.milestoneId] = { ...defaultStats };
          }
          const status = task.status?.toLowerCase();
          statsMap[task.milestoneId].total += 1;
          if (status === 'in_progress')
            statsMap[task.milestoneId].inProgress += 1;
          else if (status === 'completed')
            statsMap[task.milestoneId].completed += 1;
          else if (status === 'cancelled')
            statsMap[task.milestoneId].cancelled += 1;
          else statsMap[task.milestoneId].assigned += 1;
        });
        setMilestoneStats(statsMap);
      }
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  const fetchAssignmentDetail = useCallback(async () => {
    if (!assignmentId || !contractId) return;
    try {
      const response = await getTaskAssignmentById(contractId, assignmentId);
      if (response?.status === 'success' && response?.data) {
        const assignment = response.data;
        setCurrentAssignment(assignment);
        setSelectedMilestoneId(assignment.milestoneId);
        setTaskType(assignment.taskType);
        setNotes(assignment.notes || '');
        // Set selected specialist after specialists are loaded
      }
    } catch (error) {
      console.error('Error fetching assignment detail:', error);
      message.error('Không thể tải thông tin task assignment');
    }
  }, [assignmentId, contractId]);

  // Pre-fill từ query params khi tạo task mới
  useEffect(() => {
    if (!isEditMode) {
      const milestoneId = searchParams.get('milestoneId');
      const taskType = searchParams.get('taskType');
      if (milestoneId) {
        setSelectedMilestoneId(milestoneId);
      }
      if (taskType) {
        setTaskType(taskType);
      }
    }
  }, [isEditMode, searchParams]);

  useEffect(() => {
    fetchContractDetail();
    if (isEditMode) {
      fetchAssignmentDetail();
    }
  }, [fetchContractDetail, isEditMode, fetchAssignmentDetail]);

  useEffect(() => {
    if (!contract?.milestones?.length || isEditMode) return;

    const getActiveCount = milestoneId => {
      const stats = milestoneStats[milestoneId] || defaultStats;
      return (stats.assigned || 0) + (stats.inProgress || 0);
    };

    const findSelectableMilestone = () => {
      return contract.milestones.find(m => {
        const status = m.workStatus?.toUpperCase();
        const allowed = status === 'PLANNED' || status === 'IN_PROGRESS';
        if (!allowed) return false;
        return getActiveCount(m.milestoneId) === 0;
      });
    };

    const selectedHasActive =
      selectedMilestoneId && getActiveCount(selectedMilestoneId) > 0;

    if (!selectedMilestoneId || selectedHasActive) {
      const candidate = findSelectableMilestone() || contract.milestones[0];
      if (candidate && candidate.milestoneId !== selectedMilestoneId) {
        setSelectedMilestoneId(candidate.milestoneId);
        setSelectedSpecialist(null);
      }
    }

    // Tự động set taskType từ milestone.milestoneType (milestoneType luôn được set)
    // QUAN TRỌNG: Milestone nào → Task nấy (không trộn)
    // - Milestone TRANSCRIPTION → Task type: TRANSCRIPTION
    // - Milestone ARRANGEMENT → Task type: ARRANGEMENT
    // - Milestone RECORDING → Task type: RECORDING_SUPERVISION
    // Mỗi milestone có task riêng, không reuse task từ milestone khác
    if (selectedMilestoneId && contract?.milestones) {
      const selectedMilestone = contract.milestones.find(
        m => m.milestoneId === selectedMilestoneId
      );
      if (selectedMilestone?.milestoneType) {
        // Với recording milestone, mặc định dùng recording_supervision
        // (thường do arrangement specialist supervise và deliver)
        if (selectedMilestone.milestoneType === 'recording') {
          setTaskType('recording_supervision');
        } else {
          setTaskType(selectedMilestone.milestoneType);
        }
      }
    }
  }, [contract, milestoneStats, selectedMilestoneId, isEditMode]);

  // Set selected specialist when specialists are loaded and we have assignment data
  // Hoặc auto suggest arrangement specialist cho recording milestone
  useEffect(() => {
    if (
      isEditMode &&
      currentAssignment &&
      specialists.length > 0 &&
      !selectedSpecialist
    ) {
      // Edit mode: set specialist từ assignment hiện tại
      const specialist = specialists.find(
        s => s.specialistId === currentAssignment.specialistId
      );
      if (specialist) {
        setSelectedSpecialist(specialist);
      }
    } else if (
      !isEditMode &&
      selectedMilestoneId &&
      contract &&
      allTasks.length > 0 &&
      specialists.length > 0 &&
      !selectedSpecialist
    ) {
      // Tạo mới: nếu là recording milestone, tìm arrangement task để suggest specialist
      const selectedMilestone = contract.milestones?.find(
        m => m.milestoneId === selectedMilestoneId
      );

      if (
        selectedMilestone?.milestoneType === 'recording' &&
        taskType === 'recording_supervision'
      ) {
        // Tìm arrangement task trong cùng contract
        // Ưu tiên: completed > in_progress > assigned
        const arrangementTasks = allTasks.filter(
          task =>
            task.taskType === 'arrangement' && task.contractId === contractId
        );

        let suggestedTask = null;
        // Ưu tiên completed
        suggestedTask = arrangementTasks.find(t => t.status === 'completed');
        if (!suggestedTask) {
          // Nếu không có completed, tìm in_progress
          suggestedTask = arrangementTasks.find(
            t => t.status === 'in_progress'
          );
        }
        if (!suggestedTask) {
          // Nếu không có in_progress, tìm assigned
          suggestedTask = arrangementTasks.find(t => t.status === 'assigned');
        }

        if (suggestedTask?.specialistId) {
          const suggestedSpecialist = specialists.find(
            s => s.specialistId === suggestedTask.specialistId
          );
          if (suggestedSpecialist) {
            setSelectedSpecialist(suggestedSpecialist);
            message.info(
              `Đã tự động chọn arrangement specialist: ${suggestedSpecialist.fullName || suggestedSpecialist.email}`
            );
          }
        }
      }
    }
  }, [
    isEditMode,
    currentAssignment,
    specialists,
    selectedSpecialist,
    selectedMilestoneId,
    contract,
    allTasks,
    taskType,
    contractId,
  ]);

  useEffect(() => {
    // Chỉ fetch khi contract và milestone đã load xong
    if (!contract || !selectedMilestoneId || !instrumentFiltersReady) return;

    // taskType luôn được set từ milestone.milestoneType
    const effectiveTaskType = taskType;

    const specializationFilter = effectiveTaskType
      ? TASK_TYPE_TO_SPECIALIST[effectiveTaskType]
      : undefined;

    const requiredNames = instrumentDetails
      .filter(inst => {
        const usage = inst.usage ? String(inst.usage).toLowerCase() : '';
        if (!usage) return true;
        if (usage === 'both') {
          if (!effectiveTaskType) return true;
          return (
            effectiveTaskType === 'transcription' ||
            effectiveTaskType === 'arrangement' ||
            effectiveTaskType === 'arrangement_with_recording'
          );
        }
        if (!effectiveTaskType) return true;
        return usage === effectiveTaskType;
      })
      .map(item => item.name);

    // Tìm main instrument name (chỉ cho arrangement và recording_supervision)
    // Với recording_supervision, cũng cần filter theo main instrument vì thường do arrangement specialist làm
    const mainInstrument = instrumentDetails.find(inst => inst.isMain === true);
    const mainInstrumentName =
      mainInstrument &&
      (effectiveTaskType === 'arrangement' ||
        effectiveTaskType === 'arrangement_with_recording' ||
        effectiveTaskType === 'recording_supervision')
        ? mainInstrument.name
        : null;

    // Kiểm tra xem params có thay đổi không để tránh fetch duplicate
    const currentParams = {
      specialization: specializationFilter,
      instruments: JSON.stringify(requiredNames.sort()),
      milestoneId: selectedMilestoneId || 'none',
      contractId: contractId || 'none',
      mainInstrumentName: mainInstrumentName || 'none',
    };
    const lastParams = lastFetchParamsRef.current;

    if (
      lastParams.specialization === currentParams.specialization &&
      lastParams.instruments === currentParams.instruments &&
      lastParams.milestoneId === currentParams.milestoneId &&
      lastParams.contractId === currentParams.contractId &&
      lastParams.mainInstrumentName === currentParams.mainInstrumentName
    ) {
      // Params không thay đổi, không cần fetch lại
      return;
    }

    // Update ref và fetch
    lastFetchParamsRef.current = currentParams;
    console.log('Fetching specialists with filter:', {
      specializationFilter,
      requiredNames,
      mainInstrumentName,
    });
    fetchSpecialists(specializationFilter, requiredNames, mainInstrumentName);
  }, [
    contract,
    taskType,
    fetchSpecialists,
    instrumentDetails,
    selectedMilestoneId,
    contractId,
    instrumentFiltersReady,
  ]);

  const filteredSpecialists = useMemo(() => {
    let result = specialists;

    // Filter theo search keyword
    if (!specialistSearch) return result;
    const keyword = specialistSearch.toLowerCase();
    return result.filter(s => {
      const name = (
        s.fullName ||
        s.email ||
        s.specialistId ||
        ''
      ).toLowerCase();
      const specialization = s.specialization?.toLowerCase() || '';
      const bio = s.bio?.toLowerCase() || '';
      const matchesKeyword =
        name.includes(keyword) ||
        specialization.includes(keyword) ||
        bio.includes(keyword);

      if (!matchesKeyword) return false;

      if (!isEditMode && excludedSpecialistId) {
        return s.specialistId !== excludedSpecialistId;
      }

      return true;
    });
  }, [
    specialistSearch,
    specialists,
    isEditMode,
    currentAssignment,
    excludedSpecialistId,
  ]);

  const selectedMilestone = useMemo(() => {
    if (!contract?.milestones || !selectedMilestoneId) return null;
    return contract.milestones.find(m => m.milestoneId === selectedMilestoneId);
  }, [contract, selectedMilestoneId]);

  const handleAssign = async () => {
    if (!selectedMilestoneId) {
      message.warning('Vui lòng chọn milestone');
      return;
    }
    if (!selectedSpecialist) {
      message.warning('Vui lòng chọn specialist');
      return;
    }

    // Validate milestone work status
    if (selectedMilestone) {
      const workStatus = selectedMilestone.workStatus?.toUpperCase();
      if (
        workStatus !== 'PLANNED' &&
        workStatus !== 'WAITING_ASSIGNMENT' &&
        workStatus !== 'READY_TO_START' &&
        workStatus !== 'IN_PROGRESS'
      ) {
        message.error(
          `Không thể tạo task: Milestone phải ở trạng thái PLANNED, WAITING_ASSIGNMENT, READY_TO_START hoặc IN_PROGRESS. ` +
            `Trạng thái hiện tại: ${selectedMilestone.workStatus}`
        );
        return;
      }
    }
    try {
      setAssigning(true);
      const assignmentData = {
        specialistId: selectedSpecialist.specialistId,
        taskType: taskType, // Luôn có giá trị từ milestone.milestoneType
        milestoneId: selectedMilestoneId,
        notes: notes || null,
      };

      let response;
      if (isEditMode) {
        response = await updateTaskAssignment(
          contractId,
          assignmentId,
          assignmentData
        );
      } else {
        response = await createTaskAssignment(contractId, assignmentData);
      }

      if (response?.status === 'success') {
        message.success(
          isEditMode
            ? 'Cập nhật task assignment thành công'
            : 'Gán task thành công'
        );
        navigate('/manager/milestone-assignments');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      message.error(
        error?.message ||
          (isEditMode ? 'Không thể cập nhật task' : 'Không thể gán task')
      );
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Spin tip="Đang tải workspace..." />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className={styles.loadingWrapper}>
        <Alert type="error" message="Không tìm thấy contract" />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          style={{ marginTop: 16 }}
          onClick={() => navigate('/manager/milestone-assignments')}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.workspaceHeader}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/manager/milestone-assignments')}
        >
          Quay lại
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {isEditMode ? 'Chỉnh sửa Task Assignment' : 'Assign Task Workspace'}
        </Title>
      </div>

      <Row gutter={[16, 16]} className={styles.topRow}>
        <Col xs={24} lg={6}>
          <Card title="Contract Overview" className={styles.fixedHeightCard}>
            <Space direction="vertical">
              <div>
                <Text strong>Contract Number: </Text>
                <Text>{contract.contractNumber}</Text>
              </div>
              <div>
                <Text strong>Customer: </Text>
                <Text>{contract.nameSnapshot || 'N/A'}</Text>
              </div>
              <div>
                <Text strong>Type: </Text>
                <Tag>{contract.contractType}</Tag>
              </div>
              <div>
                <Text strong>Status: </Text>
                {(() => {
                  const statusLower = contract.status?.toLowerCase() || 'draft';
                  const color =
                    CONTRACT_STATUS_COLORS[statusLower] || 'default';
                  const label =
                    CONTRACT_STATUS_TEXT[statusLower] || contract.status;
                  return <Tag color={color}>{label}</Tag>;
                })()}
              </div>
              <div>
                <Text strong>Total Price: </Text>
                <Tag color="green">
                  {contract.totalPrice?.toLocaleString()} {contract.currency}
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title="Request Details"
            className={`${styles.fixedHeightCard} ${styles.requestCard}`}
            extra={
              requestData?.requestType && (
                <Tag color="cyan">{requestData.requestType}</Tag>
              )
            }
            bodyStyle={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <div className={styles.requestContent}>
              {requestData ? (
                <Space direction="vertical" size="small">
                  <Text strong>{requestData.title}</Text>
                  <Paragraph>{requestData.description}</Paragraph>
                  {instrumentDetails.length > 0 && (
                    <div>
                      <Text strong>Required Instruments:</Text>
                      <Space wrap style={{ marginTop: 4 }}>
                        {instrumentDetails.map(inst => {
                          const isMain = inst.isMain === true;
                          const isArrangement =
                            requestData?.requestType === 'arrangement' ||
                            requestData?.requestType ===
                              'arrangement_with_recording';
                          return (
                            <Tag
                              key={inst.id || inst.name}
                              color={
                                isMain && isArrangement ? 'gold' : 'default'
                              }
                              icon={
                                isMain && isArrangement ? <StarFilled /> : null
                              }
                            >
                              {inst.name}
                              {isMain && isArrangement && ' (Main)'}
                            </Tag>
                          );
                        })}
                      </Space>
                    </div>
                  )}
                  <div>
                    <Text strong>Contact: </Text>
                    <Text>
                      {requestData.contactName} · {requestData.contactEmail}
                    </Text>
                  </div>

                  {/* Preferred Vocalists for arrangement_with_recording */}
                  {requestData?.requestType === 'arrangement_with_recording' &&
                    requestData.preferredSpecialists &&
                    requestData.preferredSpecialists.length > 0 && (
                      <div>
                        <Text strong>Preferred Vocalists: </Text>
                        <Space wrap style={{ marginTop: 4 }}>
                          {requestData.preferredSpecialists.map(
                            (specialist, idx) => (
                              <Tag key={idx} color="pink">
                                {specialist.name ||
                                  `Vocalist ${specialist.specialistId}`}
                              </Tag>
                            )
                          )}
                        </Space>
                      </div>
                    )}

                  {/* Contract Files */}
                  {(() => {
                    const files = (requestData.files || []).filter(
                      f => f.fileSource?.toLowerCase() === 'contract_pdf'
                    );
                    return (
                      files.length > 0 && (
                        <div>
                          <Text strong>Contract Files:</Text>
                          <FileList files={files} maxNameLength={32} />
                        </div>
                      )
                    );
                  })()}

                  {/* Music Files */}
                  {(() => {
                    const files = (requestData.files || []).filter(
                      f => f.fileSource?.toLowerCase() === 'customer_upload'
                    );
                    return (
                      files.length > 0 && (
                        <div>
                          <Text strong>Music Files (Customer Upload):</Text>
                          <FileList files={files} maxNameLength={32} />
                        </div>
                      )
                    );
                  })()}
                </Space>
              ) : (
                <Text type="secondary">Không tìm thấy thông tin request</Text>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title="Milestones"
            className={styles.fixedHeightCard}
            bodyStyle={{ paddingRight: 0 }}
          >
            {contract.milestones && contract.milestones.length > 0 ? (
              <List
                className={styles.milestoneList}
                dataSource={contract.milestones}
                rowKey="milestoneId"
                renderItem={item => {
                  const stats =
                    milestoneStats[item.milestoneId] || defaultStats;
                  const isSelected = item.milestoneId === selectedMilestoneId;
                  const workStatus =
                    item.workStatus?.toUpperCase() || 'PLANNED';
                  const isCompleted = workStatus === 'COMPLETED';
                  const isCancelled = workStatus === 'CANCELLED';
                  // Chỉ cho phép chọn milestones có workStatus = PLANNED, WAITING_ASSIGNMENT, READY_TO_START hoặc IN_PROGRESS
                  const canSelect =
                    workStatus === 'PLANNED' ||
                    workStatus === 'WAITING_ASSIGNMENT' ||
                    workStatus === 'READY_TO_START' ||
                    workStatus === 'IN_PROGRESS';
                  const activeTaskCount =
                    (stats.assigned || 0) + (stats.inProgress || 0);
                  const hasActiveTask = activeTaskCount > 0;
                  const isDisabled =
                    !canSelect || isCompleted || isCancelled || hasActiveTask;

                  const getWorkStatusColor = () => {
                    switch (workStatus) {
                      case 'PLANNED':
                        return 'default';
                      case 'WAITING_ASSIGNMENT':
                        return 'orange';
                      case 'WAITING_SPECIALIST_ACCEPT':
                        return 'gold';
                      case 'TASK_ACCEPTED_WAITING_ACTIVATION':
                        return 'lime';
                      case 'READY_TO_START':
                        return 'cyan';
                      case 'IN_PROGRESS':
                        return 'processing';
                      case 'WAITING_CUSTOMER':
                        return 'warning';
                      case 'READY_FOR_PAYMENT':
                        return 'warning';
                      case 'COMPLETED':
                        return 'success';
                      case 'CANCELLED':
                        return 'error';
                      default:
                        return 'default';
                    }
                  };
                  return (
                    <List.Item
                      className={`${styles.milestoneItem} ${
                        isSelected ? styles.milestoneItemActive : ''
                      } ${isDisabled ? styles.milestoneItemDisabled : ''}`}
                      onClick={() => {
                        if (!isDisabled) {
                          // Cho phép bỏ chọn nếu đã chọn rồi
                          const nextSelectedId = isSelected
                            ? null
                            : item.milestoneId;
                          setSelectedMilestoneId(nextSelectedId);
                          if (nextSelectedId !== selectedMilestoneId) {
                            setSelectedSpecialist(null);
                          }
                        } else {
                          // Hiển thị thông báo nếu milestone không thể chọn
                          const reason = isCompleted
                            ? 'Milestone đã hoàn thành'
                            : isCancelled
                              ? 'Milestone đã bị hủy'
                              : hasActiveTask
                                ? 'Milestone này đã có task đang hoạt động. Vui lòng hoàn tất hoặc hủy task trước khi tạo task mới.'
                                : workStatus === 'WAITING_SPECIALIST_ACCEPT'
                                  ? 'Milestone đang chờ specialist accept task. Vui lòng đợi specialist accept hoặc hủy task hiện tại.'
                                  : workStatus ===
                                      'TASK_ACCEPTED_WAITING_ACTIVATION'
                                    ? 'Milestone đã có task được accept, đang chờ activate. Không thể tạo task mới.'
                                    : 'Chỉ có thể tạo task cho milestone ở trạng thái PLANNED, WAITING_ASSIGNMENT, READY_TO_START hoặc IN_PROGRESS';
                          message.warning(reason);
                        }
                      }}
                    >
                      <div>
                        <div className={styles.milestoneHeader}>
                          <Text strong>
                            {item.orderIndex &&
                              `Milestone ${item.orderIndex}: `}
                            {item.name}
                          </Text>
                          <Space>
                            {/* Milestone Type */}
                            {item.milestoneType && (
                              <Tag color="blue">
                                {TASK_TYPE_LABELS[item.milestoneType] ||
                                  item.milestoneType}
                              </Tag>
                            )}
                            {/* Work Status */}
                            <Tag color={getWorkStatusColor()}>
                              {MILESTONE_WORK_STATUS_LABELS[workStatus] ||
                                workStatus}
                            </Tag>
                          </Space>
                        </div>
                        {/* Task Status */}
                        {hasActiveTask && (
                          <div style={{ marginTop: 8 }}>
                            <Tag color="magenta">
                              {activeTaskCount} task đang hoạt động
                            </Tag>
                            {stats.assigned > 0 && (
                              <Tag color="orange">
                                Assigned: {stats.assigned}
                              </Tag>
                            )}
                            {stats.inProgress > 0 && (
                              <Tag color="processing">
                                In Progress: {stats.inProgress}
                              </Tag>
                            )}
                            {stats.completed > 0 && (
                              <Tag color="success">
                                Completed: {stats.completed}
                              </Tag>
                            )}
                          </div>
                        )}
                        {item.description && (
                          <Paragraph
                            type="secondary"
                            ellipsis={{ rows: 2, expandable: false }}
                            className={styles.milestoneDescription}
                          >
                            {item.description}
                          </Paragraph>
                        )}
                        <div className={styles.milestoneMeta}>
                          {item.plannedStartAt && (
                            <span>
                              <Text type="secondary">Start: </Text>
                              {dayjs(item.plannedStartAt).format('YYYY-MM-DD')}
                            </span>
                          )}
                          {item.plannedDueDate && (
                            <span>
                              <Text type="secondary">Due: </Text>
                              {dayjs(item.plannedDueDate).format('YYYY-MM-DD')}
                            </span>
                          )}
                          {item.milestoneSlaDays && (
                            <span>
                              <Text type="secondary">SLA: </Text>
                              {item.milestoneSlaDays} ngày
                            </span>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="Chưa có milestone" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.bottomRow}>
        <Col xs={24} lg={14}>
          <Card
            title="Specialists"
            className={styles.fixedHeightCard}
            extra={
              <Input
                placeholder="Tìm specialist..."
                allowClear
                value={specialistSearch}
                onChange={e => setSpecialistSearch(e.target.value)}
                prefix={<SearchOutlined />}
                size="small"
              />
            }
          >
            <div className={styles.specialistList}>
              {filteredSpecialists.length > 0 ? (
                <List
                  dataSource={filteredSpecialists}
                  rowKey="specialistId"
                  renderItem={item => {
                    const active =
                      selectedSpecialist?.specialistId === item.specialistId;
                    const loadTagBadge = (() => {
                      const open = item.totalOpenTasks ?? 0;
                      const max = item.maxConcurrentTasks || 1;
                      const ratio = open / max;
                      if (ratio >= 1)
                        return { color: 'red', text: `${open}/${max} (Full)` };
                      if (ratio >= 0.75)
                        return {
                          color: 'volcano',
                          text: `${open}/${max} (Busy)`,
                        };
                      if (ratio >= 0.5)
                        return {
                          color: 'gold',
                          text: `${open}/${max} (Normal)`,
                        };
                      return {
                        color: 'green',
                        text: `${open}/${max} (Available)`,
                      };
                    })();
                    const open = item.totalOpenTasks ?? 0;
                    const max = item.maxConcurrentTasks || 1;
                    const ratio = open / max;
                    const loadTag = (() => {
                      if (ratio >= 1)
                        return { color: 'red', text: `${open}/${max} Full` };
                      if (ratio >= 0.75)
                        return {
                          color: 'volcano',
                          text: `${open}/${max} Busy`,
                        };
                      if (ratio >= 0.5)
                        return { color: 'gold', text: `${open}/${max} Normal` };
                      return {
                        color: 'green',
                        text: `${open}/${max} Available`,
                      };
                    })();
                    return (
                      <List.Item
                        className={`${styles.specialistItem} ${
                          active ? styles.specialistItemActive : ''
                        }`}
                        onClick={() => {
                          // Cho phép bỏ chọn nếu đã chọn rồi
                          setSelectedSpecialist(active ? null : item);
                        }}
                      >
                        <div>
                          <Text strong>
                            {item.fullName || item.email || item.userId}
                          </Text>
                          <div className={styles.specialistMeta}>
                            <Tag>{item.specialization || 'Generalist'}</Tag>
                            <Tag color="blue">
                              {item.experienceYears || 0} yrs exp
                            </Tag>
                            <Tag color={loadTagBadge.color}>
                              {loadTagBadge.text}
                            </Tag>
                            <Tag color="purple">
                              SLA: {item.tasksInSlaWindow ?? 0}
                            </Tag>
                            {item.totalProjects > 0 && (
                              <Tag color="geekblue">
                                Projects: {item.totalProjects}
                              </Tag>
                            )}
                          </div>
                          {item.bio && (
                            <Paragraph
                              type="secondary"
                              ellipsis={{ rows: 2 }}
                              className={styles.specialistBio}
                            >
                              {item.bio}
                            </Paragraph>
                          )}
                        </div>
                        <Button
                          type={active ? 'primary' : 'default'}
                          size="small"
                        >
                          {active ? 'Đang chọn' : 'Chọn'}
                        </Button>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty
                  description="Không tìm thấy specialist phù hợp"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className={`${styles.assignmentCard} ${styles.fixedHeightCard}`}
          >
            <Title level={4}>
              {isEditMode ? 'Chỉnh sửa Task' : 'Thiết lập Task'}
            </Title>
            <Row gutter={16}>
              <Col xs={24} md={10}>
                <Form layout="vertical">
                  <Form.Item label="Ghi chú (optional)">
                    <TextArea
                      rows={4}
                      placeholder="Thêm ghi chú cho specialist"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </Form.Item>
                </Form>
              </Col>
              <Col xs={24} md={14}>
                <div className={styles.assignmentSummary}>
                  <div>
                    <Text type="secondary">Milestone đã chọn</Text>
                    <div className={styles.summaryBox}>
                      <Text>
                        {selectedMilestone?.name || 'Chưa chọn milestone'}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Specialist đã chọn</Text>
                    <div className={styles.summaryBox}>
                      {selectedSpecialist ? (
                        <Space direction="vertical" size={2}>
                          <span>
                            <Text strong>
                              {selectedSpecialist.fullName ||
                                selectedSpecialist.email ||
                                selectedSpecialist.specialistId}
                            </Text>{' '}
                            ({selectedSpecialist.specialization || 'N/A'})
                          </span>
                          {selectedSpecialist.bio && (
                            <Paragraph
                              type="secondary"
                              ellipsis={{ rows: 2 }}
                              className={styles.specialistBio}
                            >
                              {selectedSpecialist.bio}
                            </Paragraph>
                          )}
                          <Space wrap size="small">
                            <Tag color="blue">
                              {selectedSpecialist.experienceYears || 0} yrs exp
                            </Tag>
                            <Tag color="green">
                              Load: {selectedSpecialist.totalOpenTasks ?? 0}/
                              {selectedSpecialist.maxConcurrentTasks || 1}
                            </Tag>
                            <Tag color="purple">
                              SLA window:{' '}
                              {selectedSpecialist.tasksInSlaWindow ?? 0}
                            </Tag>
                          </Space>
                        </Space>
                      ) : (
                        <Text>Chưa chọn specialist</Text>
                      )}
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Task Type</Text>
                    <div className={styles.summaryBox}>
                      <Tag color="blue">
                        {taskType ? TASK_TYPE_LABELS[taskType] : 'Chưa chọn'}
                      </Tag>
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={assigning}
                  onClick={handleAssign}
                  block
                >
                  {isEditMode
                    ? 'Cập nhật task assignment'
                    : 'Xác nhận gán task'}
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
