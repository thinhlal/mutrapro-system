import React, { useMemo, useState } from "react";
import {
  Table,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Button,
  Popconfirm,
  message,
  Tooltip,
  Typography,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styles from "./ContractsList.module.css";

// ===== Enums (phù hợp với ContractBuilder) =====
const CONTRACT_TYPES = [
  { label: "Transcription", value: "transcription" },
  { label: "Arrangement", value: "arrangement" },
  { label: "Recording", value: "recording" },
  { label: "Bundle (T+A+R)", value: "bundle" },
];
const CONTRACT_STATUS = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Signed", value: "signed" },
  { label: "Expired", value: "expired" },
];
const CURRENCIES = [
  { label: "VND", value: "VND" },
  { label: "USD", value: "USD" },
];

// ===== Mock Data (bám DB contracts v3.2) =====
// Lưu ý: thêm vài field tiện hiển thị như customer_name, service_name.
const MOCK_CONTRACTS = [
  {
    contract_id: "f2e0a2d1-5c2b-4a9d-9f11-01c9b2aa1a01",
    request_id: "req-0001",
    customer_id: "cus-001",
    manager_id: "mgr-01",
    contract_number: "CTR-20251017-A12B",
    contract_type: "transcription",
    status: "draft",
    created_at: "2025-10-16T12:05:00Z",
    sent_to_customer_at: null,
    customer_reviewed_at: null,
    signed_at: null,
    expires_at: null,
    file_id: null,
    notes: "First draft.",
    base_price: 1500000,
    total_price: 2000000,
    currency: "VND",
    deposit_percent: 40,
    deposit_amount: 800000,
    final_amount: 1200000,
    deposit_paid: false,
    deposit_paid_at: null,
    expected_start_date: "2025-10-18T00:00:00Z",
    due_date: "2025-10-25T00:00:00Z",
    sla_days: 7,
    auto_due_date: true,
    // convenience
    customer_name: "Nguyễn A",
    service_name: "Piano Transcription",
  },
  {
    contract_id: "f2e0a2d1-5c2b-4a9d-9f11-01c9b2aa1a02",
    request_id: "req-0002",
    customer_id: "cus-002",
    manager_id: "mgr-01",
    contract_number: "CTR-20251016-FF21",
    contract_type: "arrangement",
    status: "sent",
    created_at: "2025-10-16T09:00:00Z",
    sent_to_customer_at: "2025-10-16T10:00:00Z",
    signed_at: null,
    base_price: 3000000,
    total_price: 3500000,
    currency: "VND",
    deposit_percent: 50,
    deposit_amount: 1750000,
    final_amount: 1750000,
    deposit_paid: false,
    expected_start_date: "2025-10-19T00:00:00Z",
    due_date: "2025-10-26T00:00:00Z",
    sla_days: 7,
    auto_due_date: true,
    customer_name: "Trần B",
    service_name: "Full Arrangement",
  },
  {
    contract_id: "f2e0a2d1-5c2b-4a9d-9f11-01c9b2aa1a03",
    request_id: "req-0003",
    customer_id: "cus-003",
    manager_id: "mgr-02",
    contract_number: "CTR-20251012-9ACD",
    contract_type: "recording",
    status: "signed",
    created_at: "2025-10-12T07:30:00Z",
    sent_to_customer_at: "2025-10-12T08:00:00Z",
    customer_reviewed_at: "2025-10-12T12:00:00Z",
    signed_at: "2025-10-13T09:00:00Z",
    base_price: 2000,
    total_price: 2500,
    currency: "USD",
    deposit_percent: 40,
    deposit_amount: 1000,
    final_amount: 1500,
    deposit_paid: true,
    deposit_paid_at: "2025-10-12T15:00:00Z",
    expected_start_date: "2025-10-14T00:00:00Z",
    due_date: "2025-10-21T00:00:00Z",
    sla_days: 7,
    auto_due_date: true,
    customer_name: "Pham C",
    service_name: "Studio Recording",
  },
  {
    contract_id: "f2e0a2d1-5c2b-4a9d-9f11-01c9b2aa1a04",
    request_id: "req-0004",
    customer_id: "cus-004",
    manager_id: "mgr-02",
    contract_number: "CTR-20250930-1B3F",
    contract_type: "bundle",
    status: "expired",
    created_at: "2025-09-30T11:00:00Z",
    expires_at: "2025-10-15T00:00:00Z",
    base_price: 7000000,
    total_price: 9000000,
    currency: "VND",
    deposit_percent: 30,
    deposit_amount: 2700000,
    final_amount: 6300000,
    deposit_paid: false,
    expected_start_date: "2025-10-01T00:00:00Z",
    due_date: "2025-10-12T00:00:00Z",
    sla_days: 11,
    auto_due_date: true,
    customer_name: "Lê D",
    service_name: "T+A+R Package",
  },
];

