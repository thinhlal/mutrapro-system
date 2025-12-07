import { Modal, Button, Descriptions, Tag, Space } from 'antd';
import { SendOutlined, StarFilled } from '@ant-design/icons';
import PropTypes from 'prop-types';

export default function ReviewRequestModal({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  formData,
  fileName,
  serviceType,
  selectedInstruments = [],
  instrumentsData = [],
  totalPrice = 0,
}) {
  const getInstrumentData = instrumentId => {
    return instrumentsData.find(inst => inst.instrumentId === instrumentId);
  };

  return (
    <Modal
      title="Review Your Request"
      open={visible}
      onCancel={onCancel}
      width={serviceType === 'arrangement' ? 700 : 1000}
      footer={[
        <Button key="back" onClick={onCancel}>
          Edit
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={onSubmit}
        >
          Create Request
        </Button>,
      ]}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Service Type">
          {serviceType === 'transcription' ? 'Transcription' : 'Arrangement'}
        </Descriptions.Item>
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

        {serviceType === 'transcription' && selectedInstruments.length > 0 && (
          <>
            <Descriptions.Item label="Instrument">
              {getInstrumentData(selectedInstruments[0])?.instrumentName ||
                'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Instrument Price">
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                $
                {Number(
                  getInstrumentData(selectedInstruments[0])?.basePrice || 0
                ).toFixed(2)}
              </Tag>
            </Descriptions.Item>
          </>
        )}

        {serviceType === 'arrangement' && selectedInstruments.length > 0 && (
          <Descriptions.Item label="Instruments">
            <Space wrap direction="vertical" size={4}>
              {selectedInstruments.map(id => {
                const inst = getInstrumentData(id);
                const isMain = formData?.mainInstrumentId === id;
                return inst ? (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minWidth: 300,
                    }}
                  >
                    <span>
                      {isMain && <StarFilled style={{ color: '#faad14', marginRight: 4 }} />}
                      {inst.instrumentName}
                      {isMain && ' (Main)'}
                    </span>
                    <Tag color="green">
                      ${Number(inst.basePrice || 0).toFixed(2)}
                    </Tag>
                  </div>
                ) : null;
              })}
            </Space>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Total Price">
          <span style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
            {formatPrice(totalPrice, 'VND')}
          </span>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

ReviewRequestModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  formData: PropTypes.object.isRequired,
  fileName: PropTypes.string.isRequired,
  serviceType: PropTypes.oneOf(['transcription', 'arrangement']).isRequired,
  selectedInstruments: PropTypes.array,
  instrumentsData: PropTypes.array,
  totalPrice: PropTypes.number,
};
