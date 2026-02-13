// Extracted from App.js - localStorage utilities (original lines 209-260, 1177-1185)
// NOTE: Removed MATERIALS_DATA dependency - storage functions now return IDs only.

const VIEW_STORAGE_KEY = 'ispeaktu_last_view';
const SELECTION_STORAGE_KEY = 'ispeaktu_last_selection';
const INVITE_TOKEN_KEY = 'ispeaktu_invite_token';

/**
 * Get the last view from localStorage
 * @returns {string|null} Last view name or null
 */
export const getStoredView = () => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Save the current view to localStorage
 * @param {string} viewName - Name of the view to save
 */
export const setStoredView = (viewName) => {
  try {
    if (viewName) localStorage.setItem(VIEW_STORAGE_KEY, viewName);
    else localStorage.removeItem(VIEW_STORAGE_KEY);
  } catch {
    return;
  }
};

/**
 * Get the last selection (material/level/lesson) from localStorage
 * @returns {Object|null} Selection object or null
 */
export const getStoredSelection = () => {
  try {
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      material: parsed?.materialId || null,
      level: parsed?.level || null,
      lessonNumber: parsed?.lessonNumber || null
    };
  } catch {
    return null;
  }
};

/**
 * Save the current selection to localStorage
 * @param {Object} sel - Selection object with material, level, lessonNumber
 */
export const setStoredSelection = (sel) => {
  try {
    const materialVal = sel?.material;
    const materialId = materialVal && typeof materialVal === 'object' ? materialVal.id : (typeof materialVal === 'number' || typeof materialVal === 'string' ? materialVal : null);
    const payload = {
      materialId: materialId || null,
      level: sel?.level || null,
      lessonNumber: sel?.lessonNumber || null
    };
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
};

/**
 * Get the invite token from URL search params
 * @returns {string|null} Invite token or null
 */
export const getInviteToken = () => {
  try {
    return new URLSearchParams(window.location.search).get('invite');
  } catch {
    return null;
  }
};

/**
 * Get stored invite token from localStorage
 * @returns {string|null} Stored invite token or null
 */
export const getStoredInviteToken = () => {
  try {
    return localStorage.getItem(INVITE_TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Set invite token in localStorage
 * @param {string} token - Invite token to save
 */
export const setStoredInviteToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(INVITE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(INVITE_TOKEN_KEY);
    }
  } catch {
    return;
  }
};

/**
 * Clear the stored invite token
 */
export const clearStoredInviteToken = () => {
  setStoredInviteToken(null);
};

/**
 * Remove invite token from URL query params
 */
export const clearInviteToken = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // no-op
  }
};

/**
 * Rehydrate onboarding data with full material object
 * @param {Object} data - Onboarding data
 * @returns {Object} Rehydrated onboarding data
 */
export const rehydrateOnboardingData = (data) => {
  // No in-memory MATERIALS_DATA resolution available; return data as-is.
  return data;
};
