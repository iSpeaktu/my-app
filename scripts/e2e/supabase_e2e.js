/*
Minimal Supabase E2E scaffold for local verification.

Usage (run locally with a test project and service role key):

Windows PowerShell:
$env:SUPABASE_URL="https://xyz.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
node scripts/e2e/supabase_e2e.js

Notes:
- This script uses the Supabase "service_role" key to perform admin operations.
- It will create temporary teacher and student users, upsert profiles, create an invite, and assign the student to the teacher.
- Set CLEANUP=1 to remove created records when finished (the script will attempt to delete users and related rows).
- Do NOT run against production projects unless you understand the side-effects. Use a dedicated test project.
*/

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const CLEANUP = !!process.env.CLEANUP;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing required env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const rnd = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

async function run() {
  const teacherEmail = `e2e-teacher+${rnd()}@example.com`;
  const studentEmail = `e2e-student+${rnd()}@example.com`;
  const pw = 'Test1234!';

  let teacherUser = null;
  let studentUser = null;
  let inviteToken = null;

  try {
    console.log('Creating teacher (admin)...', teacherEmail);
    const { data: tdata, error: terr } = await admin.auth.admin.createUser({
      email: teacherEmail,
      password: pw,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Teacher', role: 'teacher' }
    });
    if (terr) throw terr;
    teacherUser = tdata;
    console.log('Teacher created:', teacherUser.id);

    // Upsert profile and teachers row
    await admin.from('profiles').upsert([{ id: teacherUser.id, display_name: 'E2E Teacher', role: 'teacher', email: teacherEmail }], { onConflict: 'id' });
    await admin.from('teachers').upsert([{ id: teacherUser.id, display_name: 'E2E Teacher' }], { onConflict: 'id' });

    console.log('Creating teacher invite token...');
    inviteToken = `invite_${rnd(12)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: invErr } = await admin.from('teacher_invites').insert([{ teacher_id: teacherUser.id, token: inviteToken, expires_at: expiresAt }]);
    if (invErr) throw invErr;
    console.log('Invite token created:', inviteToken);

    // Create student user
    console.log('Creating student (admin)...', studentEmail);
    const { data: sdata, error: serr } = await admin.auth.admin.createUser({
      email: studentEmail,
      password: pw,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Student', role: 'student' }
    });
    if (serr) throw serr;
    studentUser = sdata;
    console.log('Student created:', studentUser.id);

    // Upsert student profile and student row
    await admin.from('profiles').upsert([{ id: studentUser.id, display_name: 'E2E Student', role: 'student', email: studentEmail }], { onConflict: 'id' });
    await admin.from('students').upsert([{ id: studentUser.id, xp: 0, weekly_streak: 0, lessons_per_week: 3 }], { onConflict: 'id' });

    // Simulate accept invite: as admin we can assign directly
    console.log('Assigning student to teacher...');
    const { error: assignErr } = await admin.from('students').upsert([{ id: studentUser.id, teacher_id: teacherUser.id }], { onConflict: 'id' });
    if (assignErr) throw assignErr;

    // Create classroom record
    const { error: classErr } = await admin.from('classrooms').insert([{ teacher_id: teacherUser.id, student_id: studentUser.id }]);
    if (classErr) throw classErr;

    // Verify
    const { data: srow } = await admin.from('students').select('id, teacher_id, xp, weekly_streak, lessons_per_week').eq('id', studentUser.id).maybeSingle();
    const { data: crow } = await admin.from('classrooms').select('*').eq('teacher_id', teacherUser.id).eq('student_id', studentUser.id).maybeSingle();

    console.log('Verification results:');
    console.log('Student row:', srow);
    console.log('Classroom row:', crow);

    console.log('\nE2E scaffold completed successfully.');
  } catch (err) {
    console.error('E2E scaffold failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    if (CLEANUP) {
      console.log('Cleanup: removing created rows and users...');
      try {
        if (teacherUser?.id) {
          await admin.from('teacher_invites').delete().eq('teacher_id', teacherUser.id);
          await admin.from('teachers').delete().eq('id', teacherUser.id);
          await admin.from('profiles').delete().eq('id', teacherUser.id);
          await admin.from('classrooms').delete().eq('teacher_id', teacherUser.id).eq('student_id', studentUser?.id || -1);
          await admin.auth.admin.deleteUser(teacherUser.id);
        }
        if (studentUser?.id) {
          await admin.from('students').delete().eq('id', studentUser.id);
          await admin.from('profiles').delete().eq('id', studentUser.id);
          await admin.auth.admin.deleteUser(studentUser.id);
        }
      } catch (e) {
        console.warn('Cleanup had errors:', e?.message || e);
      }
    }
  }
}

run();
