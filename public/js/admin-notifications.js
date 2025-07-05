// 📁 public/js/admin-notifications.js

import { authFetch } from './utils.js';

async function loadAdminNotifications() {
  const container = document.createElement('div');
  container.className = 'fixed bottom-5 left-3 bg-white border shadow-md rounded-lg px-4 py-3 text-sm z-[9999] max-w-xs';
  container.id = 'adminNotificationPanel';
  container.innerHTML = '<strong class="block mb-2">Уведомления</strong><div id="notifList">Загрузка...</div>';
  document.body.appendChild(container);

  const list = container.querySelector('#notifList');

  try {
    const [artists, exhibitions] = await Promise.all([
      authFetch('/api/requests-artists'),
      authFetch('/api/requests-exhibitions')
    ]);

    const [artistData, exhibitionData] = await Promise.all([
      artists.json(),
      exhibitions.json()
    ]);

    if (artistData.length === 0 && exhibitionData.length === 0) {
      list.innerHTML = '<p>Заявок нет.</p>';
      return;
    }

    list.innerHTML = '';
    if (artistData.length > 0) {
      const p = document.createElement('p');
      p.innerHTML = `👩‍🎨 Новых заявок на художника: <strong>${artistData.length}</strong>`;
      list.appendChild(p);
    }
    if (exhibitionData.length > 0) {
      const p = document.createElement('p');
      p.innerHTML = `🖼️ Новых заявок на выставку: <strong>${exhibitionData.length}</strong>`;
      list.appendChild(p);
    }
  } catch (err) {
    list.innerHTML = '<p class="text-red-500">Ошибка загрузки уведомлений</p>';
    console.error('Ошибка уведомлений админа:', err);
  }
}

if (['/admin.html', '/expert.html'].includes(window.location.pathname)) {
  window.addEventListener('DOMContentLoaded', loadAdminNotifications);
}
