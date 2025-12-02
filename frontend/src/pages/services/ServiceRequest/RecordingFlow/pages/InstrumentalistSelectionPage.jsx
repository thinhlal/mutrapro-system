// InstrumentalistSelectionPage.jsx - Trang chọn instrumentalists theo nhạc cụ
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Tabs, Typography, Space, Tag, Empty } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, UserOutlined } from '@ant-design/icons';
import styles from './InstrumentalistSelectionPage.module.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Mock data - sẽ thay bằng API call thực tế
const INSTRUMENTALISTS_BY_INSTRUMENT = {
  piano: [
    { id: 'p1', name: 'John Piano', rating: 4.8, experience: '10 years' },
    { id: 'p2', name: 'Jane Keys', rating: 4.9, experience: '15 years' },
  ],
  guitar: [
    { id: 'g1', name: 'Mike Guitar', rating: 4.7, experience: '8 years' },
    { id: 'g2', name: 'Sarah Strings', rating: 4.9, experience: '12 years' },
  ],
  drums: [
    { id: 'd1', name: 'Tom Drums', rating: 4.8, experience: '10 years' },
  ],
  bass: [
    { id: 'b1', name: 'Bob Bass', rating: 4.6, experience: '7 years' },
  ],
};

export default function InstrumentalistSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fromFlow, selectedInstrumentalists } = location.state || {};
  const [selectedIds, setSelectedIds] = useState(selectedInstrumentalists || []);

  useEffect(() => {
    if (!fromFlow) {
      navigate('/recording-flow', { state: { step: 2 } });
    }
  }, [fromFlow, navigate]);

  const handleToggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    // Save selected instrumentalists to flow data
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
      flowData.step3 = {
        wantsInstrumentalists: true,
        instrumentalistIds: selectedIds,
      };
      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
      // Clear callback data
      sessionStorage.removeItem('recordingFlowInstrumentalistCallback');
    } catch (error) {
      console.error('Error saving instrumentalist selection:', error);
    }
    navigate('/recording-flow', { state: { step: 2, returnFromSelection: true } });
  };

  const handleBack = () => {
    navigate('/recording-flow', { state: { step: 2 } });
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
            Select Instrumentalists
          </Title>
          <p className={styles.description}>
            Choose instrumentalists by instrument type
          </p>
        </div>
      </Card>

      <Card className={styles.contentCard}>
        <Tabs defaultActiveKey="piano" size="large">
          {Object.entries(INSTRUMENTALISTS_BY_INSTRUMENT).map(([instrument, list]) => (
            <TabPane tab={instrument.charAt(0).toUpperCase() + instrument.slice(1)} key={instrument}>
              <div className="row">
                {list.length > 0 ? (
                  list.map(instrumentalist => (
                    <div
                      key={instrumentalist.id}
                      className="col-12 col-md-6 col-lg-4 mb-4"
                      onClick={() => handleToggle(instrumentalist.id)}
                    >
                      <Card
                        hoverable
                        className={`${styles.instrumentalistCard} ${
                          selectedIds.includes(instrumentalist.id) ? styles.selected : ''
                        }`}
                      >
                        <div className={styles.cardContent}>
                          <UserOutlined className={styles.avatar} />
                          <div className={styles.info}>
                            <Title level={5} className={styles.name}>
                              {instrumentalist.name}
                            </Title>
                            <Text type="secondary">{instrumentalist.experience}</Text>
                            <div className={styles.rating}>
                              <Tag color="gold">⭐ {instrumentalist.rating}</Tag>
                            </div>
                          </div>
                          {selectedIds.includes(instrumentalist.id) && (
                            <div className={styles.checkOverlay}>
                              <CheckOutlined className={styles.checkIcon} />
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <Empty description="No instrumentalists available" />
                )}
              </div>
            </TabPane>
          ))}
        </Tabs>
      </Card>

      {selectedIds.length > 0 && (
        <Card className={styles.actionCard}>
          <Space>
            <Text strong>{selectedIds.length} selected</Text>
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

