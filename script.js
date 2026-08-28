const API_BASE =
  "https://webblox-backend.onrender.com";

const state = {
  home: [],
  search: [],
  searching: false
};

const $ = selector =>
  document.querySelector(selector);

const escapeHTML = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function formatNumber(number) {
  const value = Number(number || 0);

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function gameCard(game) {
  if (!game || !game.name) {
    return "";
  }

  const thumbnail =
    game.thumbnail ||
    game.icon ||
    "";

  const url =
    game.robloxUrl ||
    `https://www.roblox.com/games/${game.placeId}`;

  return `
    <article class="game-card"
      data-game-id="${escapeHTML(game.universeId)}">

      <a
        class="game-link"
        href="${escapeHTML(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >

        <div class="game-image-wrap">
          ${
            thumbnail
              ? `
                <img
                  class="game-image"
                  src="${escapeHTML(thumbnail)}"
                  alt="${escapeHTML(game.name)}"
                  loading="lazy"
                  onerror="this.onerror=null;this.src='${escapeHTML(
                    game.icon || ""
                  )}'"
                >
              `
              : `
                <div class="game-image-placeholder">
                  No thumbnail
                </div>
              `
          }
        </div>

        <div class="game-info">

          <h3 class="game-title">
            ${escapeHTML(game.name)}
          </h3>

          <div class="game-creator">
            ${
              game.creator
                ? `By ${escapeHTML(game.creator)}`
                : "Roblox experience"
            }
          </div>

          <div class="game-stats">
            <span>
              ${formatNumber(game.playing)} playing
            </span>

            <span>
              ${formatNumber(game.favorites)} favorites
            </span>
          </div>

        </div>

      </a>

    </article>
  `;
}

function renderGames(container, games) {
  if (!container) return;

  const validGames =
    Array.isArray(games)
      ? games.filter(
          game =>
            game &&
            game.name &&
            game.placeId &&
            game.robloxUrl
        )
      : [];

  if (!validGames.length) {
    container.innerHTML = `
      <div class="empty-state">
        No Roblox experiences found.
      </div>
    `;
    return;
  }

  container.innerHTML =
    validGames
      .map(gameCard)
      .join("");
}

function findGameContainers() {
  return {
    popular:
      $("#popular-games") ||
      $("#popularGames") ||
      document.querySelector(
        '[data-section="popular"]'
      ),

    recommended:
      $("#recommended-games") ||
      $("#recommendedGames") ||
      document.querySelector(
        '[data-section="recommended"]'
      ),

    search:
      $("#search-results") ||
      $("#searchResults") ||
      document.querySelector(
        '[data-section="search"]'
      )
  };
}

async function loadHome() {
  const containers =
    findGameContainers();

  try {
    setStatus("Loading Roblox experiences...");

    const response =
      await fetch(
        `${API_BASE}/api/home`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        data.error || "Backend error"
      );
    }

    state.home = [
      ...(data.popular || []),
      ...(data.recommended || [])
    ];

    if (containers.popular) {
      renderGames(
        containers.popular,
        data.popular || []
      );
    }

    if (containers.recommended) {
      renderGames(
        containers.recommended,
        data.recommended || []
      );
    }

    setStatus("");

    console.log(
      "WebBlox loaded Roblox games:",
      state.home
    );
  } catch (error) {
    console.error(
      "WebBlox home error:",
      error
    );

    setStatus(
      "Could not load Roblox experiences."
    );
  }
}

async function searchRoblox(query) {
  const cleanQuery =
    String(query || "").trim();

  if (!cleanQuery) {
    return;
  }

  if (state.searching) {
    return;
  }

  state.searching = true;

  const containers =
    findGameContainers();

  const searchContainer =
    containers.search ||
    createSearchContainer();

  searchContainer.innerHTML = `
    <div class="loading-state">
      Searching Roblox for
      <strong>${escapeHTML(cleanQuery)}</strong>...
    </div>
  `;

  try {
    const response =
      await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(
          cleanQuery
        )}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
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

    state.search =
      Array.isArray(data.games)
        ? data.games
        : [];

    renderGames(
      searchContainer,
      state.search
    );

    searchContainer.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    console.log(
      `Roblox search "${cleanQuery}":`,
      state.search
    );
  } catch (error) {
    console.error(
      "Roblox search error:",
      error
    );

    searchContainer.innerHTML = `
      <div class="error-state">
        Roblox search failed.
        Please try again.
      </div>
    `;
  } finally {
    state.searching = false;
  }
}

function createSearchContainer() {
  let container =
    document.querySelector(
      "#search-results"
    );

  if (container) {
    return container;
  }

  container =
    document.createElement("section");

  container.id =
    "search-results";

  container.className =
    "game-grid search-results";

  const main =
    document.querySelector("main") ||
    document.body;

  main.appendChild(container);

  return container;
}

function setStatus(message) {
  const status =
    $("#status") ||
    $("#connection-status");

  if (status) {
    status.textContent = message;
  }
}

function setupSearch() {
  const input =
    $("#search") ||
    $("#searchInput") ||
    document.querySelector(
      'input[type="search"]'
    );

  const button =
    $("#searchButton") ||
    document.querySelector(
      '[data-action="search"]'
    );

  if (!input) {
    console.warn(
      "WebBlox search input not found."
    );
    return;
  }

  function runSearch() {
    searchRoblox(input.value);
  }

  input.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
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

function setupSeeAllButtons() {
  document
    .querySelectorAll(
      '[data-see-all], .see-all, .see-all-btn'
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          const popular =
            state.home.filter(Boolean);

          const container =
            createSearchContainer();

          renderGames(
            container,
            popular
          );

          container.scrollIntoView({
            behavior: "smooth"
          });
        }
      );
    });
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupSearch();

    setupSeeAllButtons();

    await loadHome();
  }
);
