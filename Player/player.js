/*
 * WebBlox Player Runtime
 *
 * Stage 3A
 *
 * Player
 * Character
 * Controller
 * Physics
 * Camera
 * Animations
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    let THREE = null;

    let playerScene = null;
    let playerCamera = null;
    let playerRenderer = null;

    let character = null;

    let running = false;

    let objects = null;

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

    function log(
        message,
        type = "info"
    ) {
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

        output.appendChild(
            line
        );

        output.scrollTop =
            output.scrollHeight;
    }

    function findSpawnLocation() {
        if (
            !objects ||
            !(objects instanceof Map)
        ) {
            return {
                x: 0,
                y: 2,
                z: 0
            };
        }

        const spawns =
            Array.from(
                objects.values()
            ).filter(
                object =>
                    object.type ===
                    "SpawnLocation"
            );

        if (!spawns.length) {
            return {
                x: 0,
                y: 2,
                z: 0
            };
        }

        const spawn =
            spawns[0];

        return {
            x:
                Number(
                    spawn.position?.x || 0
                ),

            y:
                Number(
                    spawn.position?.y || 0
                ) +
                Number(
                    spawn.size?.y || 1
                ) /
                    2,

            z:
                Number(
                    spawn.position?.z || 0
                )
        };
    }

    function createPlayerCharacter() {
        if (!THREE) {
            log(
                "Three.js is unavailable.",
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
                name:
                    "PlayerCharacter",

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

        const spawn =
            findSpawnLocation();

        character.position.set(
            spawn.x,
            spawn.y,
            spawn.z
        );

        const runtime =
            character.userData.runtime;

        runtime.spawnPosition = {
            x: spawn.x,
            y: spawn.y,
            z: spawn.z
        };

        runtime.velocity = {
            x: 0,
            y: 0,
            z: 0
        };

        runtime.grounded =
            false;

        runtime.input = {
            x: 0,
            z: 0,
            moving: false,
            sprint: false
        };

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
            player.maxHealth;

        PlayerSystem.character =
            character;

        PlayerSystem.player =
            player;

        log(
            `Player spawned at X:${Math.round(spawn.x)} Y:${Math.round(spawn.y)} Z:${Math.round(spawn.z)}.`
        );

        return character;
    }

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

        character = null;

        player.character =
            null;

        PlayerSystem.character =
            null;
    }

    function loadDependencies() {
        return new Promise(
            (resolve, reject) => {

                const required = [
                    "controller",
                    "physics",
                    "cameraSystem",
                    "animations"
                ];

                const missing =
                    required.filter(
                        name =>
                            !PlayerSystem[name]
                    );

                if (!missing.length) {
                    resolve();
                    return;
                }

                /*
                 * Studio normally loads player.js
                 * first, so load the remaining
                 * Player files here.
                 */

                const files = [
                    "./Player/character.js",
                    "./Player/controller.js",
                    "./Player/physics.js",
                    "./Player/camera.js",
                    "./Player/animations.js"
                ];

                let index = 0;

                function next() {
                    if (
                        index >=
                        files.length
                    ) {
                        resolve();
                        return;
                    }

                    const src =
                        files[index++];

                    const existing =
                        document.querySelector(
                            `script[src="${src}"]`
                        );

                    if (existing) {
                        next();
                        return;
                    }

                    const script =
                        document.createElement(
                            "script"
                        );

                    script.src =
                        src;

                    script.dataset
                        .webbloxPlayerPart =
                        "true";

                    script.onload =
                        next;

                    script.onerror =
                        () => {
                            reject(
                                new Error(
                                    `Unable to load ${src}`
                                )
                            );
                        };

                    document.head.appendChild(
                        script
                    );
                }

                next();
            }
        );
    }

    function start(options = {}) {
        if (running) {
            log(
                "Player runtime is already running."
            );

            return;
        }

        THREE =
            options.THREE ||
            window.THREE;

        playerScene =
            options.scene ||
            null;

        playerCamera =
            options.camera ||
            null;

        playerRenderer =
            options.renderer ||
            null;

        objects =
            options.objects ||
            null;

        if (!THREE) {
            log(
                "Three.js is unavailable.",
                "error"
            );

            return;
        }

        if (!playerScene) {
            log(
                "No runtime scene supplied.",
                "error"
            );

            return;
        }

        loadDependencies()
            .then(() => {
                running = true;

                player.alive =
                    true;

                player.health =
                    player.maxHealth;

                createPlayerCharacter();

                if (
                    PlayerSystem.physics
                ) {
                    PlayerSystem.physics.setup(
                        objects
                    );
                }

                if (
                    PlayerSystem.controller
                ) {
                    PlayerSystem.controller
                        .enable();
                }

                if (
                    PlayerSystem.cameraSystem
                ) {
                    PlayerSystem.cameraSystem
                        .setup({
                            camera:
                                playerCamera,

                            renderer:
                                playerRenderer
                        });
                }

                if (
                    PlayerSystem.animations
                ) {
                    PlayerSystem.animations
                        .setup();
                }

                log(
                    "Player runtime started."
                );

                log(
                    "R15 bacon-hair character loaded."
                );

                log(
                    "Physics enabled."
                );

                log(
                    "Controller enabled."
                );

                log(
                    "Third-person camera enabled."
                );

                log(
                    "Animations enabled."
                );
            })
            .catch(error => {
                console.error(
                    error
                );

                log(
                    error.message ||
                    "Player dependencies failed to load.",
                    "error"
                );
            });
    }

    function update(delta) {
        if (!running) {
            return;
        }

        if (!character) {
            return;
        }

        if (
            PlayerSystem.controller
        ) {
            PlayerSystem.controller
                .update(delta);
        }

        if (
            PlayerSystem.physics
        ) {
            PlayerSystem.physics
                .update(delta);
        }

        if (
            PlayerSystem.animations
        ) {
            PlayerSystem.animations
                .update(delta);
        }

        if (
            PlayerSystem.cameraSystem
        ) {
            PlayerSystem.cameraSystem
                .update(delta);
        }

        /*
         * Rotate character toward
         * its movement direction.
         */
        const runtime =
            character.userData.runtime;

        if (
            runtime?.input?.moving
        ) {
            const x =
                runtime.input.x;

            const z =
                runtime.input.z;

            if (
                Math.abs(x) +
                Math.abs(z) >
                0.001
            ) {
                const target =
                    Math.atan2(
                        x,
                        z
                    );

                let current =
                    character.rotation.y;

                let difference =
                    target -
                    current;

                while (
                    difference >
                    Math.PI
                ) {
                    difference -=
                        Math.PI * 2;
                }

                while (
                    difference <
                    -Math.PI
                ) {
                    difference +=
                        Math.PI * 2;
                }

                const turnSpeed =
                    12;

                current +=
                    difference *
                    Math.min(
                        1,
                        turnSpeed *
                        delta
                    );

                character.rotation.y =
                    current;
            }
        }
    }

    function applyMovement(
        moveX,
        moveZ,
        speed,
        delta
    ) {
        if (!character) {
            return;
        }

        if (
            !PlayerSystem.physics
        ) {
            return;
        }

        const distance =
            speed *
            delta;

        PlayerSystem.physics
            .applyHorizontal(
                character,
                moveX *
                    distance,
                moveZ *
                    distance
            );
    }

    function jump() {
        if (!character) {
            return false;
        }

        if (
            !PlayerSystem.physics
        ) {
            return false;
        }

        return PlayerSystem.physics
            .jump(character);
    }

    function stop() {
        if (!running) {
            return;
        }

        if (
            PlayerSystem.controller
        ) {
            PlayerSystem.controller
                .disable();
        }

        if (
            PlayerSystem.cameraSystem
        ) {
            PlayerSystem.cameraSystem
                .disable();
        }

        destroyPlayerCharacter();

        running = false;

        player.alive =
            false;

        log(
            "Player runtime stopped."
        );
    }

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
    }

    function getPlayer() {
        return player;
    }

    function getCharacter() {
        return character;
    }

    function isRunning() {
        return running;
    }

    function getRuntimeInfo() {
        return {
            running,

            player: {
                id:
                    player.id,

                name:
                    player.name,

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

    PlayerSystem.start =
        start;

    PlayerSystem.update =
        update;

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

    PlayerSystem.applyMovement =
        applyMovement;

    PlayerSystem.jump =
        jump;

    PlayerSystem.player =
        player;

})();
