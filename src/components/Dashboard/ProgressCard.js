// Extracted from App.js - ProgressCard component (original lines 993-1001)
import React from 'react';

/**
 * ProgressCard - Reusable stat card for displaying key metrics
 * Displays a label and large numeric value in a dark themed card.
 * 
 * @param {string} label - The metric label (e.g., "Lessons Passed")
 * @param {number|string} value - The metric value to display
 * @param {string} color - Hex color for the label text (e.g., "#00F2FF", "#7000FF")
 */
export default function ProgressCard({ label, value, color = '#00F2FF' }) {
  return (
    <div className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl">
      <div className="text-[10px] font-black uppercase mb-1 tracking-widest" style={{ color }}>
        {label}
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}
