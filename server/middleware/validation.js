const { adminSupabase } = require('../supabaseClient');

const allowedNotificationTypes = ['remind', 'praise'];

// Basic sanitizers
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

async function validateCreateNotification(req, res, next) {
  try {
    const body = req.body || {};
    const userId = sanitizeString(body.userId);
    const type = sanitizeString(body.type);
    const senderUserId = body.senderUserId ? sanitizeString(body.senderUserId) : null;

    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    if (!type) return res.status(400).json({ success: false, error: 'type required' });
    if (!allowedNotificationTypes.includes(type)) return res.status(400).json({ success: false, error: `invalid type, allowed: ${allowedNotificationTypes.join(',')}` });

    // ensure recipient exists (profiles row)
    const { data: profile, error } = await adminSupabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!profile) return res.status(400).json({ success: false, error: 'recipient does not exist' });

    // attach sanitized fields
    req.body.userId = userId;
    req.body.type = type;
    if (senderUserId) req.body.senderUserId = senderUserId;

    return next();
  } catch (err) {
    console.error('validateCreateNotification error', err);
    return res.status(500).json({ success: false, error: 'Validation failed' });
  }
}

module.exports = { validateCreateNotification };

// Validate creating a teacher invite: expects body.email (string) OR body.studentId (uuid)
function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-fA-F-]{36}$/.test(s);
}

async function validateCreateInvite(req, res, next) {
  try {
    const teacherId = req.params && req.params.teacherId;
    console.debug('[validateCreateInvite] teacherId=', teacherId, 'body=', req.body);
    if (!teacherId) return res.status(400).json({ success: false, error: 'teacherId required' });

    const body = req.body || {};
    const email = body.email && String(body.email).trim();
    const studentId = body.studentId && String(body.studentId).trim();

    if (!email && !studentId) return res.status(400).json({ success: false, error: 'email or studentId required' });
    if (studentId && !isUuid(studentId)) return res.status(400).json({ success: false, error: 'studentId must be UUID' });

    // Ensure teacher profile exists
    const { data: teacherProfile, error } = await adminSupabase.from('profiles').select('id, role').eq('id', teacherId).maybeSingle();
    if (error) throw error;
    if (!teacherProfile) {
      console.debug('[validateCreateInvite] no teacherProfile, checking teachers table');
      // Fallback: allow if a teachers row exists
      const { data: teacherRow, error: tErr } = await adminSupabase.from('teachers').select('id').eq('id', teacherId).maybeSingle();
      console.debug('[validateCreateInvite] teacherRow=', teacherRow, 'tErr=', tErr);
      if (tErr) throw tErr;
      if (!teacherRow) return res.status(400).json({ success: false, error: 'teacher profile not found' });
    }

    // attach sanitized values
    if (email) req.body.email = email;
    if (studentId) req.body.studentId = studentId;

    return next();
  } catch (err) {
    console.error('validateCreateInvite error', err);
    return res.status(500).json({ success: false, error: 'Validation failed' });
  }
}

module.exports.validateCreateInvite = validateCreateInvite;

// Validate recordHistory payload for POST /students/:studentId/history
function isNumberInRange(n, min, max) {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}

async function validateRecordHistory(req, res, next) {
  try {
    const { lessonNumber, lessonTrackId, level, score, passed, failures } = req.body || {};
    if (lessonNumber === undefined || lessonNumber === null) return res.status(400).json({ success: false, error: 'lessonNumber required' });
    const sanitized = {};
    sanitized.lessonNumber = String(lessonNumber).trim();
    if (lessonTrackId) sanitized.lessonTrackId = String(lessonTrackId).trim();
    if (level) sanitized.level = String(level).trim();
    if (score !== undefined && score !== null) {
      const num = Number(score);
      if (!isNumberInRange(num, 0, 100)) return res.status(400).json({ success: false, error: 'score must be 0-100' });
      sanitized.score = num;
    }
    if (passed !== undefined) sanitized.passed = !!passed;
    if (failures !== undefined) {
      if (!Array.isArray(failures)) return res.status(400).json({ success: false, error: 'failures must be array' });
      sanitized.failures = failures;
    }

    req.body = { ...req.body, ...sanitized };
    return next();
  } catch (err) {
    console.error('validateRecordHistory error', err);
    return res.status(500).json({ success: false, error: 'Validation failed' });
  }
}

module.exports.validateRecordHistory = validateRecordHistory;
