import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function CenteredLoader({ typingText = '', size = 8, typing = true }) {
  const [typedCaption, setTypedCaption] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!typing || !typingText) return;
    let mounted = true;
    let idx = 0;
    let charTimer = null;
    let cursorTimer = null;
    // start typing
    charTimer = setInterval(() => {
      if (!mounted) return;
      idx += 1;
      setTypedCaption(typingText.slice(0, idx));
      if (idx >= typingText.length) {
        clearInterval(charTimer);
      }
    }, 80);
    cursorTimer = setInterval(() => {
      if (!mounted) return;
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      mounted = false;
      try { if (charTimer) clearInterval(charTimer); } catch (e) {}
      try { if (cursorTimer) clearInterval(cursorTimer); } catch (e) {}
    };
  }, [typingText, typing]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center px-6">
        <LoadingSpinner size={size} />
        {typingText ? (
          <div className="text-white/80 text-sm font-semibold mt-3">
            <span>{typedCaption}</span>
            <span className={`ml-1 inline-block w-2 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>
              |
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
