
import { create } from 'zustand';
import { getAllNotationInstruments } from '../services/notationInstrumentService';

export const useInstrumentStore = create((set, get) => ({
  // --- State ---
  instruments: [], // List of all instruments from API
  loading: false,
  error: null,

  // --- Actions ---

  /**
   * Fetch all notation instruments (active only for public users)
   */
  fetchInstruments: async () => {
    set({ loading: true, error: null });
    try {
      // includeInactive = false để chỉ lấy active instruments cho public users
      const response = await getAllNotationInstruments(null, false);
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

