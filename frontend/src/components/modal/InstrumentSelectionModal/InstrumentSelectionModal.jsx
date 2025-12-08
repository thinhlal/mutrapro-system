// InstrumentSelectionModal.jsx - Modal chọn instruments với hình ảnh và giá
import { Modal, Row, Col, Card, Empty, Spin, Tag, Badge, Radio } from 'antd';
import { CheckCircleFilled, StarFilled } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import styles from './InstrumentSelectionModal.module.css';

const InstrumentSelectionModal = ({
  visible,
  onCancel,
  instruments = [],
  loading = false,
  selectedInstruments = [], // Array of instrument IDs (for multiple) or single ID
  mainInstrumentId = null, // Main instrument ID (for arrangement)
  onSelect,
  onMainInstrumentChange, // Callback khi main instrument thay đổi
  multipleSelection = false, // true for arrangement, false for transcription
  title = 'Select Instruments',
}) => {
  const [localMainInstrumentId, setLocalMainInstrumentId] =
    useState(mainInstrumentId);

  // Sync local state với prop khi prop thay đổi
  useEffect(() => {
    setLocalMainInstrumentId(mainInstrumentId);
  }, [mainInstrumentId]);

  const handleInstrumentClick = instrument => {
    if (multipleSelection) {
      // Multiple selection (arrangement)
      const isSelected = selectedInstruments.includes(instrument.instrumentId);
      const newSelection = isSelected
        ? selectedInstruments.filter(id => id !== instrument.instrumentId)
        : [...selectedInstruments, instrument.instrumentId];

      // Nếu bỏ chọn main instrument, reset main instrument
      if (isSelected && localMainInstrumentId === instrument.instrumentId) {
        setLocalMainInstrumentId(null);
        onMainInstrumentChange?.(null);
      }

      onSelect(newSelection);
    } else {
      // Single selection (transcription)
      onSelect(instrument.instrumentId);
    }
  };

  const handleMainInstrumentChange = e => {
    const newMainInstrumentId = e.target.value;
    setLocalMainInstrumentId(newMainInstrumentId);
    onMainInstrumentChange?.(newMainInstrumentId);
  };

  const isInstrumentSelected = instrumentId => {
    if (multipleSelection) {
      return selectedInstruments.includes(instrumentId);
    }
    return selectedInstruments === instrumentId;
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{title}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1600}
      styles={{
        body: {
          maxHeight: '80vh',
          overflowY: 'auto',
          overflowX: 'hidden',
        },
      }}
    >
      <Spin spinning={loading}>
        {instruments.length === 0 ? (
          <Empty description="No instruments available" />
        ) : (
          <Row gutter={[16, 16]}>
            {instruments.map(instrument => (
              <Col xs={24} sm={12} md={8} key={instrument.instrumentId}>
                <Badge.Ribbon
                  text={
                    <span style={{ fontSize: 18 }}>
                      {Number(instrument.basePrice || 0).toFixed(2)} VND
                    </span>
                  }
                  color="green"
                >
                  <Card
                    hoverable
                    className={`${styles.instrumentCard} ${
                      isInstrumentSelected(instrument.instrumentId)
                        ? styles.selected
                        : ''
                    }`}
                    onClick={() => handleInstrumentClick(instrument)}
                    cover={
                      <div className={styles.imageContainer}>
                        {instrument.image ? (
                          <img
                            alt={instrument.instrumentName}
                            src={instrument.image}
                            className={styles.instrumentImage}
                            onError={e => {
                              // Hide image on error
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={styles.noImage}>
                            <span>No Image</span>
                          </div>
                        )}
                        {isInstrumentSelected(instrument.instrumentId) && (
                          <div className={styles.selectedOverlay}>
                            <CheckCircleFilled className={styles.checkIcon} />
                          </div>
                        )}
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <div className={styles.cardTitle}>
                          {instrument.instrumentName}
                          {multipleSelection &&
                            localMainInstrumentId ===
                              instrument.instrumentId && (
                              <Tag
                                color="gold"
                                icon={<StarFilled />}
                                style={{ marginLeft: 8 }}
                              >
                                Main
                              </Tag>
                            )}
                        </div>
                      }
                      description={
                        <div className={styles.cardDescription}>
                          <Tag color="cyan" style={{ margin: 0 }}>
                            {instrument.usage === 'both'
                              ? 'All Services'
                              : instrument.usage}
                          </Tag>
                          {multipleSelection &&
                            isInstrumentSelected(instrument.instrumentId) && (
                              <div style={{ marginTop: 8 }}>
                                <Radio
                                  checked={
                                    localMainInstrumentId ===
                                    instrument.instrumentId
                                  }
                                  onChange={handleMainInstrumentChange}
                                  value={instrument.instrumentId}
                                  onClick={e => e.stopPropagation()}
                                >
                                  Set as Main Instrument
                                </Radio>
                              </div>
                            )}
                        </div>
                      }
                    />
                  </Card>
                </Badge.Ribbon>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {!multipleSelection && (
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            color: '#888',
            fontSize: 13,
          }}
        >
          Click on an instrument to select it
        </div>
      )}
      {multipleSelection && (
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            color: '#888',
            fontSize: 13,
          }}
        >
          You can select multiple instruments. Click to toggle selection.
          {selectedInstruments.length > 0 && (
            <div style={{ marginTop: 8, color: '#1890ff' }}>
              Select one instrument as "Main Instrument" by clicking the radio
              button.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default InstrumentSelectionModal;
