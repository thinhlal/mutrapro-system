import { useState, useEffect, useRef } from 'react';
import { message as antMessage } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import styles from './MessageBubble.module.css';
import chatService from '../../../services/chatService';

/**
 * Message Bubble Component
 * Displays a single message in chat
 * @param {Object} message - Message object
 * @param {boolean} isOwnMessage - Whether this is user's own message
 * @param {string} roomId - Chat room ID (required for file download)
 */
const MessageBubble = ({ message, isOwnMessage = false, roomId }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const blobUrlRef = useRef(null); // Lưu blob URL để cleanup đúng
  
  // Download file
  const handleDownloadFile = async (fileKey) => {
    if (!roomId || !fileKey) {
      antMessage.error('Không thể tải file');
      return;
    }

    try {
      setLoadingFile(true);
      const blob = await chatService.downloadFile(fileKey, roomId);
      
      // Create blob URL for download only
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = message.metadata?.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL immediately after download
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Failed to download file:', error);
      antMessage.error('Không thể tải file');
    } finally {
      setLoadingFile(false);
    }
  };

  // Load file URL for images on mount
  useEffect(() => {
    // Chỉ load cho IMAGE (AUDIO và VIDEO hiển thị như FILE, không cần preview)
    if (!roomId || !message.content) return;
    
    // Normalize messageType to uppercase for case-insensitive matching
    const messageType = message.messageType?.toUpperCase();
    const needsLoad = messageType === 'IMAGE';
    if (!needsLoad) return;

    // Cleanup previous blob URL if exists
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    let isMounted = true; // Flag to check if component is still mounted

    const loadFileUrl = async () => {
      try {
        setLoadingFile(true);
        const blob = await chatService.downloadFile(message.content, roomId);
        
        // Only set URL if component is still mounted
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url; // Lưu vào ref để cleanup
          setFileUrl(url);
        } else {
          // Component unmounted, revoke blob immediately
          URL.revokeObjectURL(URL.createObjectURL(blob));
        }
      } catch (error) {
        console.error('Failed to load file:', error);
        if (isMounted) {
          antMessage.error('Không thể tải file');
        }
      } finally {
        if (isMounted) {
          setLoadingFile(false);
        }
      }
    };

    loadFileUrl();
    
    // Cleanup: revoke blob URL when component unmounts or message changes
    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setFileUrl(null);
    };
  }, [roomId, message.content, message.messageType]);
  // Format timestamp
  const formatTime = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get message type icon or render
  const renderMessageContent = () => {
    // Normalize messageType to uppercase for case-insensitive matching
    const messageType = message.messageType?.toUpperCase();
    
    switch (messageType) {
      case 'TEXT':
        // Nếu có metadata file nhưng type là TEXT, hiển thị như file
        if (message.metadata?.fileName) {
          const fileSize = message.metadata?.fileSize;
          const fileSizeText = fileSize
            ? fileSize < 1024
              ? `${fileSize} B`
              : fileSize < 1024 * 1024
              ? `${(fileSize / 1024).toFixed(1)} KB`
              : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
            : '';
          
          const fileKey = message.content;
          
          return (
            <div className={styles.messageFile}>
              <div 
                onClick={() => fileKey && handleDownloadFile(fileKey)}
                className={styles.fileLink}
                style={{ cursor: fileKey ? 'pointer' : 'default' }}
              >
                <span className={styles.fileIcon}>📎</span>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>
                    {message.metadata.fileName || 'File đính kèm'}
                  </span>
                  {fileSizeText && (
                    <span className={styles.fileSize}>{fileSizeText}</span>
                  )}
                </div>
                {loadingFile && <DownloadOutlined spin />}
              </div>
            </div>
          );
        }
        return <p className={styles.messageText}>{message.content}</p>;

      case 'IMAGE':
        const imageMetadata = message.metadata;
        
        return (
          <div className={styles.messageImage}>
            {loadingFile ? (
              <div>Đang tải...</div>
            ) : fileUrl ? (
              <img src={fileUrl} alt={imageMetadata?.fileName || 'Image'} />
            ) : (
              <div>Không thể tải hình ảnh</div>
            )}
          </div>
        );

      case 'FILE':
        const fileSize = message.metadata?.fileSize;
        const fileSizeText = fileSize
          ? fileSize < 1024
            ? `${fileSize} B`
            : fileSize < 1024 * 1024
            ? `${(fileSize / 1024).toFixed(1)} KB`
            : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
          : '';
        
        const fileKey = message.content; // fileKey thay vì URL
        
        return (
          <div className={styles.messageFile}>
            <div 
              onClick={() => fileKey && handleDownloadFile(fileKey)}
              className={styles.fileLink}
              style={{ cursor: fileKey ? 'pointer' : 'default' }}
            >
              <span className={styles.fileIcon}>📎</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>
                  {message.metadata?.fileName || 'File đính kèm'}
                </span>
                {fileSizeText && (
                  <span className={styles.fileSize}>{fileSizeText}</span>
                )}
              </div>
              {loadingFile && <DownloadOutlined spin />}
            </div>
          </div>
        );

      case 'AUDIO':
        // Hiển thị giống FILE, không cần preview
        const audioFileSize = message.metadata?.fileSize;
        const audioFileSizeText = audioFileSize
          ? audioFileSize < 1024
            ? `${audioFileSize} B`
            : audioFileSize < 1024 * 1024
            ? `${(audioFileSize / 1024).toFixed(1)} KB`
            : `${(audioFileSize / (1024 * 1024)).toFixed(1)} MB`
          : '';
        
        const audioFileKey = message.content;
        
        return (
          <div className={styles.messageFile}>
            <div 
              onClick={() => audioFileKey && handleDownloadFile(audioFileKey)}
              className={styles.fileLink}
              style={{ cursor: audioFileKey ? 'pointer' : 'default' }}
            >
              <span className={styles.fileIcon}>🎵</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>
                  {message.metadata?.fileName || 'File audio đính kèm'}
                </span>
                {audioFileSizeText && (
                  <span className={styles.fileSize}>{audioFileSizeText}</span>
                )}
              </div>
              {loadingFile && <DownloadOutlined spin />}
            </div>
          </div>
        );

      case 'VIDEO':
        // Hiển thị giống FILE, không cần preview
        const videoFileSize = message.metadata?.fileSize;
        const videoFileSizeText = videoFileSize
          ? videoFileSize < 1024
            ? `${videoFileSize} B`
            : videoFileSize < 1024 * 1024
            ? `${(videoFileSize / 1024).toFixed(1)} KB`
            : `${(videoFileSize / (1024 * 1024)).toFixed(1)} MB`
          : '';
        
        const videoFileKey = message.content;
        
        return (
          <div className={styles.messageFile}>
            <div 
              onClick={() => videoFileKey && handleDownloadFile(videoFileKey)}
              className={styles.fileLink}
              style={{ cursor: videoFileKey ? 'pointer' : 'default' }}
            >
              <span className={styles.fileIcon}>🎬</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>
                  {message.metadata?.fileName || 'File video đính kèm'}
                </span>
                {videoFileSizeText && (
                  <span className={styles.fileSize}>{videoFileSizeText}</span>
                )}
              </div>
              {loadingFile && <DownloadOutlined spin />}
            </div>
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
  if (
    message.messageType === 'SYSTEM' ||
    message.messageType === 'STATUS_UPDATE'
  ) {
    return (
      <div className={styles.systemMessageWrapper}>
        <div className={styles.systemMessageContent}>
          {renderMessageContent()}
          <span className={styles.systemMessageTime}>
            {formatTime(message.sentAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.messageBubble} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
    >
      <div className={styles.messageContent}>
        {!isOwnMessage && (
          <span className={styles.senderName}>
            {message.senderName || 'Unknown'}
          </span>
        )}

        <div className={styles.messageBubbleContent}>
          {renderMessageContent()}
        </div>

        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>
            {formatTime(message.sentAt)}
          </span>
          {isOwnMessage && message.status && (
            <span className={styles.messageStatus}>
              {message.status === 'SENT' && '✓'}
              {message.status === 'DELIVERED' && '✓✓'}
              {message.status === 'READ' && '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