// helpers
const fmtMoney = (n, cur) =>
  typeof n === "number"
    ? (cur === "USD" ? "$" : "") + n.toLocaleString()
    : n ?? "";

const statusColor = {
  draft: "default",
  sent: "geekblue",
  reviewed: "gold",
  signed: "green",
  expired: "volcano",
};

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ContractsList() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState();
  const [status, setStatus] = useState();
  const [currency, setCurrency] = useState();
  const [dateRange, setDateRange] = useState([]);

  const data = useMemo(() => {
    return MOCK_CONTRACTS.filter((c) => {
      const q =
        c.contract_number.toLowerCase() +
        " " +
        (c.customer_name || "").toLowerCase() +
        " " +
        (c.service_name || "").toLowerCase();
      const passSearch = q.includes(search.toLowerCase().trim());
      const passType = type ? c.contract_type === type : true;
      const passStatus = status ? c.status === status : true;
      const passCur = currency ? c.currency === currency : true;
      const passDate =
        dateRange?.length === 2
          ? dayjs(c.created_at).isBetween(
              dateRange[0],
              dateRange[1],
              "day",
              "[]"
            )
          : true;
      return passSearch && passType && passStatus && passCur && passDate;
    });
  }, [search, type, status, currency, dateRange]);

  const columns = [
    {
      title: "Contract No",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 190,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Req: {r.request_id}
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.contract_number.localeCompare(b.contract_number),
    },
    {
      title: "Customer / Service",
      key: "customer",
      render: (_, r) => (
        <div>
          <Text>{r.customer_name}</Text>
          <div className={styles.sub}>{r.service_name}</div>
        </div>
      ),
      width: 220,
    },
    {
      title: "Type",
      dataIndex: "contract_type",
      key: "contract_type",
      width: 140,
      filters: CONTRACT_TYPES.map((x) => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) => rec.contract_type === val,
      render: (v) => (
        <Tag color="processing">
          {CONTRACT_TYPES.find((x) => x.value === v)?.label || v}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => (
        <Tag color={statusColor[v] || "default"}>{v.toUpperCase()}</Tag>
      ),
      filters: CONTRACT_STATUS.map((x) => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) => rec.status === val,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (v) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
    },
    {
      title: "Price",
      key: "price",
      width: 170,
      render: (_, r) => (
        <div>
          <div>
            <Text strong>{fmtMoney(r.total_price, r.currency)}</Text>{" "}
            <Tag>{r.currency}</Tag>
          </div>
          <div className={styles.sub}>
            Deposit {r.deposit_percent}% ={" "}
            {fmtMoney(r.deposit_amount, r.currency)}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.total_price || 0) - (b.total_price || 0),
    },
    {
      title: "Timeline",
      key: "timeline",
      width: 220,
      render: (_, r) => (
        <div className={styles.timeline}>
          <div>
            <span className={styles.sub}>Start</span>{" "}
            {dayjs(r.expected_start_date).format("YYYY-MM-DD")}
          </div>
          <div>
            <span className={styles.sub}>Due</span>{" "}
            {dayjs(r.due_date).format("YYYY-MM-DD")}{" "}
            <span className={styles.sub}>({r.sla_days}d)</span>
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 220,
      render: (_, r) => (
        <Space>
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} type="primary" ghost />
          </Tooltip>
          <Tooltip title="Export PDF">
            <Button icon={<FilePdfOutlined />} />
          </Tooltip>
          <Popconfirm
            title="Delete this contract?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              message.success(`Deleted ${r.contract_number} (UI only)`)
            }
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Contract List
        </Typography.Title>
      </div>
      {/* Filters */}
      <div className={styles.toolbar}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search contract no / customer / service"
            onSearch={setSearch}
            style={{ width: 320 }}
          />
          <Select
            allowClear
            placeholder="Type"
            options={CONTRACT_TYPES}
            onChange={setType}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Status"
            options={CONTRACT_STATUS}
            onChange={setStatus}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Currency"
            options={CURRENCIES}
            onChange={setCurrency}
            style={{ width: 130 }}
          />
          <RangePicker onChange={setDateRange} />
        </Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setSearch("");
            setType();
            setStatus();
            setCurrency();
            setDateRange([]);
            message.success("Filters cleared");
          }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <Table
        rowKey="contract_id"
        columns={columns}
        dataSource={data}
        bordered
        size="middle"
        pagination={{ pageSize: 8, showSizeChanger: false }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
