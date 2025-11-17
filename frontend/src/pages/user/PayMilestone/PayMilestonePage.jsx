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
import {
  DollarOutlined,
  WalletOutlined,
  CreditCardOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { getContractById } from '../../../services/contractService';
import { getOrCreateMyWallet, debitWallet } from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import styles from './PayMilestonePage.module.css';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PayMilestonePage = () => {
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
  const [topupForm] = Form.useForm();

  // Get milestoneId or orderIndex from location state or URL params
  const milestoneId = location.state?.milestoneId;
  const orderIndex = location.state?.orderIndex;

  useEffect(() => {
    loadData();
  }, [contractId, milestoneId, orderIndex]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === 'success' && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);
        
        // Tìm milestone cần thanh toán
        if (contractData.milestones && contractData.milestones.length > 0) {
          let foundMilestone = null;
          
          // Nếu có milestoneId từ state, tìm theo milestoneId
          if (milestoneId) {
            foundMilestone = contractData.milestones.find(
              m => m.milestoneId === milestoneId
            );
          }
          // Nếu có orderIndex từ state, tìm theo orderIndex
          else if (orderIndex) {
            foundMilestone = contractData.milestones.find(
              m => m.orderIndex === orderIndex
            );
          }
          // Nếu không có, tìm milestone đầu tiên có status DUE (chưa thanh toán)
          else {
            foundMilestone = contractData.milestones.find(
              m => m.paymentStatus === 'DUE'
            ) || contractData.milestones.find(
              m => m.paymentStatus === 'NOT_DUE'
            ) || contractData.milestones[0];
          }
          
          if (foundMilestone) {
            setTargetMilestone(foundMilestone);
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
      message.error('Failed to load payment information');
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
    if (!wallet || !targetMilestone) {
      message.error('Wallet or milestone information not available');
      return;
    }

    const milestoneAmount = parseFloat(targetMilestone.amount);
    const walletBalance = parseFloat(wallet.balance || 0);

    if (walletBalance < milestoneAmount) {
      message.warning('Insufficient wallet balance. Please top up your wallet first.');
      setTopupModalVisible(true);
      return;
    }

    try {
      setPaying(true);
      
      // Call debit wallet API
      const response = await debitWallet(wallet.walletId, {
        amount: milestoneAmount,
        currency: contract?.currency || 'VND',
        milestoneId: targetMilestone.milestoneId,
        orderIndex: targetMilestone.orderIndex,
        contractId: contractId,
      });

      if (response?.status === 'success') {
        message.success(`Milestone "${targetMilestone.name}" payment successful!`);
        // Redirect to contract detail or success page
        navigate(`/contracts/${contractId}`, { 
          state: { paymentSuccess: true } 
        });
      }
    } catch (error) {
      console.error('Error paying milestone:', error);
      message.error(error?.message || 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  const handleTopup = async (values) => {
    try {
      // This will be handled by wallet service
      // For now, just close modal and reload wallet
      setTopupModalVisible(false);
      topupForm.resetFields();
      await loadData();
      message.info('Please complete top-up in your wallet page');
      navigate('/wallet');
    } catch (error) {
      message.error('Failed to process top-up');
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

  const milestoneAmount = parseFloat(targetMilestone.amount);
  const walletBalance = parseFloat(wallet?.balance || 0);
  const hasEnoughBalance = walletBalance >= milestoneAmount;

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
            {targetMilestone.orderIndex === 1 
              ? 'Complete your deposit payment to activate the contract and start the work.'
              : `Complete payment for milestone ${targetMilestone.orderIndex}: ${targetMilestone.name}`}
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
                {formatCurrency(milestoneAmount, contract?.currency || 'VND')}
              </Text>
              {targetMilestone.billingType === 'PERCENTAGE' && targetMilestone.billingValue && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({targetMilestone.billingValue}%)
                </Text>
              )}
            </Descriptions.Item>
            {targetMilestone.plannedDueDate && (
              <Descriptions.Item label="Due Date">
                {dayjs(targetMilestone.plannedDueDate).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Wallet Balance Info */}
          {wallet && (
            <Alert
              message={
                <Space>
                  <WalletOutlined />
                  <span>Wallet Balance: {formatCurrency(walletBalance, wallet.currency)}</span>
                  {!hasEnoughBalance && (
                    <Text type="danger">
                      (Insufficient balance. Need {formatCurrency(milestoneAmount - walletBalance, wallet.currency)} more)
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
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={styles.paymentMethodGroup}
            >
              <Radio.Button value="wallet" className={styles.paymentMethodOption}>
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
                : `Pay ${formatCurrency(milestoneAmount, contract?.currency || 'VND')}`}
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
              description={`You need to top up at least ${formatCurrency(milestoneAmount - walletBalance, wallet?.currency || 'VND')} to complete this payment.`}
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

