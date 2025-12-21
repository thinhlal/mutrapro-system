// RecordingStep3.jsx - Instrument Setup (which instruments, who plays, from where)
import { useState, useEffect } from 'react';
import {
  Card,
  Radio,
  Button,
  Space,
  Typography,
  Alert,
  Checkbox,
  Select,
  InputNumber,
  Collapse,
  Spin,
  Empty,
  message,
  Tag,
  Avatar,
  List,
} from 'antd';
import {
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import axiosInstance from '../../../../../../utils/axiosInstance';
import { API_ENDPOINTS } from '../../../../../../config/apiConfig';
import { getAvailableArtistsForRequest } from '../../../../../../services/studioBookingService';
import { getAllEquipment } from '../../../../../../services/equipmentService';
import styles from './RecordingStep3.module.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PERFORMER_SOURCE = {
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
};

const INSTRUMENT_SOURCE = {
  CUSTOMER_SIDE: 'CUSTOMER_SIDE',
  STUDIO_SIDE: 'STUDIO_SIDE',
};

export default function RecordingStep3({ data, onComplete, onBack }) {
  const [hasLiveInstruments, setHasLiveInstruments] = useState(
    data?.hasLiveInstruments !== undefined ? data.hasLiveInstruments : null
  );
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState(
    data?.instruments || []
  );
  const [loadingSkills, setLoadingSkills] = useState(false);

  const { bookingDate, bookingStartTime, bookingEndTime, vocalChoice } = data || {};

  // Fetch available instrument skills
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);
        // Use public endpoint /public/skills (no authentication required)
        const response = await axiosInstance.get(
          API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_ALL_SKILLS
        );

        if (response.data?.status === 'success' && response.data?.data) {
          // Filter skills with skillType = RECORDING_ARTIST and recordingCategory = INSTRUMENT
          const instrumentSkills = response.data.data.filter(
            skill =>
              skill.skillType === 'RECORDING_ARTIST' &&
              skill.recordingCategory === 'INSTRUMENT'
          );
          setAvailableSkills(instrumentSkills);
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        message.error('Unable to load instrument list');
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, []);

  const handleLiveInstrumentsChange = e => {
    const value = e.target.value;
    setHasLiveInstruments(value);

    if (value === false) {
      setSelectedInstruments([]);
    }
  };

  const handleInstrumentToggle = (skill, checked) => {
    if (checked) {
      // Add instrument
      setSelectedInstruments([
        ...selectedInstruments,
        {
          skillId: skill.skillId,
          skillName: skill.skillName,
          performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
          specialistId: null,
          specialistName: null,
          instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
          equipmentId: null,
          equipmentName: null,
          quantity: 1,
          rentalFee: 0,
        },
      ]);
    } else {
      // Remove instrument
      setSelectedInstruments(
        selectedInstruments.filter(inst => inst.skillId !== skill.skillId)
      );
    }
  };

  const updateInstrument = (skillId, updates) => {
    setSelectedInstruments(
      selectedInstruments.map(inst =>
        inst.skillId === skillId ? { ...inst, ...updates } : inst
      )
    );
  };

  const handleContinue = () => {
    // Validation
    if (hasLiveInstruments === null) {
      message.error('Please choose whether live instruments will be used');
      return;
    }

    // If no vocal needed, must have at least one instrument
    if (vocalChoice === 'NONE') {
      if (hasLiveInstruments === false) {
        message.error(
          'Since you selected "No vocal needed", you must use at least one live instrument. Please select "Yes, use live instruments" and choose instruments.'
        );
        return;
      }
      if (hasLiveInstruments === true && selectedInstruments.length === 0) {
        message.error(
          'Since you selected "No vocal needed", you must select at least one instrument to record.'
        );
        return;
      }
    }

    if (hasLiveInstruments === true && selectedInstruments.length === 0) {
      message.error('Please select at least one instrument');
      return;
    }

    // Validate each instrument
    for (const inst of selectedInstruments) {
      if (
        inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
        !inst.specialistId
      ) {
        message.error(`Please choose an instrumentalist for ${inst.skillName}`);
        return;
      }

      if (
        inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
        !inst.equipmentId
      ) {
        message.error(`Please choose equipment for ${inst.skillName}`);
        return;
      }
    }

    onComplete({
      hasLiveInstruments,
      instruments: selectedInstruments,
    });
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 3: Instrument Setup
        </Title>
        <Text className={styles.description}>
          Which instruments will be used in the session?
        </Text>
      </div>

      {/* Slot info */}
      {bookingDate && bookingStartTime && bookingEndTime && (
        <Alert
          message="Selected Slot"
          description={
            <Space>
              <Text strong>
                {new Date(bookingDate).toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Text>•</Text>
              <Text strong>
                {bookingStartTime} - {bookingEndTime}
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Has Live Instruments Section */}
      <div className={styles.liveInstrumentsSection}>
        <Text strong style={{ display: 'block', marginBottom: 16 }}>
          Will the session use live instruments?
        </Text>
        {vocalChoice === 'NONE' && (
          <Alert
            message="Required: At least one instrument needed"
            description="Since you selected 'No vocal needed', you must use at least one live instrument for the recording session."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Radio.Group
          value={hasLiveInstruments}
          onChange={handleLiveInstrumentsChange}
        >
          <Space direction="vertical" size={12}>
            <Radio value={false} disabled={vocalChoice === 'NONE'}>
              <Space>
                <span>No, only beat/backing track</span>
                <Tag color="default">No live instruments</Tag>
                {vocalChoice === 'NONE' && (
                  <Tag color="red">Not allowed (no vocal selected)</Tag>
                )}
              </Space>
            </Radio>
            <Radio value={true}>
              <Space>
                <ToolOutlined />
                <span>Yes, use live instruments</span>
                <Tag color="blue">Live performance</Tag>
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </div>

      {/* Instrument Selection */}
      {hasLiveInstruments === true && (
        <div className={styles.instrumentSelectionSection}>
          {loadingSkills ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Loading instrument list..." />
            </div>
          ) : availableSkills.length === 0 ? (
            <Empty
              description="No instruments available"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <>
              <Text strong style={{ display: 'block', marginBottom: 16 }}>
                Select instruments:
              </Text>
              <div className={styles.skillsGrid}>
                {availableSkills.map(skill => {
                  const isSelected = selectedInstruments.some(
                    inst => inst.skillId === skill.skillId
                  );
                  return (
                    <Checkbox
                      key={skill.skillId}
                      checked={isSelected}
                      onChange={e =>
                        handleInstrumentToggle(skill, e.target.checked)
                      }
                      className={styles.skillCheckbox}
                    >
                      {skill.skillName}
                    </Checkbox>
                  );
                })}
              </div>

              {selectedInstruments.length > 0 && (
                <div className={styles.instrumentConfigSection}>
                  <Title level={4}>Configure each instrument:</Title>
                  <Collapse accordion>
                    {selectedInstruments.map(instrument => (
                      <Panel
                        header={
                          <Space>
                            <ToolOutlined />
                            <Text strong>{instrument.skillName}</Text>
                            {instrument.specialistId && (
                              <Tag color="blue">
                                {instrument.specialistName}
                              </Tag>
                            )}
                            {instrument.equipmentId && (
                              <Tag color="green">
                                {instrument.equipmentName}
                              </Tag>
                            )}
                          </Space>
                        }
                        key={instrument.skillId}
                      >
                        <InstrumentConfig
                          instrument={instrument}
                          bookingDate={bookingDate}
                          bookingStartTime={bookingStartTime}
                          bookingEndTime={bookingEndTime}
                          onUpdate={updates =>
                            updateInstrument(instrument.skillId, updates)
                          }
                        />
                      </Panel>
                    ))}
                  </Collapse>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <Button size="large" onClick={onBack}>
          Back to Vocal Setup
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleContinue}
          disabled={hasLiveInstruments === null || loadingSkills}
          className={styles.continueButton}
        >
          Continue to Review
        </Button>
      </div>
    </Card>
  );
}

// Component for configuring each instrument
function InstrumentConfig({
  instrument,
  bookingDate,
  bookingStartTime,
  bookingEndTime,
  onUpdate,
}) {
  const [availableInstrumentalists, setAvailableInstrumentalists] = useState(
    []
  );
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [loadingInstrumentalists, setLoadingInstrumentalists] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Fetch instrumentalists when performer source is INTERNAL_ARTIST
  useEffect(() => {
    if (
      instrument.performerSource !== PERFORMER_SOURCE.INTERNAL_ARTIST ||
      !bookingDate ||
      !bookingStartTime ||
      !bookingEndTime
    ) {
      setAvailableInstrumentalists([]);
      return;
    }

    const fetchInstrumentalists = async () => {
      try {
        setLoadingInstrumentalists(true);
        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          instrument.skillId,
          'INSTRUMENT',
          null
        );

        if (response?.status === 'success' && response?.data) {
          setAvailableInstrumentalists(response.data);
        }
      } catch (error) {
        console.error('Error fetching instrumentalists:', error);
        message.error('Unable to load instrumentalist list');
      } finally {
        setLoadingInstrumentalists(false);
      }
    };

    fetchInstrumentalists();
  }, [
    instrument.performerSource,
    instrument.skillId,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
  ]);

  // Fetch equipment when instrument source is STUDIO_SIDE
  useEffect(() => {
    if (instrument.instrumentSource !== INSTRUMENT_SOURCE.STUDIO_SIDE) {
      setAvailableEquipment([]);
      return;
    }

    const fetchEquipment = async () => {
      try {
        setLoadingEquipment(true);
        const response = await getAllEquipment(
          instrument.skillId,
          false, // includeInactive
          false // includeUnavailable
        );

        if (response?.status === 'success' && response?.data) {
          setAvailableEquipment(response.data);
        }
      } catch (error) {
        console.error('Error fetching equipment:', error);
        message.error('Unable to load equipment list');
      } finally {
        setLoadingEquipment(false);
      }
    };

    fetchEquipment();
  }, [instrument.instrumentSource, instrument.skillId]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* Performer Source */}
      <div>
        <Text strong>Who will play {instrument.skillName}?</Text>
        <Radio.Group
          value={instrument.performerSource}
          onChange={e => {
            const newSource = e.target.value;
            onUpdate({
              performerSource: newSource,
              specialistId: null,
              specialistName: null,
            });
          }}
          style={{ marginTop: 8, display: 'block' }}
        >
          <Space direction="vertical">
            <Radio value={PERFORMER_SOURCE.CUSTOMER_SELF}>
              <Space>
                <UserOutlined />I will play
              </Space>
            </Radio>
            <Radio value={PERFORMER_SOURCE.INTERNAL_ARTIST}>
              <Space>
                <TeamOutlined />
                Hire in-house instrumentalist
              </Space>
            </Radio>
          </Space>
        </Radio.Group>

        {/* Instrumentalist Selection */}
        {instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST && (
          <div style={{ marginTop: 12, marginLeft: 24 }}>
            {loadingInstrumentalists ? (
              <Spin size="small" />
            ) : availableInstrumentalists.length === 0 ? (
              <Text type="secondary">No instrumentalists available</Text>
            ) : (
              <Select
                style={{ width: '100%' }}
                placeholder="Select instrumentalist"
                value={instrument.specialistId}
                onChange={(value, option) => {
                  const selectedArtist = availableInstrumentalists.find(
                    a => a.specialistId === value
                  );
                  onUpdate({
                    specialistId: value,
                    specialistName: option.label,
                    hourlyRate: selectedArtist?.hourlyRate || 0,
                  });
                }}
                options={availableInstrumentalists.map(artist => ({
                  value: artist.specialistId,
                  label: artist.name,
                  disabled: !artist.isAvailable,
                }))}
              />
            )}
          </div>
        )}
      </div>

      {/* Instrument Source */}
      <div>
        <Text strong>Where will the instrument come from?</Text>
        <Radio.Group
          value={instrument.instrumentSource}
          onChange={e => {
            const newSource = e.target.value;
            onUpdate({
              instrumentSource: newSource,
              equipmentId: null,
              equipmentName: null,
              quantity: 1,
              rentalFee: 0,
            });
          }}
          style={{ marginTop: 8, display: 'block' }}
        >
          <Space direction="vertical">
            <Radio value={INSTRUMENT_SOURCE.CUSTOMER_SIDE}>
              I will bring my own
            </Radio>
            <Radio value={INSTRUMENT_SOURCE.STUDIO_SIDE}>
              Rent from studio
            </Radio>
          </Space>
        </Radio.Group>

        {/* Equipment Selection */}
        {instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && (
          <div style={{ marginTop: 12, marginLeft: 24 }}>
            {loadingEquipment ? (
              <Spin size="small" />
            ) : availableEquipment.length === 0 ? (
              <Text type="secondary">No equipment available</Text>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select equipment"
                  value={instrument.equipmentId}
                  onChange={(value, option) => {
                    const selectedEq = availableEquipment.find(
                      eq => eq.equipmentId === value
                    );
                    onUpdate({
                      equipmentId: value,
                      equipmentName: option.label,
                      rentalFee: selectedEq?.rentalFee || 0,
                    });
                  }}
                  options={availableEquipment.map(eq => ({
                    value: eq.equipmentId,
                    label: `${eq.brand} ${eq.model} - ${eq.equipmentName}`,
                  }))}
                />
                {instrument.equipmentId && (
                  <Space>
                    <Text>Quantity:</Text>
                    <InputNumber
                      min={1}
                      value={instrument.quantity}
                      onChange={value => onUpdate({ quantity: value })}
                    />
                    <Text type="secondary">
                      • Fee: {instrument.rentalFee?.toLocaleString('vi-VN')} VND
                    </Text>
                  </Space>
                )}
              </Space>
            )}
          </div>
        )}
      </div>
    </Space>
  );
}
