"use strict";

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

/*
==================================================
 CONFIG
==================================================
*/

const ROBLOX_GAMES =
    "https://games.roblox.com";

const ROBLOX_THUMBNAILS =
    "https://thumbnails.roblox.com";


/*
==================================================
 CORS
==================================================
*/

app.use((req, res, next) => {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();

});


/*
==================================================
 CACHE
==================================================
*/

const cache = new Map();

const CACHE_TIME =
    2 * 60 * 1000;


function getCache(key) {

    const item =
        cache.get(key);

    if (!item) {
        return null;
    }

    if (
        Date.now() - item.time >
        CACHE_TIME
    ) {

        cache.delete(key);

        return null;

    }

    return item.data;

}


function setCache(key, data) {

    cache.set(
        key,
        {
            time: Date.now(),
            data
        }
    );

}


/*
==================================================
 ROBLOX REQUEST
==================================================
*/

async function robloxFetch(url) {

    console.log(
        "[Roblox]",
        url
    );

    const response =
        await fetch(
            url,
            {
                headers: {
                    "Accept":
                        "application/json",

                    "User-Agent":
                        "WebBlox/1.0"
                }
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `Roblox returned HTTP ${response.status}: ${text.slice(0, 200)}`
        );

    }


    try {

        return JSON.parse(text);

    } catch {

        throw new Error(
            "Roblox returned invalid JSON."
        );

    }

}


/*
==================================================
 GAME DETAILS
==================================================

Roblox's documented /v1/games endpoint
accepts universe IDs and returns game details.
==================================================
*/

async function getGameDetails(
    universeIds
) {

    if (
        !Array.isArray(universeIds) ||
        universeIds.length === 0
    ) {

        return [];

    }


    const ids =
        universeIds
            .map(Number)
            .filter(
                Number.isFinite
            )
            .slice(0, 50);


    if (ids.length === 0) {
        return [];
    }


    const cacheKey =
        "details:" +
        ids.join(",");


    const cached =
        getCache(cacheKey);


    if (cached) {
        return cached;
    }


    const url =
        ROBLOX_GAMES +
        "/v1/games?universeIds=" +
        ids.join(",");


    const data =
        await robloxFetch(url);


    const games =
        Array.isArray(data.data)
            ? data.data
            : [];


    setCache(
        cacheKey,
        games
    );


    return games;

}


/*
==================================================
 THUMBNAILS
==================================================
*/

async function getThumbnails(
    universeIds
) {

    const ids =
        universeIds
            .map(Number)
            .filter(
                Number.isFinite
            )
            .slice(0, 50);


    if (ids.length === 0) {
        return new Map();
    }


    const url =
        ROBLOX_THUMBNAILS +
        "/v1/games/multiget/thumbnails" +
        "?universeIds=" +
        ids.join(",") +
        "&size=768x432" +
        "&format=Png" +
        "&isCircular=false";


    try {

        const data =
            await robloxFetch(url);


        const map =
            new Map();


        for (
            const item of
            data.data || []
        ) {

            map.set(
                String(item.targetId),
                item.imageUrl || null
            );

        }


        return map;

    } catch (error) {

        console.error(
            "[Thumbnails]",
            error.message
        );

        return new Map();

    }

}


/*
==================================================
 ICONS
==================================================
*/

async function getIcons(
    universeIds
) {

    const ids =
        universeIds
            .map(Number)
            .filter(
                Number.isFinite
            )
            .slice(0, 50);


    if (ids.length === 0) {
        return new Map();
    }


    const url =
        ROBLOX_THUMBNAILS +
        "/v1/games/icons" +
        "?universeIds=" +
        ids.join(",") +
        "&size=420x420" +
        "&format=Png" +
        "&isCircular=false";


    try {

        const data =
            await robloxFetch(url);


        const map =
            new Map();


        for (
            const item of
            data.data || []
        ) {

            map.set(
                String(item.targetId),
                item.imageUrl || null
            );

        }


        return map;

    } catch (error) {

        console.error(
            "[Icons]",
            error.message
        );

        return new Map();

    }

}


/*
==================================================
 FORMAT GAME
==================================================
*/

function formatGame(
    game,
    thumbnails,
    icons
) {

    const universeId =
        Number(game.id);


    return {

        universeId,

        placeId:
            game.rootPlaceId || null,

        name:
            game.name || "Unknown",

        description:
            game.description || "",

        creator:
            game.creator?.name ||
            "Unknown Creator",

        creatorId:
            game.creator?.id ||
            null,

        playing:
            Number(
                game.playing
            ) || 0,

        visits:
            Number(
                game.visits
            ) || 0,

        favorites:
            Number(
                game.favoritedCount
            ) || 0,

        thumbnail:
            thumbnails.get(
                String(universeId)
            ) || null,

        icon:
            icons.get(
                String(universeId)
            ) || null

    };

}


/*
==================================================
 ENRICH GAMES
==================================================
*/

async function enrichGames(
    games
) {

    if (
        !Array.isArray(games) ||
        games.length === 0
    ) {

        return [];

    }


    const ids =
        games
            .map(
                game =>
                    Number(
                        game.id ||
                        game.universeId
                    )
            )
            .filter(
                Number.isFinite
            );


    const [
        details,
        thumbnails,
        icons
    ] =
        await Promise.all([
            getGameDetails(ids),
            getThumbnails(ids),
            getIcons(ids)
        ]);


    return details.map(
        game =>
            formatGame(
                game,
                thumbnails,
                icons
            )
    );

}


