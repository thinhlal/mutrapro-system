// Simplified ArrangementQuotePage - chỉ chọn instruments (multiple)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Empty,
  message,
  Card,
  Space,
  Tag,
} from 'antd';
import { EyeOutlined, FileOutlined, SelectOutlined } from '@ant-design/icons';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import InstrumentSelectionModal from '../../../../components/modal/InstrumentSelectionModal/InstrumentSelectionModal';
import ReviewRequestModal from '../../../../components/modal/ReviewRequestModal/ReviewRequestModal';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import { createServiceRequest } from '../../../../services/serviceRequestService';
import styles from './ArrangementQuotePage.module.css';

const { Title, Text } = Typography;

export default function ArrangementQuotePageSimplified() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // Data từ previous pages
  const formData = navState.formData || {};
  const uploadedFile = navState.uploadedFile;
  const fileName = navState.fileName || 'Untitled';
  const fileType = navState.fileType || 'unknown';

  // Instrument selection (NHIỀU INSTRUMENTS)
  const [selectedInstruments, setSelectedInstruments] = useState([]);
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

  const arrangementInstruments = getInstrumentsByUsage('arrangement');
  
  // Calculate total price
  const totalPrice = instrumentsData
    .filter(inst => selectedInstruments.includes(inst.instrumentId))
    .reduce((sum, inst) => sum + (inst.basePrice || 0), 0);

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

  const handleInstrumentSelect = instrumentIds => {
    setSelectedInstruments(instrumentIds);
  };

  const handleReview = () => {
    if (!selectedInstruments || selectedInstruments.length === 0) {
      message.warning('Please select at least one instrument');
      return;
    }
    setReviewModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Tạo object chứa giá của từng instrument
      const instrumentPrices = {};
      selectedInstruments.forEach(id => {
        const inst = instrumentsData.find(i => i.instrumentId === id);
        instrumentPrices[id] = inst?.basePrice || 0;
      });

      // Prepare data để gửi API - GỬI KÈM GIÁ
      const requestData = {
        requestType: 'arrangement',
        title: formData.title,
        description: formData.description,
        tempoPercentage: formData.tempoPercentage,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        instrumentIds: selectedInstruments, // NHIỀU INSTRUMENTS
        instrumentPrices: instrumentPrices, // Gửi kèm giá từng instrument
        totalPrice: totalPrice, // Tổng giá
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
        <Title level={2}>Review & Select Instruments</Title>

        <Card title="File Preview" style={{ marginBottom: 24 }}>
          <Space>
            <FileOutlined style={{ fontSize: 24 }} />
            <div>
              <Text strong>{fileName}</Text>
              <br />
              <Text type="secondary">{fileType}</Text>
            </div>
          </Space>
        </Card>

        <Card title="Select Instruments (Required - Multiple Selection)">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Button
              type="primary"
              size="large"
              icon={<SelectOutlined />}
              onClick={() => setInstrumentModalVisible(true)}
              block
            >
              {selectedInstruments.length > 0
                ? `Selected: ${selectedInstruments.length} instruments ($${totalPrice.toFixed(2)})`
                : 'Select Instruments'}
            </Button>

            {selectedInstruments.length > 0 && (
              <Card size="small" style={{ background: '#f0f7ff' }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Selected Instruments:
                  </div>
                  <Space wrap>
                    {selectedInstruments.map(id => {
                      const inst = instrumentsData.find(i => i.instrumentId === id);
                      return inst ? (
                        <Tag key={id} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                          {inst.instrumentName} - ${Number(inst.basePrice || 0).toFixed(2)}
                        </Tag>
                      ) : null;
                    })}
                  </Space>
                  <div style={{ marginTop: 8, fontWeight: 600, fontSize: 16, color: '#52c41a' }}>
                    Total: ${totalPrice.toFixed(2)}
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
          instruments={arrangementInstruments}
          loading={instrumentsLoading}
          selectedInstruments={selectedInstruments}
          onSelect={handleInstrumentSelect}
          multipleSelection={true}
          title="Select Instruments for Arrangement (Multiple)"
        />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate(-1)}>Back</Button>
            <Button
              type="primary"
              size="large"
              icon={<EyeOutlined />}
              onClick={handleReview}
              disabled={!selectedInstruments || selectedInstruments.length === 0}
            >
              Review Request
            </Button>
          </Space>
        </div>

        {/* Review Modal */}
        <ReviewRequestModal
          visible={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          onSubmit={handleSubmit}
          loading={submitting}
          formData={formData}
          fileName={fileName}
          serviceType="arrangement"
          selectedInstruments={selectedInstruments}
          instrumentsData={instrumentsData}
          totalPrice={totalPrice}
        />
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}

