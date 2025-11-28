import { create } from 'zustand';
import {
  KLANG_API_KEY,
  KLANG_BASE_URL,
  POLL_INTERVAL_MS,
  JOB_STATUS,
} from '../config/klangConfig';

/**
 * Klang AI Transcription Store
 * Manages transcription job state and API calls
 * Similar to frontend useKlangTranscriptionStore
 */
export const useKlangTranscriptionStore = create((set, get) => ({
  // State
  model: 'detect', // Selected AI model
  jobId: null, // Current job ID
  status: null, // Job status: CREATING, IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
  loading: false,
  error: null,
  midiBlob: null, // MIDI file blob for playback/display
  midiUrl: null, // Local URI for MIDI file

  // Actions
  setModel: (model) => set({ model }),

  reset: () =>
    set({
      jobId: null,
      status: null,
      error: null,
      midiBlob: null,
      midiUrl: null,
      loading: false,
    }),

  /**
   * Create transcription job
   * @param {Object} file - File object from document picker
   */
  createTranscription: async (file) => {
    const { model, pollStatus } = get();

    if (!file) {
      set({ error: 'Please select an audio file first.' });
      return;
    }

    set({ loading: true, error: null, status: JOB_STATUS.CREATING });

    try {
      console.log('[Klang] Creating transcription job...');
      console.log('[Klang] Model:', model);
      console.log('[Klang] File:', file.name || file.uri);
      
      // DEBUG: Check API key
      console.log('[Klang] API Key loaded:', KLANG_API_KEY ? 'YES ✅' : 'NO ❌');
      console.log('[Klang] API Key (first 15 chars):', KLANG_API_KEY?.substring(0, 15) || 'UNDEFINED');
      console.log('[Klang] API Key length:', KLANG_API_KEY?.length || 0);

      // Prepare FormData for React Native
      const formData = new FormData();
      
      // React Native FormData needs specific format
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || file.type || 'audio/mpeg',
        name: file.name || 'audio.mp3',
      });
      formData.append('outputs', 'midi');

      // Query params
      const params = new URLSearchParams({
        model,
        title: file.name || 'Untitled',
      });

      console.log('[Klang] API URL:', `${KLANG_BASE_URL}/transcription?${params.toString()}`);
      console.log('[Klang] API Key (first 10 chars):', KLANG_API_KEY.substring(0, 10) + '...');

      // API call with proper headers for React Native
      const response = await fetch(
        `${KLANG_BASE_URL}/transcription?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            'kl-api-key': KLANG_API_KEY,
            // Let browser/RN set Content-Type automatically for FormData
            // 'Content-Type': 'multipart/form-data', // Don't set manually!
          },
          body: formData,
        }
      );

      console.log('[Klang] Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('[Klang] Response error:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log('[Klang] Job created:', data.job_id);

      set({
        jobId: data.job_id,
        status: JOB_STATUS.IN_QUEUE,
        loading: false,
      });

      // Start polling status
      pollStatus(data.job_id);
    } catch (err) {
      console.error('[Klang] Create transcription error:', err);
      console.error('[Klang] Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
      
      let errorMessage = 'Failed to create transcription job';
      
      if (err.message.includes('Network request failed')) {
        errorMessage = 'Network error: Please check your internet connection or API configuration';
      } else if (err.message.includes('401')) {
        errorMessage = 'Invalid API key. Please check your Klang API key.';
      } else if (err.message.includes('403')) {
        errorMessage = 'API key forbidden. Your key may be expired or out of quota.';
      }
      
      set({
        error: errorMessage,
        loading: false,
        status: JOB_STATUS.FAILED,
      });
    }
  },

  /**
   * Poll job status until COMPLETED or FAILED
   * @param {string} jobId - Job ID to poll
   */
  pollStatus: (jobId) => {
    const pollOnce = async () => {
      const { status } = get();

      // Stop polling if completed or failed
      if (!jobId || status === JOB_STATUS.COMPLETED || status === JOB_STATUS.FAILED) {
        return;
      }

      try {
        console.log('[Klang] Polling status for job:', jobId);

        const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/status`, {
          headers: {
            'kl-api-key': KLANG_API_KEY,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Status HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log('[Klang] Job status:', data.status);

        set({ status: data.status });

        if (data.status === JOB_STATUS.COMPLETED) {
          // Auto-fetch MIDI when completed
          console.log('[Klang] Job completed! Fetching MIDI...');
          get().fetchMidi();
          return;
        }

        if (data.status === JOB_STATUS.FAILED) {
          set({ error: 'Transcription failed. Please try again.' });
          return;
        }

        // Still processing, poll again after interval
        setTimeout(pollOnce, POLL_INTERVAL_MS);
      } catch (err) {
        console.error('[Klang] Poll status error:', err);
        set({ error: err.message });
      }
    };

    // Start polling
    pollOnce();
  },

  /**
   * Fetch MIDI file
   */
  fetchMidi: async () => {
    const { jobId } = get();
    if (!jobId) return;

    try {
      console.log('[Klang] Fetching MIDI...');

      const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/midi`, {
        headers: { 'kl-api-key': KLANG_API_KEY },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Fetch MIDI HTTP ${response.status}: ${text}`);
      }

      const blob = await response.blob();
      
      // For mobile, we'll use the blob URL directly
      // Or convert to base64 for WebView
      set({ midiBlob: blob });
      console.log('[Klang] MIDI fetched successfully');
    } catch (err) {
      console.error('[Klang] Fetch MIDI error:', err);
      set({ error: err.message });
    }
  },

  /**
   * Download result in specified format
   * @param {string} format - 'midi', 'xml', 'pdf', etc.
   */
  downloadResult: async (format) => {
    const { jobId } = get();
    if (!jobId) return;

    try {
      console.log('[Klang] Downloading format:', format);

      const response = await fetch(`${KLANG_BASE_URL}/job/${jobId}/${format}`, {
        headers: { 'kl-api-key': KLANG_API_KEY },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Download HTTP ${response.status}: ${text}`);
      }

      const blob = await response.blob();
      
      // For mobile, use react-native-fs to save file
      // This is a simplified version - need to implement actual file save
      console.log('[Klang] Downloaded successfully');
      
      return blob;
    } catch (err) {
      console.error('[Klang] Download error:', err);
      set({ error: err.message });
      throw err;
    }
  },
}));

export default useKlangTranscriptionStore;

