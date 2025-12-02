// RecordingStep2.jsx - Chọn Vocalist (Optional)
import { useState, useEffect } from 'react';
import { Card, Button, Radio, Typography, message } from 'antd';
import { UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RecordingStep2.module.css';

const { Title, Text } = Typography;

export default function RecordingStep2({ data, onComplete, onSkip }) {
  const navigate = useNavigate();
  const [wantsVocalist, setWantsVocalist] = useState(
    data?.wantsVocalist !== undefined ? data.wantsVocalist : null
  );
  const [selectedVocalist, setSelectedVocalist] = useState(data?.vocalistId || null);

  // Check if returning from selection page - only run once on mount
  useEffect(() => {
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      if (flowDataStr) {
        const flowData = JSON.parse(flowDataStr);
        if (flowData.step2?.vocalistId && !selectedVocalist) {
          setSelectedVocalist(flowData.step2.vocalistId);
          setWantsVocalist(true);
          // Don't call onComplete here - let user confirm with Continue button
        }
      }
    } catch (error) {
      console.error('Error loading vocalist selection:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleChoice = (value) => {
    setWantsVocalist(value);
    // Don't call onComplete here - wait for Continue button
    // Reset selected vocalist if choosing "No"
    if (value === false) {
      setSelectedVocalist(null);
    }
  };

  const handleSelectVocalist = () => {
    // Save callback data to sessionStorage instead of passing function
    const callbackData = {
      step: 1,
      selectedVocalist,
      wantsVocalist: true,
    };
    sessionStorage.setItem('recordingFlowVocalistCallback', JSON.stringify(callbackData));
    
    // Navigate to singers page with flow context
    navigate('/recording-flow/vocalist-selection', {
      state: {
        fromFlow: true,
        step: 1,
        selectedVocalist,
      },
    });
  };

  const handleContinue = () => {
    if (wantsVocalist === true) {
      if (selectedVocalist) {
        onComplete({
          wantsVocalist: true,
          vocalistId: selectedVocalist,
        });
      } else {
        message.warning('Please select a vocalist or choose to skip');
      }
    } else if (wantsVocalist === false) {
      // When choosing "No", call onComplete with skip data, not onSkip
      onComplete({
        wantsVocalist: false,
        vocalistId: null,
      });
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 2: Select Vocalist (Optional)
        </Title>
        <Text className={styles.description}>
          Do you want to hire a vocalist for your recording session?
        </Text>
      </div>

      <div className={styles.choiceSection}>
        <Radio.Group
          value={wantsVocalist}
          onChange={(e) => handleChoice(e.target.value)}
          className={styles.radioGroup}
        >
          <div className={styles.radioContainer}>
            <Radio.Button value={true} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>Yes, I want to select a vocalist</div>
                  <div className={styles.radioDescription}>
                    Choose from our professional vocalists
                  </div>
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={false} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>No, I'll sing myself or bring my own vocalist</div>
                  <div className={styles.radioDescription}>
                    Skip vocalist selection
                  </div>
                </div>
              </div>
            </Radio.Button>
          </div>
        </Radio.Group>
      </div>

      {wantsVocalist === true && (
        <div className={styles.selectionSection}>
          {selectedVocalist ? (
            <div className={styles.selectedInfo}>
              <Text strong>Vocalist selected</Text>
              <Button
                type="link"
                onClick={handleSelectVocalist}
                style={{ marginLeft: 8 }}
              >
                Change selection
              </Button>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<UserOutlined />}
              onClick={handleSelectVocalist}
              className={styles.selectButton}
            >
              Select Vocalist
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
          disabled={wantsVocalist === null}
          className={styles.continueButton}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}

