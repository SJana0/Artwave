const express = require('express');
const router = express.Router();
const db = require('../../db');

router.get('/tags', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT TagID, TagName FROM tags ORDER BY TagName');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении тегов' });
  }
});

module.exports = router;
