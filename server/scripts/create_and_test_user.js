// Load server .env explicitly (script may be run from workspace root)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = globalThis.fetch || require('node-fetch');
const http = require('http');

(async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in env');
      process.exit(1);
    }

    const email = `temp-test-${Date.now()}@example.com`;
    const password = 'TempPass123!';

    console.log('Creating user', email);
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'student', full_name: 'Temp Test' }
      }),
    });

    const created = await createRes.json();
    if (!createRes.ok) {
      console.error('Failed to create user', createRes.status, created);
      process.exit(1);
    }
    const userId = created?.id;
    console.log('Created user id', userId);

    // Sign in to get token using server supabase client
    console.log('Signing in to obtain token via supabase-js');
    const { supabase } = require('../supabaseClient');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      console.error('signInWithPassword failed', signInErr);
      // cleanup
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
        }).catch(() => {});
      }
      process.exit(1);
    }
    const accessToken = signInData?.session?.access_token || signInData?.access_token;
    if (!accessToken) {
      console.error('No access token from signInWithPassword', signInData);
      process.exit(1);
    }
    console.log('Obtained access token, testing protected route...');

    // Call local protected route
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: `/api/users/${userId}/notifications`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    };

    const req = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', async () => {
        console.log('Protected route status', res.statusCode);
        try { console.log(JSON.parse(d)); } catch (e) { console.log(d); }

        // cleanup: delete user
        console.log('Deleting temporary user', userId);
        const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
        });
        console.log('Delete status', delRes.status);
        process.exit(0);
      });
    });
    req.on('error', async (e) => {
      console.error('request error', e);
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
        }).catch(() => {});
      }
      process.exit(1);
    });
    req.end();

  } catch (err) {
    console.error('Script error', err);
    process.exit(1);
  }
})();
