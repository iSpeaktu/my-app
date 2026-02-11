// Extracted from App.js - ObScreen3 component (original lines 1868-1880)
import React from 'react';

/**
 * Onboarding Screen 3 - Level selection
 * Allows user to choose proficiency level for their selected material
 * @param {object} onboardingData - Current onboarding data
 * @param {Function} setOnboardingData - Setter for onboarding data
 * @param {Function} setView - View switcher function
 * @param {Function} persistData - Function to persist data to database
 * @param {string} userName - Current username
 * @param {object} streakState - Current streak state
 */
export default function ObScreen3({
  onboardingData,
  setOnboardingData,
  setView,
  persistData,
  userName,
  streakState
}) {
  return (
  <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-right-10">
    <h2 className="text-2xl font-bold mb-10 text-center">What's your level?</h2>
    {onboardingData.material?.levels.map(l => (
      <button
        key={l}
        onClick={() => {
          const finalOb = { ...onboardingData, level: l };
          setOnboardingData(finalOb);
          persistData({ userName, onboardingData: finalOb, streakState });
          setView('ob_screen4');
        }}
        aria-label={`Select ${l} as your level`}
        className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-3 font-bold text-lg hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
      >
        {l}
      </button>
    ))}
  </div>
  );
}
