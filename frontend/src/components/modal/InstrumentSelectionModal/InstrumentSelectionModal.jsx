// InstrumentSelectionModal.jsx - Modal chọn instruments với hình ảnh và giá
import { Modal, Row, Col, Card, Empty, Spin, Tag, Badge } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import styles from './InstrumentSelectionModal.module.css';

const InstrumentSelectionModal = ({
  visible,
  onCancel,
  instruments = [],
  loading = false,
  selectedInstruments = [], // Array of instrument IDs (for multiple) or single ID
  onSelect,
  multipleSelection = false, // true for arrangement, false for transcription
  title = 'Select Instruments',
}) => {
  const handleInstrumentClick = instrument => {
    if (multipleSelection) {
      // Multiple selection (arrangement)
      const isSelected = selectedInstruments.includes(instrument.instrumentId);
      const newSelection = isSelected
        ? selectedInstruments.filter(id => id !== instrument.instrumentId)
        : [...selectedInstruments, instrument.instrumentId];
      onSelect(newSelection);
    } else {
      // Single selection (transcription)
      onSelect(instrument.instrumentId);
    }
  };

  const isInstrumentSelected = instrumentId => {
    if (multipleSelection) {
      return selectedInstruments.includes(instrumentId);
    }
    return selectedInstruments === instrumentId;
  };

  // Calculate total price
  const totalPrice = multipleSelection
    ? instruments
        .filter(inst => selectedInstruments.includes(inst.instrumentId))
        .reduce((sum, inst) => sum + (inst.basePrice || 0), 0)
    : instruments.find(inst => inst.instrumentId === selectedInstruments)
        ?.basePrice || 0;

  const selectedCount = multipleSelection
    ? selectedInstruments.length
    : selectedInstruments
      ? 1
      : 0;

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
          <div style={{ fontSize: 18, fontWeight: 'normal' }}>
            {selectedCount > 0 && (
              <>
                <Tag color="blue">{selectedCount} selected</Tag>
                <Tag color="green">Total: ${totalPrice.toFixed(2)}</Tag>
              </>
            )}
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      styles={{
        body: {
          maxHeight: '70vh',
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
                      ${Number(instrument.basePrice || 0).toFixed(2)}
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
                        </div>
                      }
                      description={
                        <div className={styles.cardDescription}>
                          <Tag color="cyan" style={{ margin: 0 }}>
                            {instrument.usage === 'both'
                              ? 'All Services'
                              : instrument.usage}
                          </Tag>
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
        </div>
      )}
    </Modal>
  );
};

export default InstrumentSelectionModal;
