// Extracted from App.js - Dashboard component (original lines 689-802)
import React, { useEffect, useState } from 'react';
import { ThumbsUp, Bell, ChevronRight, X } from 'lucide-react';
import { Header, Card, Icon } from '../common';
import CenteredLoader from '../common/CenteredLoader';
import { useMaterials } from '../../hooks/useMaterials';
import { useNotifications, createNotification } from '../../hooks/useNotifications';
import { supabase, deleteNotification, getNotifications } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { getStoredSelection } from '../../utils/storage';

/**
 * StudentDashboard - Main student learning interface
 * Displays weekly goal progress, teacher notifications/praise, current track, and available materials.
 *
 * @param {string} displayName - User's display name
 * @param {string} userName - User's username
 * @param {Object} streakState - Streak/progress state with completedHistory and weeklyActivityCount
 * @param {Object} onboardingData - Onboarding state with material, level, lessonsPerWeek
 * @param {Array} studentNotifications - Array of notifications (praise/reminder)
 * @param {Function} setStudentNotifications - State setter for notifications
 * @param {Object} selection - Current selection (material, level)
 * @param {Function} setSelection - State setter for selection
 * @param {string} view - Current view name
 * @param {Function} setView - State setter for current view
 * @param {Object} quizState - Quiz state (currentQuestionIndex, isAnswered, selectedOption, score, history)
 * @param {Function} setQuizState - State setter for quiz state
 */
