"use strict";

/* ============================================================
   WebBlox - Frontend
   ============================================================ */

const API_BASE = "https://webblox-backend.onrender.com";

const API = {
    home: `${API_BASE}/api/home`,
    popular: `${API_BASE}/api/popular`,
    search: `${API_BASE}/api/search`,
    game: `${API_BASE}/api/game/`
};


/* ============================================================
   ELEMENT HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);

const recommendedContainer =
    $("recommendedGames") ||
    $("recommendedGrid");

const popularContainer =
    $("popularGames") ||
    $("popularGrid");

const searchContainer =
    $("searchGames");

const searchSection =
    $("searchSection");

const searchInput =
    $("searchInput");

const searchButton =
    $("searchButton");

const searchStatus =
    $("searchStatus");

const errorSection =
    $("errorSection");

const errorMessage =
    $("errorMessage");

const gameModal =
    $("gameModal");


/* ============================================================
   API
   ============================================================ */

async function apiFetch(url) {

    console.log("[WebBlox] Request:", url);

    let response;

    try {

        response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

    } catch (error) {

        console.error("[WebBlox] Network error:", error);

        throw new Error(
            "Could not connect to the WebBlox backend."
        );
    }

    const text = await response.text();

    console.log(
        "[WebBlox] HTTP:",
        response.status
    );

    if (!text) {

        throw new Error(
            "The backend returned an empty response."
        );
    }

    if (text.trim().startsWith("<")) {

        throw new Error(
            "The backend returned HTML instead of JSON."
        );
    }

    let data;

    try {

        data = JSON.parse(text);

    } catch {

        console.error(
            "[WebBlox] Invalid JSON:",
            text
        );

        throw new Error(
            "The backend returned invalid JSON."
        );
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            `Backend returned HTTP ${response.status}.`
        );
    }

    if (data.success === false) {

        throw new Error(
            data.error ||
            "The Roblox service returned an error."
        );
    }

    return data;
}


/* ============================================================
   LOAD HOME
   ============================================================ */

async function loadHome() {

    hideError();

    if (recommendedContainer) {

        showLoading(
            recommendedContainer,
            "Loading recommended Roblox experiences..."
        );
    }

    if (popularContainer) {

        showLoading(
            popularContainer,
            "Loading popular Roblox experiences..."
        );
    }

    try {

        const data =
            await apiFetch(API.home);

        console.log(
            "[WebBlox] Home data:",
            data
        );

        /*
         * IMPORTANT:
         *
         * These arrays come directly from the backend.
         *
         * We do NOT generate fake games here.
         */

        const recommended =
            Array.isArray(data.recommended)
                ? data.recommended
                : [];

        const popular =
            Array.isArray(data.popular)
                ? data.popular
                : [];

        /*
         * Some backend versions may return
         * trending separately.
         */

        const trending =
            Array.isArray(data.trending)
                ? data.trending
                : [];

        if (recommendedContainer) {

            renderGames(
                recommendedContainer,
                recommended,
                "No recommended Roblox experiences found."
            );
        }

        /*
         * The Popular section MUST use the
         * backend's popular array.
         */

        if (popularContainer) {

            renderGames(
                popularContainer,
                popular,
                "No popular Roblox experiences found."
            );
        }

        /*
         * If a separate trending container exists,
         * use the backend's trending array.
         */

        const trendingContainer =
            $("trendingGames") ||
            $("trendingGrid");

        if (trendingContainer) {

            renderGames(
                trendingContainer,
                trending.length
                    ? trending
                    : popular,
                "No trending Roblox experiences found."
            );
        }

        if (
            recommended.length === 0 &&
            popular.length === 0 &&
            trending.length === 0
        ) {

            showError(
                "The backend connected, but returned no Roblox experiences."
            );
        }

    } catch (error) {

        console.error(
            "[WebBlox] Home error:",
            error
        );

        if (recommendedContainer) {
            recommendedContainer.innerHTML = "";
        }

        if (popularContainer) {
            popularContainer.innerHTML = "";
        }

        showError(error.message);
    }
}


/* ============================================================
   RENDER
   ============================================================ */

