// Placeholder teachers controllers

const { adminSupabase } = require('../supabaseClient');
const crypto = require('crypto');
const { generateUniqueInviteToken } = require('../utils/invite');

exports.getRoster = async (req, res) => {
  const teacherId = req.params.teacherId;
  if (!teacherId) return res.status(400).json({ success: false, error: 'teacherId required' });
  try {
    // Fetch students assigned to this teacher
    const { data: students, error: studentsErr } = await adminSupabase
      .from('students')
      .select('id, xp, perfect_streak, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: true });
    if (studentsErr) {
      console.error('getRoster students fetch error', studentsErr);
      return res.status(500).json({ success: false, error: studentsErr.message || 'Failed to fetch students' });
    }

    const studentIds = (students || []).map(s => s.id).filter(Boolean);
    let profiles = [];
    if (studentIds.length > 0) {
      const { data: pData, error: profErr } = await adminSupabase.from('profiles').select('id, full_name, email, avatar_url').in('id', studentIds);
      if (profErr) {
        console.error('getRoster profiles fetch error', profErr);
      } else {
        profiles = pData || [];
      }
    }

    // Merge student rows with profiles
    const roster = (students || []).map(s => {
      const prof = (profiles || []).find(p => p.id === s.id) || {};
      return {
        id: s.id,
        full_name: prof.full_name || null,
        email: prof.email || null,
        avatar_url: prof.avatar_url || null,
        xp: s.xp || 0,
        perfect_streak: s.perfect_streak || 0,
        joined_at: s.created_at || null
      };
    });

    return res.json({ success: true, roster });
  } catch (err) {
    console.error('getRoster error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch roster' });
  }
};

// POST /teachers/:teacherId/invite
// body: { email } OR { studentId }
exports.createInvite = async (req, res) => {
  const teacherId = req.params.teacherId;
  const { email, studentId } = req.body || {};
  try {
    // Only a teacher or owner may reach this route (enforced by route middleware)

    // Generate a short, human-friendly unique token (checked against invites table)
    const token = await generateUniqueInviteToken(adminSupabase, { length: 8, maxAttempts: 10 });

    const payload = {
      teacher_id: teacherId,
      token,
      email: email || null,
      student_id: studentId || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await adminSupabase.from('invites').insert([payload]).select().maybeSingle();
    if (error) {
      console.error('createInvite supabase error', error);
      // If invites table doesn't exist in this environment, return the generated token
      // so tests / callers can continue without persisting.
      if (error.code === 'PGRST205' || (error?.message && error.message.includes("Could not find the table 'public.invites'"))) {
        return res.status(201).json({ success: true, invite: { ...payload, token, persisted: false } });
      }
      return res.status(500).json({ success: false, error: error.message || 'Failed to create invite' });
    }
    return res.status(201).json({ success: true, invite: data });
  } catch (err) {
    console.error('createInvite error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create invite' });
  }
};

exports.redeemInvite = async (req, res) => {
  // Body: { token, teacherId? }
  const { token, teacherId: bodyTeacherId } = req.body || {};
  const studentId = req.user && req.user.id;
  if (!token) return res.status(400).json({ success: false, error: 'token required' });
  if (!studentId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    // Preferred path: call RPC `accept_teacher_invite` if available. This lets DB/RLS
    // validate tokens and perform the assignment atomically.
    try {
      const { data: rpcData, error: rpcErr } = await adminSupabase.rpc('accept_teacher_invite', { p_token: token, p_student: studentId });
      if (!rpcErr) {
        // rpcData may contain the teacher id or other payload depending on implementation
        const resolvedTeacher = (rpcData && (rpcData.teacher_id || rpcData)) || bodyTeacherId || null;
        return res.json({ success: true, teacherId: resolvedTeacher });
      }
      // If we get a Postgres error indicating the function doesn't exist, fall through
      console.debug('redeemInvite: rpc accept_teacher_invite error', rpcErr.message || rpcErr);
    } catch (rpcException) {
      console.debug('redeemInvite: rpc threw', rpcException && rpcException.message);
      // continue to fallback paths
    }

    // Fallback 1: check `teacher_invites` table (used by frontend flows)
    let invite = null;
    try {
      const { data, error } = await adminSupabase.from('teacher_invites').select('id, teacher_id, expires_at').eq('token', token).maybeSingle();
      if (!error && data) invite = data;
      else if (error) console.debug('redeemInvite: teacher_invites lookup error', error.message || error);
    } catch (e) {
      console.debug('redeemInvite: teacher_invites lookup threw', e && e.message);
    }

    // Fallback 2: check legacy `invites` table
    if (!invite) {
      try {
        const { data, error } = await adminSupabase.from('invites').select('id, teacher_id, expires_at').eq('token', token).maybeSingle();
        if (!error && data) invite = data;
        else if (error) console.debug('redeemInvite: invites lookup error', error.message || error);
      } catch (e) {
        console.debug('redeemInvite: invites lookup threw', e && e.message);
      }
    }

    const teacherIdResolved = invite ? invite.teacher_id : (bodyTeacherId || null);
    if (!teacherIdResolved) return res.status(400).json({ success: false, error: 'teacherId could not be resolved for token' });

    // Assign the student to the teacher
    const { error: upsertErr } = await adminSupabase.from('students').upsert([{ id: studentId, teacher_id: teacherIdResolved }], { onConflict: 'id', returning: 'minimal' });
    if (upsertErr) {
      console.error('redeemInvite upsert error', upsertErr);
      return res.status(500).json({ success: false, error: 'Failed to assign student to teacher' });
    }

    // Optionally mark invite redeemed if persisted
    if (invite && invite.id) {
      try {
        const tableName = invite && (await (async function detectTable() {
          // If invite row came from teacher_invites query it will include id and teacher_id; prefer updating teacher_invites
          const tryTeacher = await adminSupabase.from('teacher_invites').select('id').eq('id', invite.id).maybeSingle();
          if (tryTeacher.data) return 'teacher_invites';
          return 'invites';
        })());
        if (tableName === 'teacher_invites') {
          await adminSupabase.from('teacher_invites').update({ redeemed_by: studentId, redeemed_at: new Date().toISOString() }).eq('id', invite.id);
        } else {
          await adminSupabase.from('invites').update({ redeemed_by: studentId, redeemed_at: new Date().toISOString() }).eq('id', invite.id);
        }
      } catch (e) {
        console.debug('redeemInvite: failed to mark invite redeemed', e && e.message);
      }
    }

    return res.json({ success: true, teacherId: teacherIdResolved });
  } catch (err) {
    console.error('redeemInvite error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to redeem invite' });
  }
};
