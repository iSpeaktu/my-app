import React from 'react';

/**
 * BrandMascot - Animated SVG mascot
 */
const BrandMascot = ({ size = 200 }) => (
  <div className="relative flex items-center justify-center">
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-xl"
    >
      <circle cx="250" cy="250" r="240" fill="#000000" className="opacity-100" />
      <path d="M210 410C210 410 80 340 80 180C80 100 150 70 210 70V410Z" fill="#FFFFFF" style={{ transformOrigin: 'bottom center', animation: 'sway 3s ease-in-out infinite' }} />
      <rect x="290" y="160" width="70" height="250" fill="#FFFFFF" style={{ animation: 'floatStem 2s ease-in-out infinite' }} />
      <circle cx="325" cy="90" r="35" fill="#FFFFFF" style={{ animation: 'bounceDot 2s ease-in-out infinite' }} />
      <style>{`
        @keyframes sway { 0%,100%{ transform: rotate(-2deg); } 50%{ transform: rotate(2deg); } }
        @keyframes floatStem { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-5px); } }
        @keyframes bounceDot { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-15px); } }
      `}</style>
    </svg>
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-3 bg-black/5 rounded-[100%] blur-sm animate-pulse" />
  </div>
);

/**
 * CenteredLoader - centers the BrandMascot and optional typing caption
 */
export default function CenteredLoader({ typingText = '', size = 250}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <BrandMascot size={size} />
        {typingText ? (
          <div className="text-white font-black mt-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {typingText}
          </div>
        ) : null}
      </div>
    </div>
  );
}