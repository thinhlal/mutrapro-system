import { create } from 'zustand';
import { KLANG_API_KEY, KLANG_BASE_URL } from '../config/klangConfig.js';

const POLL_INTERVAL_MS = 4000;

export const useKlangTranscriptionStore = create((set, get) => ({
  // state
  model: 'detect',
  jobId: null,
  status: null, // IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
  loading: false,
  error: null,
  midiBlob: null, // Store MIDI blob for Flat display
  pdfBlob: null, // Store PDF blob for inline preview

  // actions
  setModel: model => set({ model }),
  reset: () =>
    set({
      jobId: null,
      status: null,
      error: null,
      midiBlob: null,
      pdfBlob: null,
    }),

  // Output formats requested for the job (default midi; UI can change)
  outputFormats: ['midi'],

  setOutputFormats: outputs => set({ outputFormats: outputs }),

  // Tạo transcription job
  createTranscription: async file => {
    const { model, pollStatus, outputFormats } = get();

    if (!file) {
      set({ error: 'Please choose an audio file first.' });
      return;
    }

    set({ loading: true, error: null, status: 'CREATING' });

    try {
      // Query params
      const params = new URLSearchParams({
        model, // detect / piano / guitar ...
        title: file.name,
      });

      // Body FormData
      const formData = new FormData();
      formData.append('file', file);
      // outputs – mỗi lần append là 1 phần tử trong array
      outputFormats.forEach(output => formData.append('outputs', output));

      const res = await fetch(
        `${KLANG_BASE_URL}/transcription?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            'kl-api-key': KLANG_API_KEY,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json(); // { job_id, status_endpoint_url, ... }

      set({
        jobId: data.job_id,
        status: 'IN_QUEUE',
        loading: false,
      });

      // Bắt đầu poll status
      pollStatus(data.job_id);
    } catch (err) {
      console.error(err);
      set({ error: err.message, loading: false, status: 'FAILED' });
    }
  },

  // Poll status cho đến khi COMPLETED hoặc FAILED
  pollStatus: jobId => {
    const pollOnce = async () => {
      const { status } = get();
      if (!jobId || status === 'COMPLETED' || status === 'FAILED') return;

      try {
        const res = await fetch(`${KLANG_BASE_URL}/job/${jobId}/status`, {
          headers: {
            'kl-api-key': KLANG_API_KEY,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status HTTP ${res.status}: ${text}`);
        }

        const data = await res.json(); // { status: "IN_QUEUE" | ... }
        set({ status: data.status });

        if (data.status === 'COMPLETED') {
          const { outputFormats } = get();
          if (outputFormats.includes('midi')) {
            get().fetchMidiBlob();
          }
          if (outputFormats.includes('pdf')) {
            get().fetchPdfBlob();
          }
          return;
        }

        if (data.status === 'FAILED') {
          return;
        }

        // vẫn đang queue/in_progress -> poll lại sau 4s
        setTimeout(pollOnce, POLL_INTERVAL_MS);
      } catch (err) {
        console.error(err);
        set({ error: err.message });
      }
    };

    // kick off
    pollOnce();
  },

  // Fetch MIDI blob for display in Flat
  fetchMidiBlob: async () => {
    const { jobId } = get();
    if (!jobId) return;

    try {
      const res = await fetch(`${KLANG_BASE_URL}/job/${jobId}/midi`, {
        headers: { 'kl-api-key': KLANG_API_KEY },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch MIDI HTTP ${res.status}: ${text}`);
      }

      const blob = await res.blob();
      set({ midiBlob: blob });
    } catch (err) {
      console.error('Failed to fetch MIDI:', err);
      set({ error: err.message });
    }
  },

  // Fetch PDF blob for inline preview
  fetchPdfBlob: async () => {
    const { jobId } = get();
    if (!jobId) return;

    try {
      const res = await fetch(`${KLANG_BASE_URL}/job/${jobId}/pdf`, {
        headers: { 'kl-api-key': KLANG_API_KEY },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch PDF HTTP ${res.status}: ${text}`);
      }

      const blob = await res.blob();
      set({ pdfBlob: blob });
    } catch (err) {
      console.error('Failed to fetch PDF:', err);
      set({ error: err.message });
    }
  },

  // Download kết quả theo format (xml, midi, pdf, audio, ...)
  downloadResult: async format => {
    const { jobId, outputFormats } = get();
    if (!jobId) return;

    // If format not requested/allowed, surface a friendly error
    if (!outputFormats.includes(format)) {
      set({
        error:
          format === 'xml'
            ? 'MusicXML output is not supported by the current transcription service.'
            : `Output ${format} is not supported.`,
      });
      return;
    }

    try {
      const res = await fetch(`${KLANG_BASE_URL}/job/${jobId}/${format}`, {
        headers: { 'kl-api-key': KLANG_API_KEY },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Download HTTP ${res.status}: ${text}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      let ext = format;
      if (format === 'xml') ext = 'xml';
      if (format === 'midi') ext = 'mid';
      if (format === 'pdf') ext = 'pdf';

      a.href = url;
      a.download = `${jobId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      set({ error: err.message });
    }
  },
}));
