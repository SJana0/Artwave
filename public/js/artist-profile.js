import { getToken, setupAuthUI, authFetch } from './utils.js';

setupAuthUI();
const params = new URLSearchParams(window.location.search);
const artistID = params.get('id');
let me = null;

async function loadProfile() {
  const res = await fetch(`/api/artist/${artistID}`);
  const data = await res.json();

  const info = data.artist;
  const artistInfoDiv = document.getElementById('artistInfo');

  artistInfoDiv.innerHTML = `
    <div style="display:flex; align-items:center; gap:30px; margin-bottom: 40px;">
      <img src="${info.AvatarPath || '/images/default-avatar.png'}"
          style="width:150px; height:150px; object-fit:cover; border-radius: 9999px; border: 3px solid #ddd;">
      <div style="flex:1;">
        <h2 style="font-size: 28px; font-weight: 600; margin-bottom: 10px;">${info.Username}</h2>
        <div style="margin-bottom: 10px;">
        </div>
        <div style="margin-bottom: 10px;">
          <span style="display:inline-block; margin-top:4px;">${info.Bio || '-'}</span>
        </div>
          ${info.SocialLinks ? `<a href="${info.SocialLinks}" target="_blank" style="display:inline-block; margin-top:10px; color:#20977d;" onmouseover="this.style.color='#176759'" onmouseout="this.style.color='#20977d'">🔗 Связаться</a>` : ''}
        <div id="privateButtons" style="margin-top: 20px;"></div>
      </div>
    </div>
  `;


  const token = getToken();
  if (token) {
    try {
      const meRes = await authFetch('/api/profile-full');
      me = await meRes.json();

      if (me.artistID && me.artistID == info.ArtistID) {
        const buttons = document.getElementById('privateButtons');
        buttons.innerHTML = `
          <div class="artist-actions">
            <button onclick="location.href='/upload.html'">Загрузить работу</button>
            <button onclick="location.href='/request-exhibition.html'">Подать заявку</button>
            <button onclick="location.href='/edit-artist.html'">Редактировать</button>
          </div>
        `;
      }
    } catch (err) {
      console.error('Ошибка авторизации:', err);
    }
  }

  const container = document.getElementById('artworksContainer');
  if (data.artworks.length === 0) {
    container.innerHTML = '<p>Нет работ</p>';
    return;
  }

  container.innerHTML = '';
  for (const art of data.artworks) {
    const item = document.createElement('div');
    item.className = 'artwork-card';
    item.innerHTML = `
      <img src="${art.ImagePath}" alt="${art.Title}">
      <div class="artwork-overlay">${art.Title}</div>
      <div class="like-indicator" data-id="${art.ArtworkID}">
        <img src="/icons/heart-outline.svg" alt="like" style="width:18px; height:18px;">
        <span>0</span>
      </div>
      ${me && me.artistID == info.ArtistID
        ? `<button class="delete-btn" data-id="${art.ArtworkID}"><img src="/icons/delete2.svg" alt="удалить" style="width:20px;height:20px;"></button>`
        : ''}
    `;

    item.addEventListener('click', () => openArtworkModal(art));
    item.classList.add('fade-card');
    container.appendChild(item);
    requestAnimationFrame(() => {
      item.classList.add('show');
    });


    try {
      const likeRes = await fetch(`/api/artwork-likes/${art.ArtworkID}`);
      const likeData = await likeRes.json();
      item.querySelector('.like-indicator span').innerText = likeData.count;
    } catch {}

    if (token) {
      try {
        const likedRes = await authFetch(`/api/artwork-liked/${art.ArtworkID}`);
        const likedData = await likedRes.json();
        const icon = item.querySelector('.like-indicator img');
        if (likedData.liked) icon.src = '/icons/heart-fill.svg';

        icon.parentElement.addEventListener('click', async (e) => {
          e.stopPropagation();
          const res = await authFetch(`/api/artwork-likes/${art.ArtworkID}`, 'POST');
          const d = await res.json();
          icon.src = d.liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
          const counter = icon.parentElement.querySelector('span');
          let count = parseInt(counter.innerText);
          counter.innerText = d.liked ? count + 1 : count - 1;
        });
      } catch {}
    }

    if (me && me.artistID == info.ArtistID) {
      const delBtn = item.querySelector('.delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Удалить работу?')) {
            const res = await authFetch(`/api/artwork/${art.ArtworkID}`, 'DELETE');
            const msg = await res.text();
            alert(msg);
            loadProfile();
          }
        });
      }
    }
  }
}

