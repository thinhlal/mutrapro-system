import React, { useState, useEffect } from "react";
import { Avatar, Button, Select, Tabs, Input, Modal, message, Spin } from "antd";
import { EditOutlined, UserOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./ProfilePage.module.css";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { useAuth } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/useUserStore";

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const ProfileContent = () => {
  const { user: authUser } = useAuth();
  const { userProfile, loading, error, fetchUserProfile, updateUserProfile } = useUserStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    about: '',
  });

  // TODO: Get userId from somewhere
  // Vấn đề: Backend không trả userId trong login response
  // Giải pháp tạm thời: Sử dụng mock userId hoặc lấy từ URL params
  // Best practice: Backend cần thêm userId vào AuthenticationResponse hoặc tạo endpoint /auth/me
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Temporary: Prompt user to enter their userId
    // In production, this should come from backend after login
    const storedUserId = localStorage.getItem('temp_userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      Modal.info({
        title: 'Lưu ý',
        content: 'Vui lòng nhập User ID của bạn (tạm thời để test). Trong production, thông tin này sẽ được lấy tự động sau khi login.',
        onOk: () => {
          const inputUserId = prompt('Nhập User ID:');
          if (inputUserId) {
            localStorage.setItem('temp_userId', inputUserId);
            setUserId(inputUserId);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId).catch((err) => {
        message.error('Không thể tải thông tin profile');
      });
    }
  }, [userId, fetchUserProfile]);

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        about: userProfile.about || '',
      });
    }
  }, [userProfile]);

  const handleEdit = (field) => {
    switch(field) {
      case 'fullName': setIsEditingName(true); break;
      case 'phone': setIsEditingPhone(true); break;
      case 'address': setIsEditingAddress(true); break;
      case 'about': setIsEditingAbout(true); break;
      default: break;
    }
  };

  const handleCancel = (field) => {
    // Reset to original value
    if (userProfile) {
      setEditForm(prev => ({
        ...prev,
        [field]: userProfile[field] || ''
      }));
    }
    
    switch(field) {
      case 'fullName': setIsEditingName(false); break;
      case 'phone': setIsEditingPhone(false); break;
      case 'address': setIsEditingAddress(false); break;
      case 'about': setIsEditingAbout(false); break;
      default: break;
    }
  };

  const handleSave = async (field) => {
    if (!userId) {
      message.error('User ID không hợp lệ');
      return;
    }

    try {
      await updateUserProfile(userId, {
        [field]: editForm[field]
      });
      
      message.success('Cập nhật thành công');
      
      switch(field) {
        case 'fullName': setIsEditingName(false); break;
        case 'phone': setIsEditingPhone(false); break;
        case 'address': setIsEditingAddress(false); break;
        case 'about': setIsEditingAbout(false); break;
        default: break;
      }
    } catch (err) {
      message.error(err.message || 'Cập nhật thất bại');
    }
  };

  const handleChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getInitials = () => {
    if (userProfile?.fullName) {
      const names = userProfile.fullName.split(' ');
      if (names.length >= 2) {
        return names[0][0] + names[names.length - 1][0];
      }
      return userProfile.fullName.substring(0, 2);
    }
    if (authUser?.email) {
      return authUser.email.substring(0, 2);
    }
    return 'NA';
  };

  if (loading && !userProfile) {
    return (
      <div className={styles.profileContentWrapper}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContentWrapper}>
      <h1 className={styles.pageTitle}>Profile</h1>
      <Tabs defaultActiveKey="1" type="card">
        <TabPane tab="Information" key="1">
          <div className={styles.infoGrid}>
            <div className={styles.leftColumn}>
              <div className={styles.avatarContainer}>
                <Avatar size={100} icon={<UserOutlined />}>
                  {getInitials().toUpperCase()}
                </Avatar>
                <div className={styles.avatarEditIcon}>
                  <EditOutlined />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Password</label>
                <Button type="default" className={styles.changePasswordButton}>
                  Change password
                </Button>
              </div>
            </div>

            <div className={styles.rightColumn}>
              {/* Full Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Name</label>
                {isEditingName ? (
                  <div className={styles.editContainer}>
                    <Input
                      value={editForm.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="Nhập họ tên"
                    />
                    <div className={styles.editActions}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        size="small"
                        onClick={() => handleSave('fullName')}
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button
                        icon={<CloseOutlined />}
                        size="small"
                        onClick={() => handleCancel('fullName')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.valueContainer}>
                    <span>{userProfile?.fullName || 'Chưa cập nhật'}</span>
                    <EditOutlined
                      className={styles.editIcon}
                      onClick={() => handleEdit('fullName')}
                    />
                  </div>
                )}
              </div>

              {/* Email (readonly) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email</label>
                <div className={styles.valueContainer}>
                  <span>{authUser?.email || 'Chưa có email'}</span>
                </div>
              </div>

              {/* Phone */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Phone</label>
                {isEditingPhone ? (
                  <div className={styles.editContainer}>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="Nhập số điện thoại"
                    />
                    <div className={styles.editActions}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        size="small"
                        onClick={() => handleSave('phone')}
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button
                        icon={<CloseOutlined />}
                        size="small"
                        onClick={() => handleCancel('phone')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.valueContainer}>
                    <span>{userProfile?.phone || 'Chưa cập nhật'}</span>
                    <EditOutlined
                      className={styles.editIcon}
                      onClick={() => handleEdit('phone')}
                    />
                  </div>
                )}
              </div>

              {/* Address */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Address</label>
                {isEditingAddress ? (
                  <div className={styles.editContainer}>
                    <Input
                      value={editForm.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Nhập địa chỉ"
                    />
                    <div className={styles.editActions}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        size="small"
                        onClick={() => handleSave('address')}
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button
                        icon={<CloseOutlined />}
                        size="small"
                        onClick={() => handleCancel('address')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.valueContainer}>
                    <span>{userProfile?.address || 'Chưa cập nhật'}</span>
                    <EditOutlined
                      className={styles.editIcon}
                      onClick={() => handleEdit('address')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Me Section */}
          <div className={styles.aboutMeSection}>
            <label className={styles.fieldLabel}>About me</label>
            {isEditingAbout ? (
              <div className={styles.editContainer}>
                <TextArea
                  value={editForm.about}
                  onChange={(e) => handleChange('about', e.target.value)}
                  placeholder="Thêm thông tin về bản thân"
                  rows={4}
                />
                <div className={styles.editActions}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    size="small"
                    onClick={() => handleSave('about')}
                    loading={loading}
                  >
                    Save
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={() => handleCancel('about')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`${styles.valueContainer} ${styles.aboutMeInput}`}>
                <span>
                  {userProfile?.about || 'Add here some information about yourself'}
                </span>
                <EditOutlined
                  className={styles.editIcon}
                  onClick={() => handleEdit('about')}
                />
              </div>
            )}
          </div>
        </TabPane>
        <TabPane tab="User settings" key="2">
          <p>Nội dung cho User Settings</p>
        </TabPane>
        <TabPane tab="Company" key="3">
          <p>Nội dung cho Company</p>
        </TabPane>
      </Tabs>
    </div>
  );
};

const ProfilePage = () => {
  return (
    <div>
      <Header />
      <div className={styles.profilePageContainer}>
        <nav className={styles.sideNav}>
          <div className={styles.navItem}>Back to app</div>
          <div className={styles.navSeparator}></div>
          <div className={styles.navItem}>Personal</div>
          <div className={`${styles.navItem} ${styles.active}`}>Profile</div>
          <div className={styles.navItem}>Notifications</div>
          <div className={styles.navItem}>Subscription</div>
          <div className={styles.navSeparator}></div>
          <div className={styles.navItem}>Current team:</div>
          <div className={styles.navItem}>Members</div>
          <div className={styles.navItem}>Settings</div>
          <div className={styles.navItem}>Plan</div>
        </nav>

        <main className={styles.mainContent}>
          <ProfileContent />
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default ProfilePage;
