const crypto = require('crypto');

// Generate a short alphanumeric token (uppercase) of given length
const makeToken = (length = 8) => {
  const bytes = crypto.randomBytes(Math.ceil(length * 3 / 4));
  // base64 -> remove non-alphanum, uppercase, take length
  return bytes.toString('base64').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, length);
};

/**
 * Generate a unique invite token by checking the provided Supabase admin client
 * for existing tokens in the `invites` table. If the table is missing or an
 * error occurs while checking, the function will still return a token (best-effort).
 *
 * @param {object} adminSupabase - Supabase admin client
 * @param {object} opts - options { length, maxAttempts }
 */
async function generateUniqueInviteToken(adminSupabase, opts = {}) {
  const length = opts.length || 8;
  const maxAttempts = opts.maxAttempts || 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = makeToken(length);
    try {
      // Try to detect collision by querying the invites table
      const { data, error } = await adminSupabase.from('invites').select('id').eq('token', token).maybeSingle();
      if (error) {
        // If table doesn't exist or query fails, return the token (best-effort)
        return token;
      }
      if (!data) return token; // not found -> unique
      // otherwise collision, retry
    } catch (err) {
      // If any unexpected error, return token anyway
      return makeToken(length);
    }
  }
  // Fallback: return a longer random hex token
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { generateUniqueInviteToken };
