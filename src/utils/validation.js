// Extracted from App.js - Validation utilities (original lines 1173-1175)

/**
 * Validates email format using regex
 * @param {string} em - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const isValidEmail = (em) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
};
