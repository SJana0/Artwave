// 📁 public/js/auth-modal.js

fetch('/auth-modal.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('authModalContainer').innerHTML = html;

    const authModal = document.getElementById('authModal');
    const authTabLogin = document.getElementById('authTabLogin');
    const authTabRegister = document.getElementById('authTabRegister');
    const modalLoginForm = document.getElementById('modalLoginForm');
    const modalRegisterForm = document.getElementById('modalRegisterForm');
    const modalMessage = document.getElementById('modalMessage');
    const authModalClose = document.getElementById('authModalClose');

    // Открытие по клику на элементы с data-auth-open
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
    loginBtn.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('authModal').classList.remove('hidden');
    });
    }


    // Закрытие по крестику
    authModalClose.addEventListener('click', () => {
      authModal.classList.add('hidden');
    });

    // Переключение вкладок
    authTabLogin.onclick = () => {
      authTabLogin.classList.add('active');
      authTabRegister.classList.remove('active');

      modalLoginForm.classList.remove('opacity-0', 'pointer-events-none');
      modalLoginForm.classList.add('opacity-100');
      modalRegisterForm.classList.add('opacity-0', 'pointer-events-none');
      modalRegisterForm.classList.remove('opacity-100');

      modalMessage.innerText = '';
    };

    authTabRegister.onclick = () => {
      authTabRegister.classList.add('active');
      authTabLogin.classList.remove('active');

      modalLoginForm.classList.add('opacity-0', 'pointer-events-none');
      modalLoginForm.classList.remove('opacity-100');
      modalRegisterForm.classList.remove('opacity-0', 'pointer-events-none');
      modalRegisterForm.classList.add('opacity-100');

      modalMessage.innerText = '';
    };


    modalRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(modalRegisterForm));

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const text = await res.text();
        if (!res.ok) {
          modalMessage.innerText = text;
          return;
        }

        // авто-вход
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password })
        });

        const loginResult = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem('token', loginResult.token);
          location.reload();
        } else {
          modalMessage.innerText = 'Ошибка входа после регистрации: ' + loginResult.message;
        }
      } catch {
        modalMessage.innerText = 'Ошибка сервера';
      }
    });


    modalLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(modalLoginForm));
        try {
            const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
            localStorage.setItem('token', result.token);
            location.reload(); // вход успешен — перезагрузка страницы
            } else {
            modalMessage.innerText = result.message;
            }
        } catch {
            modalMessage.innerText = 'Ошибка сервера';
        }
        });

  });

  // 📢 Реакция на кастомное событие для открытия модалки (например, с nav.js)
document.addEventListener('open-auth-modal', () => {
  document.getElementById('authModal').classList.remove('hidden');
});
