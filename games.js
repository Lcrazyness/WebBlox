"use strict";

/* ============================================================
   WEBBLOX GAMES
   ============================================================

   This file controls the NEW WebBlox Games system.

   Roblox experiences:
       script.js

   WebBlox-created games:
       games.js

   Backend:
       https://webblox-backend.onrender.com

   ============================================================ */


/* ============================================================
   CONFIG
   ============================================================ */

const WEBBLOX_GAMES_API =
    "https://webblox-backend.onrender.com";


/* ============================================================
   API ROUTES
   ============================================================ */

const WEBBLOX_GAMES_API_ROUTES = {

    stats:
        WEBBLOX_GAMES_API +
        "/api/webblox/stats",

    games:
        WEBBLOX_GAMES_API +
        "/api/webblox/games",

    popular:
        WEBBLOX_GAMES_API +
        "/api/webblox/games/popular",

    search:
        WEBBLOX_GAMES_API +
        "/api/webblox/games/search"

};


/* ============================================================
   STATE
   ============================================================ */

const WebBloxGames = {

    games: [],

    popular: [],

    searchResults: [],

    stats: {

        games: 0,

        publicGames: 0

    },

    initialized: false

};


/* ============================================================
   DEBUG
   ============================================================ */

function webBloxGamesLog(...args) {

    console.log(
        "[WebBlox Games]",
        ...args
    );

}


/* ============================================================
   API REQUEST
   ============================================================ */

async function webBloxGamesFetch(url) {

    webBloxGamesLog(
        "Request:",
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

    } catch (error) {

        throw new Error(
            "Could not connect to the WebBlox Games server."
        );

    }


    const text =
        await response.text();


    if (!text) {

        throw new Error(
            "WebBlox Games server returned an empty response."
        );

    }


    let data;

    try {

        data =
            JSON.parse(text);

    } catch (error) {

        throw new Error(
            "WebBlox Games server returned invalid JSON."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            "WebBlox Games server returned HTTP " +
            response.status
        );

    }


    if (
        data.success === false
    ) {

        throw new Error(
            data.error ||
            "WebBlox Games request failed."
        );

    }


    webBloxGamesLog(
        "Response:",
        data
    );


    return data;

}


/* ============================================================
   LOAD STATS
   ============================================================ */

async function loadWebBloxGameStats() {

    try {

        const data =
            await webBloxGamesFetch(
                WEBBLOX_GAMES_API_ROUTES.stats
            );


        WebBloxGames.stats = {

            games:
                Number(
                    data.games
                ) || 0,

            publicGames:
                Number(
                    data.publicGames
                ) || 0

        };


        webBloxGamesLog(
            "Stats loaded:",
            WebBloxGames.stats
        );


        return WebBloxGames.stats;

    } catch (error) {

        console.error(
            "[WebBlox Games] Stats error:",
            error
        );


        return null;

    }

}


/* ============================================================
   LOAD ALL WEBBLOX GAMES
   ============================================================ */

async function loadWebBloxGames() {

    try {

        const data =
            await webBloxGamesFetch(
                WEBBLOX_GAMES_API_ROUTES.games
            );


        const games =
            Array.isArray(
                data.games
            )
                ? data.games
                : [];


        WebBloxGames.games =
            games;


        webBloxGamesLog(
            "Games loaded:",
            games.length
        );


        return games;

    } catch (error) {

        console.error(
            "[WebBlox Games] Games error:",
            error
        );


        WebBloxGames.games =
            [];


        return [];

    }

}


/* ============================================================
   LOAD POPULAR WEBBLOX GAMES
   ============================================================ */

async function loadPopularWebBloxGames() {

    try {

        const data =
            await webBloxGamesFetch(
                WEBBLOX_GAMES_API_ROUTES.popular
            );


        const games =
            Array.isArray(
                data.games
            )
                ? data.games
                : [];


        WebBloxGames.popular =
            games;


        webBloxGamesLog(
            "Popular games loaded:",
            games.length
        );


        return games;

    } catch (error) {

        console.error(
            "[WebBlox Games] Popular games error:",
            error
        );


        WebBloxGames.popular =
            [];


        return [];

    }

}


/* ============================================================
   SEARCH WEBBLOX GAMES
   ============================================================ */

async function searchWebBloxGames(query) {

    query =
        String(
            query || ""
        ).trim();


    if (!query) {

        WebBloxGames.searchResults =
            [];

        return [];

    }


    try {

        const url =
            WEBBLOX_GAMES_API_ROUTES.search +
            "?q=" +
            encodeURIComponent(
                query
            );


        const data =
            await webBloxGamesFetch(
                url
            );


        const games =
            Array.isArray(
                data.games
            )
                ? data.games
                : [];


        WebBloxGames.searchResults =
            games;


        webBloxGamesLog(
            "Search results:",
            games.length
        );


        return games;

    } catch (error) {

        console.error(
            "[WebBlox Games] Search error:",
            error
        );


        WebBloxGames.searchResults =
            [];


        return [];

    }

}


/* ============================================================
   NORMALIZE GAME
   ============================================================

   This makes sure every WebBlox Game has a predictable
   structure.

   Eventually this will support:

   - creator
   - creatorId
   - thumbnail
   - game ID
   - player count
   - visits
   - description
   - version
   - multiplayer
   ============================================================ */

