// RecordingStep0.jsx - Studio Information
import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Descriptions,
  Alert,
} from 'antd';
import { CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getActiveStudio } from '../../../../../../services/studioBookingService';
import { formatPrice } from '../../../../../../services/pricingMatrixService';
import styles from './RecordingStep0.module.css';

const { Title, Text } = Typography;

export default function RecordingStep0({ data, onComplete }) {
  const [studio, setStudio] = useState(data?.studio || null);
  const [loading, setLoading] = useState(!studio);

  useEffect(() => {
    const fetchStudio = async () => {
      if (studio) {
        return; // Already have studio data
      }

      try {
        setLoading(true);
        const response = await getActiveStudio();

        if (response?.status === 'success' && response?.data) {
          setStudio(response.data);
        } else {
          message.error('Không thể tải thông tin studio');
        }
      } catch (error) {
        console.error('Error fetching studio:', error);
        message.error(
          error.message || 'Không thể tải thông tin studio. Vui lòng thử lại.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudio();
  }, [studio]);

  const handleContinue = () => {
    if (studio) {
      onComplete({ studio });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Card>
          <div className={styles.loadingContainer}>
            <Spin size="large" />
            <Text style={{ marginTop: 16, display: 'block' }}>
              Đang tải thông tin studio...
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className={styles.container}>
        <Card>
          <Alert
            message="Lỗi"
            description="Không thể tải thông tin studio. Vui lòng thử lại sau."
            type="error"
            showIcon
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
            Information of Studio
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            View the information of studio and the booking price before selecting the time
          </Text>
        </div>

        <div className={styles.studioInfo}>
          <Card className={styles.studioCard} bordered>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                  {studio.studioName || 'MuTraPro Studio'}
                </Title>
                {studio.location && (
                  <Space>
                    <EnvironmentOutlined />
                    <Text>{studio.location}</Text>
                  </Space>
                )}
              </div>

              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Booking price per hour">
                  <Text strong style={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}>
                    {formatPrice(studio.hourlyRate, 'VND')}/hour
                  </Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: '12px' }}>
                    (Price calculated based on the studio usage time)
                  </Text>
                </Descriptions.Item>
                {studio.freeExternalGuestsLimit !== undefined && (
                  <Descriptions.Item label="Free guest limit">
                    <Text>
                      {studio.freeExternalGuestsLimit} guests (free)
                    </Text>
                  </Descriptions.Item>
                )}
                {studio.extraGuestFeePerPerson && (
                  <Descriptions.Item label="Extra guest fee">
                    <Text>
                      {formatPrice(studio.extraGuestFeePerPerson, 'VND')}/guest
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <div className={styles.features}>
                <Text strong>Services include:</Text>
                <ul className={styles.featureList}>
                  <li>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Studio
                    professional with modern equipment
                  </li>
                  <li>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Support
                    professional technician support
                  </li>
                  <li>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> No
                    high-quality recording space
                  </li>
                </ul>
              </div>
            </Space>
          </Card>
        </div>

        <div className={styles.actions}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleContinue}
            block
            style={{ height: '48px', fontSize: '16px' }}
          >
            I understand, continue selecting the time
          </Button>
        </div>
      </Card>
    </div>
  );
}