export default function StudentDashboard() {
  const auth = React.useContext(AuthContext);
  const user = React.useContext(UserContext);
  const hasInitializedOnboarding = user.hasInitializedOnboarding;

  const displayName = auth.displayName || auth.userName;
  const userName = auth.userName;
  const streakState = user.streakState || { weeklyActivityCount: 0, completedHistory: [] };
  const onboardingData = user.onboardingData || {};
  const studentNotifications = user.studentNotifications || [];
  const setStudentNotifications = user.setStudentNotifications || (() => {});
  const selection = user.selection || {};
  const setSelection = user.setSelection || (() => {});
  const view = auth.view;
  const setView = auth.setView;
  const quizState = user.quizState;
  const setQuizState = user.setQuizState;

  // Initialize notifications polling
  useNotifications(setStudentNotifications);

  const { materials: dbMaterials } = useMaterials();
  const materials = dbMaterials || [];
  // Loaders removed: dashboard renders immediately (no early returns)
  const resolveMaterial = (m) => {
    if (!m) return null;
    if (typeof m === 'string' || typeof m === 'number') return materials.find(x => x.id === m) || null;
    if (m.id) return materials.find(x => x.id === m.id) || m;
    return m;
  };
  const currentMaterial = resolveMaterial(onboardingData?.material);

  // Speed up initial render by checking localStorage for the last selection
  const storedSelection = getStoredSelection();
  const storedMaterial = resolveMaterial(storedSelection?.material);
  const displayMaterial = currentMaterial || storedMaterial || null;
  const storedMaterialId = storedSelection?.material || null;
  const resolvedDisplayMaterial = displayMaterial || materials.find(m => m.id === storedMaterialId) || null;
  const displayTitle = resolvedDisplayMaterial?.title || storedSelection?.materialTitle || 'Language Track';
  const displayIcon = resolvedDisplayMaterial?.icon || storedSelection?.materialIcon || 'book';
  const displayColor = resolvedDisplayMaterial?.color || storedSelection?.materialColor || '#00F2FF';

  // Show an initial loader while waiting for DB materials/onboarding or stored selection.
  // Behavior:
  //  - Wait until DB readiness detected (materials present or onboarding material or stored selection).
  //  - Once DB is ready, keep showing the loader for an additional 10 seconds.
  //  - As a safety, do not block indefinitely: fallback to hide after 10 seconds total from mount.
  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    let mounted = true;
    let hideTimer = null;
    // safety absolute timeout (10s)
    const absoluteTimer = setTimeout(() => {
      if (mounted) {
        setShowLoader(false);
        if (hideTimer) clearTimeout(hideTimer);
      }
    }, 10000);

    const checkReady = () => {
      return (materials && materials.length > 0) || !!onboardingData?.material || !!storedSelection?.material;
    };

    if (checkReady()) {
      // DB already ready on mount — keep loader for 10 more seconds
      hideTimer = setTimeout(() => { if (mounted) setShowLoader(false); }, 10000);
    } else {
      // Watch for readiness changes by polling a few times via micro-interval
      const interval = setInterval(() => {
        if (checkReady()) {
          clearInterval(interval);
          hideTimer = setTimeout(() => { if (mounted) setShowLoader(false); }, 10000);
        }
      }, 250);
      // clear interval on unmount
      // store reference so we can clear below
      // attach to hideTimer variable for cleanup simplicity
      hideTimer = interval;
    }

    return () => {
      mounted = false;
      try { if (hideTimer) clearTimeout(hideTimer); } catch (e) {}
      try { clearTimeout(absoluteTimer); } catch (e) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials?.length, onboardingData?.material, storedSelection?.material]);

  

  // Normalize current material id for comparisons (onboardingData.material may be an id or object)
  const currentMaterialId = resolvedDisplayMaterial?.id || (onboardingData?.material && (typeof onboardingData.material === 'object' ? onboardingData.material.id : onboardingData.material)) || storedMaterialId || null;
  const currentMaterialIdStr = currentMaterialId != null ? String(currentMaterialId) : null;

  const handleLogout = async () => {
    try {
      setView('login');
      auth.setUserName('');
      auth.setLoginError('');
      auth.setLoginNotice('');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const sendPraise = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      const created = await createNotification(userId, 'praise', userId, null);
      if (created && created.id) {
        setStudentNotifications(prev => [created, ...(prev || [])]);
      }
    } catch (err) {
      console.error('sendPraise failed', err);
    }
  };

  const reminder = (studentNotifications || []).find(n => n.type === 'reminder') || null;
  const praise = (studentNotifications || []).find(n => n.type === 'praise') || null;


  const weeklyTarget = onboardingData?.lessonsPerWeek || 3;
  // Compute weekly progress from unique lessons completed in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentUniqueLessons = (() => {
    try {
      const set = new Set();
      (streakState?.completedHistory || []).forEach(h => {
        const lid = h?.lessonId ?? h?.lesson_id ?? null;
        const d = h?.date ? new Date(h.date) : null;
        if (!lid || !d) return;
        if (d >= sevenDaysAgo) set.add(lid);
      });
      return set.size;
    } catch (e) {
      return 0;
    }
  })();
  const progressPerc = Math.min(100, (recentUniqueLessons || 0) / weeklyTarget * 100);

  const dismissPraise = async (e) => {
      e.stopPropagation();
      if (!praise) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          await deleteNotification(userId, praise.id);
          const refreshed = await getNotifications(userId);
          setStudentNotifications(refreshed || []);
        }
      } catch (err) {
        console.error('Failed to dismiss praise:', err);
      }
  };

  // No blocking onboarding loader — render immediately even while onboarding initializes

  if (showLoader) {
    return (
      <CenteredLoader typingText="iSpeaktu" />
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
      <Header title={`Hello, ${displayName || userName}`} subtitle="Your learning dashboard" showStreak streakState={streakState} onLogout={handleLogout} />
      
      <div className="mb-8">
          <div className="flex justify-between items-end mb-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
            <span>Weekly Goal</span>
            <span className="text-white">{recentUniqueLessons} / {weeklyTarget} sessions</span>
          </div>
        <div className="h-3 w-full bg-[#16161D] rounded-full overflow-hidden border border-[#2D2D3A]">
           <div className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-1000" style={{ width: `${progressPerc}%` }} />
        </div>
      </div>

      {/* --- TUTOR PRAISE (THUMBS UP) --- */}
      {praise && (() => {
        // prefer the persisted lesson title (snake_case or camelCase); do not show track
        let match = null;
        try {
          match = (streakState?.completedHistory || []).find(h => (h.lessonId || h.lesson_id) === (praise.lesson_id || null));
        } catch (e) {
          match = null;
        }
        const lessonTitle = match?.lesson_title || match?.lessonTitle || praise.lesson_title || praise.lessonTitle || '';
        const score = match?.score ?? praise?.score ?? null;
        const isPerfect = score === 100;

        const avatarBase = 'w-12 h-12 rounded-xl flex items-center justify-center shrink-0';
        const avatarClass = isPerfect ? avatarBase + ' bg-[#BF40FF] border border-[#DF80FF] shadow-[0_0_20px_rgba(191,64,255,0.7)]' : avatarBase + ' bg-[#00FF9420]';

        return (
          <div className="mb-8 p-5 bg-[#00FF9415] border border-[#00FF9440] rounded-2xl flex items-center gap-4 border-l-4 relative group animate-in zoom-in-95">
              <div className={avatarClass}>
                 <ThumbsUp size={24} className={isPerfect ? 'text-white' : 'text-[#00FF94]'} />
              </div>
              <div className="flex-1">
                  <h3 className="text-[#00FF94] font-black text-sm mb-1 uppercase tracking-wider">Teacher Shout-out!</h3>
                    <p className="text-white/80 text-sm leading-snug">Lesson {praise.lesson_id || ''}{lessonTitle ? `: ${lessonTitle}` : ''} completed! Your teacher sent you a <strong>Thumbs Up</strong>! Keep it up!</p>
              </div>
              <button onClick={dismissPraise} className="p-2 text-white/20 hover:text-white transition-colors">
                  <X size={16} />
              </button>
          </div>
        );
      })()}

      {reminder && (
          <div onClick={() => {
              const mat = onboardingData.material;
              const lvl = onboardingData.level;
              setSelection({ material: mat, level: lvl, lessonNumber: reminder.lesson_id });
              setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
              setView('quiz');
          }} className="mb-8 p-5 bg-[#FF2E6315] border border-[#FF2E6340] rounded-2xl flex items-start gap-4 cursor-pointer hover:bg-[#FF2E6325] transition-all border-l-4 shadow-[0_0_20px_rgba(255,46,99,0.1)] group">
              <div className="w-12 h-12 bg-[#FF2E6320] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                 <Bell size={24} className="text-[#FF2E63] animate-swing" />
              </div>
              <div>
                  <h3 className="text-[#FF2E63] font-black text-sm mb-1 uppercase tracking-wider">Teacher Notification</h3>
                  <p className="text-white/80 text-sm leading-snug">
                     Your teacher has requested that you retake <strong>Lesson {reminder.lesson_id}</strong>. Practice makes perfect!
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-[#FF2E63] uppercase tracking-widest flex items-center gap-1">
                      Tap to start retake <ChevronRight size={12} />
                  </div>
              </div>
          </div>
      )}

      <div className="mb-10">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-4">My Current Track</h4>
          {/* Always show student's track card (use fallbacks if DB/onboarding not yet loaded) */}
          <Card 
            className="border-[#00F2FF40] bg-[#00F2FF05] animate-in fade-in" 
            onClick={() => { 
              setSelection({ 
                material: resolvedDisplayMaterial || onboardingData.material || storedSelection?.material, 
                level: onboardingData.level || '' 
              }); 
              setView('select_lesson'); 
            }}
          >
            <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00F2FF20] border border-[#00F2FF40]">
                          <Icon name={displayIcon} style={{ color: displayColor }} />
                        </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-white">{displayTitle}</h3>
                                <p className="text-[#00F2FF] text-xs font-bold uppercase">{onboardingData?.level || 'Select Level'}</p>
                              </div>
                <div className="px-4 py-2 bg-[#00F2FF] text-[#0A0A0C] rounded-lg font-bold text-xs uppercase">{streakState.completedHistory.length === 0 ? 'Start' : 'Continue'}</div>
            </div>
          </Card>
      </div>

      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Explore Tracks</h4>
      <div className="grid grid-cols-1 gap-4">
        {materials.filter(m => String(m.id) !== currentMaterialIdStr).map((mat) => (
          <Card key={mat.id} onClick={() => { setSelection({ material: mat }); setView('select_level'); }}>
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#1C1C26] border border-[#2D2D3A] flex items-center justify-center">
                <Icon name={mat.icon} style={{ color: mat.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">{mat.title}</h3>
                      <p className="text-white opacity-50 text-sm">{(mat.levels || []).length} Levels</p>
              </div>
              <ChevronRight className="text-white opacity-40" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
