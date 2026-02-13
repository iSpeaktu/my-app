const { adminSupabase } = require('../supabaseClient');

exports.getNotifications = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  try {
    const { data, error } = await adminSupabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('getNotifications error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch notifications' });
  }
};

exports.createNotification = async (req, res) => {
  const { userId, type, lessonId, senderUserId } = req.body || {};
  console.log('createNotification body:', req.body);

  // Permission checks: if senderUserId provided it must match the authenticated user
  // unless the authenticated user is a teacher.
  const authUser = req.user || null;
  const role = authUser?.user_metadata?.role || authUser?.role || null;
  if (senderUserId && authUser) {
    if (senderUserId !== authUser.id && role !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Forbidden: sender mismatch' });
    }
  }
  try {
    const sender = (senderUserId && senderUserId) || (authUser && authUser.id) || userId;
    const payload = {
      recipient_id: userId,
      sender_id: sender,
      type,
      lesson_id: lessonId || null
    };
    console.log('inserting notification payload:', payload);
    const { data, error } = await adminSupabase.from('notifications').insert([payload]).select().maybeSingle();
    if (error) {
      console.error('supabase insert error:', error);
      return res.status(500).json({ success: false, error: error.message || error });
    }
    return res.status(201).json({ success: true, notification: data });
  } catch (err) {
    console.error('createNotification error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create notification' });
  }
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  try {
    const { error } = await adminSupabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteNotification error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete notification' });
  }
};
