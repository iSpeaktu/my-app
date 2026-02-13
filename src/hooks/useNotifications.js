// Extracted from App.js - Notifications hook (original lines 1260-1280)
import { useEffect } from 'react';
import { supabase } from '../config/supabase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const fetchNotifications = async (userId) => {
  if (!userId) throw new Error('userId required');
  const url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/notifications`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const payload = await res.json();
  if (payload && payload.success) return payload.notifications || [];
  throw new Error(payload?.error || 'Failed to fetch notifications');
};

export const createNotification = async (recipientUserId, type, senderUserId = null, lessonId = null) => {
  if (!recipientUserId || !type) throw new Error('recipientUserId and type required');
  const body = { userId: recipientUserId, type, senderUserId, lessonId };
  const url = `${API_BASE}/api/notifications`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const payload = await res.json();
  if (payload && payload.success) return payload.notification || true;
  throw new Error(payload?.error || 'Failed to create notification');
};

/**
 * useNotifications - Custom hook for polling and managing student notifications
 * Polls Supabase for new notifications every 8 seconds for authenticated students.
 * 
 * @param {Function} setStudentNotifications - State setter for notifications array
 */
export const useNotifications = (setStudentNotifications) => {
  // --- NOTIFICATION POLLING (original lines 1260-1280) ---
  useEffect(() => {
    let active = true;
    let intervalId = null;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      // Skip polling for unauthenticated users or teachers
      if (!user || user.user_metadata?.role === 'teacher') return;

      const refresh = async () => {
        try {
          const latest = await fetchNotifications(user.id);
          if (active) setStudentNotifications(latest || []);
        } catch (err) {
          console.error('Failed to refresh notifications:', err);
        }
      };

      // Initial refresh
      await refresh();
      
      // Poll every 8 seconds
      intervalId = setInterval(refresh, 8000);
    })();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [setStudentNotifications]);
};

/**
 * Helper function to filter notifications by type
 * @param {Array} notifications - Array of notification objects
 * @param {string} type - Type to filter (e.g., 'praise', 'reminder')
 * @returns {Array} Filtered notifications
 */
export const getNotificationsByType = (notifications, type) => {
  return (notifications || []).filter(n => n.type === type);
};

/**
 * Helper function to get the latest notification of a type
 * @param {Array} notifications - Array of notification objects
 * @param {string} type - Type to find (e.g., 'praise', 'reminder')
 * @returns {Object|null} Latest notification or null
 */
export const getLatestNotificationByType = (notifications, type) => {
  const filtered = getNotificationsByType(notifications, type);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};
