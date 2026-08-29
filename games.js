```javascript
/*
 * WebBlox - games.js
 * Real Roblox experience loader
 *
 * Frontend:
 * https://lcrazyness.github.io/WebBlox/
 *
 * Backend:
 * https://webblox-backend.onrender.com/
 *
 * This file:
 * - Loads real Roblox experiences
 * - Loads recommended/trending/popular experiences
 * - Searches real Roblox experiences through the WebBlox backend
 * - Displays Roblox thumbnails/icons
 * - Displays players, visits and creators
 * - Opens the actual Roblox experience
 *
 * IMPORTANT:
 * All Roblox API requests go through the WebBlox backend.
 */

(() => {
    "use strict";

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const API_BASE = "https://webblox-backend.onrender.com";

    /*
     * The backend may expose multiple discovery/search routes.
     * We try the preferred route first and gracefully fall back
     * to the other WebBlox Roblox endpoints.
     */
    const ENDPOINTS = {
        home: [
            "/api/home",
            "/api/explore",
            "/api/roblox/explore"
        ],

        search: [
            "/api/search",
            "/api/roblox/search"
        ]
    };

    // ============================================================
    // STATE
    // ============================================================

    let currentGames = [];
    let searchTimeout = null;
    let searchController = null;
    let homeLoading = false;

    // ============================================================
    // GENERIC HELPERS
    // ============================================================

    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeNumber(value) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function formatNumber(value) {
        const number = safeNumber(value);

        if (number >= 1_000_000_000) {
            return (
                (number / 1_000_000_000)
                    .toFixed(1)
                    .replace(".0", "") +
                "B"
            );
        }

        if (number >= 1_000_000) {
            return (
                (number / 1_000_000)
                    .toFixed(1)
                    .replace(".0", "") +
                "M"
            );
        }

        if (number >= 1_000) {
            return (
                (number / 1_000)
                    .toFixed(1)
                    .replace(".0", "") +
                "K"
            );
        }

        return number.toLocaleString();
    }

    function firstValue(...values) {
        for (const value of values) {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                return value;
            }
        }

        return null;
    }

    // ============================================================
    // API HELPERS
    // ============================================================

    async function requestJSON(path, options = {}) {
        const url = path.startsWith("http")
            ? path
            : `${API_BASE}${path}`;

        const response = await fetch(url, {
            method: options.method || "GET",
            headers: {
                "Accept": "application/json",
                ...(options.headers || {})
            },
            signal: options.signal
        });

        const text = await response.text();

        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(
                    `Backend returned invalid JSON (${response.status}).`
                );
            }
        }

        if (!response.ok) {
            const message =
                data?.error ||
                data?.message ||
                data?.errors?.[0]?.message ||
                `Backend returned HTTP ${response.status}.`;

            throw new Error(message);
        }

        return data;
    }

    async function tryEndpoints(paths, query = null, options = {}) {
        let lastError = null;

        for (const path of paths) {
            try {
                let finalPath = path;

                if (query) {
                    finalPath += `?${query}`;
                }

                return await requestJSON(
                    finalPath,
                    options
                );
            } catch (error) {
                lastError = error;

                console.warn(
                    `[WebBlox] Endpoint failed: ${path}`,
                    error.message
                );
            }
        }

        throw (
            lastError ||
            new Error("No WebBlox API endpoint succeeded.")
        );
    }

    // ============================================================
    // GAME NORMALIZATION
    // ============================================================

    /*
     * Roblox data can arrive in slightly different shapes
     * depending on which backend endpoint produced it.
     *
     * Normalize everything into one format for the UI.
     */

    function normalizeGame(game) {
        if (!game || typeof game !== "object") {
            return null;
        }

        const universeId = firstValue(
            game.universeId,
            game.UniverseId,
            game.universeID,
            game.id,
            game.Id
        );

        const placeId = firstValue(
            game.placeId,
            game.PlaceId,
            game.rootPlaceId,
            game.RootPlaceId
        );

        const name = firstValue(
            game.name,
            game.Name,
            game.title,
            game.Title
        );

        const description = firstValue(
            game.description,
            game.Description,
            game.gameDescription,
            game.GameDescription
        );

        const creator =
            typeof game.creator === "object"
                ? firstValue(
                      game.creator?.name,
                      game.creator?.Name,
                      game.creator?.displayName
                  )
                : firstValue(
                      game.creator,
                      game.Creator,
                      game.creatorName,
                      game.CreatorName
                  );

        const creatorId =
            typeof game.creator === "object"
                ? firstValue(
                      game.creator?.id,
                      game.creator?.Id
                  )
                : firstValue(
                      game.creatorId,
                      game.CreatorId
                  );

        const playing = firstValue(
            game.playing,
            game.Playing,
            game.playerCount,
            game.PlayerCount,
            game.visitsPerMinute
        );

        const visits = firstValue(
            game.visits,
            game.Visits,
            game.totalVisits,
            game.TotalVisits
        );

        const favorites = firstValue(
            game.favorites,
            game.Favorites,
            game.favoriteCount,
            game.FavoriteCount
        );

        const thumbnail = firstValue(
            game.thumbnail,
            game.Thumbnail,
            game.thumbnailUrl,
            game.ThumbnailUrl,
            game.imageUrl,
            game.ImageUrl,
            game.icon
        );

        const icon = firstValue(
            game.icon,
            game.Icon,
            game.iconUrl,
            game.IconUrl,
            thumbnail
        );

        const robloxUrl = firstValue(
            game.robloxUrl,
            game.RobloxUrl,
            game.url,
            game.Url
        );

        const genre = firstValue(
            game.genre,
            game.Genre,
            game.genreName,
            game.GenreName
        );

        const maxPlayers = firstValue(
            game.maxPlayers,
            game.MaxPlayers,
            game.maxPlayerCount,
            game.MaxPlayerCount
        );

        return {
            ...game,

            universeId,
            placeId,

            name: name || "Unknown Experience",
            description:
                description ||
                "No description available.",

            creator:
                creator ||
                "Roblox",

            creatorId,

            playing:
                safeNumber(playing),

            visits:
                safeNumber(visits),

            favorites:
                safeNumber(favorites),

            thumbnail:
                thumbnail || null,

            icon:
                icon || null,

            robloxUrl:
                robloxUrl || null,

            genre:
                genre || null,

            maxPlayers:
                maxPlayers !== null
                    ? safeNumber(maxPlayers)
                    : null
        };
    }

    function normalizeGames(games) {
        if (!Array.isArray(games)) {
            return [];
        }

        return games
            .map(normalizeGame)
            .filter(Boolean);
    }

    // ============================================================
    // EXTRACT GAME ARRAYS
    // ============================================================

    function extractGames(data) {
        if (!data) {
            return [];
        }

        if (Array.isArray(data)) {
            return normalizeGames(data);
        }

        const possibleArrays = [
            data.games,
            data.results,
            data.experiences,
            data.recommended,
            data.popular,
            data.trending,
            data.items,
            data.data,
            data.data?.games,
            data.data?.results,
            data.data?.experiences,
            data.data?.items
        ];

        for (const value of possibleArrays) {
            if (Array.isArray(value)) {
                return normalizeGames(value);
            }
        }

        /*
         * Roblox Explore responses sometimes contain nested
         * sort/content structures.
         */
        const nested = [];

        function walk(value, depth = 0) {
            if (!value || depth > 6) {
                return;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    if (
                        item &&
                        typeof item === "object"
                    ) {
                        if (
                            item.placeId ||
                            item.PlaceId ||
                            item.universeId ||
                            item.UniverseId ||
                            item.rootPlaceId ||
                            item.RootPlaceId
                        ) {
                            nested.push(item);
                        } else {
                            walk(item, depth + 1);
                        }
                    }
                }

                return;
            }

            if (typeof value === "object") {
                for (const child of Object.values(value)) {
                    walk(child, depth + 1);
                }
            }
        }

        walk(data);

        return normalizeGames(nested);
    }

    function extractSections(data) {
        const recommended =
            Array.isArray(data?.recommended)
                ? normalizeGames(data.recommended)
                : [];

        const popular =
            Array.isArray(data?.popular)
                ? normalizeGames(data.popular)
                : [];

        const trending =
            Array.isArray(data?.trending)
                ? normalizeGames(data.trending)
                : [];

        return {
            recommended,
            popular,
            trending
        };
    }

    // ============================================================
    // ROBLOX URL
    // ============================================================

    function getGameURL(game) {
        const directURL = firstValue(
            game?.robloxUrl,
            game?.RobloxUrl,
            game?.url,
            game?.Url
        );

        if (
            directURL &&
            /^https?:\/\//i.test(String(directURL))
        ) {
            return String(directURL);
        }

        const placeId = firstValue(
            game?.placeId,
            game?.PlaceId,
            game?.rootPlaceId,
            game?.RootPlaceId
        );

        if (placeId) {
            return `https://www.roblox.com/games/${encodeURIComponent(placeId)}`;
        }

        const universeId = firstValue(
            game?.universeId,
            game?.UniverseId,
            game?.id,
            game?.Id
        );

        if (universeId) {
            return `https://www.roblox.com/games/${encodeURIComponent(universeId)}`;
        }

        return "https://www.roblox.com/games";
    }

    // ============================================================
    // THUMBNAILS
    // ============================================================

    function getThumbnail(game) {
        const thumbnail = firstValue(
            game?.thumbnail,
            game?.Thumbnail,
            game?.thumbnailUrl,
            game?.ThumbnailUrl,
            game?.imageUrl,
            game?.ImageUrl,
            game?.icon,
            game?.Icon
        );

        if (thumbnail) {
            return thumbnail;
        }

        /*
         * If the backend gives us a universe ID but no thumbnail,
         * use the Roblox thumbnail API through the backend when
         * available. The direct fallback below prevents broken
         * cards when an image cannot be obtained.
         */
        const universeId = firstValue(
            game?.universeId,
            game?.UniverseId
        );

        if (universeId) {
            return `${API_BASE}/api/thumbnail/${encodeURIComponent(universeId)}`;
        }

        return "";
    }

    // ============================================================
    // GAME CARD
    // ============================================================

    function createGameCard(game) {
        const normalized = normalizeGame(game);

        if (!normalized) {
            return "";
        }

        const name =
            escapeHTML(normalized.name);

        const creator =
            escapeHTML(normalized.creator);

        const description =
            escapeHTML(normalized.description);

        const thumbnail =
            escapeHTML(getThumbnail(normalized));

        const url =
            escapeHTML(getGameURL(normalized));

        const playing =
            formatNumber(normalized.playing);

        const visits =
            formatNumber(normalized.visits);

        const favorites =
            formatNumber(normalized.favorites);

        const id =
            escapeHTML(
                normalized.universeId ||
                normalized.placeId ||
                normalized.id ||
                ""
            );

        const genre =
            normalized.genre
                ? escapeHTML(normalized.genre)
                : "";

        return `
            <article
                class="game-card"
                data-game-id="${id}"
                data-universe-id="${escapeHTML(normalized.universeId || "")}"
                data-place-id="${escapeHTML(normalized.placeId || "")}"
            >

                <a
                    class="game-thumbnail-link"
                    href="${url}"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Play ${name}"
                >
                    ${
                        thumbnail
                            ? `
                                <img
                                    class="game-thumbnail"
                                    src="${thumbnail}"
                                    alt="${name}"
                                    loading="lazy"
                                    decoding="async"
                                    onerror="this.classList.add('image-error');"
                                >
                              `
                            : `
                                <div class="game-thumbnail game-thumbnail-placeholder">
                                    <span>🎮</span>
                                </div>
                              `
                    }
                </a>

                <div class="game-card-info">

                    <a
                        class="game-name"
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="${name}"
                    >
                        ${name}
                    </a>

                    <div class="game-creator">
                        ${creator}
                    </div>

                    <div class="game-description">
                        ${description}
                    </div>

                    ${
                        genre
                            ? `
                                <div class="game-genre">
                                    ${genre}
                                </div>
                              `
                            : ""
                    }

                    <div class="game-stats">

                        <span
                            class="game-stat game-stat-playing"
                            title="${playing} players"
                        >
                            👥 ${playing}
                        </span>

                        <span
                            class="game-stat game-stat-visits"
                            title="${visits} visits"
                        >
                            ▶ ${visits}
                        </span>

                        ${
                            normalized.favorites
                                ? `
                                    <span
                                        class="game-stat game-stat-favorites"
                                        title="${favorites} favorites"
                                    >
                                        ★ ${favorites}
                                    </span>
                                  `
                                : ""
                        }

                    </div>

                </div>

            </article>
        `;
    }

    // ============================================================
    // RENDER
    // ============================================================

    function renderGames(games, container) {
        if (!container) {
            return;
        }

        const normalized =
            normalizeGames(games);

        if (!normalized.length) {
            container.innerHTML = `
                <div class="games-empty">
                    <div class="games-empty-icon">🎮</div>
                    <div class="games-empty-title">
                        No experiences found
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            normalized
                .map(createGameCard)
                .join("");

        container.dispatchEvent(
            new CustomEvent(
                "webblox:games-rendered",
                {
                    detail: {
                        games: normalized
                    }
                }
            )
        );
    }

    // ============================================================
    // CONTAINER FINDER
    // ============================================================

    function findContainer(...selectors) {
        for (const selector of selectors) {
            const element =
                document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function findRecommendedContainer() {
        return findContainer(
            "#recommended-games",
            "#recommendedGames",
            ".recommended-games",
            "[data-games='recommended']"
        );
    }

    function findPopularContainer() {
        return findContainer(
            "#popular-games",
            "#popularGames",
            ".popular-games",
            "[data-games='popular']"
        );
    }

    function findTrendingContainer() {
        return findContainer(
            "#trending-games",
            "#trendingGames",
            ".trending-games",
            "[data-games='trending']"
        );
    }

    function findSearchContainer() {
        return findContainer(
            "#search-results",
            "#searchResults",
            ".search-results"
        );
    }

    function findGeneralContainer() {
        return findContainer(
            "#games",
            "#game-list",
            "#gameList",
            ".games-grid",
            ".game-grid",
            "[data-games]"
        );
    }

    // ============================================================
    // HOME LOADING
    // ============================================================

    async function loadHome() {
        if (homeLoading) {
            return currentGames;
        }

        homeLoading = true;

        try {
            const data =
                await tryEndpoints(
                    ENDPOINTS.home
                );

            const sections =
                extractSections(data);

            let recommended =
                sections.recommended;

            let popular =
                sections.popular;

            let trending =
                sections.trending;

            /*
             * If the backend returns one generic game array
             * rather than separate sections, use it as the
             * primary list.
             */
            if (
                !recommended.length &&
                !popular.length &&
                !trending.length
            ) {
                const generic =
                    extractGames(data);

                popular =
                    generic.slice(0, 50);
            }

            /*
             * Combine everything while removing duplicates.
             */
            currentGames =
                uniqueGames([
                    ...recommended,
                    ...popular,
                    ...trending
                ]);

            const recommendedContainer =
                findRecommendedContainer();

            const popularContainer =
                findPopularContainer();

            const trendingContainer =
                findTrendingContainer();

            if (recommendedContainer) {
                renderGames(
                    recommended,
                    recommendedContainer
                );
            }

            if (popularContainer) {
                renderGames(
                    popular,
                    popularContainer
                );
            }

            if (trendingContainer) {
                renderGames(
                    trending,
                    trendingContainer
                );
            }

            /*
             * If the HTML only has one game container,
             * display the complete discovery feed there.
             */
            if (
                !recommendedContainer &&
                !popularContainer &&
                !trendingContainer
            ) {
                renderGames(
                    currentGames,
                    findGeneralContainer()
                );
            }

            showHomeSections();

            console.log(
                `[WebBlox] Loaded ${currentGames.length} Roblox experiences.`
            );

            return currentGames;

        } catch (error) {
            console.error(
                "[WebBlox] Home loading failed:",
                error
            );

            renderError(
                [
                    findRecommendedContainer(),
                    findPopularContainer(),
                    findTrendingContainer(),
                    findGeneralContainer()
                ],
                "Unable to load Roblox experiences."
            );

            return [];

        } finally {
            homeLoading = false;
        }
    }

    // ============================================================
    // SEARCH
    // ============================================================

    async function searchGames(query) {
        query =
            String(query || "")
                .trim();

        if (!query) {
            showHomeSections();

            return loadHome();
        }

        if (searchController) {
            searchController.abort();
        }

        searchController =
            new AbortController();

        const searchContainer =
            findSearchContainer() ||
            findGeneralContainer();

        if (searchContainer) {
            searchContainer.innerHTML = `
                <div class="games-loading">
                    <div class="games-loading-spinner"></div>
                    <div>Searching Roblox...</div>
                </div>
            `;
        }

        try {
            const encodedQuery =
                `q=${encodeURIComponent(query)}`;

            const data =
                await tryEndpoints(
                    ENDPOINTS.search,
                    encodedQuery,
                    {
                        signal:
                            searchController.signal
                    }
                );

            const results =
                extractGames(data);

            currentGames =
                uniqueGames(results);

            /*
             * Make sure the search area is visible.
             */
            if (searchContainer) {
                renderGames(
                    currentGames,
                    searchContainer
                );
            }

            hideHomeSections();

            console.log(
                `[WebBlox] Roblox search "${query}" returned ${currentGames.length} results.`
            );

            return currentGames;

        } catch (error) {
            if (
                error?.name === "AbortError"
            ) {
                return [];
            }

            console.error(
                "[WebBlox] Search failed:",
                error
            );

            renderError(
                [searchContainer],
                "Roblox search failed. Please try again."
            );

            return [];

        } finally {
            searchController = null;
        }
    }

    // ============================================================
    // DUPLICATE REMOVAL
    // ============================================================

    function uniqueGames(games) {
        const seen = new Set();
        const output = [];

        for (const rawGame of games) {
            const game =
                normalizeGame(rawGame);

            if (!game) {
                continue;
            }

            const key =
                firstValue(
                    game.universeId,
                    game.placeId,
                    game.id,
                    game.name
                );

            const normalizedKey =
                String(
                    key || game.name
                )
                    .trim()
                    .toLowerCase();

            if (
                seen.has(normalizedKey)
            ) {
                continue;
            }

            seen.add(normalizedKey);
            output.push(game);
        }

        return output;
    }

    // ============================================================
    // SEARCH BAR
    // ============================================================

    function getSearchInput() {
        return document.querySelector(
            [
                "#search",
                "#searchInput",
                "#search-input",
                "input[name='search']",
                "input[type='search']"
            ].join(",")
        );
    }

    function setupSearch() {
        const input =
            getSearchInput();

        if (!input) {
            console.warn(
                "[WebBlox] Search input not found."
            );

            return;
        }

        input.addEventListener(
            "input",
            () => {
                clearTimeout(
                    searchTimeout
                );

                const query =
                    input.value.trim();

                if (!query) {
                    showHomeSections();

                    searchTimeout =
                        setTimeout(
                            loadHome,
                            150
                        );

                    return;
                }

                if (query.length < 2) {
                    return;
                }

                searchTimeout =
                    setTimeout(
                        () => {
                            searchGames(
                                query
                            );
                        },
                        350
                    );
            }
        );

        input.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !==
                    "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                clearTimeout(
                    searchTimeout
                );

                searchGames(
                    input.value
                );
            }
        );
    }

    // ============================================================
    // HOME VISIBILITY
    // ============================================================

    function hideHomeSections() {
        document
            .querySelectorAll(
                [
                    "#recommended-section",
                    "#recommendedGamesSection",
                    ".recommended-section",
                    "#popular-section",
                    "#popularGamesSection",
                    ".popular-section",
                    "#trending-section",
                    "#trendingGamesSection",
                    ".trending-section"
                ].join(",")
            )
            .forEach(
                element => {
                    element.style.display =
                        "none";
                }
            );
    }

    function showHomeSections() {
        document
            .querySelectorAll(
                [
                    "#recommended-section",
                    "#recommendedGamesSection",
                    ".recommended-section",
                    "#popular-section",
                    "#popularGamesSection",
                    ".popular-section",
                    "#trending-section",
                    "#trendingGamesSection",
                    ".trending-section"
                ].join(",")
            )
            .forEach(
                element => {
                    element.style.display =
                        "";
                }
            );
    }

    // ============================================================
    // ERROR UI
    // ============================================================

    function renderError(
        containers,
        message
    ) {
        const uniqueContainers =
            [...new Set(
                containers.filter(Boolean)
            )];

        for (
            const container
            of uniqueContainers
        ) {
            container.innerHTML = `
                <div class="games-error">
                    <div class="games-error-icon">
                        ⚠️
                    </div>

                    <div class="games-error-message">
                        ${escapeHTML(message)}
                    </div>

                    <button
                        type="button"
                        class="games-retry"
                        data-webblox-retry
                    >
                        Retry
                    </button>
                </div>
            `;

            const retry =
                container.querySelector(
                    "[data-webblox-retry]"
                );

            if (retry) {
                retry.addEventListener(
                    "click",
                    () => {
                        loadHome();
                    }
                );
            }
        }
    }

    // ============================================================
    // RETRY BUTTONS
    // ============================================================

    document.addEventListener(
        "click",
        event => {
            const retry =
                event.target.closest(
                    "[data-webblox-retry]"
                );

            if (!retry) {
                return;
            }

            loadHome();
        }
    );

    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxGames = {
        loadHome,
        searchGames,
        renderGames,
        createGameCard,
        normalizeGame,
        normalizeGames,
        getGameURL,
        getThumbnail,
        formatNumber,
        uniqueGames
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async function init() {
        console.log(
            "[WebBlox] Initializing Roblox game system..."
        );

        setupSearch();

        await loadHome();

        console.log(
            "[WebBlox] Roblox game system ready."
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})();
```
