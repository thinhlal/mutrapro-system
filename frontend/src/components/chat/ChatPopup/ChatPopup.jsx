import React, { useState, useEffect, useRef } from 'react';
import { Button, Badge, Spin, Alert } from 'antd';
import {
  MessageOutlined,
  CloseOutlined,
  MinusOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useChat } from '../../../hooks/useChat';
import chatService from '../../../services/chatService';
import { getItem } from '../../../services/localStorageService';
import MessageBubble from '../MessageBubble/MessageBubble';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPopup.module.css';

/**
 * Chat Popup Component - Facebook Messenger style
 * Floating chat window that can be minimized/maximized
 */
const ChatPopup = ({ requestId, roomType = 'REQUEST_CHAT' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
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
  } = useChat(room?.roomId);

  // Load chat room by requestId
  useEffect(() => {
    const loadChatRoom = async () => {
      if (!requestId) return;

      try {
        setLoadingRoom(true);
        const response = await chatService.getChatRoomByContext(
          roomType,
          requestId
        );

        if (response?.status === 'success' && response?.data) {
          setRoom(response.data);
          
          // Load unread count if room exists
          if (response.data.roomId) {
            await loadUnreadCount(response.data.roomId);
          }
        } else {
          console.warn('Chat room not found for request:', requestId);
        }
      } catch (error) {
        console.error('Failed to load chat room:', error);
        // Chat room might not exist yet, that's OK
      } finally {
        setLoadingRoom(false);
      }
    };

    if (requestId) {
      loadChatRoom();
    }

    // Get current user ID
    const userData = getItem('user');
    if (userData?.id) {
      setCurrentUserId(userData.id);
    }
  }, [requestId, roomType]);

  // Load unread count
  const loadUnreadCount = async (roomId) => {
    try {
      const response = await chatService.getUnreadCount(roomId);
      if (response?.status === 'success' && typeof response?.data === 'number') {
        setUnreadCount(response.data);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
      setUnreadCount(0);
    }
  };

  // Mark as read when chat is opened and maximized
  useEffect(() => {
    if (isOpen && !isMinimized && room?.roomId) {
      // Call API to mark messages as read
      const markRead = async () => {
        try {
          await chatService.markAsRead(room.roomId);
          // Reload unread count after marking as read
          await loadUnreadCount(room.roomId);
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
        }
      };
      
      markRead();
    }
  }, [isOpen, isMinimized, room?.roomId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && !isMinimized && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Reset unread count when viewing messages
      if (isOpen && !isMinimized) {
        setUnreadCount(0);
      }
    }
  }, [messages, isOpen, isMinimized, messagesEndRef]);

  // Poll unread count when chat is closed or minimized
  useEffect(() => {
    if (!room?.roomId) return;
    
    // Only poll if chat is closed or minimized
    if (!isOpen || isMinimized) {
      const interval = setInterval(() => {
        loadUnreadCount(room.roomId);
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [room?.roomId, isOpen, isMinimized]);

  // Handle scroll for loading more messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop } = container;
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const handleSendMessage = async (content) => {
    if (!room?.roomId || !content.trim()) return;
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const toggleChat = () => {
    if (isOpen) {
      setIsMinimized(!isMinimized);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Get room name
  const getRoomName = () => {
    if (!room) return 'Chat';
    return room.roomName || `Request #${requestId?.substring(0, 8)}`;
  };

  // Display unread count (0 if chat is open and maximized)
  const displayUnreadCount = isOpen && !isMinimized ? 0 : unreadCount;

  if (!requestId) return null;

  return (
    <>
      {/* Chat Button (always visible when closed) */}
      {!isOpen && (
        <div className={styles.chatButtonContainer}>
          <Badge count={displayUnreadCount > 0 ? displayUnreadCount : 0} className={styles.unreadBadge}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<MessageOutlined />}
              onClick={toggleChat}
              className={styles.chatButton}
            />
          </Badge>
        </div>
      )}

      {/* Chat Popup Window */}
      {isOpen && (
        <div
          className={`${styles.chatPopup} ${
            isMinimized ? styles.minimized : styles.maximized
          }`}
        >
          {/* Minimized View - Only show when minimized */}
          {isMinimized ? (
            <div className={styles.minimizedContent}>
              <div className={styles.minimizedLeft}>
                <MessageOutlined className={styles.minimizedIcon} />
                <span className={styles.minimizedText}>{getRoomName()}</span>
                {unreadCount > 0 && (
                  <Badge count={unreadCount} className={styles.unreadBadge} />
                )}
              </div>
              <div className={styles.minimizedActions}>
                <Button
                  type="text"
                  icon={<UpOutlined />}
                  onClick={() => setIsMinimized(false)}
                  className={styles.minimizedButton}
                  title="Mở rộng"
                />
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={closeChat}
                  className={styles.minimizedButton}
                  title="Đóng"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Header - Only show when maximized */}
              <div className={styles.chatHeader}>
                <div className={styles.headerLeft}>
                  <div className={styles.avatarContainer}>
                    <UserOutlined className={styles.avatarIcon} />
                    <Badge
                      status={connected ? 'success' : 'default'}
                      className={styles.statusBadge}
                    />
                  </div>
                  <div className={styles.headerInfo}>
                    <div className={styles.roomName}>{getRoomName()}</div>
                    <div className={styles.roomStatus}>
                      {connected ? 'Đang kết nối' : 'Đang kết nối...'}
                    </div>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <Button
                    type="text"
                    icon={<MinusOutlined />}
                    onClick={() => setIsMinimized(true)}
                    className={styles.headerButton}
                    title="Minimize"
                  />
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={closeChat}
                    className={styles.headerButton}
                    title="Close"
                  />
                </div>
              </div>

              {/* Chat Content */}
              {/* Messages Container */}
              <div
                className={styles.messagesContainer}
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {/* Connection Status */}
                {!connected && (
                  <div className={styles.alertContainer}>
                    <Alert
                      message="Đang kết nối..."
                      type="warning"
                      showIcon
                      size="small"
                    />
                  </div>
                )}

                {/* Loading More Button */}
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <Button
                      type="link"
                      onClick={loadMoreMessages}
                      loading={loading}
                      size="small"
                    >
                      Tải thêm tin nhắn
                    </Button>
                  </div>
                )}

                {/* Messages List */}
                {loadingRoom || (loading && messages.length === 0) ? (
                  <div className={styles.loadingContainer}>
                    <Spin tip="Đang tải tin nhắn..." />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</p>
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

              {/* Message Input */}
              <div className={styles.inputContainer}>
                <MessageInput
                  onSend={handleSendMessage}
                  sending={sending}
                  disabled={!connected || !room}
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatPopup;

