// ============================================================
// WebBlox Frontend
// ============================================================

const BACKEND_URL =
  "https://webblox-backend.onrender.com";

console.log("======================================");
console.log("[WebBlox] Starting WebBlox...");
console.log("[WebBlox] Frontend:", window.location.origin);
console.log("[WebBlox] Backend:", BACKEND_URL);
console.log("[WebBlox] Home API:", `${BACKEND_URL}/api/home`);
console.log("======================================");

const state = {
  home: [],
  search: [],
  favorites: JSON.parse(
    localStorage.getItem("webblox_favorites") || "[]"
  )
};

// ============================================================
// DOM
// ============================================================

const searchInput =
  document.querySelector("#searchInput") ||
  document.querySelector("input[type='search']");

const searchButton =
  document.querySelector("#searchButton") ||
  document.querySelector("button");

const recommendedGrid =
  document.querySelector("#recommendedGrid") ||
  document.querySelector("[data-section='recommended']");

const popularGrid =
  document.querySelector("#popularGrid") ||
  document.querySelector("[data-section='popular']");

const errorBox =
  document.querySelector("#errorBox");

// ============================================================
// FETCH
// ============================================================

async function apiFetch(path) {
  const url =
    `${BACKEND_URL}${path}`;

  console.log("[WebBlox] Request:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  console.log(
    "[WebBlox] HTTP:",
    response.status
  );

  const text =
    await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Backend returned invalid JSON (${response.status})`
    );
  }

  console.log(
    "[WebBlox] Response:",
    data
  );

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Backend returned HTTP ${response.status}`
    );
  }

  if (data.success === false) {
    throw new Error(
      data.error ||
      "Backend returned an error"
    );
  }

  return data;
}

// ============================================================
// IMAGE
// ============================================================

function gameImage(game) {
  return (
    game.thumbnail ||
    game.icon ||
    "https://tr.rbxcdn.com/180DAY-00000000000000000000000000000000/512/512/Image/Webp/noFilter"
  );
}

// ============================================================
// CARD
// ============================================================

function createGameCard(game) {
  const card =
    document.createElement("article");

  card.className = "game-card";

  const image =
    gameImage(game);

  const name =
    game.name ||
    "Untitled Experience";

  const creator =
    game.creator ||
    "Unknown Creator";

  const playing =
    Number(game.playing || 0);

  const visits =
    Number(game.visits || 0);

  const placeId =
    Number(game.placeId || 0);

  const url =
    game.robloxUrl ||
    (
      placeId
        ? `https://www.roblox.com/games/${placeId}`
        : "https://www.roblox.com/games"
    );

  card.innerHTML = `
    <div class="game-image-wrap">
      <img
        class="game-image"
        src="${escapeHtml(image)}"
        alt="${escapeHtml(name)}"
        loading="lazy"
        onerror="this.onerror=null;this.src='';this.parentElement.classList.add('image-failed')"
      >
      <button
        class="favorite-button"
        type="button"
        aria-label="Favorite ${escapeHtml(name)}"
        data-favorite="${escapeHtml(String(game.universeId || game.id || ""))}"
      >
        ${isFavorite(game) ? "★" : "☆"}
      </button>
    </div>

    <div class="game-card-body">
      <h3
        class="game-title"
        title="${escapeHtml(name)}"
      >
        ${escapeHtml(name)}
      </h3>

      <p class="game-creator">
        By ${escapeHtml(creator)}
      </p>

      <div class="game-stats">
        <span>
          • ${formatNumber(playing)} playing
        </span>

        <span>
          ${formatNumber(visits)} visits
        </span>
      </div>
    </div>
  `;

  card.addEventListener("click", event => {
    if (
      event.target.closest(".favorite-button")
    ) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  });

  const favoriteButton =
    card.querySelector(".favorite-button");

  favoriteButton.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      toggleFavorite(game);

      favoriteButton.textContent =
        isFavorite(game)
          ? "★"
          : "☆";
    }
  );

  return card;
}

// ============================================================
// RENDER
// ============================================================

