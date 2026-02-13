// Extracted from App.js - Statistics and calculation utilities

/**
 * Calculate total XP from completed lessons
 * @param {Array} completedHistory - Array of completed lesson history
 * @returns {number} Total XP (15 XP for perfect, 10 XP for pass)
 */
export const calculateTotalXP = (completedHistory) => {
  try {
    // Build attempts grouped by lessonId
    const attemptsByLesson = {};
    (completedHistory || []).forEach(h => {
      const lid = h.lessonId || h.lessonId === 0 ? h.lessonId : (h.lessonId === undefined ? null : h.lessonId);
      if (typeof lid === 'undefined' || lid === null) return;
      attemptsByLesson[lid] = attemptsByLesson[lid] || [];
      attemptsByLesson[lid].push(h);
    });

    let total = 0;
    Object.values(attemptsByLesson).forEach(attempts => {
      const ordered = (attempts || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      let firstPassingIndex = -1;
      let firstPassingScore = null;
      for (let i = 0; i < ordered.length; i++) {
        const s = typeof ordered[i].score === 'number' ? ordered[i].score : -1;
        if (s >= 70) {
          firstPassingIndex = i + 1;
          firstPassingScore = s;
          break;
        }
      }
      if (firstPassingIndex === -1) return; // no XP for this lesson
      if (firstPassingIndex === 1) {
        total += (firstPassingScore === 100) ? 15 : 10;
      } else if (firstPassingIndex === 2) {
        total += 5;
      } else if (firstPassingIndex === 3) {
        total += 3;
      } else {
        // 4th+ => 0
      }
    });
    return total;
  } catch (e) {
    return 0;
  }
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
