// Placeholder auth controllers

exports.studentLogin = async (req, res) => {
  // Expect { email, password }
  // Implement server-side auth and return a token
  return res.status(501).json({ success: false, error: 'studentLogin not implemented' });
};

exports.studentSignup = async (req, res) => {
  // Expect { fullName, email, password }
  return res.status(501).json({ success: false, error: 'studentSignup not implemented' });
};

exports.resetPassword = async (req, res) => {
  // Expect { emailOrUsername }
  return res.status(501).json({ success: false, error: 'resetPassword not implemented' });
};
