import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ChatConversationPage from '../../chat/ChatConversation/ChatConversationPage';
import styles from './AdminChatConversationPage.module.css';

/**
 * Admin Chat Conversation Page
 * Chỉ hiển thị conversation của một room, nằm trong AdminLayout
 */
const AdminChatConversationPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/admin/chat-rooms');
  };

  return (
    <div className={styles.adminChatConversationWrapper}>
      <div className={styles.headerBar}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          type="text"
        >
          Back to Chat Rooms
        </Button>
      </div>
      <div className={styles.conversationContainer}>
        {roomId ? (
          <ChatConversationPage />
        ) : (
          <div className={styles.emptyState}>
            <p>No room selected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatConversationPage;

