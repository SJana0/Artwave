// 📁 public/js/components.js

export function renderExhibitionCard({ CoverImagePath, Title, Theme, ExhibitionID, liked = false, likeCount = 0 }) {
  return `
    <div class="exhibition-card flex flex-col bg-white rounded-xl shadow-md hover:shadow-lg transition hover:-translate-y-1 duration-300 cursor-pointer w-60" data-id="${ExhibitionID}">
      <img class="w-full h-48 object-cover rounded-t-xl" src="${CoverImagePath}" alt="${Title}" />
      <div class="p-4 flex flex-col flex-1 justify-between">
        <h3 class="text-lg font-semibold text-gray-800 mb-1">${Title}</h3>
        <p class="text-sm text-gray-600 mb-3">${Theme || ''}</p>
        <div class="flex justify-between items-center mt-auto">
          <button class="like-btn" title="Лайк" data-id="${ExhibitionID}">
            <img src="${liked ? '/icons/heart-fill.svg' : '/icons/heart-outline.svg'}" alt="heart" class="w-6 h-6 transition-transform duration-300 scale-100">
          </button>
          <span class="like-count text-sm text-gray-500">${likeCount}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderArtistCard({ Username, AvatarPath, Bio, ArtistID }) {
  return `
    <div class="transition-transform duration-200 hover:scale-105 bg-white rounded-xl shadow-md overflow-hidden w-full">
      <div class="relative">
        <img class="w-full h-48 object-cover" src="${AvatarPath || '/images/default-avatar.png'}" alt="${Username}" />
      </div>
      <div class="p-3">
        <h3 class="text-base font-bold mb-1 text-gray-800">${Username}</h3>
        <p class="text-sm text-gray-500 truncate">${Bio?.substring(0, 100) || ''}</p>
        <div class="text-right mt-3">
          <a href="/artist-profile.html?id=${ArtistID}" class="hover:underline text-sm" style="color: #20977d;">Открыть профиль</a>
        </div>
      </div>
    </div>
  `;
}
