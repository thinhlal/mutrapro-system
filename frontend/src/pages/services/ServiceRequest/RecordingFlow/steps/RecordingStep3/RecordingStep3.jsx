// RecordingStep3.jsx - Chọn Instrumentalists (Optional)
import { useState } from 'react';
import { Card, Button, Radio, Typography, Tag, Space } from 'antd';
import { TeamOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RecordingStep3.module.css';

const { Title, Text } = Typography;

export default function RecordingStep3({ data, onComplete, onSkip }) {
  const navigate = useNavigate();
  const [wantsInstrumentalists, setWantsInstrumentalists] = useState(
    data?.wantsInstrumentalists !== undefined
      ? data.wantsInstrumentalists
      : null
  );
  const [selectedInstrumentalists, setSelectedInstrumentalists] = useState(
    data?.instrumentalistIds || []
  );

  const handleChoice = value => {
    setWantsInstrumentalists(value);
    // Don't call onComplete here - wait for Continue button
    // Reset selected instrumentalists if choosing "No"
    if (value === false) {
      setSelectedInstrumentalists([]);
    }
  };

  const handleSelectInstrumentalists = () => {
    // Save callback data to sessionStorage
    const callbackData = {
      step: 2,
      selectedInstrumentalists,
      wantsInstrumentalists: true,
    };
    sessionStorage.setItem(
      'recordingFlowInstrumentalistCallback',
      JSON.stringify(callbackData)
    );

    // Navigate to instrumentalists selection page
    navigate('/recording-flow/instrumentalist-selection', {
      state: {
        fromFlow: true,
        step: 2,
        selectedInstrumentalists,
      },
    });
  };

  const handleContinue = () => {
    if (wantsInstrumentalists === true) {
      onComplete({
        wantsInstrumentalists: true,
        instrumentalistIds: selectedInstrumentalists,
      });
    } else if (wantsInstrumentalists === false) {
      // When choosing "No", call onComplete with skip data, not onSkip
      onComplete({
        wantsInstrumentalists: false,
        instrumentalistIds: [],
      });
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 3: Select Instrumentalists (Optional)
        </Title>
        <Text className={styles.description}>
          Do you want to hire instrumentalists for your recording session?
        </Text>
      </div>

      <div className={styles.choiceSection}>
        <Radio.Group
          value={wantsInstrumentalists}
          onChange={e => handleChoice(e.target.value)}
          className={styles.radioGroup}
        >
          <div className={styles.radioContainer}>
            <Radio.Button value={true} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>
                    Yes, I want to select instrumentalists
                  </div>
                  <div className={styles.radioDescription}>
                    Choose from our professional instrumentalists by instrument
                    type
                  </div>
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={false} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>
                    No, I'll play myself or bring my own instrumentalists
                  </div>
                  <div className={styles.radioDescription}>
                    Skip instrumentalist selection
                  </div>
                </div>
              </div>
            </Radio.Button>
          </div>
        </Radio.Group>
      </div>

      {wantsInstrumentalists === true && (
        <div className={styles.selectionSection}>
          {selectedInstrumentalists.length > 0 ? (
            <div className={styles.selectedInfo}>
              <Text strong>
                {selectedInstrumentalists.length} instrumentalist(s) selected
              </Text>
              <Button
                type="link"
                onClick={handleSelectInstrumentalists}
                style={{ marginLeft: 8 }}
              >
                Change selection
              </Button>
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  {selectedInstrumentalists.map((id, idx) => (
                    <Tag key={idx} color="blue">
                      Instrumentalist #{id.slice(0, 8)}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<TeamOutlined />}
              onClick={handleSelectInstrumentalists}
              className={styles.selectButton}
            >
              Select Instrumentalists
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
          disabled={wantsInstrumentalists === null}
          className={styles.continueButton}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
