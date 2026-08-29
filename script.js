"use strict";

/* ============================================================
   WebBlox
   Roblox Experience Frontend
   ============================================================ */

const API_BASE =
    "https://webblox-backend.onrender.com";


const API = {

    home:
        API_BASE + "/api/home",

    popular:
        API_BASE + "/api/popular",

    search:
        API_BASE + "/api/search",

    game:
        API_BASE + "/api/game/"

};


/* ============================================================
   DOM
   ============================================================ */

const discoverPage =
    document.getElementById("discoverPage");

const favoritesPage =
    document.getElementById("favoritesPage");

const discoverButton =
    document.getElementById("discoverButton");

const favoritesButton =
    document.getElementById("favoritesButton");

const homeButton =
    document.getElementById("homeButton");

const exploreButton =
    document.getElementById("exploreButton");

const seeAllButton =
    document.getElementById("seeAllButton");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const clearSearchButton =
    document.getElementById("clearSearchButton");

const searchSection =
    document.getElementById("searchSection");

const searchGamesContainer =
    document.getElementById("searchGames");

const searchStatus =
    document.getElementById("searchStatus");

const recommendedGamesContainer =
    document.getElementById("recommendedGames");

const popularGamesContainer =
    document.getElementById("popularGames");

const favoritesGamesContainer =
    document.getElementById("favoritesGames");

const popularSection =
    document.getElementById("popularSection");

const errorSection =
    document.getElementById("errorSection");

const errorMessage =
    document.getElementById("errorMessage");

const retryButton =
    document.getElementById("retryButton");


/* ============================================================
   MODAL
   ============================================================ */

const gameModal =
    document.getElementById("gameModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const modalClose =
    document.getElementById("modalClose");

const modalImage =
    document.getElementById("modalImage");

const modalTitle =
    document.getElementById("modalTitle");

const modalCreator =
    document.getElementById("modalCreator");

const modalDescription =
    document.getElementById("modalDescription");

const modalPlayers =
    document.getElementById("modalPlayers");

const modalVisits =
    document.getElementById("modalVisits");

const playButton =
    document.getElementById("playButton");

const favoriteModalButton =
    document.getElementById(
        "favoriteModalButton"
    );


let currentGame = null;


/* ============================================================
   FAVORITES
   ============================================================ */

const FAVORITES_KEY =
    "webblox_favorites";


function getFavorites() {

    try {

        const saved =
            localStorage.getItem(
                FAVORITES_KEY
            );

        if (!saved) {
            return [];
        }

        const parsed =
            JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "[WebBlox] Favorites error:",
            error
        );

        return [];

    }

}


function saveFavorites(favorites) {

    try {

        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favorites)
        );

    } catch (error) {

        console.error(
            "[WebBlox] Could not save favorites:",
            error
        );

    }

}


function getGameId(game) {

    if (!game) {
        return null;
    }

    return String(
        game.universeId ||
        game.placeId ||
        game.id ||
        ""
    );

}


function isFavorite(game) {

    const id =
        getGameId(game);

    if (!id) {
        return false;
    }

    return getFavorites().some(
        favorite =>
            getGameId(favorite) === id
    );

}


function toggleFavorite(game) {

    if (!game) {
        return;
    }

    const id =
        getGameId(game);

    if (!id) {
        return;
    }

    let favorites =
        getFavorites();

    const index =
        favorites.findIndex(
            favorite =>
                getGameId(favorite) === id
        );

    if (index >= 0) {

        favorites.splice(
            index,
            1
        );

    } else {

        favorites.unshift(
            normalizeGame(game)
        );

    }

    saveFavorites(
        favorites
    );

    updateFavoriteButtons();

    if (
        !favoritesPage.classList.contains(
            "hidden"
        )
    ) {

        renderFavorites();

    }

}


/* ============================================================
   NORMALIZE GAME
   ============================================================ */

