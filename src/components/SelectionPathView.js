// Extracted from App.js - SelectionPath component (original lines 1122-1137)
import React from 'react';
import { Header, Card, Icon, CenteredLoader } from './common';
import { useAuthContext } from '../context/AuthContext';
import { useUserContext } from '../context/UserContext';
import { useMaterials } from '../hooks/useMaterials';

/**
 * SelectionPathView - Level selection interface
 * Displays available lesson levels for the selected material in cards.
 * User can click on a level to proceed to lesson selection.
 * 
 * @param {Object} selection - Current selection state containing material and level
 * @param {Object} selection.material - Selected material with title and levels array
 * @param {Function} setSelection - State setter for selection
 * @param {Function} setView - State setter for current view
 */
export default function SelectionPathView(props) {
  const auth = useAuthContext();
  const user = useUserContext();

  const selection = props.selection || user.selection;
  const setSelection = props.setSelection || user.setSelection;
  const setView = props.setView || auth.setView;

  const { materials: dbMaterials } = useMaterials();
  if (!dbMaterials || dbMaterials.length === 0) {
    return (
      <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
        <Header title="Choose Level" subtitle="Loading tracks..." showBack onBack={() => setView('dashboard')} />
        <CenteredLoader typingText="Loading tracks from server..." size={16} />
      </div>
    );
  }

  // Guard: if no material selected, show a helpful message
  if (!selection || !selection.material) {
    return (
      <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
        <Header title="Choose Level" subtitle="No material selected" showBack onBack={() => setView('dashboard')} />
        <div className="mt-6 p-4 bg-[#16161D] border border-[#2D2D3A] rounded-lg text-white/70">
          No material selected. Go back to the dashboard and pick a track first.
        </div>
      </div>
    );
  }

  const levels = Array.isArray(selection.material.levels) ? selection.material.levels : [];

  return (
    <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
      <Header title="Choose Level" subtitle={selection.material.title} showBack onBack={() => setView('dashboard')} />
      <div className="space-y-4">
        {levels.map((l) => (
          <Card key={l} onClick={() => { setSelection({ ...selection, level: l }); setView('select_lesson'); }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{l}</span>
              <Icon name="ChevronRight" size={20} className="opacity-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
