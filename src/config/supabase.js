// Extracted from supabaseClient.js - Supabase configuration and API functions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// This is the missing piece Vercel is looking for!
export const HAS_SUPABASE = supabaseUrl && supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// API proxy base (set REACT_APP_API_URL to e.g. http://localhost:4000)
const API_BASE = process.env.REACT_APP_API_URL || '';

async function apiFetch(path, options = {}) {
  try {
    const base = API_BASE || '';
    const url = base ? `${base.replace(/\/$/, '')}${path}` : path;
    // Attach Authorization header with current access token when available
    const opts = { ...options };
    opts.headers = opts.headers ? { ...opts.headers } : {};
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      // ignore
    }
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return JSON.parse(text); } catch (e) { return text; }
  } catch (err) {
    console.warn('apiFetch failed', err);
    throw err;
  }
}

const ensureTeacherProfile = async (user, displayName) => {
  try {
    const userId = user?.id || null;
    if (!userId) {
      console.warn('No user ID available for teacher profile');
      return;
    }

    const display = displayName || user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.user_metadata?.username || null;

    // Ensure profile exists first to satisfy teachers.id FK -> profiles.id
    let profileError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase
        .from('profiles')
        .upsert([{ id: userId, full_name: display || null, role: 'teacher' }], { onConflict: 'id', returning: 'minimal' });
      if (!error) {
        profileError = null;
        break;
      }
      profileError = error;
      if (error?.code === '23503') {
        console.warn('Profile not ready, retrying...');
        await new Promise(res => setTimeout(res, 600));
        continue;
      }
      break;
    }
    if (profileError) throw profileError;

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase
        .from('teachers')
        .upsert([{ id: userId, display_name: display || null }], { onConflict: 'id', returning: 'minimal' });
      if (!error) {
        lastError = null;
        break;
      }
      lastError = error;
      if (error?.code === '23503') {
        console.warn('Profile not ready, retrying...');
        await new Promise(res => setTimeout(res, 600));
        continue;
      }
      break;
    }
    if (lastError) throw lastError;
  } catch (err) {
    console.error('✗ Failed to ensure teachers row:', err);
    throw err;
  }
};
// --- STUDENT LOGIN (by name only) ---
export const studentLogin = async (studentName) => {
  try {
    if (!studentName || !studentName.trim()) {
      throw new Error('Student name is required');
    }

    const normalizedName = studentName.trim().toLowerCase();

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, full_name, role')
      .eq('username', normalizedName)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingProfile) {
      return { student: existingProfile, isNewStudent: false };
    }

    return { student: null, isNewStudent: true };
  } catch (error) {
    console.error('Student login error:', error);
    throw error;
  }
};
// --- TEACHER LOGIN (by code only) ---
export const teacherLogin = async (teacherCode) => {
  try {
    if (!teacherCode || !teacherCode.trim()) {
      throw new Error('Teacher code is required');
    }

    // Verify teacher code in database
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('code', teacherCode.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Invalid teacher code');
      }
      throw error;
    }

    return { teacher };
  } catch (error) {
    console.error('Teacher login error:', error);
    throw error;
  }
};

