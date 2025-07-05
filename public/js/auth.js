// 📁 public/js/auth.js

import { getToken } from './utils.js';

// Форма входа
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('token', result.token);
        window.location.href = '/';
      } else {
        document.getElementById('message').innerText = result.message;
      }
    } catch (err) {
      console.error(err);
      document.getElementById('message').innerText = 'Ошибка сервера';
    }
  });
}

// Форма регистрации
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const text = await res.text();
      if (!res.ok) {
        document.getElementById('message').innerText = text;
        return;
      }

      // автоматический вход после успешной регистрации
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password })
      });
      const loginResult = await loginRes.json();

      if (loginRes.ok) {
        localStorage.setItem('token', loginResult.token);
        window.location.href = '/';
      } else {
        document.getElementById('message').innerText = 'Ошибка входа после регистрации: ' + loginResult.message;
      }
    } catch (err) {
      console.error(err);
      document.getElementById('message').innerText = 'Ошибка сервера';
    }
  });
}
