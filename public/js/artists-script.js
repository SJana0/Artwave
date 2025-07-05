// 📁 public/js/artists.js

import { setupAuthUI } from './utils.js';
import { renderArtistCard } from './components.js';

document.addEventListener('DOMContentLoaded', async () => {
  setupAuthUI();

  const container = document.getElementById('artistsContainer');
  try {
    const res = await fetch('/api/artists');
    const data = await res.json();

    // Убираем фильтрацию, потому что статус уже проверяется на бэкенде
    if (!data.length) {
      container.innerHTML = '<p>Пока нет художников.</p>';
      return;
    }

    container.innerHTML = data.map(artist =>
      renderArtistCard({
        Username: artist.Username,
        AvatarPath: artist.AvatarPath,
        Bio: artist.Bio,
        ArtistID: artist.ArtistID
      })
    ).join('');
  } catch (err) {
    console.error('Ошибка загрузки художников:', err);
    container.innerText = 'Ошибка загрузки';
  }
});