// --- GET ALL STUDENTS (for teacher dashboard) ---
export const getAllStudents = async () => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Prefer a human-friendly display name when available
    return (students || []).map(s => {
      const display = s.full_name || s.username || (s.email ? s.email.split('@')[0] : '');
      return { ...s, name: display };
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
};

// --- UPDATE STUDENT DATA ---
export const updateStudentData = async (studentName, updates) => {
  try {
    if (!studentName) throw new Error('studentName required');
    const normalized = (studentName || '').toLowerCase();

    // Try to resolve profile -> id by username or full_name
    const { data: profileMatch, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .or(`username.eq.${normalized},full_name.eq.${normalized}`)
      .maybeSingle();
    if (profileErr) throw profileErr;

    const userId = profileMatch?.id || null;
    if (!userId) {
      // If studentName looks like a UUID, attempt to update by id directly
      const maybeId = studentName;
      const isUuid = typeof maybeId === 'string' && /^[0-9a-fA-F-]{36}$/.test(maybeId);
      if (!isUuid) {
        throw new Error('Could not resolve student id for update');
      }
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', maybeId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    try {
      // Log helpful error fields if present (Postgres / Supabase error shape)
      const details = {
        message: error?.message || String(error),
        code: error?.code || null,
        hint: error?.hint || null,
        details: error?.details || null,
        status: error?.status || null,
        response: error?.response || null,
      };
      console.error('Error updating student:', details);
    } catch (logErr) {
      console.error('Error updating student (failed to format):', error);
    }
    throw error;
  }
};

// --- STUDENT EMAIL/PASSWORD AUTH ---
export const studentAuthSignIn = async (email, password) => {
  try {
    if (!email || !password) throw new Error('Email and password required');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  } catch (err) {
    console.error('studentAuthSignIn error:', err);
    throw err;
  }
};
export const studentAuthSignUp = async (email, password, fullName) => {
  try {
    if (!email || !password) throw new Error('Email and password required');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student', full_name: fullName || null }
      }
    });
    if (error) throw error;
    if (data?.user?.id) {
      const userId = data.user.id;
      let profileError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error } = await supabase
          .from('profiles')
          .upsert([{ id: userId, full_name: fullName || null, role: 'student' }], { onConflict: 'id', returning: 'minimal' });
        if (!error) {
          profileError = null;
          break;
        }
        profileError = error;
        if (error?.code === '23503') {
          console.warn('Profile not ready, retrying...');
          await new Promise(res => setTimeout(res, 600));
          continue;
        }
        break;
      }
      if (profileError) throw profileError;

      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error } = await supabase
          .from('students')
          .insert([
            { id: userId, xp: 0, weekly_streak: 0, lessons_per_week: 3 }
          ], { returning: 'minimal' });
        if (!error) {
          lastError = null;
          break;
        }
        lastError = error;
        if (error?.code === '23503') {
          console.warn('Profile not ready, retrying...');
          await new Promise(res => setTimeout(res, 600));
          continue;
        }
        break;
      }
      if (lastError) throw lastError;
    }
    return data.user;
  } catch (err) {
    console.error('studentAuthSignUp error:', err);
    throw err;
  }
};
// Find a student's email by username or display name (case-insensitive)
export const findStudentEmailByUsername = async (identifier) => {
  try {
    const normalized = (identifier || '').trim().toLowerCase();
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .or(`username.eq.${normalized},full_name.eq.${normalized}`)
      .maybeSingle();

    if (error) throw error;
    return data?.email || null;
  } catch (err) {
    console.error('findStudentEmailByUsername error:', err);
    return null;
  }
};
// Send password reset email for a student (Supabase will email a reset link)
export const studentAuthResetPassword = async (email, redirectTo) => {
  try {
    if (!email) throw new Error('Email required');
    // redirectTo is optional - Supabase will redirect user there after they set a new password
    const options = {};
    if (redirectTo) options.redirectTo = redirectTo;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, options);
    if (error) throw error;
  } catch (err) {
    console.error('studentAuthResetPassword error:', err);
    throw err;
  }
};

