const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../../db');
const verifyToken = require('../../middleware/verifyToken');

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

// 👉 Убираем /api — он добавляется в index.js
router.get('/exhibitions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ExhibitionID, 
        Title, 
        Description, 
        Theme, 
        PostDate, 
        CoverImagePath 
      FROM exhibitions 
      WHERE IsAnnouncement = 0 
      ORDER BY PostDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении выставок' });
  }
});

router.post('/create-exhibition', verifyToken, upload.any(), async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') return res.status(403).send('Нет доступа');

  try {
    const body = req.body;
    const workCount = parseInt(body.workCount);
    const coverFile = req.files.find(f => f.fieldname === 'cover');
    if (!coverFile) return res.status(400).send('Обложка обязательна');

    const coverPath = '/uploads/' + coverFile.filename;

    const [result] = await db.query(`
      INSERT INTO exhibitions (Title, Description, Theme, Type, CoverImagePath, IsAnnouncement, PostDate)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `, [body.title, body.description, body.theme, body.type, coverPath]);

    const exhibitionID = result.insertId;

    for (let i = 0; i < workCount; i++) {
      const title = body[`workTitle_${i}`];
      const description = body[`workDescription_${i}`];
      const artistID = body[`artistID_${i}`];
      const tagsRaw = body[`tags_${i}`];
      const tags = Array.isArray(tagsRaw) ? tagsRaw : (tagsRaw ? [tagsRaw] : []);
      const imageFile = req.files.find(f => f.fieldname === `image_${i}`);

      if (!title || !artistID || !imageFile) continue;

      const imagePath = '/uploads/' + imageFile.filename;

      const [artRes] = await db.query(`
        INSERT INTO artwork (ArtistID, Title, Description, ImagePath, UploadDate, IsApproved)
        VALUES (?, ?, ?, ?, NOW(), 1)
      `, [artistID, title, description, imagePath]);

      const artworkID = artRes.insertId;

      await db.query(`
        INSERT INTO exhibitionartworks (ExhibitionID, ArtworkID)
        VALUES (?, ?)
      `, [exhibitionID, artworkID]);

      for (const tagID of tags) {
        await db.query(`
          INSERT INTO artworktags (ArtworkID, TagID)
          VALUES (?, ?)
        `, [artworkID, tagID]);
      }
    }

    res.send('Выставка успешно создана');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

router.get('/exhibition/:id', async (req, res) => {
  const exhibitionID = req.params.id;

  try {
    const [exhRows] = await db.query(
      'SELECT * FROM exhibitions WHERE ExhibitionID = ?',
      [exhibitionID]
    );

    if (exhRows.length === 0) {
      return res.status(404).json({ message: 'Выставка не найдена' });
    }

    const [artworks] = await db.query(`
      SELECT 
        a.ArtworkID,
        a.Title,
        a.Description,
        a.ImagePath,
        a.ArtistID,
        u.Username AS ArtistName
      FROM exhibitionartworks ea
      JOIN artwork a ON ea.ArtworkID = a.ArtworkID
      JOIN artists ar ON a.ArtistID = ar.ArtistID
      JOIN users u ON ar.UserID = u.UserID
      WHERE ea.ExhibitionID = ?
    `, [exhibitionID]);

    res.json({
      exhibition: exhRows[0],
      artworks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при загрузке выставки' });
  }
});



// Получить комментарии выставки
router.get('/exhibition-comments/:id', async (req, res) => {
  const id = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(`
      SELECT c.Content, c.PostDate, u.Username
      FROM comments c
      JOIN users u ON c.UserID = u.UserID
      WHERE c.ExhibitionID = ?
      ORDER BY c.PostDate DESC
      LIMIT ? OFFSET ?
    `, [id, limit, offset]);

    const [totalRows] = await db.query(`
      SELECT COUNT(*) as total FROM comments WHERE ExhibitionID = ?
    `, [id]);

    res.json({
      comments: rows,
      total: totalRows[0].total,
      page,
      limit
    });
  } catch (err) {
    console.error('Ошибка получения комментариев:', err);
    res.status(500).json({ message: 'Ошибка получения комментариев' });
  }
});


// Добавить комментарий
router.post('/exhibition-comments/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const { content } = req.body;
  const userID = req.user.userID;

  if (!content?.trim()) {
    return res.status(400).json({ message: 'Комментарий пустой' });
  }

  try {
    await db.query(`
      INSERT INTO comments (ExhibitionID, UserID, Content, PostDate)
      VALUES (?, ?, ?, NOW())
    `, [id, userID, content.trim()]);
    console.log('Комментарий добавлен пользователем', userID, 'к выставке', id);
    res.send('Комментарий добавлен');
  } catch (err) {
    console.error('Ошибка при добавлении комментария:', err);
    res.status(500).json({ message: 'Ошибка добавления комментария' });
  }
});

// Получить количество лайков
router.get('/exhibition-likes/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS count FROM likes WHERE ExhibitionID = ?
    `, [id]);
    const count = rows[0]?.count ?? 0;
    res.json({ count });
  } catch (err) {
    console.error('Ошибка получения лайков:', err);
    res.status(500).json({ message: 'Ошибка получения лайков' });
  }
});

// Проверка: лайкнул ли пользователь
router.get('/exhibition-liked/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const userID = req.user.userID;

  try {
    const [rows] = await db.query(`
      SELECT * FROM likes WHERE ExhibitionID = ? AND UserID = ?
    `, [id, userID]);

    res.json({ liked: rows.length > 0 });
  } catch (err) {
    console.error('Ошибка проверки лайка:', err);
    res.status(500).json({ message: 'Ошибка проверки лайка' });
  }
});

// Поставить или убрать лайк
router.post('/exhibition-likes/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const userID = req.user.userID;

  try {
    const [existing] = await db.query(`
      SELECT * FROM likes WHERE ExhibitionID = ? AND UserID = ?
    `, [id, userID]);

    if (existing.length > 0) {
      await db.query(`
        DELETE FROM likes WHERE ExhibitionID = ? AND UserID = ?
      `, [id, userID]);
      res.json({ liked: false });
    } else {
      await db.query(`
        INSERT INTO likes (ExhibitionID, UserID) VALUES (?, ?)
      `, [id, userID]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Ошибка при обработке лайка:', err);
    res.status(500).json({ message: 'Ошибка при обработке лайка' });
  }
});


router.post('/create-announcement', verifyToken, upload.single('cover'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Нет доступа');

  const { title, description, theme } = req.body;
  if (!req.file) return res.status(400).send('Обложка обязательна');

  try {
    const coverPath = '/uploads/' + req.file.filename;

    await db.query(`
      INSERT INTO exhibitions (Title, Description, Theme, Type, CoverImagePath, IsAnnouncement, PostDate)
      VALUES (?, ?, ?, 'announcement', ?, 1, NOW())
    `, [title, description, theme || '', coverPath]);

    res.send('Анонс успешно создан');
  } catch (err) {
    console.error('Ошибка создания анонса:', err);
    res.status(500).send('Ошибка сервера');
  }
});

// Получить только анонсы (IsAnnouncement = 1)
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ExhibitionID, Title, Description, Theme, CoverImagePath, PostDate
      FROM exhibitions
      WHERE IsAnnouncement = 1
      ORDER BY PostDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения анонсов:', err);
    res.status(500).json({ message: 'Ошибка при получении анонсов' });
  }
});


router.get('/exhibitions-full', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.ExhibitionID,
        e.Title,
        e.Description,
        e.Theme,
        e.Type,
        e.PostDate,
        e.CoverImagePath,
        COUNT(l.LikeID) AS LikeCount
      FROM exhibitions e
      LEFT JOIN likes l ON l.ExhibitionID = e.ExhibitionID
      WHERE e.IsAnnouncement = 0
      GROUP BY e.ExhibitionID
      ORDER BY e.PostDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения выставок:', err);
    res.status(500).json({ message: 'Ошибка при получении выставок' });
  }
});


router.get('/exhibitions-with-tags', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.ExhibitionID,
        e.Title,
        e.Type,
        e.Theme,
        e.PostDate,
        e.CoverImagePath,
        COUNT(DISTINCT l.LikeID) AS LikeCount,
        GROUP_CONCAT(DISTINCT t.TagID) AS TagIDs
      FROM exhibitions e
      LEFT JOIN likes l ON l.ExhibitionID = e.ExhibitionID
      LEFT JOIN exhibitionartworks ea ON ea.ExhibitionID = e.ExhibitionID
      LEFT JOIN artworktags at ON ea.ArtworkID = at.ArtworkID
      LEFT JOIN tags t ON t.TagID = at.TagID
      WHERE e.IsAnnouncement = 0
      GROUP BY e.ExhibitionID
      ORDER BY e.PostDate DESC
    `);

    // обработка: TagIDs будет строкой вида "1,2,5"
    const formatted = rows.map(row => ({
      ...row,
      TagIDs: row.TagIDs ? row.TagIDs.split(',').map(id => parseInt(id)) : []
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Ошибка при получении выставок с тегами:', err);
    res.status(500).json({ message: 'Ошибка получения данных' });
  }
});

module.exports = router;
