const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../../db');
const verifyToken = require('../../middleware/verifyToken');

// Папка загрузки
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'req_' + unique + ext);
  }
});

//Фильтрация только изображений
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Можно загружать только изображения.'));
  }
};

//Собираем multer с фильтром
const upload = multer({ storage, fileFilter });

router.post('/request-exhibition', verifyToken, upload.any(), async (req, res) => {
  const { userID } = req.user;
  const body = req.body;
  const workCount = parseInt(body.workCount);

  try {
    const [artistRows] = await db.query('SELECT ArtistID FROM artists WHERE UserID = ? AND Status = "approved"', [userID]);
    if (artistRows.length === 0) return res.status(403).send('Вы не художник');

    const artistID = artistRows[0].ArtistID;
    const coverFile = req.files.find(f => f.fieldname === 'cover');
    if (!coverFile) return res.status(400).send('Обложка обязательна');

    const coverPath = '/uploads/' + coverFile.filename;

    const [result] = await db.query(`
      INSERT INTO exhibition_requests (ArtistID, Title, Description, Theme, CoverImagePath, Status, RequestDate)
      VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `, [artistID, body.title, body.description, body.theme, coverPath]);

    const requestID = result.insertId;

    for (let i = 0; i < workCount; i++) {
      const title = body[`workTitle_${i}`];
      const description = body[`workDescription_${i}`];
      const tagsRaw = body[`tags_${i}`];
      const tags = Array.isArray(tagsRaw) ? tagsRaw : (tagsRaw ? [tagsRaw] : []);
      const imageFile = req.files.find(f => f.fieldname === `image_${i}`);
      if (!title || !imageFile) continue;

      const imagePath = '/uploads/' + imageFile.filename;

      const [artRes] = await db.query(`
        INSERT INTO exhibition_request_artworks (RequestID, Title, Description, ImagePath)
        VALUES (?, ?, ?, ?)
      `, [requestID, title, description, imagePath]);

      const artworkID = artRes.insertId;

      for (const tagID of tags) {
        await db.query(`
          INSERT INTO exhibition_request_tags (ArtworkID, TagID)
          VALUES (?, ?)
        `, [artworkID, tagID]);
      }
    }

    res.send('Заявка успешно отправлена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});


// Админ: просмотр заявок
router.get('/requests-exhibitions', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');

  try {
    const [rows] = await db.query(`
      SELECT r.RequestID, r.Title, r.Description, r.Theme, r.CoverImagePath, r.Status, r.RequestDate,
             u.Username
      FROM exhibition_requests r
      JOIN artists a ON r.ArtistID = a.ArtistID
      JOIN users u ON a.UserID = u.UserID
      WHERE r.Status = 'pending'
      ORDER BY r.RequestDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка получения заявок');
  }
});

// Админ: получить работы по заявке
router.get('/request-artworks/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT ArtworkID, Title, Description, ImagePath
      FROM exhibition_request_artworks
      WHERE RequestID = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка');
  }
});

router.post('/approve-request/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const requestID = req.params.id;

  try {
    // Получить заявку
    const [rows] = await db.query('SELECT * FROM exhibition_requests WHERE RequestID = ?', [requestID]);
    if (rows.length === 0) return res.status(404).send('Заявка не найдена');
    const r = rows[0];

    // Получить работы
    const [artworks] = await db.query('SELECT * FROM exhibition_request_artworks WHERE RequestID = ?', [requestID]);

    // Вставить в таблицу exhibitions
    const [exhRes] = await db.query(`
      INSERT INTO exhibitions (Title, Description, Theme, Type, CoverImagePath, IsAnnouncement, PostDate)
      VALUES (?, ?, ?, 'personal', ?, 0, NOW())
    `, [r.Title, r.Description, r.Theme, r.CoverImagePath]);

    const exhibitionID = exhRes.insertId;

    for (const art of artworks) {
      const [artRes] = await db.query(`
        INSERT INTO artwork (ArtistID, Title, Description, ImagePath, UploadDate, IsApproved)
        VALUES (?, ?, ?, ?, NOW(), 1)
      `, [r.ArtistID, art.Title, art.Description, art.ImagePath]);

      const artworkID = artRes.insertId;

      await db.query(`
        INSERT INTO exhibitionartworks (ExhibitionID, ArtworkID)
        VALUES (?, ?)
      `, [exhibitionID, artworkID]);

      // Перенос тегов
      const [tags] = await db.query('SELECT TagID FROM exhibition_request_tags WHERE ArtworkID = ?', [art.ArtworkID]);
      for (const tag of tags) {
        await db.query(`
          INSERT INTO artworktags (ArtworkID, TagID)
          VALUES (?, ?)
        `, [artworkID, tag.TagID]);
      }
    }

    await db.query('UPDATE exhibition_requests SET Status = "approved" WHERE RequestID = ?', [requestID]);

    res.send('Выставка успешно создана и заявка одобрена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при одобрении');
  }
});


router.post('/reject-request/:id', verifyToken, async (req, res) => {
  if (!['admin', 'expert'].includes(req.user.role)) return res.status(403).send('Нет доступа');
  const requestID = req.params.id;

  try {
    await db.query('UPDATE exhibition_requests SET Status = "rejected" WHERE RequestID = ?', [requestID]);
    res.send('Заявка отклонена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при отклонении');
  }
});

//Редактировать выставку
router.post('/edit-exhibition/:id', verifyToken, upload.single('cover'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Нет доступа');
  const id = req.params.id;
  const { title, description, theme, type } = req.body;
  const cover = req.file ? '/uploads/' + req.file.filename : null;

  try {
    const [existing] = await db.query('SELECT * FROM exhibitions WHERE ExhibitionID = ?', [id]);
    if (existing.length === 0) return res.status(404).send('Выставка не найдена');

    const updateQuery = `
      UPDATE exhibitions
      SET Title = ?, Description = ?, Theme = ?, Type = ?${cover ? ', CoverImagePath = ?' : ''}
      WHERE ExhibitionID = ?
    `;
    const params = cover
      ? [title, description, theme, type, cover, id]
      : [title, description, theme, type, id];

    await db.query(updateQuery, params);
    res.send('Выставка обновлена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при обновлении');
  }
});

//Удалить выставку
router.delete('/delete-exhibition/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    // Удалим все связи (если есть)
    await db.query('DELETE FROM likes WHERE ExhibitionID = ?', [id]);
    await db.query('DELETE FROM comments WHERE ExhibitionID = ?', [id]);

    const [artworkIDs] = await db.query(`
      SELECT ea.ArtworkID FROM exhibitionartworks ea
      JOIN exhibitions e ON ea.ExhibitionID = e.ExhibitionID
      WHERE ea.ExhibitionID = ? AND e.IsAnnouncement = 0
    `, [id]);

    for (const row of artworkIDs) {
      await db.query('DELETE FROM artworktags WHERE ArtworkID = ?', [row.ArtworkID]);
      await db.query('DELETE FROM artwork_likes WHERE ArtworkID = ?', [row.ArtworkID]);
      await db.query('DELETE FROM artwork_comments WHERE ArtworkID = ?', [row.ArtworkID]);
      await db.query('DELETE FROM artwork WHERE ArtworkID = ?', [row.ArtworkID]);
    }

    await db.query('DELETE FROM exhibitionartworks WHERE ExhibitionID = ?', [id]);
    await db.query('DELETE FROM exhibitions WHERE ExhibitionID = ?', [id]);

    res.send('Выставка удалена');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при удалении');
  }
});


router.post('/edit-announcement/:id', verifyToken, upload.single('cover'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Нет доступа');
  const id = req.params.id;
  const { title, description, theme } = req.body;
  const cover = req.file ? '/uploads/' + req.file.filename : null;

  try {
    const [existing] = await db.query(
      'SELECT * FROM exhibitions WHERE ExhibitionID = ? AND IsAnnouncement = 1',
      [id]
    );
    if (existing.length === 0) return res.status(404).send('Анонс не найден');

    const updateQuery = `
      UPDATE exhibitions
      SET Title = ?, Description = ?, Theme = ?${cover ? ', CoverImagePath = ?' : ''}
      WHERE ExhibitionID = ? AND IsAnnouncement = 1
    `;
    const params = cover
      ? [title, description, theme, cover, id]
      : [title, description, theme, id];

    await db.query(updateQuery, params);
    res.send('Анонс обновлён');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при обновлении анонса');
  }
});


router.delete('/delete-announcement/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Нет доступа');
  const id = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM exhibitions WHERE ExhibitionID = ? AND IsAnnouncement = 1', [id]);
    if (rows.length === 0) return res.status(404).send('Анонс не найден');

    await db.query('DELETE FROM exhibitions WHERE ExhibitionID = ?', [id]);
    res.send('Анонс удалён');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при удалении анонса');
  }
});



module.exports = router;
