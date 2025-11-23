import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
} from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createContractFromRequest } from '../../../services/contractService';
import PropTypes from 'prop-types';

const { TextArea } = Input;

const CONTRACT_TYPES = [
  { label: 'Transcription', value: 'transcription' },
  { label: 'Arrangement', value: 'arrangement' },
  { label: 'Arrangement with Recording', value: 'arrangement_with_recording' },
  { label: 'Recording', value: 'recording' },
  { label: 'Bundle (T+A+R)', value: 'bundle' },
];

const CURRENCIES = [
  { label: 'VND', value: 'VND' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

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

export default function CreateContractModal({
  visible,
  onCancel,
  onSuccess,
  serviceRequest,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Auto-fill form khi serviceRequest thay đổi
  useEffect(() => {
    if (visible && serviceRequest) {
      const contractType = mapServiceTypeToContractType(
        serviceRequest.requestType
      );
      const totalPrice = serviceRequest.totalPrice || 0;
      const currency = serviceRequest.currency || 'VND';
      const depositPercent = 40; // Default 40%

      // Calculate default SLA days based on contract type
      const defaultSlaDays =
        contractType === 'transcription'
          ? 7
          : contractType === 'arrangement'
            ? 14
            : contractType === 'arrangement_with_recording'
              ? 21
              : contractType === 'recording'
                ? 7
                : 21; // bundle

      form.setFieldsValue({
        contractType: contractType,
        totalPrice: totalPrice,
        currency: currency,
        depositPercent: depositPercent,
        slaDays: defaultSlaDays,
        expectedStartDate: dayjs(),
        freeRevisionsIncluded: 1,
      });
    }
  }, [visible, serviceRequest, form]);

  const handleSubmit = async values => {
    if (!serviceRequest) {
      message.error('Service request not found');
      return;
    }

    try {
      setLoading(true);

      // Format data for API
      const contractData = {
        contractType: values.contractType,
        totalPrice: values.totalPrice,
        currency: values.currency,
        depositPercent: values.depositPercent || 40,
        slaDays: values.slaDays,
        expectedStartDate: values.expectedStartDate
          ? values.expectedStartDate.toISOString()
          : new Date().toISOString(),
        termsAndConditions: values.termsAndConditions,
        specialClauses: values.specialClauses,
        notes: values.notes,
        freeRevisionsIncluded: values.freeRevisionsIncluded || 1,
        additionalRevisionFeeVnd: values.additionalRevisionFeeVnd,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      };

      const response = await createContractFromRequest(
        serviceRequest.requestId || serviceRequest.id,
        contractData
      );

      if (response?.status === 'success') {
        message.success('Contract created successfully!');
        form.resetFields();
        onSuccess?.(response.data);
        onCancel();
      } else {
        throw new Error(response?.message || 'Failed to create contract');
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      message.error(
        error?.message ||
          error?.response?.data?.message ||
          'Failed to create contract'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Auto-calculate deposit amount and final amount
  const handleValuesChange = (changedValues, allValues) => {
    if (
      changedValues.totalPrice !== undefined ||
      changedValues.depositPercent !== undefined
    ) {
      const totalPrice = allValues.totalPrice || 0;
      const depositPercent = allValues.depositPercent || 40;
      const depositAmount = (totalPrice * depositPercent) / 100;
      const finalAmount = totalPrice - depositAmount;

      form.setFieldsValue({
        depositAmount: depositAmount,
        finalAmount: finalAmount,
      });
    }
  };

  return (
    <Modal
      title={
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Tạo Contract từ Service Request
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{
          depositPercent: 40,
          freeRevisionsIncluded: 1,
        }}
      >
        <Form.Item
          name="contractType"
          label="Contract Type"
          rules={[{ required: true, message: 'Please select contract type' }]}
        >
          <Select options={CONTRACT_TYPES} />
        </Form.Item>

        <Form.Item
          name="currency"
          label="Currency"
          rules={[{ required: true, message: 'Please select currency' }]}
        >
          <Select options={CURRENCIES} />
        </Form.Item>

        <Form.Item
          name="totalPrice"
          label="Total Price"
          rules={[{ required: true, message: 'Please enter total price' }]}
        >
          <InputNumber
            min={0}
            step={1000}
            style={{ width: '100%' }}
            formatter={value =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="depositPercent"
          label="Deposit Percent (%)"
          rules={[{ required: true, message: 'Please enter deposit percent' }]}
        >
          <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="depositAmount"
          label="Deposit Amount (Auto-calculated)"
        >
          <InputNumber
            disabled
            style={{ width: '100%' }}
            formatter={value =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
          />
        </Form.Item>

        <Form.Item name="finalAmount" label="Final Amount (Auto-calculated)">
          <InputNumber
            disabled
            style={{ width: '100%' }}
            formatter={value =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
          />
        </Form.Item>

        <Form.Item name="expectedStartDate" label="Expected Start Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="slaDays"
          label="SLA Days"
          rules={[{ required: true, message: 'Please enter SLA days' }]}
        >
          <InputNumber min={1} max={120} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="freeRevisionsIncluded" label="Free Revisions Included">
          <InputNumber min={0} max={10} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="additionalRevisionFeeVnd"
          label="Additional Revision Fee (VND)"
        >
          <InputNumber
            min={0}
            step={1000}
            style={{ width: '100%' }}
            formatter={value =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item name="termsAndConditions" label="Terms and Conditions">
          <TextArea rows={4} placeholder="Enter terms and conditions..." />
        </Form.Item>

        <Form.Item name="specialClauses" label="Special Clauses">
          <TextArea rows={3} placeholder="Enter special clauses..." />
        </Form.Item>

        <Form.Item name="notes" label="Internal Notes">
          <TextArea rows={2} placeholder="Enter internal notes..." />
        </Form.Item>

        <Form.Item name="expiresAt" label="Expires At (Optional)">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#1890ff',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

CreateContractModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  serviceRequest: PropTypes.object,
};
