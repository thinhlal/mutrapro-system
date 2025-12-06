import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Alert,
  Spin,
  message,
  Statistic,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  WalletOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { createPaymentOrder, getPaymentOrder, getPaymentOrderQR } from '../../../services/paymentService';
import { getOrCreateMyWallet } from '../../../services/walletService';
import notificationWebSocketService from '../../../services/notificationWebSocketService';
import { getItem } from '../../../services/localStorageService';
import Header from '../../../components/common/Header/Header';
import styles from './TopupPaymentPage.module.css';
import dayjs from 'dayjs';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

const TopupPaymentPage = () => {
  useDocumentTitle('Top-up Wallet');
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const amount = searchParams.get('amount');
  const description = searchParams.get('description') || 'Nạp tiền vào ví';
  
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const wsSubscriptionRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (orderId) {
      loadPaymentOrder();
    } else if (amount) {
      createNewOrder();
    } else {
      message.error('Thiếu thông tin đơn hàng');
      navigate('/wallet');
    }

    // Setup WebSocket listener
    setupWebSocketListener();

    // Cleanup
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (wsSubscriptionRef.current) {
        notificationWebSocketService.unsubscribeFromNotifications();
      }
    };
  }, [orderId, amount]);

  // Countdown timer
  useEffect(() => {
    if (!paymentOrder?.expiresAt) return;

    const updateTimer = () => {
      const now = dayjs();
      const expires = dayjs(paymentOrder.expiresAt);
      const diff = expires.diff(now, 'second');

      if (diff <= 0) {
        setTimeRemaining(null);
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        message.warning('Đơn hàng đã hết hạn');
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [paymentOrder?.expiresAt]);

  const createNewOrder = async () => {
    try {
      setCreating(true);
      
      // Load wallet first
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === 'success' && walletResponse?.data) {
        setWallet(walletResponse.data);
      }

      // Create payment order
      const orderResponse = await createPaymentOrder({
        amount: parseFloat(amount),
        currency: 'VND',
        description: description,
      });

      if (orderResponse?.status === 'success' && orderResponse?.data) {
        const newOrder = orderResponse.data;
        setPaymentOrder(newOrder);
        
        // Sử dụng qrCodeUrl trực tiếp từ response
        if (newOrder.qrCodeUrl) {
          setQrCodeUrl(newOrder.qrCodeUrl);
        } else {
          // Fallback: Load QR code nếu không có trong response
          await loadQRCode(newOrder.paymentOrderId);
        }
        
        // Start polling
        startPolling(newOrder.paymentOrderId);
        
        // Update URL without reload
        window.history.replaceState({}, '', `/payments/topup/${newOrder.paymentOrderId}`);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi tạo đơn hàng thanh toán');
      navigate('/wallet');
    } finally {
      setCreating(false);
    }
  };
  console.log(qrCodeUrl);
  
  const loadPaymentOrder = async () => {
    try {
      setLoading(true);
      
      // Load wallet
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === 'success' && walletResponse?.data) {
        setWallet(walletResponse.data);
      }

      // Load payment order
      const orderResponse = await getPaymentOrder(orderId);
      if (orderResponse?.status === 'success' && orderResponse?.data) {
        const order = orderResponse.data;
        setPaymentOrder(order);
        console.log(order);
        
        // Sử dụng qrCodeUrl trực tiếp từ response
        if (order.qrCodeUrl) {
          setQrCodeUrl(order.qrCodeUrl);
        } else {
          // Fallback: Load QR code nếu không có trong response
          await loadQRCode(order.paymentOrderId);
        }
        
        // If order is still pending, start polling
        if (order.status === 'PENDING') {
          startPolling(order.paymentOrderId);
        } else if (order.status === 'COMPLETED') {
          // Already completed, redirect to success page
          navigateToSuccess(order.paymentOrderId);
        }
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải thông tin đơn hàng');
      navigate('/wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadQRCode = async (orderId) => {
    try {
      const qrResponse = await getPaymentOrderQR(orderId);
      if (qrResponse?.status === 'success' && qrResponse?.data?.qr_code_url) {
        setQrCodeUrl(qrResponse.data.qr_code_url);
      }
    } catch (error) {
      console.error('Failed to load QR code:', error);
    }
  };

  const startPolling = (orderId) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const orderResponse = await getPaymentOrder(orderId);
        if (orderResponse?.status === 'success' && orderResponse?.data) {
          const order = orderResponse.data;
          setPaymentOrder(order);
          
          if (order.status === 'COMPLETED') {
            clearInterval(interval);
            navigateToSuccess(orderId);
          } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
            clearInterval(interval);
            message.warning('Đơn hàng đã hết hạn hoặc bị hủy');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const setupWebSocketListener = () => {
    const token = getItem('accessToken');
    if (!token) {
      console.warn('No token for WebSocket');
      return;
    }

    // Connect if not connected
    if (!notificationWebSocketService.isConnected()) {
      notificationWebSocketService.connect(token).then(() => {
        subscribeToPaymentNotifications();
      }).catch(error => {
        console.error('WebSocket connection failed:', error);
      });
    } else {
      subscribeToPaymentNotifications();
    }
  };

  const subscribeToPaymentNotifications = () => {
    // Subscribe to notifications
    const subscription = notificationWebSocketService.subscribeToNotifications((notification) => {
      // Check if this is a payment-related notification
      if (notification?.referenceType === 'PAYMENT' || 
          notification?.type === 'PAYMENT_ORDER_COMPLETED' ||
          notification?.title?.toLowerCase().includes('thanh toán') ||
          notification?.title?.toLowerCase().includes('nạp tiền')) {
        
        // Check if it's for our payment order
        const currentOrderId = paymentOrder?.paymentOrderId || orderId;
        if (currentOrderId && (
          notification?.referenceId === currentOrderId ||
          notification?.content?.includes(currentOrderId)
        )) {
          // Payment completed - navigate to success page immediately
          console.log('Payment completed notification received via WebSocket:', notification);
          navigateToSuccess(currentOrderId);
        }
      }
    });

    wsSubscriptionRef.current = subscription;
  };

  const navigateToSuccess = (orderId) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    navigate(`/payments/success/${orderId}`);
  };

  const handleRefresh = () => {
    if (paymentOrder) {
      loadPaymentOrder();
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (creating || (loading && !paymentOrder)) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <Text style={{ marginTop: 16, display: 'block' }}>
            {creating ? 'Đang tạo đơn hàng...' : 'Đang tải thông tin...'}
          </Text>
        </div>
      </div>
    );
  }

  if (!paymentOrder) {
    return null;
  }

  const isPending = paymentOrder.status === 'PENDING';
  const isCompleted = paymentOrder.status === 'COMPLETED';
  const isExpired = paymentOrder.status === 'EXPIRED';

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/wallet')}
          style={{ marginBottom: 24 }}
        >
          Quay lại
        </Button>

        <Card className={styles.paymentCard}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header */}
            <div className={styles.header}>
              <Title level={2} className={styles.title}>
                <WalletOutlined /> Thanh toán nạp tiền
              </Title>
              {isPending && (
                <Text type="secondary">
                  Quét mã QR bằng app ngân hàng để thanh toán
                </Text>
              )}
            </div>

            {/* Status Alert */}
            {isPending && (
              <Alert
                message="Đang chờ thanh toán"
                description={
                  <Space>
                    <ClockCircleOutlined />
                    <span>Vui lòng quét mã QR và hoàn tất thanh toán trong app ngân hàng</span>
                  </Space>
                }
                type="info"
                showIcon
                icon={<ClockCircleOutlined />}
              />
            )}

            {isCompleted && (
              <Alert
                message="Thanh toán thành công"
                description="Đơn hàng đã được thanh toán thành công"
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}

            {isExpired && (
              <Alert
                message="Đơn hàng đã hết hạn"
                description="Vui lòng tạo đơn hàng mới để tiếp tục thanh toán"
                type="warning"
                showIcon
              />
            )}

            {/* Payment Info */}
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Số tiền">
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  {formatCurrency(paymentOrder.amount, paymentOrder.currency)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                <Text code>{paymentOrder.paymentOrderId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {paymentOrder.description || 'Nạp tiền vào ví'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Space>
                  {isPending && <ClockCircleOutlined style={{ color: '#faad14' }} />}
                  {isCompleted && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  <Text strong={isPending}>
                    {paymentOrder.status === 'PENDING' && 'Đang chờ thanh toán'}
                    {paymentOrder.status === 'COMPLETED' && 'Đã thanh toán'}
                    {paymentOrder.status === 'EXPIRED' && 'Đã hết hạn'}
                    {paymentOrder.status === 'CANCELLED' && 'Đã hủy'}
                  </Text>
                </Space>
              </Descriptions.Item>
              {isPending && paymentOrder.expiresAt && (
                <Descriptions.Item label="Thời gian còn lại">
                  <Text type="danger" strong>
                    {timeRemaining || 'Đã hết hạn'}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* QR Code */}
            {isPending && qrCodeUrl && (
              <>
                <Divider>
                  <QrcodeOutlined /> Quét mã QR để thanh toán
                </Divider>
                <div className={styles.qrContainer}>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code thanh toán"
                    style={{
                      width: 280,
                      height: 280,
                      border: '1px solid #e8e8e8',
                      borderRadius: 8,
                      padding: 16,
                      background: '#fff',
                    }}
                    onError={(e) => {
                      console.error('Failed to load QR code image:', qrCodeUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                  <Text type="secondary" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
                    Mở app ngân hàng và quét mã QR này
                  </Text>
                </div>
              </>
            )}

            {/* Actions */}
            <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
              {isPending && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  size="large"
                >
                  Làm mới trạng thái
                </Button>
              )}
              {isCompleted && (
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/wallet')}
                >
                  Xem ví của tôi
                </Button>
              )}
              {isExpired && (
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/wallet')}
                >
                  Tạo đơn hàng mới
                </Button>
              )}
            </Space>

            {/* Instructions */}
            {isPending && (
              <Card size="small" className={styles.instructionsCard}>
                <Title level={5}>Hướng dẫn thanh toán:</Title>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Mở app ngân hàng trên điện thoại</li>
                  <li>Chọn tính năng quét QR code</li>
                  <li>Quét mã QR ở trên</li>
                  <li>Kiểm tra thông tin và xác nhận thanh toán</li>
                  <li>Hệ thống sẽ tự động cập nhật sau khi nhận được thanh toán</li>
                </ol>
              </Card>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default TopupPaymentPage;

