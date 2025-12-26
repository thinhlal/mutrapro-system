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
// Icons removed per request
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
 * Aggregate selected info, enter service request details, and submit
 */
export default function RecordingStep4({ formData, onBack, onSubmit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileList, setFileList] = useState([]);

  // Destructure formData
  const { step0, step1, step2, step3 } = formData;

  // Initialize form with user info
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

  const handleBeforeUpload = file => {
    // Validate file type
    const isAudio =
      file.type.startsWith('audio/') ||
      file.type === 'application/pdf' ||
      file.type === 'application/xml';

    if (!isAudio) {
      toast.error('Only audio, PDF or XML files are accepted!', {
        duration: 5000,
        position: 'top-center',
      });
      return Upload.LIST_IGNORE;
    }

    // Validate file size (100MB)
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      toast.error('File must be smaller than 100MB!', {
        duration: 5000,
        position: 'top-center',
      });
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

  // Calculate fees (studio + participant + equipment + guests)
  const calculateFees = () => {
    let studioFee = 0;
    let participantFee = 0;
    let equipmentRentalFee = 0;
    let guestFee = 0;
    let chargeableGuests = 0;

    // Studio fee = hourlyRate * durationHours
    const studio = step0?.studio;
    const hours = step1?.durationHours || 2;
    if (studio?.hourlyRate) {
      studioFee = studio.hourlyRate * hours;
    }

    // Vocal fees (when hiring internal vocalists)
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        // Use hourlyRate from vocalist data, fallback to 500k if missing
        const rate = vocalist.hourlyRate || 500000;
        // Calculate fee = hourlyRate * booking hours (from step1)
        participantFee += rate * hours;
      });
    }

    // Instrument fees
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Performer fee (when hiring internal artist)
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          // Use hourlyRate from instrument data, fallback to 300k if missing
          const rate = instrument.hourlyRate || 300000;
          // Calculate fee = hourlyRate * booking hours (from step1)
          participantFee += rate * hours;
        }

        // Equipment rental fee (when renting from studio)
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFee = instrument.rentalFee || 0;
          // Calculate fee = rentalFee (per hour) x quantity x booking hours
          equipmentRentalFee += rentalFee * quantity * hours;
        }
      });
    }

    // Guest fee (based on externalGuestCount and studio policy)
    const externalGuestCount =
      typeof step1?.externalGuestCount === 'number'
        ? step1.externalGuestCount
        : 0;

    if (
      studio &&
      typeof studio.extraGuestFeePerPerson === 'number' &&
      externalGuestCount > 0
    ) {
      const freeLimit =
        typeof studio.freeExternalGuestsLimit === 'number'
          ? studio.freeExternalGuestsLimit
          : 0;
      chargeableGuests = Math.max(0, externalGuestCount - freeLimit);
      if (chargeableGuests > 0) {
        guestFee = chargeableGuests * studio.extraGuestFeePerPerson;
      }
    }

    return {
      studioFee,
      participantFee,
      equipmentRentalFee,
      guestFee,
      chargeableGuests,
      totalFee: studioFee + participantFee + equipmentRentalFee + guestFee,
    };
  };

  const fees = calculateFees();

  // Debug: Log fees
  console.log('💰 Calculated Fees:', fees);

  // Calculate detailed breakdown for display
  const calculateDetailedBreakdown = () => {
    const breakdown = [];
    const hours = step1?.durationHours || 2;

    // Studio fee breakdown
    const studio = step0?.studio;
    if (studio?.hourlyRate) {
      const studioFee = studio.hourlyRate * hours;
      breakdown.push({
        type: 'studio',
        name: studio.studioName || 'Studio',
        rate: studio.hourlyRate,
        hours: hours,
        fee: studioFee,
        formula: `${studio.hourlyRate.toLocaleString('vi-VN')} VND/hour x ${hours} hrs = ${studioFee.toLocaleString('vi-VN')} VND`,
      });
    }

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
          formula: `${rate.toLocaleString('vi-VN')} VND/hour x ${hours} hrs = ${fee.toLocaleString('vi-VN')} VND`,
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
            name:
              instrument.specialistName ||
              instrument.skillName ||
              'Instrumentalist',
            rate: rate,
            hours: hours,
            fee: fee,
            formula: `${rate.toLocaleString('vi-VN')} VND/hour x ${hours} hrs = ${fee.toLocaleString('vi-VN')} VND`,
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
            name:
              instrument.equipmentName || instrument.skillName || 'Equipment',
            rate: rentalFee,
            quantity: quantity,
            hours: hours,
            fee: fee,
            formula: `${rentalFee.toLocaleString('vi-VN')} VND/hour x ${quantity} unit(s) x ${hours} hrs = ${fee.toLocaleString('vi-VN')} VND`,
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

    // Add vocalists from step2
    if (step2?.selectedVocalists && step2.selectedVocalists.length > 0) {
      step2.selectedVocalists.forEach(vocalist => {
        // Calculate total fee = hourlyRate x hours
        const hourlyRate = vocalist.hourlyRate || 500000;
        const totalFee = hourlyRate * hours;

        participants.push({
          specialistId: vocalist.specialistId,
          roleType: 'VOCAL',
          performerSource: 'INTERNAL_ARTIST',
          participantFee: totalFee, // Send calculated value (hourlyRate x hours)
        });
      });
    }

    // Add customer self vocalist if any
    if (
      step2?.vocalChoice === 'CUSTOMER_SELF' ||
      step2?.vocalChoice === 'BOTH'
    ) {
      participants.push({
        roleType: 'VOCAL',
        performerSource: 'CUSTOMER_SELF',
      });
    }

    // Add instrumentalists and equipment from step3
    if (step3?.instruments && step3.instruments.length > 0) {
      step3.instruments.forEach(instrument => {
        // Add performer
        if (
          instrument.performerSource === 'INTERNAL_ARTIST' &&
          instrument.specialistId
        ) {
          // Calculate total fee = hourlyRate x hours
          const hourlyRate = instrument.hourlyRate || 400000;
          const totalFee = hourlyRate * hours;

          participants.push({
            specialistId: instrument.specialistId,
            roleType: 'INSTRUMENT',
            performerSource: 'INTERNAL_ARTIST',
            skillId: instrument.skillId,
            instrumentSource: instrument.instrumentSource,
            equipmentId:
              instrument.instrumentSource === 'STUDIO_SIDE'
                ? instrument.equipmentId
                : null,
            participantFee: totalFee, // Send calculated value (hourlyRate x hours)
          });
        } else if (instrument.performerSource === 'CUSTOMER_SELF') {
          // Custom instruments: skillId = null, skillName = instrument name
          const isCustomInstrument = instrument.isCustomInstrument;
          participants.push({
            roleType: 'INSTRUMENT',
            performerSource: 'CUSTOMER_SELF',
            skillId: isCustomInstrument ? null : instrument.skillId,
            skillName: isCustomInstrument ? instrument.skillName : null,
            instrumentSource: instrument.instrumentSource,
            equipmentId:
              instrument.instrumentSource === 'STUDIO_SIDE'
                ? instrument.equipmentId
                : null,
          });
        }

        // Add equipment
        if (
          instrument.instrumentSource === 'STUDIO_SIDE' &&
          instrument.equipmentId
        ) {
          const quantity = instrument.quantity || 1;
          const rentalFeePerHour = instrument.rentalFee || 0;
          // Calculate total: rentalFeePerHour x quantity x hours
          const totalRentalFee = rentalFeePerHour * quantity * hours;

          requiredEquipment.push({
            equipmentId: instrument.equipmentId,
            quantity: quantity,
            rentalFeePerUnit: rentalFeePerHour,
            totalRentalFee: totalRentalFee, // Send calculated value (rentalFee x quantity x hours)
          });
        }
      });
    }

    return {
      bookingDate: step1.bookingDate,
      startTime: step1.bookingStartTime,
      endTime: step1.bookingEndTime,
      durationHours: step1.durationHours,
      externalGuestCount:
        typeof step1.externalGuestCount === 'number'
          ? step1.externalGuestCount
          : 0,
      participants,
      requiredEquipment,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      // Validate file upload (MANDATORY)
      if (!uploadedFile) {
        toast.error(
          'Please upload a file (reference track, backing track, or sheet music)'
        );
        return;
      }

      // Validate form
      const values = await form.validateFields();

      setSubmitting(true);

      // Calculate duration in minutes
      const durationMinutes = Math.round((step1?.durationHours || 2) * 60);

      // 1. Create service request
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
        throw new Error('Unable to get requestId from response');
      }

      // 2. Create booking from service request
      const bookingData = transformBookingData();
      const bookingResponse = await createBookingFromServiceRequest(
        requestId,
        bookingData
      );

      // Clear session storage
      sessionStorage.removeItem('recordingFlowData');

      toast.success('Created request and booking successfully!');

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

      // Parse error message to provide better user feedback
      let errorMessage =
        error?.message ||
        error?.data?.message ||
        'Failed to create request and booking';

      // Check for artist availability errors
      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('no registered slots') ||
        errorMessage.includes('missing slots')
      ) {
        errorMessage =
          'One or more selected artists are no longer available for the requested time slot. Please go back and select different artists or choose a different time slot.';
      } else if (
        errorMessage.includes('Artist') &&
        errorMessage.includes('conflict')
      ) {
        errorMessage =
          'One or more selected artists have a scheduling conflict. Please go back and select different artists or choose a different time slot.';
      }

      toast.error(errorMessage, { duration: 6000 });
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
          ? 'I will play'
          : instrument.specialistName || 'Not selected',
      instrumentSource:
        instrument.instrumentSource === 'CUSTOMER_SIDE'
          ? 'I will bring my own'
          : instrument.equipmentName || 'Not selected',
      quantity: instrument.quantity || 1,
      fee:
        instrument.instrumentSource === 'STUDIO_SIDE'
          ? (instrument.rentalFee || 0) * (instrument.quantity || 1)
          : 0,
    })) || [];

  const instrumentColumns = [
    {
      title: 'Instrument',
      dataIndex: 'instrument',
      key: 'instrument',
    },
    {
      title: 'Performer',
      dataIndex: 'performer',
      key: 'performer',
    },
    {
      title: 'Instrument source',
      dataIndex: 'instrumentSource',
      key: 'instrumentSource',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: 'Rental fee',
      dataIndex: 'fee',
      key: 'fee',
      align: 'right',
      render: fee => `${fee.toLocaleString('vi-VN')} VND`,
    },
  ];

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Review booking details</Title>
        <Text type="secondary">
          Please double-check the information before confirming
        </Text>
      </div>

      <div className={styles.content}>
        {/* Booking Time */}
        <Card
          type="inner"
          title={
            <Space>
              <span>Booking time</span>
            </Space>
          }
          className={styles.section}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Date
                </Text>
                <Tag color="blue" style={{ fontSize: 14 }}>
                  {step1?.bookingDate || 'Not selected'}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Start time
                </Text>
                <Tag color="green" style={{ fontSize: 14 }}>
                  {step1?.bookingStartTime || 'Not selected'}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  End time
                </Text>
                <Tag color="orange" style={{ fontSize: 14 }}>
                  {step1?.bookingEndTime || 'Not selected'}
                </Tag>
              </div>
            </Col>
          </Row>

          {/* External guests (if any) */}
          {typeof step1?.externalGuestCount === 'number' && (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <div style={{ textAlign: 'center' }}>
                  <Text
                    type="secondary"
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    Guests
                  </Text>
                  <Space direction="vertical">
                    <Tag color="default" style={{ fontSize: 14 }}>
                      {step1.externalGuestCount} guest
                      {step1.externalGuestCount === 1 ? '' : 's'}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {fees.chargeableGuests > 0 && fees.guestFee > 0
                        ? `Guest fee: ${fees.guestFee.toLocaleString('vi-VN')} VND (${fees.chargeableGuests} paid guest${
                            fees.chargeableGuests === 1 ? '' : 's'
                          })`
                        : 'No extra guest fee (within free guest limit)'}
                    </Text>
                  </Space>
                </div>
              </Col>
            </Row>
          )}
        </Card>

        {/* Vocal Setup */}
        <Card
          type="inner"
          title={
            <Space>
              <span>Vocal Setup</span>
            </Space>
          }
          className={styles.section}
        >
          {step2?.vocalChoice === 'NONE' && (
            <Alert message="No vocal recording" type="info" showIcon={false} />
          )}

          {step2?.vocalChoice === 'CUSTOMER_SELF' && (
            <Alert message="I will sing" type="success" showIcon={false} />
          )}

          {(step2?.vocalChoice === 'INTERNAL_ARTIST' ||
            step2?.vocalChoice === 'BOTH') && (
            <>
              {step2.vocalChoice === 'BOTH' && (
                <Alert
                  message="I will sing + hire in-house vocalist(s)"
                  type="success"
                  showIcon={false}
                  style={{ marginBottom: 16 }}
                />
              )}
              <Descriptions
                title="Selected in-house vocalists"
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
              <span>Instrument Setup</span>
            </Space>
          }
          className={styles.section}
        >
          {step3?.hasLiveInstruments === false ? (
            <Alert
              message="No live instruments (beat/backing track only)"
              type="info"
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

        {/* Fee Summary */}
        <Card
          type="inner"
          title={<span>Estimated total fee</span>}
          className={styles.feeSection}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Statistic
                title="Studio fee"
                value={fees.studioFee}
                suffix="VND"
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Studio hourly rate)
              </Text>
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Participant fee"
                value={fees.participantFee}
                suffix="VND"
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Vocalists + Instrumentalists)
              </Text>
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Equipment fee"
                value={fees.equipmentRentalFee}
                suffix="VND"
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Equipment from studio)
              </Text>
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Guest fee"
                value={fees.guestFee}
                suffix="VND"
                valueStyle={{ color: '#faad14' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Extra guests beyond free limit)
              </Text>
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Total"
                value={fees.totalFee}
                suffix="VND"
                valueStyle={{
                  color: '#ff4d4f',
                  fontWeight: 'bold',
                  fontSize: 24,
                }}
              />
            </Col>
          </Row>

          {fees.studioFee === 0 &&
            fees.participantFee === 0 &&
            fees.equipmentRentalFee === 0 && (
              <Alert
                message="Total fee = Studio fee only"
                description="Studio fee is always included. You are self-performing (self vocal, self instruments, self equipment)."
                type="info"
                style={{ marginTop: 16 }}
              />
            )}

          {/* Breakdown details */}
          <div style={{ marginTop: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              Breakdown details:
            </Title>
            <Descriptions
              bordered
              column={1}
              size="small"
              style={{ marginBottom: 16 }}
            >
              {/* Studio Fee, Participants & Equipment */}
              {detailedBreakdown.map((item, index) => (
                <Descriptions.Item
                  key={index}
                  label={
                    <Space>
                      <Text strong>
                        {item.type === 'studio'
                          ? '🏢 Studio'
                          : item.type === 'vocalist'
                            ? '🎤 Vocalist'
                            : item.type === 'instrumentalist'
                              ? '🎸 Instrumentalist'
                              : '🔧 Equipment'}
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
                    Grand total
                  </Text>
                }
              >
                <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                  {fees.totalFee.toLocaleString('vi-VN')} VND
                </Text>
                {fees.guestFee > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Includes guest fee:{' '}
                      {fees.guestFee.toLocaleString('vi-VN')} VND)
                    </Text>
                  </div>
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </Card>

        <Divider />

        {/* Service Request Information Form */}
        <Card
          type="inner"
          title={<span>Service Request Information</span>}
          className={styles.section}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label={<span>Title</span>}
                  name="title"
                  rules={[{ required: true, message: 'Please enter a title' }]}
                >
                  <Input size="large" placeholder="E.g. Record my new song" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label={<span>Description</span>}
                  name="description"
                  rules={[
                    { required: true, message: 'Please enter a description' },
                    {
                      min: 10,
                      message: 'Description must be at least 10 characters',
                    },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Describe your recording request in detail..."
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span>Contact name</span>}
                  name="contactName"
                  rules={[{ required: true, message: 'Please enter a name' }]}
                >
                  <Input size="large" placeholder="Full name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span>Phone number</span>}
                  name="contactPhone"
                  rules={[
                    { required: true, message: 'Please enter a phone number' },
                  ]}
                >
                  <Input size="large" placeholder="+84 ..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label={<span>Contact email</span>}
                  name="contactEmail"
                  rules={[
                    { required: true, message: 'Please enter an email' },
                    { type: 'email', message: 'Invalid email' },
                  ]}
                >
                  <Input size="large" placeholder="email@example.com" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Divider />

        {/* File Upload Section */}
        <Card type="inner" title="Upload File *" className={styles.section}>
          <Alert
            message="File required"
            description="Please upload a reference track, backing track, or sheet music (PDF/XML)"
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={handleBeforeUpload}
            onRemove={handleRemoveFile}
            maxCount={1}
          >
            <Button size="large">Choose file</Button>
          </Upload>
          {fileList.length > 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              File: {fileList[0].name} (
              {(fileList[0].size / 1024 / 1024).toFixed(2)} MB)
            </Text>
          )}
        </Card>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <Button size="large" onClick={onBack} disabled={submitting}>
          Back to Instrument Setup
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          loading={submitting}
          className={styles.submitButton}
        >
          Confirm & Submit Booking
        </Button>
      </div>
    </Card>
  );
}
