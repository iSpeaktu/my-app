import React from 'react';

export default function LoadingSpinner({ size = 8, message = 'Loading...' }) {
  const px = size;
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className={`animate-spin rounded-full h-${px} w-${px} border-b-2 border-[#00F2FF]`} />
        <p className="mt-4 text-white/70">{message}</p>
      </div>
    </div>
  );
}
