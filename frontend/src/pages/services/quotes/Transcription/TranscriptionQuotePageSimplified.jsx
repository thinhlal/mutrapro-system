// TranscriptionQuotePageSimplified - Hiển thị báo giá và submit cuối cùng
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Empty,
  message,
  Card,
  Space,
  Tag,
  Spin,
  Alert,
  Descriptions,
  Divider,
} from 'antd';
import { 
  EyeOutlined, 
  DollarOutlined, 
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import { calculatePrice, formatPrice } from '../../../../services/pricingMatrixService';
import { createServiceRequest } from '../../../../services/serviceRequestService';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import styles from './TranscriptionQuotePage.module.css';

const { Title, Text } = Typography;

export default function TranscriptionQuotePageSimplified() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // Data từ previous pages
  const formData = navState.formData || {};
  const uploadedFile = navState.uploadedFile;
  const fileName = navState.fileName || 'Untitled';
  const serviceType = navState.serviceType || 'transcription';
  const blobUrl = navState.blobUrl;

  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { instruments: instrumentsData } = useInstrumentStore();

  // Validate
  if (!formData || !formData.title || !formData.durationMinutes) {
    return (
      <div className={styles.wrap}>
        <Header />
        <Empty description="Missing data. Please go back and complete the form." />
        <Button type="primary" onClick={() => navigate('/detail-service')}>
          Go Back
        </Button>
        <Footer />
      </div>
    );
  }

  // Fetch price calculation
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        const response = await calculatePrice(serviceType, formData.durationMinutes);
        if (response.status === 'success' && response.data) {
          setPriceData(response.data);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
        message.error('Không thể tính toán giá. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [serviceType, formData.durationMinutes]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const requestData = {
        requestType: serviceType,
        title: formData.title,
        description: formData.description,
        tempoPercentage: formData.tempoPercentage || 100,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        instrumentIds: formData.instrumentIds || [],
        durationMinutes: formData.durationMinutes,
        hasVocalist: formData.hasVocalist || false,
        externalGuestCount: formData.externalGuestCount || 0,
        musicOptions: formData.musicOptions || null,
        files: uploadedFile ? [uploadedFile] : [],
      };

      const response = await createServiceRequest(requestData);

      if (response?.status === 'success') {
        message.success('Service request created successfully!');
        navigate('/');
      } else {
        throw new Error(response?.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      message.error(error?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.wrap}>
        <Title level={2}>Review Your Quote</Title>

        {/* Service Info */}
        <Card title="Service Details" style={{ marginBottom: 24 }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Service Type">
              <Tag color="blue">{serviceType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Title">{formData.title}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {formData.description}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              <Tag color="green">{formData.durationMinutes} minutes</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="File">{fileName}</Descriptions.Item>
            {formData.instrumentIds && formData.instrumentIds.length > 0 && (
              <Descriptions.Item label="Instruments">
                <Space wrap>
                  {formData.instrumentIds.map(id => {
                    const inst = instrumentsData.find(i => i.instrumentId === id);
                    return inst ? (
                      <Tag key={id} color="purple">
                        {inst.instrumentName}
                      </Tag>
                    ) : null;
                  })}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Audio Preview */}
          {blobUrl && (
            <div style={{ marginTop: 16 }}>
              <Text strong>Preview:</Text>
              <audio
                controls
                src={blobUrl}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
          )}
        </Card>

        {/* Price Calculation */}
        <Card 
          title={
            <span>
              <DollarOutlined /> Price Calculation
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Calculating price..." />
            </div>
          ) : priceData ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Alert
                message="Estimated Total"
                description={
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {formatPrice(priceData.totalPrice, priceData.currency)}
                  </div>
                }
                type="success"
                showIcon
                icon={<DollarOutlined />}
              />

              <Divider style={{ margin: '12px 0' }} />

              <div>
                <Text type="secondary">Breakdown:</Text>
                <div style={{ marginTop: 8 }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Base Rate">
                      {formatPrice(priceData.basePrice, priceData.currency)} / minute
                    </Descriptions.Item>
                    <Descriptions.Item label="Duration">
                      {formData.durationMinutes} minutes
                    </Descriptions.Item>
                    <Descriptions.Item label="Subtotal">
                      {formatPrice(priceData.totalPrice, priceData.currency)}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>

              {priceData.notes && (
                <Alert
                  message="Note"
                  description={priceData.notes}
                  type="info"
                  showIcon
                />
              )}
            </Space>
          ) : (
            <Empty description="Unable to calculate price" />
          )}
        </Card>

        {/* Contact Info */}
        <Card title="Contact Information" style={{ marginBottom: 24 }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Name">{formData.contactName}</Descriptions.Item>
            <Descriptions.Item label="Email">{formData.contactEmail}</Descriptions.Item>
            <Descriptions.Item label="Phone">{formData.contactPhone}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Actions */}
        <div style={{ textAlign: 'right' }}>
          <Space size={16}>
            <Button size="large" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={loading || !priceData}
            >
              Confirm & Submit Request <ArrowRightOutlined />
            </Button>
          </Space>
        </div>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}
