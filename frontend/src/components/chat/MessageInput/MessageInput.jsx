import { useState, useRef } from 'react';
import { Input, Button, Upload, message as antMessage } from 'antd';
import { SendOutlined, PaperClipOutlined } from '@ant-design/icons';
import styles from './MessageInput.module.css';
import chatService from '../../../services/chatService';

const { TextArea } = Input;

/**
 * Message Input Component
 * Input area for sending messages
 * @param {Function} onSend - Callback khi gửi text message
 * @param {Function} onFileUpload - Callback khi upload file thành công (fileUrl, fileName, fileType, metadata)
 * @param {string} roomId - Chat room ID (cần để upload file)
 * @param {boolean} sending - Đang gửi message
 * @param {boolean} disabled - Disable input
 */
const MessageInput = ({
  onSend,
  onFileUpload,
  roomId,
  sending = false,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() || sending) return;

    onSend(message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = e => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = async file => {
    if (!roomId) {
      antMessage.error('Không tìm thấy phòng chat');
      return false;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      antMessage.error('File không được vượt quá 50MB');
      return false;
    }

    try {
      setUploading(true);

      // Upload file to backend
      const response = await chatService.uploadFile(file, roomId);

      if (response?.status === 'success' && response?.data) {
        const { fileKey, fileName, fileType, mimeType, fileSize } =
          response.data;

        // Create metadata object (bao gồm fileKey)
        const metadata = {
          fileName,
          fileSize,
          mimeType,
          fileType,
          fileKey, // Lưu fileKey để download sau này
        };

        // Call callback with file info (fileKey thay vì fileUrl)
        if (onFileUpload) {
          onFileUpload(fileKey, fileName, fileType, metadata);
        }

        antMessage.success('Upload file thành công');
      } else {
        throw new Error(response?.message || 'Upload file thất bại');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      antMessage.error(
        error?.response?.data?.message ||
          error?.message ||
          'Upload file thất bại'
      );
    } finally {
      setUploading(false);
    }

    return false; // Prevent default upload
  };

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputWrapper}>
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={disabled || sending || uploading}
        >
          <Button
            type="text"
            icon={<PaperClipOutlined />}
            disabled={disabled || sending || uploading}
            loading={uploading}
            className={styles.actionButton}
            title="Đính kèm file"
          />
        </Upload>

        <TextArea
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          autoSize={{ minRows: 1 }}
          disabled={disabled || sending}
          className={styles.textarea}
        />

        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={disabled || sending || !message.trim()}
          loading={sending}
          className={styles.sendButton}
        >
          Gửi
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
