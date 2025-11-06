
import { create } from 'zustand';
import * as notationService from '../services/notationService';

export const useInstrumentStore = create((set, get) => ({
  // --- State ---
  instruments: [], // List of all instruments from API
  loading: false,
  error: null,

  // --- Actions ---

  /**
   * Fetch all notation instruments
   */
  fetchInstruments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await notationService.getNotationInstruments();
      set({
        instruments: response.data || [],
        loading: false,
        error: null,
      });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Không thể tải danh sách nhạc cụ',
      });
      throw error;
    }
  },

  /**
   * Get active instruments only
   */
  getActiveInstruments: () => {
    const { instruments } = get();
    return instruments.filter(inst => inst.active);
  },

  /**
   * Get instruments by usage type
   * @param {string} usage - 'transcription', 'arrangement', or 'both'
   */
  getInstrumentsByUsage: usage => {
    const { instruments } = get();
    return instruments.filter(
      inst => inst.active && (inst.usage === usage || inst.usage === 'both')
    );
  },

  /**
   * Clear instruments (on logout)
   */
  clearInstruments: () => {
    set({
      instruments: [],
      loading: false,
      error: null,
    });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));

