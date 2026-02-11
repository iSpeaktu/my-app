// Extracted from App.js - ResetView component (original lines 1786-1844)
import React from 'react';
import { Icon } from '../common/Icon';

/**
 * Password Reset View Component
 * Allows students to request password reset emails
 * @param {string} email - Email input value
 * @param {Function} setEmail - Email setter
 * @param {boolean} loginLoading - Loading state
 * @param {string} loginError - Error message
 * @param {Function} setView - View switcher
 * @param {Function} setLoginError - Set login error
 * @param {Function} isValidEmail - Email validation function
 * @param {Function} findStudentEmailByUsername - Function to resolve username to email
 * @param {Function} studentAuthResetPassword - Supabase password reset
 * @param {Function} setLoginLoading - Set loading state
 */
export const ResetView = ({
  email,
  setEmail,
  loginLoading,
  loginError,
  setView,
  setLoginError,
  isValidEmail,
  findStudentEmailByUsername,
  studentAuthResetPassword,
  setLoginLoading
}) => (
  <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-black text-white mb-2">Reset Password</h2>
      <p className="text-white/50 text-sm">
        Enter your email or username to receive a password reset link
      </p>
    </div>
    <div className="w-full max-w-xs space-y-4">
      {loginError && (
        <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
          {loginError}
        </div>
      )}

      <div className="relative group">
        <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
        <input
          id="reset-email"
          name="reset_email"
          autoFocus
          type="text"
          placeholder="Email or username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loginLoading}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            if (!email) {
              setLoginError('Enter email or username');
              return;
            }
            try {
              setLoginLoading(true);
              setLoginError('');
              let targetEmail = null;
              if (email.includes('@')) {
                if (!isValidEmail(email)) {
                  setLoginError('Enter a valid email address');
                  setLoginLoading(false);
                  return;
                }
                targetEmail = email.toLowerCase();
              } else {
                const resolved = await findStudentEmailByUsername(email);
                if (!resolved) {
                  setLoginError('No account found for that username');
                  setLoginLoading(false);
                  return;
                }
                targetEmail = resolved.toLowerCase();
              }
              await studentAuthResetPassword(targetEmail);
              setLoginError('Password reset email sent. Check your inbox.');
            } catch (err) {
              setLoginError(err.message || 'Failed to send reset email');
            } finally {
              setLoginLoading(false);
            }
          }}
          disabled={loginLoading}
          aria-label="Send password reset email"
          className="flex-1 bg-[#00F2FF] text-[#0A0A0C] py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] disabled:opacity-50"
        >
          {loginLoading ? 'Sending...' : 'Send reset email'}
        </button>

        <button
          onClick={() => {
            setView('login');
            setLoginError('');
          }}
          aria-label="Go back to login"
          className="flex-1 bg-[#16161D] text-white py-3 rounded-xl font-bold text-lg border border-[#2D2D3A] focus:outline-none focus:ring-2 focus:ring-[#2D2D3A] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
        >
          Back
        </button>
      </div>
    </div>
  </div>
);
