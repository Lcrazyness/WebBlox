/*
 * WebBlox Player Runtime
 *
 * Stage 3A
 * - Player runtime
 * - Character spawning
 * - SpawnLocation support
 * - R15 character
 * - Bacon hair
 * - Play/Stop integration
 *
 * IMPORTANT:
 * This is separate from Studio's editor objects.
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    let THREE = null;

    let playerScene = null;

    let character = null;

    let playerObject = null;

    let running = false;

    /*
     * Runtime player information.
     */

    const player = {
        id: "Player_1",

        name: "Player",

        displayName: "Player",

        userId: 0,

        character: null,

        cameraMode: "ThirdPerson",

        alive: true,

        health: 100,

        maxHealth: 100,

        team: null,

        leaderstats: {}
    };

    /*
     * ============================================================
     * THREE
     * ============================================================
     */

    function getThree() {
        if (window.THREE) {
            THREE = window.THREE;
            return THREE;
        }

        return null;
    }

    /*
     * ============================================================
     * STUDIO STATE
     * ============================================================
     */

    function getStudioState() {
        return (
            window.WebBloxStudio &&
            window.WebBloxStudio.state
        ) || null;
    }

    /*
     * ============================================================
     * LOGGING
     * ============================================================
     */

    function log(message, type = "info") {
        console.log(
            `[WebBlox Player] ${message}`
        );

        const output =
            document.getElementById(
                "outputConsole"
            );

        if (!output) {
            return;
        }

        const line =
            document.createElement(
                "div"
            );

        line.className =
            `console-line console-${type}`;

        line.textContent =
            `[Player] ${message}`;

        output.appendChild(line);

        output.scrollTop =
            output.scrollHeight;
    }

    /*
     * ============================================================
     * SPAWN LOCATION
     * ============================================================
     */

    function findSpawnLocation() {
        const studio =
            getStudioState();

        if (!studio) {
            return {
                x: 0,
                y: 2,
                z: 0
            };
        }

        /*
         * Find actual SpawnLocation objects
         * created inside Studio.
         */

        const spawns =
            Array.from(
                studio.objects.values()
            ).filter(
                object =>
                    object.type ===
                    "SpawnLocation"
            );

        if (!spawns.length) {
            /*
             * No spawn exists.
             * Use the world origin.
             */

            return {
                x: 0,
                y: 2,
                z: 0
            };
        }

        /*
         * Use the first SpawnLocation
         * for Stage 3A.
         */

        const spawn =
            spawns[0];

        return {
            x: Number(
                spawn.position?.x || 0
            ),

            /*
             * Put the character above the
             * spawn pad rather than inside it.
             */

            y:
                Number(
                    spawn.position?.y || 0
                ) +
                Number(
                    spawn.size?.y || 1
                ) / 2 +
                2.7,

            z: Number(
                spawn.position?.z || 0
            )
        };
    }

    /*
     * ============================================================
     * CHARACTER CREATION
     * ============================================================
     */

    function createPlayerCharacter() {
        const THREE_LOCAL =
            getThree();

        if (!THREE_LOCAL) {
            log(
                "Cannot create character because Three.js is unavailable.",
                "error"
            );

            return null;
        }

        if (
            !PlayerSystem.createCharacter
        ) {
            log(
                "character.js has not loaded.",
                "error"
            );

            return null;
        }

        if (character) {
            destroyPlayerCharacter();
        }

        character =
            PlayerSystem.createCharacter({
                name: "PlayerCharacter",

                playerId:
                    player.id,

                shirtColor:
                    "#4b74c9",

                pantsColor:
                    "#303030"
            });

        if (!character) {
            return null;
        }

        /*
         * Character starts at the spawn.
         */

        const spawn =
            findSpawnLocation();

        character.position.set(
            spawn.x,
            spawn.y,
            spawn.z
        );

        character.userData.runtime
            .spawnPosition = {
                x: spawn.x,
                y: spawn.y,
                z: spawn.z
            };

        /*
         * Add the character to the
         * runtime scene.
         */

        if (playerScene) {
            playerScene.add(
                character
            );
        }

        player.character =
            character;

        player.alive =
            true;

        player.health =
            100;

        /*
         * Expose references.
         */

        PlayerSystem.character =
            character;

        PlayerSystem.player =
            player;

        log(
            `Character spawned at X:${Math.round(spawn.x)} Y:${Math.round(spawn.y)} Z:${Math.round(spawn.z)}.`
        );

        return character;
    }

    /*
     * ============================================================
     * DESTROY CHARACTER
     * ============================================================
     */

    function destroyPlayerCharacter() {
        if (!character) {
            return;
        }

        if (
            PlayerSystem.destroyCharacter
        ) {
            PlayerSystem.destroyCharacter(
                character
            );
        } else if (
            character.parent
        ) {
            character.parent.remove(
                character
            );
        }

        character =
            null;

        player.character =
            null;

        PlayerSystem.character =
            null;
    }

    /*
     * ============================================================
     * START
     * ============================================================
     */

    function start(scene) {
        if (running) {
            log(
                "Player runtime is already running."
            );

            return;
        }

        const THREE_LOCAL =
            getThree();

        if (!THREE_LOCAL) {
            log(
                "Three.js is unavailable.",
                "error"
            );

            return;
        }

        playerScene =
            scene ||
            window.WebBloxStudio?.scene ||
            null;

        if (!playerScene) {
            log(
                "No runtime scene was supplied.",
                "error"
            );

            return;
        }

        running = true;

        playerObject = {
            id: player.id,

            name: player.name,

            displayName:
                player.displayName,

            userId:
                player.userId,

            character: null
        };

        player.alive =
            true;

        player.health =
            player.maxHealth;

        /*
         * Create the actual character.
         */

        createPlayerCharacter();

        log(
            "Player runtime started."
        );

        log(
            "Player character created."
        );

        log(
            "R15 character initialized."
        );

        log(
            "Bacon hair initialized."
        );
    }

    /*
     * ============================================================
     * STOP
     * ============================================================
     */

    function stop() {
        if (!running) {
            return;
        }

        destroyPlayerCharacter();

        playerScene =
            null;

        playerObject =
            null;

        running =
            false;

        player.alive =
            false;

        log(
            "Player runtime stopped."
        );
    }

    /*
     * ============================================================
     * RESPAWN
     * ============================================================
     */

    function respawn() {
        if (!running) {
            return;
        }

        log(
            "Respawning player..."
        );

        destroyPlayerCharacter();

        player.alive =
            true;

        player.health =
            player.maxHealth;

        createPlayerCharacter();

        log(
            "Player respawned."
        );
    }

    /*
     * ============================================================
     * GET PLAYER
     * ============================================================
     */

    function getPlayer() {
        return player;
    }

    /*
     * ============================================================
     * GET CHARACTER
     * ============================================================
     */

    function getCharacter() {
        return character;
    }

    /*
     * ============================================================
     * IS RUNNING
     * ============================================================
     */

    function isRunning() {
        return running;
    }

    /*
     * ============================================================
     * DEBUG INFORMATION
     * ============================================================
     */

    function getRuntimeInfo() {
        return {
            running,

            player: {
                id: player.id,

                name: player.name,

                displayName:
                    player.displayName,

                userId:
                    player.userId,

                alive:
                    player.alive,

                health:
                    player.health,

                maxHealth:
                    player.maxHealth
            },

            character:
                character
                    ? {
                          name:
                              character.name,

                          rigType:
                              character.userData
                                  .characterType,

                          position: {
                              x:
                                  character
                                      .position
                                      .x,

                              y:
                                  character
                                      .position
                                      .y,

                              z:
                                  character
                                      .position
                                      .z
                          }
                      }
                    : null
        };
    }

    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    PlayerSystem.start =
        start;

    PlayerSystem.stop =
        stop;

    PlayerSystem.respawn =
        respawn;

    PlayerSystem.getPlayer =
        getPlayer;

    PlayerSystem.getCharacter =
        getCharacter;

    PlayerSystem.isRunning =
        isRunning;

    PlayerSystem.getRuntimeInfo =
        getRuntimeInfo;

    PlayerSystem.player =
        player;

})();
