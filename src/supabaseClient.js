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
      .eq('name', normalizedName)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      throw fetchError;
    }

    if (existingStudent) {
      // Student exists
      return { student: existingStudent, isNewStudent: false };
    }

    // Create new student with normalized name
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([{ name: normalizedName, created_at: new Date() }])
      .select()
      .single();

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
    return students;
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
};

// --- UPDATE STUDENT DATA ---
export const updateStudentData = async (studentName, updates) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('name', studentName)
      .select()
      .single();

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
      const normalized = (username || email.split('@')[0]).toLowerCase();
      await supabase.from('students').insert([{ name: normalized, email, created_at: new Date() }]);
    } catch (insertErr) {
      console.error('Failed to create students row after signup:', insertErr);
      // don't block signup on this error
    }

    return data.user;
  } catch (err) {
    console.error('studentAuthSignUp error:', err);
    throw err;
  }
};