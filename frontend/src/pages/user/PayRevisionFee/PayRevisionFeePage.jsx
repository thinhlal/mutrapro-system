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
  Input,
} from 'antd';
import {
  DollarOutlined,
  WalletOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { getContractById } from '../../../services/contractService';
import {
  getOrCreateMyWallet,
  payRevisionFee,
} from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import styles from './PayRevisionFeePage.module.css';
import dayjs from 'dayjs';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

const PayRevisionFeePage = () => {
  useDocumentTitle('Pay Revision Fee');
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [contract, setContract] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupForm] = Form.useForm();

  // Get data from location state
  const milestoneId = location.state?.milestoneId;
  const submissionId = location.state?.submissionId;
  const taskAssignmentId = location.state?.taskAssignmentId;
  const title = location.state?.title;
  const description = location.state?.description;
  const revisionRound = location.state?.revisionRound;
  const feeAmount = location.state?.feeAmount;

  // State for revision form (if not provided in state)
  const [revisionTitle, setRevisionTitle] = useState(title || '');
  const [revisionDescription, setRevisionDescription] = useState(
    description || ''
  );

  useEffect(() => {
    if (!contractId || !feeAmount || !submissionId || !taskAssignmentId) {
      message.error('Missing required information for revision fee payment');
      navigate(-1);
      return;
    }
    loadData();
  }, [contractId, feeAmount, submissionId, taskAssignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === 'success' && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);

        // Validation: Contract phải ở trạng thái hợp lệ
        const contractStatus = contractData.status?.toLowerCase();
        const isCanceled =
          contractStatus === 'canceled_by_customer' ||
          contractStatus === 'canceled_by_manager';
        const isExpired = contractStatus === 'expired';

        if (isCanceled || isExpired) {
          message.error(
            isCanceled
              ? 'Contract has been canceled. Payment is not allowed.'
              : 'Contract has expired. Payment is not allowed.'
          );
          navigate(`/contracts/${contractId}`);
          return;
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
        message.warning('Failed to load wallet information');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load payment information');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handlePayWithWallet = async () => {
    // Ngăn chặn double-click - check ngay từ đầu
    if (paying) {
      return;
    }

    if (!wallet || !feeAmount) {
      message.error('Wallet or fee amount information not available');
      return;
    }

    const amount = parseFloat(feeAmount);
    const walletBalance = parseFloat(wallet.balance || 0);

    if (walletBalance < amount) {
      message.warning(
        'Insufficient wallet balance. Please top up your wallet first.'
      );
      setTopupModalVisible(true);
      return;
    }

    try {
      setPaying(true);

      // Validate title and description
      const finalTitle = revisionTitle.trim() || title;
      const finalDescription = revisionDescription.trim() || description;

      if (!finalTitle) {
        message.warning('Vui lòng nhập tiêu đề yêu cầu chỉnh sửa');
        return;
      }
      if (!finalDescription) {
        message.warning('Vui lòng nhập mô tả chi tiết yêu cầu chỉnh sửa');
        return;
      }

      // Call pay revision fee API
      const response = await payRevisionFee(wallet.walletId, {
        amount: amount,
        currency: contract?.currency || 'VND',
        contractId: contractId,
        milestoneId: milestoneId,
        taskAssignmentId: taskAssignmentId, // Required for creating revision request
        submissionId: submissionId,
        revisionRound: revisionRound,
        title: finalTitle,
        description: finalDescription,
      });

      if (response?.status === 'success') {
        message.success(
          'Revision fee payment successful! Revision request will be created automatically.'
        );
        // Redirect back to deliveries page
        navigate(
          `/contracts/${contractId}/milestones/${milestoneId}/deliveries`,
          {
            state: { paymentSuccess: true },
          }
        );
      }
    } catch (error) {
      console.error('Error paying revision fee:', error);
      const errorMessage =
        error?.message || error?.data?.message || 'Failed to process payment';
      message.error(errorMessage);
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

  if (!contract || !feeAmount) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Payment information not available"
            description="The revision fee information is not available."
            type="error"
            action={<Button onClick={() => navigate(-1)}>Go Back</Button>}
          />
        </div>
      </div>
    );
  }

  const amount = parseFloat(feeAmount);
  const walletBalance = parseFloat(wallet?.balance || 0);
  const hasEnoughBalance = walletBalance >= amount;

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginBottom: 24 }}
        >
          Go Back
        </Button>

        <Card className={styles.paymentCard}>
          <Title level={3}>Pay Revision Fee</Title>
          <Text type="secondary">Complete payment for revision request</Text>

          <Divider />

          {/* Revision Request Form (if title/description not provided) */}
          {(!title || !description) && (
            <div style={{ marginBottom: 24 }}>
              <Alert
                message="Thông tin yêu cầu chỉnh sửa"
                description="Vui lòng nhập tiêu đề và mô tả chi tiết yêu cầu chỉnh sửa."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ marginBottom: 16 }}>
                <Text strong>Tiêu đề yêu cầu chỉnh sửa:</Text>
                <Input
                  value={revisionTitle}
                  onChange={e => setRevisionTitle(e.target.value)}
                  placeholder="Nhập tiêu đề ngắn gọn (ví dụ: Cần chỉnh sửa tempo, Cần thêm phần intro...)"
                  style={{ marginTop: 8 }}
                  maxLength={255}
                />
              </div>
              <div>
                <Text strong>Mô tả chi tiết:</Text>
                <Input.TextArea
                  value={revisionDescription}
                  onChange={e => setRevisionDescription(e.target.value)}
                  placeholder="Nhập mô tả chi tiết những gì cần chỉnh sửa..."
                  rows={4}
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
          )}

          {/* Payment Details */}
          <Descriptions column={1} bordered className={styles.descriptions}>
            <Descriptions.Item label="Contract Number">
              {contract.contractNumber || contract.contractId}
            </Descriptions.Item>
            {(revisionTitle || title) && (
              <Descriptions.Item label="Revision Title">
                <Text strong>{revisionTitle || title}</Text>
              </Descriptions.Item>
            )}
            {(revisionDescription || description) && (
              <Descriptions.Item label="Revision Description">
                <Text>{revisionDescription || description}</Text>
              </Descriptions.Item>
            )}
            {revisionRound && (
              <Descriptions.Item label="Revision Round">
                <Text>#{revisionRound}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Revision Fee">
              <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                {formatCurrency(amount, contract?.currency || 'VND')}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          {/* Wallet Balance */}
          {wallet && (
            <Alert
              message="Wallet Balance"
              description={
                <Space>
                  <Text>
                    Current balance:{' '}
                    <Text strong>
                      {formatCurrency(walletBalance, wallet.currency || 'VND')}
                    </Text>
                  </Text>
                  {!hasEnoughBalance && (
                    <Text type="danger">
                      (Insufficient balance. Need:{' '}
                      {formatCurrency(amount, contract?.currency || 'VND')})
                    </Text>
                  )}
                </Space>
              }
              type={hasEnoughBalance ? 'info' : 'warning'}
              style={{ marginBottom: 24 }}
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
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              Payment Method
            </Text>
            <Radio.Group
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <Radio value="wallet">
                <Space>
                  <WalletOutlined />
                  <Text>Wallet</Text>
                </Space>
              </Radio>
            </Radio.Group>
          </div>

          {/* Pay Button */}
          <Button
            type="primary"
            size="large"
            block
            loading={paying}
            disabled={!hasEnoughBalance || paymentMethod !== 'wallet'}
            onClick={handlePay}
            icon={<WalletOutlined />}
          >
            {paying
              ? 'Processing Payment...'
              : `Pay ${formatCurrency(amount, contract?.currency || 'VND')}`}
          </Button>

          {!hasEnoughBalance && (
            <Alert
              message="Insufficient Balance"
              description="Please top up your wallet to continue with the payment."
              type="warning"
              style={{ marginTop: 16 }}
              action={
                <Button size="small" onClick={() => setTopupModalVisible(true)}>
                  Top Up Now
                </Button>
              }
            />
          )}
        </Card>

        {/* Top-up Modal */}
        <Modal
          title="Top Up Wallet"
          open={topupModalVisible}
          onCancel={() => {
            setTopupModalVisible(false);
            topupForm.resetFields();
          }}
          footer={null}
        >
          <Form form={topupForm} onFinish={handleTopup} layout="vertical">
            <Form.Item
              label="Top-up Amount (VND)"
              name="amount"
              rules={[
                { required: true, message: 'Please enter top-up amount' },
                {
                  type: 'number',
                  min: 1000,
                  message: 'Minimum top-up amount is 1,000 VND',
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Enter amount"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Go to Wallet Page
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default PayRevisionFeePage;
