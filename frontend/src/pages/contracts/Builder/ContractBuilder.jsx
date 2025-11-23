import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
  Space,
  Divider,
  message,
  notification,
  Spin,
  Alert,
  Tag,
  Tooltip,
  Card,
} from 'antd';
import {
  QuestionCircleOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  useSearchParams,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getServiceRequestById,
  calculatePricing,
} from '../../../services/serviceRequestService';
import {
  createContractFromRequest,
  getContractById,
  updateContract,
} from '../../../services/contractService';
import { API_CONFIG } from '../../../config/apiConfig';
import {
  getDefaultTermsAndConditions,
  getDefaultSpecialClauses,
} from './contractTemplates';
import {
  formatDurationMMSS,
  formatTempoPercentage,
} from '../../../utils/timeUtils';
import styles from './ContractBuilder.module.css';

const { Title } = Typography;

// Milestone Item Component - tách ra để tránh lỗi hook trong map
const MilestoneItem = ({ field, form, onRemove, index }) => {
  const hasPayment = Form.useWatch(
    ['milestones', field.name, 'hasPayment'],
    form
  );

  // Tách key ra khỏi field để tránh lỗi React key prop
  const { key, ...restField } = field;

  return (
    <Card
      key={key}
      size="small"
      style={{ marginBottom: 16 }}
      title={`Milestone ${index + 1}`}
      extra={
        <MinusCircleOutlined
          onClick={() => onRemove(field.name)}
          style={{
            color: '#ff4d4f',
            cursor: 'pointer',
          }}
        />
      }
    >
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        size="small"
      >
        <Form.Item
          {...restField}
          name={[field.name, 'orderIndex']}
          label="Order Index"
          initialValue={index + 1}
          rules={[{ required: true }]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            disabled
          />
        </Form.Item>

        <Form.Item
          {...restField}
          name={[field.name, 'name']}
          label="Name"
          rules={[
            {
              required: true,
              message: 'Please enter milestone name',
            },
          ]}
        >
          <Input placeholder="e.g., Milestone 1: Deposit & Start Transcription" />
        </Form.Item>

        <Form.Item
          {...restField}
          name={[field.name, 'description']}
          label="Description"
        >
          <Input.TextArea
            rows={2}
            placeholder="Mô tả công việc trong milestone này"
          />
        </Form.Item>

        <Form.Item
          {...restField}
          name={[field.name, 'hasPayment']}
          label="Has Payment"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        {hasPayment && (
          <Form.Item
            {...restField}
            name={[field.name, 'paymentPercent']}
            label="Payment Percent (%)"
            rules={[
              {
                required: true,
                message: 'Payment percent is required when hasPayment is true',
              },
              {
                type: 'number',
                min: 0.01,
                max: 100,
                message: 'Payment percent must be between 0.01 and 100',
              },
            ]}
          >
            <InputNumber
              min={0.01}
              max={100}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="e.g., 30.00"
            />
          </Form.Item>
        )}

        <Form.Item
          {...restField}
          name={[field.name, 'milestoneSlaDays']}
          label={
            <span>
              Milestone SLA Days{' '}
              <Tooltip title="Số ngày SLA cho milestone này. BE sẽ tính plannedStartAt và plannedDueDate khi contract có start date">
                <QuestionCircleOutlined
                  style={{
                    color: '#1890ff',
                    cursor: 'help',
                  }}
                />
              </Tooltip>
            </span>
          }
          rules={[
            {
              required: true,
              message: 'Milestone SLA days is required',
            },
            {
              type: 'number',
              min: 1,
              message: 'Milestone SLA days must be at least 1',
            },
          ]}
        >
          <InputNumber
            min={1}
            max={365}
            step={1}
            style={{ width: '100%' }}
            placeholder="Số ngày SLA cho milestone này"
          />
        </Form.Item>
      </Space>
    </Card>
  );
};

// Helper function để format description, thay thế "X.XX phút" bằng format mm:ss
const formatDescriptionDuration = description => {
  if (!description) return description;

  // Tìm pattern: số thập phân + " phút" hoặc "phút" (ví dụ: "4.38 phút", "5.5 phút", "4.38phút")
  // Pattern này sẽ match cả trường hợp có khoảng trắng hoặc không có
  const pattern = /(\d+\.?\d*)\s*phút/gi;

  return description.replace(pattern, (match, minutes) => {
    const minutesNum = parseFloat(minutes);
    if (!isNaN(minutesNum) && minutesNum > 0) {
      return formatDurationMMSS(minutesNum);
    }
    return match;
  });
};

// Map ServiceType to ContractType
const mapServiceTypeToContractType = serviceType => {
  if (!serviceType) return 'transcription';
  const type = serviceType.toLowerCase();
  if (type === 'transcription') return 'transcription';
  if (type === 'arrangement') return 'arrangement';
  if (type === 'arrangement_with_recording')
    return 'arrangement_with_recording';
  if (type === 'recording') return 'recording';
  return 'transcription';
};

// Get default SLA days based on contract type
const getDefaultSlaDays = contractType => {
  if (contractType === 'transcription') return 7;
  if (contractType === 'arrangement') return 14;
  if (contractType === 'arrangement_with_recording') return 21;
  if (contractType === 'recording') return 7;
  if (contractType === 'bundle') return 21;
  return 7;
};

// Get default revision deadline days based on contract type
const getDefaultRevisionDeadlineDays = contractType => {
  if (contractType === 'transcription') return 30;
  if (contractType === 'arrangement') return 45;
  if (contractType === 'arrangement_with_recording') return 60;
  if (contractType === 'recording') return 30;
  if (contractType === 'bundle') return 60;
  return 30;
};

// Get default additional revision fee (VND) - can be modified
const getDefaultAdditionalRevisionFeeVnd = () => {
  return 500000; // 500,000 VND - default fee per additional revision
};

// Generate contract title from contract type
const getContractTitle = contractType => {
  const titleMap = {
    transcription: 'Transcription Service Agreement',
    arrangement: 'Arrangement Service Agreement',
    arrangement_with_recording: 'Arrangement with Recording Service Agreement',
    recording: 'Recording Service Agreement',
    bundle:
      'Bundle Service Agreement (Transcription + Arrangement + Recording)',
  };
  return titleMap[contractType] || 'Service Agreement';
};

const ContractBuilder = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const previewRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contractId } = useParams(); // For edit mode
  const requestId = searchParams.get('requestId');
  const copyFromContract = location.state?.copyFromContract; // Data từ contract cũ để copy

  // Determine mode: edit or create
  const isEditMode = !!contractId;

  const [loadingServiceRequest, setLoadingServiceRequest] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [existingContract, setExistingContract] = useState(null);
  const [creatingContract, setCreatingContract] = useState(false);
  const [error, setError] = useState(null);

  // Party information - tự động từ service request và env config
  const [partyInfo, setPartyInfo] = useState({
    partyA: API_CONFIG.PARTY_A_NAME,
    partyAAddress: API_CONFIG.PARTY_A_ADDRESS,
    partyB: '',
    partyBPhone: '',
    partyBEmail: '',
  });

  // Pricing breakdown information
  const [pricingBreakdown, setPricingBreakdown] = useState({
    instruments: [], // Array of { instrumentId, instrumentName, basePrice }
    transcriptionDetails: null, // { basePrice, quantity, unitPrice, breakdown }
  });

  // Watch contract_type to update title in real-time
  const contractType = Form.useWatch('contract_type', form) || 'arrangement';
  const formValues = Form.useWatch([], form);

  // Auto-update revision_deadline_days when contract_type changes (only if field is empty)
  useEffect(() => {
    if (!contractType) return;

    // Auto-set revision_deadline_days based on contract type only if field is empty or null
    const currentRevisionDeadlineDays = form.getFieldValue(
      'revision_deadline_days'
    );

    // Only auto-set if field is empty/null/0, allowing user to manually set and keep their value
    if (!currentRevisionDeadlineDays || currentRevisionDeadlineDays === 0) {
      const defaultRevisionDeadlineDays =
        getDefaultRevisionDeadlineDays(contractType);
      form.setFieldValue('revision_deadline_days', defaultRevisionDeadlineDays);
    }
  }, [contractType, form]);

  // Auto-fill Terms & Conditions and Special Clauses when contract_type changes
  useEffect(() => {
    if (!contractType) return;

    const currentTerms = form.getFieldValue('terms_and_conditions');
    const currentClauses = form.getFieldValue('special_clauses');

    // Get current form values for template
    const currentFormValues = formValues || form.getFieldsValue();
    const termsParams = {
      freeRevisionsIncluded: currentFormValues.free_revisions_included ?? 1,
      revisionDeadlineDays: currentFormValues.revision_deadline_days ?? 30,
      additionalRevisionFeeVnd:
        currentFormValues.additional_revision_fee_vnd ?? 500000,
      depositPercent: currentFormValues.deposit_percent ?? 40,
    };

    // Only auto-fill if fields are empty or contain default values
    // Check if current values are the default values for any contract type
    const isDefaultTerms =
      !currentTerms ||
      [
        'transcription',
        'arrangement',
        'arrangement_with_recording',
        'recording',
        'bundle',
      ].some(type => {
        const defaultTerms = getDefaultTermsAndConditions(type, termsParams);
        return currentTerms.trim() === defaultTerms.trim();
      });

    const isDefaultClauses =
      !currentClauses ||
      Object.values({
        transcription: getDefaultSpecialClauses('transcription'),
        arrangement: getDefaultSpecialClauses('arrangement'),
        arrangement_with_recording: getDefaultSpecialClauses(
          'arrangement_with_recording'
        ),
        recording: getDefaultSpecialClauses('recording'),
        bundle: getDefaultSpecialClauses('bundle'),
      }).includes(currentClauses.trim());

    // Get default values for current contract type with actual values
    const defaultTerms = getDefaultTermsAndConditions(
      contractType,
      termsParams
    );
    const defaultClauses = getDefaultSpecialClauses(contractType);

    // Update form if fields are empty or contain default values
    const updates = {};
    if (isDefaultTerms) {
      updates.terms_and_conditions = defaultTerms;
    }
    if (isDefaultClauses) {
      updates.special_clauses = defaultClauses;
    }

    if (Object.keys(updates).length > 0) {
      form.setFieldsValue(updates);
    }
  }, [contractType, form, formValues]);

  // Load contract data when in edit mode
  useEffect(() => {
    if (isEditMode && contractId) {
      loadExistingContract(contractId);
    }
  }, [contractId, isEditMode]);

  // Load service request data when requestId is present
  useEffect(() => {
    if (requestId && !isEditMode) {
      loadServiceRequest(requestId);
    } else if (!requestId && !isEditMode) {
      // Không cho phép tạo contract không có requestId
      // Redirect về trang manage requests hoặc hiển thị error
      setError(
        'Request ID is required. Please create contract from Service Request Management page.'
      );
      message.error(
        'Request ID is required. Please navigate from Service Request Management page.'
      );
      // Redirect về trang manage requests sau 2 giây
      setTimeout(() => {
        navigate('/manager/service-requests');
      }, 2000);
    }
  }, [requestId, form, navigate]);

  // Load service request and auto-fill form
  const loadServiceRequest = async reqId => {
    try {
      setLoadingServiceRequest(true);
      setError(null);
      const response = await getServiceRequestById(reqId);

      if (response?.status === 'success' && response?.data) {
        const request = response.data;
        setServiceRequest(request);

        // Kiểm tra request status - không cho tạo contract nếu đã cancelled/completed/rejected
        const requestStatus = request.status?.toLowerCase();
        if (
          requestStatus === 'cancelled' ||
          requestStatus === 'completed' ||
          requestStatus === 'rejected'
        ) {
          setError(
            `Không thể tạo contract: Request đã ở trạng thái "${request.status}"`
          );
          message.error(
            `Không thể tạo contract cho request đã ${request.status}`
          );
          setLoadingServiceRequest(false);
          return;
        }

        // Map ServiceType to ContractType
        const contractType = mapServiceTypeToContractType(request.requestType);
        const totalPrice = request.totalPrice || 0;
        const depositPercent = 40;
        const defaultSlaDays = getDefaultSlaDays(contractType);
        const defaultRevisionDeadlineDays =
          getDefaultRevisionDeadlineDays(contractType);

        // Get default terms and clauses for this contract type
        const defaultTerms = getDefaultTermsAndConditions(contractType);
        const defaultClauses = getDefaultSpecialClauses(contractType);

        // Auto-fill form with service request data
        // Contract number sẽ được generate ở backend, nhưng set để hiển thị
        form.setFieldsValue({
          request_id: request.requestId || request.id,
          customer_id: request.userId,
          contract_type: contractType, // Ẩn field, chỉ dùng để generate title
          // Currency luôn là VND, không cần set
          deposit_percent: depositPercent,
          total_price: totalPrice, // Có thể chỉnh sửa
          sla_days: defaultSlaDays,
          show_watermark: false,
          free_revisions_included: 1,
          revision_deadline_days: defaultRevisionDeadlineDays,
          additional_revision_fee_vnd: getDefaultAdditionalRevisionFeeVnd(),
          milestones: [], // Empty milestones array - manager will add milestones
          // Auto-fill terms and clauses with default values for this contract type
          // Pass values directly to getDefaultTermsAndConditions
          terms_and_conditions: getDefaultTermsAndConditions(contractType, {
            freeRevisionsIncluded: 1,
            revisionDeadlineDays: defaultRevisionDeadlineDays,
            additionalRevisionFeeVnd: getDefaultAdditionalRevisionFeeVnd(),
            depositPercent: depositPercent,
          }),
          special_clauses: defaultClauses,
        });

        // Set party info vào state để hiển thị
        setPartyInfo({
          partyA: API_CONFIG.PARTY_A_NAME,
          partyAAddress: API_CONFIG.PARTY_A_ADDRESS,
          partyB: request.contactName || 'Customer',
          partyBPhone: request.contactPhone || '',
          partyBEmail: request.contactEmail || '',
        });

        // Load pricing breakdown information
        await loadPricingBreakdown(request);

        // Update terms if needed
        setTimeout(() => {
          // Nếu có copyFromContract, override các giá trị từ contract cũ
          if (copyFromContract) {
            const overrideValues = {};

            // Copy các giá trị từ contract cũ nếu có
            if (copyFromContract.totalPrice !== undefined)
              overrideValues.total_price = copyFromContract.totalPrice;
            if (copyFromContract.depositPercent !== undefined)
              overrideValues.deposit_percent = copyFromContract.depositPercent;
            if (copyFromContract.slaDays !== undefined)
              overrideValues.sla_days = copyFromContract.slaDays;
            if (copyFromContract.freeRevisionsIncluded !== undefined)
              overrideValues.free_revisions_included =
                copyFromContract.freeRevisionsIncluded;
            if (copyFromContract.revisionDeadlineDays !== undefined)
              overrideValues.revision_deadline_days =
                copyFromContract.revisionDeadlineDays;
            if (copyFromContract.additionalRevisionFeeVnd !== undefined)
              overrideValues.additional_revision_fee_vnd =
                copyFromContract.additionalRevisionFeeVnd;
            if (copyFromContract.termsAndConditions)
              overrideValues.terms_and_conditions =
                copyFromContract.termsAndConditions;
            if (copyFromContract.specialClauses)
              overrideValues.special_clauses = copyFromContract.specialClauses;

            // Append lý do yêu cầu sửa vào notes
            let notesText = copyFromContract.notes || '';
            if (copyFromContract.cancellationReason) {
              notesText +=
                (notesText ? '\n\n' : '') +
                `=== Lý do yêu cầu sửa từ contract ${copyFromContract.contractId} ===\n${copyFromContract.cancellationReason}`;
            }
            if (notesText) overrideValues.notes = notesText;

            form.setFieldsValue(overrideValues);
            message.success(
              'Service request data loaded. Contract data copied from previous contract.'
            );
          } else {
            message.success('Service request data loaded successfully');
          }

          // Update terms & conditions with actual values if it's still default
          const currentTerms = form.getFieldValue('terms_and_conditions');
          const updatedValues = form.getFieldsValue();
          const termsParams = {
            freeRevisionsIncluded: updatedValues.free_revisions_included ?? 1,
            revisionDeadlineDays: updatedValues.revision_deadline_days ?? 30,
            additionalRevisionFeeVnd:
              updatedValues.additional_revision_fee_vnd ?? 500000,
            depositPercent: updatedValues.deposit_percent ?? 40,
          };
          const defaultTerms = getDefaultTermsAndConditions(
            contractType,
            termsParams
          );
          // Check if current terms matches the default template
          // If it does, update with actual values
          if (currentTerms && currentTerms.trim() === defaultTerms.trim()) {
            form.setFieldValue('terms_and_conditions', defaultTerms);
          }
        }, 100);
      } else {
        throw new Error('Failed to load service request');
      }
    } catch (error) {
      console.error('Error loading service request:', error);
      setError(error?.message || 'Failed to load service request');
      message.error('Failed to load service request data');
    } finally {
      setLoadingServiceRequest(false);
    }
  };

  // Load existing contract data for edit mode
  const loadExistingContract = async contractId => {
    try {
      setLoadingContract(true);
      setError(null);

      const response = await getContractById(contractId);

      if (response?.status === 'success' && response?.data) {
        const contract = response.data;
        setExistingContract(contract);

        // Check if contract is in DRAFT status
        if (contract.status?.toLowerCase() !== 'draft') {
          setError('Chỉ có thể chỉnh sửa contract ở trạng thái DRAFT');
          message.error('Chỉ có thể chỉnh sửa contract ở trạng thái DRAFT');
          setTimeout(() => {
            navigate('/manager/contracts');
          }, 2000);
          return;
        }

        // Pre-fill form with existing contract data FIRST
        form.setFieldsValue({
          request_id: contract.requestId,
          customer_id: contract.userId,
          contract_type: contract.contractType,
          deposit_percent: contract.depositPercent,
          total_price: contract.totalPrice,
          milestones:
            contract.milestones?.map(m => {
              // Tìm installment tương ứng để lấy paymentPercent
              const installment = contract.installments?.find(
                inst => inst.milestoneId === m.milestoneId
              );

              return {
                name: m.name,
                description: m.description,
                orderIndex: m.orderIndex,
                hasPayment: m.hasPayment || false,
                paymentPercent: installment?.percent || null,
                milestoneSlaDays: m.milestoneSlaDays || null,
              };
            }) || [],
          sla_days: contract.slaDays,
          show_watermark: false, // Always show watermark in edit mode
          free_revisions_included: contract.freeRevisionsIncluded,
          revision_deadline_days: contract.revisionDeadlineDays,
          additional_revision_fee_vnd: contract.additionalRevisionFeeVnd,
          terms_and_conditions: contract.termsAndConditions,
          special_clauses: contract.specialClauses,
          notes: contract.notes,
          expires_in_days: contract.expiresAt
            ? Math.ceil(
                (new Date(contract.expiresAt) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            : 7,
        });

        // Prepare party info from contract data
        const newPartyInfo = {
          partyA: API_CONFIG.PARTY_A_NAME,
          partyAAddress: API_CONFIG.PARTY_A_ADDRESS,
          partyB: contract.nameSnapshot || 'Customer',
          partyBPhone: contract.phoneSnapshot || '',
          partyBEmail: contract.emailSnapshot || '',
        };

        // Load service request để lấy pricing breakdown
        if (contract.requestId) {
          try {
            const requestResponse = await getServiceRequestById(
              contract.requestId
            );
            if (
              requestResponse?.status === 'success' &&
              requestResponse?.data
            ) {
              const request = requestResponse.data;
              setServiceRequest(request);
              await loadPricingBreakdown(request);

              // Override party info with request data if available
              if (request.contactName)
                newPartyInfo.partyB = request.contactName;
              if (request.contactPhone)
                newPartyInfo.partyBPhone = request.contactPhone;
              if (request.contactEmail)
                newPartyInfo.partyBEmail = request.contactEmail;
            }
          } catch (error) {
            console.warn('Failed to load service request:', error);
          }
        }

        // Always set party info and update preview
        setPartyInfo(newPartyInfo);

        // Force update preview after everything is loaded
        setTimeout(() => {
          const currentFormValues = form.getFieldsValue(true);
          // Build preview with current form values and new party info
          const normalized = {
            show_seal: true,
            seal_text: 'MuTraPro Official',
            seal_variant: 'red',
            show_watermark: true,

            request_id: currentFormValues.request_id || null,
            customer_id: currentFormValues.customer_id || null,

            contract_type: currentFormValues.contract_type,
            terms_and_conditions:
              currentFormValues.terms_and_conditions?.trim(),
            special_clauses: currentFormValues.special_clauses?.trim(),
            notes: currentFormValues.notes?.trim(),

            total_price: Number(currentFormValues.total_price || 0),
            currency: 'VND',
            deposit_percent: Number(currentFormValues.deposit_percent || 0),

            expected_start_date: null,
            sla_days: Number(currentFormValues.sla_days || 0),
            free_revisions_included: Number(
              currentFormValues.free_revisions_included || 1
            ),
            additional_revision_fee_vnd:
              currentFormValues.additional_revision_fee_vnd
                ? Number(currentFormValues.additional_revision_fee_vnd)
                : null,
            revision_deadline_days: Number(
              currentFormValues.revision_deadline_days || 30
            ),

            // Milestones - use from form values or contract
            milestones: (currentFormValues.milestones || contract.milestones || []).map((m, index) => ({
              name: m.name || `Milestone ${index + 1}`,
              description: m.description || '',
              orderIndex: m.orderIndex || index + 1,
              hasPayment: m.hasPayment || false,
              paymentPercent: m.hasPayment ? Number(m.paymentPercent || 0) : null,
              milestoneSlaDays: m.milestoneSlaDays
                ? Number(m.milestoneSlaDays)
                : null,
            })),

            // Use newPartyInfo directly instead of state
            partyA: newPartyInfo.partyA,
            partyAAddress: newPartyInfo.partyAAddress,
            partyB: newPartyInfo.partyB,
            partyBPhone: newPartyInfo.partyBPhone,
            partyBEmail: newPartyInfo.partyBEmail,
          };
          console.log('Preview data for edit mode:', normalized);
          setData(normalized);
        }, 200);
      } else {
        throw new Error('Failed to load contract');
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setError(error?.message || 'Failed to load contract');
      message.error('Failed to load contract data');
    } finally {
      setLoadingContract(false);
    }
  };

  // Load pricing breakdown (instruments and transcription details)
  const loadPricingBreakdown = async request => {
    try {
      const breakdown = {
        instruments: [],
        transcriptionDetails: null,
      };
      // Use full instruments info from response (backend trả về đầy đủ thông tin)
      if (
        request.instruments &&
        Array.isArray(request.instruments) &&
        request.instruments.length > 0
      ) {
        const selectedInstruments = request.instruments.map(instr => ({
          instrumentId: instr.instrumentId,
          instrumentName: instr.instrumentName,
          basePrice: instr.basePrice || 0,
        }));
        breakdown.instruments = selectedInstruments;
      }

      // Load transcription pricing details if request type is transcription
      if (request.requestType === 'transcription' && request.durationMinutes) {
        try {
          const pricingResponse = await calculatePricing('transcription', {
            durationMinutes: request.durationMinutes,
          });
          if (pricingResponse?.status === 'success' && pricingResponse?.data) {
            breakdown.transcriptionDetails = pricingResponse.data;
          }
        } catch (error) {
          console.warn('Failed to load transcription pricing:', error);
        }
      }

      setPricingBreakdown(breakdown);
    } catch (error) {
      console.warn('Error loading pricing breakdown:', error);
    }
  };

  // Helper function to update terms if it matches default template
  const updateTermsIfDefault = formValues => {
    const currentTerms = formValues.terms_and_conditions;
    const contractType = formValues.contract_type;
    if (!contractType || !currentTerms) return;

    // Check if current terms matches the default template structure
    // Pattern: "Party B is entitled to X free revision" or "X free revisions" followed by "within Y days"
    const revisionPattern =
      /Party B is entitled to \d+ free revision(s)? within \d+ days after delivery/i;
    const hasRevisionSection = revisionPattern.test(currentTerms);

    // Also check for payment terms pattern
    const paymentPattern =
      /Deposit: \d+% of total price|Final payment: Remaining/i;
    const hasPaymentSection = paymentPattern.test(currentTerms);

    // Check if terms contains "REVISIONS" section header (more reliable check)
    const hasRevisionsHeader = /3\.\s*REVISIONS/i.test(currentTerms);
    const hasPaymentHeader = /4\.\s*PAYMENT TERMS/i.test(currentTerms);

    // Update if terms contains default template patterns or headers
    if (
      hasRevisionSection ||
      hasPaymentSection ||
      (hasRevisionsHeader && hasPaymentHeader)
    ) {
      const termsParams = {
        freeRevisionsIncluded: formValues.free_revisions_included ?? 1,
        revisionDeadlineDays: formValues.revision_deadline_days ?? 30,
        additionalRevisionFeeVnd:
          formValues.additional_revision_fee_vnd ?? 500000,
        depositPercent: formValues.deposit_percent ?? 40,
      };
      const updatedTerms = getDefaultTermsAndConditions(
        contractType,
        termsParams
      );
      // Only update if the new terms is different from current
      if (updatedTerms.trim() !== currentTerms.trim()) {
        form.setFieldValue('terms_and_conditions', updatedTerms);
      }
    }
  };

  // Validate payment percentages
  const validatePaymentPercentages = (depositPercent, milestones) => {
    if (!depositPercent || depositPercent <= 0) {
      return {
        valid: false,
        message: 'Deposit percent is required and must be greater than 0',
      };
    }

    const totalPaymentPercent = (milestones || []).reduce((sum, m) => {
      if (m?.hasPayment && m?.paymentPercent) {
        return sum + (Number(m.paymentPercent) || 0);
      }
      return sum;
    }, 0);

    const total = depositPercent + totalPaymentPercent;
    if (Math.abs(total - 100) >= 0.01) {
      return {
        valid: false,
        message: `Total payment percentage must equal 100%. Current: ${total.toFixed(2)}% (deposit: ${depositPercent}% + milestones: ${totalPaymentPercent.toFixed(2)}%)`,
      };
    }

    return { valid: true };
  };

  // Validate milestone SLA days
  const validateMilestoneSlaDays = (contractSlaDays, milestones) => {
    if (!contractSlaDays || contractSlaDays <= 0) {
      return {
        valid: false,
        message: 'Contract SLA days is required and must be greater than 0',
      };
    }

    if (!milestones || milestones.length === 0) {
      return { valid: false, message: 'At least one milestone is required' };
    }

    // Check each milestone has milestoneSlaDays
    for (const m of milestones) {
      if (!m.milestoneSlaDays || m.milestoneSlaDays <= 0) {
        return {
          valid: false,
          message: `Milestone "${m.name || 'N/A'}" must have milestoneSlaDays greater than 0`,
        };
      }
    }

    const totalMilestoneSlaDays = milestones.reduce((sum, m) => {
      return sum + (Number(m.milestoneSlaDays) || 0);
    }, 0);

    if (totalMilestoneSlaDays !== contractSlaDays) {
      return {
        valid: false,
        message: `Total milestone SLA days must equal contract SLA days. Current: ${totalMilestoneSlaDays} days (contract: ${contractSlaDays} days)`,
      };
    }

    return { valid: true };
  };

  const onValuesChange = (changedValues, allValues) => {
    // Also update terms when revision or payment fields change
    if (
      changedValues.free_revisions_included !== undefined ||
      changedValues.revision_deadline_days !== undefined ||
      changedValues.additional_revision_fee_vnd !== undefined ||
      changedValues.deposit_percent !== undefined ||
      changedValues.total_price !== undefined
    ) {
      const allFormValues = form.getFieldsValue();
      updateTermsIfDefault(allFormValues);
    }
  };

  const buildPreviewPayload = values => ({
    show_seal: !!values.show_seal,
    seal_text: values.seal_text?.trim() || 'MuTraPro Official',
    seal_variant: values.seal_variant || 'red',
    show_watermark: !!values.show_watermark,

    request_id: values.request_id || null,
    customer_id: values.customer_id || null,

    contract_type: values.contract_type,
    terms_and_conditions: values.terms_and_conditions?.trim(),
    special_clauses: values.special_clauses?.trim(),
    notes: values.notes?.trim(),

    total_price: Number(values.total_price || 0),
    currency: 'VND',
    deposit_percent: Number(values.deposit_percent || 0),

    // Expected start optional: backend will default to now if null
    expected_start_date: null,
    sla_days: Number(values.sla_days || 0),
    free_revisions_included: Number(values.free_revisions_included || 1),
    additional_revision_fee_vnd: values.additional_revision_fee_vnd
      ? Number(values.additional_revision_fee_vnd)
      : null,

    // Milestones
    milestones: (values.milestones || []).map((m, index) => ({
      name: m.name || `Milestone ${index + 1}`,
      description: m.description || '',
      orderIndex: m.orderIndex || index + 1,
      hasPayment: m.hasPayment || false,
      paymentPercent: m.hasPayment ? Number(m.paymentPercent || 0) : null,
      milestoneSlaDays: m.milestoneSlaDays
        ? Number(m.milestoneSlaDays)
        : null,
    })),

    // preview-only - lấy từ state partyInfo
    partyA: partyInfo.partyA,
    partyAAddress: partyInfo.partyAAddress,
    partyB: partyInfo.partyB,
    partyBPhone: partyInfo.partyBPhone,
    partyBEmail: partyInfo.partyBEmail,
  });

  useEffect(() => {
    if (!form) return;
    updatePreviewSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyInfo]);

  // Auto-update preview when form values change
  useEffect(() => {
    if (!form) return;
    updatePreviewSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues]);

  const updatePreviewSnapshot = (values = form.getFieldsValue(true)) => {
    const normalized = buildPreviewPayload(values);
    setData(normalized);
  };

  // Create or Update contract
  const handleSaveContract = async () => {
    // Validate based on mode
    if (!isEditMode && !requestId) {
      message.error(
        'Request ID is required. Please create contract from Service Request Management page.'
      );
      navigate('/manager/service-requests');
      return;
    }

    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      // Validate at least one milestone is required
      const milestones = values.milestones || [];
      if (!isEditMode && (!milestones || milestones.length === 0)) {
        // Set field error to highlight the milestones field
        form.setFields([
          {
            name: ['milestones'],
            errors: ['At least one milestone is required'],
          },
        ]);
        return;
      }

      // Validate milestone data is complete
      if (!isEditMode && milestones.length > 0) {
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          if (!m.name || !m.name.trim()) {
            form.setFields([
              {
                name: ['milestones', i, 'name'],
                errors: ['Milestone name is required'],
              },
            ]);
            return;
          }
          if (!m.milestoneSlaDays || Number(m.milestoneSlaDays) <= 0) {
            form.setFields([
              {
                name: ['milestones', i, 'milestoneSlaDays'],
                errors: ['Milestone SLA days must be greater than 0'],
              },
            ]);
            return;
          }
          if (m.hasPayment && (!m.paymentPercent || Number(m.paymentPercent) <= 0)) {
            form.setFields([
              {
                name: ['milestones', i, 'paymentPercent'],
                errors: ['Payment percent is required when hasPayment is enabled'],
              },
            ]);
            return;
          }
        }
      }

      // Validate payment percentages
      const depositPercent = Number(values.deposit_percent || 40);
      const paymentValidation = validatePaymentPercentages(
        depositPercent,
        milestones
      );

      if (!paymentValidation.valid) {
        return;
      }

      // Validate milestone SLA days
      const contractSlaDays = Number(values.sla_days || 7);
      const slaValidation = validateMilestoneSlaDays(
        contractSlaDays,
        milestones
      );

      if (!slaValidation.valid) {
        return;
      }

      setCreatingContract(true);
      setError(null);

      // Prepare contract data
      const totalPrice = Number(values.total_price || 0);
      const contractData = {
        contractType: values.contract_type,
        totalPrice: totalPrice,
        currency: 'VND',
        depositPercent: depositPercent,
        slaDays: Number(values.sla_days || 7),
        expectedStartDate: null,
        termsAndConditions: values.terms_and_conditions?.trim(),
        specialClauses: values.special_clauses?.trim(),
        notes: values.notes?.trim(),
        freeRevisionsIncluded:
          values.free_revisions_included !== undefined &&
          values.free_revisions_included !== null
            ? Number(values.free_revisions_included)
            : 1,
        revisionDeadlineDays:
          values.revision_deadline_days !== undefined &&
          values.revision_deadline_days !== null
            ? Number(values.revision_deadline_days)
            : getDefaultRevisionDeadlineDays(
                values.contract_type || 'transcription'
              ),
        additionalRevisionFeeVnd: values.additional_revision_fee_vnd
          ? Number(values.additional_revision_fee_vnd)
          : getDefaultAdditionalRevisionFeeVnd(),
      };

      // Only include milestones when creating new contract (not in edit mode)
      if (!isEditMode) {
        const milestonesData = (milestones || [])
          .filter(m => m && m.name && m.name.trim()) // Filter out empty milestones
          .map((m, index) => ({
            name: m.name.trim(),
            description: (m.description || '').trim(),
            orderIndex: m.orderIndex || index + 1,
            hasPayment: m.hasPayment || false,
            paymentPercent: m.hasPayment && m.paymentPercent
              ? Number(m.paymentPercent)
              : null,
            milestoneSlaDays: m.milestoneSlaDays
              ? Number(m.milestoneSlaDays)
              : null,
          }));

        if (milestonesData.length > 0) {
          contractData.milestones = milestonesData;
        }
      }

      let response;
      if (isEditMode) {
        // Update existing contract
        response = await updateContract(contractId, contractData);
      } else {
        // Create new contract
        response = await createContractFromRequest(requestId, contractData);
      }

      // Check response status
      if (response?.status === 'success' && response?.data) {
        notification.success({
          message: 'Success',
          description: `Contract ${isEditMode ? 'updated' : 'created'} successfully!`,
          placement: 'topRight',
        });
        // Navigate to contracts list
        navigate('/manager/contracts');
      } else {
        const errorMessage =
          response?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} contract`;
        notification.error({
          message: 'Error',
          description: errorMessage,
          placement: 'topRight',
        });
        // Don't set error state to avoid redirecting to error page
        // setError(errorMessage);
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? 'updating' : 'creating'} contract:`,
        error
      );
      
      // Extract error message from different error formats
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} contract`;
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.response?.data) {
        // Handle case where error.response.data is the error object
        errorMessage = error.response.data.message || JSON.stringify(error.response.data);
      }
      
      notification.error({
        message: 'Error',
        description: errorMessage,
        placement: 'topRight',
        duration: 5,
      });
      // Don't set error state to avoid redirecting to error page for validation errors
      // Only set for critical errors that require redirect
      // setError(errorMessage);
    } finally {
      setCreatingContract(false);
    }
  };

  // Backward compatibility - keep the old name
  const handleCreateContract = handleSaveContract;

  const header = useMemo(
    () => (
      <div className={styles.header}>
        <div>
          <div className={styles.brand}>MuTraPro</div>
          <div className={styles.tagline}>Contract Preview</div>
        </div>
        <div className={styles.meta}>
          <div>Generated: {dayjs().format('YYYY-MM-DD HH:mm')}</div>
        </div>
      </div>
    ),
    []
  );

  if (loadingServiceRequest) {
    return (
      <div
        className={styles.page}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          // className={styles.card}
          style={{
            textAlign: 'center',
            padding: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading service request data...</div>
        </div>
      </div>
    );
  }

  // Hiển thị error nếu request status không hợp lệ
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{ padding: '50px' }}>
          <Alert
            message="Không thể tạo Contract"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            onClick={() => navigate('/manager/service-requests')}
          >
            Quay lại Service Requests
          </Button>
        </div>
      </div>
    );
  }

  // Show loading spinner while loading
  if (loadingServiceRequest || loadingContract) {
    return (
      <div
        className={styles.page}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spin
          size="large"
          tip={
            isEditMode
              ? 'Loading contract data...'
              : 'Loading service request data...'
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ====== LEFT SECTION: FORM ====== */}
      <div className={styles.formSection}>
        <div className={`${styles.card} ${styles.formCard}`}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
              {isEditMode
                ? 'Edit Contract'
                : 'Create Contract from Service Request'}
            </Title>
            <Tag
              color="default"
              style={{ fontSize: '11px', padding: '1px 6px', margin: 0 }}
            >
              Status: Draft
            </Tag>
          </div>
          {!requestId && !isEditMode ? (
            <>
              <Alert
                message="Request ID Required"
                description="Contract can only be created from Service Request Management page. Please navigate from a service request to create a contract."
                type="error"
                showIcon
                action={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => navigate('/manager/service-requests')}
                  >
                    Go to Service Requests
                  </Button>
                }
              />
            </>
          ) : (
            <>
              {/* Contract Title - hiển thị tự động từ contract type */}
              <div
                style={{
                  marginBottom: 6,
                  padding: '6px 10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                }}
              >
                <strong style={{ fontSize: '13px', color: '#1890ff' }}>
                  {getContractTitle(contractType)}
                </strong>
              </div>

              {/* Party Information sẽ hiển thị trong Contract Preview */}
              {serviceRequest && !isEditMode && (
                <Alert
                  message={`Creating contract for request: ${serviceRequest.title || serviceRequest.requestId}`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 6, padding: '6px 8px' }}
                  size="small"
                />
              )}
              {isEditMode && existingContract && (
                <Alert
                  message={`Editing contract: ${existingContract.contractNumber || existingContract.contractId}`}
                  description={`Request ID: ${existingContract.requestId}`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 6, padding: '6px 8px' }}
                  size="small"
                />
              )}
              {copyFromContract && (
                <Alert
                  message="Tạo contract mới từ contract cũ"
                  description={`Data đã được copy từ contract ${copyFromContract.contractId}. Lý do yêu cầu sửa đã được thêm vào phần Notes.`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 6, padding: '6px 8px' }}
                  size="small"
                />
              )}
              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  style={{ marginBottom: 6, padding: '6px 8px' }}
                  size="small"
                />
              )}
              <Divider style={{ margin: '4px 0' }} />

              <div className={styles.formCardContent}>
                <Form
                  form={form}
                  layout="vertical"
                  className={styles.formGrid}
                  onValuesChange={onValuesChange}
                >
                  {/* Cột trái */}
                  <Form.Item
                    name="request_id"
                    label="Request ID"
                    className={styles.disabledInput}
                  >
                    <Input
                      disabled
                      placeholder="Auto-filled from service request"
                    />
                  </Form.Item>
                  <Form.Item
                    name="customer_id"
                    label="Customer ID"
                    className={styles.disabledInput}
                  >
                    <Input
                      disabled
                      placeholder="Auto-filled from service request"
                    />
                  </Form.Item>

                  <Form.Item name="contract_type" hidden>
                    <Input />
                  </Form.Item>

                  {/* Pricing & Computed */}
                  <Divider className={styles.fullRow}>
                    Pricing & Computed
                  </Divider>
                  <Form.Item
                    name="total_price"
                    label="Total Price (VND)"
                    rules={[
                      { required: true, message: 'Please enter total price' },
                    ]}
                    className={styles.disabledInput}
                  >
                    <InputNumber
                      min={0}
                      step={1000}
                      style={{ width: '100%' }}
                      disabled
                    />
                  </Form.Item>
                  <Form.Item
                    name="deposit_percent"
                    label="Deposit %"
                    initialValue={40}
                    rules={[
                      {
                        required: true,
                        message: 'Please enter deposit percent',
                      },
                      {
                        type: 'number',
                        min: 1,
                        max: 100,
                        message: 'Deposit percent must be between 1 and 100',
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      step={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Divider className={styles.fullRow}>
                    Timeline & Revision Policy
                  </Divider>
                  <Form.Item
                    name="sla_days"
                    label={
                      <span>
                        SLA Days (Service Level Agreement){' '}
                        <Tooltip title="Total number of SLA days for all milestones. Due date will be calculated from the last milestone's plannedDueDate after payments are made">
                          <QuestionCircleOutlined
                            style={{ color: '#1890ff', cursor: 'help' }}
                          />
                        </Tooltip>
                      </span>
                    }
                  >
                    <InputNumber
                      min={0}
                      max={120}
                      style={{ width: '100%' }}
                      placeholder="Số ngày deadline"
                    />
                  </Form.Item>
                  <Form.Item
                    name="free_revisions_included"
                    label="Free Revisions Included"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (value === 0) {
                            return Promise.reject(
                              new Error(
                                'Warning: Setting free revisions to 0 means no free revisions will be provided. Please confirm this is intentional.'
                              )
                            );
                          }
                          return Promise.resolve();
                        },
                        warningOnly: true,
                      },
                    ]}
                    help={
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const value = getFieldValue(
                            'free_revisions_included'
                          );
                          if (value === 0) {
                            return (
                              <Alert
                                message="Warning: No free revisions will be provided"
                                type="warning"
                                showIcon
                                style={{ marginTop: 8 }}
                              />
                            );
                          }
                          return null;
                        }}
                      </Form.Item>
                    }
                  >
                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="revision_deadline_days"
                    label={
                      <span>
                        Revision Deadline Days{' '}
                        <Tooltip title="Number of days after delivery for which free revisions are eligible (automatically set based on contract type, but can be modified)">
                          <QuestionCircleOutlined
                            style={{ color: '#1890ff', cursor: 'help' }}
                          />
                        </Tooltip>
                      </span>
                    }
                    rules={[
                      {
                        validator: (_, value) => {
                          if (value === 0) {
                            return Promise.reject(
                              new Error(
                                'Warning: Setting revision deadline to 0 means no deadline period for free revisions. Please confirm this is intentional.'
                              )
                            );
                          }
                          return Promise.resolve();
                        },
                        warningOnly: true,
                      },
                    ]}
                    help={
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const value = getFieldValue('revision_deadline_days');
                          if (value === 0) {
                            return (
                              <Alert
                                message="Warning: No deadline period for free revisions"
                                type="warning"
                                showIcon
                                style={{ marginTop: 8 }}
                              />
                            );
                          }
                          return null;
                        }}
                      </Form.Item>
                    }
                  >
                    <InputNumber
                      min={1}
                      max={365}
                      style={{ width: '100%' }}
                      placeholder="Auto-set based on contract type (30/45/60 days)"
                    />
                  </Form.Item>
                  <Form.Item
                    name="additional_revision_fee_vnd"
                    label="Additional Revision Fee (VND)"
                    initialValue={getDefaultAdditionalRevisionFeeVnd()}
                  >
                    <InputNumber
                      min={0}
                      step={100000}
                      style={{ width: '100%' }}
                      placeholder="500,000 VND (default, can be modified)"
                      formatter={value =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>

                  {!isEditMode && (
                    <>
                      <Divider className={styles.fullRow}>
                        Milestones
                      </Divider>

                      <Form.Item
                        className={styles.fullRow}
                        label={
                          <span>
                            Milestones{' '}
                            <Tooltip title="Cấu hình các milestones và phần trăm thanh toán. Tổng depositPercent + sum(paymentPercent của milestones có hasPayment=true) phải = 100%">
                              <QuestionCircleOutlined
                                style={{ color: '#1890ff', cursor: 'help' }}
                              />
                            </Tooltip>
                          </span>
                        }
                        rules={[
                          {
                            validator: (_, value) => {
                              if (!isEditMode && (!value || value.length === 0)) {
                                return Promise.reject(
                                  new Error('At least one milestone is required')
                                );
                              }
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Form.List name="milestones" initialValue={[]}>
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map((field, index) => (
                                <MilestoneItem
                                  key={field.key}
                                  field={field}
                                  form={form}
                                  onRemove={remove}
                                  index={index}
                                />
                              ))}

                              <Form.Item>
                                <Button
                                  type="dashed"
                                  onClick={() => add()}
                                  block
                                  icon={<PlusOutlined />}
                                >
                                  Add Milestone
                                </Button>
                              </Form.Item>
                            </>
                          )}
                        </Form.List>
                      </Form.Item>

                      {/* Validation message */}
                      <Form.Item shouldUpdate className={styles.fullRow}>
                        {() => {
                          const depositPercent =
                            form.getFieldValue('deposit_percent') || 0;
                          const milestones =
                            form.getFieldValue('milestones') || [];
                          const contractSlaDays =
                            form.getFieldValue('sla_days') || 0;

                          // Payment percentage validation
                          const totalPaymentPercent = milestones.reduce(
                            (sum, m) => {
                              if (m?.hasPayment && m?.paymentPercent) {
                                return sum + (Number(m.paymentPercent) || 0);
                              }
                              return sum;
                            },
                            0
                          );
                          const total = depositPercent + totalPaymentPercent;
                          const paymentIsValid = Math.abs(total - 100) < 0.01; // Allow small floating point errors

                          // Milestone SLA days validation
                          const totalMilestoneSlaDays = milestones.reduce(
                            (sum, m) => {
                              return sum + (Number(m.milestoneSlaDays) || 0);
                            },
                            0
                          );
                          const slaIsValid =
                            milestones.length > 0 &&
                            contractSlaDays > 0 &&
                            totalMilestoneSlaDays === contractSlaDays;

                          // Build validation messages
                          const messages = [];

                          // Check if at least one milestone is required
                          if (!isEditMode && milestones.length === 0) {
                            messages.push(
                              <div
                                key="milestone-required"
                                style={{
                                  fontSize: '12px',
                                  color: '#ff4d4f',
                                  marginTop: 4,
                                }}
                              >
                                <CloseCircleOutlined
                                  style={{ marginRight: 4, color: '#ff4d4f' }}
                                />
                                At least one milestone is required
                              </div>
                            );
                          }

                          if (milestones.length > 0) {
                            // Payment validation message
                            if (!paymentIsValid) {
                              messages.push(
                                <div
                                  key="payment-error"
                                  style={{
                                    fontSize: '12px',
                                    color: '#ff4d4f',
                                    marginTop: 4,
                                  }}
                                >
                                  <CheckCircleOutlined
                                    style={{ marginRight: 4, color: '#ff4d4f' }}
                                  />
                                  Payment: {total.toFixed(2)}% (Deposit: {depositPercent}% + Milestones: {totalPaymentPercent.toFixed(2)}%) - Must equal 100%
                                </div>
                              );
                            } else {
                              messages.push(
                                <div
                                  key="payment-success"
                                  style={{
                                    fontSize: '12px',
                                    color: '#52c41a',
                                    marginTop: 4,
                                  }}
                                >
                                  <CheckCircleOutlined
                                    style={{ marginRight: 4, color: '#52c41a' }}
                                  />
                                  Payment: {total.toFixed(2)}% ✓
                                </div>
                              );
                            }

                            // SLA validation message
                            if (contractSlaDays > 0) {
                              if (slaIsValid) {
                                messages.push(
                                  <div
                                    key="sla-success"
                                    style={{
                                      fontSize: '12px',
                                      color: '#52c41a',
                                      marginTop: 4,
                                    }}
                                  >
                                    <CheckCircleOutlined
                                      style={{ marginRight: 4, color: '#52c41a' }}
                                    />
                                    SLA: {totalMilestoneSlaDays} days = Contract SLA ✓
                                  </div>
                                );
                              } else {
                                messages.push(
                                  <div
                                    key="sla-error"
                                    style={{
                                      fontSize: '12px',
                                      color: '#ff4d4f',
                                      marginTop: 4,
                                    }}
                                  >
                                    <CloseCircleOutlined
                                      style={{ marginRight: 4, color: '#ff4d4f' }}
                                    />
                                    SLA: {totalMilestoneSlaDays} days ≠ Contract SLA: {contractSlaDays} days
                                  </div>
                                );
                              }
                            }
                          }

                          return messages.length > 0 ? <>{messages}</> : null;
                        }}
                      </Form.Item>
                    </>
                  )}

                  <Divider className={styles.fullRow}>Terms</Divider>
                  <Form.Item
                    name="terms_and_conditions"
                    label="Terms & Conditions"
                    className={styles.fullRow}
                  >
                    <Input.TextArea rows={3} placeholder="General terms..." />
                  </Form.Item>
                  <Form.Item
                    name="special_clauses"
                    label="Special Clauses"
                    className={styles.fullRow}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Any special clauses..."
                    />
                  </Form.Item>
                  <Form.Item
                    name="notes"
                    label="Internal Notes"
                    className={styles.fullRow}
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>

                  <div
                    className={styles.fullRow}
                    style={{ marginTop: 8, textAlign: 'right' }}
                  >
                    <Button
                      type="primary"
                      danger
                      size="small"
                      loading={creatingContract}
                      onClick={handleCreateContract}
                    >
                      {isEditMode ? 'Update Contract' : 'Create Contract'}
                    </Button>
                  </div>
                </Form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ====== RIGHT SECTION: PREVIEW ====== */}
      {(requestId || isEditMode) && (
        <div className={styles.previewSection}>
          <div className={`${styles.card} ${styles.previewCard}`}>
            <div className={styles.previewToolbar}>
              <Title level={5} style={{ margin: 0 }}>
                Contract Preview
              </Title>
            </div>

            <div className={styles.preview} ref={previewRef}>
              {header}
              <div className={styles.doc}>
                {data?.show_watermark && (
                  <div className={styles.watermark}>
                    {(data?.status || 'DRAFT').toString().toUpperCase()}
                  </div>
                )}

                <h1 className={styles.docTitle}>
                  {getContractTitle(data?.contract_type) || 'Service Agreement'}
                </h1>
                <p>
                  <strong>Status:</strong> draft
                </p>

                <h3>Parties</h3>
                <p>
                  <strong>Party A (Provider):</strong>{' '}
                  {data?.partyA || API_CONFIG.PARTY_A_NAME}
                  {data?.partyAAddress && ` – ${data.partyAAddress}`}
                  <br />
                  <strong>Party B (Customer):</strong> {data?.partyB || 'N/A'}
                  {data?.partyBPhone && ` | Phone: ${data.partyBPhone}`}
                  {data?.partyBEmail && ` | Email: ${data.partyBEmail}`}
                </p>

                {/* Request Summary */}
                {serviceRequest &&
                  (serviceRequest.title || serviceRequest.description) && (
                    <>
                      <h3>Request Summary</h3>
                      {serviceRequest.title && (
                        <p>
                          <strong>Title:</strong> {serviceRequest.title}
                        </p>
                      )}
                      {serviceRequest.description && (
                        <p style={{ whiteSpace: 'pre-line' }}>
                          {serviceRequest.description}
                        </p>
                      )}
                    </>
                  )}

                <h3>Pricing & Payment</h3>

                {/* Pricing Breakdown */}
                {(pricingBreakdown.transcriptionDetails ||
                  pricingBreakdown.instruments.length > 0) && (
                  <div
                    style={{
                      marginBottom: '16px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                        border: '1px solid #000',
                        backgroundColor: '#fff',
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              textAlign: 'left',
                              backgroundColor: '#e8e8e8',
                              fontWeight: 'bold',
                            }}
                          >
                            Item
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              textAlign: 'right',
                              backgroundColor: '#e8e8e8',
                              fontWeight: 'bold',
                              width: '150px',
                            }}
                          >
                            Amount ({data?.currency || 'VND'})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Transcription Details */}
                        {pricingBreakdown.transcriptionDetails?.breakdown?.map(
                          (item, index) => (
                            <tr key={`transcription-${index}`}>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  backgroundColor: '#fff',
                                }}
                              >
                                {item.label}
                                {item.description && (
                                  <div
                                    style={{
                                      color: '#666',
                                      fontSize: '12px',
                                      marginTop: '4px',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    (
                                    {formatDescriptionDuration(
                                      item.description
                                    )}
                                    )
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  textAlign: 'right',
                                  fontWeight: 'bold',
                                  backgroundColor: '#fff',
                                }}
                              >
                                {item.amount?.toLocaleString?.() ?? item.amount}
                              </td>
                            </tr>
                          )
                        )}

                        {/* Instruments */}
                        {pricingBreakdown.instruments.length > 0 && (
                          <>
                            <tr>
                              <td
                                colSpan={2}
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#f0f0f0',
                                }}
                              >
                                Instruments Surcharge:
                              </td>
                            </tr>
                            {pricingBreakdown.instruments.map(
                              (instr, index) => (
                                <tr key={`instrument-${index}`}>
                                  <td
                                    style={{
                                      border: '1px solid #000',
                                      padding: '8px',
                                      paddingLeft: '24px',
                                      backgroundColor: '#fff',
                                    }}
                                  >
                                    • {instr.instrumentName}
                                  </td>
                                  <td
                                    style={{
                                      border: '1px solid #000',
                                      padding: '8px',
                                      textAlign: 'right',
                                      fontWeight: 'bold',
                                      backgroundColor: '#fff',
                                    }}
                                  >
                                    {instr.basePrice?.toLocaleString?.() ??
                                      instr.basePrice}
                                  </td>
                                </tr>
                              )
                            )}
                            <tr>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#e8e8e8',
                                }}
                              >
                                Instruments Total:
                              </td>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  textAlign: 'right',
                                  fontWeight: 'bold',
                                  backgroundColor: '#e8e8e8',
                                }}
                              >
                                {pricingBreakdown.instruments
                                  .reduce(
                                    (sum, instr) =>
                                      sum + (instr.basePrice || 0),
                                    0
                                  )
                                  .toLocaleString()}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    marginTop: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px',
                          fontWeight: 'bold',
                          backgroundColor: '#e8e8e8',
                        }}
                      >
                        Total Price
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          backgroundColor: '#fff',
                        }}
                      >
                        {data?.total_price?.toLocaleString?.() ??
                          data?.total_price}{' '}
                        {data?.currency || 'VND'}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px',
                          fontWeight: 'bold',
                          backgroundColor: '#e8e8e8',
                        }}
                      >
                        Deposit ({data?.deposit_percent || 0}%)
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          backgroundColor: '#fff',
                        }}
                      >
                        {(
                          (data?.total_price || 0) *
                          ((data?.deposit_percent || 0) / 100)
                        ).toLocaleString()}{' '}
                        {data?.currency || 'VND'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {contractType?.toLowerCase() === 'transcription' &&
                  serviceRequest?.tempoPercentage && (
                    <>
                      <h3>Transcription Preferences</h3>
                      <p>
                        <strong>Tempo Reference:</strong>{' '}
                        {formatTempoPercentage(serviceRequest.tempoPercentage)}
                        {serviceRequest?.durationMinutes && (
                          <>
                            &nbsp;|&nbsp;
                            <strong>Source Duration:</strong>{' '}
                            {formatDurationMMSS(serviceRequest.durationMinutes)}
                          </>
                        )}
                      </p>
                    </>
                  )}

                {/* Milestones */}
                {data?.milestones && data.milestones.length > 0 && (
                  <>
                    <h3>Milestones</h3>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginBottom: '16px',
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              backgroundColor: '#e8e8e8',
                              textAlign: 'left',
                            }}
                          >
                            Milestone
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              backgroundColor: '#e8e8e8',
                              textAlign: 'left',
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              backgroundColor: '#e8e8e8',
                              textAlign: 'center',
                            }}
                          >
                            Payment %
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              padding: '10px',
                              backgroundColor: '#e8e8e8',
                              textAlign: 'center',
                            }}
                          >
                            SLA Days
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.milestones.map((milestone, index) => (
                          <tr key={index}>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                              }}
                            >
                              <strong>
                                {milestone.name || `Milestone ${index + 1}`}
                              </strong>
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                              }}
                            >
                              {milestone.description || '-'}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              {milestone.hasPayment
                                ? `${milestone.paymentPercent || 0}%`
                                : 'N/A'}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              {milestone.milestoneSlaDays || '-'} days
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <h3>Timeline & SLA</h3>
                <p>
                  <strong>SLA Days (Service Level Agreement):</strong>{' '}
                  {data?.sla_days || 0} days
                  {data?.sla_days > 0 && (
                    <>
                      {' '}
                      | <strong>Due:</strong> After {data.sla_days} days if payment is on time
                    </>
                  )}
                </p>

                {data?.terms_and_conditions && (
                  <>
                    <h3>Terms & Conditions</h3>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {data.terms_and_conditions}
                    </p>
                  </>
                )}

                {data?.special_clauses && (
                  <>
                    <h3>Special Clauses</h3>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {data.special_clauses}
                    </p>
                  </>
                )}

                <Divider />
                <div className={styles.signRow}>
                  <div>
                    <div className={styles.sigLabel}>
                      Party A Representative
                    </div>
                    <div className={styles.sigLine} />
                    <div className={styles.sigHint}>Name, Title</div>
                  </div>
                  <div>
                    <div className={styles.sigLabel}>
                      Party B Representative
                    </div>
                    <div className={styles.sigLine} />
                    <div className={styles.sigHint}>Name, Title</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractBuilder;
