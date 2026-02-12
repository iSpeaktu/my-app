import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { supabase, updateStudentData } from '../../config/supabase';
import { usePersistentAuth } from '../../hooks/useAuth';
import Header from '../common/Header';
import { MATERIALS_DATA } from '../../constants/materials';
import { useMaterials } from '../../hooks/useMaterials';

export default function SettingsView() {
  const auth = useAuthContext();
  const user = useUserContext();

  const [name, setName] = useState(auth.displayName || auth.userName || '');
  const [lessonsPerWeek, setLessonsPerWeek] = useState(user.onboardingData?.lessonsPerWeek || 3);
  const [selectedMaterialId, setSelectedMaterialId] = useState(user.onboardingData?.material?.id || (MATERIALS_DATA[0] && MATERIALS_DATA[0].id));
  const { materials: dbMaterials } = useMaterials();
  const materials = (dbMaterials && dbMaterials.length) ? dbMaterials : MATERIALS_DATA;
  const materialSpec = materials.find(m => m.id === selectedMaterialId) || materials[0];
  const [selectedLevel, setSelectedLevel] = useState(user.onboardingData?.level || (materialSpec?.levels?.[0]));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const { persistData } = usePersistentAuth();

  const callPersist = async (updates) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId && typeof persistData === 'function') {
        const result = await persistData(userId, updates, { throwOnError: false });
        if (!result || result.success === false) {
          const msg = result?.error || 'Unknown persistence error';
          console.warn('persistData returned error:', msg);
          return { success: false, error: msg };
        }
        return { success: true };
      }
      return { success: false, error: 'No user or persistData unavailable' };
    } catch (e) {
      console.warn('persistData call failed:', e?.message || e);
      return { success: false, error: e?.message || String(e) };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      auth.setDisplayName(name || (auth.userName || ''));
      auth.setUserName((name || auth.userName || '').toLowerCase());
      if (typeof user.setOnboardingData === 'function') {
        user.setOnboardingData({ material: materialSpec, level: selectedLevel, lessonsPerWeek });
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert([{ id: userId, full_name: name || null }], { onConflict: 'id' });
          await updateStudentData((auth.userName || '').toLowerCase(), { current_lesson_track_id: materialSpec.id, current_level: selectedLevel, lessons_per_week: lessonsPerWeek });
        }
      } catch (e) {
        console.warn('Persistence to Supabase failed:', e?.message || e);
      }

      // also call generic persist hook; include a lightweight `settings` object
      const persistResult = await callPersist({
        userName: (name || '').toLowerCase(),
        onboardingData: { material: materialSpec, level: selectedLevel, lessonsPerWeek },
        settings: {
          preferences: {
            preferredMaterialId: materialSpec.id,
            preferredLevel: selectedLevel,
            lessonsPerWeek
          },
          lastSavedAt: new Date().toISOString()
        }
      });

      if (!persistResult || persistResult.success === false) {
        setMessage('Save failed: ' + (persistResult?.error || 'Unknown error'));
      } else {
        setMessage('Saved');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setMessage('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName(auth.displayName || auth.userName || '');
    setLessonsPerWeek(user.onboardingData?.lessonsPerWeek || 3);
    setSelectedMaterialId(user.onboardingData?.material?.id || (materials[0] && materials[0].id));
    setSelectedLevel(user.onboardingData?.level || (materials[0]?.levels?.[0]));
    setMessage('');
  };

  const handleNameChange = async (val) => {
    setName(val);
    auth.setDisplayName(val || auth.userName || '');
    auth.setUserName((val || auth.userName || '').toLowerCase());
    await callPersist({ userName: (val || '').toLowerCase() });
  };

  const handleLessonsChange = async (val) => {
    setLessonsPerWeek(val);
    const updated = { ...(user.onboardingData || {}), lessonsPerWeek: val, material: materials.find(m => m.id === selectedMaterialId) || null, level: selectedLevel };
    if (typeof user.setOnboardingData === 'function') user.setOnboardingData(updated);
    await callPersist({ onboardingData: updated });
  };

  const handleSelectTrack = async (m) => {
    const updated = { ...(user.onboardingData || {}), material: m, level: m.levels[0], lessonsPerWeek };
    setSelectedMaterialId(m.id);
    setSelectedLevel(m.levels[0]);
    if (typeof user.setOnboardingData === 'function') user.setOnboardingData(updated);
    await callPersist({ onboardingData: updated });
  };

  const handleSelectLevel = async (l) => {
    const updated = { ...(user.onboardingData || {}), material: materials.find(m => m.id === selectedMaterialId) || null, level: l, lessonsPerWeek };
    setSelectedLevel(l);
    if (typeof user.setOnboardingData === 'function') user.setOnboardingData(updated);
    await callPersist({ onboardingData: updated });
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
      <Header title="Settings" subtitle="Your Account & Goals" showStreak streakState={user.streakState} />

      <div className="space-y-8">
        {/* Profile */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Profile Information</h4>
          <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-4">
            {auth.hasAssignedTeacher !== false ? (
              <div className="mb-2 text-sm text-white/70">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Assigned Teacher</div>
                <div className="font-bold">{auth.studentTeacherName || 'Loading...'}</div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Name</label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2D2D3A] rounded-xl py-3 px-4 text-sm font-bold text-white focus:border-[#00F2FF40] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Learning Goals</h4>
          <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Lessons Per Week</label>
                <span className="text-xs font-black text-[#00F2FF]">{lessonsPerWeek} Lessons</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={lessonsPerWeek}
                onChange={(e) => handleLessonsChange(parseInt(e.target.value))}
                className="w-full accent-[#00F2FF]"
              />
            </div>
          </div>
        </div>

        {/* Track & Level */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Track & Level</h4>
          <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2 block">Track</label>
              <div className="grid grid-cols-1 gap-2">
                {materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectTrack(m)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedMaterialId === m.id ? 'bg-[#00F2FF10] border-[#00F2FF] text-white' : 'bg-[#0A0A0C] border-[#2D2D3A] text-white/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold">{m.title}</span>
                    </div>
                    {selectedMaterialId === m.id && <span className="text-[#00F2FF] font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#2D2D3A]">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2 block">Current Level</label>
              <div className="flex flex-wrap gap-2">
                {(materials.find(m => m.id === selectedMaterialId)?.levels || []).map(l => (
                  <button
                    key={l}
                    onClick={() => handleSelectLevel(l)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${selectedLevel === l ? 'bg-[#7000FF] border-[#7000FF] text-white shadow-[0_0_15px_rgba(112,0,255,0.3)]' : 'bg-[#0A0A0C] border-[#2D2D3A] text-white/40'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-10 flex flex-col items-center gap-4">
          <button
            onClick={async () => { await handleSave(); auth.setView('dashboard'); }}
            className="w-full bg-[#00F2FF] text-[#0A0A0C] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save & Return'}
          </button>
          <button onClick={handleReset} className="w-full border border-[#2D2D3A] text-white/70 py-3 rounded-xl">Reset</button>
          {message && <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-2">{message}</p>}
        </div>
      </div>
    </div>
  );
}
