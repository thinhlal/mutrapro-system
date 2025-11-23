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
  Spin,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  StarOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  getMyProfileDetail,
  updateMyProfile,
  getAvailableSkills,
  getMySkills,
  addSkill,
  updateMySkill,
  deleteMySkill,
  getMyDemos,
  createMyDemo,
  updateMyDemo,
  deleteMyDemo,
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
  const [demos, setDemos] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [availableSkillsLoading, setAvailableSkillsLoading] = useState(false);
  const [demosLoading, setDemosLoading] = useState(false);

  const [profileForm] = Form.useForm();
  const [skillForm] = Form.useForm();
  const [demoForm] = Form.useForm();

  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillLoading, setSkillLoading] = useState(false);

  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [editingDemo, setEditingDemo] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'skills') {
      fetchSkills();
      fetchAvailableSkills();
    } else if (activeTab === 'demos') {
      fetchDemos();
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
          portfolioUrl: response.data.specialist?.portfolioUrl,
          bio: response.data.specialist?.bio,
          experienceYears: response.data.specialist?.experienceYears,
        });
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemos = async () => {
    setDemosLoading(true);
    try {
      const response = await getMyDemos();
      if (response.data) {
        setDemos(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải demos');
    } finally {
      setDemosLoading(false);
    }
  };

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const response = await getMySkills();
      if (response.data) {
        setSkills(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải skills');
    } finally {
      setSkillsLoading(false);
    }
  };

  const fetchAvailableSkills = async () => {
    setAvailableSkillsLoading(true);
    try {
      const response = await getAvailableSkills();
      if (response.data) {
        setAvailableSkills(response.data);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tải danh sách skills');
    } finally {
      setAvailableSkillsLoading(false);
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
      skillId: skill.skill?.skillId || skill.skillId,
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

  const handleAddDemo = () => {
    setEditingDemo(null);
    demoForm.resetFields();
    setDemoModalVisible(true);
  };

  const handleEditDemo = demo => {
    setEditingDemo(demo);
    demoForm.setFieldsValue({
      title: demo.title,
      description: demo.description,
      skillId: demo.skill?.skillId || null,
      fileId: demo.fileId,
      previewUrl: demo.previewUrl,
      demoOrder: demo.demoOrder,
      isFeatured: demo.isFeatured,
    });
    setDemoModalVisible(true);
  };

  const handleDemoSubmit = async values => {
    setDemoLoading(true);
    try {
      const demoData = {
        ...values,
      };
      if (editingDemo) {
        await updateMyDemo(editingDemo.demoId, demoData);
        message.success('Cập nhật demo thành công');
      } else {
        await createMyDemo(demoData);
        message.success('Tạo demo thành công');
      }
      setDemoModalVisible(false);
      demoForm.resetFields();
      fetchDemos();
    } catch (error) {
      message.error(error.message || 'Không thể lưu demo');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDeleteDemo = async demoId => {
    try {
      await deleteMyDemo(demoId);
      message.success('Xóa demo thành công');
      fetchDemos();
    } catch (error) {
      message.error(error.message || 'Không thể xóa demo');
    }
  };

  const getSpecializationDisplayName = specialization => {
    const names = {
      TRANSCRIPTION: 'Transcription',
      ARRANGEMENT: 'Arrangement',
      RECORDING_ARTIST: 'Recording Artist',
    };
    return names[specialization] || specialization;
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
    const skillName = skill.skill?.skillName || skill.skillName || 'Unknown';
    const proficiency = skill.proficiencyLevel || '';
    const years = skill.yearsExperience ? `${skill.yearsExperience} years` : '';
    return `${skillName} – ${proficiency} – ${years}`;
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

  const demoColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Skill',
      key: 'skill',
      render: (_, record) => record.skill?.skillName || 'N/A',
    },
    {
      title: 'Preview URL',
      dataIndex: 'previewUrl',
      key: 'previewUrl',
      render: url =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        ) : (
          'N/A'
        ),
    },
    {
      title: 'Public',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: isPublic => (
        <Tag color={isPublic ? 'green' : 'default'}>
          {isPublic ? 'Public' : 'Private'}
        </Tag>
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
            onClick={() => handleEditDemo(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa demo này?"
            onConfirm={() => handleDeleteDemo(record.demoId)}
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

  const isRecordingArtist =
    profileDetail?.specialist?.specialization === 'RECORDING_ARTIST';

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
                <Spin spinning={loading}>
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
                        value={
                          profileDetail?.specialist?.specialization
                            ? getSpecializationDisplayName(
                                profileDetail.specialist.specialization
                              )
                            : 'N/A'
                        }
                        disabled
                        style={{ color: '#000' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="experienceYears"
                      label="Experience Years"
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                          message: 'Must be non-negative',
                        },
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
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                      >
                        Save Changes
                      </Button>
                    </Form.Item>
                  </Form>

                  <Divider />

                  <Card title="Statistics" className={styles.statsCard}>
                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="Specialist ID">
                        {profileDetail?.specialist?.specialistId || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Specialization">
                        {profileDetail?.specialist?.specialization
                          ? getSpecializationDisplayName(
                              profileDetail.specialist.specialization
                            )
                          : 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag
                          color={
                            profileDetail?.specialist?.status === 'ACTIVE'
                              ? 'green'
                              : profileDetail?.specialist?.status ===
                                  'SUSPENDED'
                                ? 'orange'
                                : 'red'
                          }
                        >
                          {profileDetail?.specialist?.status || 'N/A'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Max Concurrent Tasks">
                        {profileDetail?.specialist?.maxConcurrentTasks || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="Rating">
                        <Rate
                          disabled
                          defaultValue={profileDetail?.specialist?.rating || 0}
                          allowHalf
                        />
                        <span style={{ marginLeft: 8 }}>
                          {profileDetail?.specialist?.rating || 0} / 5.0
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Total Projects">
                        {profileDetail?.specialist?.totalProjects || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="On-time Rate">
                        {profileDetail?.specialist?.onTimeRate
                          ? `${(profileDetail.specialist.onTimeRate * 100).toFixed(1)}%`
                          : 'N/A'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Spin>
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
                <Spin spinning={skillsLoading || availableSkillsLoading}>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddSkill}
                      disabled={availableSkillsLoading}
                    >
                      Add Skill
                    </Button>
                  </div>

                  {skills.length === 0 && !skillsLoading ? (
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
                      loading={skillsLoading}
                    />
                  )}
                </Spin>
              ),
            },
            ...(isRecordingArtist
              ? [
                  {
                    key: 'demos',
                    label: (
                      <span>
                        <PlayCircleOutlined />
                        Demos
                      </span>
                    ),
                    children: (
                      <Spin spinning={demosLoading || availableSkillsLoading}>
                        <div style={{ marginBottom: 16 }}>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddDemo}
                            disabled={availableSkillsLoading}
                          >
                            Add Demo
                          </Button>
                        </div>

                        {demos.length === 0 && !demosLoading ? (
                          <Card>
                            <div
                              style={{ textAlign: 'center', padding: '40px 0' }}
                            >
                              <PlayCircleOutlined
                                style={{ fontSize: 48, color: '#ccc' }}
                              />
                              <p style={{ marginTop: 16, color: '#999' }}>
                                Chưa có demo nào. Hãy thêm demo đầu tiên của
                                bạn!
                              </p>
                            </div>
                          </Card>
                        ) : (
                          <Table
                            columns={demoColumns}
                            dataSource={demos}
                            rowKey="demoId"
                            pagination={false}
                            loading={demosLoading}
                          />
                        )}
                      </Spin>
                    ),
                  },
                ]
              : []),
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
              <Select
                placeholder="Select skill"
                loading={availableSkillsLoading}
                notFoundContent={
                  availableSkillsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      Loading...
                    </div>
                  ) : (
                    'No skills available'
                  )
                }
              >
                {availableSkills
                  .filter(
                    skill =>
                      !skills.some(
                        mySkill =>
                          (mySkill.skill?.skillId || mySkill.skillId) ===
                          skill.skillId
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
                  <TextArea
                    rows={3}
                    placeholder="Enter certification details"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* Demo Modal */}
      <Modal
        title={editingDemo ? 'Edit Demo' : 'Add Demo'}
        open={demoModalVisible}
        onCancel={() => {
          setDemoModalVisible(false);
          demoForm.resetFields();
        }}
        onOk={() => demoForm.submit()}
        confirmLoading={demoLoading}
        width={600}
      >
        <Form form={demoForm} layout="vertical" onFinish={handleDemoSubmit}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Vui lòng nhập title' }]}
          >
            <Input placeholder="Enter demo title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Enter demo description" />
          </Form.Item>

          <Form.Item
            name="fileId"
            label="File ID"
            rules={[
              { required: !editingDemo, message: 'Vui lòng nhập file ID' },
            ]}
          >
            <Input placeholder="Enter file ID" disabled={!!editingDemo} />
          </Form.Item>

          <Form.Item name="skillId" label="Skill">
            <Select
              placeholder="Select skill (optional)"
              allowClear
              loading={availableSkillsLoading}
              notFoundContent={
                availableSkillsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    Loading...
                  </div>
                ) : (
                  'No skills available'
                )
              }
            >
              {availableSkills
                .filter(skill => skill.skillType === 'RECORDING_ARTIST')
                .map(skill => (
                  <Option key={skill.skillId} value={skill.skillId}>
                    {skill.skillName}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="previewUrl"
            label="Preview URL"
            rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
          >
            <Input placeholder="https://example.com/demo" />
          </Form.Item>

          <Form.Item name="demoOrder" label="Demo Order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="isFeatured" label="Featured" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SpecialistProfile;
