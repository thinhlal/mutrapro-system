import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, message, Select } from 'antd';
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
  const [selectedContextType, setSelectedContextType] = useState('GENERAL'); // Default: GENERAL (chat chung)
  const [selectedContextId, setSelectedContextId] = useState(null);
  const messagesContainerRef = useRef(null);

  // Không auto-load trong useChat, chỉ load từ đây với filter
  const {
    messages,
    loading,
    sending,
    connected,
    hasMore,
    sendMessage,
    loadMoreMessages,
    loadMessages,
    messagesEndRef,
  } = useChat(roomId, false); // false = không auto-load

  // Load messages với filter ngay từ đầu
  useEffect(() => {
    if (roomId && !loadingRoom) {
      loadMessages(0, selectedContextType, selectedContextId);
    }
  }, [
    roomId,
    selectedContextType,
    selectedContextId,
    loadingRoom,
    loadMessages,
  ]);

  // Load room details
  useEffect(() => {
    const loadRoom = async () => {
      try {
        setLoadingRoom(true);
        const roomData = await chatService.getChatRoomById(roomId);

        // Check if room is active
        if (roomData?.data?.isActive === false) {
          message.warning('Phòng chat này đã được đóng');
          setRoom(roomData.data); // Vẫn set để hiển thị messages cũ
        } else {
          setRoom(roomData.data);
        }

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
      loadMoreMessages(selectedContextType, selectedContextId);

      // Maintain scroll position after loading more messages
      setTimeout(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      }, 100);
    }
  };

  // Handle send message
  const handleSendMessage = async content => {
    // Check if room is active
    if (room?.isActive === false) {
      message.warning('Không thể gửi tin nhắn. Phòng chat này đã được đóng.');
      return;
    }

    try {
      await sendMessage(content, 'TEXT', null, selectedContextType, selectedContextId);
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Không thể gửi tin nhắn');
    }
  };

  // Handle file upload
  const handleFileUpload = async (fileKey, fileName, fileType, metadata) => {
    // Check if room is active
    if (room?.isActive === false) {
      message.warning('Không thể gửi file. Phòng chat này đã được đóng.');
      return;
    }

    try {
      // Determine message type based on file type
      let messageType = 'FILE';
      if (fileType === 'image') {
        messageType = 'IMAGE';
      } else if (fileType === 'audio') {
        messageType = 'AUDIO';
      } else if (fileType === 'video') {
        messageType = 'VIDEO';
      }

      // Send file message via WebSocket
      // content = fileKey (không phải URL nữa, để download qua API)
      await sendMessage(
        fileKey, // content = fileKey để download sau này
        messageType,
        metadata, // metadata = file info (bao gồm fileKey)
        selectedContextType,
        selectedContextId
      );
    } catch (error) {
      console.error('Failed to send file message:', error);
      message.error('Không thể gửi file');
    }
  };

  if (loadingRoom) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Loading conversation..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="Conversation not found"
          description="This conversation does not exist or you do not have access."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const { Option } = Select;

  return (
    <div className={styles.chatConversationPage}>
      <ChatHeader
        room={room}
        connected={connected}
        selectedContextType={selectedContextType}
        onContextTypeChange={setSelectedContextType}
      />

      <div
        className={styles.messagesContainer}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Connection Status Alert */}
        {!connected && (
          <div className={styles.alertContainer}>
            <Alert
              message="Connection Lost"
              description="Trying to reconnect..."
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
              onClick={() =>
                loadMoreMessages(selectedContextType, selectedContextId)
              }
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
            <Spin tip="Loading messages..." />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map(message => (
              <MessageBubble
                key={message.messageId}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
                roomId={room?.roomId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        roomId={room?.roomId}
        sending={sending}
        disabled={!connected || room?.isActive === false}
      />
    </div>
  );
};

export default ChatConversationPage;
