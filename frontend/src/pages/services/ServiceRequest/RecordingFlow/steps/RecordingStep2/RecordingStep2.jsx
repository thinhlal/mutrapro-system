// RecordingStep2.jsx - Vocal Setup
import { useState, useEffect } from 'react';
import { Card, Button, Radio, Typography, message, Space, Tag } from 'antd';
import { UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RecordingStep2.module.css';

const { Title, Text } = Typography;

// Mock data - sẽ thay bằng API call thực tế
const MOCK_VOCALISTS = [
  { id: 'vocalist-1', name: 'Nguyễn Văn A', rating: 4.8, genres: ['Pop', 'Ballad'] },
  { id: 'vocalist-2', name: 'Trần Thị B', rating: 4.9, genres: ['Jazz', 'Soul'] },
  { id: 'vocalist-3', name: 'Lê Văn C', rating: 4.7, genres: ['Rock', 'Metal'] },
];

// Enum values
const VOCAL_CHOICE = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

export default function RecordingStep2({ data, onComplete }) {
  const navigate = useNavigate();
  const [vocalChoice, setVocalChoice] = useState(
    data?.vocalChoice || null
  );
  const [selectedVocalists, setSelectedVocalists] = useState(
    data?.vocalistIds || []
  );

  // Check if returning from selection page
  useEffect(() => {
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      if (flowDataStr) {
        const flowData = JSON.parse(flowDataStr);
        if (flowData.step2?.vocalistIds && flowData.step2.vocalistIds.length > 0) {
          setSelectedVocalists(flowData.step2.vocalistIds);
          // Auto-set choice if not set
          if (!vocalChoice) {
            const existingChoice = flowData.step2?.vocalChoice;
            if (existingChoice === VOCAL_CHOICE.INTERNAL_ARTIST || existingChoice === VOCAL_CHOICE.BOTH) {
              setVocalChoice(existingChoice);
            } else {
              setVocalChoice(VOCAL_CHOICE.INTERNAL_ARTIST);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading vocalist selection:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = value => {
    setVocalChoice(value);
    // Reset selected vocalists if choosing "NONE" or "CUSTOMER_SELF"
    if (value === VOCAL_CHOICE.NONE || value === VOCAL_CHOICE.CUSTOMER_SELF) {
      setSelectedVocalists([]);
    }
  };

  const handleSelectVocalists = () => {
    // Save callback data to sessionStorage
    const callbackData = {
      step: 1,
      selectedVocalists,
      vocalChoice,
    };
    sessionStorage.setItem(
      'recordingFlowVocalistCallback',
      JSON.stringify(callbackData)
    );

    // Navigate to vocalist selection page
    navigate('/recording-flow/vocalist-selection', {
      state: {
        fromFlow: true,
        step: 1,
        selectedVocalists,
        bookingDate: data?.bookingDate,
        bookingStartTime: data?.bookingStartTime,
        bookingEndTime: data?.bookingEndTime,
      },
    });
  };

  const handleContinue = () => {
    if (vocalChoice === null) {
      message.warning('Please select an option for vocal setup');
      return;
    }

    // Validate: If INTERNAL_ARTIST or BOTH, must have selected vocalists
    if (
      (vocalChoice === VOCAL_CHOICE.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICE.BOTH) &&
      selectedVocalists.length === 0
    ) {
      message.warning('Please select at least one vocalist');
      return;
    }

    // Prepare participants data
    const participants = [];

    // Add CUSTOMER_SELF vocal participant if applicable
    if (vocalChoice === VOCAL_CHOICE.CUSTOMER_SELF || vocalChoice === VOCAL_CHOICE.BOTH) {
      participants.push({
        roleType: 'VOCAL',
        performerSource: 'CUSTOMER_SELF',
        skillId: null, // VOCAL không cần skill_id
        participantFee: 0,
      });
    }

    // Add INTERNAL_ARTIST vocal participants if applicable
    if (vocalChoice === VOCAL_CHOICE.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICE.BOTH) {
      selectedVocalists.forEach((vocalistId, index) => {
        participants.push({
          roleType: 'VOCAL',
          performerSource: 'INTERNAL_ARTIST',
          specialistId: vocalistId,
          skillId: null, // VOCAL không cần skill_id
          participantFee: 500000, // Mock fee - sẽ lấy từ API
          isPrimary: index === 0,
        });
      });
    }

    onComplete({
      vocalChoice,
      vocalistIds: selectedVocalists,
      vocalParticipants: participants,
    });
  };

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

      <div className={styles.choiceSection}>
        <Radio.Group
          value={vocalChoice}
          onChange={e => handleChoice(e.target.value)}
          className={styles.radioGroup}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Radio.Button value={VOCAL_CHOICE.NONE} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div className={styles.radioTitle}>No vocal recording</div>
                <div className={styles.radioDescription}>
                  I will not record any vocals in this session
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={VOCAL_CHOICE.CUSTOMER_SELF} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div className={styles.radioTitle}>I will sing myself</div>
                <div className={styles.radioDescription}>
                  I will perform vocals myself
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={VOCAL_CHOICE.INTERNAL_ARTIST} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div className={styles.radioTitle}>Hire internal vocalist</div>
                <div className={styles.radioDescription}>
                  Choose from our professional vocalists
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={VOCAL_CHOICE.BOTH} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div className={styles.radioTitle}>I will sing + hire additional vocalist</div>
                <div className={styles.radioDescription}>
                  I will sing and also hire a backing vocalist or duet partner
                </div>
              </div>
            </Radio.Button>
          </Space>
        </Radio.Group>
      </div>

      {(vocalChoice === VOCAL_CHOICE.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICE.BOTH) && (
        <div className={styles.selectionSection}>
          {selectedVocalists.length > 0 ? (
            <div className={styles.selectedInfo}>
              <Text strong>
                {selectedVocalists.length} vocalist(s) selected
              </Text>
              <Button
                type="link"
                onClick={handleSelectVocalists}
                style={{ marginLeft: 8 }}
              >
                Change selection
              </Button>
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  {selectedVocalists.map((id, idx) => {
                    const vocalist = MOCK_VOCALISTS.find(v => v.id === id);
                    return (
                      <Tag key={idx} color="blue">
                        {vocalist ? vocalist.name : `Vocalist ${id.slice(0, 8)}`}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<UserOutlined />}
              onClick={handleSelectVocalists}
              className={styles.selectButton}
            >
              Select Vocalist(s)
            </Button>
          )}
        </div>
      )}

      <div className={styles.actionRow}>
        <Button
          type="primary"
          size="large"
          icon={<ArrowRightOutlined />}
          onClick={handleContinue}
          disabled={vocalChoice === null}
          className={styles.continueButton}
        >
          Continue to Instrument Setup
        </Button>
      </div>
    </Card>
  );
}
