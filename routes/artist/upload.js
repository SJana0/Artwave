const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const verifyToken = require('../../middleware/verifyToken');
const db = require('../../db');


// Папка для загрузки
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Конфигурация multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'art_' + unique + ext);
  }
});

// ✅ Фильтрация только изображений
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Можно загружать только изображения.'));
  }
};

// 🎯 Собираем multer с фильтром
const upload = multer({ storage, fileFilter });

router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('Файл не загружен');

  const imagePath = '/uploads/' + req.file.filename;

  res.json({ imagePath });
});



router.post('/upload-work', verifyToken, upload.single('image'), async (req, res) => {
  const userID = req.user.userID;
  const { title, description } = req.body;
  const tagsRaw = req.body.tags;
  const tags = Array.isArray(tagsRaw) ? tagsRaw : (tagsRaw ? [tagsRaw] : []);

  try {
    const [artistRows] = await db.query('SELECT ArtistID FROM artists WHERE UserID = ? AND Status = "approved"', [userID]);
    if (artistRows.length === 0) return res.status(403).send('Вы не художник');
    const artistID = artistRows[0].ArtistID;

    if (!req.file) return res.status(400).send('Файл не загружен');
    const imagePath = '/uploads/' + req.file.filename;

    const [artRes] = await db.query(`
      INSERT INTO artwork (ArtistID, Title, Description, ImagePath, UploadDate, IsApproved)
      VALUES (?, ?, ?, ?, NOW(), 1)
    `, [artistID, title, description, imagePath]);

    const artworkID = artRes.insertId;

    for (const tagID of tags) {
      await db.query(`
        INSERT INTO artworktags (ArtworkID, TagID)
        VALUES (?, ?)
      `, [artworkID, tagID]);
    }

    res.send('Работа успешно загружена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при загрузке работы');
  }
});


router.delete('/artwork/:id', verifyToken, async (req, res) => {
  const userID = req.user.userID;
  const artworkID = req.params.id;

  try {
    // Проверка принадлежности
    const [checkRows] = await db.query(`
      SELECT a.ArtworkID, a.ImagePath 
      FROM artwork a
      JOIN artists ar ON a.ArtistID = ar.ArtistID
      WHERE a.ArtworkID = ? AND ar.UserID = ?
    `, [artworkID, userID]);

    if (checkRows.length === 0) {
      return res.status(403).send('Нет доступа или не ваша работа');
    }

    const imagePath = checkRows[0].ImagePath;
    const fileName = path.basename(imagePath);

    // Проверка: используется ли работа в выставке
    const [usedInExhibition] = await db.query(`
      SELECT * FROM exhibitionartworks WHERE ArtworkID = ?
    `, [artworkID]);

    // Мягкое удаление из профиля
    await db.query('UPDATE artwork SET IsVisible = 0 WHERE ArtworkID = ?', [artworkID]);

    // Если НЕ используется в выставке — удалить файл
    if (usedInExhibition.length === 0 && imagePath) {
      const fullPath = path.join(uploadDir, fileName);
      fs.unlink(fullPath, (err) => {
        if (err) console.error('Ошибка удаления файла:', err);
        else console.log('Файл удалён:', fullPath);
      });
    }

    res.send('Работа удалена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при удалении');
  }
});





module.exports = router;
