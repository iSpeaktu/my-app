import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { useLessonContent } from '../../hooks/useLessonContent';
import Icon from '../common/Icon';

export default function QuizView() {
  const auth = useAuthContext();
  const user = useUserContext();
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    if (user && user.quizState && user.quizState.isAnswered) {
      setJustActivated(true);
      const t = setTimeout(() => setJustActivated(false), 300);
      return () => clearTimeout(t);
    }
  }, [user && user.quizState && user.quizState.isAnswered]);

  const quizState = user.quizState || { currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] };
  const setQuizState = user.setQuizState;

  const selection = user.selection;
  const { content, loading, error, noQuestions } = useLessonContent(selection);

  if (loading) return <div className="p-6 text-center text-white/70">Loading lesson...</div>;
  if (error) return <div className="p-6 text-center text-red-400">{error}</div>;
  if (!content || noQuestions) return <div className="p-6 text-center text-white/70">No questions available for this lesson.</div>;

  const currentQ = content.questions[quizState.currentQuestionIndex] || { question: '', options: [], answer: 0, feedback: '' };

  const handleAnswer = (idx) => {
    if (quizState.isAnswered) return;
    const isCorrect = idx === currentQ.answer;
    const newScore = isCorrect ? (quizState.score || 0) + 1 : (quizState.score || 0);
    const newHistoryItem = { selected: idx, correct: currentQ.answer, question: currentQ.question, options: currentQ.options, feedback: currentQ.feedback };
    if (typeof setQuizState === 'function') {
      setQuizState({
        ...quizState,
        isAnswered: true,
        selectedOption: idx,
        score: newScore,
        history: [...(quizState.history || []), newHistoryItem]
      });
    }
  };

  const nextStep = () => {
    const lastIndex = content.questions.length - 1;
    if (quizState.currentQuestionIndex >= lastIndex) {
      auth.setView('results');
      return;
    }
    if (typeof setQuizState === 'function') {
      setQuizState({ currentQuestionIndex: quizState.currentQuestionIndex + 1, isAnswered: false, selectedOption: null, score: quizState.score || 0, history: quizState.history || [] });
    }
  };

  const progressPerc = content.questions.length ? (quizState.currentQuestionIndex / content.questions.length) * 100 : 0;

  const nextShadowColor = quizState.selectedOption === currentQ.answer ? '#005f6b' : '#008f9f';
  const disabledShadowColor = '#2D2D3A';
  

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 flex flex-col min-h-screen pb-28 animate-in fade-in">
      {/* Header & Progress Bar */}
      <div className="flex items-center gap-6 mb-12">
        <button onClick={() => auth.setView('dashboard')} className="text-white opacity-40"><Icon name="XCircle" size={28} /></button>
        <div className="flex-1 h-2 bg-[#16161D] rounded-full overflow-hidden border border-[#2D2D3A]">
          <div
            className="h-full bg-[#00F2FF] transition-all duration-500"
            style={{ width: `${progressPerc}%` }}
          />
        </div>
        <div className="text-[10px] font-bold text-white/40">
          {quizState.currentQuestionIndex + 1} / {content.questions.length}
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-white mb-10 leading-relaxed">{currentQ.question}</h2>
        <div className="space-y-4">
          {/* The RPC now supplies exactly 3 options; render them directly */}
          { (currentQ.options || []).map((opt, i) => {
            const isSelected = i === quizState.selectedOption;
            // base styles: 3D solid shadow (4px) with cyan shadow color
            const baseClass = 'w-full p-6 rounded-2xl text-left transition-all';
            let styleBg = {
              background: '#16161D',
              border: '1px solid #2D2D3A',
              boxShadow: '0px 4px 0px #2D2D3A',
              color: '#E6FFFF'
            };

            if (quizState.isAnswered) {
              if (isSelected) {
                // Selected (correct or wrong): keep background, highlight with neon-cyan border and cyan solid shadow
                styleBg = {
                  background: '#16161D',
                  border: '2px solid #00F2FF',
                  boxShadow: '0px 4px 0px #008f9f',
                  color: '#E6FFFF'
                };
              } else {
                // dim unselected options but keep 3D base shadow
                styleBg = {
                  background: '#16161D',
                  border: '1px solid #2D2D3A',
                  boxShadow: '0px 4px 0px #2D2D3A',
                  opacity: 0.45,
                  color: '#E6FFFF'
                };
              }
            }

            return (
              <button
                key={i}
                disabled={quizState.isAnswered}
                onClick={() => handleAnswer(i)}
                className={baseClass}
                style={styleBg}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"`}
                    style={{ background: 'transparent', color: '#E6FFFF', border: '1px solid #2D2D3A' }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium text-lg">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline feedback handled in fixed bottom panel when answered */}
      </div>

      {/* Fixed Bottom Feedback / Action Panel */}
      {quizState.isAnswered ? (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <div className="w-full p-4 flex items-center justify-between" style={{ background: quizState.selectedOption === currentQ.answer ? '#008f9f' : '#ffdfe0' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4" style={{ color: quizState.selectedOption === currentQ.answer ? '#E6FFFF' : '#ea2b2b' }}>
              <div className="flex items-center gap-3">
                <Icon name={quizState.selectedOption === currentQ.answer ? 'Check' : 'X'} size={quizState.selectedOption === currentQ.answer ? 20 : 15} className={quizState.selectedOption === currentQ.answer ? 'text-white' : 'text-[#ea2b2b]'} />
                <div className="font-bold" style={{ color: quizState.selectedOption === currentQ.answer ? '#FFFFFF' : '#ea2b2b' }}>
                  {quizState.selectedOption === currentQ.answer ? 'Correct!' : 'Incorrect'}
                </div>
              </div>
              <div
                className="text-base"
                style={quizState.selectedOption === currentQ.answer ? { color: '#E6FFFF', fontWeight: 700, fontSize: '16px' } : { color: '#ea2b2b', fontWeight: 700, fontSize: '16px' }}
              >
                {currentQ.feedback}
              </div>
            </div>
            <div className="px-6">
              <button
                onClick={nextStep}
                className={`px-6 py-3 rounded-xl ${justActivated ? 'scale-105' : ''} active:translate-y-1 transform-gpu transition-transform duration-150`}
                style={{
                  background: '#00F2FF',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '14px',
                  boxShadow: `0px 5px 0px ${nextShadowColor}`
                }}
              >
                {quizState.currentQuestionIndex === content.questions.length - 1 ? 'Finish Results' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <div className="w-full flex justify-end px-6 py-4" style={{ background: 'transparent' }}>
            <button
              disabled={!quizState.isAnswered}
              onClick={nextStep}
              className={`px-10 py-4 rounded-xl ${justActivated ? 'scale-105' : ''} active:translate-y-1 transform-gpu transition-transform duration-150`}
              style={quizState.isAnswered ? {
                background: '#00F2FF', color: '#FFFFFF', boxShadow: `0px 5px 0px ${nextShadowColor}`, fontWeight: 900, fontSize: '14px'
              } : {
                background: '#1F1F23', color: '#9CA3AF', opacity: 0.1, boxShadow: `0px 5px 0px ${disabledShadowColor}`
              }}
            >
              {quizState.currentQuestionIndex === content.questions.length - 1 ? 'Finish Results' : 'Next Question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
