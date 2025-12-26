import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Alert,
  Spin,
  message,
  Radio,
  Form,
  Modal,
  Divider,
} from 'antd';
import toast from 'react-hot-toast';
import {
  DollarOutlined,
  WalletOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { getContractById } from '../../../services/contractService';
import {
  getOrCreateMyWallet,
  payDeposit,
} from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import styles from './PayDepositPage.module.css';
import dayjs from 'dayjs';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

const PayDepositPage = () => {
  useDocumentTitle('Pay Deposit');
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [depositInstallment, setDepositInstallment] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [contractId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load contract and wallet in parallel for better performance
      const [contractResponse, walletResponse] = await Promise.allSettled([
        getContractById(contractId),
        getOrCreateMyWallet().catch(error => {
          console.warn('Failed to load wallet:', error);
          return null;
        })
      ]);

      // Process contract response
      if (contractResponse.status === 'fulfilled' && 
          contractResponse.value?.status === 'success' && 
          contractResponse.value?.data) {
        const contractData = contractResponse.value.data;
        setContract(contractData);

        // Tìm DEPOSIT installment
        // Validation: Contract phải ở trạng thái signed để thanh toán deposit
        const contractStatus = contractData.status?.toLowerCase();
        const isCanceled =
          contractStatus === 'canceled_by_customer' ||
          contractStatus === 'canceled_by_manager';
        const isExpired = contractStatus === 'expired';
        const isValidStatus = contractStatus === 'signed';

        if (isCanceled || isExpired || !isValidStatus) {
          toast.error(isCanceled
              ? 'Contract has been canceled. Payment is not allowed.'
              : isExpired
                ? 'Contract has expired. Payment is not allowed.'
                : 'Contract must be signed before deposit payment.', { duration: 5000, position: 'top-center' });
          navigate(`/contracts/${contractId}`);
          return;
        }

        const deposit = contractData.installments?.find(
          inst => inst.type === 'DEPOSIT'
        );

        if (!deposit) {
          toast.error('Deposit installment not found for this contract', { duration: 5000, position: 'top-center' });
          navigate(`/contracts/${contractId}`);
          return;
        }

        setDepositInstallment(deposit);
      } else {
        throw new Error('Failed to load contract');
      }

      // Process wallet response
      if (walletResponse.status === 'fulfilled' && 
          walletResponse.value?.status === 'success' && 
          walletResponse.value?.data) {
        setWallet(walletResponse.value.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load payment information', { duration: 5000, position: 'top-center' });
      navigate(`/contracts/${contractId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePayWithWallet = async () => {
    // Ngăn chặn double-click - check ngay từ đầu
    if (paying) {
      return;
    }

    if (!wallet || !depositInstallment) {
      toast.error('Wallet or deposit information not available', { duration: 5000, position: 'top-center' });
      return;
    }

    const depositAmount = parseFloat(depositInstallment.amount);
    const availableBalance =
      wallet?.availableBalance ??
      (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
    const walletBalance = parseFloat(availableBalance);

    if (walletBalance < depositAmount) {
      message.warning(
        'Insufficient available balance. Please top up your wallet first.'
      );
      setTopupModalVisible(true);
      return;
    }

    try {
      setPaying(true);

      // Call pay deposit API
      const response = await payDeposit(wallet.walletId, {
        amount: depositAmount,
        currency: depositInstallment.currency || contract?.currency || 'VND',
        contractId: contractId,
        installmentId: depositInstallment.installmentId,
      });

      if (response?.status === 'success') {
        message.success('Deposit payment successful!');
        // Redirect to contract detail
        navigate(`/contracts/${contractId}`, {
          state: { paymentSuccess: true },
        });
      }
    } catch (error) {
      console.error('Error paying deposit:', error);
      toast.error(error?.message || 'Failed to process payment', { duration: 5000, position: 'top-center' });
    } finally {
      setPaying(false);
    }
  };

  const handleTopup = async values => {
    try {
      setTopupModalVisible(false);
      topupForm.resetFields();
      await loadData();
      message.info('Please complete top-up in your wallet page');
      navigate('/wallet');
    } catch (error) {
      toast.error('Failed to process top-up', { duration: 5000, position: 'top-center' });
    }
  };

  const handlePay = () => {
    if (paymentMethod === 'wallet') {
      handlePayWithWallet();
    } else {
      message.info('Banking payment method coming soon');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!contract || !depositInstallment) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Deposit payment information not available"
            description="The deposit for this contract is not available or has already been paid."
            type="error"
            action={
              <Button onClick={() => navigate(`/contracts/${contractId}`)}>
                Back to Contract
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const depositAmount = parseFloat(depositInstallment.amount);
  const availableBalance =
    wallet?.availableBalance ??
    (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
  const walletBalance = parseFloat(availableBalance);
  const hasEnoughBalance = walletBalance >= depositAmount;
  const isDepositPaid = depositInstallment.status === 'PAID';
  const isDepositDue = depositInstallment.status === 'DUE';

  // Nếu đã thanh toán, redirect về contract detail
  if (isDepositPaid) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Deposit Already Paid"
            description="This deposit has already been paid. Redirecting to contract details..."
            type="success"
            action={
              <Button onClick={() => navigate(`/contracts/${contractId}`)}>
                Back to Contract
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Nếu chưa đến hạn thanh toán
  if (!isDepositDue && depositInstallment.status === 'PENDING') {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Deposit Not Yet Due"
            description="The deposit payment is not yet due. Please wait for the contract to be signed first."
            type="info"
            action={
              <Button onClick={() => navigate(`/contracts/${contractId}`)}>
                Back to Contract
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/contracts/${contractId}`)}
          style={{ marginBottom: 24 }}
        >
          Back to Contract
        </Button>

        <Card className={styles.paymentCard}>
          <Title level={3}>Pay Deposit</Title>
          <Text type="secondary">
            Complete your deposit payment to activate the contract and start the
            work.
          </Text>

          <Divider />

          {/* Payment Details */}
          <Descriptions column={1} bordered className={styles.descriptions}>
            <Descriptions.Item label="Contract Number">
              {contract.contractNumber || contract.contractId}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Type">
              <Text strong>Deposit Payment</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Initial deposit payment required to activate the contract
                </Text>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                {formatCurrency(
                  depositAmount,
                  depositInstallment?.currency || contract?.currency || 'VND'
                )}
              </Text>
              {depositInstallment?.percent && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({depositInstallment.percent}%)
                </Text>
              )}
            </Descriptions.Item>
            {depositInstallment?.dueDate && (
              <Descriptions.Item label="Due Date">
                {dayjs(depositInstallment.dueDate).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Wallet Balance Info */}
          {wallet && (
            <Alert
              message={
                <Space>
                  <WalletOutlined />
                  <span>
                    Wallet Balance:{' '}
                    {formatCurrency(walletBalance, wallet.currency)}
                  </span>
                  {!hasEnoughBalance && (
                    <Text type="danger">
                      (Insufficient balance. Need{' '}
                      {formatCurrency(
                        depositAmount - walletBalance,
                        wallet.currency
                      )}{' '}
                      more)
                    </Text>
                  )}
                </Space>
              }
              type={hasEnoughBalance ? 'success' : 'warning'}
              style={{ marginTop: 24 }}
              action={
                !hasEnoughBalance && (
                  <Button
                    size="small"
                    onClick={() => setTopupModalVisible(true)}
                  >
                    Top Up
                  </Button>
                )
              }
            />
          )}

          {/* Payment Method Selection */}
          <div className={styles.paymentMethodSection}>
            <Title level={4}>Payment Method</Title>
            <Radio.Group
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className={styles.paymentMethodGroup}
            >
              <Radio.Button
                value="wallet"
                className={styles.paymentMethodOption}
              >
                <WalletOutlined /> Wallet
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* Pay Button */}
          <div className={styles.payButtonSection}>
            <Button
              type="primary"
              size="large"
              icon={<DollarOutlined />}
              onClick={handlePay}
              loading={paying}
              disabled={paymentMethod === 'wallet' && !hasEnoughBalance}
              block
              className={styles.payButton}
            >
              {paymentMethod === 'wallet' && !hasEnoughBalance
                ? 'Insufficient Balance - Top Up Required'
                : `Pay Deposit ${formatCurrency(depositAmount, contract?.currency || 'VND')}`}
            </Button>
          </div>
        </Card>

        {/* Top-up Modal */}
        <Modal
          title="Top Up Wallet"
          open={topupModalVisible}
          onCancel={() => {
            setTopupModalVisible(false);
            topupForm.resetFields();
          }}
          onOk={() => topupForm.submit()}
          okText="Go to Wallet"
          cancelText="Cancel"
        >
          <Form form={topupForm} layout="vertical" onFinish={handleTopup}>
            <Alert
              message="Top Up Required"
              description={`You need to top up at least ${formatCurrency(depositAmount - walletBalance, wallet?.currency || 'VND')} to complete this payment.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Text>
              You will be redirected to the wallet page to complete the top-up.
            </Text>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default PayDepositPage;
