const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email.includes('@') || !password) {
    return res.status(400).send('Неверные данные');
  }

  try {
    const [existing] = await db.query('SELECT * FROM Users WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).send('Email уже зарегистрирован');
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO Users (Username, Email, PasswordHash, Role, RegistrationDate) VALUES (?, ?, ?, "user", NOW())',
      [username, email, hash]
    );

    res.send('Регистрация успешна!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Введите email и пароль' });
  }

  try {
    const [users] = await db.query('SELECT * FROM Users WHERE Email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign(
      {
        userID: user.UserID,
        username: user.Username,
        role: user.Role
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ message: 'Вход выполнен', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
