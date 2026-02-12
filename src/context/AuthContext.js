import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks';
import { supabase } from '../config/supabase';
import { getStoredView, setStoredView } from '../utils/storage';

// Original App.js lines 171-190: Authentication state management
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Authentication state (original lines 171-190)
  const [view, _setView] = useState('login');
  const [userName, setUserName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteTeacherName, setInviteTeacherName] = useState('');
  const [studentTeacherName, setStudentTeacherName] = useState('');
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteConfirmed, setInviteConfirmed] = useState(false);
  const [hasAssignedTeacher, setHasAssignedTeacher] = useState(null);
  // Whether the lower-level Supabase auth state is still being resolved
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize auth from useAuth hook and restore session into context
  const handleSessionRestored = useCallback(({ sessionUser, role, setLoading }) => {
    if (sessionUser) {
      const rawDisplayName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.display_name || sessionUser.user_metadata?.username || (sessionUser.email || '').split('@')[0] || '';
      const normalized = (rawDisplayName || '').toLowerCase();
      setUserName(normalized);
      setDisplayName(rawDisplayName || normalized);
      // Prefer restoring a previously stored view, otherwise fall back to role defaults
      try {
        const stored = getStoredView();
        if (stored) _setView(stored);
        else _setView(role === 'teacher' ? 'tutor_dashboard' : 'dashboard');
      } catch (e) {
        _setView(role === 'teacher' ? 'tutor_dashboard' : 'dashboard');
      }
    }
    // Ensure both the lower-level hook and this provider know loading is complete
    if (typeof setLoading === 'function') setLoading(false);
    try { setAuthLoading(false); } catch (e) {}
  }, []);

  const auth = useAuth(handleSessionRestored);

  // Ensure we check Supabase immediately on mount and subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session || null;
        // We don't directly mutate the auth hook's state here; the hook will
        // reconcile with Supabase via its own getSession/onAuthStateChange.
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    init();

    const { subscription } = supabase.auth.onAuthStateChange((event, payload) => {
      if (!mounted) return;
      // Any auth state change means the initial auth check is complete
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      try { subscription?.unsubscribe?.(); } catch (e) {}
    };
  }, []);

  // On mount, restore last view if present (do not override explicit session-based defaults)
  useEffect(() => {
    try {
      const stored = getStoredView();
      const allowedViews = new Set(['login','signup','tutor_login','tutor_signup','reset','ob_screen1','ob_screen2','ob_screen3','dashboard','progress','select_level','select_lesson','quiz','results','settings','tutor_dashboard']);
      if (stored && typeof stored === 'string' && allowedViews.has(stored)) {
        // Only set if we are still on the initial default view
        _setView(prev => (prev === 'login' ? stored : prev));
      }
    } catch (e) {}
  }, []);

  // Sync auth hook session changes to context state
  const prevSessionRef = useRef();
  const signOutTimerRef = useRef(null);
  useEffect(() => {
    // Wait until the lower-level auth hook has finished its initial loading
    // to avoid showing the login screen briefly while the session is being
    // restored on page refresh.
    if (auth.loading) return;

    const prev = prevSessionRef.current;
    if (auth.session) {
      setLoading(false);
      // If a sign-out debounce timer was running, cancel it because session returned
      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
        signOutTimerRef.current = null;
      }
      // Session exists - user is authenticated
    } else {
      setLoading(false);
      // Only force showing the login screen when the session transitioned
      // from a valid session to null (i.e. an actual sign-out). This avoids
      // transient null values from the auth subscription temporarily
      // overwriting the user's current view.
      // Use a longer debounce and ensure we only start one timer so
      // rapid subscription flaps don't flip the UI.
      if (prevSessionRef.current != null && !signOutTimerRef.current) {
        signOutTimerRef.current = setTimeout(() => {
          _setView('login');
          signOutTimerRef.current = null;
        }, 1500);
      }
    }
    prevSessionRef.current = auth.session;
  }, [auth.session, auth.loading]);

  // Debug: log view and session changes to trace unexpected resets
  useEffect(() => {
    try {
      console.log('AuthContext: view changed ->', view);
      console.log('AuthContext: auth.session ->', auth.session);
    } catch (e) {}
  }, [view, auth.session]);

  // Normalize any invalid view values (defensive guard against transient undefined values)
  useEffect(() => {
    try {
      const allowedViews = new Set(['login','signup','tutor_login','tutor_signup','reset','ob_screen1','ob_screen2','ob_screen3','dashboard','progress','select_level','select_lesson','quiz','results','settings','tutor_dashboard']);
      if (typeof view !== 'string' || !allowedViews.has(view)) {
        // If the view is invalid/undefined, pick a safe default based on session
        const safe = auth.session ? (auth.userRole === 'teacher' ? 'tutor_dashboard' : 'dashboard') : 'login';
        console.warn('AuthContext: normalizing invalid view ->', view, '=>', safe);
        _setView(safe);
      }
    } catch (e) {
      console.error('Failed to normalize view', e);
    }
  }, [view, auth.session, auth.userRole]);

  // Provide a stable, safe setView wrapper so consumers always get a callable function
  const setView = useCallback((next) => {
    try {
      const allowedViews = new Set(['login','signup','tutor_login','tutor_signup','reset','ob_screen1','ob_screen2','ob_screen3','dashboard','progress','select_level','select_lesson','quiz','results','settings','tutor_dashboard']);
      if (typeof next === 'string' && allowedViews.has(next)) {
        if (typeof _setView === 'function') _setView(next);
        else console.warn('Attempted to call setView but internal setter is not a function');
      } else {
        console.warn('Ignored invalid view passed to setView:', next);
      }
    } catch (e) {
      console.error('setView wrapper error', e);
    }
  }, [_setView]);

  // Persist view changes to localStorage so reloads restore the same view
  useEffect(() => {
    try {
      const allowedViews = new Set(['login','signup','tutor_login','tutor_signup','reset','ob_screen1','ob_screen2','ob_screen3','dashboard','progress','select_level','select_lesson','quiz','results','settings','tutor_dashboard']);
      if (typeof view === 'string' && allowedViews.has(view)) setStoredView(view);
    } catch (e) {}
  }, [view]);

  const value = {
    // View management
    view,
    setView,
    
    // User profile
    userName,
    setUserName,
    displayName,
    setDisplayName,
    fullName,
    setFullName,
    
    // Authentication state
    loading,
    setLoading,
    loginError,
    setLoginError,
    loginNotice,
    setLoginNotice,
    loginLoading,
    setLoginLoading,
    
    // Credentials (for login/signup forms)
    email,
    setEmail,
    password,
    setPassword,
    
    // Invite/Teacher relationship
    inviteTeacherName,
    setInviteTeacherName,
    studentTeacherName,
    setStudentTeacherName,
    inviteToken,
    setInviteToken,
    inviteConfirmed,
    setInviteConfirmed,
    hasAssignedTeacher,
    setHasAssignedTeacher,
    
    // Auth hook data
    session: auth.session,
    userRole: auth.userRole,
    // Lower-level Supabase auth loading guard
    authLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for consuming auth context
export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
