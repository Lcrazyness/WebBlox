/* =========================================================
   WebBlox Frontend
   ========================================================= */

const BACKEND_URL = "https://webblox-backend.onrender.com";

console.log("======================================");
console.log("[WebBlox] Starting WebBlox...");
console.log("[WebBlox] Backend:", BACKEND_URL);
console.log("======================================");

let currentTab = "discover";
let currentSearch = "";
let currentSearchToken = null;

let homeData = {
  recommended: [],
  popular: []
};

const appState = {
  loading: false,
  searching: false
};

/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value) {
  const n = Number(value) || 0;

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }

  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }

  return String(n);
}

function validGame(game) {
  if (!game) return false;

  const id =
    Number(game.universeId) ||
    Number(game.id);

  const name = String(game.name || "").trim();

  if (!Number.isSafeInteger(id) || id <= 0) {
    return false;
  }

  if (!name) {
    return false;
  }

  const lower = name.toLowerCase();

  if (
    lower === "place" ||
    lower === "game" ||
    lower === "untitled" ||
    lower.endsWith("'s place") ||
    lower.endsWith("’s place")
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   API
   ========================================================= */

async function apiFetch(path) {
  const url =
    `${BACKEND_URL}${path}`;

  console.log("[WebBlox] Request:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Backend returned invalid JSON (${response.status})`
    );
  }

  console.log("[WebBlox] HTTP:", response.status);

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
      `Backend returned HTTP ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   HOME
   ========================================================= */

async function loadHome() {
  if (appState.loading) {
    return;
  }

  appState.loading = true;

  showSectionLoading(
    "recommendedGrid",
    "Loading trending experiences..."
  );

  showSectionLoading(
    "popularGrid",
    "Loading popular experiences..."
  );

  try {
    console.log("[WebBlox] Loading home...");

    const data = await apiFetch("/api/home");

    homeData = {
      recommended: Array.isArray(data.recommended)
        ? data.recommended.filter(validGame)
        : [],

      popular: Array.isArray(data.popular)
        ? data.popular.filter(validGame)
        : []
    };

    renderGameGrid(
      "recommendedGrid",
      homeData.recommended,
      "No trending Roblox experiences were returned."
    );

    renderGameGrid(
      "popularGrid",
      homeData.popular,
      "No popular Roblox experiences were returned."
    );

    updateCounts();

    console.log("[WebBlox] Home loaded:", homeData);
  } catch (error) {
    console.error("[WebBlox] Home error:", error);

    showError(
      "recommendedGrid",
      error.message
    );

    showError(
      "popularGrid",
      error.message
    );
  } finally {
    appState.loading = false;
  }
}

/* =========================================================
   SEARCH
   ========================================================= */

async function searchGames(query) {
  query = String(query || "").trim();

  if (!query) {
    loadHome();
    return;
  }

  currentSearch = query;
  currentSearchToken = null;

  appState.searching = true;

  showSearchResultsLoading();

  try {
    const data = await apiFetch(
      `/api/search?q=${encodeURIComponent(query)}`
    );

    const games = Array.isArray(data.games)
      ? data.games.filter(validGame)
      : [];

    currentSearchToken = data.nextPageToken || null;

    renderSearchResults(
      query,
      games
    );
  } catch (error) {
    console.error("[WebBlox] Search error:", error);

    renderSearchError(error.message);
  } finally {
    appState.searching = false;
  }
}

async function loadMoreSearchResults() {
  if (
    !currentSearch ||
    !currentSearchToken ||
    appState.searching
  ) {
    return;
  }

  appState.searching = true;

  try {
    const data = await apiFetch(
      `/api/search?q=${encodeURIComponent(currentSearch)}` +
      `&pageToken=${encodeURIComponent(currentSearchToken)}`
    );

    const games = Array.isArray(data.games)
      ? data.games.filter(validGame)
      : [];

    currentSearchToken =
      data.nextPageToken || null;

    appendSearchResults(games);
  } catch (error) {
    console.error(
      "[WebBlox] More search results error:",
      error
    );
  } finally {
    appState.searching = false;
  }
}

/* =========================================================
   CHARTS / SEE ALL
   ========================================================= */

async function showAllChart(sortId, title) {
  currentTab = "all";

  setActiveTab("discover");

  const results = $("searchResults");

  if (!results) {
    return;
  }

  results.classList.remove("hidden");

  results.innerHTML = `
    <div class="search-header">
      <button class="back-button" id="backFromAll">
        ← Back
      </button>

      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>Roblox experiences from this chart</p>
      </div>
    </div>

    <div id="allGamesGrid" class="game-grid">
      <div class="loading-box">
        Loading all experiences...
      </div>
    </div>
  `;

  const backButton = $("backFromAll");

  if (backButton) {
    backButton.addEventListener("click", () => {
      results.classList.add("hidden");
      currentTab = "discover";
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  try {
    const data = await apiFetch(
      `/api/chart/${encodeURIComponent(sortId)}`
    );

    const games = Array.isArray(data.games)
      ? data.games.filter(validGame)
      : [];

    renderGameGrid(
      "allGamesGrid",
      games,
      "No experiences were returned for this chart."
    );
  } catch (error) {
    console.error(
      "[WebBlox] Chart error:",
      error
    );

    showError(
      "allGamesGrid",
      error.message
    );
  }
}

/* =========================================================
   GAME CARD
   ========================================================= */

function createGameCard(game) {
  const name = escapeHtml(game.name);
  const creator = escapeHtml(
    game.creator || "Unknown Creator"
  );

  const description = escapeHtml(
    game.description || "Roblox experience"
  );

  const thumbnail =
    game.thumbnail ||
    game.icon ||
    "https://tr.rbxcdn.com/180DAY-placeholder";

  const playing = formatNumber(
    game.playing
  );

  const visits = formatNumber(
    game.visits
  );

  const maxPlayers = formatNumber(
    game.maxPlayers || 50
  );

  const url =
    game.robloxUrl ||
    (
      game.placeId
        ? `https://www.roblox.com/games/${game.placeId}`
        : `https://www.roblox.com/games/${game.universeId}`
    );

  return `
    <article class="game-card">

      <a
        class="game-image-link"
        href="${escapeHtml(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          class="game-thumbnail"
          src="${escapeHtml(thumbnail)}"
          alt="${name}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://tr.rbxcdn.com/180DAY-placeholder';"
        >
      </a>

      <div class="game-card-body">

        <a
          class="game-title"
          href="${escapeHtml(url)}"
          target="_blank"
          rel="noopener noreferrer"
          title="${name}"
        >
          ${name}
        </a>

        <div class="game-creator">
          By ${creator}
        </div>

        <div class="game-stats">

          <span class="game-stat">
            <span class="stat-dot"></span>
            ${playing} playing
          </span>

          <span class="game-stat">
            ${visits} visits
          </span>

        </div>

        <div class="game-footer">
          <span>
            Up to ${maxPlayers} players
          </span>

          ${
            game.genre
              ? `<span>${escapeHtml(game.genre)}</span>`
              : ""
          }
        </div>

      </div>
    </article>
  `;
}

