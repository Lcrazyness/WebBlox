```javascript
/*
 * WebBlox - games.js
 * Real Roblox experience loader
 *
 * Uses the WebBlox backend instead of putting Roblox API requests
 * directly in the browser.
 */

(() => {
    "use strict";

    // ------------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------------

    // Change this to your deployed WebBlox backend URL.
    // Do NOT put /api/home at the end.
    const API_BASE = "https://YOUR-WEBBLOX-BACKEND.onrender.com";

    const ENDPOINTS = {
        home: `${API_BASE}/api/home`,
        search: `${API_BASE}/api/search`
    };

    // ------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------

    let currentGames = [];
    let searchTimeout = null;

    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    function escapeHTML(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatNumber(number) {
        number = Number(number) || 0;

        if (number >= 1_000_000_000) {
            return (number / 1_000_000_000).toFixed(1).replace(".0", "") + "B";
        }

        if (number >= 1_000_000) {
            return (number / 1_000_000).toFixed(1).replace(".0", "") + "M";
        }

        if (number >= 1_000) {
            return (number / 1_000).toFixed(1).replace(".0", "") + "K";
        }

        return number.toLocaleString();
    }

    function getGameURL(game) {
        if (game.robloxUrl) {
            return game.robloxUrl;
        }

        if (game.placeId) {
            return `https://www.roblox.com/games/${game.placeId}`;
        }

        if (game.id) {
            return `https://www.roblox.com/games/${game.id}`;
        }

        return "#";
    }

    function getThumbnail(game) {
        return (
            game.thumbnail ||
            game.icon ||
            "https://tr.rbxcdn.com/180DAY-00000000000000000000000000000000/420/420/Image/Webp/noFilter"
        );
    }

    // ------------------------------------------------------------
    // GAME CARD
    // ------------------------------------------------------------

    function createGameCard(game) {
        const name = escapeHTML(game.name || "Unknown Experience");
        const creator = escapeHTML(game.creator || "Roblox");
        const description = escapeHTML(
            game.description || "No description available."
        );

        const thumbnail = escapeHTML(getThumbnail(game));
        const url = escapeHTML(getGameURL(game));

        const playing = formatNumber(game.playing);
        const visits = formatNumber(game.visits);

        return `
            <div class="game-card" data-game-id="${escapeHTML(game.id || game.universeId || "")}">
                
                <a
                    class="game-thumbnail-link"
                    href="${url}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        class="game-thumbnail"
                        src="${thumbnail}"
                        alt="${name}"
                        loading="lazy"
                        onerror="this.style.display='none';"
                    >
                </a>

                <div class="game-card-info">

                    <a
                        class="game-name"
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${name}
                    </a>

                    <div class="game-creator">
                        ${creator}
                    </div>

                    <div class="game-description">
                        ${description}
                    </div>

                    <div class="game-stats">
                        <span>👥 ${playing} playing</span>
                        <span>▶ ${visits} visits</span>
                    </div>

                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------
    // RENDER GAMES
    // ------------------------------------------------------------

    function renderGames(games, container) {
        if (!container) return;

        if (!Array.isArray(games) || games.length === 0) {
            container.innerHTML = `
                <div class="games-empty">
                    No experiences found.
                </div>
            `;
            return;
        }

        container.innerHTML = games
            .map(createGameCard)
            .join("");
    }

    // ------------------------------------------------------------
    // FIND CONTAINERS
    // ------------------------------------------------------------

    function findContainer(...selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    // ------------------------------------------------------------
    // HOME
    // ------------------------------------------------------------

    async function loadHome() {
        try {
            const response = await fetch(ENDPOINTS.home, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Home API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Home API failed");
            }

            const recommended = Array.isArray(data.recommended)
                ? data.recommended
                : [];

            const popular = Array.isArray(data.popular)
                ? data.popular
                : [];

            currentGames = [
                ...recommended,
                ...popular
            ];

            // Remove duplicate games.
            currentGames = currentGames.filter(
                (game, index, array) => {
                    const id =
                        game.universeId ||
                        game.id ||
                        game.placeId ||
                        game.name;

                    return (
                        index ===
                        array.findIndex(other => {
                            const otherId =
                                other.universeId ||
                                other.id ||
                                other.placeId ||
                                other.name;

                            return otherId === id;
                        })
                    );
                }
            );

            const recommendedContainer = findContainer(
                "#recommended-games",
                "#recommendedGames",
                ".recommended-games",
                "[data-games='recommended']"
            );

            const popularContainer = findContainer(
                "#popular-games",
                "#popularGames",
                ".popular-games",
                "[data-games='popular']"
            );

            renderGames(recommended, recommendedContainer);
            renderGames(popular, popularContainer);

            // If there is only one general games container,
            // put all loaded games there.
            if (!recommendedContainer && !popularContainer) {
                const generalContainer = findContainer(
                    "#games",
                    "#game-list",
                    "#gameList",
                    ".games-grid",
                    ".game-grid",
                    "[data-games]"
                );

                renderGames(currentGames, generalContainer);
            }

            console.log(
                `[WebBlox] Loaded ${currentGames.length} Roblox experiences`
            );

        } catch (error) {
            console.error("[WebBlox] Failed to load games:", error);

            const containers = [
                "#recommended-games",
                "#recommendedGames",
                ".recommended-games",
                "#popular-games",
                "#popularGames",
                ".popular-games",
                "#games",
                "#game-list",
                "#gameList"
            ];

            containers.forEach(selector => {
                const element = document.querySelector(selector);

                if (element) {
                    element.innerHTML = `
                        <div class="games-error">
                            Unable to load Roblox experiences.
                            <button onclick="window.WebBloxGames.loadHome()">
                                Retry
                            </button>
                        </div>
                    `;
                }
            });
        }
    }

    // ------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------

    async function searchGames(query) {
        query = String(query || "").trim();

        if (!query) {
            await loadHome();
            return;
        }

        try {
            const url =
                `${ENDPOINTS.search}?q=${encodeURIComponent(query)}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Search failed");
            }

            /*
             * Supports several possible backend response names.
             */
            const results =
                Array.isArray(data.results) ? data.results :
                Array.isArray(data.games) ? data.games :
                Array.isArray(data.experiences) ? data.experiences :
                [];

            currentGames = results;

            const container = findContainer(
                "#search-results",
                "#searchResults",
                "#games",
                "#game-list",
                "#gameList",
                ".games-grid",
                ".game-grid",
                "[data-games]"
            );

            renderGames(results, container);

            // Hide normal sections while searching.
            document
                .querySelectorAll(
                    "#recommended-section, " +
                    "#recommendedGamesSection, " +
                    ".recommended-section, " +
                    "#popular-section, " +
                    "#popularGamesSection, " +
                    ".popular-section"
                )
                .forEach(element => {
                    element.style.display = "none";
                });

            console.log(
                `[WebBlox] Search "${query}" → ${results.length} results`
            );

            return results;

        } catch (error) {
            console.error("[WebBlox] Search failed:", error);

            const container = findContainer(
                "#search-results",
                "#searchResults",
                "#games",
                "#game-list",
                "#gameList",
                ".games-grid",
                ".game-grid"
            );

            if (container) {
                container.innerHTML = `
                    <div class="games-error">
                        Search failed.
                        <button onclick="window.WebBloxGames.searchGames(${JSON.stringify(query)})">
                            Retry
                        </button>
                    </div>
                `;
            }

            return [];
        }
    }

    // ------------------------------------------------------------
    // SEARCH BAR
    // ------------------------------------------------------------

    function setupSearch() {
        const searchInput = document.querySelector(
            "#search, #searchInput, #search-input, input[name='search']"
        );

        if (!searchInput) {
            console.warn("[WebBlox] Search input not found.");
            return;
        }

        searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);

            const query = searchInput.value.trim();

            searchTimeout = setTimeout(() => {
                if (query.length >= 2) {
                    searchGames(query);
                } else if (query.length === 0) {
                    showHomeSections();
                    loadHome();
                }
            }, 350);
        });

        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();

                clearTimeout(searchTimeout);

                searchGames(searchInput.value);
            }
        });
    }

    // ------------------------------------------------------------
    // SHOW HOME
    // ------------------------------------------------------------

    function showHomeSections() {
        document
            .querySelectorAll(
                "#recommended-section, " +
                "#recommendedGamesSection, " +
                ".recommended-section, " +
                "#popular-section, " +
                "#popularGamesSection, " +
                ".popular-section"
            )
            .forEach(element => {
                element.style.display = "";
            });
    }

    // ------------------------------------------------------------
    // INITIALIZE
    // ------------------------------------------------------------

    async function init() {
        console.log("[WebBlox] Initializing games system...");

        setupSearch();
        await loadHome();

        console.log("[WebBlox] Games system ready.");
    }

    // ------------------------------------------------------------
    // PUBLIC API
    // ------------------------------------------------------------

    window.WebBloxGames = {
        loadHome,
        searchGames,
        renderGames,
        getGameURL
    };

    // Start once DOM is ready.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
```