export const assignStudentToTeacher = async (userId, teacherUserId, inviteToken) => {
  try {
    if (!userId || !teacherUserId) throw new Error('User and teacher required');
    if (userId === teacherUserId) throw new Error('Student and teacher cannot be the same user');
    if (!inviteToken) throw new Error('Invite token required');
    
    // Perform the student update
    const { error } = await supabase
      .from('students')
      .upsert([{ id: userId, teacher_id: teacherUserId }], { onConflict: 'id', returning: 'minimal' });
    if (error) throw error;

    // Perform the classroom update via RPC to validate invite token under RLS
    const { error: classroomErr } = await supabase
      .rpc('accept_teacher_invite', { p_token: inviteToken, p_student: userId });
    if (classroomErr) throw classroomErr;

    // FIX: Simply return true or a success message instead of 'data'
    return { success: true }; 
  } catch (err) {
    console.error('assignStudentToTeacher error:', err);
    throw err;
  }
};
export const getTeacherRoster = async () => {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    const userId = sessionData?.session?.user?.id;
    if (!userId) return [];

    const { data: classroomRows, error: classroomErr } = await supabase
      .from('classrooms')
      .select('student_id')
      .eq('teacher_id', userId);
    if (classroomErr) throw classroomErr;

    // Debug: log classroomRows to help diagnose missing students
    try { console.debug('[getTeacherRoster] classroomRows:', classroomRows); } catch (e) {}

    let studentIds = (classroomRows || []).map(r => r.student_id).filter(Boolean);
    // Defensive sanitization: ensure ids are strings and strip any accidental suffixes (e.g. ":1")
    studentIds = studentIds.map(id => typeof id === 'string' ? id.split(':')[0] : String(id)).filter(Boolean);
    try { console.debug('[getTeacherRoster] initial studentIds:', studentIds); } catch (e) {}
    let students = null;
    if (studentIds.length === 0) {
      const { data: byTeacher, error: byTeacherErr } = await supabase
        .from('students')
        .select('id, teacher_id, current_lesson_track_id, current_level, xp, weekly_streak, perfect_streak')
        .eq('teacher_id', userId);
      if (byTeacherErr) throw byTeacherErr;
      students = byTeacher || [];
      studentIds = students.map(s => s.id).filter(Boolean);
    } else {
      // Defensive sanitization for ids coming from DB
      studentIds = studentIds.map(id => typeof id === 'string' ? id.split(':')[0] : String(id)).filter(Boolean);
      const { data: byIds, error: studentsErr } = await supabase
        .from('students')
        .select('id, teacher_id, current_lesson_track_id, current_level, xp, weekly_streak, perfect_streak')
        .in('id', studentIds);
      if (studentsErr) throw studentsErr;
      students = byIds || [];
      try { console.debug('[getTeacherRoster] students byIds length:', students.length); } catch (e) {}
    }

    if (studentIds.length === 0) {
      try { console.debug('[getTeacherRoster] no studentIds found, returning empty roster'); } catch (e) {}
      return [];
    }

    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', studentIds);
    if (profilesErr) throw profilesErr;

    try { console.debug('[getTeacherRoster] profiles length:', (profiles || []).length); } catch (e) {}

    const { data: historyRows, error: historyErr } = await supabase
      .from('lesson_history')
      .select('student_id, lesson_id, score, passed, failures, created_at, lesson_track_id, level')
      .in('student_id', studentIds)
      .order('created_at', { ascending: true });
    if (historyErr) throw historyErr;

    // Fetch lesson titles by matching (track_id, level, lesson_number).
    // historyRows may store lesson_id as the lesson_number (not lessons.id), so we match by composite key.
    const compositeKeys = (historyRows || []).map(h => ({
      track_id: h.lesson_track_id || null,
      level: h.level || null,
      lesson_number: h.lesson_id || null,
    })).filter(k => k.track_id && k.lesson_number !== null && k.lesson_number !== undefined);
    const uniqueTrackIds = [...new Set(compositeKeys.map(k => k.track_id))];
    const uniqueLessonNumbers = [...new Set(compositeKeys.map(k => k.lesson_number))];
    let lessonTitleByComposite = new Map();
    if (uniqueTrackIds.length > 0 && uniqueLessonNumbers.length > 0) {
      const { data: lessonsData, error: lessonsErr } = await supabase
        .from('lessons')
        .select('id, track_id, level, lesson_number, title')
        .in('track_id', uniqueTrackIds)
        .in('lesson_number', uniqueLessonNumbers);
      if (!lessonsErr && lessonsData) {
        lessonsData.forEach(l => {
          const key = `${l.track_id}__${l.level || ''}__${l.lesson_number}`;
          lessonTitleByComposite.set(key, l.title);
        });
      }
      // Attempt to backfill lesson_title for students where possible (do not block on failures)
      try {
        Promise.allSettled((studentIds || []).map(sid => backfillLessonTitlesForStudent(sid)));
      } catch (e) {
        console.debug('Non-fatal: backfill attempt failed to start', e);
      }
    }

    const profileById = new Map((profiles || []).map(p => [p.id, p]));
    const studentById = new Map((students || []).map(s => [s.id, s]));
    const historyById = new Map();
    (historyRows || []).forEach(h => {
      if (!historyById.has(h.student_id)) historyById.set(h.student_id, []);
      historyById.get(h.student_id).push({
        date: h.created_at,
        lessonId: h.lesson_id,
        score: h.score,
        passed: h.passed,
        failures: h.failures || [],
        materialId: h.lesson_track_id || null,
        level: h.level || null
      });
    });

      return studentIds.map(id => {
      const profile = profileById.get(id) || {};
      const student = studentById.get(id) || {};
      const history = (historyById.get(id) || []).map(h => {
        const material = h.materialId || student.current_lesson_track_id || null;
        const level = h.level || student.current_level || null;
        const compositeKey = `${material}__${level || ''}__${h.lessonId}`;
        const lessonTitleResolved = lessonTitleByComposite.get(compositeKey) || null;
        return {
          ...h,
          material,
          level,
          lessonTitle: lessonTitleResolved,
          lesson_title: lessonTitleResolved
        };
      });
      const last = history.length ? history[history.length - 1] : null;
      const display = profile.full_name || profile.username || 'Student';
      return {
        id,
        name: display,
        avatarUrl: profile.avatar_url || null,
        progress: student.current_level || 'Beginner',
        lastScore: typeof last?.score === 'number' ? last.score : 0,
        lastLessonId: last?.lessonId || 1,
        lastMaterialId: student.current_lesson_track_id || null,
        lastLevel: student.current_level || null,
        xp: typeof student.xp === 'number' ? student.xp : 0,
        perfectStreak: typeof student.perfect_streak === 'number' ? student.perfect_streak : 0,
        weeklyStreak: typeof student.weekly_streak === 'number' ? student.weekly_streak : 0,
        history,
        historyLoaded: true
      };
    });
  } catch (err) {
    console.error('getTeacherRoster error:', err);
    return [];
  }
};

