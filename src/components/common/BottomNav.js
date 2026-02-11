// Extracted from App.js - BottomNav component (original lines 1138-1152)
import React from 'react';
import Icon from './Icon';

/**
 * Bottom navigation bar for main app views
 * @param {string} view - Current active view
 * @param {Function} setView - Function to change view
 */
export default function BottomNav({ view, setView }) {
  return (
  <div className="fixed bottom-0 w-full bg-[#0A0A0C]/90 backdrop-blur-xl border-t border-[#2D2D3A] flex justify-around py-5 z-20">
    {[
      { id: 'dashboard', icon: 'Book', label: 'Learning' },
      { id: 'progress', icon: 'BarChart3', label: 'Progress' },
      { id: 'settings', icon: 'Settings', label: 'Settings' }
    ].map(tab => (
      <button
        key={tab.id}
        onClick={() => setView(tab.id)}
        className={`flex flex-col items-center gap-1.5 transition-all ${
          view === tab.id ? 'text-[#00F2FF]' : 'text-white opacity-30 hover:opacity-100'
        }`}
      >
        <Icon name={tab.icon} size={22} />
        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
      </button>
    ))}
  </div>
  );
}
