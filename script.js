/* ============================================================
   WebBlox Frontend
   ============================================================ */

(() => {
  "use strict";

  const API_BASE =
    "https://webblox-backend.onrender.com";

  const state = {
    home: null,
    searchResults: [],
    favorites:
      JSON.parse(
        localStorage.getItem(
          "webblox-favorites"
        ) || "[]"
      )
  };

  // ==========================================================
  // HELPERS
  // ==========================================================

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(number) {
    const value = Number(number) || 0;

    if (value >= 1_000_000_000) {
      return (
        (value / 1_000_000_000)
          .toFixed(1)
          .replace(".0", "") +
        "B"
      );
    }

    if (value >= 1_000_000) {
      return (
        (value / 1_000_000)
          .toFixed(1)
          .replace(".0", "") +
        "M"
      );
    }

    if (value >= 1_000) {
      return (
        (value / 1_000)
          .toFixed(1)
          .replace(".0", "") +
        "K"
      );
    }

    return value.toLocaleString();
  }

  function isFavorite(game) {
    return state.favorites.includes(
      Number(game.universeId)
    );
  }

  function saveFavorites() {
    localStorage.setItem(
      "webblox-favorites",
      JSON.stringify(state.favorites)
    );
  }

  function toggleFavorite(game) {
    const id =
      Number(game.universeId);

    if (state.favorites.includes(id)) {
      state.favorites =
        state.favorites.filter(
          x => x !== id
        );
    } else {
      state.favorites.push(id);
    }

    saveFavorites();

    renderCurrentPage();
  }

  // ==========================================================
  // IMAGE
  // ==========================================================

  function imageHTML(game) {
    const url =
      game.thumbnail ||
      game.icon ||
      "";

    if (!url) {
      return `
        <div class="game-image-placeholder">
          <span>W</span>
        </div>
      `;
    }

    return `
      <img
        class="game-image"
        src="${escapeHTML(url)}"
        alt="${escapeHTML(game.name)}"
        loading="lazy"
        onerror="
          this.style.display='none';
          this.parentElement.classList.add('image-failed');
        "
      >
    `;
  }

  // ==========================================================
  // GAME CARD
  // ==========================================================

  function gameCard(game) {
    const favorite =
      isFavorite(game);

    return `
      <article
        class="game-card"
        data-game-id="${Number(
          game.universeId
        )}"
      >
        <div class="game-image-wrap">
          ${imageHTML(game)}

          <button
            class="favorite-button ${
              favorite ? "is-favorite" : ""
            }"
            type="button"
            data-favorite="${Number(
              game.universeId
            )}"
            aria-label="Favorite"
          >
            ${favorite ? "★" : "☆"}
          </button>
        </div>

        <div class="game-card-body">
          <h3 class="game-title">
            ${escapeHTML(
              game.name ||
              "Untitled Experience"
            )}
          </h3>

          <div class="game-creator">
            By
            <span>
              ${escapeHTML(
                game.creator ||
                "Unknown Creator"
              )}
            </span>
          </div>

          <div class="game-stats">
            <span>
              ●
              ${formatNumber(
                game.playing
              )} playing
            </span>

            <span>
              ${formatNumber(
                game.visits
              )} visits
            </span>
          </div>
        </div>
      </article>
    `;
  }

  // ==========================================================
  // CREATE PAGE IF NEEDED
  // ==========================================================

  function buildPage() {
    document.body.innerHTML = `
      <div id="webblox-app">

        <header class="wb-topbar">

          <div class="wb-brand">
            <div class="wb-logo">
              W
            </div>

            <span>WebBlox</span>
          </div>

          <nav class="wb-main-nav">
            <button
              type="button"
              class="wb-nav active"
              data-page="discover"
            >
              Discover
            </button>

            <button
              type="button"
              class="wb-nav"
              data-page="favorites"
            >
              Favorites
            </button>
          </nav>

          <div class="wb-top-spacer"></div>

        </header>

        <div class="wb-layout">

          <aside class="wb-sidebar">

            <div class="wb-sidebar-title">
              Discover
            </div>

            <button
              class="wb-side-item active"
              data-page="discover"
            >
              <span>⌂</span>
              Home
            </button>

            <button
              class="wb-side-item"
              data-page="favorites"
            >
              <span>★</span>
              Favorites
            </button>

            <div class="wb-side-divider"></div>

            <div class="wb-sidebar-label">
              WEBBLOX
            </div>

            <div class="wb-sidebar-note">
              Real Roblox experiences
            </div>

          </aside>

          <main class="wb-content">

            <div class="wb-search">

              <div class="wb-search-icon">
                ⌕
              </div>

              <input
                id="searchInput"
                type="search"
                placeholder="Search Roblox games"
                autocomplete="off"
              >

              <button
                id="searchButton"
                type="button"
              >
                Search
              </button>

            </div>

            <section
              id="searchSection"
              class="wb-section search-section hidden"
            >
              <div class="section-heading-row">

                <div>
                  <h1>Search Results</h1>

                  <p id="searchSubtitle">
                    Roblox experiences
                  </p>
                </div>

                <button
                  id="clearSearch"
                  class="see-all-button"
                  type="button"
                >
                  Clear
                </button>

              </div>

              <div
                id="searchGrid"
                class="game-grid"
              ></div>
            </section>

            <section
              id="discoverPage"
              class="wb-section"
            >

              <div class="section-heading-row">

                <div>
                  <h1>Recommended For You</h1>

                  <p>
                    Roblox experiences you might enjoy
                  </p>
                </div>

                <button
                  id="recommendedSeeAll"
                  class="see-all-button"
                  type="button"
                >
                  See All →
                </button>

              </div>

              <div
                id="recommendedGrid"
                class="game-grid"
              ></div>

            </section>

            <section
              id="popularSection"
              class="wb-section"
            >

              <div class="section-heading-row">

                <div>
                  <h2>Popular Right Now</h2>

                  <p>
                    Experiences players are playing
                  </p>
                </div>

                <button
                  id="popularSeeAll"
                  class="see-all-button"
                  type="button"
                >
                  See All →
                </button>

              </div>

              <div
                id="popularGrid"
                class="game-grid"
              ></div>

            </section>

            <section
              id="favoritesPage"
              class="wb-section hidden"
            >

              <div class="section-heading-row">

                <div>
                  <h1>Favorites</h1>

                  <p>
                    Your saved Roblox experiences
                  </p>
                </div>

              </div>

              <div
                id="favoritesGrid"
                class="game-grid"
              ></div>

            </section>

          </main>

        </div>

      </div>
    `;
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  function loadingHTML() {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div>Loading Roblox experiences...</div>
      </div>
    `;
  }

  function errorHTML() {
    return `
      <div class="error-state">
        <div class="error-icon">!</div>

        <h2>Games couldn't load</h2>

        <p>
          WebBlox couldn't connect to the backend.
        </p>

        <button
          id="retryButton"
          class="retry-button"
          type="button"
        >
          Try Again
        </button>
      </div>
    `;
  }

  // ==========================================================
  // API
  // ==========================================================

  async function apiFetch(path) {
    const url =
      `${API_BASE}${path}`;

    console.log(
      "[WebBlox] Request:",
      url
    );

    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept:
            "application/json"
        }
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return response.json();
  }

  // ==========================================================
  // HOME
  // ==========================================================

  async function loadHome() {
    $("#recommendedGrid").innerHTML =
      loadingHTML();

    $("#popularGrid").innerHTML =
      loadingHTML();

    try {
      console.log(
        "[WebBlox] Loading home..."
      );

      const data =
        await apiFetch(
          "/api/home"
        );

      if (!data.success) {
        throw new Error(
          data.error ||
          "Home request failed"
        );
      }

      state.home = data;

      renderHome();

    } catch (error) {
      console.error(
        "[WebBlox] Home error:",
        error
      );

      $("#recommendedGrid").innerHTML =
        errorHTML();

      $("#popularGrid").innerHTML =
        "";
    }
  }

  // ==========================================================
  // SEARCH
  // ==========================================================

  async function searchGames(query) {
    const clean =
      String(query || "")
        .trim();

    if (!clean) {
      return;
    }

    $("#searchSection")
      .classList
      .remove("hidden");

    $("#searchGrid").innerHTML =
      loadingHTML();

    $("#searchSubtitle")
      .textContent =
      `Results for "${clean}"`;

    try {
      const data =
        await apiFetch(
          `/api/search?q=${encodeURIComponent(
            clean
          )}`
        );

      if (!data.success) {
        throw new Error(
          data.error ||
          "Search failed"
        );
      }

      state.searchResults =
        Array.isArray(
          data.results
        )
          ? data.results
          : [];

      renderSearch();

      showPage("discover");

    } catch (error) {
      console.error(
        "[WebBlox] Search error:",
        error
      );

      $("#searchGrid").innerHTML = `
        <div class="error-state">
          <div class="error-icon">!</div>
          <h2>Search failed</h2>
          <p>
            ${escapeHTML(
              error.message
            )}
          </p>
        </div>
      `;
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  function renderHome() {
    const recommended =
      state.home?.recommended || [];

    const popular =
      state.home?.popular || [];

    $("#recommendedGrid").innerHTML =
      recommended.length
        ? recommended
            .map(gameCard)
            .join("")
        : `
          <div class="empty-state">
            No recommended games found.
          </div>
        `;

    $("#popularGrid").innerHTML =
      popular.length
        ? popular
            .map(gameCard)
            .join("")
        : `
          <div class="empty-state">
            No popular games found.
          </div>
        `;

    bindGameCards();
  }

  function renderSearch() {
    const results =
      state.searchResults;

    $("#searchGrid").innerHTML =
      results.length
        ? results
            .map(gameCard)
            .join("")
        : `
          <div class="empty-state">
            No Roblox experiences found.
          </div>
        `;

    bindGameCards();
  }

  function renderFavorites() {
    const allGames = [
      ...(state.home?.recommended || []),
      ...(state.home?.popular || []),
      ...(state.searchResults || [])
    ];

    const map =
      new Map();

    for (const game of allGames) {
      map.set(
        Number(game.universeId),
        game
      );
    }

    const favorites =
      state.favorites
        .map(id =>
          map.get(Number(id))
        )
        .filter(Boolean);

    $("#favoritesGrid").innerHTML =
      favorites.length
        ? favorites
            .map(gameCard)
            .join("")
        : `
          <div class="empty-state">
            <h2>No favorites yet</h2>
            <p>
              Click ☆ on a game to save it here.
            </p>
          </div>
        `;

    bindGameCards();
  }

  function renderCurrentPage() {
    renderHome();
    renderSearch();
    renderFavorites();
  }

  // ==========================================================
  // GAME ACTIONS
  // ==========================================================

  function bindGameCards() {
    document
      .querySelectorAll(".game-card")
      .forEach(card => {

        card.addEventListener(
          "click",
          event => {

            if (
              event.target.closest(
                ".favorite-button"
              )
            ) {
              return;
            }

            const id =
              Number(
                card.dataset.gameId
              );

            const games = [
              ...(state.home?.recommended || []),
              ...(state.home?.popular || []),
              ...(state.searchResults || [])
            ];

            const game =
              games.find(
                item =>
                  Number(
                    item.universeId
                  ) === id
              );

            if (
              game &&
              game.robloxUrl
            ) {
              window.location.href =
                game.robloxUrl;
            }
          }
        );
      });

    document
      .querySelectorAll(
        ".favorite-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            const id =
              Number(
                button.dataset.favorite
              );

            const games = [
              ...(state.home?.recommended || []),
              ...(state.home?.popular || []),
              ...(state.searchResults || [])
            ];

            const game =
              games.find(
                item =>
                  Number(
                    item.universeId
                  ) === id
              );

            if (game) {
              toggleFavorite(game);
            }
          }
        );
      });
  }

  // ==========================================================
  // PAGES
  // ==========================================================

  function showPage(page) {
    const discover =
      $("#discoverPage");

    const popular =
      $("#popularSection");

    const favorites =
      $("#favoritesPage");

    const navs =
      document.querySelectorAll(
        "[data-page]"
      );

    if (page === "favorites") {

      discover.classList.add(
        "hidden"
      );

      popular.classList.add(
        "hidden"
      );

      favorites.classList.remove(
        "hidden"
      );

      renderFavorites();

    } else {

      discover.classList.remove(
        "hidden"
      );

      popular.classList.remove(
        "hidden"
      );

      favorites.classList.add(
        "hidden"
      );
    }

    navs.forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });
  }

  // ==========================================================
  // EVENTS
  // ==========================================================

  function setupEvents() {

    $("#searchButton")
      .addEventListener(
        "click",
        () => {
          searchGames(
            $("#searchInput").value
          );
        }
      );

    $("#searchInput")
      .addEventListener(
        "keydown",
        event => {
          if (
            event.key === "Enter"
          ) {
            searchGames(
              event.target.value
            );
          }
        }
      );

    $("#clearSearch")
      .addEventListener(
        "click",
        () => {

          $("#searchInput")
            .value = "";

          $("#searchSection")
            .classList
            .add("hidden");

          state.searchResults = [];

          renderHome();
        }
      );

    $("#recommendedSeeAll")
      .addEventListener(
        "click",
        () => {

          if (
            state.home?.recommended
          ) {

            $("#searchSection")
              .classList
              .remove("hidden");

            $("#searchSubtitle")
              .textContent =
              "All recommended experiences";

            $("#searchGrid")
              .innerHTML =
              state.home.recommended
                .map(gameCard)
                .join("");

            bindGameCards();
          }
        }
      );

    $("#popularSeeAll")
      .addEventListener(
        "click",
        () => {

          if (
            state.home?.popular
          ) {

            $("#searchSection")
              .classList
              .remove("hidden");

            $("#searchSubtitle")
              .textContent =
              "All popular experiences";

            $("#searchGrid")
              .innerHTML =
              state.home.popular
                .map(gameCard)
                .join("");

            bindGameCards();
          }
        }
      );

    document
      .querySelectorAll(
        "[data-page]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.page
            );
          }
        );
      });

    document.addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "retryButton"
        ) {
          loadHome();
        }
      }
    );
  }

  // ==========================================================
  // START
  // ==========================================================

  function start() {

    console.log(
      "[WebBlox] Starting WebBlox..."
    );

    buildPage();

    setupEvents();

    loadHome();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start
    );
  } else {
    start();
  }

})();
