const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // still create client but warn
  console.warn('Supabase client missing URL or SERVICE_ROLE_KEY in env');
}

// Primary client (used for auth flows in tests). Note: auth methods may set session on this client.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Admin client: a fresh client instance intended for server-side DB operations
// that must always use the service-role key and not be affected by session state.
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = { supabase, adminSupabase };
