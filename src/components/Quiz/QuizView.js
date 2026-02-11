import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useUserContext } from '../../context/UserContext';
import { useLessonContent } from '../../hooks/useLessonContent';
import Icon from '../common/Icon';

export default function QuizView() {
  const auth = useAuthContext();
  const user = useUserContext();

  const selection = user.selection;
  const quizState = user.quizState || { currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] };
  const setQuizState = user.setQuizState;

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
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              disabled={quizState.isAnswered}
              onClick={() => handleAnswer(i)}
              className={`w-full p-6 rounded-2xl border text-left transition-all ${
                quizState.isAnswered
                  ? (i === currentQ.answer
                      ? 'border-[#00FF94] bg-[#00FF9408]'
                      : (i === quizState.selectedOption ? 'border-[#FF2E63] bg-[#FF2E6308]' : 'border-[#2D2D3A] opacity-40'))
                  : 'border-[#2D2D3A] bg-[#16161D] hover:bg-[#1C1C26]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold ${
                  quizState.isAnswered && i === currentQ.answer ? 'bg-[#00FF94] text-[#0A0A0C]' : 'opacity-40'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-medium text-lg">{opt}</span>
                {quizState.isAnswered && i === currentQ.answer && <Icon name="CheckCircle2" size={20} className="ml-auto text-[#00FF94]" />}
              </div>
            </button>
          ))}
        </div>

        {/* Instant Feedback Panel */}
        {quizState.isAnswered && (
          <div className="mt-8 p-6 rounded-2xl border bg-white/5 border-white/10 animate-fade-in text-sm text-white/80">
            <p><strong className="text-[#00F2FF]">{quizState.selectedOption === currentQ.answer ? 'Correct!' : 'Review:'}</strong> {currentQ.feedback}</p>
          </div>
        )}
      </div>

      {/* Fixed Action Footer */}
      <div className="fixed bottom-6 left-0 w-full p-6 border-t border-[#2D2D3A] bg-[#0A0A0C]/80 backdrop-blur-md flex justify-end z-50">
        <button
          disabled={!quizState.isAnswered}
          onClick={nextStep}
          className={`px-10 py-4 rounded-xl font-bold bg-[#00F2FF] text-[#0A0A0C] transition-all shadow-lg ${!quizState.isAnswered ? 'opacity-20 cursor-not-allowed' : ''}`}
        >
          {quizState.currentQuestionIndex === content.questions.length - 1 ? 'Finish Results' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
