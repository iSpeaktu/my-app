// Extracted from App.js - Notifications hook (original lines 1260-1280)
import { useEffect } from 'react';
import { getNotifications, supabase } from '../config/supabase';

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
          const latest = await getNotifications(user.id);
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
