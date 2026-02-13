import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function LearningPathLoader({ message = 'LOADING TRACKS...', size = 20 }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="flex flex-col items-center px-6">
        <LoadingSpinner size={size} />
        <div className="text-[#00F2FF] font-extrabold text-2xl uppercase tracking-widest animate-pulse mt-4" style={{ textShadow: '0 6px 0 #001218, 0 18px 40px rgba(0,242,255,0.16)' }}>{message}</div>
      </div>
    </div>
  );
}
