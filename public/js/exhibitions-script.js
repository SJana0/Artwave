// 📁 public/js/exhibitions.js

import { getToken, setupAuthUI, authFetch } from './utils.js';
import { renderExhibitionCard } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();
  const token = getToken();

  let allExhibitions = [];

  function renderExhibitions(data) {
    const container = document.getElementById('exhibitionsContainer');
    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p>Нет выставок по выбранным фильтрам.</p>';
      } else {
        data.forEach(async ex => {
          let liked = false;
          let likeCount = ex.LikeCount || 0;

          if (token) {
            try {
              const res = await authFetch(`/api/exhibition-liked/${ex.ExhibitionID}`);
              const d = await res.json();
              liked = d.liked;
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

          // Обработка лайка
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
              } catch (err) {
                console.error('Ошибка при лайке', err);
              }
            });
          }

          cardEl.classList.add('fade-card');
          container.appendChild(cardEl);
          requestAnimationFrame(() => {
            cardEl.classList.add('show');
          });

        });
      }
      container.style.opacity = '1';
    }, 150);
  }

  function applyFilters() {
    const type = document.getElementById('typeFilter').value;
    const sort = document.getElementById('sortFilter').value;
    const selectedTagIDs = tagChoices.getValue(true).map(Number);

    let filtered = allExhibitions.slice();
    if (type !== 'all') {
      filtered = filtered.filter(e => e.Type === type);
    }
    if (selectedTagIDs.length > 0) {
      filtered = filtered.filter(e => e.TagIDs?.some(tagID => selectedTagIDs.includes(tagID)));
    }
    if (sort === 'popular') {
      filtered.sort((a, b) => (b.LikeCount || 0) - (a.LikeCount || 0));
    } else if (sort === 'date') {
      filtered.sort((a, b) => new Date(b.PostDate) - new Date(a.PostDate));
    } else if (sort === 'alpha') {
      filtered.sort((a, b) => a.Title.localeCompare(b.Title, 'ru'));
    }
    renderExhibitions(filtered);
  }

  const tagChoices = new Choices('#tagFilter', {
    removeItemButton: true,
    placeholderValue: 'Выберите теги',
    searchPlaceholderValue: 'Поиск...'
  });

  fetch('/api/tags')
    .then(res => res.json())
    .then(tags => {
      const select = document.getElementById('tagFilter');
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.TagID;
        option.textContent = tag.TagName;
        select.appendChild(option);
      });
      tagChoices.setChoices(Array.from(select.options).map(o => ({ value: o.value, label: o.textContent })), 'value', 'label', true);
    });

  fetch('/api/exhibitions-with-tags')
    .then(res => res.json())
    .then(data => {
      allExhibitions = data;
      applyFilters();
    });

  document.getElementById('typeFilter').addEventListener('change', applyFilters);
  document.getElementById('sortFilter').addEventListener('change', applyFilters);
  document.getElementById('tagFilter').addEventListener('change', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('sortFilter').value = 'date';
    tagChoices.removeActiveItems();
    applyFilters();
  });

  document.getElementById('exhibitionsContainer').addEventListener('click', (e) => {
    if (e.target.closest('.like-btn')) return;
    const card = e.target.closest('.exhibition-card');
    if (card) {
      const id = card.dataset.id;
      window.location.href = `/exhibition-view.html?id=${id}`;
    }
  });
});