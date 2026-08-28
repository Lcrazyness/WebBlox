"use strict";

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* ==============================
   CORS
============================== */

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});


/* ==============================
   ROBLOX SERVICES
============================== */

const GAMES_API = "https://games.roblox.com";
const THUMBNAILS_API = "https://thumbnails.roblox.com";


/* ==============================
   CACHE
============================== */

const cache = new Map();

const CACHE_TIME = 60 * 1000;

function getCache(key) {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if (Date.now() - item.time > CACHE_TIME) {
        cache.delete(key);
        return null;
    }

    return item.data;
}

function setCache(key, data) {
    cache.set(key, {
        time: Date.now(),
        data
    });
}


/* ==============================
   ROBLOX FETCH
============================== */

async function robloxFetch(url) {

    console.log("[Roblox]", url);

    const response = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "WebBlox/1.0"
        }
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Roblox HTTP ${response.status}: ${text.slice(0, 250)}`
        );
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Roblox returned invalid JSON.");
    }
}


/* ==============================
   GAME DETAILS
============================== */

async function getGameDetails(universeIds) {

    const ids = universeIds
        .map(Number)
        .filter(Number.isFinite)
        .slice(0, 50);

    if (!ids.length) {
        return [];
    }

    const key = "details:" + ids.join(",");

    const cached = getCache(key);

    if (cached) {
        return cached;
    }

    const url =
        `${GAMES_API}/v1/games?universeIds=${ids.join(",")}`;

    const data = await robloxFetch(url);

    const games = Array.isArray(data.data)
        ? data.data
        : [];

    setCache(key, games);

    return games;
}


/* ==============================
   THUMBNAILS
============================== */

async function getThumbnails(universeIds) {

    const ids = universeIds
        .map(Number)
        .filter(Number.isFinite)
        .slice(0, 50);

    if (!ids.length) {
        return new Map();
    }

    const url =
        `${THUMBNAILS_API}/v1/games/multiget/thumbnails` +
        `?universeIds=${ids.join(",")}` +
        `&size=768x432` +
        `&format=Png` +
        `&isCircular=false`;

    const data = await robloxFetch(url);

    const result = new Map();

    for (const item of data.data || []) {
        result.set(
            String(item.targetId),
            item.imageUrl || null
        );
    }

    return result;
}


/* ==============================
   ICONS
============================== */

async function getIcons(universeIds) {

    const ids = universeIds
        .map(Number)
        .filter(Number.isFinite)
        .slice(0, 50);

    if (!ids.length) {
        return new Map();
    }

    const url =
        `${THUMBNAILS_API}/v1/games/icons` +
        `?universeIds=${ids.join(",")}` +
        `&size=420x420` +
        `&format=Png` +
        `&isCircular=false`;

    const data = await robloxFetch(url);

    const result = new Map();

    for (const item of data.data || []) {
        result.set(
            String(item.targetId),
            item.imageUrl || null
        );
    }

    return result;
}


/* ==============================
   FORMAT GAME
============================== */

function formatGame(game, thumbnails, icons) {

    const universeId = Number(game.id);

    return {
        universeId,

        placeId:
            game.rootPlaceId || null,

        name:
            game.name || "Unknown",

        description:
            game.description || "",

        creator:
            game.creator?.name || "Unknown",

        creatorId:
            game.creator?.id || null,

        playing:
            Number(game.playing) || 0,

        visits:
            Number(game.visits) || 0,

        favorites:
            Number(game.favoritedCount) || 0,

        thumbnail:
            thumbnails.get(String(universeId)) || null,

        icon:
            icons.get(String(universeId)) || null
    };
}


/* ==============================
   ENRICH GAMES
============================== */

async function enrichGames(games) {

    const ids = games
        .map(game =>
            Number(
                game.id ??
                game.universeId
            )
        )
        .filter(Number.isFinite);

    if (!ids.length) {
        return [];
    }

    const [
        details,
        thumbnails,
        icons
    ] = await Promise.all([
        getGameDetails(ids),
        getThumbnails(ids),
        getIcons(ids)
    ]);

    return details.map(game =>
        formatGame(
            game,
            thumbnails,
            icons
        )
    );
}


/* ==============================
   ROBLOX RECOMMENDATIONS
==============================

   Roblox officially exposes:

   /v1/games/recommendations/game/{universeId}

   We use real Roblox universe IDs returned
   from Roblox itself and ask Roblox for related
   experiences.

============================== */

async function getRecommendations(universeId) {

    const url =
        `${GAMES_API}/v1/games/recommendations/game/${universeId}`;

    try {

        const data =
            await robloxFetch(url);

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data.games)) {
            return data.games;
        }

        if (Array.isArray(data.data)) {
            return data.data;
        }

        return [];

    } catch (error) {

        console.error(
            "[Recommendations]",
            error.message
        );

        return [];
    }
}


/* ==============================
   DISCOVER REAL GAMES
==============================

   We start from Roblox recommendation data.

   There are NO hardcoded WebBlox games.

============================== */

async function discoverGames() {

    /*
        These are only seed universe IDs.

        They are NOT WebBlox-created games.

        They are Roblox experiences used to ask
        Roblox's own recommendation service for
        related experiences.

        We keep the seed list small because the
        actual catalog comes from Roblox.
    */

    const seedIds = [
        1818,
        4924922222,
        6516141723
    ];

    const discovered = new Map();

    for (const universeId of seedIds) {

        const recommendations =
            await getRecommendations(
                universeId
            );

        for (const game of recommendations) {

            const id =
                Number(
                    game.id ??
                    game.universeId
                );

            if (
                Number.isFinite(id) &&
                id > 0
            ) {

                discovered.set(
                    String(id),
                    {
                        id
                    }
                );
            }
        }
    }

    const raw =
        Array.from(
            discovered.values()
        );

    const enriched =
        await enrichGames(raw);

    return enriched
        .filter(game =>
            game.universeId &&
            game.name &&
            game.thumbnail
        )
        .sort(
            (a, b) =>
                b.playing - a.playing
        );
}


/* ==============================
   HOME
============================== */

app.get("/api/home", async (req, res) => {

    try {

        const games =
            await discoverGames();

        res.json({
            success: true,

            recommended:
                games.slice(0, 12),

            popular:
                games.slice(0, 24)
        });

    } catch (error) {

        console.error(
            "[HOME]",
            error
        );

        res.status(500).json({
            success: false,

            error:
                "Unable to load Roblox experiences."
        });
    }
});


/* ==============================
   POPULAR
============================== */

app.get("/api/popular", async (req, res) => {

    try {

        const games =
            await discoverGames();

        res.json({
            success: true,

            games:
                games
                    .sort(
                        (a, b) =>
                            b.playing - a.playing
                    )
                    .slice(0, 50)
        });

    } catch (error) {

        console.error(
            "[POPULAR]",
            error
        );

        res.status(500).json({
            success: false,

            error:
                "Unable to load popular Roblox experiences."
        });
    }
});


/* ==============================
   SEARCH
============================== */

app.get("/api/search", async (req, res) => {

    /*
        Search will be connected to the Roblox
        discovery/search service next.

        We intentionally return an empty result
        rather than inventing games.
    */

    res.json({
        success: true,
        games: []
    });
});


/* ==============================
   SINGLE GAME
============================== */

app.get(
    "/api/game/:universeId",
    async (req, res) => {

        try {

            const universeId =
                Number(
                    req.params.universeId
                );

            if (
                !Number.isSafeInteger(
                    universeId
                ) ||
                universeId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid Roblox universe ID."
                });
            }

            const games =
                await getGameDetails([
                    universeId
                ]);

            if (!games.length) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Roblox experience not found."
                });
            }

            const enriched =
                await enrichGames(
                    games
                );

            res.json({
                success: true,
                game:
                    enriched[0] || null
            });

        } catch (error) {

            console.error(
                "[GAME]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Unable to load Roblox experience."
            });
        }
    }
);


/* ==============================
   HEALTH
============================== */

app.get("/", (req, res) => {

    res.json({
        service: "WebBlox Backend",
        status: "online",
        source: "Roblox",
        demoGames: false
    });

});


app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        status: "online",
        source: "Roblox",
        demoGames: false
    });

});


/* ==============================
   START
============================== */

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("        WebBlox Backend");
    console.log("================================");
    console.log(
        `Listening on port ${PORT}`
    );
    console.log(
        "Source: Roblox"
    );
    console.log(
        "Demo games: DISABLED"
    );
    console.log("");

});
