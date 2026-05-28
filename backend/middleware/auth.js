const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'caretrack_secret_2026';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ success: false, message: 'Token kerak!' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token noto\'g\'ri yoki muddati o\'tgan!' });
  }
}

module.exports = { auth };


