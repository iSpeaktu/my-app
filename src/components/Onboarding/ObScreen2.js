// Extracted from App.js - ObScreen2 component (original lines 1856-1866)
import React from 'react';
import Icon from '../common/Icon';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { updateStudentData } from '../../config/supabase';
import { useMaterials } from '../../hooks/useMaterials';

/**
 * Onboarding Screen 2 - Material/Track selection
 * Allows user to choose which English track to study (Conversational, Business, etc.)
 */
export default function ObScreen2() {
  const auth = useAuthContext();
  const user = useUserContext();
  const { setView } = auth;
  const { onboardingData, setOnboardingData } = user;
  const { materials: dbMaterials } = useMaterials();
  const materials = dbMaterials || [];
  return (
  <div className="max-w-md mx-auto py-10 px-8 animate-in slide-in-from-right-10">
    <h2 className="text-2xl font-bold mb-10 text-center">What do you study?</h2>
    {materials.map(m => (
      <button
        key={m.id}
        onClick={async () => {
            const next = { ...onboardingData, material: m };
            setOnboardingData(next);
            // Persist selection to students table if signed in
            try {
              const userId = auth?.session?.user?.id || null;
              if (userId) {
                await updateStudentData(userId, { current_lesson_track_id: m?.id || null });
              }
            } catch (err) {
              console.error('Failed to persist selected track on onboarding step:', err);
            }
            setView('ob_screen_lessons');
          }}
        aria-label={`Select ${m.title} as your study track`}
        className="w-full p-5 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-3 flex items-center gap-4 hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
      >
        <div style={{ color: m.color }} className="bg-[#0A0A0C] p-2 rounded-lg">
          <Icon name={m.icon} style={{ color: m.color }} />
        </div>
        <span className="font-bold">{m.title}</span>
      </button>
    ))}
  </div>
  );
}
