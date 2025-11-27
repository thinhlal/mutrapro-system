import { message } from 'antd';
import { fetchFileForPreview } from '../services/fileService';

/**
 * Preview file trong new tab (PDF, images, audio, video)
 * @param {string} fileId - ID của file
 * @param {string} fallbackMimeType - MIME type fallback nếu không có (optional)
 * @returns {Promise<void>}
 */
export const previewFile = async (fileId, fallbackMimeType = null) => {
  if (!fileId) {
    message.error('File ID not available');
    return;
  }

  try {
    // Fetch file từ backend (có auth check)
    const { blob, fileName, mimeType } = await fetchFileForPreview(fileId);

    // Tạo blob URL với đúng MIME type
    const finalMimeType =
      mimeType || fallbackMimeType || 'application/octet-stream';
    const blobWithType = new Blob([blob], { type: finalMimeType });
    const blobUrl = window.URL.createObjectURL(blobWithType);

    // Mở new tab để preview
    const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    if (!newWindow) {
      message.error('Please allow popups to preview file');
      window.URL.revokeObjectURL(blobUrl);
      return;
    }

    // Cleanup blob URL sau 1 phút (để preview tab có thời gian load)
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60_000);
  } catch (error) {
    console.error('Error previewing file:', error);

    // Handle specific errors
    if (error.response?.status === 403) {
      message.error('You do not have permission to view this file');
    } else if (error.response?.status === 404) {
      message.error('File not found');
    } else {
      message.error(error?.message || 'Failed to preview file');
    }
  }
};

/**
 * Download file (trigger browser download)
 * @param {string} fileId - ID của file
 * @param {string} fileName - Tên file (optional)
 * @returns {Promise<void>}
 */
export const downloadFileHelper = async (fileId, fileName = null) => {
  if (!fileId) {
    message.error('File ID not available');
    return;
  }

  try {
    const {
      blob,
      fileName: serverFileName,
      mimeType,
    } = await fetchFileForPreview(fileId);

    // Tạo blob URL
    const blobWithType = new Blob([blob], { type: mimeType });
    const blobUrl = window.URL.createObjectURL(blobWithType);

    // Trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || serverFileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    window.URL.revokeObjectURL(blobUrl);

    message.success('File downloaded successfully');
  } catch (error) {
    console.error('Error downloading file:', error);

    if (error.response?.status === 403) {
      message.error('You do not have permission to download this file');
    } else if (error.response?.status === 404) {
      message.error('File not found');
    } else {
      message.error(error?.message || 'Failed to download file');
    }
  }
};