function renderGames(
    container,
    games,
    emptyMessage
) {

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(games) ||
        games.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-card">
                ${escapeHTML(
                    emptyMessage ||
                    "No Roblox experiences found."
                )}
            </div>
        `;

        return;
    }

    games.forEach(game => {

        if (!game) {
            return;
        }

        container.appendChild(
            createGameCard(game)
        );
    });
}


/* ============================================================
   GAME CARD
   ============================================================ */

function createGameCard(game) {

    const card =
        document.createElement("article");

    card.className =
        "game-card";

    /*
     * IMAGE WRAPPER
     */

    const imageWrap =
        document.createElement("div");

    imageWrap.className =
        "game-image-wrap";


    /*
     * IMAGE
     */

    const image =
        document.createElement("img");

    image.className =
        "game-thumbnail";

    image.alt =
        game.name ||
        "Roblox experience";

    image.loading =
        "lazy";

    /*
     * Prefer thumbnail.
     * Then icon.
     */

    const imageUrl =
        getGameImage(game);

    if (imageUrl) {

        image.src =
            imageUrl;

    } else {

        image.src =
            createPlaceholder(
                game.name
            );
    }

    image.onerror =
        function () {

            if (
                this.dataset.failed === "true"
            ) {
                return;
            }

            this.dataset.failed =
                "true";

            this.src =
                createPlaceholder(
                    game.name
                );
        };

    imageWrap.appendChild(image);


    /*
     * FAVORITE
     */

    const favoriteButton =
        document.createElement("button");

    favoriteButton.className =
        "favorite-button";

    favoriteButton.type =
        "button";

    favoriteButton.textContent =
        isFavorite(game)
            ? "★"
            : "☆";

    favoriteButton.title =
        "Favorite";

    favoriteButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            toggleFavorite(
                game,
                favoriteButton
            );
        }
    );

    imageWrap.appendChild(
        favoriteButton
    );


    /*
     * CARD BODY
     */

    const body =
        document.createElement("div");

    body.className =
        "game-card-body";


    /*
     * TITLE
     */

    const title =
        document.createElement("h3");

    title.className =
        "game-title";

    title.textContent =
        game.name ||
        "Unknown Roblox Experience";


    /*
     * CREATOR
     */

    const creator =
        document.createElement("p");

    creator.className =
        "game-creator";

    creator.textContent =
        "By " +
        getCreatorName(game);


    /*
     * STATS
     */

    const stats =
        document.createElement("div");

    stats.className =
        "game-stats";


    const players =
        document.createElement("span");

    players.textContent =
        "👥 " +
        formatNumber(
            game.playing || 0
        ) +
        " playing";


    const visits =
        document.createElement("span");

    visits.textContent =
        "👁 " +
        formatNumber(
            game.visits || 0
        );


    stats.appendChild(players);
    stats.appendChild(visits);

    body.appendChild(title);
    body.appendChild(creator);
    body.appendChild(stats);

    card.appendChild(imageWrap);
    card.appendChild(body);


    /*
     * OPEN GAME
     */

    card.addEventListener(
        "click",
        function () {

            openGame(game);

        }
    );

    return card;
}


/* ============================================================
   CREATOR
   ============================================================ */

function getCreatorName(game) {

    /*
     * Backend can provide creator in different forms.
     */

    if (
        typeof game.creator === "string" &&
        game.creator.trim()
    ) {

        return game.creator;
    }

    if (
        game.creator &&
        typeof game.creator === "object"
    ) {

        return (
            game.creator.name ||
            game.creator.username ||
            game.creator.displayName ||
            "Unknown Creator"
        );
    }

    if (
        typeof game.creatorName === "string" &&
        game.creatorName.trim()
    ) {

        return game.creatorName;
    }

    if (
        typeof game.creatorUsername === "string" &&
        game.creatorUsername.trim()
    ) {

        return game.creatorUsername;
    }

    return "Unknown Creator";
}


/* ============================================================
   IMAGE
   ============================================================ */

function getGameImage(game) {

    const candidates = [

        game.thumbnail,

        game.thumbnailUrl,

        game.image,

        game.imageUrl,

        game.icon,

        game.iconUrl

    ];

    for (
        const url of candidates
    ) {

        if (
            typeof url === "string" &&
            url.trim()
        ) {

            return url;
        }
    }

    return null;
}


/* ============================================================
   SEARCH
   ============================================================ */

async function searchGames() {

    if (!searchInput) {
        return;
    }

    const query =
        searchInput.value.trim();

    if (!query) {

        clearSearch();

        return;
    }

    if (searchSection) {

        searchSection.classList.remove(
            "hidden"
        );
    }

    if (searchContainer) {

        showLoading(
            searchContainer,
            "Searching Roblox..."
        );
    }

    if (searchStatus) {

        searchStatus.textContent =
            `Searching Roblox for "${query}"...`;
    }

    try {

        const url =
            API.search +
            "?q=" +
            encodeURIComponent(query);

        const data =
            await apiFetch(url);

        const games =
            Array.isArray(data.games)
                ? data.games
                : [];

        if (searchStatus) {

            searchStatus.textContent =
                `${games.length} ${
                    games.length === 1
                        ? "experience"
                        : "experiences"
                } found`;
        }

        if (searchContainer) {

            renderGames(
                searchContainer,
                games,
                "No Roblox experiences matched your search."
            );
        }

        if (searchSection) {

            searchSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

    } catch (error) {

        console.error(
            "[WebBlox] Search error:",
            error
        );

        if (searchStatus) {

            searchStatus.textContent =
                "Search failed";
        }

        if (searchContainer) {

            searchContainer.innerHTML = `
                <div class="empty-card">
                    ${escapeHTML(
                        error.message
                    )}
                </div>
            `;
        }
    }
}


/* ============================================================
   OPEN GAME
   ============================================================ */

function openGame(game) {

    if (!gameModal) {

        /*
         * If the modal doesn't exist,
         * directly open the Roblox game.
         */

        playGame(game);

        return;
    }

    const modalTitle =
        $("modalTitle");

    const modalCreator =
        $("modalCreator");

    const modalDescription =
        $("modalDescription");

    const modalPlayers =
        $("modalPlayers");

    const modalVisits =
        $("modalVisits");

    const modalImage =
        $("modalImage");

    const playButton =
        $("playButton");


    if (modalTitle) {

        modalTitle.textContent =
            game.name ||
            "Roblox Experience";
    }

    if (modalCreator) {

        modalCreator.textContent =
            "By " +
            getCreatorName(game);
    }

    if (modalDescription) {

        modalDescription.textContent =
            game.description ||
            "No description available.";
    }

    if (modalPlayers) {

        modalPlayers.textContent =
            formatNumber(
                game.playing || 0
            );
    }

    if (modalVisits) {

        modalVisits.textContent =
            formatNumber(
                game.visits || 0
            );
    }

    if (modalImage) {

        modalImage.src =
            getGameImage(game) ||
            createPlaceholder(
                game.name
            );

        modalImage.alt =
            game.name ||
            "Roblox experience";
    }

    if (playButton) {

        /*
         * Remove old handler first.
         */

        playButton.onclick =
            null;

        playButton.onclick =
            function () {

                playGame(game);

            };
    }

    gameModal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );
}


/* ============================================================
   PLAY
   ============================================================ */

function playGame(game) {

    /*
     * Prefer placeId.
     */

    if (game.placeId) {

        const url =
            "https://www.roblox.com/games/" +
            encodeURIComponent(
                game.placeId
            );

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

        return;
    }

    /*
     * Some backend responses may provide
     * rootPlaceId instead.
     */

    if (game.rootPlaceId) {

        const url =
            "https://www.roblox.com/games/" +
            encodeURIComponent(
                game.rootPlaceId
            );

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

        return;
    }

    if (game.robloxUrl) {

        window.open(
            game.robloxUrl,
            "_blank",
            "noopener,noreferrer"
        );

        return;
    }

    alert(
        "This Roblox experience does not have a playable place ID."
    );
}


/* ============================================================
   CLOSE GAME
   ============================================================ */

function closeGame() {

    if (!gameModal) {
        return;
    }

    gameModal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* ============================================================
   FAVORITES
   ============================================================ */

function getFavorites() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "webblox_favorites"
            ) || "[]"
        );

    } catch {

        return [];
    }
}


function saveFavorites(favorites) {

    localStorage.setItem(
        "webblox_favorites",
        JSON.stringify(favorites)
    );
}


function getGameId(game) {

    return String(
        game.universeId ||
        game.placeId ||
        game.id ||
        game.name ||
        ""
    );
}


function isFavorite(game) {

    const id =
        getGameId(game);

    return getFavorites().includes(id);
}


function toggleFavorite(
    game,
    button
) {

    const id =
        getGameId(game);

    if (!id) {
        return;
    }

    let favorites =
        getFavorites();

    if (
        favorites.includes(id)
    ) {

        favorites =
            favorites.filter(
                item => item !== id
            );

        button.textContent =
            "☆";

    } else {

        favorites.push(id);

        button.textContent =
            "★";
    }

    saveFavorites(
        favorites
    );
}


/* ============================================================
   CLEAR SEARCH
   ============================================================ */

function clearSearch() {

    if (searchInput) {

        searchInput.value =
            "";
    }

    if (searchSection) {

        searchSection.classList.add(
            "hidden"
        );
    }

    if (searchContainer) {

        searchContainer.innerHTML =
            "";
    }

    if (searchStatus) {

        searchStatus.textContent =
            "";
    }
}


/* ============================================================
   ERROR
   ============================================================ */

function showError(message) {

    if (!errorSection) {
        return;
    }

    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "The Roblox game service could not be reached.";
    }

    errorSection.classList.remove(
        "hidden"
    );
}


function hideError() {

    if (!errorSection) {
        return;
    }

    errorSection.classList.add(
        "hidden"
    );
}


/* ============================================================
   LOADING
   ============================================================ */

function showLoading(
    container,
    message
) {

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>
                ${escapeHTML(
                    message ||
                    "Loading..."
                )}
            </span>
        </div>
    `;
}


