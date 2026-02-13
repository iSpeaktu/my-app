// Extracted from App.js - Local storage utilities hook (original lines 207-255)
// NOTE: Removed dependency on embedded MATERIALS_DATA. Stored selection returns IDs only.

/**
 * useLocalStorage - Custom hook for managing persistent localStorage operations
 * Handles view persistence, selection persistence with error handling.
 * 
 * @returns {Object} localStorage utility functions:
 *   - getStoredView, setStoredView, getStoredSelection, setStoredSelection
 */
export const useLocalStorage = () => {
  const VIEW_STORAGE_KEY = 'ispeaktu_last_view';
  const SELECTION_STORAGE_KEY = 'ispeaktu_last_selection';

  // --- GET STORED VIEW (original line 210-216) ---
  const getStoredView = () => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY);
    } catch {
      return null;
    }
  };

  // --- SET STORED VIEW (original line 218-224) ---
  const setStoredView = (viewName) => {
    try {
      if (viewName) localStorage.setItem(VIEW_STORAGE_KEY, viewName);
      else localStorage.removeItem(VIEW_STORAGE_KEY);
    } catch {
      return;
    }
  };

  // --- GET STORED SELECTION (original line 227-241) ---
  const getStoredSelection = () => {
    try {
      const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Return the stored material id rather than resolving to an in-memory material object.
      return {
        material: parsed?.materialId || null,
        level: parsed?.level || null,
        lessonNumber: parsed?.lessonNumber || null
      };
    } catch {
      return null;
    }
  };

  // --- SET STORED SELECTION (original line 243-250) ---
  const setStoredSelection = (sel) => {
    try {
      const payload = {
        materialId: sel?.material?.id || null,
        level: sel?.level || null,
        lessonNumber: sel?.lessonNumber || null
      };
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
  };

  return {
    getStoredView,
    setStoredView,
    getStoredSelection,
    setStoredSelection,
  };
};
