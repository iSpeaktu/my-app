// Extracted from App.js - Header component (original lines 645-685)
import React from 'react';
import { useUserContext } from '../../context/UserContext';
import { ChevronLeft, User, Star, Flame } from 'lucide-react';
import Icon from './Icon';

/**
 * Header component for displaying page title, avatar, XP, and streak
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {boolean} showBack - Show back button
 * @param {Function} onBack - Back button handler
 * @param {boolean} showStreak - Show weekly streak display
 * @param {object} streakState - Streak state with completedHistory and weeklyStreak
 * @param {string} avatarUrl - Avatar image URL
 * @param {Function} onLogout - Logout button handler
 */
export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  showStreak = false,
  streakState,
  avatarUrl,
  onLogout
}) {
  const user = useUserContext();
  const streakStateSafe = streakState || user?.streakState || { completedHistory: [], weeklyStreak: 0 };
  const completed = Array.isArray(streakStateSafe.completedHistory) ? streakStateSafe.completedHistory : [];
  // Prefer persisted/computed XP if available on streakState, otherwise fall back to simple count
  const totalXP = (typeof streakStateSafe.xp === 'number') ? streakStateSafe.xp : (completed.filter(h => h.passed).length * 10);
  const perfectStreak = typeof streakStateSafe.perfectStreak === 'number' ? streakStateSafe.perfectStreak : 0;
  
  return (
    <div className="mb-12 px-2">
      {/* Top muted sub-header: stat pills only */}
      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-md bg-white/5 border border-[#2D2D3A]">
        <div />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-[#2D2D3A]">
            <Star size={14} className="text-[#7000FF]" fill="currentColor" />
            <span className="text-sm font-bold text-[#7000FF]">{totalXP} XP</span>
          </div>
          {showStreak && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-[#2D2D3A]">
              <Flame size={14} className="text-[#FFD700]" fill="currentColor" />
              <span className="text-sm font-bold text-white">{streakStateSafe.weeklyStreak}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-[#2D2D3A]">
            <Flame size={14} className="text-[#FFD700]" fill="currentColor" />
            <span className="text-sm font-bold text-white">{perfectStreak}</span>
          </div>
        </div>
      </div>

      {/* Main title row: large title and controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#2D2D3A] rounded-full text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="text-sm text-white/60 mt-1 truncate max-w-[72vw]">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-[#16161D] border border-[#2D2D3A] flex items-center justify-center text-white/40 hover:text-[#FF2E63]"
          >
            <Icon name="LogOut" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
