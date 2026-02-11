import React, { createContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks';

// Original App.js lines 171-190: Authentication state management
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Authentication state (original lines 171-190)
  const [view, setView] = useState('login');
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

  // Initialize auth from useAuth hook
  const auth = useAuth();

  // Sync auth hook session changes to context state
  useEffect(() => {
    if (auth.session) {
      setLoading(false);
      // Session exists - user is authenticated
    } else {
      setLoading(false);
      // No session - show login
      setView('login');
    }
  }, [auth.session]);

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
