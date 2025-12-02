// EquipmentSelectionPage.jsx - Trang chọn equipment
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Typography, Space, Tag, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import styles from './EquipmentSelectionPage.module.css';

const { Title, Text } = Typography;

// Mock data - sẽ thay bằng API call thực tế
const EQUIPMENT_LIST = [
  {
    id: 'e1',
    name: 'Yamaha C3 Piano',
    brand: 'Yamaha',
    rentalFee: 500000,
    available: 2,
  },
  {
    id: 'e2',
    name: 'Fender Stratocaster',
    brand: 'Fender',
    rentalFee: 300000,
    available: 3,
  },
  {
    id: 'e3',
    name: 'Pearl Drum Kit',
    brand: 'Pearl',
    rentalFee: 400000,
    available: 1,
  },
  {
    id: 'e4',
    name: 'Audio Interface',
    brand: 'Focusrite',
    rentalFee: 200000,
    available: 5,
  },
];

export default function EquipmentSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fromFlow, selectedEquipment } = location.state || {};
  const [selectedIds, setSelectedIds] = useState(selectedEquipment || []);

  useEffect(() => {
    if (!fromFlow) {
      navigate('/recording-flow', { state: { step: 3 } });
    }
  }, [fromFlow, navigate]);

  const handleToggle = id => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    // Save selected equipment to flow data
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
      flowData.step4 = {
        wantsEquipment: true,
        equipmentIds: selectedIds,
      };
      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
      // Clear callback data
      sessionStorage.removeItem('recordingFlowEquipmentCallback');
    } catch (error) {
      console.error('Error saving equipment selection:', error);
    }
    navigate('/recording-flow', {
      state: { step: 3, returnFromSelection: true },
    });
  };

  const handleBack = () => {
    navigate('/recording-flow', { state: { step: 3 } });
  };

  const totalFee = EQUIPMENT_LIST.filter(eq =>
    selectedIds.includes(eq.id)
  ).reduce((sum, eq) => sum + eq.rentalFee, 0);

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
            Select Equipment for Rental
          </Title>
          <p className={styles.description}>
            Choose equipment to rent for your recording session
          </p>
        </div>
      </Card>

      <Card className={styles.contentCard}>
        {EQUIPMENT_LIST.length > 0 ? (
          <div className="row">
            {EQUIPMENT_LIST.map(equipment => (
              <div
                key={equipment.id}
                className="col-12 col-md-6 col-lg-4 mb-4"
                onClick={() => handleToggle(equipment.id)}
              >
                <Card
                  hoverable
                  className={`${styles.equipmentCard} ${
                    selectedIds.includes(equipment.id) ? styles.selected : ''
                  }`}
                >
                  <div className={styles.cardContent}>
                    <ToolOutlined className={styles.icon} />
                    <div className={styles.info}>
                      <Title level={5} className={styles.name}>
                        {equipment.name}
                      </Title>
                      <Text type="secondary">{equipment.brand}</Text>
                      <div className={styles.details}>
                        <Tag color="green">
                          {equipment.rentalFee.toLocaleString('vi-VN')} VND
                        </Tag>
                        <Tag color="blue">Available: {equipment.available}</Tag>
                      </div>
                    </div>
                    {selectedIds.includes(equipment.id) && (
                      <div className={styles.checkOverlay}>
                        <CheckOutlined className={styles.checkIcon} />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="No equipment available" />
        )}
      </Card>

      {selectedIds.length > 0 && (
        <Card className={styles.actionCard}>
          <Space>
            <Text strong>
              {selectedIds.length} selected • Total:{' '}
              {totalFee.toLocaleString('vi-VN')} VND
            </Text>
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
