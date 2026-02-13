const { supabase } = require('../supabaseClient');

exports.getNotifications = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  try {
    const { data, error } = await supabase
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
  if (!userId || !type) return res.status(400).json({ success: false, error: 'userId and type required' });
  // Basic validation for notification type
  const allowed = ['remind', 'praise'];
  if (!allowed.includes(type)) return res.status(400).json({ success: false, error: `invalid type, allowed: ${allowed.join(',')}` });
  try {
    const sender = senderUserId || (req.user && req.user.id) || userId;
    const payload = {
      recipient_id: userId,
      sender_id: sender,
      type,
      lesson_id: lessonId || null
    };
    console.log('inserting notification payload:', payload);
    const { data, error } = await supabase.from('notifications').insert([payload]).select().maybeSingle();
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
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteNotification error', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete notification' });
  }
};
