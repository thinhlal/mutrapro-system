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
} from 'antd';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './ContractBuilder.module.css';

const { Title, Text } = Typography;

// Enums
const CONTRACT_TYPES = [
  { label: 'Transcription', value: 'transcription' },
  { label: 'Arrangement', value: 'arrangement' },
  { label: 'Recording', value: 'recording' },
  { label: 'Bundle (T+A+R)', value: 'bundle' },
];
const CONTRACT_STATUS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Signed', value: 'signed' },
  { label: 'Expired', value: 'expired' },
];

const CURRENCIES = [
  { label: 'VND', value: 'VND' },
  { label: 'USD', value: 'USD' },
];

function genContractNumber(prefix = 'CTR') {
  const date = dayjs().format('YYYYMMDD');
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

const ContractBuilder = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const previewRef = useRef(null);
  const docRef = useRef(null);

  // defaults (contracts v3.2)
  useEffect(() => {
    form.setFieldsValue({
      contract_number: genContractNumber(),
      contract_type: 'arrangement',
      status: 'draft',
      currency: 'VND',
      deposit_percent: 40,
      base_price: 0,
      total_price: 0,
      expected_start_date: dayjs(),
      sla_days: 0,
      auto_due_date: true,
      effectiveDate: dayjs(),
      show_watermark: true,
    });
  }, [form]);

  // auto-calc pricing & due_date
  const recompute = () => {
    const v = form.getFieldsValue(true);
    const total = Number(v.total_price ?? v.base_price ?? 0);
    const depPct = Number(v.deposit_percent ?? 0);
    const depositAmount = +(total * (depPct / 100)).toFixed(2);
    const finalAmount = +(total - depositAmount).toFixed(2);
    form.setFieldsValue({
      deposit_amount: depositAmount,
      final_amount: finalAmount,
    });

    if (v.auto_due_date) {
      const start = v.expected_start_date
        ? dayjs(v.expected_start_date)
        : dayjs();
      const due = start.add(Number(v.sla_days || 0), 'day');
      form.setFieldsValue({ due_date: due });
    }
  };
  const onValuesChange = () => recompute();

  // submit → chuẩn hoá payload (frontend only)
  const onFinish = values => {
    const normalized = {
      show_seal: !!values.show_seal,
      seal_text: values.seal_text?.trim() || 'MuTraPro Official',
      seal_variant: values.seal_variant || 'red',
      show_watermark: !!values.show_watermark,

      request_id: values.request_id || null,
      customer_id: values.customer_id || null,
      manager_id: values.manager_id || null,

      contract_number: values.contract_number,
      contract_type: values.contract_type,
      status: values.status || 'draft',
      terms_and_conditions: values.terms_and_conditions?.trim(),
      special_clauses: values.special_clauses?.trim(),
      notes: values.notes?.trim(),

      base_price: Number(values.base_price || 0),
      total_price: Number(values.total_price || values.base_price || 0),
      currency: values.currency || 'VND',
      deposit_percent: Number(values.deposit_percent || 0),
      deposit_amount: Number(values.deposit_amount || 0),
      final_amount: Number(values.final_amount || 0),

      deposit_paid: !!values.deposit_paid,
      deposit_paid_at: values.deposit_paid_at
        ? dayjs(values.deposit_paid_at).toISOString()
        : null,

      expected_start_date: values.expected_start_date
        ? dayjs(values.expected_start_date).toISOString()
        : null,
      due_date: values.due_date ? dayjs(values.due_date).toISOString() : null,
      sla_days: Number(values.sla_days || 0),
      auto_due_date: !!values.auto_due_date,

      // preview-only
      partyA: values.partyA?.trim() || 'MuTraPro Studio Co., Ltd',
      partyAAddress: values.partyAAddress?.trim() || '',
      partyB: values.partyB?.trim() || '',
      partyBAddress: values.partyBAddress?.trim() || '',
      effectiveDate: values.effectiveDate
        ? dayjs(values.effectiveDate).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
    };
    setData(normalized);
    message.success('Preview updated (contracts v3.2)');
  };

  // export PDF
  const exportPdf = async () => {
    if (!docRef.current) return;
    const el = docRef.current;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(
      imgData,
      'PNG',
      0,
      position,
      imgWidth,
      imgHeight,
      undefined,
      'FAST'
    );
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = -(imgHeight - heightLeft);
      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
      heightLeft -= pageHeight;
    }

    const safe = (data?.contract_number || 'contract').replace(/\s+/g, '_');
    pdf.save(`${safe}_${dayjs().format('YYYYMMDD')}.pdf`);
  };

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

  return (
    <div className={styles.page}>
      {/* ====== TOP CARD: FORM 2 CỘT ====== */}
      <div className={styles.card}>
        <Title level={4} style={{ marginBottom: 8 }}>
          Create Contract
        </Title>
        <Divider />

        <Form
          form={form}
          layout="vertical"
          className={styles.formGrid}
          onValuesChange={onValuesChange}
          onFinish={onFinish}
        >
          {/* Cột trái */}
          <Form.Item name="request_id" label="Request ID">
            <Input placeholder="UUID of service_requests.request_id" />
          </Form.Item>
          <Form.Item name="customer_id" label="Customer ID">
            <Input placeholder="UUID of customers.customer_id" />
          </Form.Item>
          <Form.Item name="manager_id" label="Manager ID">
            <Input placeholder="UUID of managers.manager_id" />
          </Form.Item>
          <Form.Item
            name="contract_number"
            label="Contract Number"
            rules={[{ required: true }]}
          >
            <Input addonBefore="Auto" placeholder="CTR-YYYYMMDD-XXXX" />
          </Form.Item>
          <Form.Item
            name="contract_type"
            label="Contract Type"
            rules={[{ required: true }]}
          >
            <Select options={CONTRACT_TYPES} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={CONTRACT_STATUS} />
          </Form.Item>

          <Form.Item
            name="partyA"
            label="Party A (Provider)"
            initialValue="MuTraPro Studio Co., Ltd"
          >
            <Input />
          </Form.Item>
          <Form.Item name="partyAAddress" label="Party A Address">
            <Input />
          </Form.Item>

          {/* Cột phải */}
          <Form.Item
            name="partyB"
            label="Party B (Customer)"
            rules={[{ required: true }]}
          >
            <Input placeholder="Client Name" />
          </Form.Item>
          <Form.Item name="partyBAddress" label="Party B Address">
            <Input placeholder="Client Address" />
          </Form.Item>
          <Form.Item
            name="effectiveDate"
            label="Effective Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="currency" label="Currency" initialValue="VND">
            <Select options={CURRENCIES} />
          </Form.Item>
          <Form.Item name="base_price" label="Base Price">
            <InputNumber min={0} step={1000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total_price" label="Total Price (editable)">
            <InputNumber min={0} step={1000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deposit_percent" label="Deposit %" initialValue={40}>
            <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="deposit_paid"
            label="Deposit Paid"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="deposit_paid_at" label="Deposit Paid At">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabled={!form.getFieldValue('deposit_paid')}
            />
          </Form.Item>

          {/* Hàng full width (span 2 cột) */}
          <Divider className={styles.fullRow}>Computed</Divider>
          <Form.Item
            name="deposit_amount"
            label="Deposit Amount"
            className={styles.fullRow}
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
            className={styles.fullRow}
          >
            <InputNumber
              min={0}
              step={1000}
              style={{ width: '100%' }}
              disabled
            />
          </Form.Item>

          <Divider className={styles.fullRow}>Timeline & SLA</Divider>
          <Form.Item name="expected_start_date" label="Expected Start">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sla_days" label="SLA Days">
            <InputNumber min={0} max={120} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="auto_due_date"
            label="Auto Due Date"
            valuePropName="checked"
          >
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker
              style={{ width: '100%' }}
              disabled={form.getFieldValue('auto_due_date')}
            />
          </Form.Item>

          <Divider className={styles.fullRow}>Terms</Divider>
          <Form.Item
            name="terms_and_conditions"
            label="Terms & Conditions"
            className={styles.fullRow}
          >
            <Input.TextArea rows={4} placeholder="General terms..." />
          </Form.Item>
          <Form.Item
            name="special_clauses"
            label="Special Clauses"
            className={styles.fullRow}
          >
            <Input.TextArea rows={3} placeholder="Any special clauses..." />
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
          <Form.Item name="seal_variant" label="Seal Color" initialValue="red">
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

          <Space className={styles.fullRow} size="middle">
            <Button type="primary" htmlType="submit">
              Update Preview
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setData(null);
              }}
            >
              Reset
            </Button>
          </Space>
        </Form>
      </div>

      {/* ====== BOTTOM CARD: PREVIEW ====== */}
      <div className={styles.card}>
        <div className={styles.previewToolbar}>
          <Title level={5} style={{ margin: 0 }}>
            Contract Preview
          </Title>
          <Space>
            <Button onClick={() => window.print()}>Print</Button>
            <Button type="primary" onClick={exportPdf} disabled={!data}>
              Export PDF
            </Button>
          </Space>
        </div>

        <div className={styles.preview} ref={previewRef}>
          {header}
          <div className={styles.doc} ref={docRef}>
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
              {data?.contract_type
                ? `${(data.contract_type || 'Contract')
                    .toString()
                    .toUpperCase()} Contract`
                : 'Service Agreement'}
            </h1>
            <p>
              <strong>Contract No:</strong> {data?.contract_number || '—'}{' '}
              &nbsp;|&nbsp;
              <strong>Status:</strong> {data?.status || 'draft'}
            </p>
            <p>
              <strong>Effective Date:</strong>{' '}
              {data?.effectiveDate || dayjs().format('YYYY-MM-DD')}
            </p>

            <h3>Parties</h3>
            <p>
              <strong>Party A:</strong> {data?.partyA || 'Company A'} –{' '}
              {data?.partyAAddress || 'Address A'}
              <br />
              <strong>Party B:</strong> {data?.partyB || 'Company B'} –{' '}
              {data?.partyBAddress || 'Address B'}
            </p>

            <h3>Pricing & Payment</h3>
            <p>
              <strong>Currency:</strong> {data?.currency} &nbsp;|&nbsp;
              <strong>Base:</strong>{' '}
              {data?.base_price?.toLocaleString?.() ?? data?.base_price}{' '}
              &nbsp;|&nbsp;
              <strong>Total:</strong>{' '}
              {data?.total_price?.toLocaleString?.() ?? data?.total_price}{' '}
              &nbsp;|&nbsp;
              <strong>Deposit:</strong> {data?.deposit_percent}% ={' '}
              {data?.deposit_amount?.toLocaleString?.() ?? data?.deposit_amount}{' '}
              &nbsp;|&nbsp;
              <strong>Final:</strong>{' '}
              {data?.final_amount?.toLocaleString?.() ?? data?.final_amount}{' '}
              &nbsp;|&nbsp;
              <strong>Deposit Status:</strong>{' '}
              {data?.deposit_paid
                ? `Paid at ${dayjs(data.deposit_paid_at).format(
                    'YYYY-MM-DD HH:mm'
                  )}`
                : 'Not paid'}
            </p>

            <h3>Timeline & SLA</h3>
            <p>
              <strong>Expected Start:</strong>{' '}
              {data?.expected_start_date
                ? dayjs(data.expected_start_date).format('YYYY-MM-DD')
                : '—'}{' '}
              &nbsp;|&nbsp;
              <strong>SLA Days:</strong> {data?.sla_days} &nbsp;|&nbsp;
              <strong>Due Date:</strong>{' '}
              {data?.due_date ? dayjs(data.due_date).format('YYYY-MM-DD') : '—'}{' '}
              (auto: {String(data?.auto_due_date)})
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
                <p style={{ whiteSpace: 'pre-line' }}>{data.special_clauses}</p>
              </>
            )}

            <Divider />
            <div className={styles.signRow}>
              <div>
                <div className={styles.sigLabel}>Party A Representative</div>
                <div className={styles.sigLine} />
                <div className={styles.sigHint}>Name, Title</div>
              </div>
              <div>
                <div className={styles.sigLabel}>Party B Representative</div>
                <div className={styles.sigLine} />
                <div className={styles.sigHint}>Name, Title</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractBuilder;
