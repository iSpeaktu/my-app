import React from 'react';

// --- CONTEXT IMPORTS ---
// Original App.js lines 171-208: Auth and user state management
import { AuthProvider, useAuthContext } from './context';
import { UserProvider, useUserContext } from './context';

// --- HOOKS IMPORTS ---
// Original App.js lines 170-480: Custom authentication and data loading hooks
import { useAuth, useStudentAuth, useTeacherAuth, usePersistentAuth } from './hooks';
// Original App.js lines 187-430: Student data loading and sync
import { useStudentData } from './hooks';
// Original App.js lines 2106-2184: Lesson content and quiz data
import { useLessonContent } from './hooks';
// Original App.js lines 207-255: localStorage persistence helpers
import { useLocalStorage, getStoredView, setStoredView, getStoredSelection, setStoredSelection } from './hooks';
// Original App.js lines 523-620: Weekly streak and activity tracking
import { useStreak, recordActivity } from './hooks';
// Original App.js lines 1260-1280: Notification polling
import { useNotifications, getNotificationsByType, getLatestNotificationByType } from './hooks';
// Original App.js lines 1177-1240: Invite token handling
import { useInviteToken, isValidInviteToken } from './hooks';

// --- AUTH COMPONENT IMPORTS ---
// Original App.js lines 1373-1501: Student login view
import { LoginView } from './components/Auth';
// Original App.js lines 1502-1568: Teacher login view (TBD: needs extraction)
// import { TutorAuthLoginView } from './components/Auth';
// Original App.js lines 1569-1667: Teacher signup view (TBD: needs extraction)
// import { TutorAuthSignupView } from './components/Auth';
// Original App.js lines 1668-1785: Student signup view
import { SignupView } from './components/Auth';
// Original App.js lines 1786-1844: Password reset view
import { ResetView } from './components/Auth';

// --- ONBOARDING COMPONENT IMPORTS ---
// Original App.js lines 1848-1854: Onboarding screen 1
import { ObScreen1 } from './components/Onboarding';
// Original App.js lines 1856-1866: Onboarding screen 2
import { ObScreen2 } from './components/Onboarding';
// Original App.js lines 1868-1880: Onboarding screen 3
import { ObScreen3 } from './components/Onboarding';
// Original App.js lines 1884-1922: Onboarding screen 4 (TBD: needs extraction)
// import { ObScreen4 } from './components/Onboarding';

// --- DASHBOARD COMPONENT IMPORTS ---
// Original App.js lines 689-802: Main student dashboard with learning interface
import { StudentDashboard } from './components/Dashboard';
// Original App.js lines 852-1080: Progress, stats, and achievements view
import { ProgressView } from './components/Dashboard';
// Original App.js lines 804-851: Quiz results view
import { QuizResultsView } from './components/Quiz';

// --- NAVIGATION & SELECTION IMPORTS ---
// Original App.js lines 1122-1137: Material and level selection path
import { SelectionPathView } from './components/SelectionPathView';
// Original App.js lines 1081-1120: Lesson selection for current level (TBD: needs extraction)
// import { LessonSelectionView } from './components/LessonSelectionView';

// --- TUTOR COMPONENT IMPORTS ---
// Original App.js lines 2292-2912: Complete tutor dashboard with student roster and feedback
import { TutorDashboard } from './components/TutorDashboard';

// --- COMMON COMPONENT IMPORTS ---
// Original App.js lines 66-70: Icon mapping and rendering
import { Icon } from './components/common';

// --- ROUTER COMPONENT ---
// Conditionally renders views based on auth state and view state
const AppRouter = () => {
  const authCtx = useAuthContext();
  const userCtx = useUserContext();

  // Extract necessary state from contexts
  const { view, setView, loading, loginError, loginNotice, loginLoading } = authCtx;

  // Show loading state during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold mb-4" style={{ fontFamily: "'Open Sans', sans-serif" }}>
            iSpeaktu
          </h1>
          <p className="text-[#00F2FF] font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Conditional view rendering based on current view state
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-32 selection:bg-[#00F2FF] selection:text-[#0A0A0C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Open+Sans:wght@400;600;800&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        @keyframes swing {
            0% { transform: rotate(0deg); }
            20% { transform: rotate(15deg); }
            40% { transform: rotate(-10deg); }
            60% { transform: rotate(5deg); }
            80% { transform: rotate(-5deg); }
            100% { transform: rotate(0deg); }
        }
        .animate-swing { animation: swing 2s ease infinite; }
      `}</style>

      {/* AUTHENTICATION VIEWS */}
      {view === 'login' && <LoginView />}
      {view === 'signup' && <SignupView />}
      {view === 'reset' && <ResetView />}
      {/* TBD: view === 'tutor_login' && <TutorAuthLoginView /> */}
      {/* TBD: view === 'tutor_signup' && <TutorAuthSignupView /> */}

      {/* ONBOARDING VIEWS */}
      {view === 'ob_screen1' && <ObScreen1 />}
      {view === 'ob_screen2' && <ObScreen2 />}
      {view === 'ob_screen3' && <ObScreen3 />}
      {/* TBD: view === 'ob_screen4' && <ObScreen4 /> */}

      {/* MAIN DASHBOARD VIEWS */}
      {view === 'dashboard' && <StudentDashboard />}
      {view === 'progress' && <ProgressView />}
      {view === 'results' && <QuizResultsView />}

      {/* SELECTION VIEWS */}
      {view === 'select_level' && <SelectionPathView />}
      {/* TBD: view === 'select_lesson' && <LessonSelectionView /> */}

      {/* QUIZ VIEW */}
      {/* TBD: view === 'quiz' && <QuizView /> */}

      {/* SETTINGS VIEW */}
      {/* TBD: view === 'settings' && <SettingsView /> */}

      {/* TUTOR DASHBOARD */}
      {view === 'tutor_dashboard' && <TutorDashboard onLogout={() => setView('login')} />}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
// Wraps entire app with context providers
export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppRouter />
      </UserProvider>
    </AuthProvider>
  );
}
