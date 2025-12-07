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
  const { 
    fromFlow, 
    selectedVocalist, 
    selectedVocalists,
    allowMultiple = false,
    maxSelections = 1,
    fromArrangement = false
  } = location.state || {};
  
  const [selectedId, setSelectedId] = useState(selectedVocalist || null);
  const [selectedIds, setSelectedIds] = useState(() => {
    if (allowMultiple && selectedVocalists) {
      return Array.isArray(selectedVocalists) ? selectedVocalists : [selectedVocalists];
    }
    return [];
  });

  useEffect(() => {
    if (!fromFlow && !fromArrangement) {
      // If not from flow, redirect to normal singers page
      navigate('/pros/singers/female');
    }
  }, [fromFlow, fromArrangement, navigate]);

  const handleSelect = singerId => {
    if (allowMultiple) {
      // Multiple selection mode
      setSelectedIds(prev => {
        if (prev.includes(singerId)) {
          // Deselect
          return prev.filter(id => id !== singerId);
        } else {
          // Select (check max limit)
          if (prev.length >= maxSelections) {
            return prev; // Don't add if reached max
          }
          return [...prev, singerId];
        }
      });
    } else {
      // Single selection mode
      setSelectedId(singerId);
    }
  };

  const handleConfirm = () => {
    if (allowMultiple) {
      if (selectedIds.length === 0) {
        return; // At least select one
      }
    } else {
      if (!selectedId) {
        return;
      }
    }

    // Get callback data from sessionStorage
    try {
      const callbackDataStr = sessionStorage.getItem(
        fromArrangement ? 'arrangementVocalistCallback' : 'recordingFlowVocalistCallback'
      );
      if (callbackDataStr) {
        const callbackData = JSON.parse(callbackDataStr);
        
        if (fromArrangement && allowMultiple) {
          // For arrangement with recording - save multiple selections with names
          const allSingers = [...FEMALE_SINGERS_DATA, ...MALE_SINGERS_DATA];
          const selectedVocalistsWithNames = selectedIds.map(id => {
            const singer = allSingers.find(s => s.id === id);
            return singer ? { id: singer.id, name: singer.name } : { id, name: `Vocalist ${id}` };
          });
          
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
          flowData.step2 = {
            wantsVocalist: true,
            vocalistIds: selectedVocalistsWithNames,
          };
          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
          sessionStorage.removeItem('arrangementVocalistCallback');
          
          // Navigate back to arrangement page
          navigate(-1);
        } else {
          // For recording flow - single selection
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
          flowData.step2 = {
            wantsVocalist: true,
            vocalistId: selectedId,
          };
          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
          sessionStorage.removeItem('recordingFlowVocalistCallback');
          navigate('/recording-flow', { state: { step: 1 } });
        }
      }
    } catch (error) {
      console.error('Error saving vocalist selection:', error);
    }
  };

  const handleBack = () => {
    if (fromArrangement) {
      navigate(-1);
    } else {
      navigate('/recording-flow', { state: { step: 1 } });
    }
  };
  
  const isSelected = (singerId) => {
    if (allowMultiple) {
      return selectedIds.includes(singerId);
    }
    return selectedId === singerId;
  };
  
  const canSelectMore = allowMultiple ? selectedIds.length < maxSelections : true;

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
            {allowMultiple ? 'Chọn ca sĩ ưu tiên' : 'Select Vocalist'}
          </Title>
          <p className={styles.description}>
            {allowMultiple 
              ? `Chọn ${maxSelections === 2 ? '1-2' : '1'} ca sĩ bạn thích (đã chọn: ${selectedIds.length}/${maxSelections})`
              : 'Choose a vocalist for your recording session'}
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
                  isSelected={isSelected(singer.id)}
                  selectedId={allowMultiple ? selectedIds : selectedId}
                  onSelect={handleSelect}
                  disabled={allowMultiple && !canSelectMore && !isSelected(singer.id)}
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
                  isSelected={isSelected(singer.id)}
                  selectedId={allowMultiple ? selectedIds : selectedId}
                  onSelect={handleSelect}
                  disabled={allowMultiple && !canSelectMore && !isSelected(singer.id)}
                />
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {(allowMultiple ? selectedIds.length > 0 : selectedId) && (
        <Card className={styles.actionCard}>
          <Space>
            <Button size="large" onClick={handleBack}>
              Hủy
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={handleConfirm}
            >
              {allowMultiple 
                ? `Xác nhận (${selectedIds.length} ca sĩ)`
                : 'Confirm Selection'}
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
}