export const getStudentHistoryForTeacher = async (studentId) => {
  try {
    if (!studentId) return [];
    const { data: historyRows, error: historyErr } = await supabase
      .from('lesson_history')
      .select('student_id, lesson_id, score, passed, failures, created_at, lesson_track_id, level')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    if (historyErr) throw historyErr;
    // Resolve lesson titles by (track_id, level, lesson_number)
    const triplets = new Set();
    const trackIds = new Set();
    const levels = new Set();
    const lessonNumbers = new Set();
    (historyRows || []).forEach(r => {
      const track = r.lesson_track_id || null;
      const lvl = r.level || null;
      const ln = r.lesson_id || null;
      if (track && lvl && ln !== null && ln !== undefined) {
        triplets.add(`${track}||${lvl}||${ln}`);
        trackIds.add(track);
        levels.add(lvl);
        lessonNumbers.add(ln);
      }
    });
    let lessonTitleMap = new Map();
    if (triplets.size > 0) {
      const { data: lessonsData, error: lessonsErr } = await supabase
        .from('lessons')
        .select('track_id, level, lesson_number, title')
        .in('track_id', [...trackIds])
        .in('level', [...levels])
        .in('lesson_number', [...lessonNumbers]);
      if (!lessonsErr && lessonsData) {
        lessonsData.forEach(l => {
          lessonTitleMap.set(`${l.track_id}||${l.level}||${l.lesson_number}`, l.title);
        });
      }
    }

    // Try to backfill lesson_title for this student (best-effort)
    try { await backfillLessonTitlesForStudent(studentId); } catch (e) { /* ignore */ }

    return (historyRows || []).map(h => ({
      date: h.created_at,
      lessonId: h.lesson_id,
      lessonTitle: lessonTitleMap.get(`${h.lesson_track_id}||${h.level}||${h.lesson_id}`) || null,
      lesson_title: lessonTitleMap.get(`${h.lesson_track_id}||${h.level}||${h.lesson_id}`) || null,
      score: h.score,
      passed: h.passed,
      failures: h.failures || []
    }));
  } catch (err) {
    console.error('getStudentHistoryForTeacher error:', err);
    return [];
  }
};
export const getTeacherNameByUserId = async (teacherUserId) => {
  try {
    if (!teacherUserId) return null;
    // Prefer the canonical name stored on profiles.full_name; fall back to teachers.display_name
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', teacherUserId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (profile?.full_name) {
      return profile.full_name;
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('display_name')
      .eq('id', teacherUserId)
      .maybeSingle();
    if (error) throw error;
    return data?.display_name || null;
  } catch (err) {
    console.error('getTeacherNameByUserId error:', err);
    return null;
  }
};
// --- TEACHER EMAIL/PASSWORD AUTH (email-only) ---
export const teacherAuthSignUp = async (email, password, displayName) => {
  try {
    if (!email || !password) throw new Error('Email and password required');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'teacher', full_name: displayName || null }
      }
    });
    if (error) throw error;

    await ensureTeacherProfile(data?.user, displayName);

    return data.user;
  } catch (err) {
    console.error('teacherAuthSignUp error:', err);
    throw err;
  }
};
export const teacherAuthSignIn = async (email, password) => {
  try {
    if (!email || !password) throw new Error('Email and password required');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await ensureTeacherProfile(data?.user, data?.user?.user_metadata?.full_name || null);
    return data.user;
  } catch (err) {
    console.error('teacherAuthSignIn error:', err);
    throw err;
  }
};
const generateInviteToken = () => {
  // Use a cryptographically secure token for invite links
  const bytes = new Uint8Array(32);
  const cryptoObj = (typeof window !== 'undefined' && window.crypto) || null;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Secure random generator not available');
  }
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createTeacherInvite = async () => {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('teacher_invites')
      .insert([{
        teacher_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date()
      }], { returning: 'minimal' });
    if (error) throw error;
    return { token };
  } catch (err) {
    console.error('createTeacherInvite error:', err);
    throw err;
  }
};

