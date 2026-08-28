"use strict";

/*
==================================================
 WEBBLOX FRONTEND
==================================================

This frontend is designed for:

https://lcrazyness.github.io/WebBlox/

GitHub Pages cannot run server.js.

The backend URL goes here once the backend
is deployed.

Example:

const BACKEND_URL = "https://webblox-api.example.com";

For now it is empty so we can clearly show
that the backend has not been connected yet.

==================================================
*/

const BACKEND_URL = "";


/*
==================================================
 API
==================================================
*/

const API = {

    home: "/api/home",

    popular: "/api/popular",

    search: "/api/search",

    game: "/api/game/"

};


/*
==================================================
 ELEMENTS
==================================================
*/

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

const clearSearchButton =
    document.getElementById(
        "clearSearchButton"
    );

const exploreButton =
    document.getElementById(
        "exploreButton"
    );

const popularButton =
    document.getElementById(
        "popularButton"
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

const gameModal =
    document.getElementById(
        "gameModal"
    );

const modalBackdrop =
    document.getElementById(
        "modalBackdrop"
    );

const modalClose =
    document.getElementById(
        "modalClose"
    );

const modalImage =
    document.getElementById(
        "modalImage"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const modalCreator =
    document.getElementById(
        "modalCreator"
    );

const modalDescription =
    document.getElementById(
        "modalDescription"
    );

const modalPlayers =
    document.getElementById(
        "modalPlayers"
    );

const modalVisits =
    document.getElementById(
        "modalVisits"
    );

const playButton =
    document.getElementById(
        "playButton"
    );


/*
==================================================
 API FETCH
==================================================
*/

async function apiFetch(
    endpoint,
    options = {}
) {

    if (!BACKEND_URL) {

        throw new Error(
            "The WebBlox backend is not connected yet."
        );

    }


    const base =
        BACKEND_URL.replace(
            /\/$/,
            ""
        );


    const response =
        await fetch(
            base + endpoint,
            {
                method:
                    options.method || "GET",

                headers: {
                    "Accept":
                        "application/json",

                    ...(options.headers || {})
                },

                cache: "no-store"
            }
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(text);

    } catch {

        throw new Error(
            "The backend returned something other than JSON."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            `Backend returned HTTP ${response.status}.`
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


/*
==================================================
 LOAD HOME
==================================================
*/

async function loadHome() {

    hideError();


    showLoading(
        recommendedContainer,
        "Loading Roblox games..."
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
            recommended
        );


        renderGames(
            popularContainer,
            popular
        );


        if (
            recommended.length === 0 &&
            popular.length === 0
        ) {

            throw new Error(
                "Roblox returned no games."
            );

        }

    } catch (error) {

        console.error(
            "[WebBlox] Home error:",
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


/*
==================================================
 LOAD POPULAR
==================================================
*/

async function loadPopular() {

    showLoading(
        popularContainer,
        "Loading popular Roblox games..."
    );


    try {

        const data =
            await apiFetch(
                API.popular
            );


        renderGames(
            popularContainer,
            data.games || []
        );

    } catch (error) {

        console.error(
            "[WebBlox] Popular error:",
            error
        );


        showError(
            error.message
        );

    }

}


/*
==================================================
 SEARCH
==================================================
*/

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
            `${games.length} game${
                games.length === 1
                    ? ""
                    : "s"
            } found`;


        renderGames(
            searchContainer,
            games
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


        searchContainer.innerHTML =
            "";


        const errorCard =
            document.createElement(
                "div"
            );


        errorCard.className =
            "empty-card";


        errorCard.textContent =
            error.message;


        searchContainer.appendChild(
            errorCard
        );

    }

}


/*
==================================================
 RENDER GAMES
==================================================
*/

function renderGames(
    container,
    games
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
            "No Roblox games found.";


        container.appendChild(
            empty
        );


        return;

    }


    games.forEach(
        game => {

            const card =
                createGameCard(
                    game
                );


            container.appendChild(
                card
            );

        }
    );

}


/*
==================================================
 CREATE GAME CARD
==================================================
*/

function createGameCard(
    game
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "game-card";


    const image =
        document.createElement(
            "img"
        );


    image.className =
        "game-thumbnail";


    image.alt =
        game.name ||
        "Roblox game";


    image.loading =
        "lazy";


    image.src =
        game.thumbnail ||
        game.icon ||
        createPlaceholder(
            game.name
        );


    image.onerror =
        function() {

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


    title.textContent =
        game.name ||
        "Unknown Roblox Game";


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
        "● " +
        formatNumber(
            game.playing || 0
        ) +
        " playing";


    const visits =
        document.createElement(
            "span"
        );


    visits.textContent =
        formatNumber(
            game.visits || 0
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


/*
==================================================
 OPEN GAME
==================================================
*/

function openGame(
    game
) {

    modalTitle.textContent =
        game.name ||
        "Roblox Game";


    modalCreator.textContent =
        "By " +
        (
            game.creator ||
            "Unknown Creator"
        );


    modalDescription.textContent =
        game.description ||
        "No description available.";


    modalPlayers.textContent =
        formatNumber(
            game.playing || 0
        );


    modalVisits.textContent =
        formatNumber(
            game.visits || 0
        );


    modalImage.src =
        game.thumbnail ||
        game.icon ||
        createPlaceholder(
            game.name
        );


    modalImage.alt =
        game.name ||
        "Roblox game";


    playButton.onclick =
        function() {

            /*
                Prefer the place ID because that is
                the actual experience launch page.
            */

            if (
                game.placeId
            ) {

                window.open(
                    "https://www.roblox.com/games/" +
                    encodeURIComponent(
                        game.placeId
                    ),
                    "_blank",
                    "noopener,noreferrer"
                );


                return;

            }


            /*
                Fallback to the Roblox experience
                page using the universe ID.
            */

            if (
                game.universeId
            ) {

                window.open(
                    "https://www.roblox.com/games/" +
                    encodeURIComponent(
                        game.universeId
                    ),
                    "_blank",
                    "noopener,noreferrer"
                );


                return;

            }


            alert(
                "This Roblox experience does not have a valid place ID."
            );

        };


    gameModal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/*
==================================================
 CLOSE GAME
==================================================
*/

function closeGame() {

    gameModal.classList.add(
        "hidden"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


/*
==================================================
 CLEAR SEARCH
==================================================
*/

function clearSearch() {

    searchInput.value =
        "";


    searchStatus.textContent =
        "";


    searchSection.classList.add(
        "hidden"
    );


    searchContainer.innerHTML =
        "";

}


/*
==================================================
 ERROR
==================================================
*/

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


/*
==================================================
 LOADING
==================================================
*/

function showLoading(
    container,
    message
) {

    container.innerHTML =
        "";


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "loading-card";


    const spinner =
        document.createElement(
            "div"
        );


    spinner.className =
        "spinner";


    const text =
        document.createElement(
            "span"
        );


    text.textContent =
        message ||
        "Loading...";


    card.appendChild(
        spinner
    );


    card.appendChild(
        text
    );


    container.appendChild(
        card
    );

}


/*
==================================================
 NUMBER FORMAT
==================================================
*/

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


/*
==================================================
 PLACEHOLDER
==================================================
*/

function createPlaceholder(
    name
) {

    const text =
        String(
            name ||
            "Roblox Game"
        )
        .substring(
            0,
            25
        );


    const svg =
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
                fill="#17191f"
            />

            <text
                x="384"
                y="216"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="#ffffff"
                font-size="32"
                font-family="Arial"
            >
                ${escapeHTML(text)}
            </text>

        </svg>
        `;


    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );

}


/*
==================================================
 ESCAPE HTML
==================================================
*/

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


/*
==================================================
 SCROLL
==================================================
*/

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


/*
==================================================
 EVENTS
==================================================
*/

searchButton.addEventListener(
    "click",
    searchGames
);


searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter"
        ) {

            searchGames();

        }

    }
);


clearSearchButton.addEventListener(
    "click",
    clearSearch
);


exploreButton.addEventListener(
    "click",
    scrollToGames
);


popularButton.addEventListener(
    "click",
    scrollToPopular
);


retryButton.addEventListener(
    "click",
    loadHome
);


modalClose.addEventListener(
    "click",
    closeGame
);


modalBackdrop.addEventListener(
    "click",
    closeGame
);


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


/*
==================================================
 START
==================================================
*/

console.log(
    "[WebBlox] Frontend loaded."
);


console.log(
    "[WebBlox] Backend:",
    BACKEND_URL || "NOT CONNECTED"
);


loadHome();
