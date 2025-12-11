import React, { useState } from 'react';
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
} from 'antd';
import {
  CheckCircleOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import styles from './RecordingStep4.module.css';

const { Title, Text } = Typography;

/**
 * Step 4: Review & Submit
 * Tổng hợp tất cả thông tin đã chọn và hiển thị tổng phí
 */
export default function RecordingStep4({ formData, onBack, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);

  // Destructure formData
  const { step1, step2, step3 } = formData;

  // Debug: Log data to console
  console.log('📊 Step 4 - Form Data:', {
    step1,
    step2,
    step3,
  });

  // Calculate fees
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

  // Handle submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error('Submit error:', error);
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

        {/* Fee Summary */}
        <Card
          type="inner"
          title={<span>Tổng phí dự kiến</span>}
          className={styles.feeSection}
        >
          {fees.totalFee === 0 ? (
            <Alert
              message="Phí tổng = 0 VND"
              description="Bạn đang tự thực hiện (tự hát, tự chơi nhạc cụ, tự mang thiết bị) nên không phát sinh chi phí từ studio."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Phí Participant"
                value={fees.participantFee}
                suffix="VND"
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (Internal vocalists + instrumentalists)
              </Text>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Phí thuê thiết bị"
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
                valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
              />
            </Col>
          </Row>

          {/* Chi tiết cách tính */}
          {detailedBreakdown.length > 0 && (
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
                <Descriptions.Item
                  label={
                    <Text strong style={{ fontSize: 16 }}>
                      Tổng cộng
                    </Text>
                  }
                >
                  <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                    {fees.totalFee.toLocaleString('vi-VN')} VND
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
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
