const express = require('express');
const router = express.Router();
const db = require('../../db');
const verifyToken = require('../../middleware/verifyToken');
const path = require('path');
const fs = require('fs');


// Подготовка папки
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Получение заявок для админа
router.get('/requests-artists', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');

  try {
    const [rows] = await db.query(`
      SELECT a.ArtistID, a.Bio, a.SocialLinks, a.AvatarPath, u.Username
      FROM artists a
      JOIN users u ON a.UserID = u.UserID
      WHERE a.Status = 'pending'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Получение примеров работ для заявки
router.get('/artist-samples/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    const [rows] = await db.query('SELECT ImagePath FROM artist_samples WHERE ArtistID = ?', [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка получения примеров');
  }
});

// Одобрение заявки
router.post('/approve-artist/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    await db.query('UPDATE artists SET Status = "approved" WHERE ArtistID = ?', [id]);
    res.send('Одобрено');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка');
  }
});

// Отклонение заявки
router.post('/reject-artist/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    await db.query('UPDATE artists SET Status = "rejected" WHERE ArtistID = ?', [id]);
    res.send('Отклонено');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка');
  }
});


module.exports = router;