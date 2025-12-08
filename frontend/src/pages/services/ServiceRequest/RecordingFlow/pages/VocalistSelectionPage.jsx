// VocalistSelectionPage.jsx - Trang chọn vocalist trong flow
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Typography, Space, Spin, message, Radio, Select } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { getVocalists } from '../../../../../services/specialistService';
import { MUSIC_GENRES } from '../../../../../constants/musicOptionsConstants';
import VocalistSelectionCard from './components/VocalistSelectionCard';
import styles from './VocalistSelectionPage.module.css';

const { Title, Text } = Typography;

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
  
  const [vocalists, setVocalists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState('ALL'); // ALL, FEMALE, MALE
  const [selectedGenres, setSelectedGenres] = useState([]); // Array of selected genres

  useEffect(() => {
    if (!fromFlow && !fromArrangement) {
      // If not from flow, redirect to normal singers page
      navigate('/pros/singers/female');
    }
  }, [fromFlow, fromArrangement, navigate]);

  // Lấy danh sách genres đầy đủ từ constants
  const availableGenres = MUSIC_GENRES.map(g => g.value);

  // Fetch vocalists từ backend với filter
  useEffect(() => {
    fetchVocalists();
  }, [genderFilter, selectedGenres]);

  const fetchVocalists = async () => {
    setLoading(true);
    try {
      // Chuẩn bị params
      const gender = genderFilter !== 'ALL' ? genderFilter : null;
      const genres = selectedGenres.length > 0 ? selectedGenres : null;
      
      // Fetch vocalists với filter từ backend
      const response = await getVocalists(gender, genres);
      if (response?.data) {
        setVocalists(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách vocalists');
    } finally {
      setLoading(false);
    }
  };

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
          const selectedVocalistsWithNames = selectedIds.map(id => {
            const vocalist = vocalists.find(v => v.specialistId === id);
            return vocalist 
              ? { id: vocalist.specialistId, name: vocalist.fullName || `Vocalist ${id}` } 
              : { id, name: `Vocalist ${id}` };
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
  
  const isSelected = (specialistId) => {
    if (allowMultiple) {
      return selectedIds.includes(specialistId);
    }
    return selectedId === specialistId;
  };
  
  const canSelectMore = allowMultiple ? selectedIds.length < maxSelections : true;

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
        <div style={{ marginBottom: 20 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
              <Text strong>Lọc theo giới tính: </Text>
              <Radio.Group 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="ALL">Tất cả</Radio.Button>
                <Radio.Button value="FEMALE">Nữ</Radio.Button>
                <Radio.Button value="MALE">Nam</Radio.Button>
              </Radio.Group>
            </Space>
            <Space wrap>
              <Text strong>Lọc theo thể loại: </Text>
              <Select
                mode="multiple"
                placeholder="Chọn thể loại (có thể chọn nhiều)"
                value={selectedGenres}
                onChange={setSelectedGenres}
                style={{ minWidth: 300 }}
                allowClear
                maxTagCount="responsive"
              >
                {availableGenres.map(genre => (
                  <Select.Option key={genre} value={genre}>
                    {genre}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Text type="secondary">
              ({vocalists.length} vocalist{vocalists.length !== 1 ? 's' : ''})
            </Text>
          </Space>
        </div>
        <Spin spinning={loading}>
          <div className="row">
            {vocalists.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '40px', width: '100%' }}>
                <p>Không có vocalist nào</p>
              </div>
            ) : (
              vocalists.map(vocalist => (
                <VocalistSelectionCard
                  key={vocalist.specialistId}
                  specialist={vocalist}
                  isSelected={isSelected(vocalist.specialistId)}
                  selectedId={allowMultiple ? selectedIds : selectedId}
                  onSelect={handleSelect}
                  disabled={allowMultiple && !canSelectMore && !isSelected(vocalist.specialistId)}
                />
              ))
            )}
          </div>
        </Spin>
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
