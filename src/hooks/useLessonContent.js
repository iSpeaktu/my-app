// Extracted from App.js - Lesson fetching hook (original lines 2106-2184)
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';

/**
 * useLessonContent - Custom hook for fetching and processing lesson questions from database
 * Handles loading state, error handling, and transformation of db questions/choices into quiz format.
 * 
 * @param {Object} selection - Current selection with material?.id, level, lessonNumber
 * @returns {Object} Lesson content state:
 *   - content: { title, questions[] } or null
 *   - loading: Boolean indicating fetch in progress
 *   - error: Error message string or empty
 *   - noQuestions: Boolean indicating lesson exists but has no questions
 */
export const useLessonContent = (selection) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // requestId to ensure only latest response updates state
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    // increment request id for this request
    const reqId = ++requestIdRef.current;

    const load = async () => {
      // validate selection
      if (!selection?.material?.id || !selection?.level || !selection?.lessonNumber) {
        setContent(null);
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      // clear previous content immediately to avoid flashing stale titles
      setContent(null);

      try {
        // find lesson row by composite key
        const { data: lessonRowRaw, error: lessonErr } = await supabase
          .from('lessons')
          .select('id, title')
          .eq('track_id', selection.material.id)
          .eq('level', selection.level)
          .eq('lesson_number', selection.lessonNumber)
          .maybeSingle();

        if (signal.aborted || reqId !== requestIdRef.current) return;

        if (lessonErr) throw lessonErr;

        let lessonRow = lessonRowRaw || { id: null, title: '' };
        let questions = [];

        if (lessonRow && lessonRow.id) {
          const { data: qrows, error: qerr } = await supabase
            .from('lesson_questions')
            .select('*, lesson_choices (*)')
            .eq('lesson_id', lessonRow.id);

          if (signal.aborted || reqId !== requestIdRef.current) return;

          if (qerr) throw qerr;

          questions = (qrows || []).map(q => {
            const correct = (q.lesson_choices || []).find(c => c.is_correct);
            const wrongs = (q.lesson_choices || []).filter(c => !c.is_correct);

            const limitedChoices = [
              correct,
              ...wrongs.sort(() => 0.5 - Math.random()).slice(0, 2)
            ].sort(() => 0.5 - Math.random());

            return {
              question: q.question_text,
              options: limitedChoices.map(c => c.choice_text),
              answer: limitedChoices.findIndex(c => c.is_correct),
              feedback: q.explanation
            };
          }).filter(q => q.question && q.options && q.options.length === 3);
        }

        if (signal.aborted || reqId !== requestIdRef.current) return;

        setContent({ title: lessonRow?.title || '', questions });
      } catch (err) {
        if (signal.aborted) return; // ignore abort errors
        setError(err?.message || 'Failed to load lesson');
        setContent(null);
      } finally {
        if (!signal.aborted && reqId === requestIdRef.current) setLoading(false);
      }
    };

    load();

    // cleanup: abort any in-flight requests for this effect
    return () => {
      controller.abort();
    };
  }, [selection?.material?.id, selection?.level, selection?.lessonNumber]);

  return { content, loading, error };
};

/**
 * getLessonLoadingUI - Helper component for loading state
 * @param {string} studentName - Personalized greeting name
 */
export const getLessonLoadingUI = (studentName = 'Student') => ({
  loading: true,
  message: 'Loading lesson...'
});

/**
 * getLessonErrorUI - Helper component for error state
 * @param {string} error - Error message to display
 */
export const getLessonErrorUI = (error) => ({
  error: true,
  message: error
});

/**
 * getLessonNoQuestionsUI - Helper component for no questions state
 * @param {string} studentName - Personalized greeting name
 */
export const getLessonNoQuestionsUI = (studentName = 'Student') => ({
  noQuestions: true,
  message: `Hi ${studentName}, lessons will be available soon. You can check back later.`
});
