// 📁 public/js/utils.js

// Получение токена
export function getToken() {
  return localStorage.getItem('token');
}

// Отображение кнопок в зависимости от авторизации
export function setupAuthUI() {
  window.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileBtn = document.getElementById('profileBtn');

    if (token) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline';
      if (profileBtn) profileBtn.style.display = 'inline';
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        location.href = '/';
      });
    }
  });
}


// Запрос с авторизацией (GET/POST)
export async function authFetch(url, method = 'GET', body = null) {
  const token = getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: 'Bearer ' + token })
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  return res;
}
