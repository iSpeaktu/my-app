// Extracted from App.js - ObScreen3 component (original lines 1868-1880)
import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { updateStudentData } from '../../config/supabase';

/**
 * Onboarding Screen 3 - Level selection
 * Allows user to choose proficiency level for their selected material
 */
export default function ObScreen3() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { setView } = auth;
  const { onboardingData, setOnboardingData } = user;
  return (
  <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-right-10">
    <h2 className="text-2xl font-bold mb-10 text-center">What's your level?</h2>
    {onboardingData.material?.levels.map(l => (
      <button
        key={l}
        onClick={async () => {
          const finalOb = { ...onboardingData, level: l };
          setOnboardingData(finalOb);
          // Persist final onboarding selections to students table
          try {
            const userId = auth?.session?.user?.id || null;
            if (userId) {
              await updateStudentData(userId, {
                current_material_id: finalOb.material?.id || null,
                current_level: finalOb.level || null,
                lessons_per_week: finalOb.lessonsPerWeek || null
              });
            }
          } catch (err) {
            // non-fatal: log and continue to dashboard
            // eslint-disable-next-line no-console
            console.error('Failed to persist onboarding data', err);
          }
          setView('dashboard');
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
