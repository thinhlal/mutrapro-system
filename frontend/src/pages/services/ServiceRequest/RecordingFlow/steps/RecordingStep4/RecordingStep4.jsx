// RecordingStep4.jsx - Summary & Review
import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Typography,
  Descriptions,
  Divider,
  Space,
  Tag,
  Alert,
  message,
} from 'antd';
import { CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import styles from './RecordingStep4.module.css';

const { Title, Text } = Typography;

// Mock pricing - sẽ thay bằng API call thực tế
const MOCK_STUDIO_RATE_PER_HOUR = 1000000; // 1,000,000 VND/hour
const MOCK_ADMIN_FEE = 50000; // 50,000 VND
const MOCK_EXTERNAL_GUEST_FEE_PER_PERSON = 100000; // 100,000 VND/person

export default function RecordingStep4({ data, onComplete }) {
  const step1 = data?.step1 || {};
  const step2 = data?.step2 || {};
  const step3 = data?.step3 || {};

  // Calculate duration in hours
  const durationHours = useMemo(() => {
    if (!step1.bookingStartTime || !step1.bookingEndTime) return 0;
    
    const start = new Date(`2000-01-01 ${step1.bookingStartTime}`);
    const end = new Date(`2000-01-01 ${step1.bookingEndTime}`);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(diffHours, 0);
  }, [step1.bookingStartTime, step1.bookingEndTime]);

  // Calculate costs
  const costBreakdown = useMemo(() => {
    const studioRate = durationHours * MOCK_STUDIO_RATE_PER_HOUR;
    
    // Artist fee = SUM participant_fee WHERE performer_source = INTERNAL_ARTIST
    const artistFee =
      (step2.vocalParticipants || [])
        .filter(p => p.performerSource === 'INTERNAL_ARTIST')
        .reduce((sum, p) => sum + (p.participantFee || 0), 0) +
      (step3.instrumentParticipants || [])
        .filter(p => p.performerSource === 'INTERNAL_ARTIST')
        .reduce((sum, p) => sum + (p.participantFee || 0), 0);

    // Equipment rental fee = SUM equipment_rental_fee từ instrumentParticipants
    const equipmentRentalFee =
      (step3.instrumentParticipants || [])
        .filter(
          p =>
            p.roleType === 'INSTRUMENT' &&
            p.instrumentSource === 'STUDIO_SIDE'
        )
        .reduce((sum, p) => sum + (p.equipmentRentalFee || 0), 0);

    const adminFee = MOCK_ADMIN_FEE;
    const externalGuestFee =
      (step1.externalGuestCount || 0) * MOCK_EXTERNAL_GUEST_FEE_PER_PERSON;

    const totalCost =
      studioRate +
      artistFee +
      equipmentRentalFee +
      adminFee +
      externalGuestFee;

    return {
      studioRate,
      artistFee,
      equipmentRentalFee,
      adminFee,
      externalGuestFee,
      totalCost,
    };
  }, [
    durationHours,
    step1.externalGuestCount,
    step2.vocalParticipants,
    step3.instrumentParticipants,
  ]);

  const handleSubmit = () => {
    // Prepare final booking data
    const bookingData = {
      // Slot info
      bookingDate: step1.bookingDate,
      bookingStartTime: step1.bookingStartTime,
      bookingEndTime: step1.bookingEndTime,
      durationHours,

      // Participants
      participants: [
        ...(step2.vocalParticipants || []),
        ...(step3.instrumentParticipants || []),
      ],

      // Equipment (chỉ STUDIO_SIDE)
      requiredEquipment:
        (step3.instrumentParticipants || [])
          .filter(
            p =>
              p.roleType === 'INSTRUMENT' &&
              p.instrumentSource === 'STUDIO_SIDE' &&
              p.equipmentId
          )
          .map(p => ({
            equipmentId: p.equipmentId,
            quantity: 1,
            rentalFeePerUnit: p.equipmentRentalFee,
            totalRentalFee: p.equipmentRentalFee,
          })) || [],

      // Cost breakdown
      costBreakdown,

      // Additional info
      externalGuestCount: step1.externalGuestCount || 0,
    };

    message.success('Booking summary prepared successfully!');
    onComplete(bookingData);
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 4: Review & Confirm
        </Title>
        <Text className={styles.description}>
          Please review your booking details and confirm
        </Text>
      </div>

      <div className={styles.summarySection}>
        {/* Slot Information */}
        <div className={styles.section}>
          <Title level={4}>Booking Slot</Title>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Date">
              {step1.bookingDate
                ? new Date(step1.bookingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {step1.bookingStartTime && step1.bookingEndTime
                ? `${step1.bookingStartTime} - ${step1.bookingEndTime}`
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {durationHours} hour(s)
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* Vocal Participants */}
        {step2.vocalParticipants && step2.vocalParticipants.length > 0 && (
          <div className={styles.section}>
            <Title level={4}>Vocal Participants</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {step2.vocalParticipants.map((p, idx) => (
                <div key={idx} className={styles.participantItem}>
                  <Tag color={p.performerSource === 'INTERNAL_ARTIST' ? 'blue' : 'green'}>
                    {p.performerSource === 'INTERNAL_ARTIST'
                      ? 'Internal Artist'
                      : 'Customer Self'}
                  </Tag>
                  <Text>
                    {p.performerSource === 'INTERNAL_ARTIST'
                      ? `Vocalist ID: ${p.specialistId?.slice(0, 8)}...`
                      : 'Customer will sing'}
                  </Text>
                  {p.performerSource === 'INTERNAL_ARTIST' && (
                    <Text strong style={{ marginLeft: 'auto' }}>
                      {p.participantFee?.toLocaleString('vi-VN')}₫
                    </Text>
                  )}
                </div>
              ))}
            </Space>
          </div>
        )}

        {/* Instrument Participants */}
        {step3.instrumentParticipants &&
          step3.instrumentParticipants.length > 0 && (
            <div className={styles.section}>
              <Title level={4}>Instrument Participants</Title>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="small"
              >
                {step3.instrumentParticipants.map((p, idx) => (
                  <div key={idx} className={styles.participantItem}>
                    <div className={styles.participantInfo}>
                      <Tag
                        color={
                          p.performerSource === 'INTERNAL_ARTIST'
                            ? 'blue'
                            : 'green'
                        }
                      >
                        {p.performerSource === 'INTERNAL_ARTIST'
                          ? 'Internal Artist'
                          : 'Customer Self'}
                      </Tag>
                      <Text strong>{p.skillName || 'Unknown Instrument'}</Text>
                      {p.equipmentName && (
                        <Tag color="orange">{p.equipmentName}</Tag>
                      )}
                      <Tag color="cyan">
                        {p.instrumentSource === 'STUDIO_SIDE'
                          ? 'Studio Equipment'
                          : p.instrumentSource === 'ARTIST_SIDE'
                          ? 'Artist Equipment'
                          : 'Customer Equipment'}
                      </Tag>
                    </div>
                    <div className={styles.participantCost}>
                      {p.performerSource === 'INTERNAL_ARTIST' && (
                        <Text>
                          Artist: {p.participantFee?.toLocaleString('vi-VN')}₫
                        </Text>
                      )}
                      {p.equipmentRentalFee > 0 && (
                        <Text>
                          Equipment:{' '}
                          {p.equipmentRentalFee?.toLocaleString('vi-VN')}₫
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </Space>
            </div>
          )}

        {/* Cost Breakdown */}
        <div className={styles.section}>
          <Title level={4}>Cost Breakdown</Title>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Studio Rate">
              {costBreakdown.studioRate.toLocaleString('vi-VN')}₫ (
              {durationHours} hour(s) ×{' '}
              {MOCK_STUDIO_RATE_PER_HOUR.toLocaleString('vi-VN')}₫/hour)
            </Descriptions.Item>
            {costBreakdown.artistFee > 0 && (
              <Descriptions.Item label="Artist Fee">
                {costBreakdown.artistFee.toLocaleString('vi-VN')}₫
              </Descriptions.Item>
            )}
            {costBreakdown.equipmentRentalFee > 0 && (
              <Descriptions.Item label="Equipment Rental Fee">
                {costBreakdown.equipmentRentalFee.toLocaleString('vi-VN')}₫
              </Descriptions.Item>
            )}
            {costBreakdown.externalGuestFee > 0 && (
              <Descriptions.Item label="External Guest Fee">
                {costBreakdown.externalGuestFee.toLocaleString('vi-VN')}₫ (
                {step1.externalGuestCount || 0} guest(s) ×{' '}
                {MOCK_EXTERNAL_GUEST_FEE_PER_PERSON.toLocaleString('vi-VN')}₫
                /person)
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Admin Fee">
              {costBreakdown.adminFee.toLocaleString('vi-VN')}₫
            </Descriptions.Item>
            <Descriptions.Item label="Total Cost">
              <Text strong style={{ fontSize: '18px', color: '#ec8a1c' }}>
                {costBreakdown.totalCost.toLocaleString('vi-VN')}₫
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>

      <Alert
        message="Note"
        description="This is a summary of your booking. After confirmation, you will be redirected to complete the booking process."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div className={styles.actionRow}>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleSubmit}
          className={styles.submitButton}
        >
          Confirm Booking
        </Button>
      </div>
    </Card>
  );
}
