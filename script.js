"use strict";

/*
========================================
 WebBlox Frontend
========================================

This file runs on:

https://lcrazyness.github.io/WebBlox/

It talks to the separate WebBlox backend.

IMPORTANT:
Replace BACKEND_URL with the URL Render
gives you after we deploy the backend.
*/

const BACKEND_URL = "PASTE_BACKEND_URL_HERE";


/* ======================================
   API
====================================== */

const API = {
    home: `${BACKEND_URL}/api/home`,
    popular: `${BACKEND_URL}/api/popular`,
    search: `${BACKEND_URL}/api/search`,
    game: `${BACKEND_URL}/api/game/`
};


/* ======================================
   ELEMENTS
====================================== */

const recommendedContainer =
    document.getElementById("recommendedGames");

const popularContainer =
    document.getElementById("popularGames");

const searchContainer =
    document.getElementById("searchGames");

const searchSection =
    document.getElementById("searchSection");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const searchStatus =
    document.getElementById("searchStatus");

const errorSection =
    document.getElementById("errorSection");

const errorMessage =
    document.getElementById("errorMessage");


/* ======================================
   API FETCH
====================================== */

async function apiFetch(url) {

    console.log("[WebBlox] Request:", url);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        },
        cache: "no-store"
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Backend returned HTTP ${response.status}`
        );
    }

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            "Backend did not return JSON."
        );
    }

    if (data.success === false) {
        throw new Error(
            data.error ||
            "Backend returned an error."
        );
    }

    return data;
}


/* ======================================
   LOAD HOME
====================================== */

async function loadHome() {

    hideError();

    showLoading(recommendedContainer);
    showLoading(popularContainer);

    try {

        const data =
            await apiFetch(API.home);

        const recommended =
            Array.isArray(data.recommended)
                ? data.recommended
                : [];

        const popular =
            Array.isArray(data.popular)
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

            showError(
                "The backend is online, but Roblox did not return any games."
            );
        }

    } catch (error) {

        console.error(
            "[WebBlox] Home error:",
            error
        );

        recommendedContainer.innerHTML = "";
        popularContainer.innerHTML = "";

        showError(error.message);
    }
}


/* ======================================
   RENDER GAMES
====================================== */

function renderGames(container, games) {

    container.innerHTML = "";

    if (!games.length) {

        container.innerHTML = `
            <div class="empty-card">
                No Roblox experiences found.
            </div>
        `;

        return;
    }

    for (const game of games) {

        container.appendChild(
            createGameCard(game)
        );
    }
}


/* ======================================
   GAME CARD
====================================== */

function createGameCard(game) {

    const card =
        document.createElement("article");

    card.className = "game-card";


    /* Thumbnail */

    const image =
        document.createElement("img");

    image.className =
        "game-thumbnail";

    image.src =
        game.thumbnail ||
        game.icon ||
        "";

    image.alt =
        game.name || "Roblox game";

    image.loading = "lazy";


    image.onerror = function () {

        this.style.display = "none";

    };


    /* Body */

    const body =
        document.createElement("div");

    body.className =
        "game-card-body";


    /* Title */

    const title =
        document.createElement("h3");

    title.textContent =
        game.name || "Unknown Game";


    /* Creator */

    const creator =
        document.createElement("p");

    creator.className =
        "game-creator";

    creator.textContent =
        "By " +
        (
            game.creator ||
            "Unknown Creator"
        );


    /* Stats */

    const stats =
        document.createElement("div");

    stats.className =
        "game-stats";


    const players =
        document.createElement("span");

    players.textContent =
        "👥 " +
        formatNumber(
            game.playing
        );


    const visits =
        document.createElement("span");

    visits.textContent =
        formatNumber(
            game.visits
        ) +
        " visits";


    stats.appendChild(players);
    stats.appendChild(visits);


    body.appendChild(title);
    body.appendChild(creator);
    body.appendChild(stats);

    card.appendChild(image);
    card.appendChild(body);


    /* Click */

    card.addEventListener(
        "click",
        () => openGame(game)
    );


    return card;
}


/* ======================================
   SEARCH
====================================== */

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


    searchContainer.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>Searching Roblox...</span>
        </div>
    `;


    try {

        const data =
            await apiFetch(
                API.search +
                "?q=" +
                encodeURIComponent(query)
            );


        const games =
            Array.isArray(data.games)
                ? data.games
                : [];


        searchStatus.textContent =
            `${games.length} Roblox experience${
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

        searchContainer.innerHTML = `
            <div class="empty-card">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


/* ======================================
   OPEN GAME
====================================== */

function openGame(game) {

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
        "";


    const playButton =
        document.getElementById(
            "playButton"
        );


    playButton.onclick = function () {

        if (!game.placeId) {

            alert(
                "Roblox could not provide a place ID for this experience."
            );

            return;
        }


        window.open(
            `https://www.roblox.com/games/${game.placeId}`,
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


/* ======================================
   CLOSE GAME
====================================== */

function closeGame() {

    const modal =
        document.getElementById(
            "gameModal"
        );

    modal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* ======================================
   SEARCH EVENTS
====================================== */

searchButton.addEventListener(
    "click",
    searchGames
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            searchGames();
        }
    }
);


/* ======================================
   CLEAR SEARCH
====================================== */

function clearSearch() {

    searchInput.value = "";

    searchSection.classList.add(
        "hidden"
    );

    searchContainer.innerHTML = "";
}


/* ======================================
   ERROR
====================================== */

function showError(message) {

    errorMessage.textContent =
        message ||
        "WebBlox could not reach the backend.";

    errorSection.classList.remove(
        "hidden"
    );
}


function hideError() {

    errorSection.classList.add(
        "hidden"
    );
}


/* ======================================
   LOADING
====================================== */

function showLoading(container) {

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <span>Loading Roblox experiences...</span>
        </div>
    `;
}


/* ======================================
   NUMBER FORMAT
====================================== */

function formatNumber(number) {

    number =
        Number(number) || 0;

    if (number >= 1000000000) {
        return (
            number / 1000000000
        ).toFixed(1) + "B";
    }

    if (number >= 1000000) {
        return (
            number / 1000000
        ).toFixed(1) + "M";
    }

    if (number >= 1000) {
        return (
            number / 1000
        ).toFixed(1) + "K";
    }

    return number.toLocaleString();
}


/* ======================================
   ESCAPE HTML
====================================== */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ======================================
   SCROLL
====================================== */

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


/* ======================================
   ESC KEY
====================================== */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeGame();
        }
    }
);


/* ======================================
   START
====================================== */

console.log(
    "[WebBlox] Frontend starting..."
);

console.log(
    "[WebBlox] Backend:",
    BACKEND_URL
);

loadHome();
