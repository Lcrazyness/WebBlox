"use strict";

/* =========================================================
   WEBBLOX
   ========================================================= */

const API_BASE =
    "https://webblox-backend.onrender.com";

const API = {
    home:
        API_BASE + "/api/home",

    popular:
        API_BASE + "/api/popular",

    trending:
        API_BASE + "/api/trending",

    search:
        API_BASE + "/api/search"
};


/* =========================================================
   ELEMENTS
   ========================================================= */

const popularGames =
    document.getElementById(
        "popularGames"
    );

const trendingGames =
    document.getElementById(
        "trendingGames"
    );

const recommendedGames =
    document.getElementById(
        "recommendedGames"
    );

const searchGamesContainer =
    document.getElementById(
        "searchGames"
    );

const favoritesGames =
    document.getElementById(
        "favoritesGames"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const searchButton =
    document.getElementById(
        "searchButton"
    );

const searchSection =
    document.getElementById(
        "searchSection"
    );

const searchStatus =
    document.getElementById(
        "searchStatus"
    );

const discoverPage =
    document.getElementById(
        "discoverPage"
    );

const favoritesPage =
    document.getElementById(
        "favoritesPage"
    );

const errorSection =
    document.getElementById(
        "errorSection"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const gameModal =
    document.getElementById(
        "gameModal"
    );


/* =========================================================
   SAFE STRING
   ========================================================= */

function safeString(
    value,
    fallback = ""
) {
    try {
        return String(
            value ?? fallback
        ).replace(
            /[\uD800-\uDFFF]/g,
            ""
        );
    } catch {
        return fallback;
    }
}


/* =========================================================
   API
   ========================================================= */

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
            "The backend returned an empty response."
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
            `Backend HTTP ${response.status}`
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


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function formatNumber(
    value
) {

    const number =
        Number(value) || 0;

    if (
        number >= 1000000000
    ) {

        return (
            number /
            1000000000
        ).toFixed(1) + "B";
    }

    if (
        number >= 1000000
    ) {

        return (
            number /
            1000000
        ).toFixed(1) + "M";
    }

    if (
        number >= 1000
    ) {

        return (
            number /
            1000
        ).toFixed(1) + "K";
    }

    return number.toLocaleString();
}


/* =========================================================
   PLACEHOLDER
   =========================================================

   FIXES:

   URIError: URI malformed

*/

function createPlaceholder(
    name
) {

    let text =
        safeString(
            name,
            "Roblox"
        );

    text =
        text
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .substring(
                0,
                30
            );

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="768"
            height="432"
            viewBox="0 0 768 432"
        >
            <rect
                width="768"
                height="432"
                fill="#202024"
            />

            <text
                x="384"
                y="216"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="#ffffff"
                font-size="32"
                font-family="Arial, sans-serif"
            >
                ${text}
            </text>
        </svg>
    `;

    try {

        return (
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(svg)
        );

    } catch {

        return "";
    }
}


/* =========================================================
   FAVORITES
   ========================================================= */

function getFavorites() {

    try {

        const data =
            localStorage.getItem(
                "webbloxFavorites"
            );

        if (!data) {
            return [];
        }

        const parsed =
            JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch {

        return [];
    }
}


function saveFavorites(
    favorites
) {

    try {

        localStorage.setItem(
            "webbloxFavorites",
            JSON.stringify(
                favorites
            )
        );

    } catch {}
}


function isFavorite(
    game
) {

    const favorites =
        getFavorites();

    return favorites.some(
        item =>
            Number(
                item.universeId
            ) ===
            Number(
                game.universeId
            )
    );
}


function toggleFavorite(
    game,
    event
) {

    event.stopPropagation();

    const favorites =
        getFavorites();

    const id =
        Number(
            game.universeId
        );

    const index =
        favorites.findIndex(
            item =>
                Number(
                    item.universeId
                ) === id
        );

    if (index >= 0) {

        favorites.splice(
            index,
            1
        );

    } else {

        favorites.push(
            game
        );
    }

    saveFavorites(
        favorites
    );

    event.currentTarget.classList.toggle(
        "favorite-active",
        isFavorite(game)
    );

    event.currentTarget.textContent =
        isFavorite(game)
            ? "★"
            : "☆";
}


/* =========================================================
   GAME CARD
   ========================================================= */

function createGameCard(
    game
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "game-card";

    /* IMAGE */

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
        safeString(
            game.name,
            "Roblox Experience"
        );

    image.loading =
        "lazy";

    image.decoding =
        "async";

    const thumbnail =
        safeString(
            game.thumbnail ||
            game.thumbnailUrl ||
            game.image ||
            game.icon ||
            ""
        );

    image.src =
        thumbnail ||
        createPlaceholder(
            game.name
        );

    image.onerror =
        function () {

            if (
                this.dataset.failed ===
                "true"
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

    imageWrap.appendChild(
        image
    );


    /* FAVORITE */

    const favorite =
        document.createElement(
            "button"
        );

    favorite.type =
        "button";

    favorite.className =
        "favorite-button";

    favorite.textContent =
        isFavorite(game)
            ? "★"
            : "☆";

    if (
        isFavorite(game)
    ) {

        favorite.classList.add(
            "favorite-active"
        );
    }

    favorite.title =
        "Favorite";

    favorite.addEventListener(
        "click",
        event =>
            toggleFavorite(
                game,
                event
            )
    );

    imageWrap.appendChild(
        favorite
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
        safeString(
            game.name,
            "Roblox Experience"
        );


    /* CREATOR */

    const creator =
        document.createElement(
            "p"
        );

    creator.className =
        "game-creator";

    const creatorName =
        safeString(
            game.creator,
            "Unknown Creator"
        );

    creator.textContent =
        "By " +
        creatorName;


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

    players.innerHTML =
        "♟ " +
        formatNumber(
            game.playing
        ) +
        " playing";

    const visits =
        document.createElement(
            "span"
        );

    visits.innerHTML =
        "◉ " +
        formatNumber(
            game.visits
        );


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
        () =>
            openGame(game)
    );


    return card;
}


/* =========================================================
   RENDER
   ========================================================= */

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

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "empty-card";

        empty.textContent =
            emptyMessage ||
            "No Roblox experiences found.";

        container.appendChild(
            empty
        );

        return;
    }

    games.forEach(
        game => {

            if (!game) {
                return;
            }

            container.appendChild(
                createGameCard(
                    game
                )
            );
        }
    );
}


/* =========================================================
   LOAD HOME
   ========================================================= */

async function loadHome() {

    hideError();

    showLoading(
        popularGames,
        "Loading popular Roblox games..."
    );

    showLoading(
        trendingGames,
        "Loading trending Roblox games..."
    );

    showLoading(
        recommendedGames,
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

        const popular =
            Array.isArray(
                data.popular
            )
                ? data.popular
                : [];

        const trending =
            Array.isArray(
                data.trending
            )
                ? data.trending
                : [];

        const recommended =
            Array.isArray(
                data.recommended
            )
                ? data.recommended
                : [];


        renderGames(
            popularGames,
            popular,
            "No popular Roblox experiences were returned."
        );

        renderGames(
            trendingGames,
            trending,
            "No trending Roblox experiences were returned."
        );

        renderGames(
            recommendedGames,
            recommended,
            "No Roblox experiences were returned."
        );


        if (
            !popular.length &&
            !trending.length
        ) {

            showError(
                "The Roblox API returned no experiences."
            );
        }

    } catch (error) {

        console.error(
            "[WebBlox] Home error:",
            error
        );

        popularGames.innerHTML =
            "";

        trendingGames.innerHTML =
            "";

        recommendedGames.innerHTML =
            "";

        showError(
            error.message
        );
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

async function searchRoblox() {

    const query =
        safeString(
            searchInput.value
        ).trim();

    if (!query) {
        return;
    }

    searchSection.classList.remove(
        "hidden"
    );

    searchGamesContainer.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>
                Searching Roblox...
            </span>
        </div>
    `;

    searchStatus.textContent =
        `Searching Roblox for "${query}"...`;

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
            "Search failed.";

        searchGamesContainer.innerHTML =
            "";

        const errorCard =
            document.createElement(
                "div"
            );

        errorCard.className =
            "empty-card";

        errorCard.textContent =
            error.message;

        searchGamesContainer.appendChild(
            errorCard
        );
    }
}


/* =========================================================
   OPEN GAME
   ========================================================= */

function openGame(
    game
) {

    const title =
        document.getElementById(
            "modalTitle"
        );

    const creator =
        document.getElementById(
            "modalCreator"
        );

    const description =
        document.getElementById(
            "modalDescription"
        );

    const players =
        document.getElementById(
            "modalPlayers"
        );

    const visits =
        document.getElementById(
            "modalVisits"
        );

    const image =
        document.getElementById(
            "modalImage"
        );

    const play =
        document.getElementById(
            "playButton"
        );


    title.textContent =
        safeString(
            game.name,
            "Roblox Experience"
        );


    creator.textContent =
        "By " +
        safeString(
            game.creator,
            "Unknown Creator"
        );


    description.textContent =
        safeString(
            game.description,
            "No description available."
        );


    players.textContent =
        formatNumber(
            game.playing
        );


    visits.textContent =
        formatNumber(
            game.visits
        );


    image.src =
        safeString(
            game.thumbnail
        ) ||
        createPlaceholder(
            game.name
        );


    image.onerror =
        function () {

            this.src =
                createPlaceholder(
                    game.name
                );
        };


    play.onclick =
        function () {

            if (
                game.placeId
            ) {

                window.open(
                    "https://www.roblox.com/games/" +
                    encodeURIComponent(
                        String(
                            game.placeId
                        )
                    ),
                    "_blank",
                    "noopener,noreferrer"
                );

                return;
            }

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
                "This Roblox experience does not have a playable place ID."
            );
        };


    gameModal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   CLOSE
   ========================================================= */

function closeGame() {

    gameModal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showDiscover() {

    discoverPage.classList.remove(
        "hidden"
    );

    favoritesPage.classList.add(
        "hidden"
    );

    document
        .getElementById(
            "discoverButton"
        )
        .classList.add(
            "active"
        );

    document
        .getElementById(
            "favoritesButton"
        )
        .classList.remove(
            "active"
        );
}


function showFavorites() {

    discoverPage.classList.add(
        "hidden"
    );

    favoritesPage.classList.remove(
        "hidden"
    );

    document
        .getElementById(
            "discoverButton"
        )
        .classList.remove(
            "active"
        );

    document
        .getElementById(
            "favoritesButton"
        )
        .classList.add(
            "active"
        );

    renderGames(
        favoritesGames,
        getFavorites(),
        "You haven't favorited any games yet."
    );
}


function goHome() {

    showDiscover();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    return false;
}


/* =========================================================
   SEARCH CLEAR
   ========================================================= */

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


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToSection(
    id
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading(
    container,
    message
) {

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>
                ${safeString(
                    message,
                    "Loading..."
                )}
            </span>
        </div>
    `;
}


/* =========================================================
   ERROR
   ========================================================= */

function showError(
    message
) {

    errorMessage.textContent =
        safeString(
            message,
            "The Roblox game service could not be reached."
        );

    errorSection.classList.remove(
        "hidden"
    );
}


function hideError() {

    errorSection.classList.add(
        "hidden"
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

searchButton.addEventListener(
    "click",
    searchRoblox
);

searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            searchRoblox();
        }
    }
);

document
    .getElementById(
        "clearSearchButton"
    )
    .addEventListener(
        "click",
        clearSearch
    );

document
    .getElementById(
        "modalClose"
    )
    .addEventListener(
        "click",
        closeGame
    );

document
    .getElementById(
        "retryButton"
    )
    .addEventListener(
        "click",
        loadHome
    );

document
    .getElementById(
        "exploreButton"
    )
    .addEventListener(
        "click",
        () =>
            scrollToSection(
                "popularGames"
            )
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeGame();
        }
    }
);


/* =========================================================
   START
   ========================================================= */

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
