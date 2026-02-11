// Extracted from App.js - ObScreen1 component (original lines 1848-1854)
import React from 'react';

/**
 * Onboarding Screen 1 - Welcome question
 * Asks if the user studies English with iSpeaktu or prefers self-studying
 * @param {Function} setView - View switcher function
 * @param {Function} persistData - Function to persist data to database
 * @param {string} userName - Current username
 * @param {object} onboardingData - Current onboarding data
 * @param {object} streakState - Current streak state
 */
export default function ObScreen1({
  setView,
  persistData,
  userName,
  onboardingData,
  streakState
}) {
  return (
  <div className="max-w-md mx-auto min-h-[90vh] flex flex-col items-center justify-center px-8 animate-in fade-in">
    <h2 className="text-2xl font-bold mb-10 text-center leading-snug">
      Do you study English with
      <br />
      <span className="text-[#00F2FF]">iSpeaktu?</span>
    </h2>
    <button
      onClick={() => setView('ob_screen2')}
      aria-label="Yes, I study English with iSpeaktu"
      className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-4 font-bold text-lg hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
    >
      Yes,
    </button>
    <button
      onClick={() => {
        persistData({ userName, onboardingData, streakState });
        setView('ob_screen4');
      }}
      aria-label="No, I prefer self-studying"
      className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl font-bold text-lg hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
    >
      No, I'm self-studying
    </button>
  </div>
  );
}
