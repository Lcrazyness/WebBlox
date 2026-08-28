/* ============================================================
   WebBlox Frontend
   ============================================================ */

const API_BASE =
  "https://webblox-backend.onrender.com";

let homeGames = [];
let currentSearchResults = [];

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value) {
  const n = Number(value || 0);

  if (n >= 1000000000) {
    return (
      (n / 1000000000)
        .toFixed(1)
        .replace(".0", "") +
      "B"
    );
  }

  if (n >= 1000000) {
    return (
      (n / 1000000)
        .toFixed(1)
        .replace(".0", "") +
      "M"
    );
  }

  if (n >= 1000) {
    return (
      (n / 1000)
        .toFixed(1)
        .replace(".0", "") +
      "K"
    );
  }

  return String(n);
}

/* ============================================================
   IMAGE
   ============================================================ */

function createGameImage(game) {
  const thumbnail =
    String(
      game.thumbnail || ""
    ).trim();

  const icon =
    String(
      game.icon || ""
    ).trim();

  /*
    Thumbnail first.
    Icon is the fallback.
  */

  if (thumbnail) {
    return `
      <div class="game-image-wrap">
        <img
          class="game-image"
          src="${escapeHTML(thumbnail)}"
          alt="${escapeHTML(game.name)}"
          loading="lazy"
          onerror="
            this.onerror=null;
            ${
              icon
                ? `this.src='${escapeHTML(icon)}';`
                : `this.style.display='none'; this.parentElement.classList.add('image-failed');`
            }
          "
        >
      </div>
    `;
  }

  if (icon) {
    return `
      <div class="game-image-wrap">
        <img
          class="game-image"
          src="${escapeHTML(icon)}"
          alt="${escapeHTML(game.name)}"
          loading="lazy"
          onerror="
            this.onerror=null;
            this.style.display='none';
            this.parentElement.classList.add('image-failed');
          "
        >
      </div>
    `;
  }

  return `
    <div class="game-image-wrap image-failed"></div>
  `;
}

/* ============================================================
   GAME CARD
   ============================================================ */

function createGameCard(game) {
  if (
    !game ||
    !game.name ||
    !game.placeId ||
    !game.robloxUrl
  ) {
    return "";
  }

  return `
    <article
      class="game-card"
      data-universe-id="${escapeHTML(
        game.universeId
      )}"
      onclick="
        window.open(
          '${escapeHTML(game.robloxUrl)}',
          '_blank',
          'noopener'
        )
      "
    >

      ${createGameImage(game)}

      <button
        class="favorite-button"
        type="button"
        title="Favorite"
        onclick="
          event.stopPropagation();
          toggleFavorite(
            '${escapeHTML(
              game.universeId
            )}'
          );
        "
      >
        ♡
      </button>

      <div class="game-card-body">

        <h3 class="game-title">
          ${escapeHTML(game.name)}
        </h3>

        <p class="game-creator">
          ${
            game.creator
              ? `By ${escapeHTML(
                  game.creator
                )}`
              : "By Roblox"
          }
        </p>

        <div class="game-stats">

          <span>
            ${formatNumber(
              game.playing
            )}
            playing
          </span>

          <span>
            ${formatNumber(
              game.visits
            )}
            visits
          </span>

        </div>

      </div>

    </article>
  `;
}

/* ============================================================
   RENDER
   ============================================================ */

function renderGames(container, games) {
  if (!container) {
    return;
  }

  const valid =
    Array.isArray(games)
      ? games.filter(
          game =>
            game &&
            game.name &&
            game.placeId &&
            game.robloxUrl
        )
      : [];

  if (!valid.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>No games found</h2>
        <p>
          Roblox did not return any experiences
          for this section.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    valid
      .map(createGameCard)
      .join("");
}

/* ============================================================
   FIND ELEMENTS
   ============================================================ */

function findRecommendedGrid() {
  return (
    document.querySelector(
      "#recommendedGrid"
    ) ||
    document.querySelector(
      "#recommended-games"
    ) ||
    document.querySelector(
      "#recommendedGames"
    )
  );
}

function findPopularGrid() {
  return (
    document.querySelector(
      "#popularGrid"
    ) ||
    document.querySelector(
      "#popular-games"
    ) ||
    document.querySelector(
      "#popularGames"
    )
  );
}

function findSearchGrid() {
  return (
    document.querySelector(
      "#searchGrid"
    ) ||
    document.querySelector(
      "#search-results"
    ) ||
    document.querySelector(
      "#searchResults"
    )
  );
}

function findSearchInput() {
  return (
    document.querySelector(
      "#searchInput"
    ) ||
    document.querySelector(
      "#search"
    ) ||
    document.querySelector(
      ".search-container input"
    )
  );
}

function findSearchButton() {
  return (
    document.querySelector(
      "#searchButton"
    ) ||
    document.querySelector(
      ".search-container button"
    )
  );
}

/* ============================================================
   HOME
   ============================================================ */

async function loadHome() {
  const recommended =
    findRecommendedGrid();

  const popular =
    findPopularGrid();

  try {
    if (recommended) {
      recommended.innerHTML = `
        <div class="loading-state">
          Loading Roblox games...
        </div>
      `;
    }

    if (popular) {
      popular.innerHTML = `
        <div class="loading-state">
          Loading Roblox games...
        </div>
      `;
    }

    const response =
      await fetch(
        `${API_BASE}/api/home?t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `Backend HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        data.error ||
        "Backend returned an error"
      );
    }

    const popularGames =
      Array.isArray(data.popular)
        ? data.popular
        : [];

    const recommendedGames =
      Array.isArray(
        data.recommended
      )
        ? data.recommended
        : [];

    homeGames = [
      ...popularGames,
      ...recommendedGames
    ].filter(
      (game, index, array) =>
        array.findIndex(
          other =>
            other.universeId ===
            game.universeId
        ) === index
    );

    renderGames(
      popular,
      popularGames
    );

    renderGames(
      recommended,
      recommendedGames
    );

    console.log(
      "WebBlox loaded real Roblox games:",
      homeGames.length
    );

  } catch (error) {
    console.error(
      "WebBlox home error:",
      error
    );

    const message = `
      <div class="error-state">

        <div class="error-icon">
          !
        </div>

        <h2>
          Couldn't load Roblox games
        </h2>

        <p>
          WebBlox couldn't connect to the
          Roblox backend.
        </p>

        <button
          class="retry-button"
          onclick="loadHome()"
        >
          Try Again
        </button>

      </div>
    `;

    if (recommended) {
      recommended.innerHTML =
        message;
    }

    if (popular) {
      popular.innerHTML =
        message;
    }
  }
}

