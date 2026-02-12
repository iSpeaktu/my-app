import React, { useState } from 'react';
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

  // Hook state must be declared unconditionally at top-level of the component
  const [showStartCard, setShowStartCard] = useState(false);
  const [activeLessonData, setActiveLessonData] = useState(null);
  const [pressedLesson, setPressedLesson] = useState(null);

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


  const handleClick = (num, isFuture, isCurrent, e) => {
    // If locked future lesson, ignore clicks
    if (isFuture && !isCurrent) return;
    // Prevent outer click handlers from immediately closing the mini-card
    try { e.stopPropagation(); } catch (err) {}
    // Show start mini-card inside the button container
    setActiveLessonData({ lessonNumber: num, title: materialSpec?.title || selection.material?.title || 'Lesson', isCurrent });
    setShowStartCard(true);
  };

  const startQuiz = () => {
    // Begin the lesson: persist selection and navigate to quiz
    const num = activeLessonData?.lessonNumber;
    setShowStartCard(false);
    setActiveLessonData(null);
    if (typeof num !== 'number') return;
    setSelection({ ...selection, lessonNumber: num });
    if (typeof setQuizState === 'function') {
      setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
    }
    setView('quiz');
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
      <Header title="Learning Path" subtitle={`${selection.material?.title} • ${selection.level}`} showBack onBack={() => setView('dashboard')} />

      <div onClick={() => { setShowStartCard(false); setActiveLessonData(null); }} className="relative flex flex-col items-center pb-40 space-y-24">
        {/* Central Vertical Line */}
        <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#00F2FF] via-[#00F2FF30] to-transparent left-1/2 -translate-x-1/2 -z-10" />

        {lessonNumbers.map((num, i) => {
          const history = historyForMaterialLevel;
          const h = history.filter(a => a.lessonId === num).slice(-1)[0];
          const isPassed = h && h.passed;
          const isPerfect = h && typeof h.score === 'number' && h.score === 100;
          const isHighScore = h && typeof h.score === 'number' && h.score >= 70 && h.score < 100;
          const isFailed = h && typeof h.score === 'number' && h.score < 70;
          const isCurrent = num === maxCompleted + 1;
          const isFuture = num > maxCompleted + 1;

          const labelClass = `absolute -top-12 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-lg ${isCurrent ? 'border-[#00F2FF] bg-[#00F2FF20] text-[#00F2FF]' : (isFailed ? 'border-[#FF3131] bg-[#FF313110] text-[#FF3131] shadow-[0_0_20px_rgba(255,49,49,0.6)]' : 'border-[#1f2937] bg-[#1f293720] text-[#004e57] shadow-[0_0_6px_rgba(0,78,87,0.12)]')}`;
          // Solid 3D color mapping: locked, current, or default
          const state3dClass = isFuture && !isCurrent ? 'btn-locked' : (isCurrent ? 'btn-cyan-pop' : 'btn-pop');
          // Initialize defaults for every lesson: dark bg and teal text
          let bgClass = 'bg-[#1f2937]';
          let bottomClass = 'bg-[#0f1724]';
          let textClass = 'text-[#004e57]';
          // Only override for current or failed
          if (isCurrent) {
            bgClass = 'bg-[#00F2FF]';
            bottomClass = 'bg-[#008F9F]';
            textClass = 'text-[#0A0A0C]';
          } else if (isFailed) {
            bgClass = 'bg-[#FF3131]';
            bottomClass = 'bg-[#c02a2a]';
            textClass = 'text-white';
          } else if (isFuture) {
            // future (locked) appearance
            bgClass = 'bg-[#1F1F23]';
            bottomClass = 'bg-[#0b0b0d]';
            textClass = 'text-white/70';
          }

          const baseBtn = `w-20 h-20 rounded-full relative flex items-center justify-center transition-transform duration-150 active:translate-y-1 ${bgClass} ${textClass}`;
          const animClass = isCurrent ? 'animate-current-rotate animate-current-bounce scale-110' : '';
          const buttonClass = `${baseBtn} ${animClass}`;
          const isPressed = pressedLesson === num;
          // Compute button shadow: cyan for current, red for failed, subtle dark for defaults
          let boxShadowVal = `0px ${isPressed ? 2 : 8}px 0px rgba(0,0,0,0.6)`;
          if (isCurrent) {
            boxShadowVal = `0px ${isPressed ? 2 : 8}px 0px #008f9f`;
          } else if (isFailed) {
            boxShadowVal = `0px ${isPressed ? 2 : 8}px 0px rgba(255,49,49,0.6)`;
          }

          const contentForButton = isFailed ? (
            <Icon name="Flag" size={32} />
          ) : isPassed ? (
            <Icon name="CheckCircle2" size={32} />
          ) : isCurrent ? (
            <span style={{ color: '#0A0A0C' }} className="font-bold text-2xl">{num}</span>
          ) : (
            <span style={{ color: '#004e57' }} className="font-bold text-2xl">{num}</span>
          );

          return (
            <div key={num} className={`relative flex items-center w-full ${i % 2 !== 0 ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-1/2 flex flex-col items-center relative">
                {/* Floating Lesson Label */}
                <div className={labelClass}>Lesson {num}</div>

                {/* Lesson Button (Node) */}
                <button
                  onClick={(e) => handleClick(num, isFuture, isCurrent, e)}
                  onMouseDown={() => setPressedLesson(num)}
                  onMouseUp={() => setPressedLesson(null)}
                  onMouseLeave={() => setPressedLesson(null)}
                  onTouchStart={() => setPressedLesson(num)}
                  onTouchEnd={() => setPressedLesson(null)}
                  className={buttonClass}
                  style={{
                    border: 'none',
                    boxShadow: boxShadowVal,
                    transition: 'transform 0.12s, box-shadow 0.12s'
                  }}
                >
                  <span className="relative z-10">{contentForButton}</span>
                </button>

                {/* Mini Pop Card (positioned inside button container) */}
                {showStartCard && activeLessonData?.lessonNumber === num && (
                  (() => {
                    // Card should reflect lesson status: cyan only for current, slate for passed
                    const cardBg = isCurrent ? '#008f9f' : (isPassed ? '#1f2937' : '#1C1C26');
                    const cardBorder = isCurrent ? '#00F2FF' : '#2D2D3A';
                    const cardBoxShadow = isCurrent ? '0 20px 40px rgba(0,242,255,0.14)' : '0 10px 20px rgba(0,0,0,0.4)';
                    const triangleColor = cardBg;
                    const btnIsPassed = isPassed;
                    const insideBtnLabel = btnIsPassed ? 'REVIEW' : 'START';
                    const insideBtnClass = btnIsPassed ? 'w-full py-1 rounded-md bg-[#004e57] text-white font-bold flex flex-row items-center justify-center gap-2 active:translate-y-1' : 'w-full py-1 rounded-md bg-white text-[#008f9f] font-bold flex flex-row items-center justify-center gap-2 active:translate-y-1';

                    return (
                      <div onClick={(e) => e.stopPropagation()} className="absolute w-40 p-2 rounded-xl text-xs" style={{ left: '50%', transform: 'translateX(-50%)', bottom: 'calc(100% + 12px)', background: cardBg, border: `1.5px solid ${cardBorder}`, boxShadow: cardBoxShadow, position: 'absolute' }}>
                        <p className="font-black text-xs text-white">Lesson {activeLessonData.lessonNumber}</p>
                        <p className="text-[10px] truncate text-white">{activeLessonData.title}</p>

                        <div className="mt-2">
                          <button onClick={(e) => { e.stopPropagation(); startQuiz(); }} className={insideBtnClass} style={{ paddingTop: 6, paddingBottom: 6 }}>
                            <span className="text-[11px] font-bold">{insideBtnLabel}</span>
                            <span className="text-[10px] text-[#008f9f] font-bold">+10 XP</span>
                          </button>
                        </div>

                        {/* Message tail (small triangle) */}
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -6, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${triangleColor}` }} />
                      </div>
                    );
                  })()
                )}
              </div>
              <div className="w-1/2" />
            </div>
          );
        })}
      </div>
      {/* Inline mini-card handled per-button; no full-screen overlay needed */}
    </div>
  );
}
