// Extracted from App.js - Date utilities (original lines 273-279)

/**
 * Gets the start of the current week (Monday) in ISO format
 * @param {Date} date - The date to calculate week start from
 * @returns {string} ISO string of week start (Monday at 00:00:00)
 */
export const getWeekStartISO = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
