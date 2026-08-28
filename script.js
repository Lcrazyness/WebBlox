"use strict";


/* ============================================================
   WEBBLOX
   ============================================================ */

const API_BASE =
    "https://webblox-backend.onrender.com";


const API = {

    home:
        `${API_BASE}/api/home`,

    popular:
        `${API_BASE}/api/popular`,

    trending:
        `${API_BASE}/api/trending`,

    search:
        `${API_BASE}/api/search`,

    game:
        `${API_BASE}/api/game/`

};


/* ============================================================
   ELEMENTS
   ============================================================ */

const popularGames =
    document.getElementById(
        "popularGames"
    );

const trendingGames =
    document.getElementById(
        "trendingGames"
    );

const searchGamesContainer =
    document.getElementById(
        "searchGames"
    );

const searchSection =
    document.getElementById(
        "searchSection"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const searchButton =
    document.getElementById(
        "searchButton"
    );

const searchStatus =
    document.getElementById(
        "searchStatus"
    );

const clearSearchButton =
    document.getElementById(
        "clearSearch"
    );

const errorSection =
    document.getElementById(
        "errorSection"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const retryButton =
    document.getElementById(
        "retryButton"
    );

const modal =
    document.getElementById(
        "gameModal"
    );


/* ============================================================
   API
   ============================================================ */

async function apiFetch(url) {

    console.log(
        "[WebBlox] Request:",
        url
    );

    const response =
        await fetch(
            url,
            {
                method: "GET",
                headers: {
                    "Accept":
                        "application/json"
                },
                cache:
                    "no-store"
            }
        );


    const text =
        await response.text();


    if (!text) {

        throw new Error(
            "The WebBlox backend returned an empty response."
        );

    }


    let data;

    try {

        data =
            JSON.parse(text);

    } catch {

        throw new Error(
            "The WebBlox backend returned invalid JSON."
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
            "Roblox returned an error."
        );

    }


    return data;
}


/* ============================================================
   HOME
   ============================================================ */

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


    try {

        console.log(
            "[WebBlox] Loading REAL Roblox Charts..."
        );


        const data =
            await apiFetch(
                API.home
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


        console.log(
            "[WebBlox] Popular:",
            popular
        );


        console.log(
            "[WebBlox] Trending:",
            trending
        );


        renderGames(
            popularGames,
            popular,
            "Roblox did not return any popular games."
        );


        renderGames(
            trendingGames,
            trending,
            "Roblox did not return any trending games."
        );


        if (
            popular.length === 0 &&
            trending.length === 0
        ) {

            showError(
                "Roblox Charts returned no experiences."
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
                    emptyMessage
                )}
            </div>
        `;

        return;
    }


    for (
        const game
        of games
    ) {

        if (!game) {
            continue;
        }


        container.appendChild(
            createGameCard(game)
        );

    }

}


/* ============================================================
   GAME CARD
   ============================================================ */

function createGameCard(game) {

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
        game.name ||
        "Roblox experience";


    image.loading =
        "lazy";


    if (
        game.thumbnail
    ) {

        image.src =
            game.thumbnail;

    } else {

        image.src =
            createPlaceholder(
                game.name
            );

    }


    image.onerror =
        function () {

            if (
                this.dataset.failed
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


    favorite.className =
        "favorite-button";


    favorite.type =
        "button";


    favorite.textContent =
        isFavorite(game)
            ? "★"
            : "☆";


    favorite.title =
        "Favorite";


    favorite.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            toggleFavorite(
                game,
                favorite
            );

        }
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
        game.name ||
        "Roblox Experience";


    /* CREATOR */

    const creator =
        document.createElement(
            "p"
        );


    creator.className =
        "game-creator";


    creator.textContent =
        "By " +
        (
            game.creator ||
            "Unknown Creator"
        );


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
        function() {

            openGame(
                game
            );

        }
    );


    return card;
}


/* ============================================================
   SEARCH
   ============================================================ */

async function searchRoblox() {

    const query =
        searchInput.value.trim();


    if (!query) {

        clearSearch();

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
            `${games.length} ${
                games.length === 1
                    ? "experience"
                    : "experiences"
            } found`;


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
            <div class="empty-card">
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;

    }

}


/* ============================================================
   GAME MODAL
   ============================================================ */

function openGame(game) {

    document.getElementById(
        "modalTitle"
    ).textContent =
        game.name ||
        "Roblox Experience";


    document.getElementById(
        "modalCreator"
    ).textContent =
        "By " +
        (
            game.creator ||
            "Unknown Creator"
        );


    document.getElementById(
        "modalDescription"
    ).textContent =
        game.description ||
        "No description available.";


    document.getElementById(
        "modalPlayers"
    ).textContent =
        formatNumber(
            game.playing
        );


    document.getElementById(
        "modalVisits"
    ).textContent =
        formatNumber(
            game.visits
        );


    const image =
        document.getElementById(
            "modalImage"
        );


    image.src =
        game.thumbnail ||
        createPlaceholder(
            game.name
        );


    image.alt =
        game.name ||
        "Roblox experience";


    const playButton =
        document.getElementById(
            "playButton"
        );


    playButton.onclick =
        function() {

            if (
                game.placeId
            ) {

                window.open(
                    `https://www.roblox.com/games/${encodeURIComponent(game.placeId)}`,
                    "_blank",
                    "noopener,noreferrer"
                );

            } else {

                alert(
                    "Roblox did not provide a playable place ID for this experience."
                );

            }

        };


    modal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* ============================================================
   CLOSE MODAL
   ============================================================ */

function closeGame() {

    modal.classList.add(
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
                "webblox-favorites"
            ) || "[]"
        );

    } catch {

        return [];

    }

}


