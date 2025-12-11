// RecordingQuotePage - Hiển thị báo giá và submit cho Recording service
// Tự động tạo booking sau khi tạo request
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
  Form,
  Input,
} from 'antd';
import {
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import {
  calculatePrice,
  formatPrice,
  getPricingDetail,
} from '../../../../services/pricingMatrixService';
import { createServiceRequest } from '../../../../services/serviceRequestService';
import {
  createBookingFromServiceRequest,
} from '../../../../services/studioBookingService';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import { formatDurationMMSS } from '../../../../utils/timeUtils';
import { useAuth } from '../../../../contexts/AuthContext';
import styles from '../Transcription/TranscriptionQuotePage.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function RecordingQuotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};
  const { user } = useAuth();
  const [form] = Form.useForm();

  // Data từ previous pages
  const initialFormData = navState.formData || {};
  const uploadedFile = navState.uploadedFile;
  const fileName = navState.fileName || 'Untitled';
  const serviceType = 'recording'; // Luôn là recording
  const blobUrl = navState.blobUrl;
  // Recording data từ RecordingFlowController (bắt buộc cho recording)
  const recordingData = navState.recordingData;

  // Local formData state - có thể được cập nhật từ form
  const [formData, setFormData] = useState(initialFormData);
  const [priceData, setPriceData] = useState(null);
  const [servicePricing, setServicePricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(!initialFormData.title); // Show form nếu không có formData

  const { instruments: instrumentsData } = useInstrumentStore();

  // Tính durationMinutes từ booking time nếu không có
  // Default: 2 hours (120 phút) - giống với slotDurationHours trong backend
  const calculateDurationFromBooking = () => {
    // Ưu tiên: dùng durationHours từ step4 nếu có
    if (recordingData?.step4?.durationHours) {
      return Math.round(recordingData.step4.durationHours * 60); // Convert hours to minutes
    }
    
    // Nếu không có durationHours, tính từ booking time range
    if (recordingData?.step4?.bookingStartTime && recordingData?.step4?.bookingEndTime) {
      try {
        const [startHours, startMinutes] = recordingData.step4.bookingStartTime.split(':').map(Number);
        const [endHours, endMinutes] = recordingData.step4.bookingEndTime.split(':').map(Number);
        const startTotal = startHours * 60 + startMinutes;
        const endTotal = endHours * 60 + endMinutes;
        const calculatedMinutes = endTotal - startTotal;
        // Nếu tính được và > 0, dùng giá trị đó
        if (calculatedMinutes > 0) {
          return calculatedMinutes;
        }
      } catch (error) {
        console.warn('Error calculating duration from booking time:', error);
      }
    }
    
    // Default: 2 hours (120 phút) - giống với slotDurationHours = 2 trong backend
    return 120;
  };

  // Initialize form với user info nếu không có formData
  useEffect(() => {
    if (showForm && user) {
      form.setFieldsValue({
        title: formData.title || '',
        description: formData.description || '',
        contactName: formData.contactName || user.fullName || '',
        contactEmail: formData.contactEmail || user.email || '',
        contactPhone: formData.contactPhone || '',
      });
    }
  }, [showForm, user, form, formData]);

  // Validate recordingData (bắt buộc cho recording)
  if (!recordingData || !recordingData.step4) {
    return (
      <div className={styles.wrap}>
        <Header />
        <Empty description="Missing booking data. Please go back and complete the booking flow." />
        <Button type="primary" onClick={() => navigate('/recording-flow')}>
          Go Back to Booking Flow
        </Button>
        <Footer />
      </div>
    );
  }

  // Nếu showForm, hiển thị form để nhập thông tin
  if (showForm) {
    const handleFormSubmit = () => {
      form.validateFields().then(values => {
        const durationMinutes = formData.durationMinutes || calculateDurationFromBooking();
        setFormData({
          ...values,
          durationMinutes,
        });
        setShowForm(false);
      }).catch(err => {
        console.error('Form validation failed:', err);
      });
    };

    return (
      <>
        <Header />
        <div className={styles.wrap}>
          <Title level={2} style={{ marginBottom: 24 }}>
            Complete Your Recording Request
          </Title>
          <Card title="Service Information" style={{ maxWidth: 800, margin: '0 auto' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormSubmit}
            >
              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: 'Please enter a title' }]}
              >
                <Input size="large" placeholder="e.g., Record My Song" />
              </Form.Item>
              <Form.Item
                label="Description"
                name="description"
                rules={[
                  { required: true, message: 'Please enter a description' },
                  { min: 10, message: 'Description must be at least 10 characters' },
                ]}
              >
                <TextArea rows={4} placeholder="Describe your recording request..." />
              </Form.Item>
              <Form.Item
                label="Contact Name"
                name="contactName"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input size="large" placeholder="Your full name" />
              </Form.Item>
              <Form.Item
                label="Contact Email"
                name="contactEmail"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Invalid email' },
                ]}
              >
                <Input size="large" placeholder="you@example.com" />
              </Form.Item>
              <Form.Item
                label="Contact Phone"
                name="contactPhone"
                rules={[{ required: true, message: 'Please enter your phone' }]}
              >
                <Input size="large" placeholder="+84 ..." />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={() => navigate('/recording-flow')}>
                    Go Back
                  </Button>
                  <Button type="primary" htmlType="submit" size="large">
                    Continue to Review
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>
        <Footer />
        <BackToTop />
      </>
    );
  }

  // Validate formData sau khi submit form
  if (!formData || !formData.title || !formData.contactName) {
    return (
      <div className={styles.wrap}>
        <Header />
        <Empty description="Missing required information. Please complete the form." />
        <Button type="primary" onClick={() => setShowForm(true)}>
          Complete Form
        </Button>
        <Footer />
      </div>
    );
  }

  // Tính durationMinutes nếu chưa có
  const durationMinutes = formData.durationMinutes || calculateDurationFromBooking();
  const finalFormData = { ...formData, durationMinutes };

  // Fetch price calculation and service pricing detail
  useEffect(() => {
    if (!finalFormData.durationMinutes) return;

    const fetchPricingData = async () => {
      try {
        setLoading(true);

        // Fetch calculated price
        const priceResponse = await calculatePrice(
          serviceType,
          finalFormData.durationMinutes
        );
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
  }, [serviceType, finalFormData.durationMinutes]);

  // Tính tổng giá instruments và combine với priceData
  const finalPriceData = priceData
    ? (() => {
        // Tính tổng giá của instruments
        const instrumentTotal = (finalFormData.instrumentIds || []).reduce(
          (sum, id) => {
            const inst = instrumentsData.find(i => i.instrumentId === id);
            return sum + (inst?.basePrice || 0);
          },
          0
        );

        // Cộng vào totalPrice từ API
        const finalTotal = (priceData.totalPrice || 0) + instrumentTotal;

        // Tạo breakdown mới với instruments
        const breakdown = [...(priceData.breakdown || [])];
        if (instrumentTotal > 0) {
          breakdown.push({
            label: 'Instruments',
            amount: instrumentTotal,
            description: `${(finalFormData.instrumentIds || []).length} instrument(s)`,
          });
        }

        return {
          ...priceData,
          totalPrice: finalTotal,
          breakdown: breakdown,
        };
      })()
    : null;

  const handleSubmit = async () => {
    // 1. Validate trước
    if (!finalFormData.durationMinutes || finalFormData.durationMinutes <= 0) {
      toast.error('Thời lượng phải là số dương (phút).');
      return;
    }

    // 2. Chuẩn bị payload gửi lên backend
    const requestData = {
      requestType: serviceType,
      title: finalFormData.title,
      description: finalFormData.description,
      tempoPercentage: finalFormData.tempoPercentage || 100,
      contactName: finalFormData.contactName,
      contactPhone: finalFormData.contactPhone,
      contactEmail: finalFormData.contactEmail,
      instrumentIds: finalFormData.instrumentIds || [],
      durationMinutes: finalFormData.durationMinutes,
      hasVocalist: recordingData.step2?.vocalChoice !== 'NONE',
      externalGuestCount: recordingData.step4?.externalGuestCount || 0,
      genres: finalFormData.genres || null,
      purpose: recordingData.step4?.purpose || null,
      files: uploadedFile ? [uploadedFile] : [],
    };

    try {
      setSubmitting(true);

      // 3. Gọi API tạo service request
      const requestResponse = await createServiceRequest(requestData);

      // 4. Lấy requestId từ response
      const requestId = requestResponse?.data?.requestId;
      if (!requestId) {
        throw new Error('Không thể lấy requestId từ response');
      }

      // 5. Tự động tạo booking từ recordingData
      try {
        const bookingData = {
          bookingDate: recordingData.step4.bookingDate,
          startTime: recordingData.step4.bookingStartTime,
          endTime: recordingData.step4.bookingEndTime,
          durationHours: recordingData.step4.durationHours,
          participants: recordingData.step4.participants || [],
          requiredEquipment: recordingData.step4.requiredEquipment || [],
          externalGuestCount: recordingData.step4.externalGuestCount || 0,
          purpose: recordingData.step4.purpose || null,
          specialInstructions: recordingData.step4.specialInstructions || null,
          notes: recordingData.step4.notes || null,
        };

        const bookingResponse = await createBookingFromServiceRequest(
          requestId,
          bookingData
        );

        // Clear sessionStorage
        sessionStorage.removeItem('serviceRequestFormData');
        sessionStorage.removeItem('serviceRequestType');
        sessionStorage.removeItem('recordingFlowData');

        toast.success('Tạo request và booking thành công!');
        
        // Navigate đến request detail
        const bookingId = bookingResponse?.data?.bookingId;
        if (bookingId) {
          navigate(`/my-requests/${requestId}`, {
            state: { bookingCreated: true, bookingId },
          });
        } else {
          navigate(`/my-requests/${requestId}`);
        }
      } catch (bookingError) {
        console.error('Error creating booking:', bookingError);
        // Request đã tạo thành công, nhưng booking lỗi
        toast.warning(
          'Request đã được tạo, nhưng không thể tạo booking. Vui lòng tạo booking thủ công.'
        );
        navigate(`/my-requests/${requestId}`);
      }
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
          Review Your Recording Booking
        </Title>

        {/* 2 cột: bên trái 2 phần, bên phải 2 phần */}
        <div className={styles.row}>
          {/* LEFT COLUMN */}
          <div className={styles.left}>
            {/* Service Info */}
            <Card title="Service Details" style={{ marginBottom: 24 }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Service Type">
                  <Tag color="orange">Recording (Studio Booking)</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Title">
                  {finalFormData.title}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {finalFormData.description}
                </Descriptions.Item>
                <Descriptions.Item label="Duration">
                  <Tag color="green">
                    {formatDurationMMSS(finalFormData.durationMinutes)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="File">{fileName}</Descriptions.Item>
                {finalFormData.instrumentIds &&
                  finalFormData.instrumentIds.length > 0 && (
                    <Descriptions.Item label="Instruments">
                      <Space wrap>
                        {finalFormData.instrumentIds.map(id => {
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

            {/* Contact Info */}
            <Card title="Contact Information" style={{ marginBottom: 24 }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Name">
                  {finalFormData.contactName}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {finalFormData.contactEmail}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {finalFormData.contactPhone}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Booking Summary */}
            {recordingData?.step4 && (
              <Card title="Booking Summary" style={{ marginBottom: 24 }}>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Booking Date">
                    {recordingData.step4.bookingDate
                      ? new Date(recordingData.step4.bookingDate).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Time">
                    {recordingData.step4.bookingStartTime && recordingData.step4.bookingEndTime
                      ? `${recordingData.step4.bookingStartTime} - ${recordingData.step4.bookingEndTime}`
                      : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Duration">
                    {recordingData.step4.durationHours} hour(s)
                  </Descriptions.Item>
                  {recordingData.step4.participants &&
                    recordingData.step4.participants.length > 0 && (
                      <Descriptions.Item label="Participants">
                        <Space wrap>
                          {recordingData.step4.participants.map((p, idx) => (
                            <Tag key={idx} color={p.performerSource === 'INTERNAL_ARTIST' ? 'blue' : 'green'}>
                              {p.roleType} - {p.performerSource === 'INTERNAL_ARTIST' ? 'Internal' : 'Customer'}
                            </Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                  {recordingData.step4.requiredEquipment &&
                    recordingData.step4.requiredEquipment.length > 0 && (
                      <Descriptions.Item label="Equipment">
                        <Space wrap>
                          {recordingData.step4.requiredEquipment.map((eq, idx) => (
                            <Tag key={idx} color="orange">
                              Equipment #{idx + 1}
                            </Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                </Descriptions>
              </Card>
            )}
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
                              Recording (Studio Booking)
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
                              ` / ${servicePricing.unitType || 'minute'}`}
                          </Tag>
                        </div>
                      </Space>
                    </Card>
                  </div>

                  {/* Instruments Pricing */}
                  {finalFormData.instrumentIds &&
                    finalFormData.instrumentIds.length > 0 && (
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
                          dataSource={finalFormData.instrumentIds
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
                        {formatPrice(
                          finalPriceData.totalPrice,
                          finalPriceData.currency
                        )}
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
                          {formatPrice(
                            finalPriceData.basePrice,
                            finalPriceData.currency
                          )}{' '}
                          / minute
                        </Descriptions.Item>
                        <Descriptions.Item label="Duration">
                          {formatDurationMMSS(finalFormData.durationMinutes)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Service Subtotal">
                          {formatPrice(
                            priceData?.totalPrice || 0,
                            finalPriceData.currency
                          )}
                        </Descriptions.Item>
                        {(finalFormData.instrumentIds || []).length > 0 && (
                          <Descriptions.Item label="Instruments">
                            {formatPrice(
                              (finalFormData.instrumentIds || []).reduce(
                                (sum, id) => {
                                  const inst = instrumentsData.find(
                                    i => i.instrumentId === id
                                  );
                                  return sum + (inst?.basePrice || 0);
                                },
                                0
                              ),
                              finalPriceData.currency
                            )}
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              ({(finalFormData.instrumentIds || []).length}{' '}
                              instrument(s))
                            </Text>
                          </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Total">
                          <Text
                            strong
                            style={{ fontSize: 16, color: '#52c41a' }}
                          >
                            {formatPrice(
                              finalPriceData.totalPrice,
                              finalPriceData.currency
                            )}
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
          <Button size="large" onClick={() => setShowForm(true)}>
            Edit Information
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
            Confirm & Create Booking
          </Button>
        </div>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}
