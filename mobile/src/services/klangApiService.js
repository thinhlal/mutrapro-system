/**
 * Klang API Service
 * Wrapper functions for Klang AI Transcription API
 */

import { KLANG_API_KEY, KLANG_BASE_URL } from '../config/klangConfig';

/**
 * Create transcription job
 * @param {Object} file - File object from document picker
 * @param {string} model - AI model to use
 * @returns {Promise<Object>} Job data with job_id
 */
export const createTranscriptionJob = async (file, model = 'detect') => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'audio/mpeg',
      name: file.name || 'audio.mp3',
    });
    formData.append('outputs', 'midi');

    const params = new URLSearchParams({
      model,
      title: file.name || 'Untitled',
    });

    const response = await fetch(
      `${KLANG_BASE_URL}/transcription?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'kl-api-key': KLANG_API_KEY,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Klang API] Create job error:', error);
    throw error;
  }
};

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Status data
 */
export const getJobStatus = async (jobId) => {
  try {
    const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/status`, {
      headers: {
        'kl-api-key': KLANG_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Klang API] Get status error:', error);
    throw error;
  }
};

/**
 * Download MIDI file
 * @param {string} jobId - Job ID
 * @returns {Promise<Blob>} MIDI file blob
 */
export const downloadMidi = async (jobId) => {
  try {
    const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/midi`, {
      headers: {
        'kl-api-key': KLANG_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[Klang API] Download MIDI error:', error);
    throw error;
  }
};

/**
 * Download file in specific format
 * @param {string} jobId - Job ID
 * @param {string} format - Format (midi, xml, pdf, etc.)
 * @returns {Promise<Blob>} File blob
 */
export const downloadJobResult = async (jobId, format) => {
  try {
    const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/${format}`, {
      headers: {
        'kl-api-key': KLANG_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[Klang API] Download result error:', error);
    throw error;
  }
};

export default {
  createTranscriptionJob,
  getJobStatus,
  downloadMidi,
  downloadJobResult,
};

