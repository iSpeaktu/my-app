import React, { useState, useEffect } from 'react';

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
import TutorDashboard from './components/Dashboard/TutorDashboard';
import SettingsView from './components/Dashboard/SettingsView';
import { BottomNav, LoadingSpinner, ErrorBoundary } from './components/common';
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
// NOTE: removed embedded MATERIALS_DATA; app sources materials from DB-only via hooks

/**
 * AppContent: Main routing and view logic
 * Uses AuthContext and UserContext to manage state
 */
function AppContent({ inviteToken, inviteTeacherNameProp, isFetchingTeacher, showInviteModal, setShowInviteModal, clearStoredInviteToken }) {
  const auth = useAuthContext();
  const user = useUserContext();

  // App readiness: wait for auth to finish and, if a session exists,
  // for user onboarding to be initialized. This stricter gate prevents
  // briefly showing the login view while session/onboarding restore is in-flight.
  // Consider teachers immediately ready once auth is restored; students wait for onboarding init
  const appReady = !auth.authLoading && (!auth.session || auth.userRole === 'teacher' || user.hasInitializedOnboarding === true);

  // Confirm teacher invitation
  const confirmInvite = async () => {
    try {
      const token = inviteToken || localStorage.getItem('ispeaktu_invite_token');
      if (!token) return;
      // Wait for a valid auth session if possible (handles race after signup)
      await waitForAuthSession(8000, 300);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        // Not signed in; navigate to login so user can sign in, but do NOT mark invite confirmed
        // Keep the invite token stored so if the user refreshes the popup will show again
        setShowInviteModal && setShowInviteModal(false);
        auth.setView && auth.setView('login');
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
      // remove invite param from URL if present
      try {
        if (window.history.replaceState) {
          const url = new URL(window.location);
          url.searchParams.delete('invite');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (e) {}
      if (typeof clearStoredInviteToken === 'function') clearStoredInviteToken();
      // close modal after successful assignment
      setShowInviteModal && setShowInviteModal(false);
      auth.setInviteConfirmed(true);
      auth.setInviteTeacherName('');
      auth.setHasAssignedTeacher(true);
    } catch (err) {
      console.error('Confirm invite failed:', err);
    }
  };

  // Cancel teacher invitation
  const cancelInvite = () => {
    try {
      if (window.history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {}
    if (typeof clearStoredInviteToken === 'function') clearStoredInviteToken();
    setShowInviteModal && setShowInviteModal(false);
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
    <div className={`min-h-screen bg-[#0A0A0C] text-white ${!(['quiz','results'].includes(auth.view)) ? 'pb-32' : ''} selection:bg-[#00F2FF] selection:text-[#0A0A0C]`}>
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

      {/* Invite modal rendering moved to end of JSX (see AppRoot) */}

      {/* VIEW ROUTING */}

      {appReady && auth.view === 'login' && <LoginView />}
      {appReady && auth.view === 'signup' && <SignupView />}
      {appReady && auth.view === 'tutor_login' && <LoginView />}
      {appReady && auth.view === 'tutor_signup' && <SignupView />}
      {appReady && auth.view === 'reset' && <ResetView />}
      {appReady && auth.view === 'ob_screen1' && <ObScreen1 />}
      {appReady && auth.view === 'ob_screen2' && <ObScreen2 />}
      {appReady && auth.view === 'ob_screen3' && <ObScreen3 />}
      {appReady && auth.view === 'dashboard' && (
        <ErrorBoundary>
          <StudentDashboard />
        </ErrorBoundary>
      )}
      {appReady && auth.view === 'progress' && <ProgressView />}
      {appReady && auth.view === 'select_level' && <SelectionPathView />}
      {appReady && auth.view === 'quiz' && <QuizView />}
      {appReady && auth.view === 'results' && <QuizResultsView quizState={user.quizState} setView={auth.setView} />}
      {appReady && auth.view === 'settings' && <SettingsView />}
      {appReady && auth.view === 'select_lesson' && <SelectLessonView />}
      {appReady && auth.view === 'tutor_dashboard' && <TutorDashboard onLogout={handleTutorLogout} />}

      {/* Bottom navigation for student views */}
      {appReady && !['quiz','results'].includes(auth.view) && (
        <BottomNav view={auth.view} setView={auth.setView} />
      )}
      
      {/* Invite modal: render stable container and wait for teacher name to avoid jumps */}
      {showInviteModal && !auth.inviteConfirmed && auth.hasAssignedTeacher !== true && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-[320px] min-h-[250px] bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 flex flex-col items-center text-center">
            {isFetchingTeacher ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F2FF]"></div>
                <p className="mt-4 text-white/40 text-xs font-bold uppercase tracking-widest">Identifying Teacher...</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300 flex flex-col items-center w-full">
                <h2 className="text-xl font-black mb-2 text-white">Confirm Teacher</h2>
                <p className="text-white/60 text-sm mb-6">You were invited to join <span className="text-[#00F2FF] font-bold">{inviteTeacherNameProp || auth.inviteTeacherName || 'your teacher'}</span>.</p>
                <div className="flex gap-3 w-full">
                  <button onClick={confirmInvite} className="flex-1 bg-[#00F2FF] text-black py-3 rounded-xl font-bold">Confirm</button>
                  <button onClick={cancelInvite} className="flex-1 bg-[#2D2D3A] text-white py-3 rounded-xl font-bold">Cancel</button>
                </div>
                <p className="mt-4 text-[10px] text-white/20 uppercase font-black leading-tight">Only accept invitations from your actual teacher.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AppRoot() {
  const [inviteToken, setInviteToken] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const invite = useInviteToken();
  const [isFetchingTeacher, setIsFetchingTeacher] = useState(false);
  const [inviteTeacherName, setInviteTeacherName] = useState('');
  const auth = useAuthContext();

  // Read URL / stored token once on mount
  useEffect(() => {
    const urlToken = invite.getInviteToken();
    const stored = invite.getStoredInviteToken();
    const token = urlToken || stored;
    if (!token) return;

    try {
      if (urlToken && window.history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {}

    try { invite.setStoredInviteToken(token); } catch (e) {}
    setInviteToken(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch teacher name when inviteToken changes; only run once per token
  useEffect(() => {
    if (!inviteToken) return;
    let active = true;
    setIsFetchingTeacher(true);

    (async () => {
      try {
        const { redeemTeacherInvite, getTeacherNameByUserId } = await import('./config/supabase');
        const teacherId = await redeemTeacherInvite(inviteToken).catch(() => null);
        if (teacherId && active) {
          const teacherName = await getTeacherNameByUserId(teacherId).catch(() => null);
          if (teacherName && active) {
            setInviteTeacherName(teacherName);
            try { auth.setInviteTeacherName(teacherName); } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Failed to resolve teacher name for invite:', e);
      } finally {
        if (active) setIsFetchingTeacher(false);
        // Do not toggle showInviteModal here; wait until auth state and view reach dashboard
        // so the modal only appears when the user is signed in and ready to confirm.
      }
    })();

    return () => { active = false; };
  }, [inviteToken]);

  // If the user signs in after visiting via an invite, show the modal so they can confirm
  useEffect(() => {
    // Show the invite modal only when:
    // - invite token exists
    // - teacher name has been resolved
    // - user is signed in
    // - user is on the student dashboard
    if (auth?.session && inviteToken && !isFetchingTeacher && inviteTeacherName && auth.hasAssignedTeacher !== true && auth.view === 'dashboard') {
      setShowInviteModal(true);
    }
  }, [auth?.session, inviteToken, auth?.hasAssignedTeacher, auth?.view, isFetchingTeacher, inviteTeacherName]);

  return (
    <AppContent
      inviteToken={inviteToken}
      inviteTeacherNameProp={inviteTeacherName}
      isFetchingTeacher={isFetchingTeacher}
      showInviteModal={showInviteModal}
      setShowInviteModal={setShowInviteModal}
      clearStoredInviteToken={invite.clearStoredInviteToken}
    />
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
        <AppRoot />
      </UserProvider>
    </AuthProvider>
  );
}
