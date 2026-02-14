// Extracted from App.js - Streak and activity tracking hook (original lines 523-620)
import { getWeekStartISO } from '../utils/dateUtils';
import { supabase, recordLessonHistory, updateStudentProgress, getStudentProgress, getNotifications, createNotification, deleteNotification } from '../config/supabase';

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

    const target = typeof onboardingData.lessonsPerWeek === 'number' ? onboardingData.lessonsPerWeek : 0;

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

    // Compute XP using first-passing-attempt + retake rules:
    // - If first passing attempt is attempt #1:
    //     perfect (100%) => 15 XP, pass (70-99%) => 10 XP
    // - If first passing attempt is attempt #2 (first retake): 5 XP
    // - If first passing attempt is attempt #3 (second retake): 3 XP
    // - If first passing attempt is attempt #4 or later: 0 XP
    // - If there is no passing attempt (all <70), XP for that lesson is 0
    const attemptsByLesson = {};
    (updatedHistory || []).forEach(h => {
      const lid = h.lessonId;
      if (typeof lid === 'undefined' || lid === null) return;
      attemptsByLesson[lid] = attemptsByLesson[lid] || [];
      attemptsByLesson[lid].push(h);
    });

    let computedXp = 0;
    Object.values(attemptsByLesson).forEach(attempts => {
      // Sort attempts in chronological order (oldest first)
      const ordered = (attempts || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      // Find first passing attempt index (1-based)
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
      if (firstPassingIndex === -1) {
        // No passing attempt -> 0 XP
        return;
      }
      if (firstPassingIndex === 1) {
        if (firstPassingScore === 100) computedXp += 15;
        else computedXp += 10;
      } else if (firstPassingIndex === 2) {
        computedXp += 5;
      } else if (firstPassingIndex === 3) {
        computedXp += 3;
      } else {
        // 4th+ attempt -> no XP
      }
    });

    // Perfect streak tracking: increment when current attempt is perfect, reset otherwise
    const prevPerfectStreak = typeof streakState.perfectStreak === 'number' ? streakState.perfectStreak : 0;
    const perfectStreak = (typeof scorePercent === 'number' && scorePercent === 100) ? (prevPerfectStreak + 1) : 0;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

        if (userId) {
        // Record lesson to database (include track id and level)
        await recordLessonHistory(userId, selection.lessonNumber, scorePercent, passed, failures, selection.material?.id || null, selection.level || null);
        await updateStudentProgress(userId, {
          xp: computedXp,
          weekly_streak: weeklyStreak,
          perfect_streak: perfectStreak,
          current_lesson_track_id: selection.material?.id || null,
          current_level: selection.level || null,
          last_activity_date: passed ? now.toISOString() : undefined
        });

          // Re-fetch student progress from DB to ensure the weekly streak was persisted
          try {
            const studentRow = await getStudentProgress(userId);
            if (studentRow) {
              const next = {};
              if (typeof studentRow.weekly_streak === 'number') next.weeklyStreak = studentRow.weekly_streak;
              if (typeof studentRow.perfect_streak === 'number') next.perfectStreak = studentRow.perfect_streak;
              if (Object.keys(next).length) setStreakState(prev => ({ ...prev, ...next }));
            }
          } catch (err) {
            console.error('Failed to re-fetch student progress after update:', err);
          }

        // Auto-send or clear teacher notification if assigned
        try {
          const studentRow = await getStudentProgress(userId);
          const teacherId = studentRow?.teacher_id || null;
          if (teacherId) {
            const existingNotifications = await getNotifications(userId);
            const lessonKey = String(selection.lessonNumber || '');

            if (passed && typeof scorePercent === 'number' && scorePercent > 70) {
              // If the student passed with >70%, remove any teacher 'reminder' for this lesson
              const reminders = (existingNotifications || []).filter(n => String(n.lesson_id || '') === lessonKey && n.type === 'reminder');
              for (const r of reminders) {
                try {
                  await deleteNotification(userId, r.id);
                } catch (delErr) {
                  console.warn('Failed to delete reminder notification', r.id, delErr);
                }
              }
              // Ensure a 'praise' exists (create if missing)
              const hasPraise = (existingNotifications || []).some(n => String(n.lesson_id || '') === lessonKey && n.type === 'praise');
              if (!hasPraise) {
                await createNotification(userId, 'praise', teacherId, lessonKey);
              }
            } else if (!passed) {
              // Student did not pass: create a reminder if one doesn't already exist
              const hasReminder = (existingNotifications || []).some(n => String(n.lesson_id || '') === lessonKey && n.type === 'reminder');
              if (!alreadyPassed && !hasReminder) {
                await createNotification(userId, 'reminder', teacherId, lessonKey);
              }
            }
          }
        } catch (err) {
          console.error('Failed to auto-send/clear notification:', err);
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
