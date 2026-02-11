// Extracted from App.js - ProgressView component (original lines 852-1080)
import React, { useState, useEffect } from 'react';
import {
  Star,
  Compass,
  Zap,
  Target,
  Medal,
  Award,
  Trophy,
  BrainCircuit,
  BarChart3,
  Book,
  X
} from 'lucide-react';
import { Header, Icon } from '../common';
import { ProgressCard } from './ProgressCard';
import { LESSON_SKILLS, SKILL_DEFINITIONS } from '../../constants/lessonContent';
import { supabase, getTeacherNameByUserId, upsertAchievement } from '../../config/supabase';

/**
 * ProgressView - Student progress tracking and achievements interface
 * Displays lesson completion stats, mastered/upcoming skills, badges, and persistent achievement tracking.
 * 
 * @param {Object} streakState - Streak state with completedHistory array (passed, failed, scores)
 * @param {Object} onboardingData - Onboarding data with lessonsPerWeek for goal comparison
 * @param {string} studentTeacherName - Current student's teacher name (looked up from DB)
 * @param {Function} setStudentTeacherName - State setter for teacher name
 * @param {Array} studentAchievements - Array of achieved badges with names and achieved_at dates
 * @param {Function} setStudentAchievements - State setter for achievements
 */
export const ProgressView = ({
  streakState,
  onboardingData,
  studentTeacherName,
  setStudentTeacherName,
  studentAchievements,
  setStudentAchievements,
}) => {
  const [showMastered, setShowMastered] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);

  // Fetch teacher name if not already loaded
  useEffect(() => {
    let active = true;
    (async () => {
      if (studentTeacherName) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
        const { data: studentRow } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('id', userId)
          .maybeSingle();
        const teacherUserId = studentRow?.teacher_id;
      if (!teacherUserId) return;
      const name = await getTeacherNameByUserId(teacherUserId);
      if (name && active) setStudentTeacherName(name);
    })();
    return () => { active = false; };
  }, []);

  // Calculate mastered and upcoming vocabulary/grammar
  const masteredVocab = new Set();
  const masteredGrammar = new Set();
  const upcomingVocab = new Set();
  const upcomingGrammar = new Set();

  streakState.completedHistory.forEach(h => {
      if (h.passed) {
           const key = `${h.material}_${h.level}_${h.lessonId}`;
           if (LESSON_SKILLS[key]) {
               LESSON_SKILLS[key].vocab.forEach(v => masteredVocab.add(v));
               LESSON_SKILLS[key].grammar.forEach(g => masteredGrammar.add(g));
           }
      }
  });

  Object.keys(LESSON_SKILLS).forEach(k => {
      const parts = k.split('_');
      const isPassed = streakState.completedHistory.some(h => h.material === parts[0] && h.level === parts[1] && h.lessonId == parts[2] && h.passed);
      if (!isPassed) {
           LESSON_SKILLS[k].vocab.forEach(v => upcomingVocab.add(v));
           LESSON_SKILLS[k].grammar.forEach(g => upcomingGrammar.add(g));
      }
  });

  // Calculate failed items trend
  const failedItemCounts = {};
  streakState.completedHistory.forEach(h => {
      if (!h.passed) {
          const key = `${h.material}_${h.level}_${h.lessonId}`;
          const skills = LESSON_SKILLS[key];
          if (skills) {
              [...skills.vocab, ...skills.grammar].forEach(skill => {
                  failedItemCounts[skill] = (failedItemCounts[skill] || 0) + 1;
              });
          }
      }
  });
  const consistentFailures = Object.entries(failedItemCounts)
      .filter(([_, count]) => count >= 2)
      .map(([name]) => name);

  // Calculate quiz statistics
  const totalTaken = streakState.completedHistory.length;
  const sessionMap = {};
  streakState.completedHistory.forEach(h => {
      const key = `${h.material}_${h.level}_${h.lessonId}`;
      sessionMap[key] = (sessionMap[key] || 0) + 1;
  });
  const totalRetaken = Object.values(sessionMap).reduce((acc, count) => acc + (count > 1 ? count - 1 : 0), 0);

  const passedLessons = streakState.completedHistory.filter(h => h.passed);
  const uniquePassedCount = [...new Set(passedLessons.map(h => `${h.material}_${h.level}_${h.lessonId}`))].length;
  
  // Calculate consecutive 100% score streak
  let consecutivePerfects = 0;
  let maxPerfectStreak = 0;
  streakState.completedHistory.forEach(h => {
      if (h.score === 100) {
          consecutivePerfects++;
          if (consecutivePerfects > maxPerfectStreak) maxPerfectStreak = consecutivePerfects;
      } else {
          consecutivePerfects = 0;
      }
  });

  // Badge achievement definitions
  const badgeData = [
    { id: 1, name: "Starter Star", desc: "Complete 1 lesson", icon: Star, achieved: uniquePassedCount >= 1 },
    { id: 2, name: "Pioneer Milestone", desc: "Complete 5 lessons", icon: Compass, achieved: uniquePassedCount >= 5 },
    { id: 3, name: "Weekly Warrior", desc: "Achieve weekly goal", icon: Zap, achieved: streakState.weeklyActivityCount >= onboardingData.lessonsPerWeek },
    { id: 4, name: "Perfectionist", desc: "10 consecutive 100% scores", icon: Target, achieved: maxPerfectStreak >= 10 },
    { id: 5, name: "Language Veteran", desc: "Complete 20 lessons", icon: Medal, achieved: uniquePassedCount >= 20 },
    { id: 6, name: "Language Master", desc: "Complete 40 lessons", icon: Award, achieved: uniquePassedCount >= 40 },
    { id: 7, name: "Language Legend", desc: "Complete 60 lessons", icon: Trophy, achieved: uniquePassedCount >= 60 },
    { id: 8, name: "Ultimate Sage", desc: "Complete 100 lessons", icon: BrainCircuit, achieved: uniquePassedCount >= 100 },
  ];

  const achievedNames = badgeData.filter(b => b.achieved).map(b => b.name);
  const achievedKey = achievedNames.slice().sort().join('|');
  const storedKey = (studentAchievements || []).map(a => a.badge_name).sort().join('|');

  // Persist newly achieved badges to database
  useEffect(() => {
    let active = true;
    (async () => {
      if (!achievedNames.length) return;
      const existing = new Set((studentAchievements || []).map(a => a.badge_name));
      const missing = achievedNames.filter(name => !existing.has(name));
      if (missing.length === 0) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      for (const badgeName of missing) {
        const ok = await upsertAchievement(userId, badgeName);
        if (ok && active) {
          setStudentAchievements(prev => {
            const exists = (prev || []).some(a => a.badge_name === badgeName);
            if (exists) return prev;
            return [...(prev || []), { badge_name: badgeName, achieved_at: new Date().toISOString() }];
          });
        }
      }
    })();
    return () => { active = false; };
  }, [achievedKey, storedKey]);

  return (
    <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
      <Header title="View Progress" subtitle="Tracking your mastery" />

      {studentTeacherName && (
        <div className="mb-6 p-4 bg-[#00F2FF10] border border-[#00F2FF40] rounded-2xl text-white">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-1">Your Teacher</div>
          <div className="text-sm font-bold">{studentTeacherName}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
         <ProgressCard label="Lessons Passed" value={uniquePassedCount} color="#00F2FF" />
         <ProgressCard label="Perfect Streak" value={maxPerfectStreak} color="#7000FF" />
      </div>

      {uniquePassedCount >= 5 && consistentFailures.length > 0 && (
          <div className="mb-8 p-6 bg-[#FF2E6310] border border-[#FF2E6340] rounded-3xl animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2E63] text-white flex items-center justify-center">
                      <Icon name="TrendingDown" size={20} />
                  </div>
                  <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-[#FF2E63]">Critical Review</h3>
                      <p className="text-[10px] text-white/40">Vocabulary & Grammar failed consistently</p>
                  </div>
              </div>
              <div className="flex flex-wrap gap-2">
                  {consistentFailures.map(item => (
                      <button key={item} onClick={() => setActiveTerm({ term: item, type: 'Needs Practice' })} className="px-3 py-1.5 bg-[#FF2E6320] border border-[#FF2E6340] rounded-lg text-white text-[10px] font-bold uppercase hover:bg-[#FF2E6340] transition-colors">
                          {item}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-sm uppercase flex items-center gap-2"><BarChart3 size={14} className="text-[#00F2FF]" /> Progress Trend</h3>
          <div className="flex bg-[#2D2D3A] rounded-lg p-1">
              <button onClick={() => setShowMastered(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${showMastered ? 'bg-[#00F2FF] text-[#0A0A0C]' : 'text-white/40'}`}>Mastered</button>
              <button onClick={() => setShowMastered(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!showMastered ? 'bg-[#FF2E63] text-white' : 'text-white/40'}`}>To Master</button>
          </div>
      </div>

      <div className="bg-[#16161D] border border-[#2D2D3A] p-6 rounded-3xl mb-8 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${showMastered ? 'bg-[#00FF94]' : 'bg-[#FF2E63]'}`}></div>
          <div className="mb-8">
              <h4 className="font-bold text-[10px] uppercase text-[#00F2FF] mb-4 flex items-center gap-2"><BrainCircuit size={12} /> Vocabulary</h4>
              <div className="flex flex-wrap gap-2">
                  {Array.from(showMastered ? masteredVocab : upcomingVocab).map(v => (
                      <button key={v} onClick={() => setActiveTerm({ term: v, type: 'Vocabulary' })} className="px-3 py-1.5 bg-[#00F2FF10] border border-[#00F2FF30] rounded-lg text-[#00F2FF] text-[10px] font-bold uppercase hover:bg-[#00F2FF20] transition-colors">{v}</button>
                  ))}
              </div>
          </div>
          <div>
              <h4 className="font-bold text-[10px] uppercase text-[#FFD700] mb-4 flex items-center gap-2"><Book size={12} /> Grammar</h4>
              <div className="flex flex-wrap gap-2">
                  {Array.from(showMastered ? masteredGrammar : upcomingGrammar).map(g => (
                      <button key={g} onClick={() => setActiveTerm({ term: g, type: 'Grammar' })} className="px-3 py-1.5 bg-[#FFD70010] border border-[#FFD70030] rounded-lg text-[#FFD700] text-[10px] font-bold uppercase hover:bg-[#FFD70020] transition-colors">{g}</button>
                  ))}
              </div>
          </div>
      </div>

      <div className="mb-8">
          <h3 className="font-bold text-sm uppercase flex items-center gap-2 mb-4 text-white/40"><Medal size={14} className="text-[#FFD700]" /> Achievements & Badges</h3>
          <div className="grid grid-cols-2 gap-4">
              {badgeData.map(badge => (
                <div key={badge.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${badge.achieved ? 'bg-[#FFD70010] border-[#FFD70040]' : 'bg-[#16161D] border-[#2D2D3A] opacity-20'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${badge.achieved ? 'bg-[#FFD700] text-[#0A0A0C]' : 'bg-white/10 text-white'}`}>
                        <Icon name={badge.icon} size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{badge.name}</p>
                    <p className="text-[9px] text-white/50 leading-tight">{badge.desc}</p>
                </div>
              ))}
          </div>
      </div>

      {activeTerm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#16161D] border border-[#2D2D3A] p-8 rounded-3xl max-sm-w-full relative shadow-2xl">
                  <button onClick={() => setActiveTerm(null)} className="absolute top-6 right-6 text-white/40 hover:text-white"><X size={20} /></button>
                  <div className="mb-3"><span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/10 text-white/60 tracking-widest">{activeTerm.type}</span></div>
                  <h3 className="text-2xl font-bold text-white mb-3">{activeTerm.term}</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-6">{SKILL_DEFINITIONS[activeTerm.term]?.def || 'Detailed definition coming soon.'}</p>
              </div>
          </div>
      )}
    </div>
  );
};
