import { Space, Button, Typography } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import styles from './FileList.module.css';
import { previewFile, downloadFileHelper } from '../../../utils/filePreviewHelper';

const { Text } = Typography;

/**
 * Component hiển thị danh sách files đã upload với layout đẹp hơn
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

  const handleViewFile = async (fileId, mimeType = null) => {
    if (!fileId) return;
    // Preview file qua backend API với auth check
    await previewFile(fileId, mimeType);
  };

  const handleDownloadFile = async (e, fileId, fileName) => {
    e.stopPropagation();
    if (!fileId) return;
    
    // Download file qua backend API với auth check
    await downloadFileHelper(fileId, fileName);
  };

  return (
    <div className={styles.fileListContainer}>
      {files.map(file => {
        const fileId = file.fileId || file.id;
        const fileName = file.fileName || file.name || 'Unnamed file';
        const fileSize = file.fileSize || file.size;
        const mimeType = file.mimeType;
        // Truncate file name nếu quá dài, nhưng đảm bảo không tràn layout
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
                      onClick={() => handleViewFile(fileId, mimeType)}
                      className={styles.actionButton}
                      title="View file"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={e => handleDownloadFile(e, fileId, fileName)}
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