export const redeemTeacherInvite = async (token) => {
  try {
    if (!token) throw new Error('Token required');
    const { data, error } = await supabase
      .from('teacher_invites')
      .select('teacher_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data?.teacher_id || null;
  } catch (err) {
    console.error('redeemTeacherInvite error:', err);
    throw err;
  }
};

// Wait for auth session to become available after signUp
export const waitForAuthSession = async (timeoutMs = 8000, intervalMs = 300) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) return sessionData.session;
    } catch (err) {
      // ignore and retry
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return null;
};

// --- LESSON HISTORY & STUDENT DATA ---
export const recordLessonHistory = async (studentUserId, lessonId, score, passed, failures = [], lessonTrackId = null, level = null) => {
  // Prefer server API to centralize recording logic; fallback to direct Supabase on error
  try {
    const payload = { lessonNumber: lessonId, lessonTrackId, level, score, passed, failures };
    const path = `/api/students/${encodeURIComponent(studentUserId)}/history`;
    const result = await apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (result && result.success) return;
    throw new Error(result?.error || 'API failed');
  } catch (apiErr) {
    console.warn('recordLessonHistory API failed, falling back to Supabase:', apiErr?.message || apiErr);
    try {
      if (!studentUserId) throw new Error('Student user ID required');
      // Attempt original DB insert/update behavior
      let resolvedLessonTitle = null;
      try {
        if (lessonTrackId || level || lessonId) {
          const q = supabase.from('lessons').select('title').limit(1);
          if (lessonTrackId) q.eq('track_id', lessonTrackId);
          if (level) q.eq('level', level);
          if (lessonId !== null && lessonId !== undefined) q.eq('lesson_number', lessonId);
          const { data: lessonRow, error: lessonErr } = await q.maybeSingle();
          if (!lessonErr && lessonRow && lessonRow.title) resolvedLessonTitle = lessonRow.title;
        }
      } catch (resErr) {
        console.debug('Failed to resolve lesson title for history insert:', resErr?.message || resErr);
      }

      let query = supabase
        .from('lesson_history')
        .select('id')
        .eq('student_id', studentUserId)
        .eq('lesson_id', lessonId);
      if (lessonTrackId) query = query.eq('lesson_track_id', lessonTrackId);
      query = query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: existing, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('lesson_history')
          .update({
            score,
            passed,
            failures: failures || [],
            created_at: new Date(),
            lesson_track_id: lessonTrackId || null,
            level: level || null,
            lesson_title: resolvedLessonTitle || null
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
        return;
      }

      const { error } = await supabase
        .from('lesson_history')
        .insert([{
          student_id: studentUserId,
          lesson_id: lessonId,
          score,
          passed,
          failures: failures || [],
          created_at: new Date(),
          lesson_track_id: lessonTrackId || null,
          level: level || null,
          lesson_title: resolvedLessonTitle || null
        }], { returning: 'minimal' });
      if (error) throw error;
    } catch (err) {
      console.error('recordLessonHistory error:', err);
      throw err;
    }
  }
};

export const updateStudentProgress = async (userId, updates) => {
  // Prefer server API, fallback to Supabase client
  try {
    const path = `/api/students/${encodeURIComponent(userId)}/progress`;
    const result = await apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    if (result && result.success) return result.updated || null;
    throw new Error(result?.error || 'API failed');
  } catch (apiErr) {
    console.warn('updateStudentProgress via API failed, falling back to Supabase:', apiErr?.message || apiErr);
    try {
      if (!userId) throw new Error('User ID required');
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', userId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (err) {
      console.error('updateStudentProgress error:', err);
      throw err;
    }
  }
};

export const getStudentProgress = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const path = `/api/students/${encodeURIComponent(userId)}/progress`;
    const result = await apiFetch(path);
    if (result && result.success) return result.progress || null;
  } catch (apiErr) {
    console.warn('getStudentProgress via API failed, falling back to Supabase:', apiErr?.message || apiErr);
  }
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('getStudentProgress error:', err);
    return null;
  }
};

