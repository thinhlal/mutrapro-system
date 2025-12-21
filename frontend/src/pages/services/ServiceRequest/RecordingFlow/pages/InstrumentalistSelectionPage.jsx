// InstrumentalistSelectionPage.jsx - Trang chọn instrumentalist cho một instrument cụ thể
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Spin,
  message,
  Empty,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { getAvailableArtistsForRequest } from '../../../../../services/studioBookingService';
import VocalistSelectionCard from './components/VocalistSelectionCard';
import Header from '../../../../../components/common/Header/Header';
import bannerImage from '../../../../../assets/images/ChooseSingerBanner/BannerSing.png';
import styles from './InstrumentalistSelectionPage.module.css';

const { Title, Text } = Typography;

export default function InstrumentalistSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    fromFlow,
    skillId,
    skillName,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
    selectedInstrumentalistId,
  } = location.state || {};

  const [selectedId, setSelectedId] = useState(selectedInstrumentalistId || null);
  const [instrumentalists, setInstrumentalists] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromFlow) {
      navigate('/recording-flow', { state: { step: 3 } });
    }
  }, [fromFlow, navigate]);

  // Fetch instrumentalists from backend
  useEffect(() => {
    if (skillId && bookingDate && bookingStartTime && bookingEndTime) {
      fetchInstrumentalists();
    }
  }, [skillId, bookingDate, bookingStartTime, bookingEndTime]);

  const fetchInstrumentalists = async () => {
    setLoading(true);
    try {
      const response = await getAvailableArtistsForRequest(
        bookingDate,
        bookingStartTime,
        bookingEndTime,
        skillId,
        'INSTRUMENT',
        null
      );

      if (response?.status === 'success' && response?.data) {
        setInstrumentalists(response.data);
      } else {
        setInstrumentalists([]);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load instrumentalist list');
      setInstrumentalists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = specialistId => {
    setSelectedId(specialistId);
  };

  const handleConfirm = () => {
    if (!selectedId) {
      message.warning('Please select an instrumentalist');
      return;
    }

    try {
      // Find selected instrumentalist info
      const selectedInstrumentalist = instrumentalists.find(
        i => i.specialistId === selectedId
      );

      if (!selectedInstrumentalist) {
        message.error('Selected instrumentalist not found');
        return;
      }

      // Save to sessionStorage
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};

      // Update the specific instrument in step3.instruments array
      if (!flowData.step3) {
        flowData.step3 = { instruments: [] };
      }
      if (!flowData.step3.instruments) {
        flowData.step3.instruments = [];
      }

      // Find and update the instrument with matching skillId
      const instrumentIndex = flowData.step3.instruments.findIndex(
        inst => inst.skillId === skillId
      );

      const instrumentalistInfo = {
        specialistId: selectedInstrumentalist.specialistId,
        specialistName: selectedInstrumentalist.name,
        hourlyRate: selectedInstrumentalist.hourlyRate || 0,
        avatarUrl: selectedInstrumentalist.avatarUrl,
        rating: selectedInstrumentalist.rating,
        experienceYears: selectedInstrumentalist.experienceYears,
      };

      if (instrumentIndex >= 0) {
        // Update existing instrument - keep all existing fields
        flowData.step3.instruments[instrumentIndex] = {
          ...flowData.step3.instruments[instrumentIndex], // Keep all existing fields
          ...instrumentalistInfo,
        };
      } else {
        // Add new instrument (shouldn't happen, but handle it)
        flowData.step3.instruments.push({
          skillId,
          skillName,
          performerSource: 'INTERNAL_ARTIST',
          instrumentSource: 'CUSTOMER_SIDE', // Default
          quantity: 1,
          rentalFee: 0,
          ...instrumentalistInfo,
        });
      }

      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));

      // Try to remove callback if exists
      try {
        sessionStorage.removeItem('recordingFlowInstrumentalistCallback');
      } catch (e) {
        // Ignore if doesn't exist
      }

      message.success('Selected instrumentalist successfully');
      navigate('/recording-flow', { state: { step: 3 } });
    } catch (error) {
      console.error('Error saving instrumentalist selection:', error);
      message.error('Failed to save instrumentalist selection. Please try again.');
    }
  };

  const handleBack = () => {
    // Save current selection before going back (if any)
    if (selectedId) {
      try {
        const selectedInstrumentalist = instrumentalists.find(
          i => i.specialistId === selectedId
        );

        if (selectedInstrumentalist) {
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};

          if (!flowData.step3) {
            flowData.step3 = { instruments: [] };
          }
          if (!flowData.step3.instruments) {
            flowData.step3.instruments = [];
          }

          const instrumentIndex = flowData.step3.instruments.findIndex(
            inst => inst.skillId === skillId
          );

          const instrumentalistInfo = {
            specialistId: selectedInstrumentalist.specialistId,
            specialistName: selectedInstrumentalist.name,
            hourlyRate: selectedInstrumentalist.hourlyRate || 0,
            avatarUrl: selectedInstrumentalist.avatarUrl,
            rating: selectedInstrumentalist.rating,
            experienceYears: selectedInstrumentalist.experienceYears,
          };

          if (instrumentIndex >= 0) {
            // Update existing instrument - keep all existing fields
            flowData.step3.instruments[instrumentIndex] = {
              ...flowData.step3.instruments[instrumentIndex], // Keep all existing fields
              ...instrumentalistInfo,
            };
          } else {
            flowData.step3.instruments.push({
              skillId,
              skillName,
              performerSource: 'INTERNAL_ARTIST',
              instrumentSource: 'CUSTOMER_SIDE', // Default
              quantity: 1,
              rentalFee: 0,
              ...instrumentalistInfo,
            });
          }

          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
        }
      } catch (error) {
        console.error('Error saving selection on back:', error);
      }
    }

    navigate('/recording-flow', { state: { step: 3 } });
  };

  const isSelected = specialistId => {
    return selectedId === specialistId;
  };

  if (!fromFlow) {
    return null;
  }

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <Card
          className={styles.headerCard}
          style={{ backgroundImage: `url(${bannerImage})` }}
        >
          <div className={styles.headerOverlay}></div>
          <div className={styles.header}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className={styles.backButton}
            >
              Back to Flow
            </Button>
            <Title level={2} className={styles.title}>
              Select Instrumentalist
            </Title>
            <p className={styles.description}>
              Choose an instrumentalist for {skillName || 'this instrument'}
            </p>
            {bookingDate && bookingStartTime && bookingEndTime && (
              <Alert
                message="Selected Slot"
                description={
                  <Space>
                    <Text strong>
                      {new Date(bookingDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text>•</Text>
                    <Text strong>
                      {bookingStartTime} - {bookingEndTime}
                    </Text>
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}
              />
            )}
          </div>
        </Card>

        <Card className={styles.contentCard}>
          <Spin spinning={loading}>
            <div className="row">
              {instrumentalists.length === 0 && !loading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    width: '100%',
                  }}
                >
                  <Empty description="No instrumentalists available for this instrument and slot" />
                </div>
              ) : (
                instrumentalists.map(instrumentalist => (
                  <VocalistSelectionCard
                    key={instrumentalist.specialistId}
                    specialist={{
                      ...instrumentalist,
                      fullName: instrumentalist.name,
                      bio: instrumentalist.role || '',
                      reviews: instrumentalist.totalProjects || 0,
                    }}
                    isSelected={isSelected(instrumentalist.specialistId)}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    disabled={!instrumentalist.isAvailable && !isSelected(instrumentalist.specialistId)}
                  />
                ))
              )}
            </div>
          </Spin>
        </Card>

        {selectedId && (
          <Card className={styles.actionCard}>
            <Space>
              <Button size="large" onClick={handleBack}>
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                onClick={handleConfirm}
              >
                Confirm Selection
              </Button>
            </Space>
          </Card>
        )}
      </div>
    </div>
  );
}