/* =========================================================
   RENDERING
   ========================================================= */

function renderGameGrid(
  gridId,
  games,
  emptyMessage
) {
  const grid = $(gridId);

  if (!grid) {
    return;
  }

  if (!Array.isArray(games) || games.length === 0) {
    grid.innerHTML = `
      <div class="empty-box">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  grid.innerHTML = games
    .filter(validGame)
    .map(createGameCard)
    .join("");
}

function renderSearchResults(
  query,
  games
) {
  const results = $("searchResults");

  if (!results) {
    return;
  }

  results.classList.remove("hidden");

  results.innerHTML = `
    <div class="search-header">

      <button class="back-button" id="backFromSearch">
        ← Back
      </button>

      <div>
        <h2>Search results for "${escapeHtml(query)}"</h2>
        <p>${games.length} experiences found</p>
      </div>

    </div>

    <div
      id="searchGrid"
      class="game-grid"
    ></div>

    ${
      currentSearchToken
        ? `
          <div class="load-more-wrap">
            <button
              class="load-more-button"
              id="loadMoreButton"
            >
              Load More
            </button>
          </div>
        `
        : ""
    }
  `;

  renderGameGrid(
    "searchGrid",
    games,
    "No Roblox experiences matched that search."
  );

  const back = $("backFromSearch");

  if (back) {
    back.addEventListener("click", () => {
      results.classList.add("hidden");
      currentSearch = "";
      currentSearchToken = null;
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  const loadMore = $("loadMoreButton");

  if (loadMore) {
    loadMore.addEventListener(
      "click",
      loadMoreSearchResults
    );
  }
}

function appendSearchResults(games) {
  const grid = $("searchGrid");

  if (!grid) {
    return;
  }

  grid.insertAdjacentHTML(
    "beforeend",
    games
      .filter(validGame)
      .map(createGameCard)
      .join("")
  );

  const wrapper =
    document.querySelector(".load-more-wrap");

  if (wrapper) {
    wrapper.remove();
  }

  if (currentSearchToken) {
    const newWrapper =
      document.createElement("div");

    newWrapper.className =
      "load-more-wrap";

    newWrapper.innerHTML = `
      <button
        class="load-more-button"
        id="loadMoreButton"
      >
        Load More
      </button>
    `;

    grid.parentElement.appendChild(
      newWrapper
    );

    $("loadMoreButton").addEventListener(
      "click",
      loadMoreSearchResults
    );
  }
}

function showSectionLoading(
  gridId,
  message
) {
  const grid = $(gridId);

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      ${escapeHtml(message)}
    </div>
  `;
}

function showError(
  gridId,
  message
) {
  const grid = $(gridId);

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="error-box">
      <strong>Couldn't load games</strong>
      <span>${escapeHtml(message)}</span>

      <button
        class="retry-button"
        onclick="loadHome()"
      >
        Try Again
      </button>
    </div>
  `;
}

function showSearchResultsLoading() {
  const results = $("searchResults");

  if (!results) {
    return;
  }

  results.classList.remove("hidden");

  results.innerHTML = `
    <div class="search-header">
      <h2>Searching Roblox...</h2>
      <p>Finding matching experiences</p>
    </div>

    <div class="loading-box large">
      <div class="spinner"></div>
      Searching...
    </div>
  `;
}

function renderSearchError(message) {
  const results = $("searchResults");

  if (!results) {
    return;
  }

  results.classList.remove("hidden");

  results.innerHTML = `
    <div class="error-box large">
      <strong>Search failed</strong>
      <span>${escapeHtml(message)}</span>

      <button
        class="retry-button"
        onclick="searchGames(currentSearch)"
      >
        Try Again
      </button>
    </div>
  `;
}

function updateCounts() {
  const recommendedCount =
    $("recommendedCount");

  const popularCount =
    $("popularCount");

  if (recommendedCount) {
    recommendedCount.textContent =
      `${homeData.recommended.length} experiences`;
  }

  if (popularCount) {
    popularCount.textContent =
      `${homeData.popular.length} experiences`;
  }
}

/* =========================================================
   UI
   ========================================================= */

function setActiveTab(tab) {
  document
    .querySelectorAll("[data-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );
    });
}

function setupSearch() {
  const form = $("searchForm");
  const input = $("searchInput");

  if (!form || !input) {
    console.warn(
      "[WebBlox] Search elements not found."
    );

    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const query = input.value.trim();

    if (query) {
      searchGames(query);
    } else {
      loadHome();
    }
  });
}

function setupTabs() {
  document
    .querySelectorAll("[data-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset.tab;

          setActiveTab(tab);

          if (tab === "favorites") {
            showFavorites();
          } else {
            hideSearchResults();
            loadHome();
          }
        }
      );
    });
}

function hideSearchResults() {
  const results = $("searchResults");

  if (results) {
    results.classList.add("hidden");
  }

  currentSearch = "";
  currentSearchToken = null;
}

function showFavorites() {
  const results = $("searchResults");

  if (!results) {
    return;
  }

  results.classList.remove("hidden");

  results.innerHTML = `
    <div class="empty-box large">
      <h2>Favorites</h2>
      <p>
        Favorites are coming next.
      </p>
    </div>
  `;
}

function setupSeeAllButtons() {
  const recommendedSeeAll =
    $("recommendedSeeAll");

  const popularSeeAll =
    $("popularSeeAll");

  if (recommendedSeeAll) {
    recommendedSeeAll.addEventListener(
      "click",
      () => {
        showAllChart(
          "top-trending",
          "Trending Right Now"
        );
      }
    );
  }

  if (popularSeeAll) {
    popularSeeAll.addEventListener(
      "click",
      () => {
        showAllChart(
          "top-playing-now",
          "Popular Right Now"
        );
      }
    );
  }
}

/* =========================================================
   START
   ========================================================= */

function startWebBlox() {
  console.log(
    "[WebBlox] Frontend starting..."
  );

  setupSearch();
  setupTabs();
  setupSeeAllButtons();

  loadHome();
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startWebBlox
  );
} else {
  startWebBlox();
}
