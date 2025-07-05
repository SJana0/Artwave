// 📁 public/js/index.js

import { getToken, setupAuthUI, authFetch } from './utils.js';
import { renderExhibitionCard } from './components.js';

setupAuthUI();
const token = getToken();

const announcementContainer = document.getElementById('announcementContainer');
if (announcementContainer) {
  fetch('/api/announcements')
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        announcementContainer.innerHTML = '<p>Анонсов пока нет.</p>';
        return;
      }

      data.forEach(a => {
        const item = document.createElement('div');
        item.className = 'announcement-item fade-card';
        item.innerHTML = `
          <img src="${a.CoverImagePath}" alt="${a.Title}" />
          <div class="info">
            <h3>${a.Title}</h3>
            <p>${a.Theme || ''}</p>
          </div>
        `;
        item.addEventListener('click', () => {
          window.location.href = `/announcement-view.html?id=${a.ExhibitionID}`;
        });
        announcementContainer.appendChild(item);
        requestAnimationFrame(() => {
          item.classList.add('show');
        });
      });

    })
    .catch(err => {
      console.error('Ошибка загрузки анонсов:', err);
    });
}

const exhibitionsContainer = document.getElementById('exhibitionsContainer');
if (exhibitionsContainer) {
  fetch('/api/exhibitions')
    .then(res => res.json())
    .then(async data => {
      if (data.length === 0) {
        exhibitionsContainer.innerHTML = '<p>Пока нет выставок.</p>';
        return;
      }

      exhibitionsContainer.innerHTML = '';
      for (const ex of data) {
        let likeCount = 0;
        let liked = false;

        try {
          const res = await fetch(`/api/exhibition-likes/${ex.ExhibitionID}`);
          const likeData = await res.json();
          likeCount = likeData.count || 0;
        } catch {}

        if (token) {
          try {
            const res = await authFetch(`/api/exhibition-liked/${ex.ExhibitionID}`);
            const result = await res.json();
            liked = result.liked;
          } catch {}
        }

        const html = renderExhibitionCard({
          CoverImagePath: ex.CoverImagePath,
          Title: ex.Title,
          Theme: ex.Theme,
          ExhibitionID: ex.ExhibitionID,
          liked,
          likeCount
        });

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const cardEl = wrapper.firstElementChild;

        const likeBtn = cardEl.querySelector('.like-btn');
        if (likeBtn) {
          likeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = likeBtn.dataset.id;
            try {
              const res = await authFetch(`/api/exhibition-likes/${id}`, 'POST');
              const result = await res.json();
              liked = result.liked;
              likeCount += liked ? 1 : -1;

              const icon = likeBtn.querySelector('img');
              const countSpan = cardEl.querySelector('.like-count');
              icon.src = liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
              countSpan.textContent = likeCount;

              icon.classList.remove('scale-100');
              icon.classList.add('scale-125');
              setTimeout(() => {
                icon.classList.remove('scale-125');
                icon.classList.add('scale-100');
              }, 150);
            } catch (err) {
              console.error('Ошибка при лайке', err);
            }
          });
        }

        cardEl.addEventListener('click', (e) => {
          if (e.target.closest('.like-btn')) return;
          const id = cardEl.dataset.id;
          window.location.href = `/exhibition-view.html?id=${id}`;
        });

        cardEl.classList.add('fade-card');
        exhibitionsContainer.appendChild(cardEl);
        requestAnimationFrame(() => {
          cardEl.classList.add('show');
        });
      }
    })
    .catch(err => {
      console.error('Ошибка загрузки выставок:', err);
    });
}


