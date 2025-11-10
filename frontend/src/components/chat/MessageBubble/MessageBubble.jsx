import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styles from './MessageBubble.module.css';

/**
 * Message Bubble Component
 * Displays a single message in chat
 */
const MessageBubble = ({ message, isOwnMessage = false }) => {
  // Format timestamp
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Get message type icon or render
  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'TEXT':
        return <p className={styles.messageText}>{message.content}</p>;
      
      case 'IMAGE':
        return (
          <div className={styles.messageImage}>
            <img src={message.content} alt="Image" />
          </div>
        );
      
      case 'FILE':
        return (
          <div className={styles.messageFile}>
            <a href={message.content} target="_blank" rel="noopener noreferrer">
              📎 {message.metadata?.fileName || 'File đính kèm'}
            </a>
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className={styles.messageAudio}>
            <audio controls src={message.content}>
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      
      case 'VIDEO':
        return (
          <div className={styles.messageVideo}>
            <video controls src={message.content} style={{ maxWidth: '100%' }}>
              Your browser does not support the video element.
            </video>
          </div>
        );
      
      case 'SYSTEM':
        return (
          <div className={styles.systemMessage}>
            <span>{message.content}</span>
          </div>
        );
      
      case 'STATUS_UPDATE':
        return (
          <div className={styles.statusMessage}>
            <span>📋 {message.content}</span>
          </div>
        );
      
      default:
        return <p className={styles.messageText}>{message.content}</p>;
    }
  };

  // System messages have special styling
  if (message.messageType === 'SYSTEM' || message.messageType === 'STATUS_UPDATE') {
    return (
      <div className={styles.systemMessageWrapper}>
        <div className={styles.systemMessageContent}>
          {renderMessageContent()}
          <span className={styles.systemMessageTime}>{formatTime(message.sentAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageBubble} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
      {!isOwnMessage && (
        <Avatar 
          size={32} 
          icon={<UserOutlined />} 
          src={message.senderAvatar}
          className={styles.avatar}
        />
      )}

      <div className={styles.messageContent}>
        {!isOwnMessage && (
          <span className={styles.senderName}>{message.senderName || 'Unknown'}</span>
        )}
        
        <div className={styles.messageBubbleContent}>
          {renderMessageContent()}
        </div>

        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>{formatTime(message.sentAt)}</span>
          {isOwnMessage && message.status && (
            <span className={styles.messageStatus}>
              {message.status === 'SENT' && '✓'}
              {message.status === 'DELIVERED' && '✓✓'}
              {message.status === 'READ' && '✓✓'}
            </span>
          )}
        </div>
      </div>

      {isOwnMessage && (
        <Avatar 
          size={32} 
          icon={<UserOutlined />} 
          src={message.senderAvatar}
          className={styles.avatar}
        />
      )}
    </div>
  );
};

export default MessageBubble;