function saveFavorites(
    favorites
) {

    localStorage.setItem(
        "webblox-favorites",
        JSON.stringify(
            favorites
        )
    );

}


function isFavorite(game) {

    const favorites =
        getFavorites();


    return favorites.some(
        item =>
            String(
                item.universeId
            ) ===
            String(
                game.universeId
            )
    );

}


function toggleFavorite(
    game,
    button
) {

    let favorites =
        getFavorites();


    const id =
        String(
            game.universeId
        );


    const exists =
        favorites.some(
            item =>
                String(
                    item.universeId
                ) === id
        );


    if (exists) {

        favorites =
            favorites.filter(
                item =>
                    String(
                        item.universeId
                    ) !== id
            );

        button.textContent =
            "☆";

    } else {

        favorites.push({
            universeId:
                game.universeId,

            name:
                game.name,

            creator:
                game.creator,

            thumbnail:
                game.thumbnail,

            placeId:
                game.placeId
        });

        button.textContent =
            "★";

    }


    saveFavorites(
        favorites
    );

}


/* ============================================================
   SEARCH CLEAR
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
                    message
                )}
            </span>
        </div>
    `;

}


/* ============================================================
   ERROR
   ============================================================ */

function showError(
    message
) {

    errorMessage.textContent =
        message ||
        "The Roblox Charts service could not be reached.";


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
   NUMBERS
   ============================================================ */

function formatNumber(
    value
) {

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

function createPlaceholder(
    name
) {

    const text =
        String(
            name ||
            "Roblox"
        ).slice(
            0,
            24
        );


    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="768"
                height="432"
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
                    fill="#888"
                    font-size="28"
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

function escapeHTML(
    value
) {

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

            searchRoblox();

        }

    }
);


clearSearchButton.addEventListener(
    "click",
    clearSearch
);


retryButton.addEventListener(
    "click",
    loadHome
);


document.getElementById(
    "modalClose"
).addEventListener(
    "click",
    closeGame
);


document.getElementById(
    "modalBackdrop"
).addEventListener(
    "click",
    closeGame
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


/* ============================================================
   START
   ============================================================ */

console.log(
    "===================================="
);

console.log(
    "[WebBlox] Starting..."
);

console.log(
    "[WebBlox] Backend:",
    API_BASE
);

console.log(
    "[WebBlox] Popular source:",
    "top-playing-now"
);

console.log(
    "[WebBlox] Trending source:",
    "top-trending"
);

console.log(
    "===================================="
);


loadHome();