async function openArtworkModal(art) {
  const token = getToken();
  let isLoggedIn = false;
  let liked = false;
  let likeCount = 0;

  if (token) {
    try {
      const res = await authFetch('/api/profile-full');
      const data = await res.json();
      isLoggedIn = true;
    } catch {}
  }

  try {
    const res = await fetch(`/api/artwork-likes/${art.ArtworkID}`);
    const data = await res.json();
    likeCount = data.count;
  } catch {}

  if (isLoggedIn) {
    const res = await authFetch(`/api/artwork-liked/${art.ArtworkID}`);
    const resData = await res.json();
    liked = resData.liked;
  }

  let commentsHtml = '<div id="commentsArea">Загрузка комментариев...</div>';
  let currentPage = 1;
  let hasMore = true;

  async function loadCommentsPage() {
    if (!hasMore) return;

    const res = await fetch(`/api/artwork-comments/${art.ArtworkID}?page=${currentPage}&limit=10`);
    const data = await res.json();
    const comments = data.comments;

    if (currentPage === 1) {
      document.getElementById('commentsArea').innerHTML = '';
    }

    if (comments.length === 0 && currentPage === 1) {
      document.getElementById('commentsArea').innerHTML = '<p>Комментариев пока нет.</p>';
      return;
    }

    for (const c of comments) {
      const div = document.createElement('div');
      div.style.borderTop = '1px solid #eee';
      div.style.padding = '6px 0';
      div.innerHTML = `<strong>${c.Username}</strong><br><span>${c.Content}</span>`;
      document.getElementById('commentsArea').appendChild(div);
    }

    if ((currentPage * data.limit) >= data.total) {
      hasMore = false;
      const moreBtn = document.getElementById('loadMoreBtn');
      if (moreBtn) moreBtn.remove();
    } else {
      currentPage++;
    }
  }


  const modalHtml = `
    <div style="max-width: 1000px; max-height: 90vh; overflow-y: auto; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
      <img src="${art.ImagePath}" alt="${art.Title}" style="width: 100%; border-radius: 10px;" />
      <h2 style="margin-top: 16px;">${art.Title}</h2>
      <p style="margin: 12px 0;">${art.Description || ''}</p>

      <div style="margin-top: 15px;">
        <button id="likeBtn" style="background: none; border: none; cursor: pointer;">
          <img src="${liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg'}" style="width: 20px; vertical-align: middle;">
          <span id="likeCount">${likeCount}</span>
        </button>
      </div>

      <div style="margin-top: 25px;">
          ${isLoggedIn ? `
          <form id="commentForm" class="modal-comment-form" style="margin-top: 10px;">
            <textarea name="content" placeholder="Напишите комментарий..." required style="width:100%; height:60px;"></textarea>
            <button type="submit" style="margin-top: 6px;">Отправить</button>
          </form>
        ` : `<p>Войдите, чтобы комментировать</p>`}
        <br><h3>Комментарии</h3>
        <div id="commentsArea">${commentsHtml}</div>
        <button id="loadMoreBtn" style="margin-top:10px;">Показать ещё</button>
      </div>
    </div>
  `;

  const instance = basicLightbox.create(modalHtml);
  instance.show();

  if (isLoggedIn) {
    setTimeout(() => {
      const btn = document.getElementById('likeBtn');
      if (btn) {
        btn.onclick = async () => {
          const res = await authFetch(`/api/artwork-likes/${art.ArtworkID}`, 'POST');
          const data = await res.json();
          liked = data.liked;
          likeCount = liked ? likeCount + 1 : likeCount - 1;
          document.querySelector('#likeBtn img').src = liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
          document.getElementById('likeCount').innerText = likeCount;

          // Обновим иконку и счётчик лайков на карточке
          const card = document.querySelector(`.like-indicator[data-id="${art.ArtworkID}"]`);
          if (card) {
            const icon = card.querySelector('img');
            const countSpan = card.querySelector('span');
            icon.src = liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg';
            countSpan.innerText = likeCount;
          }

        };
      }
    }, 100);
  }

  setTimeout(() => {
    const form = document.getElementById('commentForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const content = formData.get('content');
        if (!content.trim()) return;

        await authFetch(`/api/artwork-comments/${art.ArtworkID}`, 'POST', { content });

        // Очистка формы
        form.reset();

        // Перезагрузка комментариев
        currentPage = 1;
        hasMore = true;
        document.getElementById('commentsArea').innerHTML = '';
        await loadCommentsPage();
      });

    }
  }, 100);

  loadCommentsPage();

setTimeout(() => {
  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.onclick = loadCommentsPage;
  }
}, 100);

}

loadProfile();