function normalizeGame(game) {

    if (!game) {
        return {};
    }

    return {

        id:
            game.id ||
            game.universeId ||
            game.placeId ||
            null,

        universeId:
            game.universeId ||
            null,

        placeId:
            game.placeId ||
            null,

        name:
            cleanGameName(
                game.name
            ),

        description:
            game.description ||
            "",

        creator:
            cleanCreatorName(
                game.creator ||
                game.creatorName ||
                game.ownerName ||
                game.developer
            ),

        creatorId:
            game.creatorId ||
            null,

        playing:
            Number(
                game.playing ||
                game.players ||
                0
            ),

        visits:
            Number(
                game.visits ||
                game.visitCount ||
                0
            ),

        favorites:
            Number(
                game.favorites ||
                0
            ),

        maxPlayers:
            Number(
                game.maxPlayers ||
                0
            ),

        thumbnail:
            game.thumbnail ||
            game.image ||
            game.thumbnailUrl ||
            game.imageUrl ||
            "",

        icon:
            game.icon ||
            game.iconUrl ||
            "",

        robloxUrl:
            game.robloxUrl ||
            game.url ||
            "",

        genre:
            game.genre ||
            "",

        updated:
            game.updated ||
            ""

    };

}


/* ============================================================
   CLEAN GAME NAME
   ============================================================ */

function cleanGameName(name) {

    if (
        name === null ||
        name === undefined
    ) {

        return "Roblox Experience";

    }

    const value =
        String(name).trim();

    if (
        !value ||
        value.toLowerCase() === "undefined" ||
        value.toLowerCase() === "null" ||
        value.toLowerCase() === "unknown"
    ) {

        return "Roblox Experience";

    }

    return value;

}


/* ============================================================
   CLEAN CREATOR
   ============================================================ */

function cleanCreatorName(name) {

    if (
        name === null ||
        name === undefined
    ) {

        return "Roblox";

    }

    const value =
        String(name).trim();

    if (
        !value ||
        value.toLowerCase() === "undefined" ||
        value.toLowerCase() === "null" ||
        value.toLowerCase() === "unknown" ||
        value.toLowerCase() === "unknown creator"
    ) {

        return "Roblox";

    }

    return value;

}


/* ============================================================
   API FETCH
   ============================================================ */

async function apiFetch(url) {

    console.log(
        "[WebBlox] Request:",
        url
    );

    let response;

    try {

        response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    },
                    cache: "no-store"
                }
            );

    } catch (error) {

        console.error(
            "[WebBlox] Network error:",
            error
        );

        throw new Error(
            "Could not connect to the WebBlox backend."
        );

    }

    const text =
        await response.text();

    console.log(
        "[WebBlox] HTTP:",
        response.status
    );

    if (!text) {

        throw new Error(
            "The WebBlox backend returned an empty response."
        );

    }

    if (
        text.trim().startsWith("<")
    ) {

        throw new Error(
            "The backend returned HTML instead of JSON."
        );

    }

    let data;

    try {

        data =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "[WebBlox] JSON error:",
            text
        );

        throw new Error(
            "The backend returned invalid JSON."
        );

    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Backend returned HTTP " +
            response.status
        );

    }

    if (
        data.success === false
    ) {

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

    showDiscover();

    hideError();

    showLoading(
        recommendedGamesContainer,
        "Loading Roblox games..."
    );

    showLoading(
        popularGamesContainer,
        "Loading Roblox games..."
    );

    try {

        const data =
            await apiFetch(
                API.home
            );

        console.log(
            "[WebBlox] Home data:",
            data
        );

        const recommended =
            Array.isArray(
                data.recommended
            )
                ? data.recommended
                : [];

        const popular =
            Array.isArray(
                data.popular
            )
                ? data.popular
                : [];

        renderGames(
            recommendedGamesContainer,
            recommended,
            "No recommended Roblox experiences were returned."
        );

        renderGames(
            popularGamesContainer,
            popular,
            "No popular Roblox experiences were returned."
        );

        if (
            recommended.length === 0 &&
            popular.length === 0
        ) {

            showError(
                "The backend connected successfully, but Roblox did not return any experiences."
            );

        }

    } catch (error) {

        console.error(
            "[WebBlox] Home error:",
            error
        );

        recommendedGamesContainer.innerHTML =
            "";

        popularGamesContainer.innerHTML =
            "";

        showError(
            error.message
        );

    }

}


/* ============================================================
   RENDER GAMES
   ============================================================ */

function renderGames(
    container,
    games,
    emptyMessage
) {

    container.innerHTML =
        "";

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

    games.forEach(
        rawGame => {

            if (!rawGame) {
                return;
            }

            const game =
                normalizeGame(
                    rawGame
                );

            container.appendChild(
                createGameCard(game)
            );

        }
    );

}


