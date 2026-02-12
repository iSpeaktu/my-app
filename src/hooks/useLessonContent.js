// Extracted from App.js - Lesson fetching hook (original lines 2106-2184)
import { useState, useEffect } from 'react';
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
  // --- STATE INITIALIZATION (original lines 2107-2110) ---
  const [dbContent, setDbContent] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState('');
  const [dbNoQuestions, setDbNoQuestions] = useState(false);

  // --- FETCH LESSON FROM DATABASE (original lines 2112-2184) ---
  useEffect(() => {
    let active = true;
    const loadLessonFromDb = async () => {
      // Validate selection before querying
      if (!selection.material?.id || !selection.level || !selection.lessonNumber) {
        if (active) {
          setDbContent(null);
          setDbError('');
          setDbNoQuestions(false);
          setDbLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setDbLoading(true);
          setDbError('');
          setDbNoQuestions(false);
        }

        console.info('[useLessonContent] selection', {
          track_id: selection.material?.id || null,
          level: selection.level || null,
          lesson_number: selection.lessonNumber || null
        });

        // New fetcher: resolve lesson id then fetch lesson_questions + choices
        let lessonRow = null;
        let questions = [];

        // First find the lesson id for the current selection
        const { data: lessonRowRaw, error: lessonErr } = await supabase
          .from('lessons')
          .select('id, title')
          .eq('track_id', selection.material.id)
          .eq('level', selection.level)
          .eq('lesson_number', selection.lessonNumber)
          .maybeSingle();

        if (lessonErr) throw lessonErr;
        if (!lessonRowRaw || !lessonRowRaw.id) {
          // No lesson found — leave questions empty
          lessonRow = lessonRowRaw || { id: null, title: '' };
          questions = [];
        } else {
          lessonRow = lessonRowRaw;
          const lessonId = lessonRow.id;

          const { data: qrows, error: qerr } = await supabase
            .from('lesson_questions')
            .select('*, lesson_choices (*)')
            .eq('lesson_id', lessonId);
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

        console.info('[useLessonContent] db result', {
          lesson_id: lessonRow?.id || null,
          lesson_title: lessonRow?.title || '',
          usable_question_count: questions.length,
        });

        // --- SET CONTENT IF VALID QUESTIONS EXIST ---
        if (active) {
          setDbContent({
            title: lessonRow?.title || '',
            questions
          });
          // Flag if lesson row exists but no usable questions
          setDbNoQuestions(!lessonRow?.id || questions.length === 0);
        }
      } catch (err) {
        if (active) {
          setDbError(err?.message || 'Failed to load lesson');
          setDbContent(null);
          setDbNoQuestions(false);
        }
      } finally {
        if (active) setDbLoading(false);
      }
    };

    loadLessonFromDb();
    return () => { active = false; };
  }, [selection.material?.id, selection.level, selection.lessonNumber]);

  return {
    content: dbContent,
    loading: dbLoading,
    error: dbError,
    noQuestions: dbNoQuestions,
  };
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
