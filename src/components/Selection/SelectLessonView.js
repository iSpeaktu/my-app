import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import Header from '../common/Header';
import Icon from '../common/Icon';
import { MATERIALS_DATA } from '../../constants/materials';
import { useMaterials } from '../../hooks/useMaterials';

export default function SelectLessonView(props) {
  const auth = useAuthContext();
  const user = useUserContext();

  const selection = props.selection || user.selection;
  const setSelection = props.setSelection || user.setSelection;
  const setView = props.setView || auth.setView;
  const setQuizState = user.setQuizState;
  const streakState = user.streakState || { completedHistory: [] };

  const material = selection?.material || null;
  const level = selection?.level || null;

  const { materials: dbMaterials } = useMaterials();
  const sourceMaterials = (dbMaterials && dbMaterials.length) ? dbMaterials : MATERIALS_DATA;
  const materialSpec = material || sourceMaterials.find(m => m.id === selection?.material?.id) || null;

  if (!materialSpec || !level) {
    return (
      <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
        <Header title="Learning Path" subtitle={`No material selected`} showBack onBack={() => setView('dashboard')} />
        <div className="mt-6 p-4 bg-[#16161D] border border-[#2D2D3A] rounded-lg text-white/70">No material or level chosen. Go back and pick a track and level first.</div>
      </div>
    );
  }

  const lessonNumbers = [1,2,3,4,5,6,7,8];

  const historyForMaterialLevel = streakState.completedHistory.filter(h => h.material === selection.material?.id && h.level === selection.level);
  const maxCompleted = historyForMaterialLevel.filter(h => h.passed).reduce((max, h) => Math.max(max, h.lessonId), 0);

  const handleClick = (num, isFuture, isCurrent) => {
    if (!isFuture || isCurrent) {
      setSelection({ ...selection, lessonNumber: num });
      if (typeof setQuizState === 'function') {
        setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
      }
      setView('quiz');
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
      <Header title="Learning Path" subtitle={`${selection.material?.title} • ${selection.level}`} showBack onBack={() => setView('dashboard')} />

      <div className="relative flex flex-col items-center pb-40 space-y-24">
        {/* Central Vertical Line */}
        <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#00F2FF] via-[#00F2FF30] to-transparent left-1/2 -translate-x-1/2 -z-10" />

        {lessonNumbers.map((num, i) => {
          const history = historyForMaterialLevel;
          const h = history.filter(a => a.lessonId === num).slice(-1)[0];
          const isPassed = h && h.passed;
          const isFailed = h && !h.passed;
          const isCurrent = num === maxCompleted + 1;
          const isFuture = num > maxCompleted + 1;

          return (
            <div key={num} className={`relative flex items-center w-full ${i % 2 !== 0 ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-1/2 flex flex-col items-center relative">
                {/* Floating Lesson Label */}
                <div className={`absolute -top-12 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-lg ${isFailed ? 'bg-[#FF2E63] text-white border-[#FF2E63]' : (isPassed ? 'bg-[#1C1C26] text-[#00FF94] border-[#00FF9430]' : (isCurrent ? 'bg-[#00F2FF] text-[#0A0A0C] border-[#00F2FF]' : 'bg-[#1C1C26] text-white/20 border-[#2D2D3A]'))}` }>
                  Lesson {num}
                </div>

                {/* Lesson Button (Node) */}
                <button onClick={() => handleClick(num, isFuture, isCurrent)}
                  className={`w-20 h-20 rounded-2xl border-2 relative flex items-center justify-center transition-all shadow-[0_8px_20px_rgba(0,0,0,0.5)] focus:border-[#00F2FF] focus:outline-none 
                    ${isFailed ? 'border-[#FF2E63] text-[#FF2E63]' : (isPassed ? 'border-[#00FF9440] text-[#00FF94]' : (isCurrent ? 'border-[#00F2FF] text-[#0A0A0C] scale-110 shadow-[0_0_30px_rgba(0,242,255,0.3),0_8px_20px_rgba(0,0,0,0.5)]' : 'border-gray-200 text-gray-400'))} 
                    ${isCurrent ? 'bg-[#00F2FF]' : 'bg-gray-100'} 
                    ${isFuture && !isCurrent ? 'opacity-30' : 'opacity-100'}`}
                >
                  {isPassed ? <Icon name="CheckCircle2" size={32} /> : (isFailed ? <Icon name="Flag" size={32} /> : <span className="font-bold text-2xl">{num}</span>)}
                </button>
              </div>
              <div className="w-1/2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
