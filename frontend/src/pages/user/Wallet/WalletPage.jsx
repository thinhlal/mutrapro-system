import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  message,
  Space,
  Typography,
  Statistic,
  Empty,
  Spin,
} from 'antd';
import {
  WalletOutlined,
  PlusOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getOrCreateMyWallet,
  topupWallet,
  getMyWalletTransactions,
} from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import WalletPageStyles from './WalletPage.module.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const WalletContent = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupForm] = Form.useForm();
  const [filters, setFilters] = useState({
    txType: null,
    fromDate: null,
    toDate: null,
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Load wallet info
  const loadWallet = async () => {
    setLoading(true);
    try {
      const response = await getOrCreateMyWallet();
      if (response.status === 'success' && response.data) {
        setWallet(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Error loading wallet information');
    } finally {
      setLoading(false);
    }
  };

  // Load transactions
  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      console.log('Loading transactions with filters:', filters);
      const response = await getMyWalletTransactions(filters);
      console.log('Transactions response:', response);
      if (response.status === 'success' && response.data) {
        const transactionsList = response.data.content || [];
        console.log('Transactions list:', transactionsList);
        setTransactions(transactionsList);
        setPagination({
          current: response.data.pageNumber + 1,
          pageSize: response.data.pageSize,
          total: response.data.totalElements,
        });
      } else {
        console.warn('Unexpected response format:', response);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      message.error(
        error.message ||
          error.response?.data?.message ||
          'Error loading transaction list'
      );
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Handle topup
  const handleTopup = async values => {
    try {
      const response = await topupWallet(wallet.walletId, {
        amount: values.amount,
        currency: 'VND',
      });
      if (response.status === 'success') {
        message.success('Deposit successful!');
        setTopupModalVisible(false);
        topupForm.resetFields();
        loadWallet();
        loadTransactions();
      }
    } catch (error) {
      message.error(
        error.message || error.details?.message || 'Error processing deposit'
      );
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 0,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle date range change
  const handleDateRangeChange = dates => {
    if (dates && dates.length === 2) {
      handleFilterChange('fromDate', dates[0].toISOString());
      handleFilterChange('toDate', dates[1].toISOString());
    } else {
      handleFilterChange('fromDate', null);
      handleFilterChange('toDate', null);
    }
  };

  // Handle pagination change
  const handleTableChange = pagination => {
    setFilters(prev => ({
      ...prev,
      page: pagination.current - 1,
      size: pagination.pageSize,
    }));
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
      refund: 'processing',
      withdrawal: 'warning',
      adjustment: 'default',
    };
    return colors[type] || 'default';
  };

  // Get transaction type label
  const getTxTypeLabel = type => {
    const labels = {
      topup: 'Deposit',
      payment: 'Payment',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      adjustment: 'Adjustment',
    };
    return labels[type] || type;
  };

  // Get transaction icon
  const getTxIcon = type => {
    if (type === 'topup' || type === 'refund') {
      return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    }
    return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
  };

  // Calculate summary stats
  const calculateStats = () => {
    if (!transactions || transactions.length === 0) {
      return { totalTopup: 0, totalPayment: 0, totalRefund: 0 };
    }

    const stats = transactions.reduce(
      (acc, tx) => {
        if (tx.txType === 'topup') acc.totalTopup += parseFloat(tx.amount) || 0;
        if (tx.txType === 'payment')
          acc.totalPayment += parseFloat(tx.amount) || 0;
        if (tx.txType === 'refund')
          acc.totalRefund += parseFloat(tx.amount) || 0;
        return acc;
      },
      { totalTopup: 0, totalPayment: 0, totalRefund: 0 }
    );

    return stats;
  };

  const stats = calculateStats();

  // Table columns
  const columns = [
    {
      title: 'Transaction Type',
      dataIndex: 'txType',
      key: 'txType',
      width: 150,
      render: type => (
        <Space>
          {getTxIcon(type)}
          <Tag color={getTxTypeColor(type)}>{getTxTypeLabel(type)}</Tag>
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 180,
      render: (amount, record) => (
        <Text
          strong
          style={{
            color:
              record.txType === 'topup' || record.txType === 'refund'
                ? '#52c41a'
                : '#ff4d4f',
            fontSize: '16px',
          }}
        >
          {record.txType === 'topup' || record.txType === 'refund' ? '+' : '-'}
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Balance Before',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      width: 180,
      render: (amount, record) => (
        <Text type="secondary">{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 180,
      render: (amount, record) => (
        <Text strong style={{ fontSize: '16px', color: '#333' }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: date => <Text>{dayjs(date).format('DD/MM/YYYY HH:mm:ss')}</Text>,
    },
  ];

  return (
    <div className={WalletPageStyles.container}>
      <div className={WalletPageStyles.header}>
        <Title level={2} className={WalletPageStyles.title}>
          Wallet Management
        </Title>
        <Text type="secondary" className={WalletPageStyles.subtitle}>
          Manage your balance and transaction history
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column: Balance & Statistics */}
        <Col xs={24} lg={4}>
          {/* Wallet Balance Card */}
          <Card className={WalletPageStyles.walletCard} loading={loading}>
            <div className={WalletPageStyles.balanceSection}>
              <Text className={WalletPageStyles.balanceLabel}>
                Current Balance
              </Text>
              <div className={WalletPageStyles.balanceAmount}>
                <Text className={WalletPageStyles.balanceValue}>
                  {formatCurrency(
                    wallet?.balance || 0,
                    wallet?.currency || 'VND'
                  )}
                </Text>
              </div>
              <Tag className={WalletPageStyles.currencyTag}>
                {wallet?.currency || 'VND'}
              </Tag>
            </div>

            <Space
              direction="vertical"
              style={{ width: '100%', marginTop: 20 }}
              size="small"
            >
              <Button
                icon={<PlusOutlined />}
                onClick={() => setTopupModalVisible(true)}
                block
                className={WalletPageStyles.topupButton}
              >
                Deposit
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadWallet} block>
                Refresh
              </Button>
            </Space>
          </Card>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <Card>
                <Statistic
                  title="Total Deposit"
                  value={stats.totalTopup}
                  precision={0}
                  prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  suffix={wallet?.currency || 'VND'}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24}>
              <Card>
                <Statistic
                  title="Total Payment"
                  value={stats.totalPayment}
                  precision={0}
                  prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
                  suffix={wallet?.currency || 'VND'}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24}>
              <Card>
                <Statistic
                  title="Total Refund"
                  value={stats.totalRefund}
                  precision={0}
                  prefix={<DollarOutlined style={{ color: '#666' }} />}
                  suffix={wallet?.currency || 'VND'}
                  valueStyle={{ color: '#666' }}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Right Column: Transaction History */}
        <Col xs={24} lg={20}>
          <Card
            title={
              <Space>
                <HistoryOutlined />
                <span>Transaction History</span>
              </Space>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadTransactions}
                loading={transactionsLoading}
              >
                Refresh
              </Button>
            }
            className={WalletPageStyles.transactionsCard}
          >
            {/* Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Transaction Type"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.txType}
                  onChange={value => handleFilterChange('txType', value)}
                >
                  <Option value="topup">Deposit</Option>
                  <Option value="payment">Payment</Option>
                  <Option value="refund">Refund</Option>
                  <Option value="withdrawal">Withdrawal</Option>
                  <Option value="adjustment">Adjustment</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={12}>
                <RangePicker
                  style={{ width: '100%' }}
                  onChange={handleDateRangeChange}
                  format="DD/MM/YYYY"
                  placeholder={['From Date', 'To Date']}
                />
              </Col>
            </Row>

            {/* Transactions Table */}
            {transactionsLoading && transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
              </div>
            ) : transactions.length === 0 ? (
              <Empty description="No transactions yet" />
            ) : (
              <Table
                columns={columns}
                dataSource={transactions}
                rowKey="walletTxId"
                loading={transactionsLoading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showTotal: total => `Total ${total} transactions`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                scroll={{ x: 'max-content', y: 'calc(100vh - 450px)' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Topup Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Deposit to Wallet</span>
          </Space>
        }
        open={topupModalVisible}
        onCancel={() => {
          setTopupModalVisible(false);
          topupForm.resetFields();
        }}
        onOk={() => topupForm.submit()}
        okText="Deposit"
        cancelText="Cancel"
        width={500}
      >
        <Form form={topupForm} layout="vertical" onFinish={handleTopup}>
          <Form.Item
            label="Deposit Amount (VND)"
            name="amount"
            rules={[
              { required: true, message: 'Please enter deposit amount' },
              {
                type: 'number',
                min: 1000,
                message: 'Minimum amount is 1,000 VND',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter amount"
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={1000}
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const WalletPage = () => {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '80px' }}>
        <WalletContent />
      </div>
    </>
  );
};

export default WalletPage;
