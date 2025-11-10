import { useState, useRef } from 'react';
import { Input, Button, Upload } from 'antd';
import { SendOutlined, PaperClipOutlined, SmileOutlined } from '@ant-design/icons';
import styles from './MessageInput.module.css';

const { TextArea } = Input;

/**
 * Message Input Component
 * Input area for sending messages
 */
const MessageInput = ({ onSend, sending = false, disabled = false }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() || sending) return;

    onSend(message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = (file) => {
    // TODO: Implement file upload
    console.log('File upload:', file);
    return false; // Prevent default upload
  };

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputWrapper}>
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={disabled || sending}
        >
          <Button 
            type="text" 
            icon={<PaperClipOutlined />} 
            disabled={disabled || sending}
            className={styles.actionButton}
          />
        </Upload>

        <TextArea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={disabled || sending}
          className={styles.textarea}
        />

        <Button
          type="text"
          icon={<SmileOutlined />}
          disabled={disabled || sending}
          className={styles.actionButton}
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

