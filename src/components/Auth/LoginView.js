// Extracted from App.js - LoginView component (original lines 1373-1556)
import React from 'react';
import Icon from '../common/Icon';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { useInviteToken } from '../../hooks/useInviteToken';
import { useStudentData } from '../../hooks/useStudentData';
import { studentAuthSignIn, teacherAuthSignIn, findStudentEmailByUsername, redeemTeacherInvite, assignStudentToTeacher, supabase } from '../../config/supabase';
import { isValidEmail } from '../../utils/validation';

/**
 * Student Login View Component
 * Allows students to sign in with email/username and password
 * Gets all state from AuthContext and UserContext
 */
export default function LoginView() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { email, setEmail, password, setPassword, loginLoading, loginError, loginNotice, inviteTeacherName, setView, setLoginError, setLoginLoading } = auth;
  const { getInviteToken, getStoredInviteToken, clearInviteToken, clearStoredInviteToken } = useInviteToken();
  const { loadStudentData } = useStudentData();
  return (
  <div className="max-w-md mx-auto min-h-[90vh] flex flex-col items-center justify-center px-8 animate-in fade-in duration-700">
    <div className="mb-12 text-center">
      <h1 className="text-6xl font-extrabold tracking-tighter text-white mb-2" style={{ fontFamily: "'Open Sans', sans-serif" }}>
        iSpeaktu
      </h1>
      <p className="text-[#00F2FF] font-semibold text-sm tracking-wide opacity-90">turn mistakes into progress</p>
      <p className="text-white/60 text-xs mt-4 font-semibold uppercase tracking-widest">
        {auth.view === 'tutor_login' ? '👨‍🏫 Tutor Sign In' : '👤 Student Sign In'}
      </p>
    </div>

    <div className="w-full max-w-xs space-y-4">
      {loginError && (
        <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
          {loginError}
        </div>
      )}
      {loginNotice && (
        <div className="bg-[#00F2FF]/10 border border-[#00F2FF] text-[#00F2FF] px-4 py-3 rounded-lg text-sm font-semibold">
          {loginNotice}
        </div>
      )}
      {inviteTeacherName && (
        <div className="bg-[#00F2FF10] border border-[#00F2FF40] text-white px-4 py-3 rounded-lg text-sm font-semibold">
          Joining teacher <span className="text-[#00F2FF]">{inviteTeacherName}</span>
        </div>
      )}

      {/* Full name removed from login form: signup will prompt for name separately */}

      <div className="relative group">
        <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FF] transition-colors" size={18} />
        <input
          id="student-login-email"
          name="student_login_email"
          type="text"
          placeholder="Email or username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loginLoading}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
        />
      </div>

      <div className="relative group">
        <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
        <input
          id="student-login-password"
          name="student_login_password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loginLoading}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if (!email) {
              setLoginError('Enter email or username');
              return;
            }
            if (!password) {
              setLoginError('Enter password');
              return;
            }

            try {
              setLoginLoading(true);
              setLoginError('');

              let loginEmail = null;
              if (email.includes('@')) {
                if (!isValidEmail(email)) {
                  setLoginError('Enter a valid email address');
                  setLoginLoading(false);
                  return;
                }
                loginEmail = email.toLowerCase();
              } else {
                // treat input as username, resolve to email
                const resolved = await findStudentEmailByUsername(email);
                if (!resolved) {
                  setLoginError('No account found for that username');
                  setLoginLoading(false);
                  return;
                }
                loginEmail = resolved.toLowerCase();
              }

              // Handle tutor login
              if (auth.view === 'tutor_login') {
                const teacherUser = await teacherAuthSignIn(loginEmail, password);
                if (teacherUser?.user_metadata?.role !== 'teacher') {
                  await supabase.auth.signOut();
                  setLoginError('This account is not a teacher account');
                  setLoginLoading(false);
                  return;
                }
                setView('tutor_dashboard');
                return;
              }

              // Handle student login
              const authUser = await studentAuthSignIn(loginEmail, password);
              if (authUser?.user_metadata?.role === 'teacher') {
                await supabase.auth.signOut();
                setLoginError('Teacher accounts must sign in under "I am a Tutor"');
                setLoginLoading(false);
                return;
              }
              const inviteToken = getInviteToken() || getStoredInviteToken();
              if (inviteToken && auth.inviteConfirmed) {
                try {
                  const teacherUserId = await redeemTeacherInvite(inviteToken);
                  if (teacherUserId) {
                    // assign to the signed-in auth user (not the user context object)
                    await assignStudentToTeacher(authUser.id, teacherUserId, inviteToken);
                    clearInviteToken();
                    clearStoredInviteToken();
                    auth.setInviteConfirmed(false);
                    auth.setInviteTeacherName('');
                  }
                } catch (e) {
                  console.error('Invite assign failed:', e);
                }
              }
              const { material, level, hasStudent, hasProfile, teacherName, hasAssignedTeacher } = await loadStudentData(
                authUser,
                auth.userName,
                auth.setUserName,
                auth.displayName,
                auth.setDisplayName
              );
              // Populate assigned teacher into AuthContext so Settings/Progress can show it
              try { auth.setStudentTeacherName(teacherName || ''); } catch (e) {}
              try { auth.setHasAssignedTeacher(typeof hasAssignedTeacher === 'boolean' ? hasAssignedTeacher : !!teacherName); } catch (e) {}
              // Restore selection into UserContext so UI reflects persisted track/level
              try {
                // Only restore selection when a material or level was returned
                if (material || level) {
                  user.setSelection({ material, level, lessonNumber: null });
                }
              } catch (e) {
                // non-fatal
              }
              setView(material && level ? 'dashboard' : (hasStudent || hasProfile ? 'dashboard' : 'ob_screen1'));
            } catch (err) {
              setLoginError(err.message || 'Email login failed');
            } finally {
              setLoginLoading(false);
            }
          }}
          disabled={loginLoading}
          aria-label="Sign in to your student account"
          className="flex-1 bg-[#00F2FF] text-[#0A0A0C] py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] disabled:opacity-50"
        >
          {loginLoading ? 'Signing in...' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginError('');
            setView(auth.view === 'tutor_login' ? 'tutor_signup' : 'signup');
          }}
          disabled={loginLoading}
          aria-label="Create a new account"
          className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
        >
          Sign up
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setView(auth.view === 'tutor_login' ? 'login' : 'tutor_login');
            setLoginError('');
          }}
          disabled={loginLoading}
          aria-label="Switch login mode"
          className="w-1/2 pt-2 text-white text-xs font-bold uppercase tracking-widest hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all flex items-center justify-center gap-2 disabled:opacity-50 rounded px-2 py-1 hover:bg-[#7000FF]/30 cursor-pointer active:scale-95"
        >
          <Icon name="Settings" size={14} />
          {auth.view === 'tutor_login' ? 'I am a Student' : 'I am a Tutor'}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('reset');
            setLoginError('');
          }}
          aria-label="Reset forgotten password"
          className="w-1/2 pt-2 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-colors disabled:opacity-50 rounded px-2 py-1"
        >
          Forgot password?
        </button>
      </div>
    </div>
  </div>
  );
}
