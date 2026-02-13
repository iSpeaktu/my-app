import React from 'react';

export default function LoadingSpinner({ size = 8, message = null }) {
  const px = size;
  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full h-${px} w-${px} border-b-2 border-[#00F2FF]`} />
        {message ? <p className="mt-4 text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}
