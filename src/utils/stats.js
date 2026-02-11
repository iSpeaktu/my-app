// Extracted from App.js - Statistics and calculation utilities

/**
 * Calculate total XP from completed lessons
 * @param {Array} completedHistory - Array of completed lesson history
 * @returns {number} Total XP (10 XP per passed lesson)
 */
export const calculateTotalXP = (completedHistory) => {
  return completedHistory.filter(h => h.passed).length * 10; // XP Rule: +10 per lesson
};

/**
 * Calculate progress percentage based on activity count
 * @param {number} weeklyActivityCount - Number of activities this week
 * @param {number} weeklyTarget - Target number of activities per week
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgressPercentage = (weeklyActivityCount, weeklyTarget) => {
  return Math.min(100, (weeklyActivityCount / weeklyTarget) * 100);
};

/**
 * Determine if a lesson badge has been achieved
 * @param {number} passedCount - Number of lessons passed
 * @param {number} requiredCount - Required number to achieve badge
 * @returns {boolean} Whether badge is achieved
 */
export const isBadgeAchieved = (passedCount, requiredCount) => {
  return passedCount >= requiredCount;
};
