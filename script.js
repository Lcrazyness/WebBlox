// ============================================================
// WebBlox Frontend
// ============================================================

const BACKEND_URL =
  "https://webblox-backend.onrender.com";

const API_HOME =
  `${BACKEND_URL}/api/home`;

const API_SEARCH =
  `${BACKEND_URL}/api/search`;

console.log("==============================");
console.log("[WebBlox] Starting WebBlox...");
console.log("[WebBlox] Frontend:", location.href);
console.log("[WebBlox] Backend:", BACKEND_URL);
console.log("[WebBlox] Home API:", API_HOME);
console.log("==============================");

// ============================================================
// DOM
// ============================================================

const searchInput =
  document.getElementById("searchInput");

const searchButton =
  document.getElementById("searchButton");

const recommendedGrid =
  document.getElementById("recommendedGrid");

const popularGrid =
  document.getElementById("popularGrid");

const discoverButton =
  document.getElementById("discoverButton");

const favoritesButton =
  document.getElementById("favoritesButton");

// ============================================================
// Favorites
// ============================================================

let favorites =
  JSON.parse(
    localStorage.getItem("webbloxFavorites") || "[]"
  );

function saveFavorites() {
  localStorage.setItem(
    "webbloxFavorites",
    JSON.stringify(favorites)
  );
}

function isFavorite(game) {
  return favorites.some(
    item =>
      String(item.universeId) ===
      String(game.universeId)
  );
}

function toggleFavorite(game) {
  const id = String(game.universeId);

  if (isFavorite(game)) {
    favorites =
      favorites.filter(
        item =>
          String(item.universeId) !== id
      );
  } else {
    favorites.push(game);
  }

  saveFavorites();
}

// ============================================================
// API
// ============================================================

async function apiFetch(url) {
  console.log("[WebBlox] Request:", url);

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      mode: "cors"
    });

  console.log(
    "[WebBlox] HTTP:",
    response.status
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Backend returned HTTP ${response.status}: ${text}`
    );
  }

  const data =
    await response.json();

  console.log(
    "[WebBlox] Response:",
    data
  );

  return data;
}

// ============================================================
// Format numbers
// ============================================================

function formatNumber(value) {
  const number =
    Number(value) || 0;

  if (number >= 1000000000) {
    return (
      (number / 1000000000)
        .toFixed(1)
        .replace(".0", "") +
      "B"
    );
  }

  if (number >= 1000000) {
    return (
      (number / 1000000)
        .toFixed(1)
        .replace(".0", "") +
      "M"
    );
  }

  if (number >= 1000) {
    return (
      (number / 1000)
        .toFixed(1)
        .replace(".0", "") +
      "K"
    );
  }

  return number.toLocaleString();
}

// ============================================================
// Escape HTML
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// Thumbnail fallback
// ============================================================

function getImage(game) {
  if (game.thumbnail) {
    return game.thumbnail;
  }

  if (game.icon) {
    return game.icon;
  }

  if (game.universeId) {
    return (
      "https://thumbnails.roblox.com/v1/games/icons" +
      `?universeIds=${game.universeId}` +
      "&returnPolicy=PlaceHolder" +
      "&size=512x512" +
      "&format=Png" +
      "&isCircular=false"
    );
  }

  return "";
}

// ============================================================
// Game card
// ============================================================

function createGameCard(game) {
  const card =
    document.createElement("article");

  card.className = "game-card";

  const favorite =
    isFavorite(game);

  const title =
    escapeHtml(
      game.name ||
      "Untitled Experience"
    );

  const creator =
    escapeHtml(
      game.creator ||
      "Unknown Creator"
    );

  const image =
    escapeHtml(
      getImage(game)
    );

  const placeId =
    game.placeId;

  card.innerHTML = `
    <div class="game-image-wrap">
      ${
        image
          ? `
            <img
              class="game-image"
              src="${image}"
              alt="${title}"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
          `
          : `
            <div class="no-image">
              No image
            </div>
          `
      }

      <button
        class="favorite-button ${favorite ? "favorited" : ""}"
        type="button"
        aria-label="Favorite ${title}"
        title="Favorite"
      >
        ${favorite ? "♥" : "♡"}
      </button>
    </div>

    <div class="game-card-body">

      <h3 class="game-title">
        ${title}
      </h3>

      <p class="game-creator">
        By ${creator}
      </p>

      <div class="game-stats">

        <span>
          ● ${formatNumber(game.playing)}
          playing
        </span>

        <span>
          ${formatNumber(game.visits)}
          visits
        </span>

      </div>

    </div>
  `;

  // ----------------------------------------------------------
  // Thumbnail error
  // ----------------------------------------------------------

  const img =
    card.querySelector(".game-image");

  if (img) {
    img.addEventListener(
      "error",
      () => {
        const wrap =
          img.parentElement;

        img.remove();

        wrap.classList.add(
          "image-failed"
        );

        if (
          !wrap.querySelector(".no-image")
        ) {
          const fallback =
            document.createElement("div");

          fallback.className =
            "no-image";

          fallback.textContent =
            "No image";

          wrap.appendChild(
            fallback
          );
        }
      },
      { once: true }
    );
  }

  // ----------------------------------------------------------
  // Favorite button
  // ----------------------------------------------------------

  const favoriteButton =
    card.querySelector(
      ".favorite-button"
    );

  favoriteButton.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      toggleFavorite(game);

      const nowFavorite =
        isFavorite(game);

      favoriteButton.textContent =
        nowFavorite ? "♥" : "♡";

      favoriteButton.classList.toggle(
        "favorited",
        nowFavorite
      );
    }
  );

  // ----------------------------------------------------------
  // Open game
  // ----------------------------------------------------------

  card.addEventListener(
    "click",
    () => {
      if (placeId) {
        window.open(
          `https://www.roblox.com/games/${placeId}`,
          "_blank",
          "noopener"
        );
      } else if (game.robloxUrl) {
        window.open(
          game.robloxUrl,
          "_blank",
          "noopener"
        );
      }
    }
  );

  return card;
}

