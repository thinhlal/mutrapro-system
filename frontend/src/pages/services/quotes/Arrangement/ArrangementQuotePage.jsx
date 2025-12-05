// ArrangementQuotePage - Hiển thị báo giá và submit cuối cùng (giống TranscriptionQuotePageSimplified)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Empty,
  Card,
  Space,
  Tag,
  Spin,
  Alert,
  Descriptions,
  Divider,
  Table,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import {
  formatPrice,
  getPricingDetail,
} from '../../../../services/pricingMatrixService';
import { calculatePricing } from '../../../../services/serviceRequestService';
import { createServiceRequest } from '../../../../services/serviceRequestService';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import { MUSIC_GENRES, MUSIC_PURPOSES, getGenreLabel, getPurposeLabel } from '../../../../constants/musicOptionsConstants';
import styles from './ArrangementQuotePage.module.css';

const { Title, Text } = Typography;

const SERVICE_TYPE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

export default function ArrangementQuotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // Data từ previous pages
  const formData = navState.formData || {};
  const uploadedFile = navState.uploadedFile;
  const fileName = navState.fileName || 'Untitled';
  const serviceType = navState.serviceType || (navState.variant === 'with_recording' ? 'arrangement_with_recording' : 'arrangement');

  const [priceData, setPriceData] = useState(null);
  const [servicePricing, setServicePricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { instruments: instrumentsData } = useInstrumentStore();

  // Validate thiếu data
  if (!formData || !formData.title || !fileName) {
    return (
      <div className={styles.wrap}>
        <Header />
        <Empty description="Missing data. Please go back and complete the form." />
        <Button type="primary" onClick={() => navigate('/services/request-service')}>
          Go Back
        </Button>
        <Footer />
      </div>
    );
  }

  // Fetch price calculation and service pricing detail
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setLoading(true);

        // Fetch calculated price - arrangement mặc định 1 bài
        const priceResponse = await calculatePricing(serviceType, {
          ...(serviceType === 'arrangement_with_recording' && formData.artistFee ? { artistFee: formData.artistFee } : {}),
        });
        if (priceResponse.status === 'success' && priceResponse.data) {
          setPriceData(priceResponse.data);
        }

        // Fetch service pricing detail
        const servicePricingResponse = await getPricingDetail(serviceType);
        if (
          servicePricingResponse.status === 'success' &&
          servicePricingResponse.data
        ) {
          setServicePricing(servicePricingResponse.data);
        }
      } catch (error) {
        console.error('Error fetching pricing data:', error);
        toast.error('Không thể tải thông tin giá. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchPricingData();
  }, [serviceType, formData.artistFee]);

  // Tính tổng giá instruments và combine với priceData
  const finalPriceData = priceData ? (() => {
    // Tính tổng giá của instruments
    const instrumentTotal = (formData.instrumentIds || []).reduce((sum, id) => {
      const inst = instrumentsData.find(i => i.instrumentId === id);
      return sum + (inst?.basePrice || 0);
    }, 0);

    // Cộng vào totalPrice từ API
    const finalTotal = (priceData.totalPrice || 0) + instrumentTotal;

    // Tạo breakdown mới với instruments
    const breakdown = [...(priceData.breakdown || [])];
    if (instrumentTotal > 0) {
      breakdown.push({
        label: 'Instruments',
        amount: instrumentTotal,
        description: `${(formData.instrumentIds || []).length} instrument(s)`,
      });
    }

    return {
      ...priceData,
      totalPrice: finalTotal,
      breakdown: breakdown,
    };
  })() : null;

  const handleSubmit = async () => {
    // 1. Validate trước
    if (!uploadedFile) {
      toast.error('File notation là bắt buộc cho arrangement.');
      return;
    }

    // 2. Chuẩn bị payload gửi lên backend
    const requestData = {
      requestType: serviceType,
      title: formData.title,
      description: formData.description,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      instrumentIds: formData.instrumentIds || [],
      hasVocalist: formData.hasVocalist || false,
      externalGuestCount: formData.externalGuestCount || 0,
      genres: formData.genres || null,
      purpose: formData.purpose || null,
      files: uploadedFile ? [uploadedFile] : [],
    };

    try {
      setSubmitting(true);

      // 3. Gọi API – nếu lỗi, createServiceRequest sẽ throw
      await createServiceRequest(requestData);

      // 4. Thành công → clear sessionStorage + show toast + điều hướng
      sessionStorage.removeItem('serviceRequestFormData');
      sessionStorage.removeItem('serviceRequestType');
      toast.success('Service request created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating request:', error);
      const errorMessage =
        error?.message || error?.data?.message || 'Failed to create request';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.wrap}>
        <Title level={2} style={{ marginBottom: 24 }}>
          Review Your Quote
        </Title>

        {/* 2 cột: bên trái 2 phần, bên phải 2 phần */}
        <div className={styles.row}>
          {/* LEFT COLUMN */}
          <div className={styles.left}>
            {/* Service Info */}
            <Card title="Service Details" style={{ marginBottom: 24 }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Service Type">
                  <Tag color="orange">{SERVICE_TYPE_LABELS[serviceType] || serviceType}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Title">
                  {formData.title}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {formData.description}
                </Descriptions.Item>
                <Descriptions.Item label="File">{fileName}</Descriptions.Item>
                {formData.genres && formData.genres.length > 0 && (
                  <Descriptions.Item label="Music Genres">
                    <Space wrap>
                      {formData.genres.map((genre, idx) => (
                        <Tag key={idx} color="blue">
                          {getGenreLabel(genre) || genre}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
                {formData.purpose && (
                  <Descriptions.Item label="Purpose">
                    <Tag color="purple">{getPurposeLabel(formData.purpose) || formData.purpose}</Tag>
                  </Descriptions.Item>
                )}
                {formData.instrumentIds &&
                  formData.instrumentIds.length > 0 && (
                    <Descriptions.Item label="Instruments">
                      <Space wrap>
                        {formData.instrumentIds.map(id => {
                          const inst = instrumentsData.find(
                            i => i.instrumentId === id
                          );
                          return inst ? (
                            <Tag key={id} color="orange">
                              {inst.instrumentName}
                            </Tag>
                          ) : null;
                        })}
                      </Space>
                    </Descriptions.Item>
                  )}
              </Descriptions>
            </Card>

            {/* Contact Info */}
            <Card title="Contact Information" style={{ marginBottom: 24 }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Name">
                  {formData.contactName}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {formData.contactEmail}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {formData.contactPhone}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.right}>
            {/* Service & Instruments Pricing */}
            <Card
              title="Service & Instruments Pricing"
              style={{ marginBottom: 24 }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin tip="Loading pricing information..." />
                </div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  {/* Service Pricing */}
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: 16,
                        marginBottom: 12,
                        display: 'block',
                      }}
                    >
                      Selected Service:
                    </Text>
                    <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <Text strong style={{ fontSize: 16 }}>
                              {SERVICE_TYPE_LABELS[serviceType] || serviceType}
                            </Text>
                            {servicePricing?.description && (
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                  {servicePricing.description}
                                </Text>
                              </div>
                            )}
                          </div>
                          <Tag
                            color="green"
                            style={{ fontSize: 16, padding: '6px 16px' }}
                          >
                            {servicePricing
                              ? formatPrice(
                                  servicePricing.basePrice,
                                  servicePricing.currency
                                )
                              : 'N/A'}
                            {servicePricing &&
                              ` / ${servicePricing.unitType || 'song'}`}
                          </Tag>
                        </div>
                      </Space>
                    </Card>
                  </div>

                  {/* Instruments Pricing */}
                  {formData.instrumentIds &&
                    formData.instrumentIds.length > 0 && (
                      <div>
                        <Text
                          strong
                          style={{
                            fontSize: 16,
                            marginBottom: 12,
                            display: 'block',
                          }}
                        >
                          Selected Instruments:
                        </Text>
                        <Table
                          dataSource={formData.instrumentIds
                            .map(id => {
                              const inst = instrumentsData.find(
                                i => i.instrumentId === id
                              );
                              return inst
                                ? {
                                    key: id,
                                    instrumentId: id,
                                    instrumentName: inst.instrumentName,
                                    basePrice: inst.basePrice || 0,
                                    usage: inst.usage,
                                  }
                                : null;
                            })
                            .filter(Boolean)}
                          columns={[
                            {
                              title: 'Instrument Name',
                              dataIndex: 'instrumentName',
                              key: 'instrumentName',
                              render: text => (
                                <Space>
                                  <Text strong>{text}</Text>
                                </Space>
                              ),
                            },
                            {
                              title: 'Base Price',
                              dataIndex: 'basePrice',
                              key: 'basePrice',
                              align: 'right',
                              render: price => (
                                <Text
                                  strong
                                  style={{ color: '#52c41a', fontSize: 15 }}
                                >
                                  {formatPrice(
                                    price,
                                    servicePricing?.currency || 'VND'
                                  )}
                                </Text>
                              ),
                            },
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </div>
                    )}
                </Space>
              )}
            </Card>

            {/* Price Calculation */}
            <Card
              title={<span>Price Calculation</span>}
              style={{ marginBottom: 24 }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin tip="Calculating price..." />
                </div>
              ) : finalPriceData ? (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  <Alert
                    message="Estimated Total"
                    description={
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 'bold',
                          color: '#52c41a',
                        }}
                      >
                        {formatPrice(finalPriceData.totalPrice, finalPriceData.currency)}
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
                        {finalPriceData.breakdown && finalPriceData.breakdown.map((item, idx) => (
                          <Descriptions.Item key={idx} label={item.label}>
                            {formatPrice(item.amount, finalPriceData.currency)}
                            {item.description && (
                              <Text type="secondary" style={{ marginLeft: 8 }}>
                                ({item.description})
                              </Text>
                            )}
                          </Descriptions.Item>
                        ))}
                        <Descriptions.Item label="Total">
                          <Text strong>
                            {formatPrice(finalPriceData.totalPrice, finalPriceData.currency)}
                          </Text>
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                  </div>

                  {finalPriceData.notes && (
                    <Alert
                      message="Note"
                      description={finalPriceData.notes}
                      type="info"
                      showIcon
                    />
                  )}
                </Space>
              ) : (
                <Empty description="Unable to calculate price" />
              )}
            </Card>
          </div>
        </div>

        {/* Actions – thanh button cố định dưới */}
        <div className={styles.footerBar}>
          <Button size="large" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={loading || !finalPriceData}
            style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}
          >
            Confirm & Submit Request
          </Button>
        </div>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}
