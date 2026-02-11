// Extracted from App.js - Card component (original lines 647-651)
import React from 'react';

/**
 * Reusable card button component with consistent styling
 * @param {React.ReactNode} children - Card content
 * @param {Function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export const Card = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full bg-[#16161D] border border-[#2D2D3A] rounded-2xl p-5 text-left transition-all hover:border-[#00F2FF40] hover:bg-[#1C1C26] active:scale-[0.98] ${className}`}
  >
    {children}
  </button>
);
