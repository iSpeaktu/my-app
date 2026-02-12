// Extracted from App.js - Streak and activity tracking hook (original lines 523-620)
import { getWeekStartISO } from '../utils/dateUtils';
import { supabase, recordLessonHistory, updateStudentProgress, getStudentProgress, getNotifications, createNotification } from '../config/supabase';

/**
 * useStreak - Custom hook for managing weekly streaks and activity tracking
 * Handles streak calculation, weekly goals, and activity recording.
 * 
 * @param {Object} streakState - Current streak state with weeklyStreak, weeklyActivityCount, lastResetDate, completedHistory
 * @param {Function} setStreakState - Setter for streak state
 * @param {Object} onboardingData - Onboarding data with lessonsPerWeek
 * @param {Object} selection - Current selection with material, level, lessonNumber
 * @returns {Object} recordActivity function for logging quiz completion
 */
export const useStreak = (streakState, setStreakState, onboardingData, selection) => {
  // --- RECORD ACTIVITY / CALCULATE STREAK (original lines 523-620) ---
  const recordActivity = async (passed, scorePercent, failures = []) => {
    // Create new history entry with activity details
    const updatedHistory = [
      ...streakState.completedHistory,
      {
        date: new Date().toISOString(),
        lessonId: selection.lessonNumber,
        material: selection.material?.id,
        level: selection.level,
        passed,
        score: scorePercent,
        failures
      }
    ];

    const now = new Date();
    
    // Check if this lesson was already passed before
    const alreadyPassed = streakState.completedHistory.some(h =>
      h.passed &&
      h.lessonId === selection.lessonNumber &&
      h.material === selection.material?.id &&
      h.level === selection.level
    );

    // --- CALCULATE WEEKLY ACTIVITY ---
    const currentWeekStart = new Date(getWeekStartISO(now));
    const lastWeekStart = streakState.lastResetDate ? new Date(streakState.lastResetDate) : currentWeekStart;
    const isSameWeek = lastWeekStart.getTime() === currentWeekStart.getTime();

    const target = onboardingData.lessonsPerWeek || 3;

    // Update weekly activity count
    let weeklyActivityCount = streakState.weeklyActivityCount;
    if (passed && !alreadyPassed) {
      weeklyActivityCount = isSameWeek ? weeklyActivityCount + 1 : 1;
    } else if (!isSameWeek) {
      weeklyActivityCount = 0;
    }

    // --- CALCULATE WEEKLY STREAK ---
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentWeekStart);
    const prevWeekHistory = streakState.completedHistory.filter(h => {
      const d = new Date(h.date);
      return h.passed && d >= prevWeekStart && d < prevWeekEnd;
    });
    const prevWeekMet = prevWeekHistory.length >= target;

    let weeklyStreak = streakState.weeklyStreak;
    const alreadyMetThisWeek = isSameWeek && streakState.weeklyActivityCount >= target;
    if (!isSameWeek) {
      weeklyStreak = prevWeekMet ? weeklyStreak : 0;
    }
    if (passed && weeklyActivityCount >= target && !alreadyMetThisWeek) {
      weeklyStreak = prevWeekMet ? (weeklyStreak + 1) : Math.max(weeklyStreak, 1);
    }

    // Update state with new streak values
    const newState = {
      ...streakState,
      weeklyActivityCount,
      weeklyStreak,
      lastResetDate: currentWeekStart.toISOString(),
      completedHistory: updatedHistory
    };

    setStreakState(newState);

    // Compute XP: 10 points per passed lesson
    const computedXp = updatedHistory.filter(h => h.passed).length * 10;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

        if (userId) {
        // Record lesson to database (include track id and level)
        await recordLessonHistory(userId, selection.lessonNumber, scorePercent, passed, failures, selection.material?.id || null, selection.level || null);
        await updateStudentProgress(userId, {
          xp: computedXp,
          weekly_streak: weeklyStreak,
          current_lesson_track_id: selection.material?.id || null,
          current_level: selection.level || null,
          last_activity_date: passed ? now.toISOString() : undefined
        });

          // Re-fetch student progress from DB to ensure the weekly streak was persisted
          try {
            const studentRow = await getStudentProgress(userId);
            if (studentRow && typeof studentRow.weekly_streak === 'number') {
              setStreakState(prev => ({ ...prev, weeklyStreak: studentRow.weekly_streak }));
            }
          } catch (err) {
            console.error('Failed to re-fetch student progress after update:', err);
          }

        // Auto-send teacher notification if assigned
        if (!alreadyPassed) {
          try {
            const studentRow = await getStudentProgress(userId);
            const teacherId = studentRow?.teacher_id || null;
            if (teacherId) {
              const existingNotifications = await getNotifications(userId);
              const lessonKey = String(selection.lessonNumber || '');
              const hasType = (existingNotifications || []).some(n =>
                String(n.lesson_id || '') === lessonKey && n.type === (passed ? 'praise' : 'reminder')
              );
              if (!hasType) {
                await createNotification(userId, passed ? 'praise' : 'reminder', teacherId, lessonKey);
              }
            }
          } catch (err) {
            console.error('Failed to auto-send notification:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to record activity:', err);
    }
  };

  return {
    recordActivity,
  };
};
