// RecordingStep2.jsx - Vocal Setup (who will sing?)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Radio,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  message,
  List,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SearchOutlined,
  CloseOutlined,
  StarOutlined,
} from '@ant-design/icons';
import styles from './RecordingStep2.module.css';

const { Title, Text } = Typography;

const VOCAL_CHOICES = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

export default function RecordingStep2({ data, onComplete, onBack }) {
  const navigate = useNavigate();
  const [vocalChoice, setVocalChoice] = useState(
    data?.vocalChoice || VOCAL_CHOICES.NONE
  );
  const [selectedVocalists, setSelectedVocalists] = useState(
    data?.selectedVocalists || []
  );

  // Extract slot info from previous step
  const { bookingDate, bookingStartTime, bookingEndTime } = data || {};

  // Sync selectedVocalists and vocalChoice from data (when returning from VocalistSelectionPage)
  useEffect(() => {
    if (data) {
      // Always sync from data props to ensure we have the latest data
      if (data.selectedVocalists && Array.isArray(data.selectedVocalists)) {
        setSelectedVocalists(data.selectedVocalists);
      } else if (
        data.selectedVocalists === undefined ||
        data.selectedVocalists === null
      ) {
        // Only reset if explicitly undefined/null (not if it's an empty array)
        // Empty array means no vocalists selected, which is valid
      }

      if (data.vocalChoice) {
        setVocalChoice(data.vocalChoice);
      }
    }
  }, [data]);

  const handleVocalChoiceChange = e => {
    const newChoice = e.target.value;
    setVocalChoice(newChoice);

    // Reset selected vocalists if switching away from hiring options
    if (
      newChoice !== VOCAL_CHOICES.INTERNAL_ARTIST &&
      newChoice !== VOCAL_CHOICES.BOTH
    ) {
      setSelectedVocalists([]);
    }

    // Save vocalChoice to sessionStorage immediately
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
      flowData.step2 = {
        ...flowData.step2,
        vocalChoice: newChoice,
        // Clear selectedVocalists if switching away from hiring options
        ...(newChoice !== VOCAL_CHOICES.INTERNAL_ARTIST &&
        newChoice !== VOCAL_CHOICES.BOTH
          ? { selectedVocalists: [] }
          : {}),
      };
      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
    } catch (error) {
      console.error('Error saving vocalChoice:', error);
    }
  };

  const handleVocalistSelect = vocalist => {
    const isSelected = selectedVocalists.some(
      v => v.specialistId === vocalist.specialistId
    );

    if (isSelected) {
      // Remove vocalist from selection
      setSelectedVocalists(
        selectedVocalists.filter(v => v.specialistId !== vocalist.specialistId)
      );
    } else {
      // Add vocalist to selection (allow multiple)
      setSelectedVocalists([...selectedVocalists, vocalist]);
    }
  };

  const handleContinue = () => {
    // Validation
    if (
      (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
        vocalChoice === VOCAL_CHOICES.BOTH) &&
      selectedVocalists.length === 0
    ) {
      message.error('Please select at least one vocalist');
      return;
    }

    onComplete({
      vocalChoice,
      selectedVocalists,
    });
  };

  const needsVocalistSelection =
    vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
    vocalChoice === VOCAL_CHOICES.BOTH;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 2: Vocal Setup
        </Title>
        <Text className={styles.description}>
          Who will sing in this recording session?
        </Text>
      </div>

      {/* Slot info from previous step */}
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
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Vocal Choice Section */}
      <div className={styles.vocalChoiceSection}>
        <Radio.Group
          value={vocalChoice}
          onChange={handleVocalChoiceChange}
          className={styles.radioGroup}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Radio value={VOCAL_CHOICES.NONE} className={styles.radioOption}>
              <Space>
                <span className={styles.radioLabel}>
                  No vocal needed (instrumental / playback only)
                </span>
                <Tag color="default">Instrumental only</Tag>
              </Space>
            </Radio>

            <Radio
              value={VOCAL_CHOICES.CUSTOMER_SELF}
              className={styles.radioOption}
            >
              <Space>
                <UserOutlined />
                <span className={styles.radioLabel}>I will sing</span>
                <Tag color="green">Self-performance</Tag>
              </Space>
            </Radio>

            <Radio
              value={VOCAL_CHOICES.INTERNAL_ARTIST}
              className={styles.radioOption}
            >
              <Space>
                <TeamOutlined />
                <span className={styles.radioLabel}>
                  I want to hire an in-house vocalist
                </span>
                <Tag color="blue">Professional vocalist</Tag>
              </Space>
            </Radio>

            <Radio value={VOCAL_CHOICES.BOTH} className={styles.radioOption}>
              <Space>
                <TeamOutlined />
                <span className={styles.radioLabel}>
                  I will sing & hire in-house vocalist(s) (backing/duet)
                </span>
                <Tag color="purple">Collaboration</Tag>
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </div>

      {/* Vocalist Selection Section */}
      {needsVocalistSelection && (
        <div className={styles.vocalistSelectionSection}>
          <div className={styles.sectionHeader}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <div>
                <Title level={4}>Select Vocalist</Title>
                <Text type="secondary">
                  {vocalChoice === VOCAL_CHOICES.BOTH
                    ? 'Select vocalists to support you (backing/duet)'
                    : 'Choose a professional vocalist for the session'}
                </Text>
              </div>
              <Button
                type="default"
                icon={<SearchOutlined />}
                onClick={() => {
                  // Save callback data to sessionStorage
                  const callbackData = {
                    selectedVocalists: selectedVocalists,
                    bookingDate,
                    bookingStartTime,
                    bookingEndTime,
                  };
                  sessionStorage.setItem(
                    'recordingFlowVocalistCallback',
                    JSON.stringify(callbackData)
                  );

                  // Navigate to vocalist selection page
                  navigate('/recording-flow/vocalist-selection', {
                    state: {
                      fromFlow: true,
                      bookingDate,
                      bookingStartTime,
                      bookingEndTime,
                      allowMultiple: true,
                      maxSelections: 10, // Allow multiple selections (up to 10)
                      selectedVocalists: selectedVocalists.map(v => ({
                        specialistId: v.specialistId,
                        name: v.name,
                      })),
                    },
                  });
                }}
              >
                Browse All Vocalists
              </Button>
            </div>
          </div>

          {/* Only show selected vocalists summary */}
          {selectedVocalists.length > 0 ? (
            <div className={styles.selectedSummary} style={{ marginTop: 16 }}>
              <Text
                strong
                style={{ fontSize: 16, display: 'block', marginBottom: 12 }}
              >
                Selected Vocalist{selectedVocalists.length > 1 ? 's' : ''} (
                {selectedVocalists.length})
              </Text>
              <List
                dataSource={selectedVocalists}
                renderItem={vocalist => (
                  <List.Item
                    className={styles.selectedVocalistItem}
                    actions={[
                      <Button
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleVocalistSelect(vocalist)}
                        size="small"
                      >
                        Remove
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={48}
                          src={vocalist.avatarUrl}
                          icon={<UserOutlined />}
                        />
                      }
                      title={
                        <Space>
                          <Text strong>{vocalist.name}</Text>
                          {vocalist.rating && (
                            <Space size={4}>
                              <StarOutlined
                                style={{ color: '#faad14', fontSize: 12 }}
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {vocalist.rating.toFixed(1)}
                              </Text>
                            </Space>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          {vocalist.experienceYears && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {vocalist.experienceYears} years experience
                            </Text>
                          )}
                          {vocalist.hourlyRate && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(vocalist.hourlyRate)}
                              /hour
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ) : (
            <Alert
              message="No vocalists selected"
              description="Click 'Browse All Vocalists' to select vocalists for your session"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <Button size="large" onClick={onBack}>
          Back to Slot Selection
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleContinue}
          disabled={needsVocalistSelection && selectedVocalists.length === 0}
          className={styles.continueButton}
        >
          Continue to Instrument Setup
        </Button>
      </div>
    </Card>
  );
}
