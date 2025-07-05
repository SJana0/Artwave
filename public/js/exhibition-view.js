// 📁 public/js/exhibition-view.js

import { getToken, setupAuthUI, authFetch } from './utils.js';

setupAuthUI();
const token = getToken();

const urlParams = new URLSearchParams(window.location.search);
const exhibitionID = urlParams.get('id');

fetch(`/api/exhibition/${exhibitionID}`)
  .then(res => res.json())
  .then(data => {
  const info = document.getElementById('exhibitionInfo');
  info.innerHTML = `
    <h2 class="text-center text-3xl font-semibold text-gray-900 mb-6">${data.exhibition.Title}</h2>
    <p class="text-center text-md italic mb-2" style="color: #20977d;">${data.exhibition.Theme || ''}</p>
    <p class="text-center text-sm text-gray-500 mb-6">${dayjs(data.exhibition.PostDate).format('DD MMMM YYYY')}</p>
    <div class="text-lg text-gray-800 leading-relaxed text-justify">${data.exhibition.Description}</div>
  `;


    const container = document.getElementById('artworksContainer');
    data.artworks.forEach(art => {
      const block = document.createElement('div');
      block.className = 'artwork-block';
      block.innerHTML = `
        <img src="${art.ImagePath}" alt="${art.Title}" onclick="openFullscreenImage('${art.ImagePath}')" style="cursor:pointer;">
        <h3>${art.Title}</h3>
        <p>${art.Description || ''}</p>
        <a href="/artist-profile.html?id=${art.ArtistID}">Перейти к художнику</a>
      `;
      block.classList.add('fade-card');
      container.appendChild(block);
      requestAnimationFrame(() => {
        block.classList.add('show');
      });

    });



  })
  .catch(err => {
    document.getElementById('exhibitionInfo').innerText = 'Ошибка загрузки выставки';
    console.error(err);
  });

async function loadExhibitionFeedback() {
  let currentPage = 1;
  let hasMore = true;

  async function loadPage() {
    try {
      const res = await fetch(`/api/exhibition-comments/${exhibitionID}?page=${currentPage}&limit=10`);
      const data = await res.json();
      const container = document.getElementById('exhComments');

      if (currentPage === 1) {
        container.innerHTML = '';
      }

      if (data.comments.length === 0 && currentPage === 1) {
        container.innerHTML = '<p>Комментариев пока нет.</p>';
        hasMore = false;
        return;
      }

      for (const c of data.comments) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${c.Username}</strong>: ${c.Content}`;
        container.appendChild(p);
      }

      if ((currentPage * data.limit) >= data.total) {
        hasMore = false;
        document.getElementById('loadMoreBtn')?.remove();
      } else {
        currentPage++;
      }
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  }

    // Загрузка лайков
    // Загрузка лайков
  let liked = false;
  let likeCount = 0;

  try {
    const res = await fetch(`/api/exhibition-likes/${exhibitionID}`);
    const data = await res.json();
    likeCount = data.count;
    document.getElementById('likeCount').innerText = likeCount;
  } catch {
    likeCount = 0;
    document.getElementById('likeCount').innerText = likeCount;
  }

  if (token) {
    try {
      const res = await authFetch(`/api/exhibition-liked/${exhibitionID}`);
      const data = await res.json();
      liked = data.liked;
      document.querySelector('#exhLikeBtn img').src =
        liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
    } catch {}
  }

  document.getElementById('exhLikeBtn').onclick = async () => {
    try {
      const res = await authFetch(`/api/exhibition-likes/${exhibitionID}`, 'POST');
      const data = await res.json();
      liked = data.liked;
      likeCount = liked ? likeCount + 1 : likeCount - 1;
      document.getElementById('likeCount').innerText = likeCount;
      document.querySelector('#exhLikeBtn img').src =
        liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
    } catch (err) {
      console.error('Ошибка при обновлении лайка:', err);
    }
  };


  
    const formArea = document.getElementById('exhCommentForm');
  if (token) {
    formArea.innerHTML = `
      <form id="commentForm" class="modal-comment-form">
        <textarea name="content" placeholder="Оставьте комментарий..." required></textarea>
        <button type="submit">Отправить</button>
      </form>
    `;

    document.getElementById('commentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = e.target.content.value;
      if (!content.trim()) return;

      await authFetch(`/api/exhibition-comments/${exhibitionID}`, 'POST', { content });
      currentPage = 1;
      hasMore = true;
      loadPage();
    });
  } else {
    formArea.innerHTML = '<p>Войдите, чтобы комментировать</p>';
  }

  loadPage();

  const loadMore = document.createElement('button');
  loadMore.id = 'loadMoreBtn';
  loadMore.textContent = 'Показать ещё';
  loadMore.style = 'margin-top: 10px;';
  loadMore.onclick = () => {
    if (hasMore) loadPage();
  };
  document.getElementById('exhComments').after(loadMore);

}


loadExhibitionFeedback();
