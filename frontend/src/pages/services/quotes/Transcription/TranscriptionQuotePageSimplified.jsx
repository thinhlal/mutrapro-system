// Simplified TranscriptionQuotePage - chỉ chọn instruments
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Empty,
  message,
  Card,
  Descriptions,
  Modal,
  Space,
  Tag,
} from 'antd';
import { EyeOutlined, SendOutlined, SelectOutlined } from '@ant-design/icons';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import InstrumentSelectionModal from '../../../../components/common/InstrumentSelectionModal/InstrumentSelectionModal';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import { createServiceRequest } from '../../../../services/serviceRequestService';
import styles from './TranscriptionQuotePage.module.css';
import WaveSurfer from 'wavesurfer.js';

const { Title, Text } = Typography;

const toMMSS = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    Math.floor(s % 60)
  ).padStart(2, '0')}`;

function WaveformViewer({ src }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const [isPlaying, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: '#bcd6ff',
      progressColor: '#3b82f6',
      cursorColor: '#ec8a1c',
      barWidth: 2,
      barGap: 1,
      responsive: true,
    });
    wsRef.current = ws;

    ws.load(src).catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Failed to load audio:', error);
      }
    });

    ws.on('ready', () => setDur(ws.getDuration()));
    ws.on('audioprocess', () => setCur(ws.getCurrentTime()));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    return () => {
      try {
        ws.destroy();
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Wavesurfer cleanup error:', error);
        }
      }
    };
  }, [src]);

  return (
    <div>
      <div
        ref={containerRef}
        onClick={() => wsRef.current?.playPause()}
        style={{ background: '#1f1f1f', borderRadius: 8, cursor: 'pointer' }}
        title="Click để Play/Pause"
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <Button size="small" onClick={() => wsRef.current?.playPause()}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Text type="secondary">
          {toMMSS(cur)} / {toMMSS(dur)}
        </Text>
      </div>
    </div>
  );
}

export default function TranscriptionQuotePageSimplified() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // Data từ previous pages
  const formData = navState.formData || {};
  const uploadedFile = navState.uploadedFile;
  const playSrc = navState.blobUrl || navState.url;
  const fileName = navState.fileName || 'Untitled';

  // Instrument selection (CHỈ 1 INSTRUMENT)
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [instrumentModalVisible, setInstrumentModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    instruments: instrumentsData,
    loading: instrumentsLoading,
    error: instrumentsError,
    fetchInstruments,
    getInstrumentsByUsage,
  } = useInstrumentStore();

  const transcriptionInstruments = getInstrumentsByUsage('transcription');
  const selectedInstrumentData = instrumentsData.find(
    i => i.instrumentId === selectedInstrument
  );

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  // Validate
  if (!formData || !formData.title) {
    return (
      <div className={styles.wrap}>
        <Header />
        <Empty description="Missing form data. Please go back and fill the form." />
        <Button type="primary" onClick={() => navigate('/detail-service')}>
          Go Back
        </Button>
        <Footer />
      </div>
    );
  }

  const handleInstrumentSelect = instrumentId => {
    setSelectedInstrument(instrumentId);
    setInstrumentModalVisible(false);
  };

  const handleReview = () => {
    if (!selectedInstrument) {
      message.warning('Please select an instrument');
      return;
    }
    setReviewModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const instrumentPrice = selectedInstrumentData?.basePrice || 0;

      // Prepare data để gửi API - GỬI KÈM GIÁ
      const requestData = {
        requestType: 'transcription',
        title: formData.title,
        description: formData.description,
        tempoPercentage: formData.tempoPercentage,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        instrumentIds: [selectedInstrument], // CHỈ 1 INSTRUMENT
        instrumentPrices: {
          [selectedInstrument]: instrumentPrice, // Gửi kèm giá
        },
        totalPrice: instrumentPrice, // Tổng giá
        files: uploadedFile ? [uploadedFile] : [],
      };

      const response = await createServiceRequest(requestData);

      if (response?.status === 'success') {
        message.success('Service request created successfully!');
        navigate('/'); // Hoặc navigate đến trang success
      } else {
        throw new Error(response?.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      message.error(error?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.wrap}>
        <Title level={2}>Review & Select Instrument</Title>

        <Card title="File Preview" style={{ marginBottom: 24 }}>
          <Text strong>File: {fileName}</Text>
          {playSrc && (
            <div style={{ marginTop: 16 }}>
              <WaveformViewer src={playSrc} />
            </div>
          )}
        </Card>

        <Card title="Select Instrument (Required)">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Button
              type="primary"
              size="large"
              icon={<SelectOutlined />}
              onClick={() => setInstrumentModalVisible(true)}
              block
            >
              {selectedInstrument
                ? 'Change Instrument'
                : 'Select Instrument'}
            </Button>

            {selectedInstrument && selectedInstrumentData && (
              <Card size="small" style={{ background: '#f0f7ff' }}>
                <Space align="center" size={16}>
                  {selectedInstrumentData.image && (
                    <img
                      src={selectedInstrumentData.image}
                      alt={selectedInstrumentData.instrumentName}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {selectedInstrumentData.instrumentName}
                    </div>
                    <Tag color="green" style={{ marginTop: 4 }}>
                      ${Number(selectedInstrumentData.basePrice || 0).toFixed(2)}
                    </Tag>
                  </div>
                </Space>
              </Card>
            )}
          </Space>
        </Card>

        {/* Instrument Selection Modal */}
        <InstrumentSelectionModal
          visible={instrumentModalVisible}
          onCancel={() => setInstrumentModalVisible(false)}
          instruments={transcriptionInstruments}
          loading={instrumentsLoading}
          selectedInstruments={selectedInstrument}
          onSelect={handleInstrumentSelect}
          multipleSelection={false}
          title="Select ONE Instrument for Transcription"
        />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate(-1)}>Back</Button>
            <Button
              type="primary"
              size="large"
              icon={<EyeOutlined />}
              onClick={handleReview}
              disabled={!selectedInstrument}
            >
              Review Request
            </Button>
          </Space>
        </div>

        {/* Review Modal */}
        <Modal
          title="Review Your Request"
          open={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          width={700}
          footer={[
            <Button key="back" onClick={() => setReviewModalVisible(false)}>
              Edit
            </Button>,
            <Button
              key="submit"
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmit}
            >
              Create Request
            </Button>,
          ]}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Service Type">Transcription</Descriptions.Item>
            <Descriptions.Item label="Title">{formData.title}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {formData.description}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Name">
              {formData.contactName}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email">
              {formData.contactEmail}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Phone">
              {formData.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label="Tempo Percentage">
              {formData.tempoPercentage}%
            </Descriptions.Item>
            <Descriptions.Item label="File">{fileName}</Descriptions.Item>
            <Descriptions.Item label="Instrument">
              {selectedInstrumentData?.instrumentName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Instrument Price">
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                ${Number(selectedInstrumentData?.basePrice || 0).toFixed(2)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Price">
              <span style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
                ${Number(selectedInstrumentData?.basePrice || 0).toFixed(2)}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}

