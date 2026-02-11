import React, { createContext, useState } from 'react';

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
  const [onboardingData, setOnboardingData] = useState({
    material: null,
    level: null,
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
  const [selection, setSelection] = useState({ 
    material: null, 
    level: null, 
    lessonNumber: null 
  });
  
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
    
    // Current selection
    selection,
    setSelection,
    
    // Quiz state
    quizState,
    setQuizState,
    
    // Settings
    settings,
    setSettings,
  };

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
