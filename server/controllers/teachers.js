// Placeholder teachers controllers

exports.getRoster = async (req, res) => {
  return res.json({ success: true, students: [] });
};

exports.createInvite = async (req, res) => {
  return res.status(501).json({ success: false, error: 'createInvite not implemented' });
};

exports.redeemInvite = async (req, res) => {
  // Body: { token }
  return res.status(501).json({ success: false, error: 'redeemInvite not implemented' });
};
