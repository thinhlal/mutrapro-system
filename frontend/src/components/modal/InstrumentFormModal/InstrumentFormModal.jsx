import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  Image,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const { Option } = Select;

export default function InstrumentFormModal({
  visible,
  onCancel,
  onSubmit,
  editMode = false,
  initialData = null,
  form,
}) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (visible) {
      if (editMode && initialData) {
        setImagePreview(initialData.image);
        setImageFile(null);
      } else {
        setImagePreview(null);
        setImageFile(null);
      }
    }
  }, [visible, editMode, initialData]);

  const handleImageChange = info => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProps = {
    beforeUpload: file => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ có thể upload file ảnh!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      return false;
    },
    onChange: handleImageChange,
    maxCount: 1,
    accept: 'image/*',
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values, imageFile);
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <Modal
      title={editMode ? 'Edit Instrument' : 'Create New Instrument'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText={editMode ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Instrument Name"
          name="instrumentName"
          rules={[
            { required: true, message: 'Please input instrument name!' },
          ]}
        >
          <Input placeholder="e.g., Piano, Guitar, Violin" />
        </Form.Item>

        <Form.Item
          label="Usage"
          name="usage"
          rules={[{ required: true, message: 'Please select usage!' }]}
        >
          <Select placeholder="Select usage type">
            <Option value="transcription">Transcription</Option>
            <Option value="arrangement">Arrangement</Option>
            <Option value="both">Both</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Base Price (USD)"
          name="basePrice"
          rules={[
            { required: true, message: 'Please input base price!' },
            {
              validator: (_, value) => {
                if (value === null || value === undefined || value === '') {
                  return Promise.reject(new Error('Please input base price!'));
                }
                if (Number(value) < 0) {
                  return Promise.reject(new Error('Price must be positive!'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            placeholder="e.g., 50.00"
            formatter={value =>
              value !== undefined && value !== null && value !== ''
                ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                : ''
            }
            parser={value => value?.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        {editMode && (
          <Form.Item
            label="Active"
            name="active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}

        <Form.Item label="Instrument Image">
          <Upload {...uploadProps} listType="picture-card">
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Upload</div>
            </div>
          </Upload>
          {imagePreview && (
            <div style={{ marginTop: 10 }}>
              <Image
                src={imagePreview}
                alt="Preview"
                width={200}
                style={{ borderRadius: 4 }}
              />
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}

InstrumentFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  editMode: PropTypes.bool,
  initialData: PropTypes.object,
  form: PropTypes.object.isRequired,
};