/* ============================================================
   CREATE GAME CARD
   ============================================================ */

function createGameCard(game) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "game-card";

    const imageWrap =
        document.createElement(
            "div"
        );

    imageWrap.className =
        "game-image-wrap";


    /* IMAGE */

    const image =
        document.createElement(
            "img"
        );

    image.className =
        "game-thumbnail";

    image.alt =
        game.name;

    image.loading =
        "lazy";

    image.src =
        getThumbnail(game);


    image.onerror =
        function() {

            if (
                this.dataset.failed === "true"
            ) {

                imageWrap.classList.add(
                    "image-failed"
                );

                return;

            }

            this.dataset.failed =
                "true";

            this.src =
                createPlaceholder(
                    game.name
                );

        };


    /* FAVORITE */

    const favoriteButton =
        document.createElement(
            "button"
        );

    favoriteButton.type =
        "button";

    favoriteButton.className =
        "favorite-button";

    favoriteButton.setAttribute(
        "aria-label",
        "Favorite"
    );

    favoriteButton.innerHTML =
        isFavorite(game)
            ? "♥"
            : "♡";

    if (
        isFavorite(game)
    ) {

        favoriteButton.classList.add(
            "favorited"
        );

    }

    favoriteButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            toggleFavorite(
                game
            );

        }
    );


    imageWrap.appendChild(
        image
    );

    imageWrap.appendChild(
        favoriteButton
    );


    /* BODY */

    const body =
        document.createElement(
            "div"
        );

    body.className =
        "game-card-body";


    /* TITLE */

    const title =
        document.createElement(
            "h3"
        );

    title.className =
        "game-title";

    title.textContent =
        game.name;


    /* CREATOR */

    const creator =
        document.createElement(
            "p"
        );

    creator.className =
        "game-creator";

    creator.textContent =
        "By " +
        game.creator;


    /* STATS */

    const stats =
        document.createElement(
            "div"
        );

    stats.className =
        "game-stats";


    const players =
        document.createElement(
            "span"
        );

    players.textContent =
        "● " +
        formatNumber(
            game.playing
        ) +
        " playing";


    const visits =
        document.createElement(
            "span"
        );

    visits.textContent =
        formatNumber(
            game.visits
        ) +
        " visits";


    stats.appendChild(
        players
    );

    stats.appendChild(
        visits
    );


    body.appendChild(
        title
    );

    body.appendChild(
        creator
    );

    body.appendChild(
        stats
    );


    card.appendChild(
        imageWrap
    );

    card.appendChild(
        body
    );


    card.addEventListener(
        "click",
        function() {

            openGame(
                game
            );

        }
    );


    return card;

}


/* ============================================================
   THUMBNAIL
   ============================================================ */

function getThumbnail(game) {

    if (
        game.thumbnail &&
        isValidImageUrl(
            game.thumbnail
        )
    ) {

        return game.thumbnail;

    }

    if (
        game.icon &&
        isValidImageUrl(
            game.icon
        )
    ) {

        return game.icon;

    }

    return createPlaceholder(
        game.name
    );

}


function isValidImageUrl(url) {

    if (!url) {
        return false;
    }

    try {

        const parsed =
            new URL(
                url,
                window.location.href
            );

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:" ||
            parsed.protocol === "data:"
        );

    } catch {

        return false;

    }

}


/* ============================================================
   SEARCH
   ============================================================ */

async function searchGames() {

    const query =
        searchInput.value.trim();

    if (!query) {

        clearSearch();

        return;

    }


    showDiscover();

    searchSection.classList.remove(
        "hidden"
    );


    searchGamesContainer.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>Searching Roblox...</span>
        </div>
    `;


    searchStatus.textContent =
        'Searching Roblox for "' +
        query +
        '"...';


    try {

        const url =
            API.search +
            "?q=" +
            encodeURIComponent(
                query
            );


        const data =
            await apiFetch(
                url
            );


        const games =
            Array.isArray(
                data.games
            )
                ? data.games
                : Array.isArray(
                    data.results
                )
                    ? data.results
                    : [];


        searchStatus.textContent =
            games.length +
            (
                games.length === 1
                    ? " experience found"
                    : " experiences found"
            );


        renderGames(
            searchGamesContainer,
            games,
            "No Roblox experiences matched your search."
        );


        searchSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error(
            "[WebBlox] Search error:",
            error
        );

        searchStatus.textContent =
            "Search failed";

        searchGamesContainer.innerHTML = `
            <div class="empty-card error-inline">
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;

    }

}