export const getStudentLessonHistory = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const path = `/api/students/${encodeURIComponent(userId)}/history`;
    const result = await apiFetch(path);
    if (result && result.success) return result.history || [];
  } catch (apiErr) {
    console.warn('getStudentLessonHistory via API failed, falling back to Supabase:', apiErr?.message || apiErr);
  }
  try {
    const { data, error } = await supabase
      .from('lesson_history')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getStudentLessonHistory error:', err);
    return [];
  }
};

// Backfill missing lesson_title values in lesson_history for a given student.
export const backfillLessonTitlesForStudent = async (studentId) => {
  try {
    if (!studentId) return false;
    // Fetch rows that are missing lesson_title but have enough composite info
    const { data: rows, error: rowsErr } = await supabase
      .from('lesson_history')
      .select('id, lesson_id, lesson_track_id, level')
      .eq('student_id', studentId)
      .is('lesson_title', null);
    if (rowsErr) throw rowsErr;
    if (!rows || rows.length === 0) return true;

    // Build sets to query lessons
    const trackIds = new Set();
    const levels = new Set();
    const lessonNumbers = new Set();
    rows.forEach(r => {
      if (r.lesson_track_id && r.level != null && r.lesson_id != null) {
        trackIds.add(r.lesson_track_id);
        levels.add(r.level);
        lessonNumbers.add(r.lesson_id);
      }
    });
    if (trackIds.size === 0) return true;

    const { data: lessonsData, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, track_id, level, lesson_number, title')
      .in('track_id', [...trackIds])
      .in('level', [...levels])
      .in('lesson_number', [...lessonNumbers]);
    if (lessonsErr) throw lessonsErr;
    const titleMap = new Map();
    (lessonsData || []).forEach(l => {
      titleMap.set(`${l.track_id}||${l.level}||${l.lesson_number}`, l.title);
    });

    // Update each row individually with its resolved title where possible
    for (const r of rows) {
      const key = `${r.lesson_track_id}||${r.level}||${r.lesson_id}`;
      const title = titleMap.get(key) || null;
      if (title) {
        try {
          const { error: upErr } = await supabase
            .from('lesson_history')
            .update({ lesson_title: title })
            .eq('id', r.id);
          if (upErr) {
            // Ignore update errors (may be RLS-related); continue
            console.debug('backfill update error (ignored):', upErr.message || upErr);
          }
        } catch (uErr) {
          console.debug('backfill update exception (ignored):', uErr?.message || uErr);
        }
      }
    }
    return true;
  } catch (err) {
    console.error('backfillLessonTitlesForStudent error:', err);
    return false;
  }
};

export const cleanupLessonHistoryLatest = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const { data, error } = await supabase
      .from('lesson_history')
      .select('id, lesson_id, created_at')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const seen = new Set();
    const toDelete = [];
    (data || []).forEach(row => {
      const key = String(row.lesson_id || '');
      if (seen.has(key)) {
        toDelete.push(row.id);
      } else {
        seen.add(key);
      }
    });
    if (toDelete.length === 0) return true;
    const { error: delErr } = await supabase
      .from('lesson_history')
      .delete()
      .in('id', toDelete);
    if (delErr) throw delErr;
    return true;
  } catch (err) {
    console.error('cleanupLessonHistoryLatest error:', err);
    return false;
  }
};

