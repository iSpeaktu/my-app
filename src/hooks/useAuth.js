// Extracted from App.js - Authentication hook (original lines 170-480)
import { useState, useEffect } from 'react';
import { supabase, studentAuthSignIn, studentAuthSignUp, teacherAuthSignIn, teacherAuthSignUp, teacherAuthResetPassword, studentAuthResetPassword, findStudentEmailByUsername, waitForAuthSession, upsertProfile, upsertStudentProfile } from '../config/supabase';
import { getStoredSelection, getStoredView } from '../utils/storage';
import { getWeekStartISO } from '../utils/dateUtils';

/**
 * useAuth - Custom hook for managing authentication state and operations
 * Handles session checking, login/signup form state, loading states, and error handling.
 * 
 * @param {Function} onSessionRestored - Optional callback when session is restored
 * @returns {Object} Auth state and handlers:
 *   - State: loginError, setLoginError, loginNotice, setLoginNotice, loginLoading, setLoginLoading
 *   - Form: email, setEmail, password, setPassword, fullName, setFullName
 *   - Session: loading, setLoading
 */
export const useAuth = (onSessionRestored = () => {}) => {
  // --- AUTH STATE (original lines 175-181) ---
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // --- SESSION CHECK ON MOUNT (original lines 430-480) ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData?.session || null;
        const sessionUser = currentSession?.user || null;
        if (!mounted) return;
        setSession(currentSession);
        const role = sessionUser?.user_metadata?.role || null;
        setUserRole(role);
        if (sessionUser) {
          onSessionRestored({ sessionUser, role, setLoading });
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { subscription } = supabase.auth.onAuthStateChange((event, payload) => {
      const newSession = payload?.session || null;
      const newUser = newSession?.user || null;
      if (!mounted) return;
      // Ignore transient null sessions from non-explicit events. Only treat
      // a null session as a sign-out when Supabase reports the explicit
      // 'SIGNED_OUT' or 'USER_DELETED' events to avoid UI flicker.
      if (newSession === null && event !== 'SIGNED_OUT' && event !== 'USER_DELETED') {
        return;
      }
      setSession(newSession);
      setUserRole(newUser?.user_metadata?.role || null);
      if (!newSession) {
        // signed out
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      try {
        subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, [onSessionRestored]);

  return {
    // Auth error/loading states
    loginError,
    setLoginError,
    loginNotice,
    setLoginNotice,
    loginLoading,
    setLoginLoading,
    // Form inputs
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    // Session state
    loading,
    setLoading,
    session,
    userRole,
  };
};

/**
 * useStudentAuth - Hook for student authentication operations
 * Encapsulates login, signup, password reset handlers with error handling.
 */
export const useStudentAuth = () => {
  // --- STUDENT LOGIN (original lines ~1155-1170) ---
  const handleStudentLogin = async (email, password, onSuccess) => {
    if (!email || !password) {
      return { error: 'Please enter email and password' };
    }
    try {
      const user = await studentAuthSignIn(email.toLowerCase(), password);
      if (onSuccess) {
        onSuccess(user);
      }
      return { success: true, user };
    } catch (error) {
      return { error: error.message || 'Email login failed' };
    }
  };

  // --- STUDENT SIGNUP ---
  const handleStudentSignup = async (fullName, email, password, onSuccess) => {
    if (!fullName || !email || !password) {
      return { error: 'Please enter all fields' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    try {
      const user = await studentAuthSignUp(email.toLowerCase(), password, fullName);
      // Wait briefly for Supabase to establish session after sign-up
      await waitForAuthSession(8000, 300);
      if (onSuccess) {
        onSuccess(user);
      }
      return { success: true, user };
    } catch (error) {
      const message = error.message || 'Signup failed';
      if (message.includes('rate_limit')) {
        return { error: 'Too many signup attempts. Please wait before trying again.' };
      }
      return { error: message };
    }
  };

  // --- PASSWORD RESET ---
  const handleStudentReset = async (emailOrUsername, onSuccess) => {
    if (!emailOrUsername) {
      return { error: 'Please enter email or username' };
    }
    try {
      let resetEmail = emailOrUsername;
      // Check if it's a username (no @) and resolve to email
      if (!emailOrUsername.includes('@')) {
        resetEmail = await findStudentEmailByUsername(emailOrUsername);
        if (!resetEmail) {
          return { error: 'Username not found' };
        }
      }
      await studentAuthResetPassword(resetEmail.toLowerCase());
      if (onSuccess) {
        onSuccess();
      }
      return { success: true };
    } catch (error) {
      return { error: error.message || 'Password reset failed' };
    }
  };

  // --- SIGN OUT ---
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      return { error: error.message || 'Sign out failed' };
    }
  };

  return {
    handleStudentLogin,
    handleStudentSignup,
    handleStudentReset,
    handleSignOut,
  };
};

/**
 * useTeacherAuth - Hook for teacher authentication operations
 */
export const useTeacherAuth = () => {
  // --- TEACHER LOGIN ---
  const handleTeacherLogin = async (email, password, onSuccess) => {
    if (!email || !password) {
      return { error: 'Please enter email and password' };
    }
    try {
      const user = await teacherAuthSignIn(email.toLowerCase(), password);
      if (onSuccess) {
        onSuccess(user);
      }
      return { success: true, user };
    } catch (error) {
      return { error: error.message || 'Teacher login failed' };
    }
  };

  // --- TEACHER SIGNUP ---
  const handleTeacherSignup = async (fullName, email, password, onSuccess) => {
    if (!fullName || !email || !password) {
      return { error: 'Please enter all fields' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    try {
      const user = await teacherAuthSignUp(email.toLowerCase(), password, fullName);
      await waitForAuthSession(8000, 300);
      if (onSuccess) {
        onSuccess(user);
      }
      return { success: true, user };
    } catch (error) {
      return { error: error.message || 'Teacher signup failed' };
    }
  };

  return {
    handleTeacherLogin,
    handleTeacherSignup,
  };
};

/**
 * usePersistentAuth - Hook for session persistence and data loading
 * Handles data restoration from database after successful authentication.
 */
export const usePersistentAuth = () => {
  const persistData = async (userId, updates, options = {}) => {
    const { throwOnError = false } = options;
    if (!userId) {
      console.warn('No authenticated user - skipping persistence');
      return { success: false, error: 'No userId' };
    }

    const profileUpdates = {};
    if (updates.userName) profileUpdates.username = updates.userName;
    if (updates.displayName) profileUpdates.full_name = updates.displayName;
    if (updates.role) profileUpdates.role = updates.role;
    // Optional: application-level settings/preferences stored as JSON
    // Expected schema: profiles.settings should be a JSON/JSONB column.
    // Example: { theme: 'dark', notifications: { email: true }, editor: { compact: false } }
    if (updates.settings) profileUpdates.settings = updates.settings;

    const studentUpdates = {};
    if (updates.onboardingData) {
      studentUpdates.current_material_id = updates.onboardingData.material?.id || null;
      studentUpdates.current_level = updates.onboardingData.level || null;
      if (typeof updates.onboardingData.lessonsPerWeek === 'number') {
        studentUpdates.lessons_per_week = updates.onboardingData.lessonsPerWeek;
      }
    }
    if (updates.streakState) {
      studentUpdates.weekly_streak = updates.streakState.weeklyStreak || 0;
    }
    if (typeof updates.xp === 'number') {
      studentUpdates.xp = updates.xp;
    }

    try {
      const ops = [];
      if (Object.keys(profileUpdates).length > 0) {
        ops.push(upsertProfile(userId, profileUpdates));
      }
      if (Object.keys(studentUpdates).length > 0) {
        ops.push(upsertStudentProfile(userId, studentUpdates));
      }
      if (ops.length > 0) await Promise.all(ops);
      return { success: true };
    } catch (err) {
      console.error('Failed to persist data to Supabase:', err);
      const payload = { success: false, error: err?.message || String(err) };
      if (throwOnError) throw err;
      return payload;
    }
  };

  const restoreSession = async (sessionUser) => {
    // Logic to restore user state from database
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        return { error: 'No authenticated user' };
      }

      return { success: true, userId };
    } catch (err) {
      console.error('Failed to restore session:', err);
      return { error: err.message };
    }
  };

  return {
    persistData,
    restoreSession,
  };
};
