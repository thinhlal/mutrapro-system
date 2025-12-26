import { useState, useEffect, useRef } from 'react';
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
  Radio,
  Upload,
  Row,
  Col,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  StarOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  getMyProfileDetail,
  updateMyProfile,
  uploadAvatar,
  getAvailableSkills,
  getMySkills,
  addSkill,
  updateMySkill,
  deleteMySkill,
  getMyDemos,
  createMyDemo,
  updateMyDemo,
  deleteMyDemo,
  uploadDemoFile,
} from '../../../services/specialistService';
import {
  getSpecialistAverageRating,
  getSpecialistReviews,
} from '../../../services/reviewService';
import { useAuth } from '../../../contexts/AuthContext';
import RatingStars from '../../../components/common/RatingStars/RatingStars';
import { MUSIC_GENRES } from '../../../constants/musicOptionsConstants';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import styles from './SpecialistProfile.module.css';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const SpecialistProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [profileDetail, setProfileDetail] = useState(null);
  const [skills, setSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [demos, setDemos] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [availableSkillsLoading, setAvailableSkillsLoading] = useState(false);
  const [demosLoading, setDemosLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(null);

  const [profileForm] = Form.useForm();
  const [skillForm] = Form.useForm();
  const [demoForm] = Form.useForm();

  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillLoading, setSkillLoading] = useState(false);
  const [selectedSkillCategory, setSelectedSkillCategory] = useState(null); // VOCAL hoặc INSTRUMENT

  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [editingDemo, setEditingDemo] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [uploadingDemoFile, setUploadingDemoFile] = useState(false);
  const [selectedDemoFile, setSelectedDemoFile] = useState(null); // File tạm thời chưa upload
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null); // URL tạm thời để preview audio

  const [avatarUploading, setAvatarUploading] = useState(false);

  // Cleanup preview URL khi component unmount
  useEffect(() => {
    return () => {
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);
  const fileInputRef = useRef(null);

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
    } else if (activeTab === 'reviews') {
      loadRatingAndReviews();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await getMyProfileDetail();
      if (response.data) {
        setProfileDetail(response.data);
        const specialist = response.data.specialist;
        profileForm.setFieldsValue({
          portfolioUrl: specialist?.portfolioUrl,
          bio: specialist?.bio,
          experienceYears: specialist?.experienceYears,
          // RECORDING_ARTIST specific fields
          avatarUrl: specialist?.avatarUrl,
          gender: specialist?.gender,
          genres: specialist?.genres || [],
          credits: specialist?.credits || [],
        });

        // Load rating và reviews nếu có specialistId
        if (specialist?.specialistId) {
          loadRatingAndReviews(specialist.specialistId);
        }
      }
    } catch (error) {
      message.error(error.message || 'Cannot load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadRatingAndReviews = async specialistId => {
    if (!specialistId) {
      const currentSpecialistId = profileDetail?.specialist?.specialistId;
      if (!currentSpecialistId) return;
      specialistId = currentSpecialistId;
    }

    try {
      // Load average rating
      const ratingValue = await getSpecialistAverageRating(specialistId);
      if (
        ratingValue !== null &&
        ratingValue !== undefined &&
        !isNaN(ratingValue)
      ) {
        setAverageRating(ratingValue);
      } else {
        setAverageRating(null);
      }

      // Load reviews
      setReviewsLoading(true);
      const reviewsResponse = await getSpecialistReviews(specialistId, {
        page: 0,
        size: 20,
      });
      if (reviewsResponse?.status === 'success' && reviewsResponse?.data) {
        if (reviewsResponse.data.content) {
          setReviews(reviewsResponse.data.content);
        } else if (Array.isArray(reviewsResponse.data)) {
          setReviews(reviewsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading rating and reviews:', error);
      setAverageRating(null);
    } finally {
      setReviewsLoading(false);
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
      message.error(error.message || 'Cannot load demos');
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
      } else {
        setSkills([]);
      }
    } catch (error) {
      message.error(error.message || 'Cannot load skills');
      setSkills([]);
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
      } else {
        setAvailableSkills([]);
      }
    } catch (error) {
      message.error(error.message || 'Cannot load skills list');
      setAvailableSkills([]);
    } finally {
      setAvailableSkillsLoading(false);
    }
  };

  const handleUpdateProfile = async values => {
    setLoading(true);
    try {
      await updateMyProfile(values);
      message.success('Update profile successfully');
      fetchProfile();
    } catch (error) {
      message.error(error.message || 'Cannot update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      // Validate file type
      const isImage = file.type?.startsWith('image/');
      if (!isImage) {
        message.error('Only image files are accepted');
        setAvatarUploading(false);
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error('File size must be less than 5MB');
        setAvatarUploading(false);
        return;
      }

      const response = await uploadAvatar(file);
      const avatarUrl = response.data;

      // Update form field
      profileForm.setFieldsValue({ avatarUrl });

      // Update profile detail to reflect new avatar
      setProfileDetail(prev => ({
        ...prev,
        specialist: {
          ...prev?.specialist,
          avatarUrl,
        },
      }));

      message.success('Upload avatar successfully');

      // Refresh profile to get latest data from backend
      await fetchProfile();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        'Cannot upload avatar';
      message.error(errorMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current && !avatarUploading) {
      fileInputRef.current.click();
    }
  };

  const handleAddSkill = () => {
    setEditingSkill(null);
    // Chỉ set category cho RECORDING_ARTIST
    const isRecordingArtist =
      profileDetail?.specialist?.specialization === 'RECORDING_ARTIST';
    if (isRecordingArtist) {
      // Tự động set category dựa trên recordingRoles của specialist
      const recordingRoles = profileDetail?.specialist?.recordingRoles || [];
      if (recordingRoles.length === 1) {
        // Nếu chỉ có 1 role, tự động set category
        if (recordingRoles[0] === 'VOCALIST') {
          setSelectedSkillCategory('VOCAL');
        } else if (recordingRoles[0] === 'INSTRUMENT_PLAYER') {
          setSelectedSkillCategory('INSTRUMENT');
        } else {
          setSelectedSkillCategory(null);
        }
      } else {
        // Nếu có nhiều hơn 1 role, để user chọn
        setSelectedSkillCategory(null);
      }
    } else {
      // TRANSCRIPTION hoặc ARRANGEMENT: không cần category
      setSelectedSkillCategory(null);
    }
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
      if (editingSkill) {
        // Khi update, không gửi skillId (không được thay đổi skill khi edit)
        const skillData = {
          proficiencyLevel: values.proficiencyLevel,
          yearsExperience: values.yearsExperience,
          lastUsedDate: values.lastUsedDate
            ? values.lastUsedDate.format('YYYY-MM-DD')
            : null,
          isCertified: values.isCertified,
          certificationDetails: values.certificationDetails,
        };
        await updateMySkill(editingSkill.specialistSkillId, skillData);
        message.success('Update skill successfully');
      } else {
        // Khi add, gửi cả skillId
        const skillData = {
          ...values,
          lastUsedDate: values.lastUsedDate
            ? values.lastUsedDate.format('YYYY-MM-DD')
            : null,
        };
        await addSkill(skillData);
        message.success('Add skill successfully');
      }
      setSkillModalVisible(false);
      skillForm.resetFields();
      fetchSkills();
    } catch (error) {
      message.error(error.message || 'Cannot save skill');
    } finally {
      setSkillLoading(false);
    }
  };

  const handleDeleteSkill = async skillId => {
    try {
      await deleteMySkill(skillId);
      message.success('Delete skill successfully');
      fetchSkills();
    } catch (error) {
      message.error(error.message || 'Cannot delete skill');
    }
  };

  const handleAddDemo = () => {
    setEditingDemo(null);
    setSelectedDemoFile(null); // Reset file tạm
    demoForm.resetFields();
    setDemoModalVisible(true);
  };

  const handleEditDemo = demo => {
    setEditingDemo(demo);
    // Cleanup preview URL nếu có
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      setPreviewAudioUrl(null);
    }
    setSelectedDemoFile(null); // Reset file tạm khi edit
    // Đảm bảo skills được load để filter trong demo form
    if (skills.length === 0 && !skillsLoading) {
      fetchSkills();
    }
    demoForm.setFieldsValue({
      title: demo.title,
      description: demo.description,
      recordingRole: demo.recordingRole,
      skillId: demo.skill?.skillId || null,
      genres: demo.genres || [],
      isPublic: demo.isPublic || false,
      isMainDemo: demo.isMainDemo || false,
    });
    setDemoModalVisible(true);
  };

  const handleDemoSubmit = async values => {
    setDemoLoading(true);
    try {
      // Nếu có file mới được chọn (chưa upload), upload trước
      let previewUrl = null;

      if (selectedDemoFile && !editingDemo) {
        // Upload file mới trước khi tạo demo
        setUploadingDemoFile(true);
        try {
          const uploadResponse = await uploadDemoFile(selectedDemoFile);
          if (uploadResponse?.data) {
            previewUrl = uploadResponse.data;
          } else {
            message.error('Failed to upload file');
            setUploadingDemoFile(false);
            setDemoLoading(false);
            return;
          }
        } catch (error) {
          message.error(error?.message || 'Error uploading file');
          setUploadingDemoFile(false);
          setDemoLoading(false);
          return;
        } finally {
          setUploadingDemoFile(false);
        }
      }

      const demoData = {
        ...values,
        previewUrl: previewUrl, // Dùng URL từ upload (nếu có file mới) hoặc giữ nguyên (nếu edit)
      };

      // Nếu edit và không có file mới, giữ nguyên previewUrl hiện tại
      if (editingDemo && !selectedDemoFile) {
        demoData.previewUrl = editingDemo.previewUrl;
      }

      if (editingDemo) {
        await updateMyDemo(editingDemo.demoId, demoData);
        message.success('Update demo successfully');
      } else {
        await createMyDemo(demoData);
        message.success('Create demo successfully');
      }

      // Cleanup preview URL nếu có
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
        setPreviewAudioUrl(null);
      }
      setDemoModalVisible(false);
      demoForm.resetFields();
      setSelectedDemoFile(null); // Reset file tạm
      fetchDemos();
    } catch (error) {
      message.error(error.message || 'Cannot save demo');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDeleteDemo = async demoId => {
    try {
      await deleteMyDemo(demoId);
      message.success('Delete demo successfully');
      fetchDemos();
    } catch (error) {
      message.error(error.message || 'Cannot delete demo');
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
            title="Are you sure you want to delete this skill?"
            onConfirm={() => handleDeleteSkill(record.specialistSkillId)}
            okText="Delete"
            cancelText="Cancel"
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
      title: 'Role',
      key: 'recordingRole',
      render: (_, record) => {
        const roleLabel =
          record.recordingRole === 'VOCALIST'
            ? 'Vocal'
            : record.recordingRole === 'INSTRUMENT_PLAYER'
              ? 'Instrument'
              : record.recordingRole;
        return (
          <Tag color={record.recordingRole === 'VOCALIST' ? 'orange' : 'blue'}>
            {roleLabel}
          </Tag>
        );
      },
    },
    {
      title: 'Skill',
      key: 'skill',
      render: (_, record) => record.skill?.skillName || 'N/A',
    },
    {
      title: 'Genres',
      key: 'genres',
      render: (_, record) => (
        <Space size={[0, 8]} wrap>
          {record.genres && record.genres.length > 0 ? (
            record.genres.map((genre, index) => (
              <Tag key={index} color="cyan">
                {genre}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>N/A</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Preview',
      key: 'preview',
      width: 300,
      render: (_, record) => {
        if (!record.previewUrl) {
          return <span style={{ color: '#999' }}>No audio</span>;
        }
        return (
          <audio controls style={{ width: '100%', maxWidth: '300px' }}>
            <source src={record.previewUrl} type="audio/mpeg" />
            <source src={record.previewUrl} type="audio/wav" />
            <source src={record.previewUrl} type="audio/m4a" />
            Your browser does not support the audio element.
          </audio>
        );
      },
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
      title: 'Main Demo',
      dataIndex: 'isMainDemo',
      key: 'isMainDemo',
      render: isMainDemo => (
        <Tag color={isMainDemo ? 'orange' : 'default'}>
          {isMainDemo ? 'Yes' : 'No'}
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
            title="Are you sure you want to delete this demo?"
            onConfirm={() => handleDeleteDemo(record.demoId)}
            okText="Delete"
            cancelText="Cancel"
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
        <Title level={2}>My Specialist Profile</Title>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'general',
              label: (
                <span>
                  {/* <InfoCircleOutlined /> */}
                  General Info
                </span>
              ),
              children: (
                <Spin spinning={loading}>
                  <div className={styles.profileHeader}>
                    {isRecordingArtist ? (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleAvatarFileChange}
                        />
                        <div
                          style={{
                            position: 'relative',
                            cursor: avatarUploading ? 'not-allowed' : 'pointer',
                            display: 'inline-block',
                          }}
                          onClick={handleAvatarClick}
                        >
                          <Avatar
                            size={100}
                            src={profileDetail?.specialist?.avatarUrl}
                            icon={<UserOutlined />}
                            className={styles.avatar}
                            style={{
                              border: '2px solid #d9d9d9',
                              transition: 'all 0.3s',
                              cursor: avatarUploading
                                ? 'not-allowed'
                                : 'pointer',
                            }}
                          />
                          {avatarUploading && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.5)',
                                borderRadius: '50%',
                                pointerEvents: 'none',
                              }}
                            >
                              <Spin size="small" />
                            </div>
                          )}
                          {!avatarUploading && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                background: '#1890ff',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                cursor: 'pointer',
                                pointerEvents: 'none',
                              }}
                              title="Click to upload avatar"
                            >
                              <UploadOutlined style={{ color: 'white' }} />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <Avatar
                        size={100}
                        src={user?.avatarUrl}
                        icon={<UserOutlined />}
                        className={styles.avatar}
                      />
                    )}
                    <div className={styles.profileInfo}>
                      <Title level={3} style={{ margin: 0 }}>
                        {user?.fullName || 'Specialist'}
                      </Title>
                      <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                        {user?.email}
                      </p>
                      {isRecordingArtist &&
                        profileDetail?.specialist?.gender && (
                          <p style={{ color: '#999', margin: '4px 0 0 0' }}>
                            {profileDetail.specialist.gender}
                          </p>
                        )}
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
                      tooltip="Link to your portfolio/website to showcase your work (e.g. Behance, SoundCloud, personal website)"
                      rules={[
                        { type: 'url', message: 'Please enter a valid URL' },
                      ]}
                    >
                      <Input
                        placeholder="https://your-portfolio.com or https://soundcloud.com/yourname"
                        addonAfter={
                          profileForm.getFieldValue('portfolioUrl') ? (
                            <a
                              href={profileForm.getFieldValue('portfolioUrl')}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              Open
                            </a>
                          ) : null
                        }
                      />
                    </Form.Item>

                    <Form.Item name="bio" label="Short Bio">
                      <TextArea
                        rows={4}
                        placeholder="Introduce yourself..."
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>

                    {/* RECORDING ARTIST SPECIFIC FIELDS */}
                    {isRecordingArtist && (
                      <>
                        <Divider orientation="left">
                          Recording Artist Information
                        </Divider>

                        <Form.Item name="gender" label="Gender">
                          <Radio.Group>
                            <Radio value="MALE">Male</Radio>
                            <Radio value="FEMALE">Female</Radio>
                            <Radio value="OTHER">Other</Radio>
                          </Radio.Group>
                        </Form.Item>

                        <Form.Item
                          name="genres"
                          label="Music Genres"
                          tooltip="Select the music genres you specialize in"
                        >
                          <Select
                            mode="multiple"
                            placeholder="Select genres"
                            allowClear
                            style={{ width: '100%' }}
                            options={MUSIC_GENRES}
                          />
                        </Form.Item>

                        <Form.Item
                          name="credits"
                          label="Credits"
                          tooltip="List your notable credits or past work (e.g., One Seven Music, Future House Cloud)"
                        >
                          <Select
                            mode="tags"
                            placeholder="Enter credits (press Enter to add)"
                            style={{ width: '100%' }}
                            tokenSeparators={[',']}
                          />
                        </Form.Item>
                      </>
                    )}

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
                        <RatingStars
                          rating={
                            averageRating !== null
                              ? averageRating
                              : profileDetail?.specialist?.rating
                                ? parseFloat(profileDetail.specialist.rating)
                                : 0
                          }
                          disabled
                          allowHalf
                        />
                        <span style={{ marginLeft: 8 }}>
                          {averageRating !== null
                            ? averageRating.toFixed(1)
                            : profileDetail?.specialist?.rating || 0}{' '}
                          / 5.0
                        </span>
                        {reviews.length > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: '#666',
                              fontSize: 12,
                            }}
                          >
                            ({reviews.length}{' '}
                            {reviews.length === 1 ? 'review' : 'reviews'})
                          </span>
                        )}
                      </Descriptions.Item>

                      {/* RECORDING ARTIST SPECIFIC INFO */}
                      {isRecordingArtist && (
                        <>
                          <Descriptions.Item label="Gender">
                            {profileDetail?.specialist?.gender
                              ? profileDetail.specialist.gender
                              : 'N/A'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Recording Roles">
                            {profileDetail?.specialist?.recordingRoles &&
                            profileDetail.specialist.recordingRoles.length >
                              0 ? (
                              <Space>
                                {profileDetail.specialist.recordingRoles.map(
                                  role => {
                                    const roleLabel =
                                      role === 'VOCALIST'
                                        ? 'Vocal'
                                        : role === 'INSTRUMENT_PLAYER'
                                          ? 'Instrument'
                                          : role;
                                    return (
                                      <Tag
                                        key={role}
                                        color={
                                          role === 'VOCALIST'
                                            ? 'orange'
                                            : 'blue'
                                        }
                                      >
                                        {roleLabel}
                                      </Tag>
                                    );
                                  }
                                )}
                              </Space>
                            ) : (
                              'N/A'
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Genres">
                            {profileDetail?.specialist?.genres &&
                            profileDetail.specialist.genres.length > 0 ? (
                              <Space wrap>
                                {profileDetail.specialist.genres.map(genre => (
                                  <Tag key={genre} color="blue">
                                    {genre}
                                  </Tag>
                                ))}
                              </Space>
                            ) : (
                              'N/A'
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Credits">
                            {profileDetail?.specialist?.credits &&
                            profileDetail.specialist.credits.length > 0 ? (
                              <Space wrap>
                                {profileDetail.specialist.credits.map(
                                  credit => (
                                    <Tag key={credit} color="green">
                                      {credit}
                                    </Tag>
                                  )
                                )}
                              </Space>
                            ) : (
                              'N/A'
                            )}
                          </Descriptions.Item>
                        </>
                      )}
                    </Descriptions>
                  </Card>
                </Spin>
              ),
            },
            {
              key: 'skills',
              label: (
                <span>
                  {/* <StarOutlined /> */}
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
                          No skills yet. Please add your first skill!
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
                                No demos yet. Please add your first demo!
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
            {
              key: 'reviews',
              label: (
                <span>
                  <StarOutlined />
                  Reviews ({reviews.length})
                </span>
              ),
              children: (
                <Spin spinning={reviewsLoading}>
                  <div style={{ padding: '16px 0' }}>
                    {reviews.length === 0 ? (
                      <Card>
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <StarOutlined
                            style={{ fontSize: 48, color: '#ccc' }}
                          />
                          <p style={{ marginTop: 16, color: '#999' }}>
                            No reviews yet. You will receive reviews from
                            customers after completing the task assignments.
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <div>
                        <Title level={4} style={{ marginBottom: 16 }}>
                          {reviews.length}{' '}
                          {reviews.length === 1 ? 'Review' : 'Reviews'}
                        </Title>
                        <Space
                          direction="vertical"
                          style={{ width: '100%' }}
                          size="large"
                        >
                          {reviews.map(review => (
                            <Card key={review.reviewId} size="small">
                              <div style={{ marginBottom: 8 }}>
                                <Space>
                                  <RatingStars
                                    rating={review.rating}
                                    disabled
                                    size="small"
                                  />
                                  <Text strong>{review.rating} / 5</Text>
                                  {review.createdAt && (
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: 12 }}
                                    >
                                      {new Date(
                                        review.createdAt
                                      ).toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </Text>
                                  )}
                                </Space>
                              </div>
                              {review.comment && (
                                <div style={{ marginTop: 12 }}>
                                  <Text>{review.comment}</Text>
                                </div>
                              )}
                              {review.assignmentId && (
                                <div style={{ marginTop: 8 }}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    Task Assignment:{' '}
                                    <a
                                      onClick={e => {
                                        e.preventDefault();
                                        // Chỉ TRANSCRIPTION và ARRANGEMENT có task assignments
                                        // RECORDING_ARTIST không có task assignments (chỉ có participant reviews)
                                        const specialization =
                                          profileDetail?.specialist
                                            ?.specialization;

                                        if (
                                          specialization === 'TRANSCRIPTION'
                                        ) {
                                          navigate(
                                            `/transcription/my-tasks/${review.assignmentId}`
                                          );
                                        } else if (
                                          specialization === 'ARRANGEMENT'
                                        ) {
                                          navigate(
                                            `/arrangement/my-tasks/${review.assignmentId}`
                                          );
                                        } else {
                                          // Nếu không phải TRANSCRIPTION/ARRANGEMENT, không nên có assignmentId
                                          // Nhưng để an toàn, fallback về transcription route
                                          navigate(
                                            `/transcription/my-tasks/${review.assignmentId}`
                                          );
                                        }
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        color: '#1890ff',
                                      }}
                                    >
                                      {review.assignmentId}
                                    </a>
                                  </Text>
                                </div>
                              )}
                              {review.reviewType === 'PARTICIPANT' &&
                                review.participantId && (
                                  <div style={{ marginTop: 8 }}>
                                    <Space>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        Participant Review
                                      </Text>
                                      {review.bookingId && (
                                        <>
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                          >
                                            Booking:{' '}
                                          </Text>
                                          <a
                                            onClick={e => {
                                              e.preventDefault();
                                              // Link đến booking detail dựa trên role của user
                                              // Recording artist có route riêng, manager có route riêng
                                              const specialization =
                                                profileDetail?.specialist
                                                  ?.specialization;
                                              if (
                                                specialization ===
                                                'RECORDING_ARTIST'
                                              ) {
                                                navigate(
                                                  `/recording-artist/studio-bookings/${review.bookingId}`
                                                );
                                              } else {
                                                // Fallback: có thể là manager hoặc admin xem
                                                // Hoặc chỉ hiển thị bookingId mà không link
                                                navigate(
                                                  `/manager/studio-bookings/${review.bookingId}`
                                                );
                                              }
                                            }}
                                            style={{
                                              cursor: 'pointer',
                                              color: '#1890ff',
                                              fontSize: 12,
                                            }}
                                          >
                                            {review.bookingId.substring(0, 8)}
                                            ...
                                          </a>
                                        </>
                                      )}
                                    </Space>
                                  </div>
                                )}
                            </Card>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                </Spin>
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
          {!editingSkill &&
            (() => {
              const isRecordingArtist =
                profileDetail?.specialist?.specialization ===
                'RECORDING_ARTIST';
              const recordingRoles =
                profileDetail?.specialist?.recordingRoles || [];
              const hasMultipleRoles = recordingRoles.length > 1;
              const needsCategorySelection =
                isRecordingArtist && hasMultipleRoles;

              return (
                <>
                  {needsCategorySelection && (
                    <Form.Item
                      label="Category"
                      rules={[
                        {
                          required: true,
                          message: 'Please select category before',
                        },
                      ]}
                    >
                      <Select
                        placeholder="Select category (Vocal or Instrument)"
                        value={selectedSkillCategory}
                        onChange={value => {
                          setSelectedSkillCategory(value);
                          skillForm.setFieldValue('skillId', null); // Reset skill khi đổi category
                        }}
                      >
                        {recordingRoles.includes('VOCALIST') && (
                          <Option value="VOCAL">Vocal</Option>
                        )}
                        {recordingRoles.includes('INSTRUMENT_PLAYER') && (
                          <Option value="INSTRUMENT">Instrument</Option>
                        )}
                      </Select>
                    </Form.Item>
                  )}

                  <Form.Item
                    name="skillId"
                    label="Skill"
                    rules={[{ required: true, message: 'Please select skill' }]}
                  >
                    <Select
                      placeholder={
                        needsCategorySelection
                          ? selectedSkillCategory
                            ? `Select ${selectedSkillCategory === 'VOCAL' ? 'vocal' : 'instrument'} skill`
                            : 'Please select category before'
                          : isRecordingArtist && selectedSkillCategory
                            ? `Select ${selectedSkillCategory === 'VOCAL' ? 'vocal' : 'instrument'} skill`
                            : 'Select skill'
                      }
                      disabled={
                        needsCategorySelection && !selectedSkillCategory
                      }
                      loading={availableSkillsLoading}
                      notFoundContent={
                        availableSkillsLoading ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            Loading...
                          </div>
                        ) : needsCategorySelection && !selectedSkillCategory ? (
                          'Please select category before'
                        ) : (
                          'No skills available'
                        )
                      }
                    >
                      {availableSkills
                        .filter(skill => {
                          // Chỉ filter theo category nếu là RECORDING_ARTIST
                          if (!isRecordingArtist) {
                            // TRANSCRIPTION hoặc ARRANGEMENT: hiển thị tất cả (backend đã filter rồi)
                            return true;
                          }

                          // RECORDING_ARTIST: filter theo category đã chọn
                          if (!selectedSkillCategory) return false;

                          const categoryStr =
                            typeof skill.recordingCategory === 'string'
                              ? skill.recordingCategory
                              : skill.recordingCategory?.name ||
                                skill.recordingCategory;

                          return categoryStr === selectedSkillCategory;
                        })
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
                </>
              );
            })()}

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
          // Cleanup preview URL nếu có
          if (previewAudioUrl) {
            URL.revokeObjectURL(previewAudioUrl);
            setPreviewAudioUrl(null);
          }
          setDemoModalVisible(false);
          demoForm.resetFields();
          setSelectedDemoFile(null); // Reset file tạm khi đóng modal
        }}
        onOk={() => demoForm.submit()}
        confirmLoading={demoLoading}
        width={600}
      >
        <Form form={demoForm} layout="vertical" onFinish={handleDemoSubmit}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="Enter demo title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Enter demo description" />
          </Form.Item>

          <Form.Item
            name="recordingRole"
            label="Recording Role"
            rules={[
              { required: true, message: 'Please select recording role' },
            ]}
            tooltip="Select role of this demo: Vocal (sing) or Instrument (play instrument)"
          >
            <Select
              placeholder="Select recording role"
              disabled={!!editingDemo}
              onChange={() => {
                // Reset skillId khi recordingRole thay đổi
                demoForm.setFieldValue('skillId', null);
              }}
            >
              {profileDetail?.specialist?.recordingRoles?.map(role => (
                <Option key={role} value={role}>
                  {role === 'VOCALIST'
                    ? 'Vocal'
                    : role === 'INSTRUMENT_PLAYER'
                      ? 'Instrument'
                      : role}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Demo File"
            required={!editingDemo}
            tooltip="Select demo audio file (mp3, wav, m4a, flac, aac). Maximum 50MB. File will be uploaded when OK is pressed. File will be saved public to allow customers to view/listen directly."
            rules={[
              {
                validator: () => {
                  // Validate: nếu không phải edit mode, phải có file được chọn
                  if (!editingDemo && !selectedDemoFile) {
                    return Promise.reject(new Error('Please select demo file'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Upload
              accept="audio/*,.mp3,.wav,.m4a,.flac,.aac"
              maxCount={1}
              beforeUpload={file => {
                // Validate file size (50MB)
                const maxSize = 50 * 1024 * 1024; // 50MB
                if (file.size > maxSize) {
                  message.error('File size must be less than 50MB');
                  return Upload.LIST_IGNORE;
                }

                // Validate file type
                const fileName = file.name.toLowerCase();
                const isAudio =
                  fileName.endsWith('.mp3') ||
                  fileName.endsWith('.wav') ||
                  fileName.endsWith('.m4a') ||
                  fileName.endsWith('.flac') ||
                  fileName.endsWith('.aac') ||
                  file.type.startsWith('audio/');

                if (!isAudio) {
                  message.error(
                    'Only audio files (mp3, wav, m4a, flac, aac) are accepted'
                  );
                  return Upload.LIST_IGNORE;
                }

                // Lưu file tạm thời, chưa upload
                setSelectedDemoFile(file);

                // Tạo URL tạm thời để preview audio
                const objectUrl = URL.createObjectURL(file);
                setPreviewAudioUrl(objectUrl);

                message.info(
                  'File has been selected. Press OK to upload and create demo.'
                );

                // Prevent default upload - sẽ upload khi submit form
                return false;
              }}
              onRemove={() => {
                // Cleanup preview URL
                if (previewAudioUrl) {
                  URL.revokeObjectURL(previewAudioUrl);
                  setPreviewAudioUrl(null);
                }
                setSelectedDemoFile(null);
              }}
              disabled={!!editingDemo}
              fileList={
                selectedDemoFile
                  ? [
                      {
                        uid: '-1',
                        name: selectedDemoFile.name,
                        status: 'done',
                      },
                    ]
                  : []
              }
            >
              <Button icon={<UploadOutlined />} disabled={!!editingDemo}>
                Select audio file
              </Button>
            </Upload>
            {selectedDemoFile && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    color: '#1890ff',
                    fontSize: '12px',
                    marginBottom: 8,
                  }}
                >
                  Selected file: {selectedDemoFile.name} (
                  {(selectedDemoFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
                {previewAudioUrl && (
                  <audio controls style={{ width: '100%', maxWidth: '400px' }}>
                    <source
                      src={previewAudioUrl}
                      type={selectedDemoFile.type || 'audio/mpeg'}
                    />
                    <source src={previewAudioUrl} type="audio/wav" />
                    <source src={previewAudioUrl} type="audio/m4a" />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            )}
            {editingDemo && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{ color: '#999', fontSize: '12px', marginBottom: 8 }}
                >
                  Current file: {editingDemo.previewUrl || 'N/A'}
                </div>
                {editingDemo.previewUrl && (
                  <audio controls style={{ width: '100%', maxWidth: '400px' }}>
                    <source src={editingDemo.previewUrl} type="audio/mpeg" />
                    <source src={editingDemo.previewUrl} type="audio/wav" />
                    <source src={editingDemo.previewUrl} type="audio/m4a" />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            )}
          </Form.Item>

          <Form.Item
            name="genres"
            label="Genres"
            rules={[
              { required: true, message: 'Please select at least 1 genre' },
            ]}
            tooltip="Select music genre of this demo. Only genres you have registered in your profile can be selected."
          >
            <Select
              mode="multiple"
              placeholder="Select genres"
              options={MUSIC_GENRES.filter(genre =>
                profileDetail?.specialist?.genres?.includes(genre.value)
              )}
              disabled={
                !profileDetail?.specialist?.genres ||
                profileDetail.specialist.genres.length === 0
              }
              notFoundContent={
                !profileDetail?.specialist?.genres ||
                profileDetail.specialist.genres.length === 0
                  ? 'Please update genres in profile before'
                  : 'No genres available'
              }
            />
          </Form.Item>

          <Form.Item
            name="skillId"
            label="Skill"
            dependencies={['recordingRole']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const recordingRole = getFieldValue('recordingRole');
                  if (recordingRole === 'INSTRUMENT_PLAYER' && !value) {
                    return Promise.reject(
                      new Error('Skill is required for Instrument demo (e.g. Piano Performance, Guitar Performance)')
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            tooltip={
              demoForm.getFieldValue('recordingRole') === 'INSTRUMENT_PLAYER'
                ? 'Required: Select Instrument skill (e.g. Piano Performance, Guitar Performance)'
                : 'Optional: Select Vocal skill (e.g. Soprano, Alto, Tenor)'
            }
          >
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.recordingRole !== currentValues.recordingRole
              }
            >
              {({ getFieldValue, setFieldValue }) => {
                const recordingRole = getFieldValue('recordingRole');
                const skillIdValue = getFieldValue('skillId');

                return (
                  <Select
                    value={skillIdValue}
                    onChange={value => {
                      setFieldValue('skillId', value);
                    }}
                    placeholder={
                      !recordingRole
                        ? 'Please select Recording Role before'
                        : recordingRole === 'INSTRUMENT_PLAYER'
                          ? 'Select Instrument skill (required)'
                          : 'Select Vocal skill (optional)'
                    }
                    allowClear={recordingRole === 'VOCALIST'}
                    disabled={!recordingRole}
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
                    {(() => {
                      if (!recordingRole) {
                        return (
                          <Option disabled value="">
                            Please select Recording Role before
                          </Option>
                        );
                      }

                      // Lấy skills từ specialist's skills (đã add vào profile), không phải availableSkills
                      // Vì demo là để showcase skill mà specialist đã có
                      if (!skills || skills.length === 0) {
                        return (
                          <Option disabled value="">
                            No skills yet. Please add your first skill to your profile
                            trước.
                          </Option>
                        );
                      }

                      // Filter skills của specialist theo recordingRole
                      const filteredSkills = skills
                        .filter(specialistSkill => {
                          const skill =
                            specialistSkill.skill || specialistSkill;
                          if (!skill) return false;

                          const skillTypeStr =
                            typeof skill.skillType === 'string'
                              ? skill.skillType
                              : skill.skillType?.name || skill.skillType;
                          const categoryStr =
                            typeof skill.recordingCategory === 'string'
                              ? skill.recordingCategory
                              : skill.recordingCategory?.name ||
                                skill.recordingCategory;

                          if (recordingRole === 'VOCALIST') {
                            // Chỉ hiển thị vocal skills
                            return (
                              skillTypeStr === 'RECORDING_ARTIST' &&
                              categoryStr === 'VOCAL'
                            );
                          } else if (recordingRole === 'INSTRUMENT_PLAYER') {
                            // Chỉ hiển thị instrument skills
                            return (
                              skillTypeStr === 'RECORDING_ARTIST' &&
                              categoryStr === 'INSTRUMENT'
                            );
                          }
                          return false;
                        })
                        .map(specialistSkill => {
                          // Extract skill object từ specialistSkill
                          return specialistSkill.skill || specialistSkill;
                        });

                      if (filteredSkills.length === 0) {
                        const roleLabel =
                          recordingRole === 'VOCALIST'
                            ? 'Vocal'
                            : recordingRole === 'INSTRUMENT_PLAYER'
                              ? 'Instrument'
                              : recordingRole;
                        return (
                          <Option disabled value="">
                            No skills matching {roleLabel}
                          </Option>
                        );
                      }

                      // Remove duplicates (nếu có)
                      const uniqueSkills = filteredSkills.filter(
                        (skill, index, self) =>
                          index ===
                          self.findIndex(s => s.skillId === skill.skillId)
                      );

                      return uniqueSkills.map(skill => (
                        <Option key={skill.skillId} value={skill.skillId}>
                          {skill.skillName}
                        </Option>
                      ));
                    })()}
                  </Select>
                );
              }}
            </Form.Item>
          </Form.Item>

          <Form.Item
            name="isPublic"
            label="Public"
            valuePropName="checked"
            tooltip="Enable to allow customers to view this demo, disable to only allow you to view it"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="isMainDemo"
            label="Main Demo"
            valuePropName="checked"
            tooltip="Mark this demo as main. Main demo will be displayed in the avatar on the list specialists page. Only one main demo should be present."
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SpecialistProfile;
