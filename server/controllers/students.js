const { adminSupabase } = require('../supabaseClient');

// Helper to compute XP for all lessons for a student (simple first-pass algorithm)
function computeTotalXPFromHistory(history) {
  const attemptsByLesson = {};
  (history || []).forEach(h => {
    const lid = h.lesson_id || h.lessonId || null;
    if (!lid) return;
    attemptsByLesson[lid] = attemptsByLesson[lid] || [];
    attemptsByLesson[lid].push(h);
  });
  let total = 0;
  Object.values(attemptsByLesson).forEach(attempts => {
    const ordered = (attempts || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let firstPassingIndex = -1;
    let firstPassingScore = null;
    for (let i = 0; i < ordered.length; i++) {
      const s = typeof ordered[i].score === 'number' ? ordered[i].score : -1;
      if (s >= 70) {
        firstPassingIndex = i + 1;
        firstPassingScore = s;
        break;
      }
    }
    if (firstPassingIndex === -1) return;
    if (firstPassingIndex === 1) total += (firstPassingScore === 100) ? 15 : 10;
    else if (firstPassingIndex === 2) total += 5;
    else if (firstPassingIndex === 3) total += 3;
  });
  return total;
}

exports.getProfile = async (req, res) => {
  const { studentId } = req.params;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle();
    if (error) throw error;
    return res.json({ success: true, profile: data || null });
  } catch (err) {
    console.error('getProfile error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch profile' });
  }
};

exports.getProgress = async (req, res) => {
  const { studentId } = req.params;
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
    if (error) throw error;
    return res.json({ success: true, progress: data || null });
  } catch (err) {
    console.error('getProgress error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch progress' });
  }
};

exports.updateProgress = async (req, res) => {
  const { studentId } = req.params;
  const updates = req.body || {};
  try {
    const { data, error } = await supabase.from('students').update(updates).eq('id', studentId).select().maybeSingle();
    if (error) throw error;
    return res.json({ success: true, updated: data });
  } catch (err) {
    console.error('updateProgress error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update progress' });
  }
};

exports.getHistory = async (req, res) => {
  const { studentId } = req.params;
  const limit = parseInt(req.query.limit || '100', 10);
  try {
    const { data, error } = await supabase.from('lesson_history').select('*').eq('student_id', studentId).order('created_at', { ascending: true }).limit(limit);
    if (error) throw error;
    return res.json({ success: true, history: data || [] });
  } catch (err) {
    console.error('getHistory error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch history' });
  }
};

exports.getAchievements = async (req, res) => {
  const { studentId } = req.params;
  if (!studentId) return res.status(400).json({ success: false, error: 'studentId required' });
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('badge_name, achieved_at')
      .eq('student_id', studentId)
      .order('achieved_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, achievements: data || [] });
  } catch (err) {
    console.error('getAchievements error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch achievements' });
  }
};

// Record lesson history, compute XP and update student progress
exports.recordHistory = async (req, res) => {
  const { studentId } = req.params;
  const { lessonNumber, lessonTrackId, level, score, passed, failures } = req.body || {};
  if (!studentId) return res.status(400).json({ success: false, error: 'studentId required' });
  try {
    // Insert history row
    const payload = {
      student_id: studentId,
      lesson_id: lessonNumber,
      lesson_track_id: lessonTrackId || null,
      level: level || null,
      score: typeof score === 'number' ? score : null,
      passed: !!passed,
      failures: Array.isArray(failures) ? failures : []
    };
    const { error: insertErr } = await adminSupabase.from('lesson_history').insert([payload]);
    if (insertErr) throw insertErr;

    // Recompute total XP from history and update student row
    const { data: historyRows, error: histErr } = await adminSupabase.from('lesson_history').select('*').eq('student_id', studentId);
    if (histErr) throw histErr;
    const totalXp = computeTotalXPFromHistory(historyRows || []);

    // Compute perfect streak (consecutive perfect scores). Simple approach: count last consecutive 100s
    const sorted = (historyRows || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let perfectStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const s = typeof sorted[i].score === 'number' ? sorted[i].score : -1;
      if (s === 100) perfectStreak += 1; else break;
    }

    // Update student row with new xp and perfect streak
    const { data: updatedStudent, error: updErr } = await adminSupabase.from('students').update({ xp: totalXp, perfect_streak: perfectStreak }).eq('id', studentId).select().maybeSingle();
    if (updErr) throw updErr;

    return res.json({ success: true, xp: totalXp, perfect_streak: perfectStreak, student: updatedStudent });
  } catch (err) {
    console.error('recordHistory error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to record history' });
  }
};
