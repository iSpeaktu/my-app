// Extracted from App.js - ResultsView component (original lines 804-851)
import React from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';

/**
 * QuizResultsView - Quiz completion results screen
 * Displays accuracy score, pass/fail status, and detailed mistake breakdown with feedback.
 * 
 * @param {Object} quizState - Quiz state containing score and history array
 * @param {number} quizState.score - Number of correct answers
 * @param {Array} quizState.history - Array of quiz items with { selected, correct, options[], question, feedback }
 * @param {Function} setView - State setter to navigate back to dashboard
 */
export default function QuizResultsView({ quizState, setView }) {
  const percentage = Math.round((quizState.score / quizState.history.length) * 100);
  const passed = percentage >= 70;
  const missed = quizState.history.filter(h => h.selected !== h.correct);

  return (
    <div className="max-w-xl mx-auto py-12 px-6 animate-in zoom-in-95">
      <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center p-8 rounded-[2.5rem] mb-6 ${passed ? 'bg-[#00FF9410] border border-[#00FF9440]' : 'bg-[#FF2E6310] border border-[#FF2E6340]'}`}>
              {passed ? <Trophy className="text-[#FFD700]" size={64} /> : <AlertTriangle className="text-[#FF2E63]" size={64} />}
          </div>
          <h2 className="text-4xl font-black text-white mb-2">{passed ? 'Excellent!' : 'Keep Practicing'}</h2>
          <div className={`text-5xl font-black mb-2 ${passed ? 'text-[#00FF94]' : 'text-[#FF2E63]'}`}>{percentage}%</div>
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Accuracy Score</p>
      </div>

      {missed.length > 0 && (
        <div className="space-y-6 mb-10">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Mistake Breakdown</h4>
          {missed.map((m, i) => (
            <div key={i} className="bg-[#16161D] border border-[#2D2D3A] p-6 rounded-2xl animate-in slide-in-from-bottom-4 transition-all">
               <p className="text-white font-bold mb-4 text-sm leading-relaxed">"{m.question}"</p>
               <div className="space-y-2 mb-4">
                 <div className="flex items-center gap-2 text-xs font-bold">
                   <span className="text-[#FF2E63] uppercase tracking-tighter w-20 shrink-0">Your Choice:</span>
                   <span className="text-white/80">{m.options[m.selected]}</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold">
                   <span className="text-[#00FF94] uppercase tracking-tighter w-20 shrink-0">Correct:</span>
                   <span className="text-white">{m.options[m.correct]}</span>
                 </div>
               </div>
               <div className="pt-4 border-t border-[#2D2D3A] text-xs leading-relaxed">
                  <span className="text-[#00F2FF] font-black uppercase tracking-widest block mb-1">Feedback:</span>
                  <p className="text-white/60 italic">{m.feedback}</p>
               </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setView('dashboard')} className="w-full btn-primary bg-[#00F2FF] text-[#0A0A0C] py-5 rounded-2xl font-bold text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all">
          Return to Learning
      </button>
    </div>
  );
};
