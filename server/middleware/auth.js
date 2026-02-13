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

// Require that `req.user` exists (i.e. token was valid)
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  return next();
}

// Require that the authenticated user either matches the route param (owner)
// or has a teacher role. Usage: requireOwnerOrTeacher('studentId')
function requireOwnerOrTeacher(paramName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const userId = req.user?.id;
    const paramVal = req.params && req.params[paramName];
    if (!paramVal) return res.status(400).json({ success: false, error: 'Missing route parameter' });
    if (userId === paramVal) return next();
    const role = req.user?.user_metadata?.role || req.user?.role || null;
    if (role === 'teacher') return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  };
}

module.exports = { verifyToken, requireAuth, requireOwnerOrTeacher };
