import React, { createContext, useState, useEffect, useRef } from 'react';
import { useAuthContext } from './AuthContext';
import { getStoredSelection, setStoredSelection } from '../utils/storage';
import { updateStudentData } from '../config/supabase';
import { useStudentData } from '../hooks/useStudentData';
import { useStreak } from '../hooks/useStreak';

// Original App.js lines 188-208: User profile, progress, and settings state
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // User notifications and achievements (original lines 188-189)
  const [studentNotifications, setStudentNotifications] = useState([]);
  const [studentAchievements, setStudentAchievements] = useState([]);
  
  // User avatar (original lines 190-191)
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  // Onboarding progress (original lines 193-197)
  const storedSelection = getStoredSelection();
  const [onboardingData, setOnboardingData] = useState({
    material: storedSelection?.material || null,
    level: storedSelection?.level || null,
    lessonsPerWeek: 3
  });

  // Weekly streak and activity tracking (original lines 199-205)
  const [streakState, setStreakState] = useState({
    weeklyStreak: 0,
    weeklyActivityCount: 0,
    lastResetDate: new Date().toISOString(),
    completedHistory: [] 
  });

  // Current lesson selection (original line 206)
  const [selection, setSelection] = useState(storedSelection || { 
    material: null, 
    level: null, 
    lessonNumber: null 
  });

  const auth = useAuthContext();

  // Initialization guard: true while we are restoring onboarding/selection
  // from the database so we don't accidentally persist back during that step.
  const initRef = useRef(false);
  const [hasInitializedOnboarding, setHasInitializedOnboarding] = useState(false);
  // Initialize useStreak hook to get recordActivity for quiz completion
  const { recordActivity } = useStreak(streakState, setStreakState, onboardingData, selection);

  // Attempt to restore onboarding/selection from the database when a session
  // becomes available. We call the shared loader to read current material/level
  // and then update the UserContext state so the UI reflects persisted values.
  const { loadStudentData } = useStudentData();
  useEffect(() => {
    let mounted = true;
    if (auth && auth.session && auth.session.user) {
      (async () => {
        try {
          // Mark initialization in-progress so setter wrappers avoid persisting
          initRef.current = true;

          const { material, level, teacherName, hasAssignedTeacher, lessonsPerWeek, streakState: restoredStreakState, notifications: restoredNotifications, achievements: restoredAchievements } = await loadStudentData(
            auth.session.user,
            auth.userName,
            auth.setUserName,
            auth.displayName,
            auth.setDisplayName
          );
          if (!mounted) return;
          if (material || level || lessonsPerWeek) {
            setOnboardingData(prev => ({ ...prev, material: material || prev.material, level: level || prev.level, lessonsPerWeek: lessonsPerWeek || prev.lessonsPerWeek }));
            try { setSelectionWrapped({ material, level, lessonNumber: null }); } catch (e) {}
          }
          if (restoredStreakState) {
            setStreakState(restoredStreakState);
          }
          if (restoredNotifications) {
            setStudentNotifications(restoredNotifications);
          }
          if (restoredAchievements) {
            setStudentAchievements(restoredAchievements);
          }
          try { if (teacherName) auth.setStudentTeacherName(teacherName); } catch (e) {}
          try { auth.setHasAssignedTeacher(typeof hasAssignedTeacher === 'boolean' ? hasAssignedTeacher : !!teacherName); } catch (e) {}
        } catch (e) {
          console.warn('Failed to restore student data on session restore', e);
        } finally {
          // Initialization complete — allow subsequent updates to persist
          initRef.current = false;
          if (mounted) setHasInitializedOnboarding(true);
        }
      })();
    }
    return () => { mounted = false; };
  }, [auth?.session?.user]);

  // Wrapped setter that persists selected track/level to Supabase when available
  const setSelectionWrapped = async (next) => {
    let resolvedValue = null;
    setSelection(prev => {
      resolvedValue = typeof next === 'function' ? next(prev) : next;
      return resolvedValue;
    });

    // Persist locally immediately so cache is ready for next reload
    try {
      if (resolvedValue) {
        setStoredSelection(resolvedValue);
      }
    } catch (e) {
      // ignore localStorage failures
    }

    try {
      const matId = resolvedValue?.material?.id || null;
      const lvl = resolvedValue?.level || null;
      const studentIdOrName = auth?.session?.user?.id || (auth?.userName || '').toLowerCase();

      // If we are still initializing from the DB, do not persist — this
      // prevents the initial rehydration from immediately writing back
      // (possibly overwriting valid DB values with local defaults).
      if (initRef.current) {
        return;
      }

      if (studentIdOrName) {
        // Build updates only with non-null values to avoid writing nulls
        const updates = {};
        if (matId !== null && typeof matId !== 'undefined') updates.current_lesson_track_id = matId;
        if (lvl !== null && typeof lvl !== 'undefined') updates.current_level = lvl;
        if (Object.keys(updates).length > 0) {
          // Fire-and-forget persistence; updateStudentData accepts an id or username
          updateStudentData(studentIdOrName, updates).catch(e => console.warn('Persist selection failed', e));
        }
      } else {
        // No authenticated identifier yet; skip persistence silently
      }
    } catch (e) {
      console.warn('setSelectionWrapped persistence error', e);
    }
  };

  // Cache onboardingData locally after initialization to keep a cache-first strategy
  useEffect(() => {
    try {
      if (onboardingData && !initRef.current) {
        localStorage.setItem('user_onboarding', JSON.stringify(onboardingData));
      }
    } catch (e) {}
  }, [onboardingData]);

  // Ensure we persist the resolved onboarding selection into the shared selection key
  // once initial onboarding restoration has completed. This guarantees the dashboard
  // can read the stored selection immediately after login/refresh.
  useEffect(() => {
    try {
      if (hasInitializedOnboarding && onboardingData && onboardingData.material) {
        setStoredSelection({ material: onboardingData.material, level: onboardingData.level, lessonNumber: null });
      }
    } catch (e) {}
  }, [hasInitializedOnboarding, onboardingData]);
  
  // Quiz state tracking (original line 207)
  const [quizState, setQuizState] = useState({ 
    currentQuestionIndex: 0, 
    isAnswered: false, 
    selectedOption: null, 
    score: 0, 
    history: [] 
  });
  
  // User settings preferences (original line 208)
  const [settings, setSettings] = useState({ 
    sound: true, 
    notifications: true, 
    darkMode: true 
  });

  const value = {
    // Notifications and achievements
    studentNotifications,
    setStudentNotifications,
    studentAchievements,
    setStudentAchievements,
    
    // Avatar
    avatarUrl,
    setAvatarUrl,
    avatarLoading,
    setAvatarLoading,
    
    // Onboarding
    onboardingData,
    setOnboardingData,
    
    // Streak and activity
    streakState,
    setStreakState,
    recordActivity,
    
    // Current selection
    selection,
    setSelection: setSelectionWrapped,
    // Initialization flag exported so UI can guard until restore finishes
    hasInitializedOnboarding,
    
    // Quiz state
    quizState,
    setQuizState,
    
    // Settings
    settings,
    setSettings,
  };

  // When an auth session is restored (page refresh), reset transient student state
  // so users are not locked out but volatile UI state is cleared.
  useEffect(() => {
    if (auth && auth.session) {
      // Keep existing selection/onboarding until data loader restores it.
      // Do NOT overwrite `selection` here to avoid clobbering values
      // while async restoration from Supabase is still in progress.
      // Reset quiz state
      setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
      // Clear transient notifications
      setStudentNotifications([]);
    }
  }, [auth?.session]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for consuming user context
export const useUserContext = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