// ============================================================
// Render games
// ============================================================

function renderGames(
  grid,
  games,
  emptyMessage
) {
  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (
    !Array.isArray(games) ||
    games.length === 0
  ) {
    grid.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  const fragment =
    document.createDocumentFragment();

  games.forEach(game => {
    fragment.appendChild(
      createGameCard(game)
    );
  });

  grid.appendChild(fragment);
}

// ============================================================
// Loading
// ============================================================

function showLoading(grid) {
  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="loading-state">
      Loading Roblox experiences...
    </div>
  `;
}

// ============================================================
// Error
// ============================================================

function showError(grid) {
  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        !
      </div>

      <h2>
        Games couldn't load
      </h2>

      <p>
        Could not connect to the WebBlox backend.
        Make sure the Render service is running.
      </p>

      <button
        class="retry-button"
        id="retryButton"
        type="button"
      >
        Try Again
      </button>

    </div>
  `;

  const retry =
    document.getElementById(
      "retryButton"
    );

  if (retry) {
    retry.addEventListener(
      "click",
      loadHome
    );
  }
}

// ============================================================
// Home
// ============================================================

async function loadHome() {
  console.log(
    "[WebBlox] Loading:",
    API_HOME
  );

  showLoading(
    recommendedGrid
  );

  showLoading(
    popularGrid
  );

  try {
    const data =
      await apiFetch(API_HOME);

    if (!data.success) {
      throw new Error(
        data.error ||
        "Backend returned an error."
      );
    }

    console.log(
      "[WebBlox] Home data:",
      data
    );

    renderGames(
      recommendedGrid,
      data.recommended || [],
      "No recommended Roblox experiences were returned."
    );

    renderGames(
      popularGrid,
      data.popular || [],
      "No popular Roblox experiences were returned."
    );
  } catch (error) {
    console.error(
      "[WebBlox] Home error:",
      error
    );

    showError(
      recommendedGrid
    );

    showError(
      popularGrid
    );
  }
}

// ============================================================
// Search
// ============================================================

async function searchGames() {
  const query =
    searchInput?.value.trim();

  if (!query) {
    searchInput?.focus();
    return;
  }

  console.log(
    "[WebBlox] Searching:",
    query
  );

  if (recommendedGrid) {
    recommendedGrid.innerHTML = "";
  }

  if (popularGrid) {
    showLoading(popularGrid);
  }

  // Hide the recommended heading area
  const recommendedSection =
    document.getElementById(
      "recommendedSection"
    );

  if (recommendedSection) {
    recommendedSection.classList.add(
      "hidden-section"
    );
  }

  const popularTitle =
    document.querySelector(
      "#popularSection h2"
    );

  if (popularTitle) {
    popularTitle.textContent =
      `Search results for "${query}"`;
  }

  const subtitle =
    document.querySelector(
      "#popularSection .section-subtitle"
    );

  if (subtitle) {
    subtitle.textContent =
      "Roblox experiences matching your search";
  }

  try {
    const url =
      `${API_SEARCH}?q=${encodeURIComponent(query)}`;

    const data =
      await apiFetch(url);

    if (!data.success) {
      throw new Error(
        data.error ||
        "Search failed."
      );
    }

    renderGames(
      popularGrid,
      data.games || [],
      `No Roblox games found for "${query}".`
    );
  } catch (error) {
    console.error(
      "[WebBlox] Search error:",
      error
    );

    if (popularGrid) {
      popularGrid.innerHTML = `
        <div class="error-state">
          <div class="error-icon">!</div>
          <h2>Search failed</h2>
          <p>
            ${escapeHtml(error.message)}
          </p>
          <button
            class="retry-button"
            id="searchRetry"
          >
            Try Again
          </button>
        </div>
      `;

      document
        .getElementById("searchRetry")
        ?.addEventListener(
          "click",
          searchGames
        );
    }
  }
}

// ============================================================
// Return to Discover
// ============================================================

function showDiscover() {
  const recommendedSection =
    document.getElementById(
      "recommendedSection"
    );

  if (recommendedSection) {
    recommendedSection.classList.remove(
      "hidden-section"
    );
  }

  const popularTitle =
    document.querySelector(
      "#popularSection h2"
    );

  if (popularTitle) {
    popularTitle.textContent =
      "Popular Right Now";
  }

  const subtitle =
    document.querySelector(
      "#popularSection .section-subtitle"
    );

  if (subtitle) {
    subtitle.textContent =
      "Roblox experiences players are playing";
  }

  if (searchInput) {
    searchInput.value = "";
  }

  loadHome();
}

// ============================================================
// Favorites view
// ============================================================

function showFavorites() {
  const recommendedSection =
    document.getElementById(
      "recommendedSection"
    );

  if (recommendedSection) {
    recommendedSection.classList.add(
      "hidden-section"
    );
  }

  const popularTitle =
    document.querySelector(
      "#popularSection h2"
    );

  if (popularTitle) {
    popularTitle.textContent =
      "Your Favorites";
  }

  const subtitle =
    document.querySelector(
      "#popularSection .section-subtitle"
    );

  if (subtitle) {
    subtitle.textContent =
      "Roblox experiences you saved";
  }

  renderGames(
    popularGrid,
    favorites,
    "You haven't favorited any games yet."
  );
}

// ============================================================
// Events
// ============================================================

searchButton?.addEventListener(
  "click",
  searchGames
);

searchInput?.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      searchGames();
    }
  }
);

discoverButton?.addEventListener(
  "click",
  () => {
    setActiveNav(discoverButton);
    showDiscover();
  }
);

favoritesButton?.addEventListener(
  "click",
  () => {
    setActiveNav(favoritesButton);
    showFavorites();
  }
);

function setActiveNav(button) {
  document
    .querySelectorAll(
      "nav button"
    )
    .forEach(item => {
      item.classList.remove(
        "active"
      );
    });

  button?.classList.add(
    "active"
  );
}

// ============================================================
// Start
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadHome();
  }
);
