"use strict";

/* ============================================================
   WebBlox
   Player + Studio Bridge
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
   WEBBLOX URLS
   ============================================================ */

const WEBBLOX_ROOT =
    new URL(
        "./",
        window.location.href
    );

const STUDIO_URL =
    new URL(
        "studio/",
        WEBBLOX_ROOT
    ).href;


/* ============================================================
   STUDIO PROJECT STORAGE
   ============================================================ */

const STUDIO_PROJECT_KEY =
    "webblox_studio_project";

const STUDIO_TEST_KEY =
    "webblox_studio_test";


function saveStudioProject(project) {

    try {

        localStorage.setItem(
            STUDIO_PROJECT_KEY,
            JSON.stringify(project)
        );

        return true;

    } catch (error) {

        console.error(
            "[WebBlox] Could not save Studio project:",
            error
        );

        return false;

    }

}


function getStudioProject() {

    try {

        const saved =
            localStorage.getItem(
                STUDIO_PROJECT_KEY
            );

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "[WebBlox] Could not load Studio project:",
            error
        );

        return null;

    }

}


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

const studioButton =
    document.getElementById("studioButton");

const heroStudioButton =
    document.getElementById("heroStudioButton");

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
   TEST MODE DOM
   ============================================================ */

const testGameScreen =
    document.getElementById("testGameScreen");

const testGameName =
    document.getElementById("testGameName");

const testGameViewport =
    document.getElementById("testGameViewport");

const exitTestButton =
    document.getElementById("exitTestButton");


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

    } catch {

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
            "[WebBlox] Favorites error:",
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
   NORMALIZE
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
   API
   ============================================================ */

async function apiFetch(url) {

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

    } catch {

        throw new Error(
            "Could not connect to the WebBlox backend."
        );

    }

    const text =
        await response.text();

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

    } catch {

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
   HOME
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
   RENDER
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


function createGameCard(game) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "game-card";

    card.dataset.gameId =
        getGameId(game) || "";


    const imageWrap =
        document.createElement(
            "div"
        );

    imageWrap.className =
        "game-image-wrap";


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


    const favoriteButton =
        document.createElement(
            "button"
        );

    favoriteButton.type =
        "button";

    favoriteButton.className =
        "favorite-button";

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


    const body =
        document.createElement(
            "div"
        );

    body.className =
        "game-card-body";


    const title =
        document.createElement(
            "h3"
        );

    title.className =
        "game-title";

    title.textContent =
        game.name;


    const creator =
        document.createElement(
            "p"
        );

    creator.className =
        "game-creator";

    creator.textContent =
        "By " +
        game.creator;


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

        const data =
            await apiFetch(
                API.search +
                "?q=" +
                encodeURIComponent(
                    query
                )
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
   DISCOVER
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


function goHome() {

    showDiscover();

    clearSearch();

    hideError();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showAllGames() {

    showDiscover();

    popularSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* ============================================================
   STUDIO NAVIGATION
   ============================================================ */

function openStudio() {

    /*
       This is intentionally relative to the WebBlox root.

       From:
       https://lcrazyness.github.io/WebBlox/

       it opens:
       https://lcrazyness.github.io/WebBlox/studio/
    */

    window.location.href =
        STUDIO_URL;

}


/* ============================================================
   GAME MODAL
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
   PLAY ROBLOX GAME
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
   MODAL FAVORITES
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
   TEST MODE
   ============================================================ */

function shouldStartTestMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("play") === "1"
    );

}


function startTestMode() {

    const project =
        getStudioProject();

    if (!project) {

        console.warn(
            "[WebBlox] No Studio project found."
        );

        return;

    }

    discoverPage.classList.add(
        "hidden"
    );

    favoritesPage.classList.add(
        "hidden"
    );

    errorSection.classList.add(
        "hidden"
    );

    testGameScreen.classList.remove(
        "hidden"
    );

    testGameName.textContent =
        project.name ||
        "WebBlox Game";

    document.body.classList.add(
        "test-mode"
    );

    buildTestWorld(
        project
    );

}


function stopTestMode() {

    testGameScreen.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "test-mode"
    );

    window.history.replaceState(
        {},
        document.title,
        WEBBLOX_ROOT.pathname
    );

}


function buildTestWorld(project) {

    testGameViewport
        .querySelectorAll(
            ".studio-test-part"
        )
        .forEach(
            element =>
                element.remove()
        );

    const parts =
        Array.isArray(
            project.parts
        )
            ? project.parts
            : [];

    parts.forEach(
        part => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "studio-test-part";

            const x =
                Number(part.x) || 0;

            const y =
                Number(part.y) || 0;

            const z =
                Number(part.z) || 0;

            const sizeX =
                Number(part.sizeX) || 4;

            const sizeY =
                Number(part.sizeY) || 1;

            const sizeZ =
                Number(part.sizeZ) || 4;

            element.style.width =
                Math.max(
                    20,
                    sizeX * 18
                ) +
                "px";

            element.style.height =
                Math.max(
                    10,
                    sizeY * 18
                ) +
                "px";

            element.style.left =
                "calc(50% + " +
                (
                    x * 18
                ) +
                "px)";

            element.style.top =
                "calc(50% + " +
                (
                    z * 18
                ) +
                "px)";

            element.style.transform =
                "translate(-50%, -50%)";

            element.title =
                part.name ||
                "Part";

            testGameViewport.appendChild(
                element
            );

        }
    );

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
   ESCAPE
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

    homeButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            goHome();

        }
    );


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


    favoritesButton.addEventListener(
        "click",
        function() {

            showFavorites();

        }
    );


    /*
       PLAYER -> STUDIO
    */

    studioButton.addEventListener(
        "click",
        function() {

            openStudio();

        }
    );


    heroStudioButton.addEventListener(
        "click",
        function() {

            openStudio();

        }
    );


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


    clearSearchButton.addEventListener(
        "click",
        function() {

            clearSearch();

        }
    );


    exploreButton.addEventListener(
        "click",
        function() {

            showAllGames();

        }
    );


    seeAllButton.addEventListener(
        "click",
        function() {

            showAllGames();

        }
    );


    retryButton.addEventListener(
        "click",
        function() {

            loadHome();

        }
    );


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


    exitTestButton.addEventListener(
        "click",
        function() {

            stopTestMode();

        }
    );


    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Escape" &&
                testGameScreen.classList.contains(
                    "hidden"
                )
            ) {

                closeGame();

            }

        }
    );

}


/* ============================================================
   START
   ============================================================ */

setupEvents();

if (
    shouldStartTestMode()
) {

    startTestMode();

} else {

    loadHome();

}
