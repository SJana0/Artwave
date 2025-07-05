const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/verifyToken');
const multer = require('multer');
const fs = require('fs');


require('dotenv').config();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//  Проверка подключения к БД
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json(rows);
  } catch (error) {
    res.status(500).send('Ошибка подключения к БД');
  }
});

app.use('/api', require('./routes/user/auth'));
app.use('/api', require('./routes/user/userInfo'));
app.use('/api', require('./routes/artist/upload'));
app.use('/api', require('./routes/artist/profile'));
app.use('/api', require('./routes/admin/exhibitionRequests'));
app.use('/api', require('./routes/admin/artistRequests'));
app.use('/api', require('./routes/common/exhibitions'));
app.use('/api', require('./routes/common/artists'));
app.use('/api', require('./routes/common/artwork'));
app.use('/api', require('./routes/common/tags'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//  Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер работает: http://localhost:${PORT}`);
});
