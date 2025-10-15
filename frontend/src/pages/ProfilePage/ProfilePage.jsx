import React from "react";
import { Avatar, Button, Select, Tabs } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import styles from "./ProfilePage.module.css";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";

const { TabPane } = Tabs;
const { Option } = Select;

const ProfileContent = () => {
  return (
    <div className={styles.profileContentWrapper}>
      <h1 className={styles.pageTitle}>Profile</h1>
      <Tabs defaultActiveKey="1" type="card">
        <TabPane tab="Information" key="1">
          <div className={styles.infoGrid}>
            <div className={styles.leftColumn}>
              <div className={styles.avatarContainer}>
                <Avatar size={100} icon={<UserOutlined />}>
                  NA
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
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Name</label>
                <div className={styles.valueContainer}>
                  <span>Nguyễn Anh Minh</span>
                  <EditOutlined className={styles.editIcon} />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email</label>
                <div className={styles.valueContainer}>
                  <span>anhminh0026@gmail.com</span>
                  <EditOutlined className={styles.editIcon} />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Timezone</label>
                <Select
                  defaultValue="placeholder"
                  className={styles.timezoneSelect}
                >
                  <Option value="placeholder" disabled>
                    Select your timezone
                  </Option>
                  <Option value="gmt7">
                    (GMT+07:00) Bangkok, Hanoi, Jakarta
                  </Option>
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.aboutMeSection}>
            <label className={styles.fieldLabel}>About me</label>
            <div className={`${styles.valueContainer} ${styles.aboutMeInput}`}>
              <span>
                Add here some information about yourself (position, work format,
                availability or responsibilities)
              </span>
              <EditOutlined className={styles.editIcon} />
            </div>
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
