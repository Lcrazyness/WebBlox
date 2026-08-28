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

    search:
        `${API_BASE}/api/search`,

    game:
        `${API_BASE}/api/game/`

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

const errorSection =
    document.getElementById(
        "errorSection"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );


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

    localStorage.setItem(
        FAVORITES_KEY,
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
                item.universeId ||
                item.id
            ) ===
            String(
                game.universeId ||
                game.id
            )
    );

}


function toggleFavorite(game) {

    const favorites =
        getFavorites();

    const id =
        String(
            game.universeId ||
            game.id
        );

    const index =
        favorites.findIndex(
            item =>
                String(
                    item.universeId ||
                    item.id
                ) === id
        );


    if (index >= 0) {

        favorites.splice(
            index,
            1
        );

    } else {

        favorites.push({

            id:
                game.id,

            universeId:
                game.universeId,

            placeId:
                game.placeId,

            name:
                game.name,

            creator:
                game.creator,

            creatorId:
                game.creatorId,

            thumbnail:
                game.thumbnail,

            icon:
                game.icon,

            playing:
                game.playing,

            visits:
                game.visits,

            favorites:
                game.favorites

        });

    }


    saveFavorites(
        favorites
    );

}


/* ============================================================
   API FETCH
   ============================================================ */

async function apiFetch(url) {

    console.log(
        "[WebBlox] GET:",
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

                    cache:
                        "no-store"
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
        text
            .trim()
            .startsWith("<")
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
            `Backend HTTP ${response.status}`
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
   HOME
   ============================================================ */

async function loadHome() {

    hideError();


    showLoading(
        recommendedContainer,
        "Loading Roblox games..."
    );


    showLoading(
        popularContainer,
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
            recommendedContainer,
            recommended,
            "No recommended Roblox experiences were found."
        );


        renderGames(
            popularContainer,
            popular,
            "No popular Roblox experiences were found."
        );


        if (
            !recommended.length &&
            !popular.length
        ) {

            showError(
                "The backend is online, but Roblox did not return any experiences."
            );

        }

    } catch (error) {

        console.error(
            "[WebBlox] Home:",
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
   GAME CARD
   ============================================================ */

function createGameCard(game) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "game-card";


    /* ========================================================
       IMAGE
       ======================================================== */

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


    const thumbnail =
        getBestThumbnail(
            game
        );


    if (thumbnail) {

        image.src =
            thumbnail;

    } else {

        setImageFallback(
            image,
            imageWrap,
            game.name
        );

    }


    image.addEventListener(
        "error",
        () => {

            if (
                image.dataset.failed
            ) {
                return;
            }


            image.dataset.failed =
                "true";


            setImageFallback(
                image,
                imageWrap,
                game.name
            );

        }
    );


    imageWrap.appendChild(
        image
    );


    /* ========================================================
       FAVORITE
       ======================================================== */

    const favorite =
        document.createElement(
            "button"
        );


    favorite.type =
        "button";


    favorite.className =
        "favorite-button";


    favorite.title =
        "Favorite";


    updateFavoriteButton(
        favorite,
        game
    );


    favorite.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            toggleFavorite(
                game
            );


            updateFavoriteButton(
                favorite,
                game
            );

        }
    );


    imageWrap.appendChild(
        favorite
    );


    /* ========================================================
       PLAY BUTTON
       ======================================================== */

    const play =
        document.createElement(
            "button"
        );


    play.type =
        "button";


    play.className =
        "card-play-button";


    play.innerHTML =
        "▶ Play";


    play.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            playGame(
                game
            );

        }
    );


    imageWrap.appendChild(
        play
    );


    /* ========================================================
       BODY
       ======================================================== */

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

    const creatorRow =
        document.createElement(
            "div"
        );


    creatorRow.className =
        "creator-row";


    const creatorAvatar =
        document.createElement(
            "div"
        );


    creatorAvatar.className =
        "creator-avatar";


    creatorAvatar.textContent =
        "R";


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


    creatorRow.appendChild(
        creatorAvatar
    );


    creatorRow.appendChild(
        creator
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
        `
        <span class="stat-icon">●</span>
        ${formatNumber(
            game.playing
        )}
        playing
        `;


    const visits =
        document.createElement(
            "span"
        );


    visits.innerHTML =
        `
        <span class="stat-icon">◉</span>
        ${formatNumber(
            game.visits
        )}
        `;


    stats.appendChild(
        players
    );


    stats.appendChild(
        visits
    );


    /* RATING */

    const rating =
        getRating(
            game
        );


    if (
        rating !== null
    ) {

        const ratingElement =
            document.createElement(
                "span"
            );


        ratingElement.className =
            "game-rating";


        ratingElement.innerHTML =
            `
            <span>★</span>
            ${rating}%
            `;


        stats.appendChild(
            ratingElement
        );

    }


    body.appendChild(
        title
    );


    body.appendChild(
        creatorRow
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
   THUMBNAIL
   ============================================================ */

function getBestThumbnail(game) {

    const candidates = [

        game.thumbnail,

        game.icon

    ];


    for (
        const candidate
        of candidates
    ) {

        if (
            typeof candidate ===
                "string" &&
            candidate.startsWith(
                "http"
            )
        ) {

            return candidate;

        }

    }


    return null;

}


function setImageFallback(
    image,
    wrap,
    name
) {

    image.style.display =
        "none";


    wrap.classList.add(
        "image-failed"
    );


    let fallback =
        wrap.querySelector(
            ".thumbnail-fallback"
        );


    if (!fallback) {

        fallback =
            document.createElement(
                "div"
            );

        fallback.className =
            "thumbnail-fallback";


        fallback.textContent =
            name ||
            "Roblox";


        wrap.appendChild(
            fallback
        );

    }

}


/* ============================================================
   FAVORITE BUTTON
   ============================================================ */

function updateFavoriteButton(
    button,
    game
) {

    const active =
        isFavorite(
            game
        );


    button.classList.toggle(
        "active",
        active
    );


    button.innerHTML =
        active
            ? "★"
            : "☆";

}


/* ============================================================
   RATING
   ============================================================ */

function getRating(game) {

    const likes =
        Number(
            game.likes || 0
        );

    const dislikes =
        Number(
            game.dislikes || 0
        );


    if (
        likes <= 0 &&
        dislikes <= 0
    ) {

        return null;

    }


    const total =
        likes + dislikes;


    if (!total) {
        return null;
    }


    return Math.round(
        (
            likes /
            total
        ) *
        100
    );

}


/* ============================================================
   OPEN GAME
   ============================================================ */

function openGame(game) {

    const modal =
        document.getElementById(
            "gameModal"
        );


    if (!modal) {

        playGame(
            game
        );

        return;

    }


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


    if (title) {

        title.textContent =
            game.name ||
            "Roblox Experience";

    }


    if (creator) {

        creator.textContent =
            "By " +
            (
                game.creator ||
                "Unknown Creator"
            );

    }


    if (description) {

        description.textContent =
            game.description ||
            "No description available.";

    }


    if (players) {

        players.textContent =
            formatNumber(
                game.playing
            );

    }


    if (visits) {

        visits.textContent =
            formatNumber(
                game.visits
            );

    }


    if (image) {

        const thumbnail =
            getBestThumbnail(
                game
            );


        image.src =
            thumbnail ||
            createPlaceholder(
                game.name
            );


        image.alt =
            game.name ||
            "Roblox experience";

    }


    const playButton =
        document.getElementById(
            "playButton"
        );


    if (playButton) {

        playButton.onclick =
            () => {

                playGame(
                    game
                );

            };

    }


    modal.classList.remove(
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

    const placeId =
        Number(
            game.placeId || 0
        );


    if (!placeId) {

        alert(
            "This Roblox experience does not have a valid place ID."
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
   CLOSE GAME
   ============================================================ */

function closeGame() {

    const modal =
        document.getElementById(
            "gameModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );


    document.body.classList.remove(
        "modal-open"
    );

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


    searchContainer.innerHTML =
        `
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
            searchContainer,
            games,
            "No Roblox experiences matched your search."
        );


        searchSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(
            "[WebBlox] Search:",
            error
        );


        searchStatus.textContent =
            "Search failed";


        searchContainer.innerHTML =
            `
            <div class="empty-card">
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


    searchContainer.innerHTML =
        "";


    searchStatus.textContent =
        "";

}


/* ============================================================
   ERROR
   ============================================================ */

function showError(message) {

    if (!errorSection) {
        return;
    }


    errorMessage.textContent =
        message ||
        "The Roblox game service could not be reached.";


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


    container.innerHTML =
        `
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
            number /
            1000000000
        )
            .toFixed(1)
            .replace(
                ".0",
                ""
            ) +
            "B";

    }


    if (
        number >= 1000000
    ) {

        return (
            number /
            1000000
        )
            .toFixed(1)
            .replace(
                ".0",
                ""
            ) +
            "M";

    }


    if (
        number >= 1000
    ) {

        return (
            number /
            1000
        )
            .toFixed(1)
            .replace(
                ".0",
                ""
            ) +
            "K";

    }


    return number.toLocaleString();

}


/* ============================================================
   PLACEHOLDER
   ============================================================ */

function createPlaceholder(name) {

    const safeName =
        String(
            name ||
            "Roblox"
        )
            .substring(
                0,
                24
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
                    fill="#151519"
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
                    ${safeName}
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
        document.getElementById(
            "popularSection"
        );


    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });

    }

}


/* ============================================================
   EVENTS
   ============================================================ */

if (searchButton) {

    searchButton.addEventListener(
        "click",
        searchGames
    );

}


if (searchInput) {

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

}


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
    "===================================="
);

console.log(
    "[WebBlox] Starting..."
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
    "[WebBlox] Phase 1 enabled:"
);

console.log(
    "Favorites / Cards / Creator / Stats"
);

console.log(
    "===================================="
);


loadHome();
