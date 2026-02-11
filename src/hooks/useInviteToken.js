// Extracted from App.js - Invite token hook (original lines 1177-1240)
import { useEffect, useState } from 'react';
import { getStudentProgress, getTeacherNameByUserId, supabase } from '../config/supabase';

/**
 * useInviteToken - Custom hook for managing teacher invite tokens
 * Handles URL-based invite tokens, localStorage persistence, and teacher assignment checks.
 * 
 * @param {string} inviteToken - Current invite token state
 * @param {Function} setInviteToken - Setter for invite token
 * @param {Function} setInviteConfirmed - Setter for invite confirmation flag
 * @param {Function} setInviteTeacherName - Setter for teacher name display
 * @param {Function} setHasAssignedTeacher - Setter for teacher assignment status
 * @param {Function} redeemTeacherInvite - Supabase function to redeem invite
 * @param {Function} assignStudentToTeacher - Supabase function to assign student to teacher
 */
export const useInviteToken = (
  inviteToken,
  setInviteToken,
  setInviteConfirmed,
  setInviteTeacherName,
  setHasAssignedTeacher,
  redeemTeacherInvite,
  assignStudentToTeacher
) => {
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
  const getStoredInviteToken = () => inviteToken || localStorage.getItem(INVITE_TOKEN_KEY) || null;
  
  const setStoredInviteToken = (token) => {
    setInviteToken(token);
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

    setInviteTeacherName('');
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const studentRow = await getStudentProgress(userId);
        if (!studentRow) {
          setHasAssignedTeacher(null);
          return;
        }

        // If already has a teacher, clear invite
        if (studentRow?.teacher_id) {
          clearInviteToken();
          clearStoredInviteToken();
          setInviteConfirmed(false);
          setInviteTeacherName('');
          setHasAssignedTeacher(true);
          return;
        }

        setHasAssignedTeacher(false);
      } else {
        setHasAssignedTeacher(false);
      }

      if (!active) return;
      setInviteToken(token);
      setInviteConfirmed(false);
    })();

    return () => { active = false; };
  }, []);

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
