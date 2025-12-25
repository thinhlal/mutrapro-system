import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Tabs,
  Select,
  DatePicker,
  message,
  Spin,
  Empty,
  Form,
  InputNumber,
} from 'antd';
import {
  WalletOutlined,
  ReloadOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  getAllWallets,
  getWalletById,
  getWalletTransactions,
  adjustWalletBalance,
} from '../../../services/adminWalletService';
import dayjs from 'dayjs';
import styles from './WalletManagement.module.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const WalletManagement = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    userId: null,
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  });
  const [transactionFilters, setTransactionFilters] = useState({
    txType: null,
    fromDate: null,
    toDate: null,
    search: null,
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  });

  // Load wallets
  const loadWallets = async () => {
    setLoading(true);
    try {
      const response = await getAllWallets(filters);
      if (response.status === 'success' && response.data) {
        setWallets(response.data.content || []);
        setPagination({
          current: response.data.pageNumber + 1,
          pageSize: response.data.pageSize,
          total: response.data.totalElements,
        });
      }
    } catch (error) {
      message.error(error.message || 'Error loading wallets list');
    } finally {
      setLoading(false);
    }
  };

  // Load wallet detail
  const loadWalletDetail = async walletId => {
    try {
      const response = await getWalletById(walletId);
      if (response.status === 'success' && response.data) {
        setSelectedWallet(response.data);
        loadTransactions(walletId);
      }
    } catch (error) {
      message.error(error.message || 'Error loading wallet details');
    }
  };

  // Load transactions
  const loadTransactions = async walletId => {
    if (!walletId) return;
    setTransactionsLoading(true);
    try {
      const response = await getWalletTransactions(
        walletId,
        transactionFilters
      );
      if (response.status === 'success' && response.data) {
        setTransactions(response.data.content || []);
        setTransactionsPagination({
          current: response.data.pageNumber + 1,
          pageSize: response.data.pageSize,
          total: response.data.totalElements,
        });
      }
    } catch (error) {
      message.error(error.message || 'Error loading transaction history');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Reload transactions when filters change
  useEffect(() => {
    if (selectedWallet?.walletId) {
      loadTransactions(selectedWallet.walletId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionFilters]);

  useEffect(() => {
    loadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Handle view detail
  const handleViewDetail = wallet => {
    setSelectedWallet(wallet);
    setDetailModalVisible(true);
    setTransactionFilters(prev => ({ ...prev, page: 0 }));
    loadWalletDetail(wallet.walletId);
  };

  // Handle search by userId
  const handleSearch = value => {
    setFilters(prev => ({
      ...prev,
      userId: value || null,
      page: 0,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle adjust balance
  const handleAdjustBalance = wallet => {
    setSelectedWallet(wallet);
    adjustForm.setFieldsValue({
      amount: undefined,
      reason: '',
    });
    setAdjustModalVisible(true);
  };

  // Handle adjust balance submit
  const handleAdjustSubmit = async values => {
    if (!selectedWallet) return;

    setAdjustLoading(true);
    try {
      await adjustWalletBalance(selectedWallet.walletId, {
        amount: values.amount,
        reason: values.reason,
      });
      message.success('Điều chỉnh số dư thành công');
      setAdjustModalVisible(false);
      adjustForm.resetFields();
      // Reload wallets và wallet detail
      loadWallets();
      if (detailModalVisible) {
        loadWalletDetail(selectedWallet.walletId);
      }
    } catch (error) {
      message.error(
        error.message || 'Lỗi khi điều chỉnh số dư ví'
      );
    } finally {
      setAdjustLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get transaction type color
  const getTxTypeColor = type => {
    const colors = {
      topup: 'success',
      payment: 'error',
      contract_deposit_payment: 'error',
      milestone_payment: 'error',
      recording_booking_payment: 'error',
      revision_fee: 'error',
      refund: 'processing',
      withdrawal: 'warning',
      adjustment: 'default',
    };
    return colors[type] || 'default';
  };

  // Get transaction type label
  const getTxTypeLabel = type => {
    const labels = {
      topup: 'Top Up',
      payment: 'Payment',
      contract_deposit_payment: 'Contract Deposit',
      milestone_payment: 'Milestone Payment',
      recording_booking_payment: 'Recording Booking',
      revision_fee: 'Revision Fee',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      adjustment: 'Adjustment',
    };
    return labels[type] || type;
  };

  // Table columns
  const columns = [
    {
      title: 'Wallet ID',
      dataIndex: 'walletId',
      key: 'walletId',
      width: 80,
      render: text => (
        <Text code style={{ fontSize: '12px' }}>
          {text.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
      render: text => (
        <Text code style={{ fontSize: '12px' }}>
          {text.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 110,
      render: (amount, record) => (
        <Text strong style={{ fontSize: '16px', color: '#ec8a1c' }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Hold Balance',
      dataIndex: 'holdBalance',
      key: 'holdBalance',
      width: 110,
      render: (amount, record) => (
        <Text style={{ fontSize: '14px', color: amount > 0 ? '#ff9800' : '#888' }}>
          {formatCurrency(amount || 0, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Available Balance',
      dataIndex: 'availableBalance',
      key: 'availableBalance',
      width: 110,
      render: (amount, record) => (
        <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
          {formatCurrency(amount || record.balance - (record.holdBalance || 0), record.currency)}
        </Text>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 50,
      render: currency => <Tag color="orange">{currency}</Tag>,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            View Details
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleAdjustBalance(record)}
          >
            Adjust
          </Button>
        </Space>
      ),
    },
  ];

  // Transaction columns
  const transactionColumns = [
    {
      title: 'Transaction ID',
      dataIndex: 'walletTxId',
      key: 'walletTxId',
      width: 250,
      render: text => (
        <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Transaction Type',
      dataIndex: 'txType',
      key: 'txType',
      width: 150,
      render: type => (
        <Tag color={getTxTypeColor(type)}>{getTxTypeLabel(type)}</Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 180,
      render: (amount, record) => {
        const isIncome =
          record.txType === 'topup' || record.txType === 'refund';
        return (
          <Text
            strong
            style={{
              color: isIncome ? '#52c41a' : '#ff4d4f',
              fontSize: '16px',
            }}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(amount, record.currency)}
          </Text>
        );
      },
    },
    {
      title: 'Balance Before',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      width: 150,
      render: (amount, record) => formatCurrency(amount, record.currency),
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 150,
      render: (amount, record) => (
        <Text strong>{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Contract ID',
      dataIndex: 'contractId',
      key: 'contractId',
      width: 180,
      render: (text, record) =>
        text ? (
          <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
            {text.substring(0, 8)}...
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Milestone ID',
      dataIndex: 'milestoneId',
      key: 'milestoneId',
      width: 180,
      render: (text, record) =>
        text ? (
          <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
            {text.substring(0, 8)}...
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Refund Of',
      dataIndex: 'refundOfWalletTxId',
      key: 'refundOfWalletTxId',
      width: 200,
      render: (text, record) =>
        text ? (
          <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
            {text.substring(0, 8)}...
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: date => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Wallet Management</Title>
        <Space>
          <Search
            placeholder="Search by User ID"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={loadWallets}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={wallets}
          rowKey="walletId"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: total => `Total ${total} wallets`,
            onChange: (page, pageSize) => {
              setFilters(prev => ({
                ...prev,
                page: page - 1,
                size: pageSize,
              }));
            },
            onShowSizeChange: (current, size) => {
              setFilters(prev => ({
                ...prev,
                page: 0,
                size: size,
              }));
            },
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <WalletOutlined />
            <span>Wallet Details</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedWallet(null);
          setTransactions([]);
        }}
        footer={null}
        width={1000}
      >
        {selectedWallet ? (
          <Tabs defaultActiveKey="info">
            <TabPane tab="Wallet Information" key="info">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Wallet ID">
                  <Text code>{selectedWallet.walletId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="User ID">
                  <Text code>{selectedWallet.userId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Balance">
                  <Text strong style={{ fontSize: '18px', color: '#ec8a1c' }}>
                    {formatCurrency(
                      selectedWallet.balance,
                      selectedWallet.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Currency">
                  <Tag color="orange">{selectedWallet.currency}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hold Balance">
                  <Text style={{ fontSize: '16px', color: (selectedWallet.holdBalance || 0) > 0 ? '#ff9800' : '#888' }}>
                    {formatCurrency(
                      selectedWallet.holdBalance || 0,
                      selectedWallet.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Available Balance">
                  <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                    {formatCurrency(
                      selectedWallet.availableBalance || (selectedWallet.balance - (selectedWallet.holdBalance || 0)),
                      selectedWallet.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Created At" span={2}>
                  {dayjs(selectedWallet.createdAt).format(
                    'DD/MM/YYYY HH:mm:ss'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane
              tab={
                <Space>
                  <HistoryOutlined />
                  <span>Transaction History</span>
                </Space>
              }
              key="transactions"
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                {/* Filters */}
                <Space wrap>
                  <Search
                    placeholder="Search by Transaction ID, Contract ID..."
                    allowClear
                    style={{ width: 300 }}
                    onSearch={value => {
                      setTransactionFilters(prev => ({
                        ...prev,
                        search: value || null,
                        page: 0,
                      }));
                    }}
                    enterButton
                  />
                  <Select
                    placeholder="Transaction Type"
                    allowClear
                    style={{ width: 200 }}
                    value={transactionFilters.txType}
                    onChange={value => {
                      setTransactionFilters(prev => ({
                        ...prev,
                        txType: value,
                        page: 0,
                      }));
                    }}
                  >
                    <Option value="topup">Top Up</Option>
                    <Option value="payment">Payment</Option>
                    <Option value="contract_deposit_payment">
                      Contract Deposit
                    </Option>
                    <Option value="milestone_payment">Milestone Payment</Option>
                    <Option value="recording_booking_payment">
                      Recording Booking
                    </Option>
                    <Option value="revision_fee">Revision Fee</Option>
                    <Option value="refund">Refund</Option>
                    <Option value="withdrawal">Withdrawal</Option>
                    <Option value="adjustment">Adjustment</Option>
                  </Select>
                  <RangePicker
                    onChange={dates => {
                      if (dates && dates.length === 2) {
                        setTransactionFilters(prev => ({
                          ...prev,
                          fromDate: dates[0].toISOString(),
                          toDate: dates[1].toISOString(),
                          page: 0,
                        }));
                      } else {
                        setTransactionFilters(prev => ({
                          ...prev,
                          fromDate: null,
                          toDate: null,
                          page: 0,
                        }));
                      }
                    }}
                    format="DD/MM/YYYY"
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => loadTransactions(selectedWallet.walletId)}
                    loading={transactionsLoading}
                  >
                    Refresh
                  </Button>
                </Space>

                {/* Transactions Table */}
                {transactionsLoading && transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : transactions.length === 0 ? (
                  <Empty description="No transactions yet" />
                ) : (
                  <Table
                    columns={transactionColumns}
                    dataSource={transactions}
                    rowKey="walletTxId"
                    loading={transactionsLoading}
                    expandable={{
                      expandedRowRender: record => (
                        <div style={{ padding: '16px' }}>
                          <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label="Wallet ID">
                              <Text code>{record.walletId}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Currency">
                              <Tag color="orange">{record.currency}</Tag>
                            </Descriptions.Item>
                            {record.contractId && (
                              <Descriptions.Item label="Contract ID">
                                <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
                                  {record.contractId}
                                </Text>
                              </Descriptions.Item>
                            )}
                            {record.milestoneId && (
                              <Descriptions.Item label="Milestone ID">
                                <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
                                  {record.milestoneId}
                                </Text>
                              </Descriptions.Item>
                            )}
                            {record.refundOfWalletTxId && (
                              <Descriptions.Item label="Refund Of Transaction ID">
                                <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
                                  {record.refundOfWalletTxId}
                                </Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.submission_id && (
                              <Descriptions.Item label="Submission ID">
                                <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
                                  {record.metadata.submission_id}
                                </Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.installment_id && (
                              <Descriptions.Item label="Installment ID">
                                <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>
                                  {record.metadata.installment_id}
                                </Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.payment_type && (
                              <Descriptions.Item label="Payment Type">
                                <Tag>
                                  {record.metadata.payment_type === 'DEPOSIT'
                                    ? 'Contract Deposit'
                                    : record.metadata.payment_type === 'MILESTONE'
                                    ? 'Milestone Payment'
                                    : record.metadata.payment_type}
                                </Tag>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.revisionRound && (
                              <Descriptions.Item label="Revision Round">
                                <Text>Round {record.metadata.revisionRound}</Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.description && (
                              <Descriptions.Item label="Description" span={2}>
                                <Text>{record.metadata.description}</Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.reason && (
                              <Descriptions.Item label="Reason" span={2}>
                                <Text>{record.metadata.reason}</Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata?.refund_reason && (
                              <Descriptions.Item label="Refund Reason" span={2}>
                                <Text>{record.metadata.refund_reason}</Text>
                              </Descriptions.Item>
                            )}
                            {record.metadata && Object.keys(record.metadata).length > 0 && (
                              <Descriptions.Item label="Full Metadata" span={2}>
                                <pre
                                  style={{
                                    margin: 0,
                                    fontSize: '12px',
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                    backgroundColor: '#f5f5f5',
                                    padding: '8px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {JSON.stringify(record.metadata, null, 2)}
                                </pre>
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                        </div>
                      ),
                      rowExpandable: record => true,
                    }}
                    pagination={{
                      current: transactionsPagination.current,
                      pageSize: transactionsPagination.pageSize,
                      total: transactionsPagination.total,
                      showSizeChanger: true,
                      showTotal: total => `Total ${total} transactions`,
                      onChange: (page, pageSize) => {
                        setTransactionFilters(prev => ({
                          ...prev,
                          page: page - 1,
                          size: pageSize,
                        }));
                      },
                      onShowSizeChange: (current, size) => {
                        setTransactionFilters(prev => ({
                          ...prev,
                          page: 0,
                          size: size,
                        }));
                      },
                    }}
                    scroll={{ x: 1300 }}
                  />
                )}
              </Space>
            </TabPane>
          </Tabs>
        ) : (
          <Spin />
        )}
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Điều chỉnh số dư ví</span>
          </Space>
        }
        open={adjustModalVisible}
        onCancel={() => {
          setAdjustModalVisible(false);
          adjustForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedWallet && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Wallet ID">
                <Text code>{selectedWallet.walletId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="User ID">
                <Text code>{selectedWallet.userId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số dư hiện tại">
                <Text strong style={{ fontSize: '16px', color: '#ec8a1c' }}>
                  {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Form
              form={adjustForm}
              layout="vertical"
              onFinish={handleAdjustSubmit}
            >
              <Form.Item
                label="Số tiền điều chỉnh"
                name="amount"
                rules={[
                  { required: true, message: 'Vui lòng nhập số tiền điều chỉnh' },
                  {
                    validator: (_, value) => {
                      if (value === null || value === undefined) {
                        return Promise.reject(new Error('Vui lòng nhập số tiền điều chỉnh'));
                      }
                      if (value === 0) {
                        return Promise.reject(new Error('Số tiền điều chỉnh phải khác 0'));
                      }
                      // Check nếu trừ tiền mà không đủ
                      if (value < 0 && selectedWallet.balance + value < 0) {
                        return Promise.reject(
                          new Error(
                            `Không thể trừ tiền. Số dư hiện tại: ${formatCurrency(
                              selectedWallet.balance,
                              selectedWallet.currency
                            )}`
                          )
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                help={
                  adjustForm.getFieldValue('amount') ? (
                    <Text
                      style={{
                        color:
                          adjustForm.getFieldValue('amount') > 0
                            ? '#52c41a'
                            : '#ff4d4f',
                      }}
                    >
                      Số dư sau điều chỉnh:{' '}
                      {formatCurrency(
                        selectedWallet.balance + (adjustForm.getFieldValue('amount') || 0),
                        selectedWallet.currency
                      )}
                    </Text>
                  ) : null
                }
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập số tiền (dương = thêm, âm = trừ)"
                  min={-999999999}
                  max={999999999}
                  formatter={value =>
                    value
                      ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : ''
                  }
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>

              <Form.Item
                label="Lý do điều chỉnh"
                name="reason"
                rules={[
                  { required: true, message: 'Vui lòng nhập lý do điều chỉnh' },
                  { min: 5, message: 'Lý do phải có ít nhất 5 ký tự' },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Nhập lý do điều chỉnh số dư (bắt buộc để audit)"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={adjustLoading}>
                    Xác nhận điều chỉnh
                  </Button>
                  <Button
                    onClick={() => {
                      setAdjustModalVisible(false);
                      adjustForm.resetFields();
                    }}
                  >
                    Hủy
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WalletManagement;
