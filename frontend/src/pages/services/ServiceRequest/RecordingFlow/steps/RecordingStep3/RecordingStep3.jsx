// RecordingStep3.jsx - Instrument Setup (which instruments, who plays, from where)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Input,
} from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import {
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ToolOutlined,
  SearchOutlined,
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
  const [showCustomInstrumentInput, setShowCustomInstrumentInput] =
    useState(false);
  const [customInstrumentName, setCustomInstrumentName] = useState('');

  const { bookingDate, bookingStartTime, bookingEndTime, vocalChoice } =
    data || {};

  // Sync selectedInstruments from data (when returning from InstrumentalistSelectionPage)
  useEffect(() => {
    if (data) {
      if (data.instruments && Array.isArray(data.instruments)) {
        // Ensure custom instruments always have CUSTOMER_SELF, no specialist, and CUSTOMER_SIDE
        const normalizedInstruments = data.instruments.map(inst => {
          if (inst.isCustomInstrument) {
            return {
              ...inst,
              performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
              specialistId: null,
              specialistName: null,
              instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
              equipmentId: null,
              equipmentName: null,
              rentalFee: 0,
            };
          }
          return inst;
        });

        setSelectedInstruments(normalizedInstruments);

        // Check if there are custom instruments
        const customInstruments = normalizedInstruments.filter(
          inst => inst.isCustomInstrument
        );
        if (customInstruments.length > 0) {
          setShowCustomInstrumentInput(false);
          setCustomInstrumentName('');
        } else {
          setShowCustomInstrumentInput(false);
          setCustomInstrumentName('');
        }
      }

      // Sync hasLiveInstruments
      if (data.hasLiveInstruments !== undefined) {
        setHasLiveInstruments(data.hasLiveInstruments);
      }
    }
  }, [data]);

  // Save selectedInstruments to sessionStorage whenever it changes
  useEffect(() => {
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};

      // Only save if we have instruments or if hasLiveInstruments is set
      if (
        flowData.step3 ||
        selectedInstruments.length > 0 ||
        hasLiveInstruments !== null
      ) {
        flowData.step3 = {
          ...flowData.step3,
          instruments: selectedInstruments,
          hasLiveInstruments:
            hasLiveInstruments !== null
              ? hasLiveInstruments
              : flowData.step3?.hasLiveInstruments,
        };
        sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
      }
    } catch (error) {
      console.error('Error saving selectedInstruments:', error);
    }
  }, [selectedInstruments, hasLiveInstruments]);

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

    // Save to sessionStorage immediately
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
      flowData.step3 = {
        ...flowData.step3,
        hasLiveInstruments: value,
        ...(value === false ? { instruments: [] } : {}),
      };
      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
    } catch (error) {
      console.error('Error saving hasLiveInstruments:', error);
    }
  };

  const handleInstrumentToggle = (skill, checked) => {
    if (checked) {
      // Add instrument
      const newInstrument = {
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
        isCustomInstrument: false,
      };
      const updated = [...selectedInstruments, newInstrument];
      setSelectedInstruments(updated);

      // Save to sessionStorage immediately
      try {
        const flowDataStr = sessionStorage.getItem('recordingFlowData');
        const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
        flowData.step3 = {
          ...flowData.step3,
          instruments: updated,
          hasLiveInstruments:
            hasLiveInstruments !== null
              ? hasLiveInstruments
              : flowData.step3?.hasLiveInstruments,
        };
        sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
      } catch (error) {
        console.error('Error saving instrument toggle:', error);
      }
    } else {
      // Remove instrument
      const updated = selectedInstruments.filter(
        inst => inst.skillId !== skill.skillId
      );
      setSelectedInstruments(updated);

      // Save to sessionStorage immediately
      try {
        const flowDataStr = sessionStorage.getItem('recordingFlowData');
        const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
        flowData.step3 = {
          ...flowData.step3,
          instruments: updated,
          hasLiveInstruments:
            hasLiveInstruments !== null
              ? hasLiveInstruments
              : flowData.step3?.hasLiveInstruments,
        };
        sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
      } catch (error) {
        console.error('Error saving instrument toggle:', error);
      }
    }
  };

  const updateInstrument = (identifier, updates) => {
    // identifier can be skillId (for regular instruments) or skillName (for custom instruments)
    const updated = selectedInstruments.map(inst => {
      if (inst.isCustomInstrument) {
        // For custom instruments, match by skillName
        return inst.skillName === identifier ? { ...inst, ...updates } : inst;
      } else {
        // For regular instruments, match by skillId
        return inst.skillId === identifier ? { ...inst, ...updates } : inst;
      }
    });

    setSelectedInstruments(updated);

    // Save to sessionStorage immediately
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      const flowData = flowDataStr ? JSON.parse(flowDataStr) : {};
      flowData.step3 = {
        ...flowData.step3,
        instruments: updated,
        hasLiveInstruments:
          hasLiveInstruments !== null
            ? hasLiveInstruments
            : flowData.step3?.hasLiveInstruments,
      };
      sessionStorage.setItem('recordingFlowData', JSON.stringify(flowData));
    } catch (error) {
      console.error('Error saving instrument update:', error);
    }
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
      // Custom instruments should always be CUSTOMER_SELF
      if (
        inst.isCustomInstrument &&
        inst.performerSource !== PERFORMER_SOURCE.CUSTOMER_SELF
      ) {
        message.error(
          `Custom instruments can only be played by yourself: ${inst.skillName}`
        );
        return;
      }

      if (
        inst.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
        !inst.specialistId
      ) {
        message.error(`Please choose an instrumentalist for ${inst.skillName}`);
        return;
      }

      // Custom instruments should always be CUSTOMER_SIDE
      if (
        inst.isCustomInstrument &&
        inst.instrumentSource !== INSTRUMENT_SOURCE.CUSTOMER_SIDE
      ) {
        message.error(
          `Custom instruments must be brought by yourself: ${inst.skillName}`
        );
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

    // Normalize custom instruments before passing to parent
    const normalizedInstruments = selectedInstruments.map(inst => {
      if (inst.isCustomInstrument) {
        return {
          ...inst,
          performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
          specialistId: null,
          specialistName: null,
          instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
          equipmentId: null,
          equipmentName: null,
          rentalFee: 0,
        };
      }
      return inst;
    });

    onComplete({
      hasLiveInstruments,
      instruments: normalizedInstruments,
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

              {/* Custom Instruments Section */}
              <div style={{ marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Text strong>Custom Instruments:</Text>

                  {/* List of added custom instruments */}
                  {selectedInstruments
                    .filter(inst => inst.isCustomInstrument)
                    .map((inst, idx) => (
                      <div
                        key={inst.skillId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <Text>{inst.skillName}</Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          danger
                          onClick={() => {
                            // For custom instruments, skillId is null, so use skillName to identify
                            const updated = selectedInstruments.filter(i => {
                              if (
                                i.isCustomInstrument &&
                                inst.isCustomInstrument
                              ) {
                                // Both are custom: compare by skillName
                                return i.skillName !== inst.skillName;
                              } else if (
                                !i.isCustomInstrument &&
                                !inst.isCustomInstrument
                              ) {
                                // Both are regular: compare by skillId
                                return i.skillId !== inst.skillId;
                              } else {
                                // One is custom, one is regular: keep both
                                return true;
                              }
                            });
                            setSelectedInstruments(updated);

                            // Save to sessionStorage immediately
                            try {
                              const flowDataStr =
                                sessionStorage.getItem('recordingFlowData');
                              const flowData = flowDataStr
                                ? JSON.parse(flowDataStr)
                                : {};
                              flowData.step3 = {
                                ...flowData.step3,
                                instruments: updated,
                                hasLiveInstruments:
                                  hasLiveInstruments !== null
                                    ? hasLiveInstruments
                                    : flowData.step3?.hasLiveInstruments,
                              };
                              sessionStorage.setItem(
                                'recordingFlowData',
                                JSON.stringify(flowData)
                              );
                            } catch (error) {
                              console.error(
                                'Error saving custom instrument removal:',
                                error
                              );
                            }
                          }}
                        />
                      </div>
                    ))}

                  {/* Add Custom Instrument Input */}
                  {showCustomInstrumentInput ? (
                    <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
                      <Input
                        placeholder="Enter instrument name (e.g., Didgeridoo, Sitar, etc.)"
                        value={customInstrumentName}
                        onChange={e => setCustomInstrumentName(e.target.value)}
                        onPressEnter={() => {
                          const name = customInstrumentName.trim();
                          if (name) {
                            // Check if already exists
                            const exists = selectedInstruments.some(
                              inst =>
                                inst.isCustomInstrument &&
                                inst.skillName.toLowerCase() ===
                                  name.toLowerCase()
                            );

                            if (exists) {
                              message.warning(
                                `"${name}" is already added as a custom instrument`
                              );
                              return;
                            }

                            const customInstrument = {
                              skillId: null, // Custom instruments: skillId = null
                              skillName: name,
                              isCustomInstrument: true,
                              performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
                              specialistId: null,
                              specialistName: null,
                              instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
                              equipmentId: null,
                              equipmentName: null,
                              quantity: 1,
                              rentalFee: 0,
                            };

                            const updated = [
                              ...selectedInstruments,
                              customInstrument,
                            ];
                            setSelectedInstruments(updated);
                            setCustomInstrumentName('');
                            setShowCustomInstrumentInput(false);

                            // Save to sessionStorage immediately
                            try {
                              const flowDataStr =
                                sessionStorage.getItem('recordingFlowData');
                              const flowData = flowDataStr
                                ? JSON.parse(flowDataStr)
                                : {};
                              flowData.step3 = {
                                ...flowData.step3,
                                instruments: updated,
                                hasLiveInstruments:
                                  hasLiveInstruments !== null
                                    ? hasLiveInstruments
                                    : flowData.step3?.hasLiveInstruments,
                              };
                              sessionStorage.setItem(
                                'recordingFlowData',
                                JSON.stringify(flowData)
                              );
                            } catch (error) {
                              console.error(
                                'Error saving custom instrument:',
                                error
                              );
                            }

                            message.success(
                              `Added "${name}" as custom instrument`
                            );
                          }
                        }}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <Button
                        type="primary"
                        onClick={() => {
                          const name = customInstrumentName.trim();
                          if (name) {
                            // Check if already exists
                            const exists = selectedInstruments.some(
                              inst =>
                                inst.isCustomInstrument &&
                                inst.skillName.toLowerCase() ===
                                  name.toLowerCase()
                            );

                            if (exists) {
                              message.warning(
                                `"${name}" is already added as a custom instrument`
                              );
                              return;
                            }

                            const customInstrument = {
                              skillId: null, // Custom instruments: skillId = null
                              skillName: name,
                              isCustomInstrument: true,
                              performerSource: PERFORMER_SOURCE.CUSTOMER_SELF,
                              specialistId: null,
                              specialistName: null,
                              instrumentSource: INSTRUMENT_SOURCE.CUSTOMER_SIDE,
                              equipmentId: null,
                              equipmentName: null,
                              quantity: 1,
                              rentalFee: 0,
                            };

                            const updated = [
                              ...selectedInstruments,
                              customInstrument,
                            ];
                            setSelectedInstruments(updated);
                            setCustomInstrumentName('');
                            setShowCustomInstrumentInput(false);

                            // Save to sessionStorage immediately
                            try {
                              const flowDataStr =
                                sessionStorage.getItem('recordingFlowData');
                              const flowData = flowDataStr
                                ? JSON.parse(flowDataStr)
                                : {};
                              flowData.step3 = {
                                ...flowData.step3,
                                instruments: updated,
                                hasLiveInstruments:
                                  hasLiveInstruments !== null
                                    ? hasLiveInstruments
                                    : flowData.step3?.hasLiveInstruments,
                              };
                              sessionStorage.setItem(
                                'recordingFlowData',
                                JSON.stringify(flowData)
                              );
                            } catch (error) {
                              console.error(
                                'Error saving custom instrument:',
                                error
                              );
                            }

                            message.success(
                              `Added "${name}" as custom instrument`
                            );
                          } else {
                            message.warning('Please enter an instrument name');
                          }
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setShowCustomInstrumentInput(false);
                          setCustomInstrumentName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </Space.Compact>
                  ) : (
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCustomInstrumentInput(true)}
                      style={{ maxWidth: 500 }}
                    >
                      Add Custom Instrument
                    </Button>
                  )}

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    If your instrument is not in the list above, you can add it
                    here
                  </Text>
                </Space>
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
                        key={
                          instrument.isCustomInstrument
                            ? `custom-${instrument.skillName}`
                            : instrument.skillId
                        }
                      >
                        <InstrumentConfig
                          instrument={instrument}
                          bookingDate={bookingDate}
                          bookingStartTime={bookingStartTime}
                          bookingEndTime={bookingEndTime}
                          onUpdate={updates =>
                            updateInstrument(
                              instrument.isCustomInstrument
                                ? instrument.skillName
                                : instrument.skillId,
                              updates
                            )
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
  const navigate = useNavigate();
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
      !bookingEndTime ||
      instrument.isCustomInstrument || // Don't fetch for custom instruments
      !instrument.skillId // Must have skillId for regular instruments
    ) {
      setAvailableInstrumentalists([]);
      return;
    }

    const fetchInstrumentalists = async () => {
      try {
        setLoadingInstrumentalists(true);

        // Debug: Log parameters
        console.log('Fetching instrumentalists with params:', {
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          skillId: instrument.skillId,
          roleType: 'INSTRUMENT',
          instrumentName: instrument.skillName,
        });

        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          instrument.skillId, // skillId is required and validated above
          'INSTRUMENT',
          null // genres - not needed for instrumentalists
        );

        console.log('API Response:', response);

        if (response?.status === 'success' && response?.data) {
          console.log('Available instrumentalists:', response.data);
          setAvailableInstrumentalists(response.data);
        } else {
          console.warn('No data in response or status not success:', response);
          setAvailableInstrumentalists([]);
        }
      } catch (error) {
        console.error('Error fetching instrumentalists:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        message.error('Unable to load instrumentalist list');
        setAvailableInstrumentalists([]);
      } finally {
        setLoadingInstrumentalists(false);
      }
    };

    fetchInstrumentalists();
  }, [
    instrument.performerSource,
    instrument.skillId,
    instrument.isCustomInstrument,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
  ]);

  // Fetch equipment when instrument source is STUDIO_SIDE
  useEffect(() => {
    if (
      instrument.instrumentSource !== INSTRUMENT_SOURCE.STUDIO_SIDE ||
      instrument.isCustomInstrument // Don't fetch for custom instruments
    ) {
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
          value={
            instrument.isCustomInstrument
              ? PERFORMER_SOURCE.CUSTOMER_SELF
              : instrument.performerSource
          }
          onChange={e => {
            // Prevent changing if it's a custom instrument
            if (instrument.isCustomInstrument) {
              message.warning(
                'Custom instruments can only be played by yourself. To hire a specialist, the instrument must be added to our system first.'
              );
              return;
            }

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
            <Radio
              value={PERFORMER_SOURCE.INTERNAL_ARTIST}
              disabled={instrument.isCustomInstrument}
            >
              <Space>
                <TeamOutlined />
                Hire in-house instrumentalist
                {instrument.isCustomInstrument && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    Not available for custom instruments
                  </Tag>
                )}
              </Space>
            </Radio>
          </Space>
        </Radio.Group>

        {/* Instrumentalist Selection */}
        {instrument.performerSource === PERFORMER_SOURCE.INTERNAL_ARTIST &&
          !instrument.isCustomInstrument && (
            <div style={{ marginTop: 12, marginLeft: 24 }}>
              {instrument.specialistId ? (
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <Avatar
                      size={32}
                      src={instrument.avatarUrl}
                      icon={<UserOutlined />}
                    />
                    <Text strong>{instrument.specialistName}</Text>
                    {instrument.hourlyRate && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(instrument.hourlyRate)}
                        /hour
                      </Text>
                    )}
                  </Space>
                </div>
              ) : (
                <Alert
                  message="No instrumentalist selected"
                  description="Click 'Browse All Instrumentalists' to select an instrumentalist"
                  type="info"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
              )}
              <Button
                type="default"
                icon={<SearchOutlined />}
                onClick={() => {
                  // Save callback data to sessionStorage
                  const callbackData = {
                    skillId: instrument.skillId,
                    skillName: instrument.skillName,
                    selectedInstrumentalistId: instrument.specialistId,
                    bookingDate,
                    bookingStartTime,
                    bookingEndTime,
                  };
                  sessionStorage.setItem(
                    'recordingFlowInstrumentalistCallback',
                    JSON.stringify(callbackData)
                  );

                  // Navigate to instrumentalist selection page
                  navigate('/recording-flow/instrumentalist-selection', {
                    state: {
                      fromFlow: true,
                      skillId: instrument.skillId,
                      skillName: instrument.skillName,
                      bookingDate,
                      bookingStartTime,
                      bookingEndTime,
                      selectedInstrumentalistId: instrument.specialistId,
                    },
                  });
                }}
              >
                {instrument.specialistId
                  ? 'Change Instrumentalist'
                  : 'Browse All Instrumentalists'}
              </Button>
            </div>
          )}
      </div>

      {/* Instrument Source */}
      <div>
        <Text strong>Where will the instrument come from?</Text>
        <Radio.Group
          value={
            instrument.isCustomInstrument
              ? INSTRUMENT_SOURCE.CUSTOMER_SIDE
              : instrument.instrumentSource
          }
          onChange={e => {
            // Prevent changing if it's a custom instrument
            if (instrument.isCustomInstrument) {
              message.warning(
                'Custom instruments must be brought by yourself. Studio equipment rental is not available for custom instruments.'
              );
              return;
            }

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
            <Radio
              value={INSTRUMENT_SOURCE.STUDIO_SIDE}
              disabled={instrument.isCustomInstrument}
            >
              <Space>
                Rent from studio
                {instrument.isCustomInstrument && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    Not available for custom instruments
                  </Tag>
                )}
              </Space>
            </Radio>
          </Space>
        </Radio.Group>

        {/* Equipment Selection */}
        {instrument.instrumentSource === INSTRUMENT_SOURCE.STUDIO_SIDE &&
          !instrument.isCustomInstrument && (
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
                    options={availableEquipment.map(eq => {
                      const priceLabel =
                        typeof eq.rentalFee === 'number'
                          ? ` - ${eq.rentalFee.toLocaleString('vi-VN')} VND`
                          : '';
                      return {
                        value: eq.equipmentId,
                        label: `${eq.brand} ${eq.model} - ${eq.equipmentName}${priceLabel}`,
                      };
                    })}
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
                        • Fee: {instrument.rentalFee?.toLocaleString('vi-VN')}{' '}
                        VND
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