function renderGames(
  games,
  container,
  emptyMessage = "No games were found."
) {
  if (!container) {
    console.warn(
      "[WebBlox] Grid not found."
    );
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(games) || games.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(emptyMessage)}
      </div>
    `;
    return;
  }

  for (const game of games) {
    container.appendChild(
      createGameCard(game)
    );
  }
}

// ============================================================
// HOME
// ============================================================

async function loadHome() {
  console.log(
    "[WebBlox] Loading:",
    `${BACKEND_URL}/api/home`
  );

  showLoading();

  try {
    const data =
      await apiFetch("/api/home");

    state.home = [
      ...(data.recommended || []),
      ...(data.popular || [])
    ];

    // Remove duplicate games.
    state.home =
      dedupeGames(state.home);

    const recommended =
      dedupeGames(
        data.recommended || []
      );

    const popular =
      dedupeGames(
        data.popular || []
      );

    renderGames(
      recommended,
      recommendedGrid,
      "No recommended Roblox experiences were returned."
    );

    renderGames(
      popular,
      popularGrid,
      "No popular Roblox experiences were returned."
    );

    hideError();

    console.log(
      "[WebBlox] Home loaded:",
      state.home.length,
      "games"
    );
  } catch (error) {
    console.error(
      "[WebBlox] Home error:",
      error
    );

    showError(
      "Could not connect to the WebBlox backend. " +
      "Make sure the Render service is running."
    );
  }
}

// ============================================================
// SEARCH
// ============================================================

async function searchGames() {
  const query =
    searchInput?.value.trim() || "";

  if (!query) {
    loadHome();
    return;
  }

  console.log(
    "[WebBlox] Search:",
    query
  );

  showLoading();

  try {
    const data =
      await apiFetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );

    const games =
      dedupeGames(data.games || []);

    state.search = games;

    renderSearchResults(
      games,
      query
    );

    hideError();
  } catch (error) {
    console.error(
      "[WebBlox] Search error:",
      error
    );

    showError(
      "Search failed. Please try again."
    );
  }
}

function renderSearchResults(
  games,
  query
) {
  const allGrids =
    document.querySelectorAll(
      ".game-grid"
    );

  if (
    recommendedGrid &&
    popularGrid
  ) {
    const recommendedSection =
      recommendedGrid.closest(
        "section"
      );

    const popularSection =
      popularGrid.closest(
        "section"
      );

    if (recommendedSection) {
      recommendedSection.querySelector(
        "h2"
      ).textContent =
        `Search results for "${query}"`;
    }

    if (popularSection) {
      popularSection.style.display =
        "none";
    }

    renderGames(
      games,
      recommendedGrid,
      `No Roblox games found for "${query}".`
    );
  } else if (allGrids[0]) {
    renderGames(
      games,
      allGrids[0],
      `No Roblox games found for "${query}".`
    );
  }
}

// ============================================================
// FAVORITES
// ============================================================

function favoriteId(game) {
  return String(
    game.universeId ||
    game.id ||
    game.placeId
  );
}

function isFavorite(game) {
  return state.favorites.includes(
    favoriteId(game)
  );
}

function toggleFavorite(game) {
  const id =
    favoriteId(game);

  if (
    state.favorites.includes(id)
  ) {
    state.favorites =
      state.favorites.filter(
        value => value !== id
      );
  } else {
    state.favorites.push(id);
  }

  localStorage.setItem(
    "webblox_favorites",
    JSON.stringify(
      state.favorites
    )
  );
}

// ============================================================
// UI
// ============================================================

function showLoading() {
  if (recommendedGrid) {
    recommendedGrid.innerHTML = `
      <div class="loading-state">
        Loading Roblox experiences...
      </div>
    `;
  }

  if (popularGrid) {
    popularGrid.innerHTML = "";
  }
}

function showError(message) {
  if (!recommendedGrid) {
    alert(message);
    return;
  }

  recommendedGrid.innerHTML = `
    <div class="error-state">
      <div class="error-icon">!</div>
      <h2>Games couldn't load</h2>
      <p>${escapeHtml(message)}</p>
      <button
        type="button"
        class="retry-button"
        id="retryButton"
      >
        Try Again
      </button>
    </div>
  `;

  const retry =
    document.querySelector(
      "#retryButton"
    );

  retry?.addEventListener(
    "click",
    loadHome
  );
}

function hideError() {
  if (errorBox) {
    errorBox.style.display =
      "none";
  }
}

// ============================================================
// NAVIGATION
// ============================================================

function restoreDiscover() {
  const sections =
    document.querySelectorAll(
      "section"
    );

  sections.forEach(section => {
    section.style.display = "";
  });

  loadHome();
}

document.addEventListener(
  "click",
  event => {
    const target =
      event.target.closest(
        "[data-page]"
      );

    if (!target) return;

    const page =
      target.dataset.page;

    if (page === "discover") {
      restoreDiscover();
    }

    if (page === "favorites") {
      renderFavorites();
    }
  }
);

function renderFavorites() {
  const favoriteGames =
    state.home.filter(
      game => isFavorite(game)
    );

  if (recommendedGrid) {
    renderGames(
      favoriteGames,
      recommendedGrid,
      "You haven't favorited any games yet."
    );
  }

  if (popularGrid) {
    popularGrid.innerHTML = "";

    const section =
      popularGrid.closest("section");

    if (section) {
      section.style.display =
        "none";
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

function dedupeGames(games) {
  const map =
    new Map();

  for (const game of games) {
    const id =
      String(
        game.universeId ||
        game.id ||
        game.placeId ||
        game.name
      );

    if (!map.has(id)) {
      map.set(id, game);
    }
  }

  return [...map.values()];
}

function formatNumber(number) {
  number =
    Number(number) || 0;

  return number.toLocaleString(
    "en-US"
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================
// SEARCH EVENTS
// ============================================================

if (searchButton) {
  searchButton.addEventListener(
    "click",
    searchGames
  );
}

if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        searchGames();
      }
    }
  );
}

// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadHome();
  }
);

if (
  document.readyState ===
  "interactive" ||
  document.readyState === "complete"
) {
  loadHome();
}
