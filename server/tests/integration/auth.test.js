require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const request = require('supertest');
const fetch = require('node-fetch');
const { app } = require('../../index');
const { supabase, adminSupabase } = require('../../supabaseClient');

jest.setTimeout(20000);

describe('Auth protection', () => {
  let userId = null;
  let accessToken = null;
  let teacherId = null;
  let teacherToken = null;
  const email = `itest-${Date.now()}@example.com`;
  const password = 'ItestPass123!';

  beforeAll(async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }

    // Create admin user via REST
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'student' } }),
    });
    const created = await createRes.json();
    if (!createRes.ok) throw new Error(`Failed to create user: ${JSON.stringify(created)}`);
    userId = created.id;

    // Ensure a profiles row exists for FK constraints
    await supabase.from('profiles').upsert([{ id: userId, full_name: 'ITest User', role: 'student' }], { onConflict: 'id', returning: 'minimal' });

    // Sign in via supabase-js to get token
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    accessToken = data?.session?.access_token || data?.access_token;
    if (!accessToken) throw new Error('No access token from signInWithPassword');
    // Also create a teacher user for invite tests
    const emailT = `teacher-${Date.now()}@example.com`;
    const passT = 'TeachPass123!';
    const createT = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({ email: emailT, password: passT, email_confirm: true, user_metadata: { role: 'teacher' } }),
    });
    const createdT = await createT.json();
    teacherId = createdT.id;
    // ensure profiles and teachers rows using admin client
    await adminSupabase.from('profiles').upsert([{ id: teacherId, full_name: 'ITest Teacher', role: 'teacher' }], { onConflict: 'id', returning: 'minimal' });
    // try to upsert teachers row; ignore if table doesn't exist
    try {
      await adminSupabase.from('teachers').upsert([{ id: teacherId, display_name: 'ITest T' }], { onConflict: 'id', returning: 'minimal' });
    } catch (e) {
      // ignore if teachers table missing in test db
    }
    const { data: tSign, error: tErr } = await supabase.auth.signInWithPassword({ email: emailT, password: passT });
    if (tErr) throw tErr;
    teacherToken = tSign?.session?.access_token || tSign?.access_token;
  });

  afterAll(async () => {
    // delete user via REST admin
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (userId) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
      });
    }
    if (secondUserId) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${secondUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
      });
    }
    if (teacherId) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${teacherId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
      });
    }
  });

  test('GET notifications without token returns 401', async () => {
    const res = await request(app).get(`/api/users/${userId}/notifications`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  test('GET notifications with valid token returns 200', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}/notifications`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('POST create notification, GET sees it, DELETE removes it', async () => {
    // Create notification
    const createRes = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, type: 'praise', senderUserId: userId });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('success', true);
    const notification = createRes.body.notification;
    expect(notification).toHaveProperty('id');

    // GET notifications should include the new one
    const listRes = await request(app)
      .get(`/api/users/${userId}/notifications`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.status).toBe(200);
    const ids = (listRes.body.notifications || []).map(n => n.id);
    expect(ids).toContain(notification.id);

    // DELETE the notification
    const delRes = await request(app)
      .delete(`/api/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body).toHaveProperty('success', true);

    // Confirm deletion
    const listRes2 = await request(app)
      .get(`/api/users/${userId}/notifications`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes2.status).toBe(200);
    const ids2 = (listRes2.body.notifications || []).map(n => n.id);
    expect(ids2).not.toContain(notification.id);
  });

  test('Permission: non-teacher cannot set senderUserId to another user', async () => {
    // create a second user
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const email2 = `itest2-${Date.now()}@example.com`;
    const pass2 = 'ItestPass123!';
    const createRes2 = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({ email: email2, password: pass2, email_confirm: true, user_metadata: { role: 'student' } }),
    });
    const created2 = await createRes2.json();
    expect(createRes2.ok).toBe(true);
    secondUserId = created2.id;
    // ensure profile exists
    await supabase.from('profiles').upsert([{ id: secondUserId, full_name: 'Other', role: 'student' }], { onConflict: 'id', returning: 'minimal' });

    // Attempt to create notification claiming the second user as sender
    const badRes = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, type: 'praise', senderUserId: secondUserId });
    // Should be forbidden
    expect(badRes.status).toBe(403);
    expect(badRes.body).toHaveProperty('success', false);
  });

  test('Teacher can create invite for their class (by email)', async () => {
    const res = await request(app)
      .post(`/api/teachers/${teacherId}/invite`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: `student-invite-${Date.now()}@example.com` });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('invite');
    expect(res.body.invite).toHaveProperty('token');
    // store for redeem test
    createdInvite = res.body.invite;
  });

  test('Non-owner student cannot create invite for a teacher (403)', async () => {
    const res = await request(app)
      .post(`/api/teachers/${teacherId}/invite`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: `student-invite-${Date.now()}@example.com` });
    // requireOwnerOrTeacher should forbid student
    expect(res.status).toBe(403);
  });

  test('Student can redeem invite token and be assigned to teacher', async () => {
    // createdInvite may be persisted or may be a transient token
    expect(createdInvite).toBeTruthy();
    const token = createdInvite.token;
    const teacherFromInvite = createdInvite.teacher_id || teacherId;

    const redeemBody = { token };
    if (!createdInvite.id) redeemBody.teacherId = teacherFromInvite;

    const redeemRes = await request(app)
      .post('/api/invites/redeem')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(redeemBody);
    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body).toHaveProperty('success', true);

    // Verify students row updated
    const { data: studentRow, error } = await adminSupabase.from('students').select('id, teacher_id').eq('id', userId).maybeSingle();
    expect(error).toBeNull();
    expect(studentRow).toBeTruthy();
    expect(studentRow.teacher_id).toBe(teacherFromInvite);
  });

  test('GET teacher roster returns assigned students for teacher', async () => {
    const res = await request(app)
      .get(`/api/teachers/${teacherId}/roster`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const ids = (res.body.roster || []).map(r => r.id);
    expect(ids).toContain(userId);
  });

  test('Unauthorized student cannot view another teacher roster (403)', async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // create a fresh student not assigned to the teacher
    const emailOther = `roster-other-${Date.now()}@example.com`;
    const passOther = 'OtherPass123!';
    const createOther = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({ email: emailOther, password: passOther, email_confirm: true, user_metadata: { role: 'student' } }),
    });
    const createdOther = await createOther.json();
    expect(createOther.ok).toBe(true);
    const otherId = createdOther.id;
    // ensure profile exists
    await supabase.from('profiles').upsert([{ id: otherId, full_name: 'Other Roster', role: 'student' }], { onConflict: 'id', returning: 'minimal' });
    const { data: otherSign, error: otherErr } = await supabase.auth.signInWithPassword({ email: emailOther, password: passOther });
    if (otherErr) throw otherErr;
    const otherToken = otherSign?.session?.access_token || otherSign?.access_token;

    const res = await request(app)
      .get(`/api/teachers/${teacherId}/roster`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);

    // cleanup
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${otherId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
  });

  test('Student can post lesson history and XP updates, and other students forbidden', async () => {
    // Post history as the student (userId)
    const res = await request(app)
      .post(`/api/students/${userId}/history`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lessonNumber: 'lesson-1', score: 100 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('xp');

    // Create another student and ensure they cannot post to this student's history
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const emailOther = `other-${Date.now()}@example.com`;
    const passOther = 'OtherPass123!';
    const createOther = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({ email: emailOther, password: passOther, email_confirm: true, user_metadata: { role: 'student' } }),
    });
    const createdOther = await createOther.json();
    const otherId = createdOther.id;
    await adminSupabase.from('profiles').upsert([{ id: otherId, full_name: 'Other', role: 'student' }], { onConflict: 'id', returning: 'minimal' });
    const { data: otherSign, error: otherErr } = await supabase.auth.signInWithPassword({ email: emailOther, password: passOther });
    const otherToken = otherSign?.session?.access_token || otherSign?.access_token;

    const forbiddenRes = await request(app)
      .post(`/api/students/${userId}/history`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ lessonNumber: 'lesson-2', score: 80 });
    expect(forbiddenRes.status).toBe(403);

    // cleanup
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${otherId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
  });
});
