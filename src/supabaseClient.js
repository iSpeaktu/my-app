import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// This is the missing piece Vercel is looking for!
export const HAS_SUPABASE = supabaseUrl && supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// --- STUDENT LOGIN (by name only) ---
export const studentLogin = async (studentName) => {
  try {
    if (!studentName || !studentName.trim()) {
      throw new Error('Student name is required');
    }

    // Normalize name to lowercase for case-insensitive matching
    const normalizedName = studentName.trim().toLowerCase();

    // Fetch or create student record using normalized name
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .or(`name.eq.${normalizedName},display_name.eq.${normalizedName}`)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingStudent) {
      return { student: existingStudent, isNewStudent: false };
    }

    // Create new student with normalized name
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([{ name: normalizedName, display_name: studentName.trim(), created_at: new Date() }])
      .select()
      .maybeSingle();

    if (insertError) throw insertError;
    return { student: newStudent, isNewStudent: true };
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

export const studentAuthSignUp = async (email, password, username) => {
  try {
    if (!email || !password) throw new Error('Email and password required');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student', username: username || null }
      }
    });
    if (error) throw error;
    // After successful signup, ensure a students row exists
    try {
      const userId = data?.user?.id || null;
      const normalized = (username || email.split('@')[0]).toLowerCase();
      // Upsert so we don't create duplicates and preserve the display name from signup
      await supabase.from('students').upsert([
        { user_id: userId, name: normalized, email, display_name: username || null, created_at: new Date() }
      ], { onConflict: 'name' });
    } catch (insertErr) {
      console.error('Failed to upsert students row after signup:', insertErr);
      // don't block signup on this error
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
      .from('students')
      .select('email,name,display_name')
      .or(`name.eq.${normalized},display_name.eq.${normalized}`)
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
    return data;
  } catch (err) {
    console.error('studentAuthResetPassword error:', err);
    throw err;
  }
};

export const assignStudentToTeacher = async (userId, teacherUserId, email) => {
  try {
    if (!userId || !teacherUserId) throw new Error('User and teacher required');
    let { data, error } = await supabase
      .from('students')
      .update({ teacher_user_id: teacherUserId, user_id: userId, is_guest: false })
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data && email) {
      const res = await supabase
        .from('students')
        .update({ teacher_user_id: teacherUserId, user_id: userId, is_guest: false })
        .eq('email', email)
        .select()
        .maybeSingle();
      if (res.error) throw res.error;
      data = res.data;
    }
    return data;
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
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (students || []).map(s => {
      const display = s.display_name || s.displayName || s.name || (s.email ? s.email.split('@')[0] : '');
      return {
        ...s,
        name: display,
        progress: s.progress || 'Beginner',
        lastScore: typeof s.lastScore === 'number' ? s.lastScore : 0,
        lastLessonId: s.lastLessonId || 1,
        lastMaterialId: s.lastMaterialId || null,
        lastLevel: s.lastLevel || null,
        history: Array.isArray(s.history) ? s.history : []
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
      .select('display_name,name')
      .eq('user_id', teacherUserId)
      .maybeSingle();
    if (error) throw error;
    return data?.display_name || data?.name || null;
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
        data: { role: 'teacher' }
      }
    });
    if (error) throw error;

    // Insert teacher profile only if missing (avoid overwriting existing data)
    try {
      const userId = data?.user?.id || null;
      if (userId) {
        const { data: existing, error: fetchErr } = await supabase
          .from('teachers')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!existing) {
          const { error: insertErr } = await supabase.from('teachers').insert([{
            user_id: userId,
            display_name: displayName || null,
            created_at: new Date()
          }]);
          if (insertErr) throw insertErr;
        }
      }
    } catch (insertErr) {
      console.error('Failed to insert teachers row after signup:', insertErr);
      // don't block signup on this error
    }

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

    const { data, error } = await supabase
      .from('teacher_invites')
      .insert([{
        teacher_user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date()
      }])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
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
      .select('teacher_user_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data?.teacher_user_id || null;
  } catch (err) {
    console.error('redeemTeacherInvite error:', err);
    throw err;
  }
};
