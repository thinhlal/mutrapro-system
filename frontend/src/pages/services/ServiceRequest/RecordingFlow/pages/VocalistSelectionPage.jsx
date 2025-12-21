// VocalistSelectionPage.jsx - Vocalist selection page in flow
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Spin,
  message,
  Radio,
  Select,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { getVocalists } from '../../../../../services/specialistService';
import { MUSIC_GENRES } from '../../../../../constants/musicOptionsConstants';
import VocalistSelectionCard from './components/VocalistSelectionCard';
import Header from '../../../../../components/common/Header/Header';
import bannerImage from '../../../../../assets/images/ChooseSingerBanner/BannerSing.png';
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
    maxSelections,
    fromArrangement = false,
  } = location.state || {};

  // Set default maxSelections based on context
  // - Arrangement with recording: max 2 preferred vocalists
  // - Recording flow: max 10 (or unlimited)
  const effectiveMaxSelections = allowMultiple
    ? maxSelections ||
      (fromArrangement ? 2 : 10) // Default: 2 for arrangement, 10 for recording flow
    : 1;

  const [selectedId, setSelectedId] = useState(selectedVocalist || null);
  const [selectedIds, setSelectedIds] = useState(() => {
    if (allowMultiple && selectedVocalists) {
      const ids = Array.isArray(selectedVocalists)
        ? selectedVocalists
        : [selectedVocalists];
      // Extract specialistId if it's an object
      return ids.map(v =>
        typeof v === 'object' ? v.specialistId || v.id : v
      );
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

  // Get full list of genres from constants
  const availableGenres = MUSIC_GENRES.map(g => g.value);

  // Fetch vocalists from backend with filter
  useEffect(() => {
    fetchVocalists();
  }, [genderFilter, selectedGenres]);

  const fetchVocalists = async () => {
    setLoading(true);
    try {
      // Prepare params
      const gender = genderFilter !== 'ALL' ? genderFilter : null;
      const genres = selectedGenres.length > 0 ? selectedGenres : null;

      // Fetch vocalists with filter from backend
      const response = await getVocalists(gender, genres);
      if (response?.data) {
        setVocalists(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Unable to load vocalists list');
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
          if (prev.length >= effectiveMaxSelections) {
            message.warning(
              `You can only select up to ${effectiveMaxSelections} vocalist${effectiveMaxSelections > 1 ? 's' : ''}`
            );
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
        message.warning('Please select at least one vocalist');
        return; // At least select one
      }
    } else {
      if (!selectedId) {
        message.warning('Please select a vocalist');
        return;
      }
    }

    try {
      if (fromArrangement && allowMultiple) {
        // For arrangement with recording - save multiple selections with names
        const selectedVocalistsWithNames = selectedIds.map(id => {
          const vocalist = vocalists.find(v => v.specialistId === id);
          return vocalist
            ? {
                id: vocalist.specialistId,
                name: vocalist.fullName || `Vocalist ${id}`,
              }
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
        // For recording flow - handle both single and multiple selection
        const flowDataStr = sessionStorage.getItem('recordingFlowData');
        const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};

        if (allowMultiple) {
          // Multiple selection - save with full info
          const selectedVocalistsWithInfo = selectedIds.map(id => {
            const vocalist = vocalists.find(v => v.specialistId === id);
            return vocalist
              ? {
                  specialistId: vocalist.specialistId,
                  name: vocalist.name || vocalist.fullName || `Vocalist ${id}`,
                  hourlyRate: vocalist.hourlyRate || 0,
                  avatarUrl: vocalist.avatarUrl,
                  rating: vocalist.rating,
                  experienceYears: vocalist.experienceYears,
                  genres: vocalist.genres,
                }
              : {
                  specialistId: id,
                  name: `Vocalist ${id}`,
                  hourlyRate: 0,
                };
          });

          flowData.step2 = {
            ...flowData.step2, // Keep existing data (including vocalChoice)
            selectedVocalists: selectedVocalistsWithInfo,
          };
        } else {
          // Single selection
          flowData.step2 = {
            ...flowData.step2,
            wantsVocalist: true,
            vocalistId: selectedId,
          };
        }

        sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
        
        // Try to remove callback if exists
        try {
          sessionStorage.removeItem('recordingFlowVocalistCallback');
        } catch (e) {
          // Ignore if doesn't exist
        }
        
        message.success(
          `Selected ${allowMultiple ? selectedIds.length : 1} vocalist${allowMultiple && selectedIds.length > 1 ? 's' : ''} successfully`
        );
        navigate('/recording-flow', { state: { step: 2 } });
      }
    } catch (error) {
      console.error('Error saving vocalist selection:', error);
      message.error('Failed to save vocalist selection. Please try again.');
    }
  };

  const handleBack = () => {
    // Save current selections before going back (if any)
    if ((allowMultiple && selectedIds.length > 0) || (!allowMultiple && selectedId)) {
      try {
        if (fromArrangement && allowMultiple) {
          // For arrangement - save selections
          const selectedVocalistsWithNames = selectedIds.map(id => {
            const vocalist = vocalists.find(v => v.specialistId === id);
            return vocalist
              ? {
                  id: vocalist.specialistId,
                  name: vocalist.fullName || `Vocalist ${id}`,
                }
              : { id, name: `Vocalist ${id}` };
          });

          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
          flowData.step2 = {
            wantsVocalist: true,
            vocalistIds: selectedVocalistsWithNames,
          };
          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
        } else {
          // For recording flow - save selections
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};

          if (allowMultiple) {
            const selectedVocalistsWithInfo = selectedIds.map(id => {
              const vocalist = vocalists.find(v => v.specialistId === id);
              return vocalist
                ? {
                    specialistId: vocalist.specialistId,
                    name: vocalist.name || vocalist.fullName || `Vocalist ${id}`,
                    hourlyRate: vocalist.hourlyRate || 0,
                    avatarUrl: vocalist.avatarUrl,
                    rating: vocalist.rating,
                    experienceYears: vocalist.experienceYears,
                    genres: vocalist.genres,
                  }
                : {
                    specialistId: id,
                    name: `Vocalist ${id}`,
                    hourlyRate: 0,
                  };
            });

            flowData.step2 = {
              ...flowData.step2, // Keep existing data (including vocalChoice)
              selectedVocalists: selectedVocalistsWithInfo,
            };
          } else {
            flowData.step2 = {
              ...flowData.step2,
              wantsVocalist: true,
              vocalistId: selectedId,
            };
          }

          sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
        }
      } catch (error) {
        console.error('Error saving selections on back:', error);
      }
    }

    if (fromArrangement) {
      navigate(-1);
    } else {
      navigate('/recording-flow', { state: { step: 2 } });
    }
  };

  const isSelected = specialistId => {
    if (allowMultiple) {
      return selectedIds.includes(specialistId);
    }
    return selectedId === specialistId;
  };

  const canSelectMore = allowMultiple
    ? selectedIds.length < effectiveMaxSelections
    : true;

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <Card
          className={styles.headerCard}
          style={{ backgroundImage: `url(${bannerImage})` }}
        >
          <div className={styles.headerOverlay}></div>
          <div className={styles.header}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className={styles.backButton}
            >
              Back to Flow
            </Button>
            <Title level={2} className={styles.title}>
              {fromArrangement
                ? allowMultiple
                  ? 'Select Preferred Vocalist(s)'
                  : 'Select Preferred Vocalist'
                : allowMultiple
                  ? 'Select Vocalist(s)'
                  : 'Select Vocalist'}
            </Title>
            <p className={styles.description}>
              {fromArrangement
                ? allowMultiple
                  ? `Choose ${effectiveMaxSelections === 2 ? '1-2' : 'up to ' + effectiveMaxSelections} preferred vocalist${effectiveMaxSelections > 1 ? 's' : ''} for your arrangement (selected: ${selectedIds.length}/${effectiveMaxSelections})`
                  : 'Choose a preferred vocalist for your arrangement'
                : allowMultiple
                  ? `Choose up to ${effectiveMaxSelections} vocalist${effectiveMaxSelections > 1 ? 's' : ''} for your recording session (selected: ${selectedIds.length}/${effectiveMaxSelections})`
                  : 'Choose a vocalist for your recording session'}
            </p>
          </div>
        </Card>

        <Card className={styles.contentCard}>
          <div style={{ marginBottom: 20 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Space wrap>
                <Text strong>Filter by gender: </Text>
                <Radio.Group
                  value={genderFilter}
                  onChange={e => setGenderFilter(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="ALL">All</Radio.Button>
                  <Radio.Button value="FEMALE">Female</Radio.Button>
                  <Radio.Button value="MALE">Male</Radio.Button>
                </Radio.Group>
              </Space>
              <Space wrap>
                <Text strong>Filter by genre: </Text>
                <Select
                  mode="multiple"
                  placeholder="Select genres (multiple selection)"
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
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    width: '100%',
                  }}
                >
                  <p>No vocalists found</p>
                </div>
              ) : (
                vocalists.map(vocalist => (
                  <VocalistSelectionCard
                    key={vocalist.specialistId}
                    specialist={vocalist}
                    isSelected={isSelected(vocalist.specialistId)}
                    selectedId={allowMultiple ? selectedIds : selectedId}
                    onSelect={handleSelect}
                    disabled={
                      allowMultiple &&
                      !canSelectMore &&
                      !isSelected(vocalist.specialistId)
                    }
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
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                onClick={handleConfirm}
              >
                {allowMultiple
                  ? `Confirm (${selectedIds.length} vocalist${selectedIds.length !== 1 ? 's' : ''})`
                  : 'Confirm Selection'}
              </Button>
            </Space>
          </Card>
        )}
      </div>
    </div>
  );
}
