// RecordingStep4.jsx - Select Equipment for Rental (Optional)
import { useState } from 'react';
import { Card, Button, Radio, Space, Typography, Tag } from 'antd';
import { ToolOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RecordingStep4.module.css';

const { Title, Text } = Typography;

export default function RecordingStep4({ data, onComplete, onSkip }) {
  const navigate = useNavigate();
  const [wantsEquipment, setWantsEquipment] = useState(
    data?.wantsEquipment !== undefined ? data.wantsEquipment : null
  );
  const [selectedEquipment, setSelectedEquipment] = useState(
    data?.equipmentIds || []
  );

  const handleChoice = (value) => {
    setWantsEquipment(value);
    // Don't call onComplete here - wait for Continue button
    // Reset selected equipment if choosing "No"
    if (value === false) {
      setSelectedEquipment([]);
    }
  };

  const handleSelectEquipment = () => {
    // Save callback data to sessionStorage
    const callbackData = {
      step: 3,
      selectedEquipment,
      wantsEquipment: true,
    };
    sessionStorage.setItem('recordingFlowEquipmentCallback', JSON.stringify(callbackData));
    
    // Navigate to equipment selection page
    navigate('/recording-flow/equipment-selection', {
      state: {
        fromFlow: true,
        step: 3,
        selectedEquipment,
      },
    });
  };

  const handleContinue = () => {
    if (wantsEquipment === true) {
      onComplete({
        wantsEquipment: true,
        equipmentIds: selectedEquipment,
      });
    } else if (wantsEquipment === false) {
      // When choosing "No", call onComplete with skip data, not onSkip
      onComplete({
        wantsEquipment: false,
        equipmentIds: [],
      });
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 4: Select Equipment for Rental (Optional)
        </Title>
        <Text className={styles.description}>
          Do you want to rent equipment for your recording session?
        </Text>
      </div>

      <div className={styles.choiceSection}>
        <Radio.Group
          value={wantsEquipment}
          onChange={(e) => handleChoice(e.target.value)}
          className={styles.radioGroup}
        >
          <div className={styles.radioContainer}>
            <Radio.Button value={true} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>Yes, I want to rent equipment</div>
                  <div className={styles.radioDescription}>
                    Choose from our available equipment
                  </div>
                </div>
              </div>
            </Radio.Button>

            <Radio.Button value={false} className={styles.radioButton}>
              <div className={styles.radioContent}>
                <div>
                  <div className={styles.radioTitle}>No, I'll bring my own equipment</div>
                  <div className={styles.radioDescription}>
                    Skip equipment selection
                  </div>
                </div>
              </div>
            </Radio.Button>
          </div>
        </Radio.Group>
      </div>

      {wantsEquipment === true && (
        <div className={styles.selectionSection}>
          {selectedEquipment.length > 0 ? (
            <div className={styles.selectedInfo}>
              <Text strong>
                {selectedEquipment.length} equipment(s) selected
              </Text>
              <Button
                type="link"
                onClick={handleSelectEquipment}
                style={{ marginLeft: 8 }}
              >
                Change selection
              </Button>
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  {selectedEquipment.map((id, idx) => (
                    <Tag key={idx} color="green">
                      Equipment #{id.slice(0, 8)}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<ToolOutlined />}
              onClick={handleSelectEquipment}
              className={styles.selectButton}
            >
              Select Equipment
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
          disabled={wantsEquipment === null}
          className={styles.continueButton}
        >
          Continue to Booking
        </Button>
      </div>
    </Card>
  );
}

