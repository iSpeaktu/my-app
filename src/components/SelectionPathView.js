// Extracted from App.js - SelectionPath component (original lines 1122-1137)
import React from 'react';
import { Header, Card, Icon } from './common';

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
export const SelectionPathView = ({ selection, setSelection, setView }) => (
  <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
    <Header title="Choose Level" subtitle={selection.material?.title} showBack onBack={() => setView('dashboard')} />
    <div className="space-y-4">
      {selection.material?.levels.map(l => (
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
