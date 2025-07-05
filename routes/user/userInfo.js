const express = require('express');
const router = express.Router();
const db = require('../../db');
const verifyToken = require('../../middleware/verifyToken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 📁 Подготовка папки
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 🛠 Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'apply_' + unique + ext);
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

// 🔹 Профиль с проверкой роли и статуса художника
router.get('/profile-full', verifyToken, async (req, res) => {
  const { userID, username, role } = req.user;

  try {
    const [artistRows] = await db.query('SELECT * FROM artists WHERE UserID = ?', [userID]);
    const isArtist = artistRows.length > 0 && artistRows[0].Status === 'approved';

    res.json({
      userID,
      username,
      role,
      isArtist,
      artistID: isArtist ? artistRows[0].ArtistID : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении профиля' });
  }
});

// 🔹 Заявка на художника с примерами работ
router.post('/apply-artist', verifyToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'samples', maxCount: 5 }
]), async (req, res) => {
  const userID = req.user.userID;
  const { bio, socialLinks } = req.body;
  const avatarFile = req.files['avatar']?.[0];
  const sampleFiles = req.files['samples'] || [];
  const avatarPath = avatarFile ? '/uploads/' + avatarFile.filename : null;

  try {
    const [existing] = await db.query('SELECT * FROM artists WHERE UserID = ?', [userID]);

if (existing.length > 0) {
  const artist = existing[0];

  if (artist.Status === 'approved' || artist.Status === 'pending') {
    return res.status(400).send('Заявка уже отправлена или вы уже художник');
  }

  if (artist.Status === 'rejected') {
    // Обновляем заявку
    await db.query(`
      UPDATE artists 
      SET Bio = ?, SocialLinks = ?, Status = 'pending', AvatarPath = ?
      WHERE ArtistID = ?
    `, [bio, socialLinks, avatarPath, artist.ArtistID]);

    // Удалим старые примеры работ
    await db.query('DELETE FROM artist_samples WHERE ArtistID = ?', [artist.ArtistID]);

    // Добавим новые
    for (const file of sampleFiles) {
      const imagePath = '/uploads/' + file.filename;
      await db.query(`
        INSERT INTO artist_samples (ArtistID, ImagePath)
        VALUES (?, ?)
      `, [artist.ArtistID, imagePath]);
    }

    return res.send('Заявка обновлена и снова отправлена на рассмотрение.');
  }
}


    // вставка в таблицу artists
    const [insertRes] = await db.query(`
      INSERT INTO artists (UserID, Bio, SocialLinks, Status, AvatarPath)
      VALUES (?, ?, ?, 'pending', ?)
    `, [userID, bio, socialLinks, avatarPath]);

    const artistID = insertRes.insertId;

    // вставка примеров в artist_samples
    for (const file of sampleFiles) {
      const imagePath = '/uploads/' + file.filename;
      await db.query(`
        INSERT INTO artist_samples (ArtistID, ImagePath)
        VALUES (?, ?)
      `, [artistID, imagePath]);
    }

    res.send('Заявка успешно отправлена с примерами работ.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});


module.exports = router;