/* ============================================================
   CLEAR SEARCH
   ============================================================ */

function clearSearch() {

    searchInput.value =
        "";

    searchSection.classList.add(
        "hidden"
    );

    searchGamesContainer.innerHTML =
        "";

    searchStatus.textContent =
        "";

}


/* ============================================================
   FAVORITES PAGE
   ============================================================ */

function showFavorites() {

    discoverPage.classList.add(
        "hidden"
    );

    favoritesPage.classList.remove(
        "hidden"
    );

    discoverButton.classList.remove(
        "active"
    );

    favoritesButton.classList.add(
        "active"
    );

    hideError();

    renderFavorites();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function renderFavorites() {

    const favorites =
        getFavorites();

    favoritesGamesContainer.innerHTML =
        "";

    if (
        favorites.length === 0
    ) {

        favoritesGamesContainer.innerHTML = `
            <div class="empty-card favorites-empty">
                <div class="empty-heart">♡</div>
                <h3>No favorites yet</h3>
                <p>
                    Click the heart on a Roblox experience
                    to save it here.
                </p>
            </div>
        `;

        return;

    }


    favorites.forEach(
        game => {

            favoritesGamesContainer.appendChild(
                createGameCard(
                    normalizeGame(game)
                )
            );

        }
    );

}


/* ============================================================
   DISCOVER PAGE
   ============================================================ */

function showDiscover() {

    discoverPage.classList.remove(
        "hidden"
    );

    favoritesPage.classList.add(
        "hidden"
    );

    discoverButton.classList.add(
        "active"
    );

    favoritesButton.classList.remove(
        "active"
    );

}


/* ============================================================
   HOME
   ============================================================ */

function goHome() {

    showDiscover();

    clearSearch();

    hideError();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   SEE ALL
   ============================================================ */

function showAllGames() {

    showDiscover();

    popularSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* ============================================================
   OPEN GAME
   ============================================================ */

function openGame(game) {

    currentGame =
        normalizeGame(game);


    modalTitle.textContent =
        currentGame.name;


    modalCreator.textContent =
        "By " +
        currentGame.creator;


    modalDescription.textContent =
        currentGame.description ||
        "No description available.";


    modalPlayers.textContent =
        formatNumber(
            currentGame.playing
        );


    modalVisits.textContent =
        formatNumber(
            currentGame.visits
        );


    modalImage.src =
        getThumbnail(
            currentGame
        );


    modalImage.alt =
        currentGame.name;


    modalImage.onerror =
        function() {

            this.src =
                createPlaceholder(
                    currentGame.name
                );

        };


    updateModalFavoriteButton();


    playButton.onclick =
        function() {

            playGame(
                currentGame
            );

        };


    gameModal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );

}


function closeGame() {

    gameModal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );

    currentGame =
        null;

}


/* ============================================================
   PLAY GAME
   ============================================================ */

function playGame(game) {

    if (!game) {
        return;
    }


    let placeId =
        game.placeId;


    if (
        !placeId &&
        game.id
    ) {

        placeId =
            game.id;

    }


    if (
        !placeId
    ) {

        if (
            game.robloxUrl
        ) {

            window.open(
                game.robloxUrl,
                "_blank",
                "noopener,noreferrer"
            );

            return;

        }


        alert(
            "This experience does not have a Roblox place ID."
        );

        return;

    }


    const url =
        "https://www.roblox.com/games/" +
        encodeURIComponent(
            placeId
        );


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* ============================================================
   MODAL FAVORITE
   ============================================================ */

function updateModalFavoriteButton() {

    if (!currentGame) {
        return;
    }

    if (
        isFavorite(
            currentGame
        )
    ) {

        favoriteModalButton.textContent =
            "♥ Favorited";

        favoriteModalButton.classList.add(
            "favorited"
        );

    } else {

        favoriteModalButton.textContent =
            "♡ Favorite";

        favoriteModalButton.classList.remove(
            "favorited"
        );

    }

}


function updateFavoriteButtons() {

    document
        .querySelectorAll(
            ".game-card"
        )
        .forEach(
            card => {

                const button =
                    card.querySelector(
                        ".favorite-button"
                    );

                if (!button) {
                    return;
                }

                const gameId =
                    card.dataset.gameId;

                if (!gameId) {
                    return;
                }

                const favorite =
                    getFavorites().some(
                        game =>
                            getGameId(game) ===
                            gameId
                    );

                button.innerHTML =
                    favorite
                        ? "♥"
                        : "♡";

                button.classList.toggle(
                    "favorited",
                    favorite
                );

            }
        );

    updateModalFavoriteButton();

}


/* ============================================================
   FIX CARD IDs
   ============================================================ */

const originalCreateGameCard =
    createGameCard;


/*
   Add IDs after cards are created.
*/

function addGameIdsToCards() {

    document
        .querySelectorAll(
            ".game-card"
        )
        .forEach(
            card => {

                const favorite =
                    card.querySelector(
                        ".favorite-button"
                    );

                if (
                    !favorite
                ) {
                    return;
                }

            }
        );

}


/* ============================================================
   ERROR
   ============================================================ */

function showError(message) {

    errorMessage.textContent =
        message ||
        "The Roblox game service could not be reached.";

    errorSection.classList.remove(
        "hidden"
    );

}


function hideError() {

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

function formatNumber(number) {

    number =
        Number(number) || 0;


    if (
        number >= 1000000000
    ) {

        return (
            number / 1000000000
        )
            .toFixed(
                number >= 10000000000
                    ? 0
                    : 1
            ) +
            "B";

    }


    if (
        number >= 1000000
    ) {

        return (
            number / 1000000
        )
            .toFixed(
                number >= 10000000
                    ? 0
                    : 1
            ) +
            "M";

    }


    if (
        number >= 1000
    ) {

        return (
            number / 1000
        )
            .toFixed(
                number >= 100000
                    ? 0
                    : 1
            ) +
            "K";

    }


    return number.toLocaleString();

}


/* ============================================================
   PLACEHOLDER
   ============================================================ */

function createPlaceholder(name) {

    const text =
        String(
            name ||
            "Roblox"
        )
            .substring(
                0,
                24
            )
            .replace(
                /[<>&"']/g,
                ""
            );


    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
            `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="768"
                height="432"
                viewBox="0 0 768 432"
            >
                <rect
                    width="768"
                    height="432"
                    fill="#18191d"
                />

                <text
                    x="384"
                    y="216"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#ffffff"
                    font-size="30"
                    font-family="Arial"
                >
                    ${text}
                </text>
            </svg>
            `
        )
    );

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ============================================================
   EVENTS
   ============================================================ */

function setupEvents() {

    /* HOME */

    homeButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            goHome();

        }
    );


    /* DISCOVER */

    discoverButton.addEventListener(
        "click",
        function() {

            showDiscover();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    /* FAVORITES */

    favoritesButton.addEventListener(
        "click",
        function() {

            showFavorites();

        }
    );


    /* SEARCH */

    searchButton.addEventListener(
        "click",
        function() {

            searchGames();

        }
    );


    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                searchGames();

            }

        }
    );


    /* CLEAR */

    clearSearchButton.addEventListener(
        "click",
        function() {

            clearSearch();

        }
    );


    /* EXPLORE */

    exploreButton.addEventListener(
        "click",
        function() {

            showAllGames();

        }
    );


    /* SEE ALL */

    seeAllButton.addEventListener(
        "click",
        function() {

            showAllGames();

        }
    );


    /* RETRY */

    retryButton.addEventListener(
        "click",
        function() {

            loadHome();

        }
    );


    /* MODAL */

    modalClose.addEventListener(
        "click",
        function() {

            closeGame();

        }
    );


    modalBackdrop.addEventListener(
        "click",
        function() {

            closeGame();

        }
    );


    /* FAVORITE MODAL */

    favoriteModalButton.addEventListener(
        "click",
        function() {

            if (!currentGame) {
                return;
            }

            toggleFavorite(
                currentGame
            );

            updateModalFavoriteButton();

        }
    );


    /* ESC */

    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Escape"
            ) {

                closeGame();

            }

        }
    );

}


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
    "[WebBlox] Search API:",
    API.search
);

console.log(
    "===================================="
);


setupEvents();

loadHome();
