import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';

/**
 * Onboarding Screen - Lessons per week
 * Presents a standalone screen asking how many lessons the user takes per week.
 */
export default function ObScreenLessonsPerWeek() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { setView } = auth;
  const { onboardingData, setOnboardingData } = user;
  const [localLessons, setLocalLessons] = useState(typeof onboardingData.lessonsPerWeek === 'number' ? onboardingData.lessonsPerWeek : null);

  const handleSelect = (n) => {
    setLocalLessons(n);
    setOnboardingData(prev => ({ ...(prev || {}), lessonsPerWeek: n }));
    // Move to level selection screen
    setView('ob_screen3');
  };

  return (
    <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-right-10">
      <h2 className="text-2xl font-bold mb-6 text-center">How many lessons do you take a week ?</h2>
      <div className="flex gap-3 mb-8">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => handleSelect(n)}
            aria-label={`${n} lessons per week`}
            className={`w-12 h-12 rounded-full font-bold ${localLessons === n ? 'bg-[#00F2FF] text-black' : 'bg-[#16161D] border border-[#2D2D3A] text-white'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
