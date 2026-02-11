// Extracted from App.js - SignupView component (original lines 1668-1784)
import React from 'react';
import Icon from '../common/Icon';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { useInviteToken } from '../../hooks/useInviteToken';
import { useStudentData } from '../../hooks/useStudentData';
import { studentAuthSignUp, teacherAuthSignUp, redeemTeacherInvite, assignStudentToTeacher, supabase } from '../../config/supabase';
import { isValidEmail } from '../../utils/validation';

/**
 * Student Signup View Component
 * Allows students to create new accounts with email and password
 * Gets all state from AuthContext and UserContext
 */
export default function SignupView() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { email, setEmail, password, setPassword, fullName, setFullName, loginLoading, loginError, loginNotice, setView, setLoginError, setLoginNotice, setLoginLoading } = auth;
  const { getInviteToken, getStoredInviteToken, clearInviteToken, clearStoredInviteToken } = useInviteToken();
  const { loadStudentData } = useStudentData();
  return (
  <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-black text-white mb-2">Create an Account</h2>
      <p className="text-white/50 text-sm">{auth.view === 'tutor_signup' ? 'Sign up as a tutor' : 'Sign up with your name, email and password'}</p>
      <p className="text-white/60 text-xs mt-3 font-semibold uppercase tracking-widest">
        {auth.view === 'tutor_signup' ? '👨‍🏫 Tutor Registration' : '👤 Student Registration'}
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

      <div className="relative group">
        <Icon name="User" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={20} />
        <input
          id="student-signup-fullname"
          name="student_signup_fullname"
          autoFocus
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loginLoading}
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
        />
      </div>

      <div className="relative group">
        <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
        <input
          id="student-signup-email"
          name="student_signup_email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loginLoading}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
        />
      </div>

      <div className="relative group">
        <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
        <input
          id="student-signup-password"
          name="student_signup_password"
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
          onClick={async () => {
            if (!fullName) {
              setLoginError('Enter your full name');
              setLoginNotice('');
              return;
            }
            if (!email || !password) {
              setLoginError('Enter email and password');
              setLoginNotice('');
              return;
            }
            if (!isValidEmail(email)) {
              setLoginError('Enter a valid email address');
              setLoginNotice('');
              return;
            }
            if (password.length < 6) {
              setLoginError('Password must be at least 6 characters');
              setLoginNotice('');
              return;
            }
            try {
              setLoginLoading(true);
              setLoginError('');
              setLoginNotice('');
              
              // Handle tutor signup
              if (auth.view === 'tutor_signup') {
                const teacherUser = await teacherAuthSignUp(email.toLowerCase(), password, fullName);
                const { data: sessionData } = await supabase.auth.getSession();
                if (!sessionData?.session) {
                  setLoginNotice('Check your email to confirm your account before signing in.');
                  setLoginLoading(false);
                  return;
                }
                if (teacherUser?.user_metadata?.role !== 'teacher') {
                  await supabase.auth.signOut();
                  setLoginError('Failed to create teacher account');
                  setLoginLoading(false);
                  return;
                }
                const normalized = (teacherUser?.user_metadata?.username || (teacherUser?.email || '').split('@')[0] || email).toLowerCase();
                auth.setUserName(normalized);
                auth.setDisplayName(fullName || normalized);
                setView('tutor_dashboard');
                return;
              }
              
              // Handle student signup
              const authUser = await studentAuthSignUp(email.toLowerCase(), password, fullName);
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData?.session) {
                setLoginNotice('Check your email to confirm your account before signing in.');
                setLoginLoading(false);
                return;
              }
              const inviteToken = getInviteToken() || getStoredInviteToken();
              if (inviteToken && auth.inviteConfirmed) {
                try {
                  const teacherUserId = await redeemTeacherInvite(inviteToken);
                  if (teacherUserId) {
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

              const normalized = (authUser?.user_metadata?.username || (authUser?.email || '').split('@')[0] || email).toLowerCase();
              auth.setUserName(normalized);
              auth.setDisplayName(fullName || normalized);

              const baseOnboarding = { material: null, level: null, lessonsPerWeek: user.onboardingData?.lessonsPerWeek || 3 };
              user.setOnboardingData(baseOnboarding);
              setView('ob_screen1');
            } catch (err) {
              const msg = (err?.message || '').toLowerCase();
              if (msg.includes('rate limit') || msg.includes('rate-limit')) {
                setLoginError('Too many sign-up attempts. Please wait a bit and try again.');
              } else {
                setLoginError(err.message || 'Signup failed');
              }
            } finally {
              setLoginLoading(false);
            }
          }}
          disabled={loginLoading}
          aria-label="Create new student account"
          className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
        >
          {loginLoading ? 'Signing up...' : 'Sign up'}
        </button>

        <button
          type="button"
          onClick={() => {
            setView(auth.view === 'tutor_signup' ? 'tutor_login' : 'login');
            setLoginError('');
            setLoginNotice('');
          }}
          aria-label="Go back to login"
          className="flex-1 bg-[#16161D] text-white py-3 rounded-xl font-bold text-lg border border-[#2D2D3A] focus:outline-none focus:ring-2 focus:ring-[#2D2D3A] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
        >
          Back
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setView(auth.view === 'tutor_signup' ? 'signup' : 'tutor_signup');
            setLoginError('');
            setLoginNotice('');
          }}
          disabled={loginLoading}
          aria-label="Switch signup mode"
          className="w-1/2 pt-2 text-white text-xs font-bold uppercase tracking-widest hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all flex items-center justify-center gap-2 disabled:opacity-50 rounded px-2 py-1 hover:bg-[#7000FF]/30 cursor-pointer active:scale-95"
        >
          <Icon name="Settings" size={14} />
          {auth.view === 'tutor_signup' ? 'I am a Student' : 'I am a Tutor'}
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
