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
} from 'antd';
import {
  WalletOutlined,
  ReloadOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { getAllWallets, getWalletById, getWalletTransactions } from '../../../services/adminWalletService';
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
      message.error(error.message || 'Lỗi khi tải danh sách wallets');
    } finally {
      setLoading(false);
    }
  };

  // Load wallet detail
  const loadWalletDetail = async (walletId) => {
    try {
      const response = await getWalletById(walletId);
      if (response.status === 'success' && response.data) {
        setSelectedWallet(response.data);
        loadTransactions(walletId);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải chi tiết ví');
    }
  };

  // Load transactions
  const loadTransactions = async (walletId) => {
    if (!walletId) return;
    setTransactionsLoading(true);
    try {
      const response = await getWalletTransactions(walletId, transactionFilters);
      if (response.status === 'success' && response.data) {
        setTransactions(response.data.content || []);
        setTransactionsPagination({
          current: response.data.pageNumber + 1,
          pageSize: response.data.pageSize,
          total: response.data.totalElements,
        });
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải lịch sử giao dịch');
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
  const handleViewDetail = (wallet) => {
    setSelectedWallet(wallet);
    setDetailModalVisible(true);
    setTransactionFilters(prev => ({ ...prev, page: 0 }));
    loadWalletDetail(wallet.walletId);
  };

  // Handle search by userId
  const handleSearch = (value) => {
    setFilters(prev => ({
      ...prev,
      userId: value || null,
      page: 0,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
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
  const getTxTypeColor = (type) => {
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
  const getTxTypeLabel = (type) => {
    const labels = {
      topup: 'Nạp tiền',
      payment: 'Thanh toán',
      refund: 'Hoàn tiền',
      withdrawal: 'Rút tiền',
      adjustment: 'Điều chỉnh',
    };
    return labels[type] || type;
  };

  // Table columns
  const columns = [
    {
      title: 'Wallet ID',
      dataIndex: 'walletId',
      key: 'walletId',
      width: 120,
      render: (text) => <Text code style={{ fontSize: '12px' }}>{text.substring(0, 8)}...</Text>,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      render: (text) => <Text code style={{ fontSize: '12px' }}>{text.substring(0, 8)}...</Text>,
    },
    {
      title: 'Số dư',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      render: (amount, record) => (
        <Text strong style={{ fontSize: '16px', color: '#ec8a1c' }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Loại tiền tệ',
      dataIndex: 'currency',
      key: 'currency',
      width: 120,
      render: (currency) => <Tag color="orange">{currency}</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          Xem chi tiết
        </Button>
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
      render: (text) => <Text code copyable={{ tooltips: ['Copy', 'Copied!'] }}>{text || '-'}</Text>,
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'txType',
      key: 'txType',
      width: 150,
      render: (type) => (
        <Tag color={getTxTypeColor(type)}>{getTxTypeLabel(type)}</Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 180,
      render: (amount, record) => (
        <Text
          strong
          style={{
            color: record.txType === 'topup' || record.txType === 'refund' ? '#52c41a' : '#ff4d4f',
            fontSize: '16px',
          }}
        >
          {record.txType === 'topup' || record.txType === 'refund' ? '+' : '-'}
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Số dư trước',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      width: 150,
      render: (amount, record) => formatCurrency(amount, record.currency),
    },
    {
      title: 'Số dư sau',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 150,
      render: (amount, record) => (
        <Text strong>{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>
          <WalletOutlined /> Quản lý Wallets
        </Title>
        <Space>
          <Search
            placeholder="Tìm theo User ID"
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
            Làm mới
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={wallets}
          rowKey="walletId"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} wallets`,
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
            <span>Chi tiết Wallet</span>
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
            <TabPane tab="Thông tin Wallet" key="info">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Wallet ID">
                  <Text code>{selectedWallet.walletId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="User ID">
                  <Text code>{selectedWallet.userId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư">
                  <Text strong style={{ fontSize: '18px', color: '#ec8a1c' }}>
                    {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Loại tiền tệ">
                  <Tag color="orange">{selectedWallet.currency}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo" span={2}>
                  {dayjs(selectedWallet.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane
              tab={
                <Space>
                  <HistoryOutlined />
                  <span>Lịch sử giao dịch</span>
                </Space>
              }
              key="transactions"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Filters */}
                <Space wrap>
                  <Search
                    placeholder="Tìm theo Transaction ID, Contract ID..."
                    allowClear
                    style={{ width: 300 }}
                    onSearch={(value) => {
                      setTransactionFilters(prev => ({ ...prev, search: value || null, page: 0 }));
                    }}
                    enterButton
                  />
                  <Select
                    placeholder="Loại giao dịch"
                    allowClear
                    style={{ width: 200 }}
                    value={transactionFilters.txType}
                    onChange={(value) => {
                      setTransactionFilters(prev => ({ ...prev, txType: value, page: 0 }));
                    }}
                  >
                    <Option value="topup">Nạp tiền</Option>
                    <Option value="payment">Thanh toán</Option>
                    <Option value="refund">Hoàn tiền</Option>
                    <Option value="withdrawal">Rút tiền</Option>
                    <Option value="adjustment">Điều chỉnh</Option>
                  </Select>
                  <RangePicker
                    onChange={(dates) => {
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
                    Làm mới
                  </Button>
                </Space>

                {/* Transactions Table */}
                {transactionsLoading && transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : transactions.length === 0 ? (
                  <Empty description="Chưa có giao dịch nào" />
                ) : (
                  <Table
                    columns={transactionColumns}
                    dataSource={transactions}
                    rowKey="walletTxId"
                    loading={transactionsLoading}
                    pagination={{
                      current: transactionsPagination.current,
                      pageSize: transactionsPagination.pageSize,
                      total: transactionsPagination.total,
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng ${total} giao dịch`,
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
                    scroll={{ x: 800 }}
                  />
                )}
              </Space>
            </TabPane>
          </Tabs>
        ) : (
          <Spin />
        )}
      </Modal>
    </div>
  );
};

export default WalletManagement;

