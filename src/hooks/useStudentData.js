// Extracted from App.js - Student data and progress hook (original lines 187-430)
import { useState, useEffect } from 'react';
import { getProfile, getStudentProgress, getStudentLessonHistory, getNotifications, getAchievements, upsertProfile, updateStudentProgress, cleanupLessonHistoryLatest, getTeacherNameByUserId, supabase } from '../config/supabase';
import { getStoredInviteToken, clearInviteToken, clearStoredInviteToken, getWeekStartISO } from '../utils/storage';
import { getWeekStartISO as calculateWeekStart } from '../utils/dateUtils';

/**
 * useStudentData - Custom hook for managing student profile, progress, and achievements
 * Handles loading student data from database, calculating streaks, and managing notifications.
 * 
 * @returns {Object} Student data state and setters:
 *   - studentAchievements, setStudentAchievements
 *   - onboardingData, setOnboardingData
 *   - streakState, setStreakState
 *   - studentTeacherName, setStudentTeacherName
 *   - studentNotifications, setStudentNotifications
 *   - hasAssignedTeacher, setHasAssignedTeacher
 *   - avatarUrl, setAvatarUrl
 *   - loadStudentData (async function)
 */
export const useStudentData = (view, selection) => {
  // --- STATE INITIALIZATION (original lines 187-201) ---
  const [studentAchievements, setStudentAchievements] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  const [onboardingData, setOnboardingData] = useState({
    material: null,
    level: null,
    lessonsPerWeek: null
  });

  const [streakState, setStreakState] = useState({
    weeklyStreak: 0,
    weeklyActivityCount: 0,
    lastResetDate: new Date().toISOString(),
    completedHistory: [] 
  });

  const [studentTeacherName, setStudentTeacherName] = useState('');
  const [studentNotifications, setStudentNotifications] = useState([]);
  const [hasAssignedTeacher, setHasAssignedTeacher] = useState(null);

  // --- PERSIST VIEW AND SELECTION (original lines 265-274) ---
  useEffect(() => {
    const VIEW_STORAGE_KEY = 'ispeaktu_last_view';
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    const SELECTION_STORAGE_KEY = 'ispeaktu_last_selection';
    // Only persist when a selection value is explicitly provided to this hook.
    // When the hook is used without a `selection` argument (undefined),
    // avoid clobbering an existing stored selection (e.g. during app init).
    if (typeof selection !== 'undefined') {
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection || {}));
    }
  }, [selection]);

  // --- REHYDRATE ONBOARDING DATA (original lines 256-262) ---
  const rehydrateOnboardingData = (data) => {
    // No embedded MATERIALS_DATA resolution; return data as-is.
    return data;
  };

  // --- LOAD STUDENT DATA FROM DATABASE (original lines 281-430) ---
  const loadStudentData = async (sessionUser, userName, setUserName, displayName, setDisplayName) => {
    const userId = sessionUser?.id;
    if (!userId) return { material: null, level: null };
    const cleanupKey = `ispeaktu_history_cleanup_${userId}`;

    const [profile, student, history, notifications, achievements] = await Promise.all([
      getProfile(userId),
      getStudentProgress(userId),
      getStudentLessonHistory(userId),
      getNotifications(userId),
      getAchievements(userId)
    ]);
    const hasStudent = !!student;
    const hasProfile = !!profile;

    // --- NORMALIZE USERNAME ---
    const rawDisplayName =
      profile?.display_name ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.display_name ||
      profile?.username ||
      sessionUser.user_metadata?.username ||
      (sessionUser.email || '').split('@')[0] ||
      '';
    const normalized = (rawDisplayName || '').toLowerCase();

    setUserName(normalized);
    setDisplayName(rawDisplayName || normalized);

    // --- ENSURE PROFILE ROW EXISTS ---
    if (!profile) {
      try {
        await upsertProfile(userId, {
          username: normalized || null,
          display_name: sessionUser.user_metadata?.full_name || null,
          role: sessionUser.user_metadata?.role || 'student'
        });
      } catch (err) {
        console.error('Failed to create profile row:', err);
      }
    }
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }

    // --- ENSURE STUDENT ROW EXISTS ---
    if (!student) {
      try {
        await supabase
          .from('students')
          .upsert([{ id: userId, display_name: rawDisplayName || null }], { onConflict: 'id', returning: 'minimal' });
      } catch (err) {
        console.error('Failed to create student row:', err);
      }
    }

    // --- RESOLVE MATERIAL AND LEVEL FROM DATABASE ---
    const rawMaterialId = student?.current_lesson_track_id || null;
    // Prefer DB-sourced onboarding: expose the raw material id so the UI
    // can resolve it against the client-side `materials` list.
    const materialFromDb = rawMaterialId || null;
    const levelFromDb = student?.current_level || null;
    const material = materialFromDb || onboardingData.material || null;
    const level = levelFromDb || onboardingData.level || null;
    const nextOnboarding = {
      material,
      level,
      lessonsPerWeek: (typeof student?.lessons_per_week === 'number')
        ? student.lessons_per_week
        : (typeof onboardingData.lessonsPerWeek === 'number' ? onboardingData.lessonsPerWeek : null)
    };
    setOnboardingData(nextOnboarding);

    // --- TRANSFORM AND CALCULATE COMPLETED HISTORY ---
    const completedHistory = (history || []).map(h => ({
      date: h.created_at || new Date().toISOString(),
      lessonId: h.lesson_id,
      material: material?.id || null,
      level: level || null,
      passed: !!h.passed,
      score: typeof h.score === 'number' ? h.score : 0,
      failures: h.failures || []
    }));

    // Determine the student's last attempted lesson (if any) so we can
    // return it to the caller for UI rehydration (do not persist here).
    const lastLessonFromHistory = (completedHistory && completedHistory.length > 0)
      ? completedHistory[completedHistory.length - 1].lessonId
      : null;

    // --- CALCULATE WEEKLY STREAK AND ACTIVITY ---
    const now = new Date();
    const currentWeekStart = new Date(calculateWeekStart(now));
    const currentWeekHistory = completedHistory.filter(h => h.passed && new Date(h.date) >= currentWeekStart);
    const weeklyActivityCount = currentWeekHistory.length;
    const storedStreak = typeof student?.weekly_streak === 'number' ? student.weekly_streak : 0;
    const lastActivityDate = student?.last_activity_date || completedHistory[0]?.date || now.toISOString();
    const lastWeekStart = new Date(calculateWeekStart(lastActivityDate));
    const isSameWeek = lastWeekStart.getTime() === currentWeekStart.getTime();

    const target = (typeof student?.lessons_per_week === 'number')
      ? student.lessons_per_week
      : (typeof onboardingData.lessonsPerWeek === 'number' ? onboardingData.lessonsPerWeek : 0);
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentWeekStart);
    const prevWeekHistory = completedHistory.filter(h => {
      const d = new Date(h.date);
      return h.passed && d >= prevWeekStart && d < prevWeekEnd;
    });
    const prevWeekMet = prevWeekHistory.length >= target;
    const weeklyStreak = isSameWeek ? storedStreak : (prevWeekMet ? storedStreak : 0);

    // Include persisted XP and perfect streak if available on the student row
    const xpFromStudent = typeof student?.xp === 'number' ? student.xp : 0;
    const perfectFromStudent = typeof student?.perfect_streak === 'number' ? student.perfect_streak : 0;

    setStreakState({
      weeklyStreak,
      weeklyActivityCount,
      lastResetDate: currentWeekStart.toISOString(),
      completedHistory,
      xp: xpFromStudent,
      perfectStreak: perfectFromStudent
    });

    // --- SYNC WEEKLY STREAK TO DATABASE IF CHANGED ---
    if (!isSameWeek && storedStreak !== weeklyStreak) {
      try {
        await updateStudentProgress(userId, { weekly_streak: weeklyStreak });
      } catch (err) {
        console.error('Failed to sync weekly streak on load:', err);
      }
    }

    // --- SET NOTIFICATIONS AND ACHIEVEMENTS ---
    setStudentNotifications(notifications || []);
    setStudentAchievements(achievements || []);

    // --- CLEANUP REDUNDANT LESSON HISTORY ONCE ---
    if (!localStorage.getItem(cleanupKey)) {
      try {
        const cleaned = await cleanupLessonHistoryLatest(userId);
        if (cleaned) localStorage.setItem(cleanupKey, 'done');
      } catch (err) {
        console.error('Failed to cleanup lesson history:', err);
      }
    }

    // --- LOAD TEACHER INFO IF ASSIGNED ---
    let teacherNameLocal = null;
    let hasAssignedTeacherLocal = false;
    if (student?.teacher_id) {
      hasAssignedTeacherLocal = true;
      setHasAssignedTeacher(true);
      teacherNameLocal = await getTeacherNameByUserId(student.teacher_id);
      if (teacherNameLocal) setStudentTeacherName(teacherNameLocal);
      // Clear invite token if teacher already assigned
      if (getStoredInviteToken()) {
        clearInviteToken();
        clearStoredInviteToken();
      }
    } else {
      hasAssignedTeacherLocal = false;
      setHasAssignedTeacher(false);
    }

    return { material, level, hasStudent, hasProfile, teacherName: teacherNameLocal, hasAssignedTeacher: hasAssignedTeacherLocal, lessonsPerWeek: nextOnboarding.lessonsPerWeek, lastLesson: lastLessonFromHistory, streakState: { weeklyStreak, weeklyActivityCount, lastResetDate: currentWeekStart.toISOString(), completedHistory, xp: xpFromStudent, perfectStreak: perfectFromStudent }, notifications: notifications || [], achievements: achievements || [] };
  };

  return {
    // Data state
    studentAchievements,
    setStudentAchievements,
    onboardingData,
    setOnboardingData,
    streakState,
    setStreakState,
    studentTeacherName,
    setStudentTeacherName,
    studentNotifications,
    setStudentNotifications,
    hasAssignedTeacher,
    setHasAssignedTeacher,
    avatarUrl,
    setAvatarUrl,
    avatarLoading,
    setAvatarLoading,
    // Utilities
    rehydrateOnboardingData,
    loadStudentData,
  };
};
