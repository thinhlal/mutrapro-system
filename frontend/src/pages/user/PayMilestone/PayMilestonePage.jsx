import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  InputNumber,
  Divider,
} from 'antd';
import toast from 'react-hot-toast';
import {
  DollarOutlined,
  WalletOutlined,
  CreditCardOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import {
  getContractById,
  getMilestonePaymentQuote,
} from '../../../services/contractService';
import {
  getOrCreateMyWallet,
  payMilestone,
} from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import styles from './PayMilestonePage.module.css';
import dayjs from 'dayjs';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

/**
 * Format số giờ thành ngày và giờ (ví dụ: 141h -> "5 ngày 21 giờ" hoặc "6 ngày")
 */
const formatLateHours = hours => {
  if (hours == null || hours <= 0) return '';
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days === 0) {
    return `${hours} hours`;
  } else if (remainingHours === 0) {
    return `${days} days`;
  } else {
    return `${days} days ${remainingHours} hours`;
  }
};

const PayMilestonePage = () => {
  useDocumentTitle('Pay Milestone');
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [contract, setContract] = useState(null);
  const [targetMilestone, setTargetMilestone] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [topupForm] = Form.useForm();

  // Get milestoneId or orderIndex from location state or URL params
  const milestoneId = location.state?.milestoneId;
  const orderIndex = location.state?.orderIndex;
  const installmentId = location.state?.installmentId;

  useEffect(() => {
    loadData();
  }, [contractId, milestoneId, orderIndex, installmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setPaymentQuote(null);

      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === 'success' && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);

        // Validation: Contract phải ở trạng thái signed hoặc active để thanh toán
        const contractStatus = contractData.status?.toLowerCase();
        const isCanceled =
          contractStatus === 'canceled_by_customer' ||
          contractStatus === 'canceled_by_manager';
        const isExpired = contractStatus === 'expired';
        const isValidStatus =
          contractStatus === 'signed' ||
          contractStatus === 'active' ||
          contractStatus === 'active_pending_assignment';

        if (isCanceled || isExpired || !isValidStatus) {
          toast.error(isCanceled
              ? 'Contract has been canceled. Payment is not allowed.'
              : isExpired
                ? 'Contract has expired. Payment is not allowed.'
                : 'Contract is not in a valid status for payment.', { duration: 5000, position: 'top-center' });
          navigate(`/contracts/${contractId}`);
          return;
        }

        // Kiểm tra DEPOSIT status - nếu chưa thanh toán, redirect về pay-deposit
        const depositInstallment = contractData.installments?.find(
          inst => inst.type === 'DEPOSIT'
        );
        const isDepositPaid = depositInstallment?.status === 'PAID';

        if (!isDepositPaid) {
          message.warning('Please pay the deposit first');
          navigate(`/contracts/${contractId}/pay-deposit`);
          return;
        }

        // Tìm milestone và installment cần thanh toán (chỉ milestone installments, không phải DEPOSIT)
        if (contractData.milestones && contractData.milestones.length > 0) {
          let foundMilestone = null;
          let foundInstallment = null;

          // Nếu có installmentId từ state, tìm theo installmentId
          if (installmentId) {
            foundInstallment = contractData.installments?.find(
              inst =>
                inst.installmentId === installmentId && inst.type !== 'DEPOSIT'
            );
            if (foundInstallment && foundInstallment.milestoneId) {
              foundMilestone = contractData.milestones.find(
                m => m.milestoneId === foundInstallment.milestoneId
              );
            }
          }
          // Nếu có milestoneId từ state, tìm theo milestoneId
          else if (milestoneId) {
            foundMilestone = contractData.milestones.find(
              m => m.milestoneId === milestoneId && m.hasPayment
            );
            if (foundMilestone) {
              foundInstallment = contractData.installments?.find(
                inst =>
                  inst.milestoneId === milestoneId && inst.type !== 'DEPOSIT'
              );
            }
          }
          // Nếu có orderIndex từ state, tìm theo orderIndex
          else if (orderIndex) {
            foundMilestone = contractData.milestones.find(
              m => m.orderIndex === orderIndex && m.hasPayment
            );
            if (foundMilestone) {
              foundInstallment = contractData.installments?.find(
                inst =>
                  inst.milestoneId === foundMilestone.milestoneId &&
                  inst.type !== 'DEPOSIT'
              );
            }
          }
          // Nếu không có, tìm milestone installment có status DUE hoặc PENDING
          else {
            foundInstallment =
              contractData.installments?.find(
                inst => inst.status === 'DUE' && inst.type !== 'DEPOSIT'
              ) ||
              contractData.installments?.find(
                inst => inst.status === 'PENDING' && inst.type !== 'DEPOSIT'
              );

            if (foundInstallment && foundInstallment.milestoneId) {
              foundMilestone = contractData.milestones.find(
                m => m.milestoneId === foundInstallment.milestoneId
              );
            }
          }

          if (foundMilestone && foundInstallment) {
            const nextTarget = {
              ...foundMilestone,
              installment: foundInstallment,
            };
            setTargetMilestone(nextTarget);

            // Load payment quote (late discount breakdown) from backend
            if (nextTarget?.milestoneId) {
              try {
                setQuoteLoading(true);
                const quoteResp = await getMilestonePaymentQuote(
                  contractId,
                  nextTarget.milestoneId
                );
                if (quoteResp?.status === 'success' && quoteResp?.data) {
                  setPaymentQuote(quoteResp.data);
                }
              } catch (e) {
                console.warn('Failed to load payment quote:', e);
                setPaymentQuote(null);
              } finally {
                setQuoteLoading(false);
              }
            }
          } else {
            message.warning('No milestone payment available');
            navigate(`/contracts/${contractId}`);
          }
        }
      }

      // Load wallet
      try {
        const walletResponse = await getOrCreateMyWallet();
        if (walletResponse?.status === 'success' && walletResponse?.data) {
          setWallet(walletResponse.data);
        }
      } catch (error) {
        console.warn('Failed to load wallet:', error);
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

    if (!wallet || !targetMilestone || !targetMilestone.installment) {
      toast.error('Wallet or installment information not available', { duration: 5000, position: 'top-center' });
      return;
    }

    const installment = targetMilestone.installment;
    const baseAmount = parseFloat(installment.amount);
    if (quoteLoading) {
      message.info(
        'Đang tải thông tin thanh toán, vui lòng thử lại sau vài giây.'
      );
      return;
    }
    if (!paymentQuote?.payableAmount) {
      toast.error('Không lấy được số tiền cần thanh toán. Vui lòng tải lại trang.', { duration: 5000, position: 'top-center' });
      return;
    }
    const payableAmount = parseFloat(paymentQuote.payableAmount);
    const availableBalance =
      wallet?.availableBalance ??
      (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
    const walletBalance = parseFloat(availableBalance);

    if (walletBalance < payableAmount) {
      message.warning(
        'Insufficient available balance. Please top up your wallet first.'
      );
      setTopupModalVisible(true);
      return;
    }

    try {
      setPaying(true);

      // Call pay milestone API
      const response = await payMilestone(wallet.walletId, {
        currency: installment.currency || contract?.currency || 'VND',
        contractId: contractId,
        milestoneId: targetMilestone.milestoneId,
        installmentId: installment.installmentId,
        orderIndex: targetMilestone.orderIndex,
      });

      if (response?.status === 'success') {
        message.success(
          `Milestone "${targetMilestone.name}" payment successful!`
        );
        // Redirect to contract detail or success page
        navigate(`/contracts/${contractId}`, {
          state: { paymentSuccess: true },
        });
      }
    } catch (error) {
      console.error('Error paying milestone:', error);
      toast.error(error?.message || 'Failed to process payment', { duration: 5000, position: 'top-center' });
    } finally {
      setPaying(false);
    }
  };

  const handleTopup = async values => {
    try {
      // This will be handled by wallet service
      // For now, just close modal and reload wallet
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

  if (!contract || !targetMilestone) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Payment information not available"
            description="The milestone for this contract is not available or has already been paid."
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

  const installment = targetMilestone?.installment;
  const milestoneAmount = installment ? parseFloat(installment.amount) : 0;
  const payableAmount =
    paymentQuote?.payableAmount != null
      ? parseFloat(paymentQuote.payableAmount)
      : milestoneAmount;
  const availableBalance =
    wallet?.availableBalance ??
    (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
  const walletBalance = parseFloat(availableBalance);
  const hasEnoughBalance = walletBalance >= payableAmount;
  const canPayNow = !quoteLoading && paymentQuote?.payableAmount != null;

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
          <Title level={3}>Pay Milestone</Title>
          <Text type="secondary">
            Complete payment for milestone {targetMilestone.orderIndex}:{' '}
            {targetMilestone.name}
          </Text>

          <Divider />

          {/* Payment Details */}
          <Descriptions column={1} bordered className={styles.descriptions}>
            <Descriptions.Item label="Contract Number">
              {contract.contractNumber || contract.contractId}
            </Descriptions.Item>
            <Descriptions.Item label="Milestone">
              <Text strong>
                Milestone {targetMilestone.orderIndex}: {targetMilestone.name}
              </Text>
              {targetMilestone.description && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {targetMilestone.description}
                  </Text>
                </div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                {formatCurrency(
                  payableAmount,
                  installment?.currency || contract?.currency || 'VND'
                )}
              </Text>
              {installment?.percent && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({installment.percent}%)
                </Text>
              )}
            </Descriptions.Item>
            {/* Discount breakdown (if any) */}
            {quoteLoading ? (
              <Descriptions.Item label="Late Discount">
                <Text type="secondary" italic>
                  Loading...
                </Text>
              </Descriptions.Item>
            ) : paymentQuote?.lateDiscountAmount != null &&
              parseFloat(paymentQuote.lateDiscountAmount || 0) > 0 ? (
              <>
                <Descriptions.Item label="Base Amount">
                  {formatCurrency(
                    milestoneAmount,
                    installment?.currency || contract?.currency || 'VND'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Late Discount">
                  <Text type="danger">
                    -
                    {formatCurrency(
                      parseFloat(paymentQuote.lateDiscountAmount),
                      installment?.currency || contract?.currency || 'VND'
                    )}
                    {paymentQuote?.lateDiscountPercent != null
                      ? ` (${paymentQuote.lateDiscountPercent}%)`
                      : ''}
                    {paymentQuote?.lateHours != null &&
                    paymentQuote.lateHours > 0
                      ? ` · late ${formatLateHours(paymentQuote.lateHours)}${paymentQuote?.graceHours != null ? ` (grace ${formatLateHours(paymentQuote.graceHours)})` : ''}`
                      : ''}
                  </Text>
                </Descriptions.Item>
              </>
            ) : null}
            {installment?.dueDate && (
              <Descriptions.Item label="Due Date">
                {dayjs(installment.dueDate).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}
            {installment?.type && (
              <Descriptions.Item label="Type">
                {installment.type === 'INTERMEDIATE'
                  ? 'Intermediate Payment'
                  : installment.type === 'FINAL'
                    ? 'Final Payment'
                    : installment.type === 'EXTRA_REVISION'
                      ? 'Extra Revision Payment'
                      : installment.type}
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
                        payableAmount - walletBalance,
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
              disabled={
                !canPayNow || (paymentMethod === 'wallet' && !hasEnoughBalance)
              }
              block
              className={styles.payButton}
            >
              {paymentMethod === 'wallet' && !hasEnoughBalance
                ? 'Insufficient Balance - Top Up Required'
                : `Pay ${formatCurrency(payableAmount, contract?.currency || 'VND')}`}
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
              description={`You need to top up at least ${formatCurrency(payableAmount - walletBalance, wallet?.currency || 'VND')} to complete this payment.`}
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

export default PayMilestonePage;