function normalizeWebBloxGame(game) {

    if (!game) {

        return null;

    }


    return {

        id:
            game.id ||
            game.gameId ||
            game._id ||
            "",

        name:
            game.name ||
            "Untitled WebBlox Game",

        description:
            game.description ||
            "No description available.",

        creator:
            game.creator ||
            game.creatorName ||
            "Unknown Creator",

        creatorId:
            game.creatorId ||
            "",

        thumbnail:
            game.thumbnail ||
            game.image ||
            game.icon ||
            "",

        players:
            Number(
                game.players ||
                game.playing ||
                0
            ),

        visits:
            Number(
                game.visits ||
                0
            ),

        likes:
            Number(
                game.likes ||
                0
            ),

        createdAt:
            game.createdAt ||
            "",

        updatedAt:
            game.updatedAt ||
            "",

        version:
            game.version ||
            "1.0",

        public:
            game.public !== false,

        multiplayer:
            game.multiplayer === true,

        raw:
            game

    };

}


/* ============================================================
   GET NORMALIZED GAMES
   ============================================================ */

function getWebBloxGames() {

    return WebBloxGames.games
        .map(
            normalizeWebBloxGame
        )
        .filter(
            Boolean
        );

}


/* ============================================================
   GET POPULAR NORMALIZED GAMES
   ============================================================ */

function getPopularWebBloxGames() {

    return WebBloxGames.popular
        .map(
            normalizeWebBloxGame
        )
        .filter(
            Boolean
        );

}


/* ============================================================
   FIND GAME
   ============================================================ */

function findWebBloxGame(id) {

    const gameId =
        String(
            id || ""
        );


    return getWebBloxGames()
        .find(
            game =>
                String(
                    game.id
                ) === gameId
        ) || null;

}


/* ============================================================
   GAME URL
   ============================================================ */

function getWebBloxGameUrl(game) {

    if (!game) {

        return "#";

    }


    const id =
        game.id ||
        game.gameId;


    if (!id) {

        return "#";

    }


    return (
        "game.html?id=" +
        encodeURIComponent(
            id
        )
    );

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeWebBloxGameHTML(value) {

    return String(
        value ?? ""
    )
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
   FORMAT NUMBERS
   ============================================================ */

function formatWebBloxGameNumber(number) {

    number =
        Number(
            number
        ) || 0;


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


/* ============================================================
   CREATE GAME CARD
   ============================================================ */

function createWebBloxGameCard(game) {

    game =
        normalizeWebBloxGame(
            game
        );


    if (!game) {

        return null;

    }


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "game-card webblox-game-card";


    card.dataset.gameId =
        game.id;


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


    if (game.thumbnail) {

        image.src =
            game.thumbnail;

    }


    image.onerror =
        function() {

            this.style.display =
                "none";

        };


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
        formatWebBloxGameNumber(
            game.players
        ) +
        " playing";


    const visits =
        document.createElement(
            "span"
        );


    visits.textContent =
        formatWebBloxGameNumber(
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
        image
    );


    card.appendChild(
        body
    );


    /* CLICK */

    card.addEventListener(
        "click",
        function() {

            openWebBloxGame(
                game
            );

        }
    );


    return card;

}


/* ============================================================
   OPEN WEBBLOX GAME
   ============================================================ */

function openWebBloxGame(game) {

    game =
        normalizeWebBloxGame(
            game
        );


    if (!game) {

        return;

    }


    webBloxGamesLog(
        "Opening game:",
        game
    );


    /*
       For now, use the future game page.

       We will build game.html later.
    */

    const url =
        getWebBloxGameUrl(
            game
        );


    if (
        url !== "#"
    ) {

        window.location.href =
            url;

    }

}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializeWebBloxGames() {

    if (
        WebBloxGames.initialized
    ) {

        return;

    }


    WebBloxGames.initialized =
        true;


    webBloxGamesLog(
        "Initializing..."
    );


    /*
       Stats are loaded independently.

       This lets the frontend continue working
       even if there aren't any published games yet.
    */

    await loadWebBloxGameStats();


    await loadWebBloxGames();


    /*
       Popular is separate because eventually
       it will be calculated by the backend.
    */

    await loadPopularWebBloxGames();


    webBloxGamesLog(
        "Initialization complete."
    );


    webBloxGamesLog(
        "Total games:",
        WebBloxGames.stats.games
    );


    webBloxGamesLog(
        "Public games:",
        WebBloxGames.stats.publicGames
    );

}


/* ============================================================
   PUBLIC API
   ============================================================

   Other frontend files can use:

       WebBloxGames.games
       WebBloxGames.popular
       WebBloxGames.stats

   and:

       loadWebBloxGames()
       searchWebBloxGames()
       findWebBloxGame()
       openWebBloxGame()

   ============================================================ */

window.WebBloxGames =
    WebBloxGames;

window.loadWebBloxGames =
    loadWebBloxGames;

window.loadPopularWebBloxGames =
    loadPopularWebBloxGames;

window.searchWebBloxGames =
    searchWebBloxGames;

window.findWebBloxGame =
    findWebBloxGame;

window.openWebBloxGame =
    openWebBloxGame;

window.createWebBloxGameCard =
    createWebBloxGameCard;


/* ============================================================
   START
   ============================================================ */

initializeWebBloxGames();
