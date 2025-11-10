import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useChat } from '../../../hooks/useChat';
import chatService from '../../../services/chatService';
import { getItem } from '../../../services/localStorageService';
import ChatHeader from '../../../components/chat/ChatHeader/ChatHeader';
import MessageBubble from '../../../components/chat/MessageBubble/MessageBubble';
import MessageInput from '../../../components/chat/MessageInput/MessageInput';
import styles from './ChatConversationPage.module.css';

/**
 * Chat Conversation Page
 * Main chat interface with real-time messaging
 */
const ChatConversationPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesContainerRef = useRef(null);

  const {
    messages,
    loading,
    sending,
    connected,
    hasMore,
    sendMessage,
    loadMoreMessages,
    messagesEndRef,
  } = useChat(roomId);

  // Load room details
  useEffect(() => {
    const loadRoom = async () => {
      try {
        setLoadingRoom(true);
        const roomData = await chatService.getChatRoomById(roomId);
        setRoom(roomData.data);

        // Get current user ID from localStorage
        const userData = getItem('user');
        if (userData?.id) {
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error('Failed to load room:', error);
      } finally {
        setLoadingRoom(false);
      }
    };

    if (roomId) {
      loadRoom();
    }
  }, [roomId]);

  // Handle scroll for loading more messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // If scrolled to top, load more messages
    if (container.scrollTop < 100 && hasMore && !loading) {
      const previousHeight = container.scrollHeight;
      loadMoreMessages();

      // Maintain scroll position after loading more messages
      setTimeout(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      }, 100);
    }
  };

  // Handle send message
  const handleSendMessage = async (content) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loadingRoom) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Đang tải cuộc trò chuyện..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="Không tìm thấy cuộc trò chuyện"
          description="Cuộc trò chuyện này không tồn tại hoặc bạn không có quyền truy cập."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className={styles.chatConversationPage}>
      <ChatHeader room={room} connected={connected} />

      <div 
        className={styles.messagesContainer}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Connection Status Alert */}
        {!connected && (
          <div className={styles.alertContainer}>
            <Alert
              message="Mất kết nối"
              description="Đang cố gắng kết nối lại..."
              type="warning"
              showIcon
              closable
            />
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <Button 
              onClick={loadMoreMessages} 
              loading={loading}
              icon={<ReloadOutlined />}
            >
              Tải thêm tin nhắn
            </Button>
          </div>
        )}

        {/* Messages List */}
        {loading && messages.length === 0 ? (
          <div className={styles.loadingMessages}>
            <Spin tip="Đang tải tin nhắn..." />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện! 💬</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => (
              <MessageBubble
                key={message.messageId}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        sending={sending}
        disabled={!connected}
      />
    </div>
  );
};

export default ChatConversationPage;

