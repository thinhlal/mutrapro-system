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
  Descriptions,
  Divider,
  Input,
  Tabs,
} from 'antd';
import toast from 'react-hot-toast';
import {
  WalletOutlined,
  PlusOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  getOrCreateMyWallet,
  getMyWalletTransactions,
  withdrawWallet,
  getMyWithdrawalRequests,
} from '../../../services/walletService';
import {
  getContractById,
  getMilestoneById,
} from '../../../services/contractService';
import { getBankList } from '../../../services/vietqrService';
import Header from '../../../components/common/Header/Header';
import WalletPageStyles from './WalletPage.module.css';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const WalletContent = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupForm] = Form.useForm();
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawForm] = Form.useForm();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bankList, setBankList] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalRequestsLoading, setWithdrawalRequestsLoading] =
    useState(false);
  const [withdrawalRequestsPagination, setWithdrawalRequestsPagination] =
    useState({
      current: 1,
      pageSize: 20,
      total: 0,
    });
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState(null);
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] =
    useState(null);
  const [withdrawalDetailVisible, setWithdrawalDetailVisible] = useState(false);
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
      toast.error(error.message || 'Error loading wallet information', { duration: 5000, position: 'top-center' });
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
      toast.error(error.message ||
          error.response?.data?.message ||
          'Error loading transaction list', { duration: 5000, position: 'top-center' });
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
    loadBankList();
  }, []);

  // Load bank list from VietQR API
  const loadBankList = async () => {
    setLoadingBanks(true);
    try {
      const banks = await getBankList();
      setBankList(banks);
    } catch (error) {
      console.error('Error loading bank list:', error);
      message.warning(
        'Không thể tải danh sách ngân hàng. Vui lòng nhập thủ công.'
      );
    } finally {
      setLoadingBanks(false);
    }
  };

  // Refresh wallet when coming from payment success page
  useEffect(() => {
    const handleLocationChange = () => {
      const state = window.history.state;
      if (state?.refresh) {
        loadWallet();
        loadTransactions();
        // Clear the refresh flag
        window.history.replaceState({ ...state, refresh: false }, '');
      }
    };

    handleLocationChange();
  }, []);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'withdrawal-requests') {
      loadWithdrawalRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    withdrawalStatusFilter,
    withdrawalRequestsPagination.current,
    withdrawalRequestsPagination.pageSize,
  ]);

  // Load withdrawal requests
  const loadWithdrawalRequests = async () => {
    setWithdrawalRequestsLoading(true);
    try {
      const response = await getMyWithdrawalRequests({
        status: withdrawalStatusFilter,
        page: withdrawalRequestsPagination.current - 1,
        size: withdrawalRequestsPagination.pageSize,
      });
      if (response?.status === 'success' && response?.data) {
        setWithdrawalRequests(response.data.content || []);
        setWithdrawalRequestsPagination(prev => ({
          ...prev,
          total: response.data.totalElements || 0,
        }));
      } else {
        setWithdrawalRequests([]);
      }
    } catch (error) {
      console.error('Error loading withdrawal requests:', error);
      toast.error(error?.response?.data?.message ||
          'Lỗi khi tải danh sách withdrawal requests', { duration: 5000, position: 'top-center' });
      setWithdrawalRequests([]);
    } finally {
      setWithdrawalRequestsLoading(false);
    }
  };

  // Handle topup - Redirect to payment page
  const handleTopup = async values => {
    try {
      // Redirect to payment page with amount
      const amount = values.amount;
      const description = `Nạp tiền vào ví - ${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
      navigate(
        `/payments/topup?amount=${amount}&description=${encodeURIComponent(description)}`
      );
      setTopupModalVisible(false);
      topupForm.resetFields();
    } catch (error) {
      toast.error(error.message || error.details?.message || 'Error processing deposit', { duration: 5000, position: 'top-center' });
    }
  };

  // Handle withdraw
  const handleWithdraw = async values => {
    if (!wallet?.walletId) {
      toast.error('Không tìm thấy thông tin ví', { duration: 5000, position: 'top-center' });
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await withdrawWallet(wallet.walletId, {
        amount: values.amount,
        currency: values.currency || 'VND',
        bankAccountNumber: values.bankAccountNumber,
        bankName: values.bankName,
        accountHolderName: values.accountHolderName,
        note: values.note,
      });

      if (response?.status === 'success') {
        message.success(
          'Yêu cầu rút tiền đã được gửi thành công! Yêu cầu của bạn đang chờ manager duyệt.'
        );
        setWithdrawModalVisible(false);
        withdrawForm.resetFields();
        await loadWallet();
        await loadTransactions();
        // Reload withdrawal requests if on that tab
        if (activeTab === 'withdrawal-requests') {
          await loadWithdrawalRequests();
        }
      }
    } catch (error) {
      toast.error(error?.message || error?.details?.message || 'Lỗi khi rút tiền từ ví', { duration: 5000, position: 'top-center' });
    } finally {
      setWithdrawLoading(false);
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
      topup: 'Nạp tiền',
      payment: 'Thanh toán',
      contract_deposit_payment: 'Thanh toán cọc hợp đồng',
      milestone_payment: 'Thanh toán milestone',
      recording_booking_payment: 'Thanh toán đặt phòng thu âm',
      revision_fee: 'Phí chỉnh sửa',
      refund: 'Hoàn tiền',
      withdrawal: 'Rút tiền',
      adjustment: 'Điều chỉnh',
    };
    return labels[type] || type;
  };

  // Get transaction icon
  const getTxIcon = type => {
    if (type === 'topup' || type === 'refund') {
      return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    }
    // Các loại payment đều là chi tiêu
    if (
      type === 'payment' ||
      type === 'contract_deposit_payment' ||
      type === 'milestone_payment' ||
      type === 'recording_booking_payment' ||
      type === 'revision_fee' ||
      type === 'withdrawal'
    ) {
      return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
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
        // Tất cả các loại payment đều tính vào totalPayment
        if (
          tx.txType === 'payment' ||
          tx.txType === 'contract_deposit_payment' ||
          tx.txType === 'milestone_payment' ||
          tx.txType === 'recording_booking_payment' ||
          tx.txType === 'revision_fee'
        ) {
          acc.totalPayment += parseFloat(tx.amount) || 0;
        }
        if (tx.txType === 'refund')
          acc.totalRefund += parseFloat(tx.amount) || 0;
        return acc;
      },
      { totalTopup: 0, totalPayment: 0, totalRefund: 0 }
    );

    return stats;
  };

  const stats = calculateStats();

  // Get transaction description
  const getTransactionDescription = (
    record,
    contractInfo = null,
    milestoneInfo = null
  ) => {
    const { txType, metadata, contractId, milestoneId } = record;

    // Nếu có description trong metadata
    if (metadata?.description) {
      return metadata.description;
    }

    // Tạo description dựa trên txType và các thông tin khác
    switch (txType) {
      case 'contract_deposit_payment':
        if (contractInfo?.contractNumber) {
          return `Thanh toán cọc cho hợp đồng ${contractInfo.contractNumber}`;
        }
        return contractId
          ? `Thanh toán cọc cho hợp đồng ${contractId.substring(0, 8)}...`
          : 'Thanh toán cọc hợp đồng';

      case 'milestone_payment':
        if (contractInfo?.contractNumber && milestoneInfo?.name) {
          return `Thanh toán milestone "${milestoneInfo.name}" cho hợp đồng ${contractInfo.contractNumber}`;
        }
        if (contractInfo?.contractNumber) {
          return `Thanh toán milestone cho hợp đồng ${contractInfo.contractNumber}`;
        }
        if (milestoneInfo?.name) {
          return `Thanh toán milestone "${milestoneInfo.name}"`;
        }
        if (contractId && milestoneId) {
          return `Thanh toán milestone cho hợp đồng ${contractId.substring(0, 8)}...`;
        }
        return contractId
          ? `Thanh toán milestone cho hợp đồng ${contractId.substring(0, 8)}...`
          : 'Thanh toán milestone';

      case 'revision_fee':
        if (metadata?.revisionRound) {
          return `Phí chỉnh sửa lần ${metadata.revisionRound}`;
        }
        return 'Phí chỉnh sửa';

      case 'recording_booking_payment':
        return record.bookingId
          ? `Thanh toán đặt phòng thu âm ${record.bookingId.substring(0, 8)}...`
          : 'Thanh toán đặt phòng thu âm';

      case 'refund':
        if (metadata?.refund_reason) {
          return `Hoàn tiền: ${metadata.refund_reason}`;
        }
        if (metadata?.reason === 'REVISION_REJECTED') {
          return 'Hoàn tiền phí chỉnh sửa (yêu cầu bị từ chối)';
        }
        return 'Hoàn tiền';

      case 'topup':
        if (metadata?.payment_method) {
          return `Nạp tiền qua ${metadata.payment_method}`;
        }
        return 'Nạp tiền vào ví';

      case 'withdrawal':
        return 'Rút tiền';

      case 'adjustment':
        if (metadata?.reason) {
          return `Điều chỉnh: ${metadata.reason}`;
        }
        return 'Điều chỉnh số dư';

      default:
        return getTxTypeLabel(txType);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Loại giao dịch',
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
      title: 'Số tiền',
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
      title: 'Số dư trước',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      width: 180,
      render: (amount, record) => (
        <Text type="secondary">{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Số dư sau',
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
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: date => <Text>{dayjs(date).format('DD/MM/YYYY HH:mm:ss')}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={async () => {
            setSelectedTransaction(record);
            setContractInfo(null);
            setMilestoneInfo(null);
            setDetailModalVisible(true);

            // Load contract info nếu có contractId
            if (record.contractId) {
              setDetailLoading(true);
              try {
                const contractResponse = await getContractById(
                  record.contractId
                );
                if (
                  contractResponse?.status === 'success' &&
                  contractResponse?.data
                ) {
                  setContractInfo(contractResponse.data);

                  // Load milestone info nếu có milestoneId
                  if (record.milestoneId) {
                    try {
                      const milestoneResponse = await getMilestoneById(
                        record.contractId,
                        record.milestoneId
                      );
                      if (
                        milestoneResponse?.status === 'success' &&
                        milestoneResponse?.data
                      ) {
                        setMilestoneInfo(milestoneResponse.data);
                      }
                    } catch (error) {
                      console.warn('Failed to load milestone info:', error);
                    }
                  }
                }
              } catch (error) {
                console.warn('Failed to load contract info:', error);
              } finally {
                setDetailLoading(false);
              }
            }
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  // Withdrawal Request columns
  const WITHDRAWAL_STATUS_COLORS = {
    PENDING_REVIEW: 'orange',
    APPROVED: 'blue',
    PROCESSING: 'processing',
    COMPLETED: 'success',
    REJECTED: 'error',
    FAILED: 'error',
  };

  const WITHDRAWAL_STATUS_LABELS = {
    PENDING_REVIEW: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    PROCESSING: 'Đang xử lý',
    COMPLETED: 'Hoàn thành',
    REJECTED: 'Từ chối',
    FAILED: 'Thất bại',
  };

  const formatDateTime = dateString => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatPriceDisplay = amount => {
    if (!amount) return 'N/A';
    return formatCurrency(amount, wallet?.currency || 'VND');
  };

  const withdrawalRequestColumns = [
    {
      title: 'Request ID',
      dataIndex: 'withdrawalRequestId',
      key: 'withdrawalRequestId',
      width: 150,
      render: id => <Text code>{id?.substring(0, 8)}...</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: amount => <Text strong>{formatPriceDisplay(amount)}</Text>,
    },
    {
      title: 'Ngân hàng',
      key: 'bank',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.bankName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.accountHolderName}
          </Text>
          <Text code style={{ fontSize: 11 }}>
            {record.bankAccountNumber}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => (
        <Tag color={WITHDRAWAL_STATUS_COLORS[status]}>
          {WITHDRAWAL_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: date => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedWithdrawalRequest(record);
            setWithdrawalDetailVisible(true);
          }}
        >
          Chi tiết
        </Button>
      ),
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
        <Col xs={24} lg={5}>
          {/* Wallet Balance Card */}
          <Card className={WalletPageStyles.walletCard} loading={loading}>
            <div className={WalletPageStyles.balanceSection}>
              <Text className={WalletPageStyles.balanceLabel}>
                Available Balance
              </Text>
              <div className={WalletPageStyles.balanceAmount}>
                <Text className={WalletPageStyles.balanceValue}>
                  {formatCurrency(
                    wallet?.availableBalance ??
                      (wallet?.balance
                        ? wallet.balance - (wallet.holdBalance || 0)
                        : 0),
                    wallet?.currency || 'VND'
                  )}
                </Text>
              </div>
              {wallet?.holdBalance > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  <Text type="secondary">
                    Total: {formatCurrency(wallet.balance, wallet.currency)} |
                    On Hold:{' '}
                    {formatCurrency(wallet.holdBalance, wallet.currency)}
                  </Text>
                </div>
              )}
              {/* <Tag className={WalletPageStyles.currencyTag}>
                {wallet?.currency || 'VND'}
              </Tag> */}
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
              <Button
                icon={<ArrowDownOutlined />}
                onClick={() => setWithdrawModalVisible(true)}
                block
                type="default"
              >
                Withdraw
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

        {/* Right Column: Tabs */}
        <Col xs={24} lg={19}>
          <Card className={WalletPageStyles.transactionsCard}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'transactions',
                  label: (
                    <Space>
                      <HistoryOutlined />
                      <span>Transaction History</span>
                    </Space>
                  ),
                  children: (
                    <>
                      <div
                        style={{
                          marginBottom: 16,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          {/* Filters */}
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}>
                              <Select
                                placeholder="Loại giao dịch"
                                allowClear
                                style={{ width: '100%' }}
                                value={filters.txType}
                                onChange={value =>
                                  handleFilterChange('txType', value)
                                }
                              >
                                <Option value="topup">Nạp tiền</Option>
                                <Option value="payment">Thanh toán</Option>
                                <Option value="contract_deposit_payment">
                                  Thanh toán cọc hợp đồng
                                </Option>
                                <Option value="milestone_payment">
                                  Thanh toán milestone
                                </Option>
                                <Option value="recording_booking_payment">
                                  Thanh toán đặt phòng thu âm
                                </Option>
                                <Option value="revision_fee">
                                  Phí chỉnh sửa
                                </Option>
                                <Option value="refund">Hoàn tiền</Option>
                                <Option value="withdrawal">Rút tiền</Option>
                                <Option value="adjustment">Điều chỉnh</Option>
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
                        </div>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadTransactions}
                          loading={transactionsLoading}
                          style={{ marginLeft: 16 }}
                        >
                          Refresh
                        </Button>
                      </div>

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
                          scroll={{
                            x: 'max-content',
                            y: 'calc(100vh - 450px)',
                          }}
                        />
                      )}
                    </>
                  ),
                },
                {
                  key: 'withdrawal-requests',
                  label: (
                    <Space>
                      <ArrowDownOutlined />
                      <span>Withdrawal Requests</span>
                    </Space>
                  ),
                  children: (
                    <>
                      <div
                        style={{
                          marginBottom: 16,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Select
                          placeholder="Lọc theo status"
                          allowClear
                          style={{ width: 200 }}
                          value={withdrawalStatusFilter}
                          onChange={setWithdrawalStatusFilter}
                        >
                          <Option value="PENDING_REVIEW">Chờ duyệt</Option>
                          <Option value="APPROVED">Đã duyệt</Option>
                          <Option value="PROCESSING">Đang xử lý</Option>
                          <Option value="COMPLETED">Hoàn thành</Option>
                          <Option value="REJECTED">Từ chối</Option>
                          <Option value="FAILED">Thất bại</Option>
                        </Select>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadWithdrawalRequests}
                          loading={withdrawalRequestsLoading}
                        >
                          Refresh
                        </Button>
                      </div>

                      <Table
                        columns={withdrawalRequestColumns}
                        dataSource={withdrawalRequests}
                        rowKey="withdrawalRequestId"
                        loading={withdrawalRequestsLoading}
                        pagination={{
                          current: withdrawalRequestsPagination.current,
                          pageSize: withdrawalRequestsPagination.pageSize,
                          total: withdrawalRequestsPagination.total,
                          showSizeChanger: true,
                          showTotal: total => `Tổng: ${total} requests`,
                          onChange: (page, pageSize) => {
                            setWithdrawalRequestsPagination({
                              ...withdrawalRequestsPagination,
                              current: page,
                              pageSize,
                            });
                          },
                        }}
                        scroll={{ x: 1000 }}
                        locale={{
                          emptyText: (
                            <Empty description="Không có withdrawal request nào" />
                          ),
                        }}
                      />
                    </>
                  ),
                },
              ]}
            />
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

      {/* Withdraw Modal */}
      <Modal
        title={
          <Space>
            <ArrowDownOutlined />
            <span>Withdraw from Wallet</span>
          </Space>
        }
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          withdrawForm.resetFields();
        }}
        afterOpenChange={open => {
          if (open && bankList.length === 0) {
            loadBankList();
          }
        }}
        onOk={() => withdrawForm.submit()}
        okText="Withdraw"
        cancelText="Cancel"
        width={600}
        confirmLoading={withdrawLoading}
      >
        <Form form={withdrawForm} layout="vertical" onFinish={handleWithdraw}>
          <Form.Item
            label="Withdrawal Amount (VND)"
            name="amount"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền rút' },
              {
                type: 'number',
                min: 10000,
                message: 'Số tiền rút tối thiểu là 10,000 VND',
              },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const availableBalance =
                    wallet?.availableBalance ??
                    (wallet?.balance
                      ? wallet.balance - (wallet.holdBalance || 0)
                      : 0);
                  if (value > availableBalance) {
                    return Promise.reject(
                      new Error(
                        `Số tiền rút không được vượt quá số dư khả dụng (${formatCurrency(
                          availableBalance,
                          wallet?.currency || 'VND'
                        )})`
                      )
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Nhập số tiền rút"
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={10000}
              max={
                wallet?.availableBalance ??
                (wallet?.balance
                  ? wallet.balance - (wallet.holdBalance || 0)
                  : undefined)
              }
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Số tài khoản ngân hàng"
            name="bankAccountNumber"
            rules={[
              {
                required: true,
                message: 'Vui lòng nhập số tài khoản ngân hàng',
              },
            ]}
          >
            <Input placeholder="Nhập số tài khoản ngân hàng" size="large" />
          </Form.Item>

          <Form.Item
            label="Tên ngân hàng"
            name="bankName"
            rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
          >
            <Select
              placeholder="Chọn ngân hàng"
              size="large"
              loading={loadingBanks}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase()) ||
                (option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={bankList.map(bank => ({
                value: bank.shortName || bank.name,
                label: bank.shortName || bank.name,
                code: bank.code,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Tên chủ tài khoản"
            name="accountHolderName"
            rules={[
              { required: true, message: 'Vui lòng nhập tên chủ tài khoản' },
            ]}
          >
            <Input placeholder="Nhập tên chủ tài khoản" size="large" />
          </Form.Item>

          <Form.Item label="Ghi chú (tùy chọn)" name="note">
            <Input.TextArea
              placeholder="Nhập ghi chú (nếu có)"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Chi tiết giao dịch</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedTransaction(null);
          setContractInfo(null);
          setMilestoneInfo(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
          selectedTransaction?.contractId && (
            <Button
              key="contract"
              type="primary"
              onClick={() => {
                navigate(`/contracts/${selectedTransaction.contractId}`);
                setDetailModalVisible(false);
              }}
            >
              Xem hợp đồng
            </Button>
          ),
        ].filter(Boolean)}
        width={700}
      >
        {selectedTransaction && (
          <Spin spinning={detailLoading}>
            <div>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Loại giao dịch">
                  <Space>
                    {getTxIcon(selectedTransaction.txType)}
                    <Tag color={getTxTypeColor(selectedTransaction.txType)}>
                      {getTxTypeLabel(selectedTransaction.txType)}
                    </Tag>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  <Text>
                    {getTransactionDescription(
                      selectedTransaction,
                      contractInfo,
                      milestoneInfo
                    )}
                  </Text>
                </Descriptions.Item>
                {contractInfo && (
                  <Descriptions.Item label="Contract Number">
                    <Text strong>{contractInfo.contractNumber || 'N/A'}</Text>
                  </Descriptions.Item>
                )}
                {milestoneInfo && (
                  <Descriptions.Item label="Milestone Name">
                    <Text strong>{milestoneInfo.name || 'N/A'}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Số tiền">
                  <Text
                    strong
                    style={{
                      color:
                        selectedTransaction.txType === 'topup' ||
                        selectedTransaction.txType === 'refund'
                          ? '#52c41a'
                          : '#ff4d4f',
                      fontSize: '16px',
                    }}
                  >
                    {selectedTransaction.txType === 'topup' ||
                    selectedTransaction.txType === 'refund'
                      ? '+'
                      : '-'}
                    {formatCurrency(
                      selectedTransaction.amount,
                      selectedTransaction.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư trước">
                  <Text>
                    {formatCurrency(
                      selectedTransaction.balanceBefore,
                      selectedTransaction.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư sau">
                  <Text strong>
                    {formatCurrency(
                      selectedTransaction.balanceAfter,
                      selectedTransaction.currency
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Thời gian">
                  <Text>
                    {dayjs(selectedTransaction.createdAt).format(
                      'DD/MM/YYYY HH:mm:ss'
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Transaction ID">
                  <Text code>{selectedTransaction.walletTxId}</Text>
                </Descriptions.Item>
              </Descriptions>

              {/* Thông tin liên quan dựa trên txType */}
              {(selectedTransaction.contractId ||
                selectedTransaction.milestoneId ||
                selectedTransaction.bookingId ||
                selectedTransaction.metadata) && (
                <>
                  <Divider orientation="left">Thông tin liên quan</Divider>
                  <Descriptions bordered column={1} size="small">
                    {selectedTransaction.contractId && (
                      <Descriptions.Item label="Contract">
                        <Space>
                          {contractInfo ? (
                            <>
                              <Text strong>{contractInfo.contractNumber}</Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: '12px' }}
                              >
                                (
                                {selectedTransaction.contractId.substring(0, 8)}
                                ...)
                              </Text>
                            </>
                          ) : (
                            <Text code>{selectedTransaction.contractId}</Text>
                          )}
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              navigate(
                                `/contracts/${selectedTransaction.contractId}`
                              );
                              setDetailModalVisible(false);
                            }}
                          >
                            Xem hợp đồng
                          </Button>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.milestoneId && (
                      <Descriptions.Item label="Milestone">
                        <Space>
                          {milestoneInfo ? (
                            <>
                              <Text strong>{milestoneInfo.name}</Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: '12px' }}
                              >
                                (
                                {selectedTransaction.milestoneId.substring(
                                  0,
                                  8
                                )}
                                ...)
                              </Text>
                            </>
                          ) : (
                            <Text code>{selectedTransaction.milestoneId}</Text>
                          )}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.bookingId && (
                      <Descriptions.Item label="Booking ID">
                        <Text code>{selectedTransaction.bookingId}</Text>
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.metadata && (
                      <>
                        {selectedTransaction.metadata.payment_method && (
                          <Descriptions.Item label="Phương thức thanh toán">
                            <Tag
                              color={
                                selectedTransaction.metadata.payment_method ===
                                'sepay'
                                  ? 'blue'
                                  : 'default'
                              }
                            >
                              {selectedTransaction.metadata.payment_method ===
                              'sepay'
                                ? 'SePay (Chuyển khoản ngân hàng)'
                                : selectedTransaction.metadata.payment_method.toUpperCase()}
                            </Tag>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.transaction_id && (
                          <Descriptions.Item label="Mã giao dịch SePay">
                            <Text code copyable>
                              {selectedTransaction.metadata.transaction_id}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.payment_order_id && (
                          <Descriptions.Item label="Mã đơn hàng thanh toán">
                            <Text code copyable>
                              {selectedTransaction.metadata.payment_order_id}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.gateway_response && (
                          <Descriptions.Item label="Thông tin từ SePay">
                            <div
                              style={{ maxHeight: '200px', overflowY: 'auto' }}
                            >
                              {(() => {
                                try {
                                  const gatewayData =
                                    typeof selectedTransaction.metadata
                                      .gateway_response === 'string'
                                      ? JSON.parse(
                                          selectedTransaction.metadata
                                            .gateway_response
                                        )
                                      : selectedTransaction.metadata
                                          .gateway_response;

                                  return (
                                    <Descriptions
                                      bordered
                                      column={1}
                                      size="small"
                                    >
                                      {gatewayData.gateway && (
                                        <Descriptions.Item label="Ngân hàng">
                                          <Text>{gatewayData.gateway}</Text>
                                        </Descriptions.Item>
                                      )}
                                      {gatewayData.transactionDate && (
                                        <Descriptions.Item label="Thời gian giao dịch">
                                          <Text>
                                            {gatewayData.transactionDate}
                                          </Text>
                                        </Descriptions.Item>
                                      )}
                                      {gatewayData.accountNumber && (
                                        <Descriptions.Item label="Số tài khoản">
                                          <Text code>
                                            {gatewayData.accountNumber}
                                          </Text>
                                        </Descriptions.Item>
                                      )}
                                      {gatewayData.referenceCode && (
                                        <Descriptions.Item label="Mã tham chiếu">
                                          <Text code>
                                            {gatewayData.referenceCode}
                                          </Text>
                                        </Descriptions.Item>
                                      )}
                                      {gatewayData.content && (
                                        <Descriptions.Item label="Nội dung chuyển khoản">
                                          <Text>{gatewayData.content}</Text>
                                        </Descriptions.Item>
                                      )}
                                    </Descriptions>
                                  );
                                } catch (e) {
                                  return (
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: '12px' }}
                                    >
                                      {typeof selectedTransaction.metadata
                                        .gateway_response === 'string'
                                        ? selectedTransaction.metadata.gateway_response.substring(
                                            0,
                                            100
                                          ) + '...'
                                        : JSON.stringify(
                                            selectedTransaction.metadata
                                              .gateway_response
                                          ).substring(0, 100) + '...'}
                                    </Text>
                                  );
                                }
                              })()}
                            </div>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.installment_id && (
                          <Descriptions.Item label="Installment ID">
                            <Text code>
                              {selectedTransaction.metadata.installment_id}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.payment_type && (
                          <Descriptions.Item label="Loại thanh toán">
                            <Tag>
                              {selectedTransaction.metadata.payment_type ===
                              'DEPOSIT'
                                ? 'Cọc hợp đồng'
                                : selectedTransaction.metadata.payment_type ===
                                    'MILESTONE'
                                  ? 'Thanh toán milestone'
                                  : selectedTransaction.metadata.payment_type}
                            </Tag>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.txType ===
                          'contract_deposit_payment' &&
                          selectedTransaction.metadata?.installment_id && (
                            <Descriptions.Item label="Installment (Cọc)">
                              <Text code>
                                {selectedTransaction.metadata.installment_id}
                              </Text>
                            </Descriptions.Item>
                          )}
                        {selectedTransaction.metadata.revisionRound && (
                          <Descriptions.Item label="Lần chỉnh sửa">
                            <Text>
                              Lần {selectedTransaction.metadata.revisionRound}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.reason && (
                          <Descriptions.Item label="Lý do">
                            <Text>{selectedTransaction.metadata.reason}</Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.refund_reason && (
                          <Descriptions.Item label="Lý do hoàn tiền">
                            <Text>
                              {selectedTransaction.metadata.refund_reason}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {selectedTransaction.metadata.original_wallet_tx_id && (
                          <Descriptions.Item label="Giao dịch gốc">
                            <Text code>
                              {
                                selectedTransaction.metadata
                                  .original_wallet_tx_id
                              }
                            </Text>
                          </Descriptions.Item>
                        )}
                        {/* Withdrawal Request Information */}
                        {selectedTransaction.txType === 'withdrawal' &&
                          selectedTransaction.metadata && (
                            <>
                              {selectedTransaction.metadata
                                .withdrawal_request_id && (
                                <Descriptions.Item label="Mã yêu cầu rút tiền">
                                  <Text code copyable>
                                    {
                                      selectedTransaction.metadata
                                        .withdrawal_request_id
                                    }
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.bank_name && (
                                <Descriptions.Item label="Ngân hàng nhận">
                                  <Text strong>
                                    {selectedTransaction.metadata.bank_name}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata
                                .account_holder_name && (
                                <Descriptions.Item label="Chủ tài khoản">
                                  <Text>
                                    {
                                      selectedTransaction.metadata
                                        .account_holder_name
                                    }
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata
                                .bank_account_number && (
                                <Descriptions.Item label="Số tài khoản nhận">
                                  <Text code>
                                    {(() => {
                                      const accountNumber =
                                        selectedTransaction.metadata
                                          .bank_account_number;
                                      if (
                                        accountNumber &&
                                        accountNumber.length > 4
                                      ) {
                                        return '****' + accountNumber.slice(-4);
                                      }
                                      return accountNumber;
                                    })()}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.provider && (
                                <Descriptions.Item label="Kênh chuyển">
                                  <Tag color="blue">
                                    {selectedTransaction.metadata.provider}
                                  </Tag>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.bank_ref && (
                                <Descriptions.Item label="Mã tham chiếu ngân hàng">
                                  <Text code copyable>
                                    {selectedTransaction.metadata.bank_ref}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.txn_code && (
                                <Descriptions.Item label="Mã giao dịch">
                                  <Text code copyable>
                                    {selectedTransaction.metadata.txn_code}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.paid_amount &&
                                selectedTransaction.metadata
                                  .withdrawal_amount &&
                                parseFloat(
                                  selectedTransaction.metadata.paid_amount
                                ) !==
                                  parseFloat(
                                    selectedTransaction.metadata
                                      .withdrawal_amount
                                  ) && (
                                  <Descriptions.Item label="Số tiền đã chuyển">
                                    <Text strong style={{ color: '#1890ff' }}>
                                      {formatCurrency(
                                        parseFloat(
                                          selectedTransaction.metadata
                                            .paid_amount
                                        ),
                                        selectedTransaction.currency
                                      )}
                                    </Text>
                                    <Text
                                      type="secondary"
                                      style={{ marginLeft: 8 }}
                                    >
                                      (Yêu cầu:{' '}
                                      {formatCurrency(
                                        parseFloat(
                                          selectedTransaction.metadata
                                            .withdrawal_amount
                                        ),
                                        selectedTransaction.currency
                                      )}
                                      )
                                    </Text>
                                  </Descriptions.Item>
                                )}
                              {selectedTransaction.metadata.note && (
                                <Descriptions.Item label="Ghi chú">
                                  <Text type="secondary">
                                    {selectedTransaction.metadata.note}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.admin_note && (
                                <Descriptions.Item label="Ghi chú từ Admin/Manager">
                                  <Text
                                    type="secondary"
                                    style={{ fontStyle: 'italic' }}
                                  >
                                    {selectedTransaction.metadata.admin_note}
                                  </Text>
                                </Descriptions.Item>
                              )}
                              {selectedTransaction.metadata.proof_s3_key && (
                                <Descriptions.Item label="Biên lai chuyển khoản">
                                  <Tag color="green">Đã tải lên</Tag>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: '12px', marginLeft: 8 }}
                                  >
                                    (Chỉ Admin/Manager có thể xem)
                                  </Text>
                                </Descriptions.Item>
                              )}
                            </>
                          )}
                      </>
                    )}
                  </Descriptions>
                </>
              )}
            </div>
          </Spin>
        )}
      </Modal>

      {/* Withdrawal Request Detail Modal */}
      {selectedWithdrawalRequest && (
        <Modal
          title="Chi tiết Withdrawal Request"
          open={withdrawalDetailVisible}
          onCancel={() => {
            setWithdrawalDetailVisible(false);
            setSelectedWithdrawalRequest(null);
          }}
          footer={[
            <Button
              key="close"
              onClick={() => {
                setWithdrawalDetailVisible(false);
                setSelectedWithdrawalRequest(null);
              }}
            >
              Đóng
            </Button>,
          ]}
          width={700}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Request ID">
              <Text code>{selectedWithdrawalRequest.withdrawalRequestId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={
                  WITHDRAWAL_STATUS_COLORS[selectedWithdrawalRequest.status]
                }
              >
                {WITHDRAWAL_STATUS_LABELS[selectedWithdrawalRequest.status] ||
                  selectedWithdrawalRequest.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              <Text strong>
                {formatPriceDisplay(selectedWithdrawalRequest.amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Currency">
              <Tag>{selectedWithdrawalRequest.currency}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngân hàng">
              {selectedWithdrawalRequest.bankName}
            </Descriptions.Item>
            <Descriptions.Item label="Tên chủ tài khoản">
              {selectedWithdrawalRequest.accountHolderName}
            </Descriptions.Item>
            <Descriptions.Item label="Số tài khoản">
              <Text code>{selectedWithdrawalRequest.bankAccountNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {selectedWithdrawalRequest.note || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDateTime(selectedWithdrawalRequest.createdAt)}
            </Descriptions.Item>
            {selectedWithdrawalRequest.approvedBy && (
              <>
                <Descriptions.Item label="Approved By">
                  <Text>{selectedWithdrawalRequest.approvedBy}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Approved At">
                  {formatDateTime(selectedWithdrawalRequest.approvedAt)}
                </Descriptions.Item>
              </>
            )}
            {selectedWithdrawalRequest.rejectedBy && (
              <>
                <Descriptions.Item label="Rejected By">
                  <Text>{selectedWithdrawalRequest.rejectedBy}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Rejected At">
                  {formatDateTime(selectedWithdrawalRequest.rejectedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Rejection Reason" span={2}>
                  {selectedWithdrawalRequest.rejectionReason}
                </Descriptions.Item>
              </>
            )}
            {selectedWithdrawalRequest.completedBy && (
              <>
                <Descriptions.Item label="Completed By">
                  <Text>{selectedWithdrawalRequest.completedBy}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Completed At">
                  {formatDateTime(selectedWithdrawalRequest.completedAt)}
                </Descriptions.Item>
                {selectedWithdrawalRequest.paidAmount && (
                  <Descriptions.Item label="Paid Amount">
                    <Text strong>
                      {formatPriceDisplay(selectedWithdrawalRequest.paidAmount)}
                    </Text>
                  </Descriptions.Item>
                )}
                {selectedWithdrawalRequest.provider && (
                  <Descriptions.Item label="Provider">
                    {selectedWithdrawalRequest.provider}
                  </Descriptions.Item>
                )}
                {selectedWithdrawalRequest.bankRef && (
                  <Descriptions.Item label="Bank Ref">
                    {selectedWithdrawalRequest.bankRef}
                  </Descriptions.Item>
                )}
                {selectedWithdrawalRequest.txnCode && (
                  <Descriptions.Item label="Txn Code">
                    {selectedWithdrawalRequest.txnCode}
                  </Descriptions.Item>
                )}
              </>
            )}
            {selectedWithdrawalRequest.failedBy && (
              <>
                <Descriptions.Item label="Failed By">
                  <Text>{selectedWithdrawalRequest.failedBy}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Failed At">
                  {formatDateTime(selectedWithdrawalRequest.failedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Failure Reason" span={2}>
                  {selectedWithdrawalRequest.failureReason}
                </Descriptions.Item>
              </>
            )}
            {selectedWithdrawalRequest.adminNote && (
              <Descriptions.Item label="Admin Note" span={2}>
                {selectedWithdrawalRequest.adminNote}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

const WalletPage = () => {
  useDocumentTitle('Wallet');

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
