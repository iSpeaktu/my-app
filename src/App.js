import React from 'react';

// === CONTEXT PROVIDERS ===
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { UserProvider, useUserContext } from './context/UserContext';

// === VIEWS & SCREENS ===
import LoginView from './components/Auth/LoginView';
import SignupView from './components/Auth/SignupView';
import ResetView from './components/Auth/ResetView';
import ObScreen1 from './components/Onboarding/ObScreen1';
import ObScreen2 from './components/Onboarding/ObScreen2';
import ObScreen3 from './components/Onboarding/ObScreen3';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import ProgressView from './components/Dashboard/ProgressView';
import SelectionPathView from './components/SelectionPathView';
import SelectLessonView from './components/Selection/SelectLessonView';
import QuizResultsView from './components/Quiz/QuizResultsView';
import TutorDashboard from './components/TutorDashboard';
import SettingsView from './components/Dashboard/SettingsView';
import { BottomNav } from './components/common';
import QuizView from './components/Quiz/QuizView';

// === CUSTOM HOOKS ===
import { 
  useAuth, 
  useStudentAuth, 
  useTeacherAuth, 
  usePersistentAuth 
} from './hooks/useAuth';
import { useStudentData } from './hooks/useStudentData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStreak } from './hooks/useStreak';
import { useNotifications } from './hooks/useNotifications';
import { useInviteToken } from './hooks/useInviteToken';

// === CONFIG ===
import { supabase, waitForAuthSession } from './config/supabase';

// === CONSTANTS ===
import { MATERIALS_DATA } from './constants';

/**
 * AppContent: Main routing and view logic
 * Uses AuthContext and UserContext to manage state
 */
function AppContent() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { getStoredInviteToken, clearStoredInviteToken, clearInviteToken } = useInviteToken();

  // Confirm teacher invitation
  const confirmInvite = async () => {
    try {
      const token = getStoredInviteToken();
      if (!token) return;
      // Wait for a valid auth session if possible (handles race after signup)
      await waitForAuthSession(8000, 300);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        // Not signed in; show login/signup flow — keep invite token stored and prompt user to confirm after signing in
        auth.setInviteConfirmed(true);
        return;
      }

      // Resolve teacher id and assign (do not clear token unless assignment succeeds)
      const { redeemTeacherInvite, assignStudentToTeacher, getTeacherNameByUserId } = await import('./config/supabase');
      const teacherId = await redeemTeacherInvite(token);
      if (!teacherId) {
        throw new Error('Invalid or expired invite');
      }

      await assignStudentToTeacher(userId, teacherId, token);

      // Fetch teacher display name and set on auth so UI updates immediately
      const teacherName = await getTeacherNameByUserId(teacherId).catch(() => null);
      if (teacherName) auth.setStudentTeacherName(teacherName);

      // Clear token and mark confirmed only after successful assignment
      clearInviteToken();
      clearStoredInviteToken();
      auth.setInviteConfirmed(true);
      auth.setInviteTeacherName('');
      auth.setHasAssignedTeacher(true);
    } catch (err) {
      console.error('Confirm invite failed:', err);
    }
  };

  // Cancel teacher invitation
  const cancelInvite = () => {
    clearInviteToken();
    clearStoredInviteToken();
    auth.setInviteConfirmed(false);
    auth.setInviteTeacherName('');
  };

  // Handle teacher logout
  const handleTutorLogout = async () => {
    try {
      await supabase.auth.signOut();
      auth.setView('login');
      auth.setUserName('');
      auth.setDisplayName('');
      auth.setLoginError('');
      auth.setLoginNotice('');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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

      {/* Invite confirmation modal */}
      {getStoredInviteToken() && !auth.inviteConfirmed && auth.hasAssignedTeacher !== true && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6">
          <div className="max-w-lg w-full bg-[#16161D] border border-[#2D2D3A] rounded-2xl p-6 text-center">
            <h3 className="text-xl font-extrabold mb-2">Confirm Teacher Invitation</h3>
            <p className="text-white/70 mb-4">{
              auth.inviteTeacherName
                ? (<span>You were invited to join <strong className="text-[#00F2FF]">{auth.inviteTeacherName}</strong>.</span>)
                : 'You were invited to join a teacher. Confirm to accept the invitation.'
            }</p>
            <button onClick={confirmInvite} aria-label="Confirm teacher invitation" className="w-full px-6 py-3 rounded-xl bg-[#00F2FF] text-[#0A0A0C] font-bold text-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#16161D] transition-all">Confirm</button>
            <button onClick={cancelInvite} aria-label="Cancel teacher invitation" className="w-full text-red-500 font-bold bg-transparent py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#16161D] rounded transition-all">Cancel</button>
            <p className="text-xs text-white/50 mt-3">If this is not your teacher, do not accept. Only accept invitations from your teacher.</p>
          </div>
        </div>
      )}

      {/* VIEW ROUTING */}
      {auth.loading && <div className="flex items-center justify-center min-h-screen"><div className="text-center"><p className="text-white/70">Loading...</p></div></div>}

      {!auth.loading && auth.view === 'login' && <LoginView />}
      {!auth.loading && auth.view === 'signup' && <SignupView />}
      {!auth.loading && auth.view === 'tutor_login' && <LoginView />}
      {!auth.loading && auth.view === 'tutor_signup' && <SignupView />}
      {!auth.loading && auth.view === 'reset' && <ResetView />}
      {!auth.loading && auth.view === 'ob_screen1' && <ObScreen1 />}
      {!auth.loading && auth.view === 'ob_screen2' && <ObScreen2 />}
      {!auth.loading && auth.view === 'ob_screen3' && <ObScreen3 />}
      {!auth.loading && auth.view === 'dashboard' && <StudentDashboard />}
      {!auth.loading && auth.view === 'progress' && <ProgressView />}
      {!auth.loading && auth.view === 'select_level' && <SelectionPathView />}
      {!auth.loading && auth.view === 'quiz' && <QuizView />}
      {!auth.loading && auth.view === 'results' && <QuizResultsView quizState={user.quizState} setView={auth.setView} />}
      {!auth.loading && auth.view === 'settings' && <SettingsView />}
      {!auth.loading && auth.view === 'select_lesson' && <SelectLessonView />}
      {!auth.loading && auth.view === 'tutor_dashboard' && <TutorDashboard onLogout={handleTutorLogout} />}

      {/* Bottom navigation for student views */}
      {!auth.loading && ['dashboard','progress','settings','select_level','select_lesson','quiz','results'].includes(auth.view) && (
        <BottomNav view={auth.view} setView={auth.setView} />
      )}
    </div>
  );
}

/**
 * App: Root component with context providers
 * Wraps AppContent with AuthProvider and UserProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
  );
}
