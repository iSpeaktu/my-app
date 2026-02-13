require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const request = require('supertest');
const fetch = require('node-fetch');
const { app } = require('../../index');
const { supabase } = require('../../supabaseClient');

jest.setTimeout(20000);

describe('Auth protection', () => {
  let userId = null;
  let accessToken = null;
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

    // Sign in via supabase-js to get token
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    accessToken = data?.session?.access_token || data?.access_token;
    if (!accessToken) throw new Error('No access token from signInWithPassword');
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
});
