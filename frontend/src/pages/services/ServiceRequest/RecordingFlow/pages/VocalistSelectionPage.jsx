// VocalistSelectionPage.jsx - Trang chọn vocalist trong flow
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Tabs, Typography, Space } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import {
  FEMALE_SINGERS_DATA,
  MALE_SINGERS_DATA,
} from '../../../../../constants/index';
import VocalistSelectionCard from './components/VocalistSelectionCard';
import styles from './VocalistSelectionPage.module.css';

const { Title } = Typography;
const { TabPane } = Tabs;

export default function VocalistSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fromFlow, selectedVocalist } = location.state || {};
  const [selectedId, setSelectedId] = useState(selectedVocalist || null);

  useEffect(() => {
    if (!fromFlow) {
      // If not from flow, redirect to normal singers page
      navigate('/pros/singers/female');
    }
  }, [fromFlow, navigate]);

  const handleSelect = singerId => {
    setSelectedId(singerId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      // Get callback data from sessionStorage
      try {
        const callbackDataStr = sessionStorage.getItem(
          'recordingFlowVocalistCallback'
        );
        if (callbackDataStr) {
          const callbackData = JSON.parse(callbackDataStr);
          // Save selected vocalist to flow data
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
          flowData.step2 = {
            wantsVocalist: true,
            vocalistId: selectedId,
          };
          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
          // Clear callback data
          sessionStorage.removeItem('recordingFlowVocalistCallback');
        }
      } catch (error) {
        console.error('Error saving vocalist selection:', error);
      }
      navigate('/recording-flow', { state: { step: 1 } });
    }
  };

  const handleBack = () => {
    navigate('/recording-flow', { state: { step: 1 } });
  };

  if (!fromFlow) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <div className={styles.header}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className={styles.backButton}
          >
            Back to Flow
          </Button>
          <Title level={2} className={styles.title}>
            Select Vocalist
          </Title>
          <p className={styles.description}>
            Choose a vocalist for your recording session
          </p>
        </div>
      </Card>

      <Card className={styles.contentCard}>
        <Tabs defaultActiveKey="female" size="large">
          <TabPane tab="Female Singers" key="female">
            <div className="row">
              {FEMALE_SINGERS_DATA.map(singer => (
                <VocalistSelectionCard
                  key={singer.id}
                  singer={singer}
                  isSelected={selectedId === singer.id}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </TabPane>
          <TabPane tab="Male Singers" key="male">
            <div className="row">
              {MALE_SINGERS_DATA.map(singer => (
                <VocalistSelectionCard
                  key={singer.id}
                  singer={singer}
                  isSelected={selectedId === singer.id}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </TabPane>
        </Tabs>
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
  );
}
