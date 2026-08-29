/*
 * WebBlox Player Physics
 * Stage 3A
 *
 * Gravity
 * Ground detection
 * AABB collision
 * CanCollide support
 * Jump physics
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    const Physics = {};

    const GRAVITY = -196.2;
    const TERMINAL_VELOCITY = -120;

    const DEFAULT_JUMP_POWER = 50;

    const SKIN = 0.05;

    let worldObjects = null;

    function setup(objects) {
        worldObjects =
            objects instanceof Map
                ? objects
                : null;
    }

    function getCharacterBounds(character) {
        const width =
            character.userData.width ||
            2.5;

        const depth =
            character.userData.depth ||
            1.5;

        const height =
            character.userData.height ||
            5.4;

        return {
            width,
            depth,
            height,
            halfWidth:
                width / 2,
            halfDepth:
                depth / 2
        };
    }

    function getSolidObjects() {
        if (!worldObjects) {
            return [];
        }

        return Array.from(
            worldObjects.values()
        ).filter(object => {
            return (
                object &&
                (
                    object.type === "Part" ||
                    object.type === "SpawnLocation"
                ) &&
                object.canCollide !== false
            );
        });
    }

    function overlapsXZ(
        px,
        pz,
        halfWidth,
        halfDepth,
        object
    ) {
        const ox =
            Number(
                object.position?.x || 0
            );

        const oz =
            Number(
                object.position?.z || 0
            );

        const sx =
            Number(
                object.size?.x || 0
            );

        const sz =
            Number(
                object.size?.z || 0
            );

        return (
            Math.abs(
                px - ox
            ) <
                halfWidth +
                sx / 2 +
                SKIN &&
            Math.abs(
                pz - oz
            ) <
                halfDepth +
                sz / 2 +
                SKIN
        );
    }

    function objectTop(object) {
        return (
            Number(
                object.position?.y || 0
            ) +
            Number(
                object.size?.y || 0
            ) / 2
        );
    }

    function objectBottom(object) {
        return (
            Number(
                object.position?.y || 0
            ) -
            Number(
                object.size?.y || 0
            ) / 2
        );
    }

    function moveHorizontal(
        character,
        axis,
        amount
    ) {
        if (!amount) {
            return;
        }

        const bounds =
            getCharacterBounds(
                character
            );

        const position =
            character.position;

        const nextX =
            axis === "x"
                ? position.x + amount
                : position.x;

        const nextZ =
            axis === "z"
                ? position.z + amount
                : position.z;

        const solids =
            getSolidObjects();

        for (
            const object
            of solids
        ) {
            if (
                !overlapsXZ(
                    nextX,
                    nextZ,
                    bounds.halfWidth,
                    bounds.halfDepth,
                    object
                )
            ) {
                continue;
            }

            const top =
                objectTop(object);

            const bottom =
                objectBottom(object);

            const characterBottom =
                position.y;

            const characterTop =
                position.y +
                bounds.height;

            if (
                characterTop <=
                    bottom + SKIN ||
                characterBottom >=
                    top - SKIN
            ) {
                continue;
            }

            if (axis === "x") {
                if (amount > 0) {
                    position.x =
                        Number(
                            object.position.x
                        ) -
                        Number(
                            object.size.x
                        ) /
                            2 -
                        bounds.halfWidth -
                        SKIN;
                } else {
                    position.x =
                        Number(
                            object.position.x
                        ) +
                        Number(
                            object.size.x
                        ) /
                            2 +
                        bounds.halfWidth +
                        SKIN;
                }
            }

            if (axis === "z") {
                if (amount > 0) {
                    position.z =
                        Number(
                            object.position.z
                        ) -
                        Number(
                            object.size.z
                        ) /
                            2 -
                        bounds.halfDepth -
                        SKIN;
                } else {
                    position.z =
                        Number(
                            object.position.z
                        ) +
                        Number(
                            object.size.z
                        ) /
                            2 +
                        bounds.halfDepth +
                        SKIN;
                }
            }

            if (
                character.userData.runtime
            ) {
                if (axis === "x") {
                    character.userData.runtime
                        .velocity.x = 0;
                }

                if (axis === "z") {
                    character.userData.runtime
                        .velocity.z = 0;
                }
            }
        }
    }

    function resolveVertical(
        character,
        velocityY,
        delta
    ) {
        const runtime =
            character.userData.runtime;

        const bounds =
            getCharacterBounds(
                character
            );

        const position =
            character.position;

        const oldBottom =
            position.y;

        const nextY =
            position.y +
            velocityY *
            delta;

        const nextBottom =
            nextY;

        const nextTop =
            nextY +
            bounds.height;

        let grounded = false;

        if (velocityY <= 0) {
            for (
                const object
                of getSolidObjects()
            ) {
                if (
                    !overlapsXZ(
                        position.x,
                        position.z,
                        bounds.halfWidth,
                        bounds.halfDepth,
                        object
                    )
                ) {
                    continue;
                }

                const top =
                    objectTop(object);

                if (
                    oldBottom >=
                        top - SKIN &&
                    nextBottom <=
                        top + SKIN
                ) {
                    position.y =
                        top;

                    runtime.velocity.y =
                        0;

                    grounded = true;

                    break;
                }
            }
        }

        if (
            !grounded &&
            velocityY > 0
        ) {
            for (
                const object
                of getSolidObjects()
            ) {
                if (
                    !overlapsXZ(
                        position.x,
                        position.z,
                        bounds.halfWidth,
                        bounds.halfDepth,
                        object
                    )
                ) {
                    continue;
                }

                const bottom =
                    objectBottom(object);

                if (
                    oldBottom +
                        bounds.height <=
                        bottom + SKIN &&
                    nextTop >=
                        bottom - SKIN
                ) {
                    position.y =
                        bottom -
                        bounds.height;

                    runtime.velocity.y =
                        0;

                    break;
                }
            }
        }

        if (!grounded) {
            position.y =
                nextY;
        }

        runtime.grounded =
            grounded;

        return grounded;
    }

    function update(delta) {
        const character =
            PlayerSystem.character;

        if (!character) {
            return;
        }

        const runtime =
            character.userData.runtime;

        if (!runtime) {
            return;
        }

        if (
            !Number.isFinite(
                runtime.velocity.y
            )
        ) {
            runtime.velocity.y = 0;
        }

        runtime.velocity.y +=
            GRAVITY *
            delta;

        runtime.velocity.y =
            Math.max(
                runtime.velocity.y,
                TERMINAL_VELOCITY
            );

        resolveVertical(
            character,
            runtime.velocity.y,
            delta
        );

        if (
            character.position.y <
            -100
        ) {
            if (
                typeof PlayerSystem.respawn ===
                "function"
            ) {
                PlayerSystem.respawn();
            }
        }
    }

    function applyHorizontal(
        character,
        x,
        z
    ) {
        moveHorizontal(
            character,
            "x",
            x
        );

        moveHorizontal(
            character,
            "z",
            z
        );
    }

    function jump(character) {
        if (!character) {
            return false;
        }

        const runtime =
            character.userData.runtime;

        if (!runtime) {
            return false;
        }

        if (!runtime.grounded) {
            return false;
        }

        const humanoid =
            character.userData.humanoid;

        const jumpPower =
            humanoid?.jumpPower ||
            DEFAULT_JUMP_POWER;

        runtime.velocity.y =
            jumpPower;

        runtime.grounded =
            false;

        if (humanoid) {
            humanoid.state =
                "Jumping";
        }

        return true;
    }

    Physics.setup =
        setup;

    Physics.update =
        update;

    Physics.jump =
        jump;

    Physics.applyHorizontal =
        applyHorizontal;

    Physics.getSolidObjects =
        getSolidObjects;

    Physics.getCharacterBounds =
        getCharacterBounds;

    Physics.gravity =
        GRAVITY;

    PlayerSystem.physics =
        Physics;

})();
