// Extracted from App.js - Header component (original lines 645-685)
import React from 'react';
import { ChevronLeft, User, Star, Flame } from 'lucide-react';
import { Icon } from './Icon';

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
export const Header = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showStreak = false,
  streakState,
  avatarUrl,
  onLogout
}) => {
  const totalXP = streakState.completedHistory.filter(h => h.passed).length * 10; // XP Rule: +10 per lesson
  
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#2D2D3A] rounded-full text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {avatarUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#2D2D3A] bg-[#0A0A0C]">
            <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#16161D] border border-[#2D2D3A] flex items-center justify-center text-white/30">
            <User size={18} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-white opacity-60 text-sm font-medium">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7000FF15] rounded-full border border-[#7000FF30]">
          <Star size={14} className="text-[#7000FF]" fill="currentColor" />
          <span className="text-[#7000FF] font-bold text-xs">{totalXP} XP</span>
        </div>
        {showStreak && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD70015] rounded-full border border-[#FFD70030]">
            <Flame size={14} className="text-[#FFD700]" fill="currentColor" />
            <span className="text-[#FFD700] font-bold text-xs">{streakState.weeklyStreak}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-full bg-[#16161D] border border-[#2D2D3A] flex items-center justify-center text-white/40 hover:text-[#FF2E63]"
        >
          <Icon name="LogOut" size={18} />
        </button>
      </div>
    </div>
  );
};
