import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Result,
  Spin,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  WalletOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { getPaymentOrder } from '../../../services/paymentService';
import { getOrCreateMyWallet } from '../../../services/walletService';
import Header from '../../../components/common/Header/Header';
import styles from './PaymentSuccessPage.module.css';
import dayjs from 'dayjs';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

const PaymentSuccessPage = () => {
  useDocumentTitle('Payment Success');
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [paymentOrder, setPaymentOrder] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load payment order
      const orderResponse = await getPaymentOrder(orderId);
      if (orderResponse?.status === 'success' && orderResponse?.data) {
        setPaymentOrder(orderResponse.data);
      }

      // Load wallet
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === 'success' && walletResponse?.data) {
        setWallet(walletResponse.data);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải thông tin');
      navigate('/wallet');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <Text style={{ marginTop: 16, display: 'block' }}>
            Đang tải thông tin...
          </Text>
        </div>
      </div>
    );
  }

  if (!paymentOrder) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <Card className={styles.successCard}>
          <Result
            status="success"
            icon={
              <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
            }
            title="Thanh toán thành công!"
            subTitle={
              <Space direction="vertical" size="small">
                <Text>Đơn hàng của bạn đã được thanh toán thành công.</Text>
                <Text type="secondary">
                  Số tiền đã được cộng vào ví của bạn.
                </Text>
              </Space>
            }
            extra={[
              <Button
                key="wallet"
                type="primary"
                size="large"
                icon={<WalletOutlined />}
                onClick={() => {
                  // Refresh wallet balance before navigating
                  navigate('/wallet', { state: { refresh: true } });
                }}
              >
                Xem ví của tôi
              </Button>,
              <Button
                key="home"
                size="large"
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
              >
                Về trang chủ
              </Button>,
            ]}
          />

          <div className={styles.detailsSection}>
            <Title level={4}>Chi tiết giao dịch</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Mã đơn hàng">
                <Text code>{paymentOrder.paymentOrderId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                  {formatCurrency(paymentOrder.amount, paymentOrder.currency)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {paymentOrder.description || 'Nạp tiền vào ví'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong>Đã thanh toán</Text>
                </Space>
              </Descriptions.Item>
              {paymentOrder.completedAt && (
                <Descriptions.Item label="Thời gian hoàn thành">
                  {dayjs(paymentOrder.completedAt).format(
                    'DD/MM/YYYY HH:mm:ss'
                  )}
                </Descriptions.Item>
              )}
              {wallet && (
                <Descriptions.Item label="Số dư khả dụng">
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    {formatCurrency(
                      wallet?.availableBalance ?? (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0),
                      wallet.currency
                    )}
                  </Text>
                  {wallet?.holdBalance > 0 && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                      <Text type="secondary">
                        Tổng: {formatCurrency(wallet.balance, wallet.currency)} | 
                        Đang giữ: {formatCurrency(wallet.holdBalance, wallet.currency)}
                      </Text>
                    </div>
                  )}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
