// Materials controllers implemented with Supabase
const { supabase } = require('../supabaseClient');

exports.getMaterials = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lesson_tracks')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const materials = (data || []).map(m => ({
      id: m.id,
      title: m.lesson_track || m.lesson_track_name || m.title || m.name || m.display_name || 'Track',
      levels: Array.isArray(m.levels) ? m.levels : (m.levels ? [m.levels] : []),
      icon: m.icon || null,
      color: m.color || null,
    }));
    return res.json({ success: true, materials });
  } catch (err) {
    console.error('getMaterials error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load materials' });
  }
};

// GET lesson by composite key track_id/level/lessonNumber
exports.getLessonByCompositeKey = async (req, res) => {
  const { materialId } = req.params;
  const level = req.query.level;
  const lessonNumber = req.query.lessonNumber;
  try {
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('track_id', materialId)
      .eq('level', level)
      .eq('lesson_number', lessonNumber)
      .maybeSingle();
    if (lessonErr) throw lessonErr;
    if (!lessonRow || !lessonRow.id) return res.json({ success: true, lesson: null, questions: [] });

    const { data: qrows, error: qerr } = await supabase
      .from('lesson_questions')
      .select('id, question_text, explanation, lesson_choices(id, choice_text, is_correct)')
      .eq('lesson_id', lessonRow.id);
    if (qerr) throw qerr;

    const questions = (qrows || []).map(q => {
      const choices = (q.lesson_choices || []).map(c => ({ text: c.choice_text, is_correct: c.is_correct }));
      const answerIndex = choices.findIndex(c => c.is_correct === true);
      const options = choices.map(c => c.text);
      return {
        id: q.id,
        question: q.question_text,
        options,
        answer: answerIndex >= 0 ? answerIndex : 0,
        feedback: q.explanation || ''
      };
    });

    return res.json({ success: true, lesson: { id: lessonRow.id, title: lessonRow.title }, questions });
  } catch (err) {
    console.error('getLessonByCompositeKey error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load lesson' });
  }
};

exports.getLessonQuestions = async (req, res) => {
  const { lessonId } = req.params;
  try {
    const { data: qrows, error: qerr } = await supabase
      .from('lesson_questions')
      .select('id, question_text, explanation, lesson_choices(id, choice_text, is_correct)')
      .eq('lesson_id', lessonId);
    if (qerr) throw qerr;
    const questions = (qrows || []).map(q => {
      const choices = (q.lesson_choices || []).map(c => ({ text: c.choice_text, is_correct: c.is_correct }));
      const answerIndex = choices.findIndex(c => c.is_correct === true);
      const options = choices.map(c => c.text);
      return {
        id: q.id,
        question: q.question_text,
        options,
        answer: answerIndex >= 0 ? answerIndex : 0,
        feedback: q.explanation || ''
      };
    });
    return res.json({ success: true, questions });
  } catch (err) {
    console.error('getLessonQuestions error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load questions' });
  }
};
