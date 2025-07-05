const express = require('express');
const router = express.Router();
const db = require('../../db');

router.get('/artists', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.ArtistID,
        u.Username,
        a.Bio,
        a.AvatarPath
      FROM artists a
      JOIN users u ON a.UserID = u.UserID
      WHERE a.Status = 'approved'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении художников' });
  }
});

router.get('/artist-options', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.ArtistID, u.Username 
      FROM artists a 
      JOIN users u ON a.UserID = u.UserID
      WHERE a.Status = 'approved'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении списка художников' });
  }
});

router.get('/artist/:id', async (req, res) => {
  const artistID = req.params.id;

  try {
    const [infoRows] = await db.query(`
      SELECT a.ArtistID, a.Bio, a.SocialLinks, a.AvatarPath, u.Username, u.UserID
      FROM artists a
      JOIN users u ON a.UserID = u.UserID
      WHERE a.ArtistID = ? AND a.Status = 'approved'
    `, [artistID]);

    if (infoRows.length === 0) {
      return res.status(404).json({ message: 'Художник не найден' });
    }

    const [artworks] = await db.query(`
      SELECT ArtworkID, Title, Description, ImagePath
      FROM artwork
      WHERE ArtistID = ? AND IsApproved = 1 AND IsVisible = 1
      ORDER BY UploadDate DESC
    `, [artistID]);

    res.json({
      artist: infoRows[0],
      artworks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка загрузки художника' });
  }
});


module.exports = router;
