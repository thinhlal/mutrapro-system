// Simplified ArrangementQuotePage - chỉ chọn instruments (multiple)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Select,
  Empty,
  Spin,
  message,
  Card,
  Descriptions,
  Modal,
  Space,
  Tag,
} from 'antd';
import { EyeOutlined, SendOutlined, FileOutlined } from '@ant-design/icons';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
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
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    instruments: instrumentsData,
    loading: instrumentsLoading,
    error: instrumentsError,
    fetchInstruments,
    getInstrumentsByUsage,
  } = useInstrumentStore();

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

      // Prepare data để gửi API
      const requestData = {
        requestType: 'arrangement',
        title: formData.title,
        description: formData.description,
        tempoPercentage: formData.tempoPercentage,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        instrumentIds: selectedInstruments, // NHIỀU INSTRUMENTS
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
          <Spin spinning={instrumentsLoading}>
            <Select
              mode="multiple"
              placeholder="Select instruments"
              value={selectedInstruments}
              onChange={setSelectedInstruments}
              style={{ width: '100%' }}
              size="large"
              options={getInstrumentsByUsage('arrangement').map(inst => ({
                value: inst.instrumentId,
                label: inst.instrumentName,
              }))}
              tagRender={props => (
                <Tag closable={props.closable} onClose={props.onClose} color="blue">
                  {props.label}
                </Tag>
              )}
              notFoundContent={
                instrumentsError ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={instrumentsError}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Không có nhạc cụ nào"
                  />
                )
              }
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              You can select multiple instruments for arrangement
            </Text>
          </Spin>
        </Card>

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
            <Descriptions.Item label="Service Type">Arrangement</Descriptions.Item>
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
            <Descriptions.Item label="Instruments">
              <Space wrap>
                {selectedInstruments.map(id => {
                  const inst = instrumentsData.find(i => i.instrumentId === id);
                  return (
                    <Tag key={id} color="blue">
                      {inst?.instrumentName || id}
                    </Tag>
                  );
                })}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}

