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
      const display = s.display_name || s.displayName || s.name || (s.email ? s.email.split('@')[0] : '');
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
    const normalized = (studentName || '').toLowerCase();
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .or(`name.eq.${normalized},display_name.eq.${normalized}`)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating student:', error);
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
          .insert([{ id: userId }], { returning: 'minimal' });
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

export const assignStudentToTeacher = async (userId, teacherUserId) => {
  try {
    if (!userId || !teacherUserId) throw new Error('User and teacher required');
    if (userId === teacherUserId) throw new Error('Student and teacher cannot be the same user');
    
    // Perform the student update
    const { error } = await supabase
      .from('students')
      .upsert([{ id: userId, teacher_id: teacherUserId }], { onConflict: 'id', returning: 'minimal' });
    if (error) throw error;

    // Perform the classroom update
    const { error: classroomErr } = await supabase
      .from('classrooms')
      .upsert([{ teacher_id: teacherUserId, student_id: userId }], { onConflict: 'teacher_id,student_id' });
    if (classroomErr) throw classroomErr;

    // FIX: Simply return true or a success message instead of 'data'
    return { success: true }; 
  } catch (err) {
    console.error('assignStudentToTeacher error:', err);
    throw err;
  }
};
export const getTeacherStudents = async () => {
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

    let studentIds = (classroomRows || []).map(r => r.student_id).filter(Boolean);
    let students = null;
    if (studentIds.length === 0) {
      const { data: byTeacher, error: byTeacherErr } = await supabase
        .from('students')
        .select('id, teacher_id, current_material_id, current_level, xp, weekly_streak')
        .eq('teacher_id', userId);
      if (byTeacherErr) throw byTeacherErr;
      students = byTeacher || [];
      studentIds = students.map(s => s.id).filter(Boolean);
    } else {
      const { data: byIds, error: studentsErr } = await supabase
        .from('students')
        .select('id, teacher_id, current_material_id, current_level, xp, weekly_streak')
        .in('id', studentIds);
      if (studentsErr) throw studentsErr;
      students = byIds || [];
    }

    if (studentIds.length === 0) return [];

    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', studentIds);
    if (profilesErr) throw profilesErr;

    const { data: historyRows, error: historyErr } = await supabase
      .from('lesson_history')
      .select('student_id, lesson_id, score, passed, failures, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: true });
    if (historyErr) throw historyErr;

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
        failures: h.failures || []
      });
    });

    return studentIds.map(id => {
      const profile = profileById.get(id) || {};
      const student = studentById.get(id) || {};
      const history = (historyById.get(id) || []).map(h => ({
        ...h,
        material: student.current_material_id || null,
        level: student.current_level || null
      }));
      const last = history.length ? history[history.length - 1] : null;
      const display = profile.full_name || profile.username || 'Student';
      return {
        id,
        name: display,
        progress: student.current_level || 'Beginner',
        lastScore: typeof last?.score === 'number' ? last.score : 0,
        lastLessonId: last?.lessonId || 1,
        lastMaterialId: student.current_material_id || null,
        lastLevel: student.current_level || null,
        history
      };
    });
  } catch (err) {
    console.error('getTeacherStudents error:', err);
    return [];
  }
};
export const getTeacherNameByUserId = async (teacherUserId) => {
  try {
    if (!teacherUserId) return null;
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

// --- LESSON HISTORY & STUDENT DATA ---
export const recordLessonHistory = async (studentUserId, lessonId, score, passed, failures = []) => {
  try {
    if (!studentUserId) throw new Error('Student user ID required');
    const { data: existing, error: fetchError } = await supabase
      .from('lesson_history')
      .select('id')
      .eq('student_id', studentUserId)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('lesson_history')
        .update({
          score,
          passed,
          failures: failures || [],
          created_at: new Date()
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
        created_at: new Date()
      }], { returning: 'minimal' });
    if (error) throw error;
  } catch (err) {
    console.error('recordLessonHistory error:', err);
    throw err;
  }
};

export const updateStudentProgress = async (userId, updates) => {
  try {
    if (!userId) throw new Error('User ID required');
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
  } catch (err) {
    console.error('updateStudentProgress error:', err);
    throw err;
  }
};

export const getStudentProgress = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
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
  } catch (err) {
    console.error('createNotification error:', err);
    throw err;
  }
};

export const getNotifications = async (userId) => {
  try {
    if (!userId) throw new Error('User ID required');
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












