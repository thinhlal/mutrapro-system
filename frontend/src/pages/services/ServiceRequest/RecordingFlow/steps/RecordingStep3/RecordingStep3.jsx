// RecordingStep3.jsx - Instrument Setup
import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Checkbox,
  Select,
  Radio,
  Typography,
  message,
  Space,
  Tag,
  Divider,
  InputNumber,
} from 'antd';
import {
  TeamOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RecordingStep3.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Mock data - sẽ thay bằng API call thực tế
const MOCK_SKILLS = [
  {
    id: 'skill-guitar',
    name: 'Guitar Performance',
    recordingCategory: 'INSTRUMENT',
  },
  {
    id: 'skill-piano',
    name: 'Piano Performance',
    recordingCategory: 'INSTRUMENT',
  },
  {
    id: 'skill-drums',
    name: 'Drums Performance',
    recordingCategory: 'INSTRUMENT',
  },
  {
    id: 'skill-bass',
    name: 'Bass Performance',
    recordingCategory: 'INSTRUMENT',
  },
];

const MOCK_EQUIPMENT_BY_SKILL = {
  'skill-guitar': [
    {
      id: 'eq-guitar-1',
      name: 'Fender Stratocaster',
      brand: 'Fender',
      model: 'Stratocaster',
      rentalFee: 200000,
      availableQuantity: 2,
    },
    {
      id: 'eq-guitar-2',
      name: 'Gibson Les Paul',
      brand: 'Gibson',
      model: 'Les Paul',
      rentalFee: 300000,
      availableQuantity: 1,
    },
  ],
  'skill-piano': [
    {
      id: 'eq-piano-1',
      name: 'Yamaha C3',
      brand: 'Yamaha',
      model: 'C3',
      rentalFee: 500000,
      availableQuantity: 1,
    },
  ],
  'skill-drums': [
    {
      id: 'eq-drums-1',
      name: 'Pearl Export Series',
      brand: 'Pearl',
      model: 'Export',
      rentalFee: 400000,
      availableQuantity: 1,
    },
  ],
};

const MOCK_INSTRUMENTALISTS_BY_SKILL = {
  'skill-guitar': [
    { id: 'inst-guitar-1', name: 'Guitarist A', rating: 4.8 },
    { id: 'inst-guitar-2', name: 'Guitarist B', rating: 4.9 },
  ],
  'skill-piano': [
    { id: 'inst-piano-1', name: 'Pianist A', rating: 4.9 },
  ],
  'skill-drums': [
    { id: 'inst-drums-1', name: 'Drummer A', rating: 4.7 },
  ],
};

const PERFORMER_SOURCE = {
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
};

const INSTRUMENT_SOURCE = {
  CUSTOMER_SIDE: 'CUSTOMER_SIDE', // Customer tự mang
  STUDIO_SIDE: 'STUDIO_SIDE', // Thuê studio
  ARTIST_SIDE: 'ARTIST_SIDE', // Artist tự mang (chỉ khi INTERNAL_ARTIST)
};

export default function RecordingStep3({ data, onComplete }) {
  const navigate = useNavigate();
  const [hasInstruments, setHasInstruments] = useState(
    data?.hasInstruments !== undefined ? data.hasInstruments : false
  );
  const [instruments, setInstruments] = useState(
    data?.instruments || []
  );

  const handleHasInstrumentsChange = e => {
    const value = e.target.checked;
    setHasInstruments(value);
    if (!value) {
      setInstruments([]);
    }
  };

  const addInstrument = () => {
    setInstruments([
      ...instruments,
      {
        id: `inst-${Date.now()}`,
        skillId: null,
        performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
        instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
        equipmentId: null,
        specialistId: null,
      },
    ]);
  };

  const removeInstrument = id => {
    setInstruments(instruments.filter(inst => inst.id !== id));
  };

  const updateInstrument = (id, updates) => {
    setInstruments(
      instruments.map(inst =>
        inst.id === id ? { ...inst, ...updates } : inst
      )
    );
  };

  const handleSkillChange = (instrumentId, skillId) => {
    const instrument = instruments.find(inst => inst.id === instrumentId);
    const updates = { skillId };

    // Reset dependent fields when skill changes
    if (instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE) {
      updates.equipmentId = null;
    }
    if (instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST) {
      updates.specialistId = null;
    }

    updateInstrument(instrumentId, updates);
  };

  const handlePerformerSourceChange = (instrumentId, performerSource) => {
    const instrument = instruments.find(inst => inst.id === instrumentId);
    const updates = { performerSource };

    // Reset specialist if switching to CUSTOMER_SELF
    if (performerSource === PERFORMER_SOURCE.CUSTOMER_SELF) {
      updates.specialistId = null;
      // If was STUDIO_SIDE and artist was bringing, reset to CUSTOMER_SIDE
      if (instrument.instrumentSource === INSTRUMENT_SOURCE.ARTIST_SIDE) {
        updates.instrumentSource = INSTRUMENT_SOURCE.CUSTOMER_SIDE;
        updates.equipmentId = null;
      }
    }

    // If switching to INTERNAL_ARTIST and instrument source was CUSTOMER_SIDE,
    // keep it as is or allow user to choose ARTIST_SIDE
    if (
      performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
      instrument.instrumentSource === INSTRUMENT_SOURCE.CUSTOMER_SIDE
    ) {
      // Keep as CUSTOMER_SIDE (user can change to ARTIST_SIDE if needed)
    }

    updateInstrument(instrumentId, updates);
  };

  const handleInstrumentSourceChange = (instrumentId, instrumentSource) => {
    const instrument = instruments.find(inst => inst.id === instrumentId);
    const updates = { instrumentSource };

    // Reset equipment if switching away from STUDIO_SIDE
    if (instrumentSource !== INSTRUMENT_SOURCE.STUDIO_SIDE) {
      updates.equipmentId = null;
    }

    // Validate: ARTIST_SIDE only available if INTERNAL_ARTIST
    if (
      instrumentSource === INSTRUMENT_SOURCE.ARTIST_SIDE &&
      instrument.performerSource !== PERFORMER_SOURCE.INTERNAL_ARTIST
    ) {
      message.warning('Artist can only bring instrument if hiring artist');
      return;
    }

    updateInstrument(instrumentId, updates);
  };

  const handleEquipmentChange = (instrumentId, equipmentId) => {
    updateInstrument(instrumentId, { equipmentId });
  };

  const handleSpecialistChange = (instrumentId, specialistId) => {
    updateInstrument(instrumentId, { specialistId });
  };

  const validateInstrument = instrument => {
    if (!instrument.skillId) {
      return 'Please select instrument skill';
    }

    if (
      instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
      !instrument.equipmentId
    ) {
      return 'Please select equipment when renting from studio';
    }

    if (
      instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
      !instrument.specialistId
    ) {
      return 'Please select instrumentalist';
    }

    return null;
  };

  const handleContinue = () => {
    if (!hasInstruments) {
      onComplete({
        hasInstruments: false,
        instruments: [],
        instrumentParticipants: [],
      });
      return;
    }

    if (instruments.length === 0) {
      message.warning('Please add at least one instrument or uncheck "Use live instruments"');
      return;
    }

    // Validate all instruments
    const errors = [];
    instruments.forEach((inst, idx) => {
      const error = validateInstrument(inst);
      if (error) {
        errors.push(`Instrument ${idx + 1}: ${error}`);
      }
    });

    if (errors.length > 0) {
      message.error(errors.join('\n'));
      return;
    }

    // Prepare participants data
    const participants = instruments.map(inst => {
      const skill = MOCK_SKILLS.find(s => s.id === inst.skillId);
      const equipment =
        inst.equipmentId &&
        MOCK_EQUIPMENT_BY_SKILL[inst.skillId]?.find(e => e.id === inst.equipmentId);

      const participant = {
        roleType: 'INSTRUMENT',
        performerSource: inst.performerSource,
        skillId: inst.skillId,
        skillName: skill?.name,
        instrumentSource: inst.instrumentSource,
        participantFee:
          inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST ? 500000 : 0, // Mock fee
        equipmentRentalFee: equipment ? equipment.rentalFee : 0,
      };

      if (inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST) {
        participant.specialistId = inst.specialistId;
      }

      if (inst.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE && inst.equipmentId) {
        participant.equipmentId = inst.equipmentId;
        participant.equipmentName = equipment?.name;
      }

      return participant;
    });

    onComplete({
      hasInstruments: true,
      instruments,
      instrumentParticipants: participants,
    });
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          Step 3: Instrument Setup
        </Title>
        <Text className={styles.description}>
          Will you use live instruments in this recording session?
        </Text>
      </div>

      <div className={styles.checkboxSection}>
        <Checkbox
          checked={hasInstruments}
          onChange={handleHasInstrumentsChange}
          className={styles.checkbox}
        >
          <Text strong>Yes, I will use live instruments</Text>
        </Checkbox>
      </div>

      {hasInstruments && (
        <div className={styles.instrumentsSection}>
          <div className={styles.sectionHeader}>
            <Title level={4}>Instruments</Title>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addInstrument}
              className={styles.addButton}
            >
              Add Instrument
            </Button>
          </div>

          {instruments.length === 0 && (
            <div className={styles.emptyState}>
              <Text type="secondary">
                Click "Add Instrument" to add instruments for this session
              </Text>
            </div>
          )}

          {instruments.map((instrument, index) => {
            const skill = MOCK_SKILLS.find(s => s.id === instrument.skillId);
            const availableEquipment =
              instrument.skillId
                ? MOCK_EQUIPMENT_BY_SKILL[instrument.skillId] || []
                : [];
            const availableInstrumentalists =
              instrument.skillId
                ? MOCK_INSTRUMENTALISTS_BY_SKILL[instrument.skillId] || []
                : [];

            return (
              <div key={instrument.id} className={styles.instrumentCard}>
                <div className={styles.instrumentHeader}>
                  <Title level={5}>Instrument {index + 1}</Title>
                  {instruments.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeInstrument(instrument.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className={styles.instrumentForm}>
                  {/* Skill Selection - REQUIRED */}
                  <div className={styles.formItem}>
                    <Text strong>Instrument Type *</Text>
                    <Select
                      placeholder="Select instrument type"
                      value={instrument.skillId}
                      onChange={value => handleSkillChange(instrument.id, value)}
                      style={{ width: '100%' }}
                      size="large"
                    >
                      {MOCK_SKILLS.map(skill => (
                        <Option key={skill.id} value={skill.id}>
                          {skill.name}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* Performer Source */}
                  <div className={styles.formItem}>
                    <Text strong>Who will play? *</Text>
                    <Radio.Group
                      value={instrument.performerSource}
                      onChange={e =>
                        handlePerformerSourceChange(
                          instrument.id,
                          e.target.value
                        )
                      }
                    >
                      <Space direction="vertical">
                        <Radio value={PERFORMER_SOURCE.CUSTOMER_SELF}>
                          I will play myself
                        </Radio>
                        <Radio value={PERFORMER_SOURCE.INTERNAL_ARTIST}>
                          Hire instrumentalist
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </div>

                  {/* Specialist Selection - if INTERNAL_ARTIST */}
                  {instrument.performerSource ===
                    PERFORMER_SOURCE.INTERNAL_ARTIST && (
                    <div className={styles.formItem}>
                      <Text strong>Select Instrumentalist *</Text>
                      <Select
                        placeholder="Select instrumentalist"
                        value={instrument.specialistId}
                        onChange={value =>
                          handleSpecialistChange(instrument.id, value)
                        }
                        style={{ width: '100%' }}
                        size="large"
                        disabled={!instrument.skillId}
                      >
                        {availableInstrumentalists.map(inst => (
                          <Option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.rating}★)
                          </Option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Instrument Source */}
                  <div className={styles.formItem}>
                    <Text strong>Where is the instrument from? *</Text>
                    <Radio.Group
                      value={instrument.instrumentSource}
                      onChange={e =>
                        handleInstrumentSourceChange(
                          instrument.id,
                          e.target.value
                        )
                      }
                    >
                      <Space direction="vertical">
                        <Radio value={INSTRUMENT_SOURCE.CUSTOMER_SIDE}>
                          I will bring my own instrument
                        </Radio>
                        <Radio value={INSTRUMENT_SOURCE.STUDIO_SIDE}>
                          Rent instrument from studio
                        </Radio>
                        {instrument.performerSource ===
                          PERFORMER_SOURCE.INTERNAL_ARTIST && (
                          <Radio value={INSTRUMENT_SOURCE.ARTIST_SIDE}>
                            Artist will bring their own instrument
                          </Radio>
                        )}
                      </Space>
                    </Radio.Group>
                  </div>

                  {/* Equipment Selection - if STUDIO_SIDE */}
                  {instrument.instrumentSource ===
                    INSTRUMENT_SOURCE.STUDIO_SIDE && (
                    <div className={styles.formItem}>
                      <Text strong>Select Equipment *</Text>
                      <Select
                        placeholder="Select equipment"
                        value={instrument.equipmentId}
                        onChange={value =>
                          handleEquipmentChange(instrument.id, value)
                        }
                        style={{ width: '100%' }}
                        size="large"
                        disabled={!instrument.skillId}
                      >
                        {availableEquipment.map(eq => (
                          <Option key={eq.id} value={eq.id}>
                            {eq.name} - {eq.brand} {eq.model} ({eq.rentalFee.toLocaleString()}₫)
                          </Option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actionRow}>
        <Button
          type="primary"
          size="large"
          icon={<ArrowRightOutlined />}
          onClick={handleContinue}
          className={styles.continueButton}
        >
          Continue to Summary
        </Button>
      </div>
    </Card>
  );
}
