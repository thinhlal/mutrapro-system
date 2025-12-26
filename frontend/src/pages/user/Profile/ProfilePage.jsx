import React, { useState, useEffect } from 'react';
import { Avatar, Button, Input, message, Spin } from 'antd';
import toast from 'react-hot-toast';
import {
  EditOutlined,
  UserOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import styles from './ProfilePage.module.css';
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserStore } from '../../../stores/useUserStore';
import * as authService from '../../../services/authService';
import { useDocumentTitle } from '../../../hooks';

const { TextArea } = Input;

const ProfileContent = () => {
  useDocumentTitle('Profile');
  const { user: authUser } = useAuth();
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreatePasswordForm, setShowCreatePasswordForm] = useState(false);
  const { userProfile, loading, error, fetchUserProfile, updateUserProfile } =
    useUserStore();

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

  const [userId, setUserId] = useState(null);
  useEffect(() => {
    // Hiển thị nút tạo mật khẩu nếu tài khoản chưa có mật khẩu local
    if (authUser?.isNoPassword === true) {
      setShowCreatePassword(true);
    } else {
      setShowCreatePassword(false);
    }
    if (authUser?.id) {
      setUserId(authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId).catch(err => {
        toast.error('Không thể tải thông tin profile', { duration: 5000, position: 'top-center' });
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

  const handleEdit = field => {
    switch (field) {
      case 'fullName':
        setIsEditingName(true);
        break;
      case 'phone':
        setIsEditingPhone(true);
        break;
      case 'address':
        setIsEditingAddress(true);
        break;
      case 'about':
        setIsEditingAbout(true);
        break;
      default:
        break;
    }
  };

  const handleCancel = field => {
    // Reset to original value
    if (userProfile) {
      setEditForm(prev => ({
        ...prev,
        [field]: userProfile[field] || '',
      }));
    }

    switch (field) {
      case 'fullName':
        setIsEditingName(false);
        break;
      case 'phone':
        setIsEditingPhone(false);
        break;
      case 'address':
        setIsEditingAddress(false);
        break;
      case 'about':
        setIsEditingAbout(false);
        break;
      default:
        break;
    }
  };

  const handleSave = async field => {
    if (!userId) {
      toast.error('User ID không hợp lệ', { duration: 5000, position: 'top-center' });
      return;
    }

    try {
      await updateUserProfile(userId, {
        [field]: editForm[field],
      });

      message.success('Cập nhật thành công');

      switch (field) {
        case 'fullName':
          setIsEditingName(false);
          break;
        case 'phone':
          setIsEditingPhone(false);
          break;
        case 'address':
          setIsEditingAddress(false);
          break;
        case 'about':
          setIsEditingAbout(false);
          break;
        default:
          break;
      }
    } catch (err) {
      toast.error(err.message || 'Cập nhật thất bại', { duration: 5000, position: 'top-center' });
    }
  };

  const handleChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value,
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
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContentWrapper}>
      <h1 className={styles.pageTitle}>Profile</h1>

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
            {showCreatePassword ? (
              !showCreatePasswordForm ? (
                <Button
                  type="primary"
                  className={styles.changePasswordButton}
                  onClick={() => setShowCreatePasswordForm(true)}
                >
                  Create Password
                </Button>
              ) : (
                <div className={styles.editContainer}>
                  <Input.Password
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <Input.Password
                    placeholder="Confirm password"
                    style={{ marginTop: 8 }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <div className={styles.editActions}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      size="small"
                      loading={creating}
                      onClick={async () => {
                        if (!authUser?.email) {
                          toast.error('Không tìm thấy email tài khoản', { duration: 5000, position: 'top-center' });
                          return;
                        }
                        if (!newPassword || newPassword.length < 8) {
                          toast.error('Mật khẩu tối thiểu 8 ký tự', { duration: 5000, position: 'top-center' });
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          toast.error('Mật khẩu xác nhận không khớp', { duration: 5000, position: 'top-center' });
                          return;
                        }
                        try {
                          setCreating(true);
                          await authService.createPassword({
                            email: authUser.email,
                            password: newPassword,
                          });
                          message.success('Tạo mật khẩu thành công');
                          setShowCreatePassword(false);
                          setShowCreatePasswordForm(false);
                          setNewPassword('');
                          setConfirmPassword('');
                        } catch (e) {
                          toast.error(e?.message || 'Tạo mật khẩu thất bại', { duration: 5000, position: 'top-center' });
                        } finally {
                          setCreating(false);
                        }
                      }}
                    >
                      Save Password
                    </Button>
                    <Button
                      icon={<CloseOutlined />}
                      size="small"
                      onClick={() => {
                        setShowCreatePasswordForm(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <Button type="default" className={styles.changePasswordButton}>
                Change password
              </Button>
            )}
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
                  onChange={e => handleChange('fullName', e.target.value)}
                  placeholder="Enter full name"
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
                <span>{userProfile?.fullName || 'Not updated'}</span>
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
              <span>{authUser?.email || 'No email'}</span>
            </div>
          </div>

          {/* Phone */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Phone</label>
            {isEditingPhone ? (
              <div className={styles.editContainer}>
                <Input
                  value={editForm.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="Enter phone number"
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
                <span>{userProfile?.phone || 'Not updated'}</span>
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
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="Enter address"
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
                <span>{userProfile?.address || 'Not updated'}</span>
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
              onChange={e => handleChange('about', e.target.value)}
              placeholder="Add information about yourself"
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
    </div>
  );
};

const ProfilePage = () => {
  return (
    <ProfileLayout>
      <ProfileContent />
    </ProfileLayout>
  );
};

export default ProfilePage;
