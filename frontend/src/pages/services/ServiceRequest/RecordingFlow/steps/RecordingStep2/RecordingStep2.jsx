// RecordingStep2.jsx - Vocal Setup (who will sing?)
import { useState, useEffect } from 'react';
import {
  Card,
  Radio,
  Button,
  Space,
  Typography,
  Alert,
  List,
  Avatar,
  Tag,
  Checkbox,
  Spin,
  Empty,
  message,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { getAvailableArtistsForRequest } from '../../../../../../services/studioBookingService';
import styles from './RecordingStep2.module.css';

const { Title, Text } = Typography;

const VOCAL_CHOICES = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

export default function RecordingStep2({ data, onComplete, onBack }) {
  const [vocalChoice, setVocalChoice] = useState(
    data?.vocalChoice || VOCAL_CHOICES.NONE
  );
  const [availableVocalists, setAvailableVocalists] = useState([]);
  const [selectedVocalists, setSelectedVocalists] = useState(
    data?.selectedVocalists || []
  );
  const [loadingVocalists, setLoadingVocalists] = useState(false);

  // Extract slot info from previous step
  const { bookingDate, bookingStartTime, bookingEndTime } = data || {};

  // Fetch available vocalists when user chooses to hire internal artists
  useEffect(() => {
    const needsVocalists =
      vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
      vocalChoice === VOCAL_CHOICES.BOTH;

    if (
      !needsVocalists ||
      !bookingDate ||
      !bookingStartTime ||
      !bookingEndTime
    ) {
      setAvailableVocalists([]);
      return;
    }

    const fetchVocalists = async () => {
      try {
        setLoadingVocalists(true);
        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          null, // skillId = null for vocalists
          'VOCAL', // roleType
          null // genres (optional)
        );

        if (response?.status === 'success' && response?.data) {
          setAvailableVocalists(response.data);
        } else {
          setAvailableVocalists([]);
          message.warning('Unable to load vocalist list');
        }
      } catch (error) {
        console.error('Error fetching vocalists:', error);
        message.error('Failed to load vocalist list');
        setAvailableVocalists([]);
      } finally {
        setLoadingVocalists(false);
      }
    };

    fetchVocalists();
  }, [vocalChoice, bookingDate, bookingStartTime, bookingEndTime]);

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
            <Title level={4}>Select Vocalist</Title>
            <Text type="secondary">
              {vocalChoice === VOCAL_CHOICES.BOTH
                ? 'Select vocalists to support you (backing/duet)'
                : 'Choose a professional vocalist for the session'}
            </Text>
          </div>

          {loadingVocalists ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Loading vocalists..." />
            </div>
          ) : availableVocalists.length === 0 ? (
            <Empty
              description="No vocalists available for this slot"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <>
              <Alert
                message={`Found ${availableVocalists.length} vocalist(s) available`}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <List
                dataSource={availableVocalists}
                renderItem={vocalist => {
                  const isSelected = selectedVocalists.some(
                    v => v.specialistId === vocalist.specialistId
                  );
                  const isAvailable = vocalist.isAvailable !== false;

                  return (
                    <List.Item
                      key={vocalist.specialistId}
                      className={`${styles.vocalistItem} ${
                        isSelected ? styles.selected : ''
                      } ${!isAvailable ? styles.unavailable : ''}`}
                      onClick={() =>
                        isAvailable && handleVocalistSelect(vocalist)
                      }
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size={64}
                            src={vocalist.avatarUrl}
                            icon={<UserOutlined />}
                          />
                        }
                        title={
                          <Space>
                            <Text strong>{vocalist.name}</Text>
                            {isSelected && (
                              <CheckCircleOutlined
                                style={{ color: '#52c41a' }}
                              />
                            )}
                            {!isAvailable && <Tag color="red">Busy</Tag>}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4}>
                            {vocalist.role && (
                              <Text type="secondary">
                                Role: {vocalist.role}
                              </Text>
                            )}
                            {vocalist.experienceYears && (
                              <Text type="secondary">
                                Experience: {vocalist.experienceYears} years
                              </Text>
                            )}
                            {vocalist.genres && vocalist.genres.length > 0 && (
                              <Space wrap size={4}>
                                {vocalist.genres.map(genre => (
                                  <Tag key={genre} size="small">
                                    {genre}
                                  </Tag>
                                ))}
                              </Space>
                            )}
                          </Space>
                        }
                      />
                      <div className={styles.vocalistStats}>
                        {vocalist.rating && (
                          <Space>
                            <StarOutlined style={{ color: '#faad14' }} />
                            <Text>{vocalist.rating.toFixed(1)}</Text>
                          </Space>
                        )}
                        {vocalist.totalProjects && (
                          <Text type="secondary">
                            {vocalist.totalProjects} projects
                          </Text>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
                className={styles.vocalistList}
              />

              {selectedVocalists.length > 0 && (
                <div className={styles.selectedSummary}>
                  <Text strong>
                    Selected Vocalist{selectedVocalists.length > 1 ? 's' : ''} (
                    {selectedVocalists.length}):
                  </Text>
                  <Space wrap style={{ marginTop: 8 }}>
                    {selectedVocalists.map(v => (
                      <Tag
                        key={v.specialistId}
                        color="blue"
                        closable
                        onClose={() => handleVocalistSelect(v)}
                      >
                        {v.name}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </>
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
          disabled={
            needsVocalistSelection &&
            (loadingVocalists || selectedVocalists.length === 0)
          }
          className={styles.continueButton}
        >
          Continue to Instrument Setup
        </Button>
      </div>
    </Card>
  );
}
