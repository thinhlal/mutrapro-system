import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Tag,
  Divider,
  Alert,
  Table,
  Statistic,
  Row,
  Col,
  Form,
  Input,
  Upload,
} from 'antd';
import {
  CheckCircleOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ToolOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { createServiceRequest } from '../../../../../../services/serviceRequestService';
import { createBookingFromServiceRequest } from '../../../../../../services/studioBookingService';
import styles from './RecordingStep4.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Step 4: Review & Submit
 * Tổng hợp tất cả thông tin đã chọn, nhập thông tin service request và submit
 */
export default function RecordingStep4({ formData, onBack, onSubmit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileList, setFileList] = useState([]);

  // Destructure formData
  const { step1, step2, step3 } = formData;

  // Initialize form với user info
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        contactName: user.fullName || '',
        contactEmail: user.email || '',
      });
    }
  }, [user, form]);

  // Debug: Log data to console
  console.log('📊 Step 4 - Form Data:', {
    step1,
    step2,
    step3,
  });

  // File upload handlers
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleBeforeUpload = (file) => {
    // Validate file type
    const isAudio = file.type.startsWith('audio/') || 
                    file.type === 'application/pdf' || 
                    file.type === 'application/xml';
    
    if (!isAudio) {
      toast.error('Chỉ chấp nhận file audio, PDF hoặc XML!');
      return Upload.LIST_IGNORE;
    }

    // Validate file size (100MB)
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      toast.error('File phải nhỏ hơn 100MB!');
      return Upload.LIST_IGNORE;
    }

    // Store file for upload
    setUploadedFile(file);
    return false; // Prevent auto upload
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setUploadedFile(null);
  };

  // Calculate fees (participant + equipment only)
  const calculateFees = () => {
    let participantFee = 0;
    let equipmentRentalFee = 0;

    // Vocal fees (nếu thuê internal vocalists)
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        // Lấy hourlyRate từ vocalist data, fallback về 500k nếu không có
        const rate = vocalist.hourlyRate || 500000;
        // Tính fee = hourlyRate * số giờ booking (từ step1)
        const hours = step1?.durationHours || 2;
        participantFee += rate * hours;
      });
    }

    // Instrument fees
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Performer fee (nếu thuê internal artist)
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          // Lấy hourlyRate từ instrument data, fallback về 300k nếu không có
          const rate = instrument.hourlyRate || 300000;
          // Tính fee = hourlyRate * số giờ booking (từ step1)
          console.log('instrument', instrument);
          console.log('rate', rate);
          console.log('step1?.durationHours', step1?.durationHours);
          const hours = step1?.durationHours || 2;
          participantFee += rate * hours;
          console.log('participantFee', participantFee);
        }

        // Equipment rental fee (nếu thuê equipment từ studio)
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          // Tính fee = rentalFee (per hour) × quantity × số giờ booking
          const hours = step1?.durationHours || 2;
          equipmentRentalFee += rentalFee * quantity * hours;
        }
      });
    }

    return {
      participantFee,
      equipmentRentalFee,
      totalFee: participantFee + equipmentRentalFee,
    };
  };

  const fees = calculateFees();

  // Debug: Log fees
  console.log('💰 Calculated Fees:', fees);

  // Calculate detailed breakdown for display
  const calculateDetailedBreakdown = () => {
    const breakdown = [];
    const hours = step1?.durationHours || 2;

    // Vocal fees breakdown
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        const rate = vocalist.hourlyRate || 500000;
        const fee = rate * hours;
        breakdown.push({
          type: 'vocalist',
          name: vocalist.name || 'Vocalist',
          rate: rate,
          hours: hours,
          fee: fee,
          formula: `${rate.toLocaleString('vi-VN')} VND/giờ × ${hours} giờ = ${fee.toLocaleString('vi-VN')} VND`,
        });
      });
    }

    // Instrument performer fees breakdown
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          const rate = instrument.hourlyRate || 300000;
          const fee = rate * hours;
          breakdown.push({
            type: 'instrumentalist',
            name: instrument.specialistName || instrument.skillName || 'Instrumentalist',
            rate: rate,
            hours: hours,
            fee: fee,
            formula: `${rate.toLocaleString('vi-VN')} VND/giờ × ${hours} giờ = ${fee.toLocaleString('vi-VN')} VND`,
          });
        }

        // Equipment rental breakdown
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          const fee = rentalFee * quantity * hours;
          breakdown.push({
            type: 'equipment',
            name: instrument.equipmentName || instrument.skillName || 'Equipment',
            rate: rentalFee,
            quantity: quantity,
            hours: hours,
            fee: fee,
            formula: `${rentalFee.toLocaleString('vi-VN')} VND/giờ × ${quantity} cái × ${hours} giờ = ${fee.toLocaleString('vi-VN')} VND`,
          });
        }
      });
    }

    return breakdown;
  };

  const detailedBreakdown = calculateDetailedBreakdown();

  // Transform booking data
  const transformBookingData = () => {
    const participants = [];
    const requiredEquipment = [];
    const hours = step1?.durationHours || 2;

    // Add vocalists từ step2
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        // Calculate total fee = hourlyRate × hours
        const hourlyRate = vocalist.hourlyRate || 500000;
        const totalFee = hourlyRate * hours;
        
        participants.push({
          specialistId: vocalist.specialistId,
          roleType: 'VOCAL',
          performerSource: 'INTERNAL_ARTIST',
          participantFee: totalFee, // ← Gửi giá trị đã tính (hourlyRate × hours)
        });
      });
    }

    // Add customer self vocalist nếu có
    if (step2?.vocalChoice === 'CUSTOMER_SELF' || step2?.vocalChoice === 'BOTH') {
      participants.push({
        roleType: 'VOCAL',
        performerSource: 'CUSTOMER_SELF',
      });
    }

    // Add instrumentalists và equipment từ step3
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Add performer
        if (instrument.performerSource === 'INTERNAL_ARTIST' && instrument.specialistId) {
          // Calculate total fee = hourlyRate × hours
          const hourlyRate = instrument.hourlyRate || 400000;
          const totalFee = hourlyRate * hours;
          
          participants.push({
            specialistId: instrument.specialistId,
            roleType: 'INSTRUMENT',
            performerSource: 'INTERNAL_ARTIST',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId: instrument.instrumentSource === 'STUDIO_SIDE' ? instrument.equipmentId : null,
            participantFee: totalFee, // ← Gửi giá trị đã tính (hourlyRate × hours)
          });
        } else if (instrument.performerSource === 'CUSTOMER_SELF') {
          participants.push({
            roleType: 'INSTRUMENT',
            performerSource: 'CUSTOMER_SELF',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId: instrument.instrumentSource === 'STUDIO_SIDE' ? instrument.equipmentId : null,
          });
        }

        // Add equipment
        if (instrument.instrumentSource === 'STUDIO_SIDE' && instrument.equipmentId) {
          const quantity = instrument.quantity || 1;
          const rentalFeePerHour = instrument.rentalFee || 0;
          // Calculate total: rentalFeePerHour × quantity × hours
          const totalRentalFee = rentalFeePerHour * quantity * hours;
          
          requiredEquipment.push({
            equipmentId: instrument.equipmentId,
            quantity: quantity,
            rentalFeePerUnit: rentalFeePerHour,
            totalRentalFee: totalRentalFee, // ← Gửi giá trị đã tính (rentalFee × quantity × hours)
          });
        }
      });
    }

    return {
      bookingDate: step1.bookingDate,
      startTime: step1.bookingStartTime,
      endTime: step1.bookingEndTime,
      durationHours: step1.durationHours,
      participants,
      requiredEquipment,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      // Validate file upload (MANDATORY)
      if (!uploadedFile) {
        toast.error('Vui lòng upload file (reference track, backing track, hoặc sheet music)');
        return;
      }

      // Validate form
      const values = await form.validateFields();
      
      setSubmitting(true);

      // Calculate duration in minutes
      const durationMinutes = Math.round((step1?.durationHours || 2) * 60);

      // 1. Tạo service request
      // Note: serviceRequestService.jsx will automatically convert to FormData and upload files
      const requestData = {
        requestType: 'recording',
        title: values.title,
        description: values.description,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
        durationMinutes,
        hasVocalist: step2?.vocalChoice !== 'NONE',
        instrumentIds: [],
        files: uploadedFile ? [uploadedFile] : [], // File object will be uploaded via FormData
      };

      const requestResponse = await createServiceRequest(requestData);
      const requestId = requestResponse?.data?.requestId;

      if (!requestId) {
        throw new Error('Không thể lấy requestId từ response');
      }

      // 2. Tạo booking từ service request
      const bookingData = transformBookingData();
      const bookingResponse = await createBookingFromServiceRequest(requestId, bookingData);

      // Clear session storage
      sessionStorage.removeItem('recordingFlowData');

      toast.success('Tạo request và booking thành công!');

      // Navigate to request detail
      const bookingId = bookingResponse?.data?.bookingId;
      if (bookingId) {
        navigate(`/my-requests/${requestId}`, {
          state: { bookingCreated: true, bookingId },
        });
      } else {
        navigate(`/my-requests/${requestId}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error?.message || error?.data?.message || 'Failed to create request and booking';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare instrument table data
  const instrumentTableData =
    step3?.instruments?.map((instrument, index) => ({
      key: index,
      instrument: instrument.skillName,
      performer:
        instrument.performerSource === 'CUSTOMER_SELF'
          ? 'Tôi tự chơi'
          : instrument.specialistName || 'Chưa chọn',
      instrumentSource:
        instrument.instrumentSource === 'CUSTOMER_SIDE'
          ? 'Tôi tự mang'
          : instrument.equipmentName || 'Chưa chọn',
      quantity: instrument.quantity || 1,
      fee:
        instrument.instrumentSource === 'STUDIO_SIDE'
          ? (instrument.rentalFee || 0) * (instrument.quantity || 1)
          : 0,
    })) || [];

  const instrumentColumns = [
    {
      title: 'Nhạc cụ',
      dataIndex: 'instrument',
      key: 'instrument',
    },
    {
      title: 'Người chơi',
      dataIndex: 'performer',
      key: 'performer',
    },
    {
      title: 'Nguồn nhạc cụ',
      dataIndex: 'instrumentSource',
      key: 'instrumentSource',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: 'Phí thuê',
      dataIndex: 'fee',
      key: 'fee',
      align: 'right',
      render: fee => `${fee.toLocaleString('vi-VN')} VND`,
    },
  ];

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>
          <CheckCircleOutlined className={styles.headerIcon} />
          Xem lại thông tin booking
        </Title>
        <Text type="secondary">
          Vui lòng kiểm tra kỹ thông tin trước khi xác nhận
        </Text>
      </div>

      <div className={styles.content}>
        {/* Booking Time */}
        <Card
          type="inner"
          title={
            <Space>
              <CalendarOutlined />
              <span>Thời gian booking</span>
            </Space>
          }
          className={styles.section}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Ngày
                </Text>
                <Tag color="blue" icon={<CalendarOutlined />} style={{ fontSize: 14 }}>
                  {step1?.bookingDate || 'Chưa chọn'}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Giờ bắt đầu
                </Text>
                <Tag color="green" icon={<ClockCircleOutlined />} style={{ fontSize: 14 }}>
                  {step1?.bookingStartTime || 'Chưa chọn'}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Giờ kết thúc
                </Text>
                <Tag color="orange" icon={<ClockCircleOutlined />} style={{ fontSize: 14 }}>
                  {step1?.bookingEndTime || 'Chưa chọn'}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Vocal Setup */}
        <Card
          type="inner"
          title={
            <Space>
              <UserOutlined />
              <span>Vocal Setup</span>
            </Space>
          }
          className={styles.section}
        >
          {step2?.vocalChoice === 'NONE' && (
            <Alert
              message="Không thu vocal"
              type="info"
              showIcon
              icon={<UserOutlined />}
            />
          )}

          {step2?.vocalChoice === 'CUSTOMER_SELF' && (
            <Alert
              message="Tôi tự hát"
              type="success"
              showIcon
              icon={<UserOutlined />}
            />
          )}

          {(step2?.vocalChoice === 'INTERNAL_ARTIST' ||
            step2?.vocalChoice === 'BOTH') && (
            <>
              {step2.vocalChoice === 'BOTH' && (
                <Alert
                  message="Tôi tự hát + Thuê ca sĩ nội bộ"
                  type="success"
                  showIcon
                  icon={<TeamOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}
              <Descriptions
                title="Ca sĩ nội bộ đã chọn"
                column={1}
                bordered
                size="small"
              >
                {step2?.selectedVocalists?.map((vocalist, index) => (
                  <Descriptions.Item
                    key={index}
                    label={`Vocalist ${index + 1}`}
                  >
                    <Space>
                      <Text>{vocalist.name}</Text>
                      <Tag color="purple">Internal Artist</Tag>
                    </Space>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}
        </Card>

        {/* Instrument Setup */}
        <Card
          type="inner"
          title={
            <Space>
              <ToolOutlined />
              <span>Instrument Setup</span>
            </Space>
          }
          className={styles.section}
        >
          {step3?.hasLiveInstruments === false ? (
            <Alert
              message="Không sử dụng nhạc cụ live (chỉ dùng beat/backing track)"
              type="info"
              showIcon
            />
          ) : (
            <Table
              dataSource={instrumentTableData}
              columns={instrumentColumns}
              pagination={false}
              size="small"
              bordered
            />
          )}
        </Card>

        <Divider />

        {/* File Upload Section */}
        <Card
          type="inner"
          title={
            <Space>
              <UploadOutlined />
              <span>Upload File *</span>
            </Space>
          }
          className={styles.section}
        >
          <Alert
            message="File bắt buộc"
            description="Vui lòng upload reference track, backing track, hoặc sheet music (PDF/XML)"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={handleBeforeUpload}
            onRemove={handleRemoveFile}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} size="large">
              Chọn file
            </Button>
          </Upload>
          {fileList.length > 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              File: {fileList[0].name} ({(fileList[0].size / 1024 / 1024).toFixed(2)} MB)
            </Text>
          )}
        </Card>

        <Divider />

        {/* Fee Summary */}
        <Card
          type="inner"
          title={<span>💰 Tổng phí dự kiến</span>}
          className={styles.feeSection}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Phí Participant"
                value={fees.participantFee}
                suffix="VND"
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Vocalists + Instrumentalists)
              </Text>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Phí thiết bị"
                value={fees.equipmentRentalFee}
                suffix="VND"
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Equipment từ studio)
              </Text>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Tổng cộng"
                value={fees.totalFee}
                suffix="VND"
                valueStyle={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 24 }}
              />
            </Col>
          </Row>

          {fees.totalFee === 0 && (
            <Alert
              message="Phí tổng = 0 VND"
              description="Bạn đang tự thực hiện (tự hát, tự chơi nhạc cụ, tự mang thiết bị)"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {/* Chi tiết cách tính */}
          <div style={{ marginTop: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              📋 Chi tiết cách tính:
            </Title>
            <Descriptions
              bordered
              column={1}
              size="small"
              style={{ marginBottom: 16 }}
            >
              {/* Service Fee */}
              {/* Participants & Equipment */}
              {detailedBreakdown.map((item, index) => (
                <Descriptions.Item
                  key={index}
                  label={
                    <Space>
                      <Text strong>
                        {item.type === 'vocalist'
                          ? '🎤 Ca sĩ'
                          : item.type === 'instrumentalist'
                          ? '🎸 Nhạc công'
                          : '🔧 Thiết bị'}
                      </Text>
                      <Text type="secondary">({item.name})</Text>
                    </Space>
                  }
                >
                  <Text>{item.formula}</Text>
                </Descriptions.Item>
              ))}

              {/* Grand Total */}
              <Descriptions.Item
                label={
                  <Text strong style={{ fontSize: 16 }}>
                    💵 Tổng cộng
                  </Text>
                }
              >
                <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                  {fees.totalFee.toLocaleString('vi-VN')} VND
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        </Card>

        <Divider />

        {/* Service Request Information Form */}
        <Card
          type="inner"
          title={<span>📝 Thông tin Service Request</span>}
          className={styles.section}
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
          >
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Tiêu đề"
                  name="title"
                  rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                >
                  <Input size="large" placeholder="Ví dụ: Thu âm bài hát mới của tôi" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Mô tả"
                  name="description"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mô tả' },
                    { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự' },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Mô tả chi tiết về yêu cầu thu âm của bạn..."
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Tên liên hệ"
                  name="contactName"
                  rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                  <Input size="large" placeholder="Họ và tên" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Số điện thoại"
                  name="contactPhone"
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input size="large" placeholder="+84 ..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Email liên hệ"
                  name="contactEmail"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                >
                  <Input size="large" placeholder="email@example.com" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <Button
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          disabled={submitting}
        >
          Back to Instrument Setup
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleSubmit}
          loading={submitting}
          className={styles.submitButton}
        >
          Xác nhận & Submit Booking
        </Button>
      </div>
    </Card>
  );
}
