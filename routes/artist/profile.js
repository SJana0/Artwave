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


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar_' + unique + ext);
  }
});
const upload = multer({ storage });


router.post('/edit-artist', verifyToken, upload.single('avatar'), async (req, res) => {
  const { userID } = req.user;
  const { bio, socialLinks } = req.body;
  const avatarPath = req.file ? '/uploads/' + req.file.filename : null;

  try {
    const [artistRows] = await db.query('SELECT * FROM artists WHERE UserID = ? AND Status = "approved"', [userID]);
    if (artistRows.length === 0) return res.status(403).send('Вы не художник');

    const artistID = artistRows[0].ArtistID;

    const updateQuery = `
      UPDATE artists 
      SET Bio = ?, SocialLinks = ?
      ${avatarPath ? ', AvatarPath = ?' : ''}
      WHERE ArtistID = ?
    `;

    const params = avatarPath
      ? [bio, socialLinks, avatarPath, artistID]
      : [bio, socialLinks, artistID];

    await db.query(updateQuery, params);

    res.send('Профиль успешно обновлён');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при обновлении профиля');
  }
});

module.exports = router;