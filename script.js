const API_BASE =
  "https://webblox-backend.onrender.com";

let homeGames = [];
let searchResults = [];

/* ---------------- HELPERS ---------------- */

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

/* ---------------- IMAGE ---------------- */

function gameImage(game) {
  /*
    Thumbnail is preferred.

    Icon is only used if Roblox didn't provide
    a thumbnail for this experience.
  */

  const thumbnail =
    game.thumbnail || "";

  const icon =
    game.icon || "";

  if (thumbnail) {
    return `
      <img
        class="game-thumbnail"
        src="${escapeHTML(thumbnail)}"
        alt="${escapeHTML(game.name)}"
        loading="lazy"
        onerror="
          this.onerror=null;
          this.src='${escapeHTML(icon)}';
        "
      >
    `;
  }

  if (icon) {
    return `
      <img
        class="game-thumbnail"
        src="${escapeHTML(icon)}"
        alt="${escapeHTML(game.name)}"
        loading="lazy"
      >
    `;
  }

  return `
    <div class="thumbnail-missing">
      <span>ROBLOX</span>
    </div>
  `;
}

/* ---------------- CARD ---------------- */

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
    <a
      class="game-card"
      href="${escapeHTML(game.robloxUrl)}"
      target="_blank"
      rel="noopener noreferrer"
    >

      <div class="game-thumbnail-container">
        ${gameImage(game)}
      </div>

      <div class="game-card-body">

        <div
          class="game-name"
          title="${escapeHTML(game.name)}"
        >
          ${escapeHTML(game.name)}
        </div>

        <div class="game-creator">
          ${
            game.creator
              ? `By ${escapeHTML(game.creator)}`
              : "Roblox"
          }
        </div>

        <div class="game-stats">

          <span>
            ${formatNumber(game.playing)}
            playing
          </span>

          <span>•</span>

          <span>
            ${formatNumber(game.visits)}
            visits
          </span>

        </div>

      </div>

    </a>
  `;
}

/* ---------------- RENDER ---------------- */

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
      <div class="no-games">
        No Roblox experiences found.
      </div>
    `;
    return;
  }

  container.innerHTML =
    valid
      .map(createGameCard)
      .join("");
}

/* ---------------- CONTAINERS ---------------- */

function getPopularContainer() {
  return (
    document.querySelector(
      "#popular-games"
    ) ||
    document.querySelector(
      "#popularGames"
    ) ||
    document.querySelector(
      '[data-section="popular"]'
    )
  );
}

function getRecommendedContainer() {
  return (
    document.querySelector(
      "#recommended-games"
    ) ||
    document.querySelector(
      "#recommendedGames"
    ) ||
    document.querySelector(
      '[data-section="recommended"]'
    )
  );
}

function getSearchContainer() {
  return (
    document.querySelector(
      "#search-results"
    ) ||
    document.querySelector(
      "#searchResults"
    )
  );
}

/* ---------------- HOME ---------------- */

async function loadHome() {
  try {
    console.log(
      "Connecting to Roblox..."
    );

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
        data.error ||
        "Backend returned an error"
      );
    }

    homeGames = [
      ...(data.popular || []),
      ...(data.recommended || [])
    ];

    renderGames(
      getPopularContainer(),
      data.popular || []
    );

    renderGames(
      getRecommendedContainer(),
      data.recommended || []
    );

    console.log(
      "Roblox games loaded:",
      homeGames
    );

    setStatus(
      "Connected to Roblox"
    );

  } catch (error) {
    console.error(
      "WebBlox home error:",
      error
    );

    setStatus(
      "Unable to connect to Roblox"
    );
  }
}

/* ---------------- SEARCH ---------------- */

async function searchGames(query) {
  query =
    String(query || "")
      .trim();

  if (!query) {
    return;
  }

  const container =
    getSearchContainer();

  if (!container) {
    console.error(
      "Search results container missing."
    );
    return;
  }

  container.innerHTML = `
    <div class="search-loading">
      Searching Roblox for
      <strong>${escapeHTML(query)}</strong>...
    </div>
  `;

  try {
    const response =
      await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(
          query
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

    searchResults =
      data.games || [];

    renderGames(
      container,
      searchResults
    );

    container.parentElement?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    console.log(
      `Roblox search: ${query}`,
      searchResults
    );

  } catch (error) {
    console.error(
      "Search failed:",
      error
    );

    container.innerHTML = `
      <div class="search-error">
        Search failed. Try again.
      </div>
    `;
  }
}

/* ---------------- SEARCH UI ---------------- */

function setupSearch() {
  const input =
    document.querySelector(
      "#search"
    ) ||
    document.querySelector(
      "#searchInput"
    ) ||
    document.querySelector(
      ".search-input"
    ) ||
    document.querySelector(
      'input[type="search"]'
    );

  const button =
    document.querySelector(
      "#searchButton"
    ) ||
    document.querySelector(
      ".search-button"
    );

  if (!input) {
    console.warn(
      "WebBlox search input not found."
    );
    return;
  }

  const run = () => {
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
        run();
      }
    }
  );

  if (button) {
    button.addEventListener(
      "click",
      run
    );
  }
}

/* ---------------- SEE ALL ---------------- */

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

          const container =
            getSearchContainer();

          if (!container) {
            return;
          }

          /*
            "See All" displays every real game
            currently returned by the backend.
          */

          renderGames(
            container,
            homeGames
          );

          container.scrollIntoView({
            behavior: "smooth"
          });
        }
      );
    });
}

/* ---------------- STATUS ---------------- */

function setStatus(text) {
  const status =
    document.querySelector(
      "#status"
    ) ||
    document.querySelector(
      "#connection-status"
    );

  if (status) {
    status.textContent = text;
  }
}

/* ---------------- START ---------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupSearch();
    setupSeeAll();
    loadHome();
  }
);
