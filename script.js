"use strict";

/* ============================================================
   WEBBLOX FRONTEND
   ============================================================ */

const API_BASE =
    "https://webblox-backend.onrender.com";


const API = {

    home:
        API_BASE +
        "/api/home",

    popular:
        API_BASE +
        "/api/popular",

    trending:
        API_BASE +
        "/api/trending",

    search:
        API_BASE +
        "/api/search",

    game:
        API_BASE +
        "/api/game/"

};


/* ============================================================
   ELEMENTS
   ============================================================ */

const recommendedContainer =
    document.getElementById(
        "recommendedGames"
    );

const popularContainer =
    document.getElementById(
        "popularGames"
    );

const searchContainer =
    document.getElementById(
        "searchGames"
    );

const favoritesContainer =
    document.getElementById(
        "favoritesGames"
    );

const searchSection =
    document.getElementById(
        "searchSection"
    );

const favoritesSection =
    document.getElementById(
        "favoritesSection"
    );

const popularSection =
    document.getElementById(
        "popularSection"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const searchButton =
    document.getElementById(
        "searchButton"
    );

const clearButton =
    document.getElementById(
        "clearButton"
    );

const popularButton =
    document.getElementById(
        "popularButton"
    );

const discoverButton =
    document.getElementById(
        "discoverButton"
    );

const favoritesButton =
    document.getElementById(
        "favoritesButton"
    );

const exploreButton =
    document.getElementById(
        "exploreButton"
    );

const searchStatus =
    document.getElementById(
        "searchStatus"
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


/* ============================================================
   API FETCH
   ============================================================ */

async function apiFetch(
    url
) {

    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    Accept:
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


    showLoading(
        recommendedContainer,
        "Loading trending Roblox games..."
    );


    showLoading(
        popularContainer,
        "Loading popular Roblox games..."
    );


    try {

        const data =
            await apiFetch(
                API.home
            );


        const trending =
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
            recommendedContainer,
            trending,
            "No trending Roblox experiences were returned."
        );


        renderGames(
            popularContainer,
            popular,
            "No popular Roblox experiences were returned."
        );


        if (
            !trending.length &&
            !popular.length
        ) {

            showError(
                "Roblox returned no Discover experiences."
            );

        }

    } catch (error) {

        console.error(
            "[WebBlox]",
            error
        );


        recommendedContainer.innerHTML =
            "";

        popularContainer.innerHTML =
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


/* ============================================================
   CARD
   ============================================================ */

function createGameCard(
    game
) {

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


    const image =
        document.createElement(
            "img"
        );

    image.className =
        "game-image";


    image.alt =
        game.name ||
        "Roblox experience";


    image.loading =
        "lazy";


    image.src =
        game.thumbnail ||
        game.icon ||
        createPlaceholder();


    image.onerror =
        function () {

            if (
                this.dataset.failed
            ) {

                imageWrap.classList.add(
                    "image-failed"
                );

                return;

            }


            this.dataset.failed =
                "true";


            this.src =
                game.icon ||
                createPlaceholder();

        };


    imageWrap.appendChild(
        image
    );


    const favoriteButton =
        document.createElement(
            "button"
        );


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
        function(event) {

            event.stopPropagation();

            toggleFavorite(
                game
            );

            this.textContent =
                isFavorite(game)
                    ? "★"
                    : "☆";

        }
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
        game.name ||
        "Roblox Experience";


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
        "👥 " +
        formatNumber(
            game.playing
        ) +
        " playing";


    const visits =
        document.createElement(
            "span"
        );


    visits.textContent =
        "👁 " +
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
        () => {

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

async function searchGames() {

    const query =
        searchInput.value.trim();


    if (!query) {

        clearSearch();

        return;

    }


    searchSection.classList.remove(
        "hidden"
    );


    searchStatus.textContent =
        `Searching Roblox for "${query}"...`;


    showLoading(
        searchContainer,
        "Searching Roblox..."
    );


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
                : [];


        searchStatus.textContent =
            `${games.length} ${
                games.length === 1
                    ? "experience"
                    : "experiences"
            } found`;


        renderGames(
            searchContainer,
            games,
            "No Roblox experiences matched your search."
        );


        searchSection.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });

    } catch (error) {

        searchStatus.textContent =
            "Search failed";


        searchContainer.innerHTML = `
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

function openGame(
    game
) {

    const modal =
        document.getElementById(
            "gameModal"
        );


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
        game.icon ||
        createPlaceholder();


    image.alt =
        game.name ||
        "Roblox experience";


    document.getElementById(
        "playButton"
    ).onclick =
        function () {

            const placeId =
                Number(
                    game.placeId
                );


            if (!placeId) {

                alert(
                    "This experience does not have a valid Roblox place ID."
                );

                return;

            }


            window.open(
                "https://www.roblox.com/games/" +
                encodeURIComponent(
                    placeId
                ),
                "_blank",
                "noopener,noreferrer"
            );

        };


    modal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* ============================================================
   CLOSE
   ============================================================ */

function closeGame() {

    document
        .getElementById(
            "gameModal"
        )
        .classList.add(
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
                "webbloxFavorites"
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
        "webbloxFavorites",
        JSON.stringify(
            favorites
        )
    );

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
    game
) {

    let favorites =
        getFavorites();


    if (
        isFavorite(game)
    ) {

        favorites =
            favorites.filter(
                item =>
                    Number(
                        item.universeId
                    ) !==
                    Number(
                        game.universeId
                    )
            );

    } else {

        favorites.push(
            game
        );

    }


    saveFavorites(
        favorites
    );

}


/* ============================================================
   SHOW FAVORITES
   ============================================================ */

function showFavorites() {

    document
        .querySelectorAll(
            ".game-section"
        )
        .forEach(
            section => {

                section.classList.add(
                    "hidden"
                );

            }
        );


    favoritesSection.classList.remove(
        "hidden"
    );


    const favorites =
        getFavorites();


    renderGames(
        favoritesContainer,
        favorites,
        "You haven't favorited any games yet."
    );


    setActive(
        favoritesButton
    );

}


/* ============================================================
   DISCOVER
   ============================================================ */

function showDiscover() {

    favoritesSection.classList.add(
        "hidden"
    );


    searchSection.classList.add(
        "hidden"
    );


    document
        .querySelectorAll(
            ".game-section"
        )
        .forEach(
            section => {

                if (
                    section !==
                    favoritesSection &&
                    section !==
                    searchSection
                ) {

                    section.classList.remove(
                        "hidden"
                    );

                }

            }
        );


    setActive(
        discoverButton
    );


    window.scrollTo({
        top: 0,
        behavior:
            "smooth"
    });

}


/* ============================================================
   ACTIVE NAV
   ============================================================ */

function setActive(
    button
) {

    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


    button.classList.add(
        "active"
    );

}


/* ============================================================
   CLEAR SEARCH
   ============================================================ */

function clearSearch() {

    searchInput.value =
        "";

    searchStatus.textContent =
        "";

    searchContainer.innerHTML =
        "";

    searchSection.classList.add(
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
   NUMBER FORMAT
   ============================================================ */

function formatNumber(
    value
) {

    const number =
        Number(value) || 0;


    if (
        number >=
        1000000000
    ) {

        return (
            number /
            1000000000
        ).toFixed(1) +
        "B";

    }


    if (
        number >=
        1000000
    ) {

        return (
            number /
            1000000
        ).toFixed(1) +
        "M";

    }


    if (
        number >=
        1000
    ) {

        return (
            number /
            1000
        ).toFixed(1) +
        "K";

    }


    return number.toLocaleString();

}


/* ============================================================
   PLACEHOLDER
   ============================================================ */

function createPlaceholder() {

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
                    fill="#17171b"
                />

                <text
                    x="384"
                    y="216"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#77777e"
                    font-size="28"
                    font-family="Arial"
                >
                    Roblox
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
    searchGames
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            searchGames();

        }

    }
);


clearButton.addEventListener(
    "click",
    clearSearch
);


discoverButton.addEventListener(
    "click",
    showDiscover
);


favoritesButton.addEventListener(
    "click",
    showFavorites
);


popularButton.addEventListener(
    "click",
    () => {

        popularSection.scrollIntoView({
            behavior:
                "smooth"
        });

    }
);


exploreButton.addEventListener(
    "click",
    () => {

        document
            .querySelector(
                ".game-section"
            )
            ?.scrollIntoView({
                behavior:
                    "smooth"
            });

    }
);


retryButton.addEventListener(
    "click",
    loadHome
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
        "modalBackdrop"
    )
    .addEventListener(
        "click",
        closeGame
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeGame();

        }

    }
);


/* ============================================================
   START
   ============================================================ */

console.log(
    "[WebBlox] Starting..."
);

console.log(
    "[WebBlox] Backend:",
    API_BASE
);

loadHome();
