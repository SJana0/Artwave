document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.navigation a');
  const current = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (
      (current === '/' && href === '/') ||
      (current.includes('exhibitions') && href.includes('exhibitions')) ||
      (current.includes('artists') && href.includes('artists')) ||
      (current.includes('profile') && href.includes('profile'))
    ) {
      link.classList.add('active');
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main');

  // Плавное появление <main>
  if (main) {
    requestAnimationFrame(() => {
      main.classList.add('fade-in');
    });
  }

  // Плавное исчезновение при переходе
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (
      link &&
      link.href &&
      link.target !== '_blank' &&
      !link.href.startsWith('javascript:') &&
      !link.href.includes('#') &&
      link.hostname === location.hostname
    ) {
      e.preventDefault();
      if (main) {
        main.classList.remove('fade-in');
        setTimeout(() => {
          window.location.href = link.href;
        }, 400); // совпадает с transition
      } else {
        window.location.href = link.href;
      }
    }
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.navigation a');
  const current = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (
      (current === '/' && href === '/') ||
      (current.includes('exhibitions') && href.includes('exhibitions')) ||
      (current.includes('artists') && href.includes('artists')) ||
      (current.includes('profile') || current.includes('admin')) && href.includes('profile')
    ) {
      link.classList.add('active');
    }
  });

  const profileBtn = document.getElementById('profileBtn');
  const loginBtn = document.getElementById('loginBtn');

  if (profileBtn) {
    profileBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      if (!token) {
        // Показываем модальное окно входа
        const event = new CustomEvent('open-auth-modal');
        document.dispatchEvent(event);
        return;
      }

      try {
        const res = await fetch('/api/profile-full', {
          headers: {
            Authorization: 'Bearer ' + token
          }
        });
        const data = await res.json();
        if (data.role === 'admin') {
          window.location.href = '/admin.html';
        } else if (data.role === 'user' && data.isArtist) {
          window.location.href = `/artist-profile.html?id=${data.artistID}`;
        } else if (data.role === 'expert') {
          window.location.href = '/expert.html';
        } else {
          window.location.href = '/apply-artist.html';
        }
      } catch (err) {
        console.error('Ошибка перехода в профиль', err);
        location.href = '/';
      }
    });
  }

  const main = document.querySelector('main');
  if (main) {
    requestAnimationFrame(() => {
      main.classList.add('fade-in');
    });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (
      link &&
      link.href &&
      link.target !== '_blank' &&
      !link.href.startsWith('javascript:') &&
      !link.href.includes('#') &&
      link.hostname === location.hostname
    ) {
      e.preventDefault();
      if (main) {
        main.classList.remove('fade-in');
        setTimeout(() => {
          window.location.href = link.href;
        }, 400);
      } else {
        window.location.href = link.href;
      }
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');

  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
  }

  // Копируем поведение с десктопной навигации
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');
  const profileBtnMobile = document.getElementById('profileBtnMobile');
  const loginBtnMobile = document.getElementById('loginBtnMobile');

  if (profileBtnMobile) {
    profileBtnMobile.addEventListener('click', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      if (!token) {
        const event = new CustomEvent('open-auth-modal');
        document.dispatchEvent(event);
        return;
      }

      try {
        const res = await fetch('/api/profile-full', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.role === 'admin') {
          window.location.href = '/admin.html';
        } else if (data.role === 'user' && data.isArtist) {
          window.location.href = `/artist-profile.html?id=${data.artistID}`;
        } else {
          window.location.href = '/apply-artist.html';
        }
      } catch (err) {
        console.error('Ошибка перехода в профиль', err);
        location.href = '/';
      }
    });
  }
});
