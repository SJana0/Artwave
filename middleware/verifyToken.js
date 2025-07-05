const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) return res.status(401).json({ message: 'Нет токена' });

  const token = authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Неверный формат токена' });

  jwt.verify(token, process.env.JWT_SECRET, (err, userData) => {
    if (err) return res.status(403).json({ message: 'Недействительный токен' });

    req.user = userData; // { userID, username, role }
    next();
  });
}

module.exports = verifyToken;
