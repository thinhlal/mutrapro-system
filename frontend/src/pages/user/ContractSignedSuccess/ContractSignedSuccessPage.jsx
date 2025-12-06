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
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { getContractById } from '../../../services/contractService';
import Header from '../../../components/common/Header/Header';
import styles from './ContractSignedSuccessPage.module.css';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ContractSignedSuccessPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [depositInstallment, setDepositInstallment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [contractId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === 'success' && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);

        // Lấy DEPOSIT installment từ contract.installments
        // DEPOSIT không gắn với milestone nào (milestone_id = NULL)
        if (contractData.installments && contractData.installments.length > 0) {
          const depositInst = contractData.installments.find(
            inst => inst.type === 'DEPOSIT'
          );

          if (depositInst) {
            setDepositInstallment(depositInst);
          }
        }
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      message.error('Failed to load contract information');
      navigate('/my-requests');
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

  const handlePayDeposit = () => {
    navigate(`/contracts/${contractId}/pay-deposit`);
  };

  const handleViewContract = () => {
    navigate(`/contracts/${contractId}`);
  };

  const handleGoToDashboard = () => {
    navigate('/my-requests');
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

  if (!contract) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <Alert
            message="Contract not found"
            description="The contract you are looking for does not exist."
            type="error"
            action={
              <Button onClick={handleGoToDashboard}>Go to Dashboard</Button>
            }
          />
        </div>
      </div>
    );
  }

  const depositAmount = depositInstallment?.amount || 0;
  const depositPercent = contract?.depositPercent || 0;
  const totalPrice = contract?.totalPrice || 0;

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <Card className={styles.successCard}>
          {/* Success Icon & Title */}
          <div className={styles.successHeader}>
            <CheckCircleOutlined className={styles.successIcon} />
            <Title level={2} className={styles.successTitle}>
              Contract Signed Successfully!
            </Title>
            <Text type="secondary" className={styles.successSubtitle}>
              Your contract has been signed and is ready for deposit payment.
            </Text>
          </div>

          <Divider />

          {/* Contract Summary */}
          <div className={styles.summarySection}>
            <Title level={4}>Contract Summary</Title>
            <Descriptions column={1} bordered className={styles.descriptions}>
              <Descriptions.Item label="Contract Number">
                {contract.contractNumber || contract.contractId}
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">
                {contract.contractType || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Price">
                {formatCurrency(totalPrice, contract.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Deposit">
                {depositPercent}% ={' '}
                {formatCurrency(depositAmount, contract.currency)}
              </Descriptions.Item>
              {depositInstallment?.dueDate && (
                <Descriptions.Item label="Deposit Due Date">
                  {dayjs(depositInstallment.dueDate).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* Important Notice */}
          <Alert
            message="Important Notice"
            description={
              <div>
                <p>
                  <strong>To start the work, please pay the deposit.</strong>
                </p>
                <p>
                  The contract will only become active after the deposit payment
                  is completed. The start date will be calculated from the
                  deposit payment date.
                </p>
              </div>
            }
            type="warning"
            showIcon
            className={styles.noticeAlert}
          />

          {/* Payment CTA */}
          <div className={styles.paymentSection}>
            <Card className={styles.paymentCard}>
              <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
              >
                <div className={styles.paymentInfo}>
                  {/* <DollarOutlined className={styles.paymentIcon} /> */}
                  <div>
                    <Text strong className={styles.paymentLabel}>
                      Deposit Payment Required
                    </Text>
                    <div className={styles.paymentAmount}>
                      {formatCurrency(depositAmount, contract.currency)}
                    </div>
                  </div>
                </div>

                <Space size="middle" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={handlePayDeposit}
                    className={styles.payButton}
                    block
                  >
                    Pay Deposit Now
                  </Button>
                  <Button
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={handleViewContract}
                    className={styles.viewButton}
                  >
                    View Contract
                  </Button>
                </Space>

                <Button
                  type="link"
                  onClick={handleGoToDashboard}
                  className={styles.laterButton}
                >
                  Pay Later <ArrowRightOutlined />
                </Button>
              </Space>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ContractSignedSuccessPage;
