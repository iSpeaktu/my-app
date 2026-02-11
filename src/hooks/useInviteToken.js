// Extracted from App.js - Invite token hook (original lines 1177-1240)
import { useEffect } from 'react';
import { getStudentProgress, getTeacherNameByUserId, redeemTeacherInvite, supabase } from '../config/supabase';
import { useAuthContext } from '../context/AuthContext';

/**
 * useInviteToken - Custom hook for managing teacher invite tokens
 * Handles URL-based invite tokens, localStorage persistence, and teacher assignment checks.
 * Gets state setters from AuthContext internally.
 */
export const useInviteToken = () => {
  const auth = useAuthContext();
  const INVITE_TOKEN_KEY = 'ispeaktu_invite_token';

  // --- GET INVITE TOKEN FROM URL (original lines 1177-1183) ---
  const getInviteToken = () => {
    try {
      return new URLSearchParams(window.location.search).get('invite');
    } catch {
      return null;
    }
  };

  // --- STORED INVITE TOKEN HELPERS (original lines 1185-1195) ---
  const getStoredInviteToken = () => auth.inviteToken || localStorage.getItem(INVITE_TOKEN_KEY) || null;
  
  const setStoredInviteToken = (token) => {
    auth.setInviteToken(token);
    if (token) {
      localStorage.setItem(INVITE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(INVITE_TOKEN_KEY);
    }
  };

  const clearStoredInviteToken = () => setStoredInviteToken(null);

  // --- CLEAR INVITE TOKEN FROM URL (original line 1204 logic) ---
  const clearInviteToken = () => {
    // Remove invite param from URL without reloading
    try {
      if (window.history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (err) {
      console.error('Failed to clear invite token from URL:', err);
    }
  };

  // --- PROCESS INVITE TOKENS ON MOUNT (original lines 1197-1240) ---
  useEffect(() => {
    const urlToken = getInviteToken();
    const storedToken = getStoredInviteToken();
    const token = urlToken || storedToken;
    
    if (!token) return;

    // Persist token so refreshes still allow confirmation, then strip from URL
    if (urlToken) {
      setStoredInviteToken(urlToken);
      clearInviteToken();
    }

    auth.setInviteTeacherName('');
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Resolve teacher user id from token so we can show teacher display name
      try {
        const teacherUserId = await redeemTeacherInvite(token).catch(() => null);
        if (teacherUserId) {
          const teacherName = await getTeacherNameByUserId(teacherUserId).catch(() => null);
          if (teacherName) auth.setInviteTeacherName(teacherName);
        }
      } catch (e) {
        // ignore resolution failure — we'll still allow confirmation UI
      }

      if (userId) {
        const studentRow = await getStudentProgress(userId);
        if (!studentRow) {
          auth.setHasAssignedTeacher(null);
          return;
        }

        // If already has a teacher, clear invite
        if (studentRow?.teacher_id) {
          clearInviteToken();
          clearStoredInviteToken();
          auth.setInviteConfirmed(false);
          auth.setInviteTeacherName('');
          auth.setHasAssignedTeacher(true);
          return;
        }

        auth.setHasAssignedTeacher(false);
      } else {
        auth.setHasAssignedTeacher(false);
      }

      if (!active) return;
      auth.setInviteToken(token);
      auth.setInviteConfirmed(false);
    })();

    return () => { active = false; };
  }, [auth]);

  return {
    getInviteToken,
    getStoredInviteToken,
    setStoredInviteToken,
    clearStoredInviteToken,
    clearInviteToken,
  };
};

/**
 * Helper function to check if an invite token is valid (non-empty string)
 * @param {string} token - Invite token to validate
 * @returns {boolean} True if valid
 */
export const isValidInviteToken = (token) => {
  return typeof token === 'string' && token.length > 0;
};
