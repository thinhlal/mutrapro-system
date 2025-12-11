import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Upload,
  Image,
  message,
  Select,
  Spin,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getAllSkills } from '../../../services/specialistService';

const { TextArea } = Input;
const { Option } = Select;

function EquipmentFormModal({
  visible,
  onCancel,
  onSubmit,
  editMode = false,
  initialData = null,
  form,
  loading = false,
}) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  useEffect(() => {
    if (visible) {
      // Load skills for skill mapping
      loadSkills();

      if (editMode && initialData) {
        // Equipment image is already a public URL
        if (initialData.image) {
          setImagePreview(initialData.image);
        } else {
          setImagePreview(null);
        }
        setImageFile(null);
      } else {
        setImagePreview(null);
        setImageFile(null);
      }
    }
  }, [visible, editMode, initialData]);

  const loadSkills = async () => {
    setLoadingSkills(true);
    try {
      const response = await getAllSkills();
      if (response.data) {
        // Chỉ lấy skills có type RECORDING_ARTIST và category INSTRUMENT
        // Vì equipment chỉ dùng cho instrumentalists, không dùng cho vocalists
        const filteredSkills = response.data.filter(skill => {
          const skillType = skill.skillType || skill.skillType?.name || '';
          const category = skill.recordingCategory || skill.recordingCategory?.name || '';
          return skillType === 'RECORDING_ARTIST' && category === 'INSTRUMENT';
        });
        setSkills(filteredSkills);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoadingSkills(false);
    }
  };

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
      title={editMode ? 'Edit Equipment' : 'Create New Equipment'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={700}
      okText={editMode ? 'Update' : 'Create'}
      confirmLoading={loading}
    >
      <Spin spinning={loading} tip="Loading equipment details...">
        <Form form={form} layout="vertical">
        <Form.Item
          label="Equipment Name"
          name="equipmentName"
          rules={[{ required: true, message: 'Please input equipment name!' }]}
        >
          <Input placeholder="e.g., Yamaha C3 Grand Piano" />
        </Form.Item>

        <Form.Item label="Brand" name="brand">
          <Input placeholder="e.g., Yamaha" />
        </Form.Item>

        <Form.Item label="Model" name="model">
          <Input placeholder="e.g., C3" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <TextArea
            rows={3}
            placeholder="Equipment description..."
          />
        </Form.Item>

        <Form.Item
          label="Rental Fee (VND)"
          name="rentalFee"
          rules={[
            {
              validator: (_, value) => {
                if (value === null || value === undefined || value === '') {
                  return Promise.resolve(); // Optional
                }
                if (Number(value) < 0) {
                  return Promise.reject(new Error('Rental fee must be positive!'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1000}
            placeholder="e.g., 500000"
            formatter={value =>
              value !== undefined && value !== null && value !== ''
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                : ''
            }
            parser={value => value?.replace(/,/g, '')}
          />
        </Form.Item>

        <Form.Item
          label="Total Quantity"
          name="totalQuantity"
          rules={[
            {
              validator: (_, value) => {
                if (value === null || value === undefined || value === '') {
                  return Promise.resolve(); // Optional, default 1
                }
                if (Number(value) < 0) {
                  return Promise.reject(new Error('Quantity must be positive!'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="e.g., 1"
          />
        </Form.Item>

        <Form.Item
          label="Map with Skills"
          name="skillIds"
          tooltip="Select skills that can use this equipment"
        >
          <Select
            mode="multiple"
            placeholder="Select skills"
            loading={loadingSkills}
            allowClear
          >
            {skills.map(skill => (
              <Option key={skill.skillId} value={skill.skillId}>
                {skill.skillName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {editMode && (
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}

        <Form.Item label="Equipment Image">
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
      </Spin>
    </Modal>
  );
}

EquipmentFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  editMode: PropTypes.bool,
  initialData: PropTypes.object,
  form: PropTypes.object.isRequired,
  loading: PropTypes.bool,
};

export default EquipmentFormModal;

