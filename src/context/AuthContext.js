import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks';

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

  // Initialize auth from useAuth hook and restore session into context
  const handleSessionRestored = useCallback(({ sessionUser, role, setLoading: setAuthLoading }) => {
    if (sessionUser) {
      const rawDisplayName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.display_name || sessionUser.user_metadata?.username || (sessionUser.email || '').split('@')[0] || '';
      const normalized = (rawDisplayName || '').toLowerCase();
      setUserName(normalized);
      setDisplayName(rawDisplayName || normalized);
      // If teacher -> go to tutor dashboard, otherwise student dashboard
      _setView(role === 'teacher' ? 'tutor_dashboard' : 'dashboard');
    }
    // Ensure auth hook loading state is synced
    if (typeof setAuthLoading === 'function') setAuthLoading(false);
  }, []);

  const auth = useAuth(handleSessionRestored);

  // Sync auth hook session changes to context state
  const prevSessionRef = useRef();
  const signOutTimerRef = useRef(null);
  useEffect(() => {
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
  }, [auth.session]);

  // Debug: log view and session changes to trace unexpected resets
  useEffect(() => {
    try {
      console.log('AuthContext: view changed ->', view);
      console.log('AuthContext: auth.session ->', auth.session);
    } catch (e) {}
  }, [view, auth.session]);

  // Provide a stable, safe setView wrapper so consumers always get a callable function
  const setView = useCallback((next) => {
    try {
      if (typeof _setView === 'function') _setView(next);
      else console.warn('Attempted to call setView but internal setter is not a function');
    } catch (e) {
      console.error('setView wrapper error', e);
    }
  }, [_setView]);

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