/* ============================================================
   NUMBER FORMAT
   ============================================================ */

function formatNumber(value) {

    const number =
        Number(value) || 0;

    if (
        number >= 1000000000
    ) {

        return (
            number / 1000000000
        ).toFixed(1) + "B";
    }

    if (
        number >= 1000000
    ) {

        return (
            number / 1000000
        ).toFixed(1) + "M";
    }

    if (
        number >= 1000
    ) {

        return (
            number / 1000
        ).toFixed(1) + "K";
    }

    return number.toLocaleString();
}


/* ============================================================
   PLACEHOLDER
   ============================================================ */

function createPlaceholder(name) {

    const text =
        String(
            name || "Roblox"
        )
        .substring(0, 24);

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="768"
                height="432"
                viewBox="0 0 768 432"
            >
                <rect
                    width="768"
                    height="432"
                    fill="#18181c"
                />

                <text
                    x="384"
                    y="216"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#888"
                    font-size="30"
                    font-family="Arial"
                >
                    ${escapeHTML(text)}
                </text>
            </svg>
        `)
    );
}


/* ============================================================
   ESCAPE
   ============================================================ */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   SCROLL
   ============================================================ */

function scrollToGames() {

    const section =
        document.querySelector(
            ".game-section"
        );

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });
    }
}


function scrollToPopular() {

    const section =
        $("popularSection");

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }

    const popular =
        popularContainer;

    if (popular) {

        popular.scrollIntoView({
            behavior: "smooth"
        });
    }
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

/*
 * IMPORTANT:
 *
 * Every listener is checked first.
 *
 * This prevents:
 *
 * Cannot read properties of null
 * (reading 'addEventListener')
 *
 * if an element is missing from index.html.
 */

if (searchButton) {

    searchButton.addEventListener(
        "click",
        searchGames
    );
}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                searchGames();
            }
        }
    );
}


/*
 * Modal close buttons.
 */

const modalClose =
    document.querySelector(
        ".modal-close"
    );

if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeGame
    );
}


const modalBackdrop =
    document.querySelector(
        ".modal-backdrop"
    );

if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        closeGame
    );
}


/*
 * ESC closes modal.
 */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            closeGame();
        }
    }
);


/* ============================================================
   GLOBAL BUTTON FUNCTIONS
   ============================================================ */

window.loadHome =
    loadHome;

window.searchGames =
    searchGames;

window.clearSearch =
    clearSearch;

window.openGame =
    openGame;

window.closeGame =
    closeGame;

window.scrollToGames =
    scrollToGames;

window.scrollToPopular =
    scrollToPopular;


/* ============================================================
   START
   ============================================================ */

console.log(
    "===================================="
);

console.log(
    "[WebBlox] Starting WebBlox..."
);

console.log(
    "[WebBlox] Frontend:",
    window.location.href
);

console.log(
    "[WebBlox] Backend:",
    API_BASE
);

console.log(
    "[WebBlox] Home API:",
    API.home
);

console.log(
    "===================================="
);


loadHome();
