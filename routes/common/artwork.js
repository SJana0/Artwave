const express = require('express');
const router = express.Router();
const db = require('../../db');
const verifyToken = require('../../middleware/verifyToken');

// Получить комментарии

router.get('/artwork-comments/:id', async (req, res) => {
  const artworkID = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(`
      SELECT c.Content, c.PostDate, u.Username 
      FROM artwork_comments c
      JOIN users u ON c.UserID = u.UserID
      WHERE c.ArtworkID = ?
      ORDER BY c.PostDate DESC
      LIMIT ? OFFSET ?
    `, [artworkID, limit, offset]);

    const [totalRows] = await db.query(`
      SELECT COUNT(*) as total FROM artwork_comments WHERE ArtworkID = ?
    `, [artworkID]);

    res.json({
      comments: rows,
      total: totalRows[0].total,
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка получения комментариев' });
  }
});


// Добавить комментарий
router.post('/artwork-comments/:id', verifyToken, async (req, res) => {
  const artworkID = req.params.id;
  const userID = req.user.userID;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Комментарий пустой' });
  }

  try {
    await db.query(`
      INSERT INTO artwork_comments (ArtworkID, UserID, Content)
      VALUES (?, ?, ?)
    `, [artworkID, userID, content.trim()]);
    res.send('Комментарий добавлен');
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при добавлении комментария' });
  }
});

// Поставить / убрать лайк
router.post('/artwork-likes/:id', verifyToken, async (req, res) => {
  const artworkID = req.params.id;
  const userID = req.user.userID;

  try {
    const [existing] = await db.query(`
      SELECT * FROM artwork_likes WHERE ArtworkID = ? AND UserID = ?
    `, [artworkID, userID]);

    if (existing.length > 0) {
      await db.query(`
        DELETE FROM artwork_likes WHERE ArtworkID = ? AND UserID = ?
      `, [artworkID, userID]);
      return res.json({ liked: false });
    } else {
      await db.query(`
        INSERT INTO artwork_likes (ArtworkID, UserID) VALUES (?, ?)
      `, [artworkID, userID]);
      return res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при обработке лайка' });
  }
});

// Количество лайков
router.get('/artwork-likes/:id', async (req, res) => {
  const artworkID = req.params.id;
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) as count FROM artwork_likes WHERE ArtworkID = ?
    `, [artworkID]);
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка получения лайков' });
  }
});


// Проверка: поставил ли пользователь лайк
router.get('/artwork-liked/:id', verifyToken, async (req, res) => {
  const artworkID = req.params.id;
  const userID = req.user.userID;

  try {
    const [rows] = await db.query(`
      SELECT * FROM artwork_likes WHERE ArtworkID = ? AND UserID = ?
    `, [artworkID, userID]);

    res.json({ liked: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка проверки лайка' });
  }
});


module.exports = router;
