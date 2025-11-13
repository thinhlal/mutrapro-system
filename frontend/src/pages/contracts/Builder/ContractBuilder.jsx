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
  Spin,
  Alert,
  Tag,
  Tooltip,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getServiceRequestById,
  getNotationInstrumentsByIds,
  calculatePricing,
} from '../../../services/serviceRequestService';
import { createContractFromRequest, getContractById, updateContract } from '../../../services/contractService';
import { API_CONFIG } from '../../../config/apiConfig';
import {
  getDefaultTermsAndConditions,
  getDefaultSpecialClauses,
  replaceTemplateVariables,
} from './contractTemplates';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import styles from './ContractBuilder.module.css';

const { Title } = Typography;

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

    // Only auto-fill if fields are empty or contain default values
    // Check if current values are the default values for any contract type
    const isDefaultTerms =
      !currentTerms ||
      Object.values({
        transcription: getDefaultTermsAndConditions('transcription'),
        arrangement: getDefaultTermsAndConditions('arrangement'),
        arrangement_with_recording: getDefaultTermsAndConditions(
          'arrangement_with_recording'
        ),
        recording: getDefaultTermsAndConditions('recording'),
        bundle: getDefaultTermsAndConditions('bundle'),
      }).some(defaultTerms => {
        const normalizedDefault = replaceTemplateVariables(
          defaultTerms,
          formValues || {}
        );
        return currentTerms.trim() === normalizedDefault.trim();
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

    // Get default values for current contract type
    const defaultTerms = getDefaultTermsAndConditions(contractType);
    const defaultClauses = getDefaultSpecialClauses(contractType);

    // Replace template variables
    const termsWithValues = replaceTemplateVariables(
      defaultTerms,
      formValues || {}
    );

    // Update form if fields are empty or contain default values
    const updates = {};
    if (isDefaultTerms) {
      updates.terms_and_conditions = termsWithValues;
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

        // Calculate initial values for template replacement
        const initialDepositAmount = totalPrice * (depositPercent / 100);
        const initialFinalAmount = totalPrice - initialDepositAmount;

        // Auto-fill form with service request data
        // Contract number sẽ được generate ở backend, nhưng set để hiển thị
        form.setFieldsValue({
          request_id: request.requestId || request.id,
          customer_id: request.userId,
          manager_id: request.managerUserId,
          contract_type: contractType, // Ẩn field, chỉ dùng để generate title
          // Currency luôn là VND, không cần set
          deposit_percent: depositPercent,
          total_price: totalPrice, // Có thể chỉnh sửa
          sla_days: defaultSlaDays,
          show_watermark: true,
          free_revisions_included: 1,
          revision_deadline_days: defaultRevisionDeadlineDays,
          additional_revision_fee_vnd: getDefaultAdditionalRevisionFeeVnd(),
          // Auto-fill terms and clauses with default values for this contract type
          // Replace template variables with initial calculated values
          terms_and_conditions: replaceTemplateVariables(defaultTerms, {
            deposit_percent: depositPercent,
            free_revisions_included: 1,
            additional_revision_fee_vnd: getDefaultAdditionalRevisionFeeVnd(),
            final_amount: initialFinalAmount,
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

        // Trigger recompute to calculate deposit and final amount
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

          recompute();

          // After recompute, update terms & conditions with actual values if it's still default
          const currentTerms = form.getFieldValue('terms_and_conditions');
          const defaultTerms = getDefaultTermsAndConditions(contractType);
          // Check if current terms matches the default template (before variable replacement)
          // If it does, update with replaced variables
          if (currentTerms && currentTerms.trim() === defaultTerms.trim()) {
            const updatedValues = form.getFieldsValue();
            const termsWithValues = replaceTemplateVariables(
              defaultTerms,
              updatedValues
            );
            form.setFieldValue('terms_and_conditions', termsWithValues);
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
          manager_id: contract.managerUserId,
          contract_type: contract.contractType,
          deposit_percent: contract.depositPercent,
          total_price: contract.totalPrice,
          deposit_amount: contract.depositAmount,
          final_amount: contract.finalAmount,
          sla_days: contract.slaDays,
          show_watermark: true, // Always show watermark in edit mode
          free_revisions_included: contract.freeRevisionsIncluded,
          revision_deadline_days: contract.revisionDeadlineDays,
          additional_revision_fee_vnd: contract.additionalRevisionFeeVnd,
          terms_and_conditions: contract.termsAndConditions,
          special_clauses: contract.specialClauses,
          notes: contract.notes,
          expires_in_days: contract.expiresAt ? 
            Math.ceil((new Date(contract.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 
            7,
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
            const requestResponse = await getServiceRequestById(contract.requestId);
            if (requestResponse?.status === 'success' && requestResponse?.data) {
              const request = requestResponse.data;
              setServiceRequest(request);
              await loadPricingBreakdown(request);
              
              // Override party info with request data if available
              if (request.contactName) newPartyInfo.partyB = request.contactName;
              if (request.contactPhone) newPartyInfo.partyBPhone = request.contactPhone;
              if (request.contactEmail) newPartyInfo.partyBEmail = request.contactEmail;
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
            show_seal: !!currentFormValues.show_seal,
            seal_text: currentFormValues.seal_text?.trim() || 'MuTraPro Official',
            seal_variant: currentFormValues.seal_variant || 'red',
            show_watermark: !!currentFormValues.show_watermark,
            
            request_id: currentFormValues.request_id || null,
            customer_id: currentFormValues.customer_id || null,
            manager_id: currentFormValues.manager_id || null,
            
            contract_type: currentFormValues.contract_type,
            terms_and_conditions: currentFormValues.terms_and_conditions?.trim(),
            special_clauses: currentFormValues.special_clauses?.trim(),
            notes: currentFormValues.notes?.trim(),
            
            total_price: Number(currentFormValues.total_price || 0),
            currency: 'VND',
            deposit_percent: Number(currentFormValues.deposit_percent || 0),
            deposit_amount: Number(currentFormValues.deposit_amount || 0),
            final_amount: Number(currentFormValues.final_amount || 0),
            
            expected_start_date: null,
            sla_days: Number(currentFormValues.sla_days || 0),
            auto_due_date: true,
            free_revisions_included: Number(currentFormValues.free_revisions_included || 1),
            additional_revision_fee_vnd: currentFormValues.additional_revision_fee_vnd
              ? Number(currentFormValues.additional_revision_fee_vnd)
              : null,
            revision_deadline_days: Number(currentFormValues.revision_deadline_days || 30),
            
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
      // Load instruments if instrumentIds exist
      if (request.instrumentIds && request.instrumentIds.length > 0) {
        try {
          const instrumentsResponse = await getNotationInstrumentsByIds(
            request.instrumentIds
          );
          if (
            instrumentsResponse?.status === 'success' &&
            instrumentsResponse?.data
          ) {
            const selectedInstruments = instrumentsResponse.data.map(instr => ({
              instrumentId: instr.instrumentId,
              instrumentName: instr.instrumentName,
              basePrice: instr.basePrice || 0,
            }));
            breakdown.instruments = selectedInstruments;
          }
        } catch (error) {
          console.warn('Failed to load instruments:', error);
        }
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

  // auto-calc pricing (due_date sẽ tự động tính khi customer ký)
  const recompute = () => {
    const v = form.getFieldsValue(true);
    const total = Number(v.total_price ?? 0);

    const depPct = Number(v.deposit_percent ?? 0);
    const depositAmount = +(total * (depPct / 100)).toFixed(2);
    const finalAmount = +(total - depositAmount).toFixed(2);

    form.setFieldsValue({
      deposit_amount: depositAmount,
      final_amount: finalAmount,
    });

    // Update terms & conditions if it's still using default template
    // Only update if the current terms matches the default template structure
    const currentTerms = v.terms_and_conditions;
    const contractType = v.contract_type;
    if (contractType && currentTerms) {
      const defaultTerms = getDefaultTermsAndConditions(contractType);
      // Check if current terms contains template variables or matches default structure
      const hasTemplateVars =
        currentTerms.includes('{free_revisions_included}') ||
        currentTerms.includes('{deposit_percent}') ||
        currentTerms.includes('{final_amount}') ||
        currentTerms.includes('{additional_revision_fee_vnd}');

      // If it has template variables, it means it's still the default template, so update it
      if (hasTemplateVars) {
        const updatedValues = {
          ...v,
          final_amount: finalAmount,
          deposit_amount: depositAmount,
        };
        const termsWithValues = replaceTemplateVariables(
          defaultTerms,
          updatedValues
        );
        form.setFieldValue('terms_and_conditions', termsWithValues);
      }
    }
  };
  const onValuesChange = () => recompute();

  const buildPreviewPayload = values => ({
    show_seal: !!values.show_seal,
    seal_text: values.seal_text?.trim() || 'MuTraPro Official',
    seal_variant: values.seal_variant || 'red',
    show_watermark: !!values.show_watermark,

    request_id: values.request_id || null,
    customer_id: values.customer_id || null,
    manager_id: values.manager_id || null,

    contract_type: values.contract_type,
    terms_and_conditions: values.terms_and_conditions?.trim(),
    special_clauses: values.special_clauses?.trim(),
    notes: values.notes?.trim(),

    total_price: Number(values.total_price || 0),
    currency: 'VND',
    deposit_percent: Number(values.deposit_percent || 0),
    deposit_amount: Number(values.deposit_amount || 0),
    final_amount: Number(values.final_amount || 0),

    // Expected start optional: backend will default to now if null
    expected_start_date: null,
    sla_days: Number(values.sla_days || 0),
    auto_due_date: true,
    free_revisions_included: Number(values.free_revisions_included || 1),
    additional_revision_fee_vnd: values.additional_revision_fee_vnd
      ? Number(values.additional_revision_fee_vnd)
      : null,

    // preview-only - lấy từ state partyInfo
    partyA: partyInfo.partyA,
    partyAAddress: partyInfo.partyAAddress,
    partyB: partyInfo.partyB,
    partyBPhone: partyInfo.partyBPhone,
    partyBEmail: partyInfo.partyBEmail,
  });

  const updatePreviewSnapshot = (values = form.getFieldsValue(true)) => {
    const normalized = buildPreviewPayload(values);
    setData(normalized);
  };

  useEffect(() => {
    if (!form) return;
    updatePreviewSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyInfo]);

  // Update preview (không tạo contract, chỉ update preview)
  const onFinish = values => {
    updatePreviewSnapshot(values);
    message.success('Preview updated');
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

      setCreatingContract(true);
      setError(null);

      // Prepare contract data
      const totalPrice = Number(values.total_price || 0);
      const contractData = {
        contractType: values.contract_type,
        totalPrice: totalPrice,
        currency: 'VND',
        depositPercent: Number(values.deposit_percent || 40),
        slaDays: Number(values.sla_days || 7),
        autoDueDate: true,
        expectedStartDate: null,
        termsAndConditions: values.terms_and_conditions?.trim(),
        specialClauses: values.special_clauses?.trim(),
        notes: values.notes?.trim(),
        freeRevisionsIncluded: Number(values.free_revisions_included || 1),
        revisionDeadlineDays: Number(
          values.revision_deadline_days ||
            getDefaultRevisionDeadlineDays(
              values.contract_type || 'transcription'
            )
        ),
        additionalRevisionFeeVnd: values.additional_revision_fee_vnd
          ? Number(values.additional_revision_fee_vnd)
          : getDefaultAdditionalRevisionFeeVnd(),
      };

      let response;
      if (isEditMode) {
        // Update existing contract
        response = await updateContract(contractId, contractData);
        if (response?.status === 'success') {
          message.success('Contract updated successfully!');
        }
      } else {
        // Create new contract
        response = await createContractFromRequest(requestId, contractData);
        if (response?.status === 'success') {
          message.success('Contract created successfully!');
        }
      }

      if (response?.status === 'success' && response?.data) {
        const contractResponse = response.data;
        // Navigate to contracts list
        navigate('/manager/contracts-list');
      } else {
        throw new Error(response?.message || `Failed to ${isEditMode ? 'update' : 'create'} contract`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} contract:`, error);
      setError(
        error?.message ||
          error?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} contract`
      );
      message.error(error?.message || `Failed to ${isEditMode ? 'update' : 'create'} contract`);
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
      <div className={styles.page}>
        <div
          className={styles.card}
          style={{ textAlign: 'center', padding: '50px' }}
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
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip={isEditMode ? "Loading contract data..." : "Loading service request data..."} />
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
            <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
              {isEditMode ? 'Edit Contract' : 'Create Contract from Service Request'}
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
                  onFinish={onFinish}
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
                  <Form.Item
                    name="manager_id"
                    label="Manager ID"
                    className={styles.disabledInput}
                  >
                    <Input
                      disabled
                      placeholder="Auto-filled from service request"
                    />
                  </Form.Item>
                  {/* Contract Number: Backend will generate automatically */}
                  {/* Contract Type - ẩn field, chỉ dùng để gửi lên backend */}
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
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="deposit_amount"
                    label="Deposit Amount"
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
                    name="final_amount"
                    label="Final Amount"
                    className={styles.disabledInput}
                  >
                    <InputNumber
                      min={0}
                      step={1000}
                      style={{ width: '100%' }}
                      disabled
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
                        <Tooltip title="Number of days to complete the work. Due Date will be automatically calculated from signing date + SLA Days">
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

                  <Divider className={styles.fullRow}>Branding</Divider>
                  <Form.Item
                    name="show_seal"
                    label="Show Company Seal"
                    valuePropName="checked"
                    className={styles.fullRow}
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item name="seal_text" label="Seal Text">
                    <Input placeholder="MuTraPro Official" />
                  </Form.Item>
                  <Form.Item
                    name="seal_variant"
                    label="Seal Color"
                    initialValue="red"
                  >
                    <Select
                      options={[
                        { label: 'Red', value: 'red' },
                        { label: 'Blue', value: 'blue' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name="show_watermark"
                    label="Show Watermark"
                    valuePropName="checked"
                  >
                    <Switch defaultChecked />
                  </Form.Item>

                  <Space
                    className={styles.fullRow}
                    size="small"
                    style={{ marginTop: 8 }}
                  >
                    <Button type="primary" htmlType="submit" size="small">
                      Update Preview
                    </Button>
                    <Button
                      type="primary"
                      danger
                      size="small"
                      loading={creatingContract}
                      onClick={handleCreateContract}
                    >
                      {isEditMode ? 'Update Contract' : 'Create Contract'}
                    </Button>
                  </Space>
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

                {/* Con dấu tròn ở góc phải */}
                {data?.show_seal && (
                  <div
                    className={`${styles.seal} ${
                      styles[`seal_${data?.seal_variant || 'red'}`]
                    }`}
                  >
                    <div className={styles.sealInner}>
                      <div className={styles.sealText}>
                        {data?.seal_text || 'MuTraPro Official'}
                      </div>
                      <div className={styles.sealDate}>
                        {dayjs().format('YYYY-MM-DD')}
                      </div>
                    </div>
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

                <h3>Pricing & Payment</h3>

                {/* Pricing Breakdown */}
                {(pricingBreakdown.transcriptionDetails ||
                  pricingBreakdown.instruments.length > 0) && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '8px' }}>
                      Price Breakdown:
                    </strong>

                    {/* Transcription Details */}
                    {pricingBreakdown.transcriptionDetails && (
                      <div
                        style={{
                          marginBottom:
                            pricingBreakdown.instruments.length > 0
                              ? '12px'
                              : '0',
                        }}
                      >
                        {pricingBreakdown.transcriptionDetails.breakdown?.map(
                          (item, index) => (
                            <div
                              key={index}
                              style={{ marginBottom: '4px', fontSize: '14px' }}
                            >
                              <span>{item.label}: </span>
                              <span style={{ fontWeight: 'bold' }}>
                                {item.amount?.toLocaleString?.() ?? item.amount}{' '}
                                {data?.currency || 'VND'}
                              </span>
                              {item.description && (
                                <span
                                  style={{ color: '#666', marginLeft: '8px' }}
                                >
                                  ({formatDescriptionDuration(item.description)}
                                  )
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Instruments */}
                    {pricingBreakdown.instruments.length > 0 && (
                      <div>
                        <div
                          style={{
                            marginBottom: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          Instruments Surcharge:
                        </div>
                        {pricingBreakdown.instruments.map((instr, index) => (
                          <div
                            key={index}
                            style={{
                              marginLeft: '16px',
                              marginBottom: '4px',
                              fontSize: '14px',
                            }}
                          >
                            <span>• {instr.instrumentName}: </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {instr.basePrice?.toLocaleString?.() ??
                                instr.basePrice}{' '}
                              {data?.currency || 'VND'}
                            </span>
                          </div>
                        ))}
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            borderTop: '1px solid #ddd',
                            paddingTop: '4px',
                          }}
                        >
                          Instruments Total:{' '}
                          {pricingBreakdown.instruments
                            .reduce(
                              (sum, instr) => sum + (instr.basePrice || 0),
                              0
                            )
                            .toLocaleString()}{' '}
                          {data?.currency || 'VND'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p>
                  <strong>Currency:</strong> {data?.currency || 'VND'}{' '}
                  &nbsp;|&nbsp;
                  <strong>Total Price:</strong>{' '}
                  {data?.total_price?.toLocaleString?.() ?? data?.total_price}{' '}
                  &nbsp;|&nbsp;
                  <strong>Deposit:</strong> {data?.deposit_percent}% ={' '}
                  {data?.deposit_amount?.toLocaleString?.() ??
                    data?.deposit_amount}{' '}
                  &nbsp;|&nbsp;
                  <strong>Final Amount:</strong>{' '}
                  {data?.final_amount?.toLocaleString?.() ??
                    data?.final_amount}{' '}
                </p>

                <h3>Timeline & SLA</h3>
                <p>
                  <strong>SLA Days (Service Level Agreement):</strong>{' '}
                  {data?.sla_days || 0} days &nbsp;|&nbsp;
                  <strong>Due Date (Deadline):</strong>{' '}
                  {data?.due_date
                    ? dayjs(data.due_date).format('YYYY-MM-DD')
                    : `Within ${data?.sla_days || 0} days from the date of signing the contract`}
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