/*
==================================================
 SEARCH ROBLOX
==================================================

This uses Roblox's public game-list route.

No local/demo game list is used.
==================================================
*/

async function searchRoblox(
    keyword
) {

    const clean =
        String(
            keyword || ""
        )
        .trim()
        .slice(0, 100);


    if (!clean) {
        return [];
    }


    const cacheKey =
        "search:" +
        clean.toLowerCase();


    const cached =
        getCache(cacheKey);


    if (cached) {
        return cached;
    }


    const params =
        new URLSearchParams();


    params.set(
        "model.keyword",
        clean
    );

    params.set(
        "model.maxRows",
        "50"
    );


    const url =
        ROBLOX_GAMES +
        "/v1/games/list?" +
        params.toString();


    const data =
        await robloxFetch(url);


    const rawGames =
        Array.isArray(
            data.games
        )
            ? data.games
            : Array.isArray(
                data.data
            )
                ? data.data
                : [];


    const games =
        await enrichGames(
            rawGames
        );


    setCache(
        cacheKey,
        games
    );


    return games;

}


/*
==================================================
 DISCOVERY
==================================================

Roblox's discovery endpoints can change.

We intentionally don't put fake game IDs here.

These searches are used only to discover REAL
Roblox experiences from Roblox's own service.
==================================================
*/

const DISCOVERY_TERMS = [
    "roblox",
    "simulator",
    "obby",
    "tycoon",
    "roleplay",
    "horror",
    "anime",
    "survival"
];


async function discoverGames() {

    const all =
        new Map();


    /*
        Run several Roblox searches.

        Every result comes from Roblox.
        Nothing is invented locally.
    */

    for (
        const term of
        DISCOVERY_TERMS
    ) {

        try {

            const games =
                await searchRoblox(
                    term
                );


            for (
                const game of
                games
            ) {

                if (
                    game.universeId
                ) {

                    all.set(
                        String(
                            game.universeId
                        ),
                        game
                    );

                }

            }

        } catch (error) {

            console.error(
                `[Discovery: ${term}]`,
                error.message
            );

        }

    }


    /*
        Sort real Roblox games by current
        player count.

        This is NOT claiming to be Roblox's
        official trending order.

        It simply makes the discovery page
        favor currently popular experiences.
    */

    return Array.from(
        all.values()
    )
    .sort(
        (a, b) =>
            (b.playing || 0) -
            (a.playing || 0)
    )
    .slice(
        0,
        50
    );

}


/*
==================================================
 HOME
==================================================
*/

app.get(
    "/api/home",
    async (req, res) => {

        try {

            const games =
                await discoverGames();


            const recommended =
                games.slice(
                    0,
                    12
                );


            const popular =
                games
                    .slice()
                    .sort(
                        (a, b) =>
                            (b.playing || 0) -
                            (a.playing || 0)
                    )
                    .slice(
                        0,
                        24
                    );


            res.json({
                success: true,

                recommended,

                popular
            });

        } catch (error) {

            console.error(
                "[HOME]",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to retrieve real Roblox experiences."

            });

        }

    }
);


/*
==================================================
 POPULAR
==================================================
*/

app.get(
    "/api/popular",
    async (req, res) => {

        try {

            const games =
                await discoverGames();


            res.json({

                success: true,

                games:
                    games
                        .sort(
                            (a, b) =>
                                (b.playing || 0) -
                                (a.playing || 0)
                        )
                        .slice(
                            0,
                            50
                        )

            });

        } catch (error) {

            console.error(
                "[POPULAR]",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to retrieve popular Roblox experiences."

            });

        }

    }
);


/*
==================================================
 SEARCH
==================================================
*/

app.get(
    "/api/search",
    async (req, res) => {

        try {

            const query =
                String(
                    req.query.q || ""
                )
                .trim();


            if (!query) {

                return res.json({

                    success: true,

                    games: []

                });

            }


            const games =
                await searchRoblox(
                    query
                );


            res.json({

                success: true,

                games

            });

        } catch (error) {

            console.error(
                "[SEARCH]",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Roblox search failed."

            });

        }

    }
);


/*
==================================================
 SINGLE GAME
==================================================
*/

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


            if (
                games.length === 0
            ) {

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
                    "Unable to retrieve the Roblox experience."

            });

        }

    }
);


/*
==================================================
 HEALTH CHECK
==================================================
*/

app.get(
    "/",
    (req, res) => {

        res.json({

            service:
                "WebBlox Backend",

            status:
                "online",

            source:
                "Roblox APIs",

            demoGames:
                false

        });

    }
);


app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status:
                "online",

            source:
                "Roblox",

            demoGames:
                false

        });

    }
);


/*
==================================================
 START
==================================================
*/

app.listen(
    PORT,
    () => {

        console.log(
            "===================================="
        );

        console.log(
            " WebBlox Backend"
        );

        console.log(
            "===================================="
        );

        console.log(
            `Running on port ${PORT}`
        );

        console.log(
            "Roblox data source: ENABLED"
        );

        console.log(
            "Demo games: DISABLED"
        );

    }
);
