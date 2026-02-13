const { supabase } = require('../supabaseClient');

// Simple middleware: if Authorization header provided, verify token and attach user
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return next();
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();
  const token = parts[1];
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.warn('Supabase getUser error', error);
      return next();
    }
    req.user = data?.user || null;
  } catch (err) {
    console.warn('Failed to verify token', err);
  }
  return next();
}

module.exports = { verifyToken };