/* ============================================================
   SEARCH
   ============================================================ */

async function searchGames(query) {
  query =
    String(query || "")
      .trim();

  if (!query) {
    return;
  }

  const searchGrid =
    findSearchGrid();

  if (!searchGrid) {
    console.error(
      "WebBlox search grid not found."
    );

    return;
  }

  searchGrid.innerHTML = `
    <div class="loading-state">
      Searching Roblox for
      "${escapeHTML(query)}"...
    </div>
  `;

  try {
    const response =
      await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(
          query
        )}&t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `Backend HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        data.error ||
        "Search failed"
      );
    }

    currentSearchResults =
      Array.isArray(data.games)
        ? data.games
        : [];

    renderGames(
      searchGrid,
      currentSearchResults
    );

    searchGrid.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    console.log(
      "Roblox search results:",
      currentSearchResults
    );

  } catch (error) {
    console.error(
      "WebBlox search error:",
      error
    );

    searchGrid.innerHTML = `
      <div class="error-state">

        <div class="error-icon">
          !
        </div>

        <h2>
          Search failed
        </h2>

        <p>
          WebBlox couldn't search Roblox
          right now.
        </p>

        <button
          class="retry-button"
          onclick="
            searchGames(
              ${JSON.stringify(query)}
            )
          "
        >
          Try Again
        </button>

      </div>
    `;
  }
}

/* ============================================================
   SEARCH SETUP
   ============================================================ */

function setupSearch() {
  const input =
    findSearchInput();

  const button =
    findSearchButton();

  if (!input) {
    console.warn(
      "WebBlox search input was not found."
    );

    return;
  }

  const runSearch = () => {
    searchGames(
      input.value
    );
  };

  input.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();
        runSearch();
      }
    }
  );

  if (button) {
    button.addEventListener(
      "click",
      runSearch
    );
  }
}

/* ============================================================
   SEE ALL
   ============================================================ */

function setupSeeAll() {
  document
    .querySelectorAll(
      ".see-all, .see-all-btn, [data-see-all]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          const searchGrid =
            findSearchGrid();

          if (!searchGrid) {
            return;
          }

          /*
            Display every real game that the
            home endpoint returned.
          */

          renderGames(
            searchGrid,
            homeGames
          );

          searchGrid.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );
    });
}

/* ============================================================
   FAVORITES
============================================================ */

function getFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "webblox-favorites"
      ) || "[]"
    );
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(
    "webblox-favorites",
    JSON.stringify(
      favorites
    )
  );
}

function toggleFavorite(
  universeId
) {
  const favorites =
    getFavorites();

  const index =
    favorites.indexOf(
      String(universeId)
    );

  if (index === -1) {
    favorites.push(
      String(universeId)
    );
  } else {
    favorites.splice(
      index,
      1
    );
  }

  saveFavorites(
    favorites
  );

  updateFavoriteButtons();
}

function updateFavoriteButtons() {
  const favorites =
    getFavorites();

  document
    .querySelectorAll(
      ".favorite-button"
    )
    .forEach(button => {
      const card =
        button.closest(
          ".game-card"
        );

      if (!card) {
        return;
      }

      const id =
        card.dataset.universeId;

      button.textContent =
        favorites.includes(
          String(id)
        )
          ? "♥"
          : "♡";
    });
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupSearch();
    setupSeeAll();
    loadHome();
  }
);
