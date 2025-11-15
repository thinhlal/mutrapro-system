import { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  message,
  Table,
  Space,
  Tag,
  Modal,
  Select,
  DatePicker,
  Switch,
  InputNumber,
  Popconfirm,
  Typography,
  Descriptions,
  Avatar,
  Rate,
  Divider,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  StarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  getMyProfileDetail,
  updateMyProfile,
  getAvailableSkills,
  getMySkills,
  addSkill,
  updateMySkill,
  deleteMySkill,
} from '../../../services/specialistService';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';
import styles from './SpecialistProfile.module.css';

const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

const SpecialistProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [profileDetail, setProfileDetail] = useState(null);
  const [skills, setSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);

  const [profileForm] = Form.useForm();
  const [skillForm] = Form.useForm();

  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillLoading, setSkillLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'skills') {
      fetchSkills();
      fetchAvailableSkills();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await getMyProfileDetail();
      if (response.data) {
        setProfileDetail(response.data);
        profileForm.setFieldsValue({
          portfolioUrl: response.data.portfolioUrl,
          bio: response.data.bio,
          experienceYears: response.data.experienceYears,
        });
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await getMySkills();
      if (response.data) {
        setSkills(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải skills');
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      const response = await getAvailableSkills();
      if (response.data) {
        setAvailableSkills(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách skills');
    }
  };

  const handleUpdateProfile = async values => {
    setLoading(true);
    try {
      await updateMyProfile(values);
      message.success('Cập nhật profile thành công');
      fetchProfile();
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    setEditingSkill(null);
    skillForm.resetFields();
    setSkillModalVisible(true);
  };

  const handleEditSkill = skill => {
    setEditingSkill(skill);
    skillForm.setFieldsValue({
      skillId: skill.skillId,
      proficiencyLevel: skill.proficiencyLevel,
      yearsExperience: skill.yearsExperience,
      lastUsedDate: skill.lastUsedDate ? dayjs(skill.lastUsedDate) : null,
      isCertified: skill.isCertified,
      certificationDetails: skill.certificationDetails,
    });
    setSkillModalVisible(true);
  };

  const handleSkillSubmit = async values => {
    setSkillLoading(true);
    try {
      const skillData = {
        ...values,
        lastUsedDate: values.lastUsedDate
          ? values.lastUsedDate.format('YYYY-MM-DD')
          : null,
      };
      if (editingSkill) {
        await updateMySkill(editingSkill.specialistSkillId, skillData);
        message.success('Cập nhật skill thành công');
      } else {
        await addSkill(skillData);
        message.success('Thêm skill thành công');
      }
      setSkillModalVisible(false);
      skillForm.resetFields();
      fetchSkills();
    } catch (error) {
      message.error(error.message || 'Không thể lưu skill');
    } finally {
      setSkillLoading(false);
    }
  };

  const handleDeleteSkill = async skillId => {
    try {
      await deleteMySkill(skillId);
      message.success('Xóa skill thành công');
      fetchSkills();
    } catch (error) {
      message.error(error.message || 'Không thể xóa skill');
    }
  };

  const getProficiencyColor = level => {
    const colors = {
      BEGINNER: 'default',
      INTERMEDIATE: 'blue',
      ADVANCED: 'orange',
      EXPERT: 'red',
    };
    return colors[level] || 'default';
  };

  const formatSkillDisplay = skill => {
    const proficiency = skill.proficiencyLevel || '';
    const years = skill.yearsExperience ? `${skill.yearsExperience} năm` : '';
    return `${skill.skillName} – ${proficiency} – ${years}`;
  };

  const skillColumns = [
    {
      title: 'Skill',
      key: 'skill',
      render: (_, record) => (
        <span style={{ fontSize: '16px' }}>{formatSkillDisplay(record)}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditSkill(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa skill này?"
            onConfirm={() => handleDeleteSkill(record.specialistSkillId)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card>
        <Title level={2}>
          <UserOutlined /> My Specialist Profile
        </Title>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'general',
              label: (
                <span>
                  <InfoCircleOutlined />
                  General Info
                </span>
              ),
              children: (
                <>
                  <div className={styles.profileHeader}>
                    <Avatar
                      size={100}
                      src={user?.avatarUrl}
                      icon={<UserOutlined />}
                      className={styles.avatar}
                    />
                    <div className={styles.profileInfo}>
                      <Title level={3} style={{ margin: 0 }}>
                        {user?.fullName || 'Specialist'}
                      </Title>
                      <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <Divider />

                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleUpdateProfile}
                    className={styles.profileForm}
                  >
                    <Form.Item label="Specialization">
                      <Input
                        value="Transcription"
                        disabled
                        style={{ color: '#000' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="experienceYears"
                      label="Experience Years"
                      rules={[
                        { type: 'number', min: 0, message: 'Must be non-negative' },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={100}
                        style={{ width: '100%' }}
                        placeholder="Enter years of experience"
                      />
                    </Form.Item>

                    <Form.Item
                      name="portfolioUrl"
                      label="Portfolio URL"
                      rules={[
                        { type: 'url', message: 'Please enter a valid URL' },
                      ]}
                    >
                      <Input placeholder="https://your-portfolio.com" />
                    </Form.Item>

                    <Form.Item name="bio" label="Short Bio">
                      <TextArea
                        rows={4}
                        placeholder="Giới thiệu về bản thân..."
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        Save Changes
                      </Button>
                    </Form.Item>
                  </Form>

                  <Divider />

                  <Card title="Statistics" className={styles.statsCard}>
                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="Rating">
                        <Rate
                          disabled
                          defaultValue={profileDetail?.rating || 0}
                          allowHalf
                        />
                        <span style={{ marginLeft: 8 }}>
                          {profileDetail?.rating || 0} / 5.0
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Total Projects">
                        {profileDetail?.totalProjects || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="On-time Rate">
                        {profileDetail?.onTimeRate
                          ? `${(profileDetail.onTimeRate * 100).toFixed(1)}%`
                          : 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag
                          color={
                            profileDetail?.status === 'ACTIVE'
                              ? 'green'
                              : profileDetail?.status === 'SUSPENDED'
                              ? 'orange'
                              : 'red'
                          }
                        >
                          {profileDetail?.status || 'N/A'}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </>
              ),
            },
            {
              key: 'skills',
              label: (
                <span>
                  <StarOutlined />
                  Skills
                </span>
              ),
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddSkill}
                    >
                      Add Skill
                    </Button>
                  </div>

                  {skills.length === 0 ? (
                    <Card>
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <StarOutlined style={{ fontSize: 48, color: '#ccc' }} />
                        <p style={{ marginTop: 16, color: '#999' }}>
                          Chưa có skill nào. Hãy thêm skill đầu tiên của bạn!
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Table
                      columns={skillColumns}
                      dataSource={skills}
                      rowKey="specialistSkillId"
                      pagination={false}
                    />
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Skill Modal */}
      <Modal
        title={editingSkill ? 'Edit Skill' : 'Add Skill'}
        open={skillModalVisible}
        onCancel={() => {
          setSkillModalVisible(false);
          skillForm.resetFields();
        }}
        onOk={() => skillForm.submit()}
        confirmLoading={skillLoading}
        width={600}
      >
        <Form form={skillForm} layout="vertical" onFinish={handleSkillSubmit}>
          {!editingSkill && (
            <Form.Item
              name="skillId"
              label="Skill"
              rules={[{ required: true, message: 'Vui lòng chọn skill' }]}
            >
              <Select placeholder="Select skill">
                {availableSkills
                  .filter(
                    skill =>
                      !skills.some(
                        mySkill => mySkill.skillId === skill.skillId
                      )
                  )
                  .map(skill => (
                    <Option key={skill.skillId} value={skill.skillId}>
                      {skill.skillName}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="proficiencyLevel"
            label="Proficiency Level"
            rules={[
              { required: true, message: 'Vui lòng chọn proficiency level' },
            ]}
          >
            <Select placeholder="Select proficiency level">
              <Option value="BEGINNER">Beginner</Option>
              <Option value="INTERMEDIATE">Intermediate</Option>
              <Option value="ADVANCED">Advanced</Option>
              <Option value="EXPERT">Expert</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="yearsExperience"
            label="Years of Experience"
            rules={[
              { type: 'number', min: 0, message: 'Must be non-negative' },
            ]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="lastUsedDate" label="Last Used Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isCertified"
            label="Certified"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.isCertified !== currentValues.isCertified
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('isCertified') ? (
                <Form.Item
                  name="certificationDetails"
                  label="Certification Details"
                >
                  <TextArea rows={3} placeholder="Enter certification details" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SpecialistProfile;
