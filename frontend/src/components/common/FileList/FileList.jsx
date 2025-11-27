import { useState } from 'react';
import { Space, Button, Typography, Modal, Spin, Alert, message } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import styles from './FileList.module.css';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import axiosInstance from '../../../utils/axiosInstance';

const { Text } = Typography;

/**
 * Component hiển thị danh sách files đã upload với preview modal tích hợp
 * @param {Array} files - Danh sách files cần hiển thị
 * @param {string} files[].fileId - ID của file (required for download)
 * @param {string} files[].fileName - Tên file
 * @param {number} files[].fileSize - Kích thước file (bytes)
 * @param {string} files[].mimeType - MIME type của file
 * @param {boolean} showEmpty - Có hiển thị khi không có files không (default: false)
 * @param {string} emptyText - Text hiển thị khi không có files (default: "No files")
 */
const FileList = ({
  files = [],
  showEmpty = false,
  emptyText = 'No files',
  maxNameLength,
}) => {
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Nếu không có files và không show empty, return null
  if (!files || files.length === 0) {
    if (!showEmpty) return null;
    return (
      <Text type="secondary" className={styles.emptyText}>
        {emptyText}
      </Text>
    );
  }

  // Format file size từ bytes sang MB/KB
  const formatFileSize = bytes => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Get file icon based on mime type
  const getFileIcon = mimeType => {
    if (!mimeType) return <FileTextOutlined />;
    if (mimeType.startsWith('audio/')) return <FileTextOutlined />;
    if (mimeType.startsWith('video/')) return <FileTextOutlined />;
    if (mimeType.includes('pdf')) return <FileTextOutlined />;
    if (mimeType.includes('image/')) return <FileTextOutlined />;
    return <FileTextOutlined />;
  };

  const handleViewFile = async file => {
    try {
      const fileId = file.fileId || file.id;
      if (!fileId) {
        message.error('File ID not found');
        return;
      }

      // Fetch file từ backend qua endpoint download
      const response = await axiosInstance.get(
        `/api/v1/projects/files/download/${fileId}`,
        { responseType: 'blob' }
      );

      const mimeType =
        response.headers['content-type'] ||
        file.mimeType ||
        'application/octet-stream';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      // Kiểm tra loại file
      const isAudioOrVideo =
        mimeType.startsWith('audio/') || mimeType.startsWith('video/');

      if (isAudioOrVideo) {
        // Audio/Video: Mở trong modal
        setPreviewLoading(true);
        setPreviewFile(file);
        setPreviewModalVisible(true);
        setPreviewFile(prev => ({
          ...prev,
          previewUrl: url,
          mimeType: mimeType,
        }));
        setPreviewLoading(false);
      } else {
        // PDF/Image/Khác: Mở tab mới
        window.open(url, '_blank');
        // Clean up URL sau khi mở
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('Lỗi khi xem file');
      setPreviewModalVisible(false);
      setPreviewFile(null);
    }
  };

  const handleDownloadFile = async (e, file) => {
    e.stopPropagation();
    const fileId = file.fileId || file.id;
    const fileName = file.fileName || file.name || 'file';
    if (!fileId) return;
    await downloadFileHelper(fileId, fileName);
  };

  const closePreviewModal = () => {
    if (previewFile?.previewUrl) {
      window.URL.revokeObjectURL(previewFile.previewUrl);
    }
    setPreviewModalVisible(false);
    setPreviewFile(null);
  };

  return (
    <>
      <div className={styles.fileListContainer}>
        {files.map(file => {
          const fileId = file.fileId || file.id;
          const fileName = file.fileName || file.name || 'Unnamed file';
          const fileSize = file.fileSize || file.size;
          const mimeType = file.mimeType;
          const effectiveMaxLength = maxNameLength || 40;
          const displayName =
            fileName.length > effectiveMaxLength
              ? `${fileName.slice(0, effectiveMaxLength)}…`
              : fileName;

          return (
            <div key={fileId} className={styles.fileItem}>
              <div className={styles.fileIcon}>{getFileIcon(mimeType)}</div>
              <div className={styles.fileInfo}>
                <div className={styles.fileNameRow}>
                  <Text strong className={styles.fileName} title={fileName}>
                    {displayName}
                  </Text>
                  {fileId && (
                    <Space className={styles.fileActions}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewFile(file)}
                        className={styles.actionButton}
                        title="View file"
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={e => handleDownloadFile(e, file)}
                        className={styles.actionButton}
                        title="Download file"
                      />
                    </Space>
                  )}
                </div>
                <div className={styles.fileMeta}>
                  {fileSize && (
                    <Text type="secondary" className={styles.fileSize}>
                      {formatFileSize(fileSize)}
                    </Text>
                  )}
                  {mimeType && (
                    <>
                      <Text type="secondary" className={styles.separator}>
                        •
                      </Text>
                      <Text type="secondary" className={styles.fileType}>
                        {mimeType}
                      </Text>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal - Chỉ cho Audio/Video */}
      <Modal
        title={previewFile?.fileName || previewFile?.name || 'Preview'}
        open={previewModalVisible}
        onCancel={closePreviewModal}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (previewFile) {
                const fileId = previewFile.fileId || previewFile.id;
                const fileName =
                  previewFile.fileName || previewFile.name || 'file';
                downloadFileHelper(fileId, fileName);
              }
            }}
          >
            Download
          </Button>,
          <Button key="close" onClick={closePreviewModal}>
            Close
          </Button>,
        ]}
        width={800}
        destroyOnClose={true}
      >
        <Spin spinning={previewLoading}>
          {previewFile?.previewUrl && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {previewFile.mimeType?.startsWith('audio/') ? (
                <div
                  style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
                >
                  <audio
                    controls
                    style={{ width: '100%' }}
                    preload="metadata"
                    autoPlay
                  >
                    <source
                      src={previewFile.previewUrl}
                      type={previewFile.mimeType}
                    />
                    Trình duyệt không hỗ trợ audio player
                  </audio>
                </div>
              ) : previewFile.mimeType?.startsWith('video/') ? (
                <video
                  controls
                  style={{ width: '100%', maxHeight: '500px' }}
                  preload="metadata"
                  autoPlay
                >
                  <source
                    src={previewFile.previewUrl}
                    type={previewFile.mimeType}
                  />
                  Trình duyệt không hỗ trợ video player
                </video>
              ) : (
                <Alert
                  message="File này không thể preview trong modal"
                  description="Đang mở trong tab mới..."
                  type="info"
                />
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </>
  );
};

FileList.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      fileId: PropTypes.string,
      id: PropTypes.string,
      fileName: PropTypes.string,
      name: PropTypes.string,
      fileSize: PropTypes.number,
      size: PropTypes.number,
      mimeType: PropTypes.string,
    })
  ),
  showEmpty: PropTypes.bool,
  emptyText: PropTypes.string,
  maxNameLength: PropTypes.number,
};

export default FileList;