// --- NOTIFICATIONS (Reminders & Praise) ---
export const createNotification = async (recipientUserId, type, senderUserId = null, lessonId = null) => {
  try {
    const payload = { userId: recipientUserId, type, lessonId, senderUserId };
    const result = await apiFetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (result && result.success) return true;
  } catch (apiErr) {
    console.warn('createNotification via API failed, falling back to Supabase:', apiErr?.message || apiErr);
  }
  try {
    if (!recipientUserId) throw new Error('Recipient user ID required');
    let senderId = senderUserId;
    if (!senderId) {
      const { data: sessionData } = await supabase.auth.getSession();
      senderId = sessionData?.session?.user?.id || null;
    }
    if (!senderId) throw new Error('Sender user ID required');
    const { error } = await supabase
      .from('notifications')
      .insert([{
        recipient_id: recipientUserId,
        sender_id: senderId,
        type: type, // 'remind' or 'praise'
        lesson_id: lessonId || null
      }], { returning: 'minimal' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('createNotification error:', err);
    throw err;
  }
};

export const getNotifications = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const path = `/api/users/${encodeURIComponent(userId)}/notifications`;
    const result = await apiFetch(path);
    if (result && result.success) return result.notifications || [];
  } catch (apiErr) {
    console.warn('getNotifications via API failed, falling back to Supabase:', apiErr?.message || apiErr);
  }
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getNotifications error:', err);
    return [];
  }
};

export const getTeacherStudents = getTeacherRoster;

export const getAchievements = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const path = `/api/students/${encodeURIComponent(userId)}/achievements`;
    const result = await apiFetch(path);
    if (result && result.success) return result.achievements || [];
  } catch (apiErr) {
    console.warn('getAchievements via API failed, falling back to Supabase:', apiErr?.message || apiErr);
  }
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('badge_name, achieved_at')
      .eq('student_id', userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getAchievements error:', err);
    return [];
  }
};

export const upsertAchievement = async (userId, badgeName) => {
  try {
    if (!userId || !badgeName) throw new Error('User ID and badge name required');
    const { error } = await supabase
      .from('achievements')
      .upsert([{ student_id: userId, badge_name: badgeName }], { onConflict: 'student_id,badge_name', returning: 'minimal' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('upsertAchievement error:', err);
    return false;
  }
};

export const upsertStudentProfile = async (userId, profileData) => {
  try {
    if (!userId) throw new Error('User ID required');
    const { error } = await supabase
      .from('students')
      .upsert([{
        id: userId,
        ...profileData
      }], { onConflict: 'id', returning: 'minimal' });
    if (error) throw error;
  } catch (err) {
    console.error('upsertStudentProfile error:', err);
    throw err;
  }
};

export const upsertProfile = async (userId, profileData) => {
  try {
    if (!userId) throw new Error('User ID required');
    const { error } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        ...profileData
      }], { onConflict: 'id', returning: 'minimal' });
    if (error) throw error;
  } catch (err) {
    console.error('upsertProfile error:', err);
    throw err;
  }
};

// Convenience helper to update user settings stored in `profiles.settings` JSON column.
// NOTE: For this to work the `profiles` table should include a `settings` JSON/JSONB column.
// Example settings shape: { theme: 'dark', notifications: { email: true }, editor: { compact: false } }
export const updateUserSettings = async (userId, settings) => {
  try {
    if (!userId) throw new Error('User ID required');
    if (settings === undefined || settings === null) throw new Error('Settings required');
    await upsertProfile(userId, { settings });
    return true;
  } catch (err) {
    console.error('updateUserSettings error:', err);
    throw err;
  }
};

export const uploadAvatar = async (userId, file) => {
  try {
    if (!userId || !file) throw new Error('User ID and file required');
    const ext = (file.name || '').split('.').pop() || 'png';
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('uploadAvatar error:', err);
    throw err;
  }
};

export const getProfile = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('getProfile error:', err);
    return null;
  }
};

export const deleteNotification = async (userId, notificationId) => {
  try {
    if (!userId || !notificationId) throw new Error('User ID and notification ID required');
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteNotification error:', err);
    throw err;
  }
};

export const clearNotificationsByType = async (userId, type, lessonId = null) => {
  try {
    if (!userId || !type) throw new Error('User ID and type required');
    let query = supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .eq('type', type);
    if (lessonId !== null && lessonId !== undefined) {
      query = query.eq('lesson_id', lessonId);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('clearNotificationsByType error:', err);
    throw err;
  }
};
