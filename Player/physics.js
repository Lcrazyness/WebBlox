/*
 * WebBlox Physics System
 * Stage 3A+
 *
 * Existing file:
 * /Player/physics.js
 *
 * Handles:
 * - Gravity
 * - Ground detection
 * - Vertical movement
 * - Horizontal collision
 * - CanCollide
 * - Anchored
 * - Floor detection
 * - Character bounds
 * - Jump velocity
 * - Stable delta-time physics
 *
 * IMPORTANT:
 * This file does NOT control camera movement.
 * This file does NOT decide what W/A/S/D means.
 *
 * controller.js = input
 * physics.js    = physical simulation
 * camera.js     = camera
 * player.js     = runtime coordinator
 */

(() => {
    "use strict";


    // ============================================================
    // GLOBAL
    // ============================================================

    if (
        window.WebBloxPhysics &&
        window.WebBloxPhysics.__stage
    ) {

        console.warn(
            "[WebBlox Physics] Physics system already initialized."
        );

        return;

    }


    // ============================================================
    // CONSTANTS
    // ============================================================

    const DEFAULT_GRAVITY =
        30;


    const DEFAULT_STEP_HEIGHT =
        1.25;


    const DEFAULT_FLOOR =
        -0.5;


    const DEFAULT_CHARACTER_HEIGHT =
        5;


    const DEFAULT_CHARACTER_WIDTH =
        2;


    const DEFAULT_CHARACTER_DEPTH =
        1;


    const EPSILON =
        0.0001;


    // ============================================================
    // STATE
    // ============================================================

    const physicsState = {

        enabled:
            true,

        gravity:
            DEFAULT_GRAVITY,

        stepHeight:
            DEFAULT_STEP_HEIGHT,

        floor:
            DEFAULT_FLOOR,

        characterHeight:
            DEFAULT_CHARACTER_HEIGHT,

        characterWidth:
            DEFAULT_CHARACTER_WIDTH,

        characterDepth:
            DEFAULT_CHARACTER_DEPTH,

        grounded:
            false,

        verticalVelocity:
            0,

        lastDelta:
            0,

        objects:
            [],

        character:
            null

    };


    // ============================================================
    // HELPERS
    // ============================================================

    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );

    }


    function number(
        value,
        fallback = 0
    ) {

        const n =
            Number(value);


        return Number.isFinite(n)
            ? n
            : fallback;

    }


    function positive(
        value,
        fallback = 1
    ) {

        return Math.max(
            EPSILON,
            number(
                value,
                fallback
            )
        );

    }


    // ============================================================
    // GET PLAYER
    // ============================================================

    function getPlayer() {

        return window.WebBloxPlayer ||
            null;

    }


    // ============================================================
    // GET CONTROLLER
    // ============================================================

    function getController() {

        return window.WebBloxController ||
            null;

    }


    // ============================================================
    // GET PLAYER STATE
    // ============================================================

    function getPlayerState() {

        return getPlayer()?.state ||
            null;

    }


    // ============================================================
    // GET CHARACTER
    // ============================================================

    function getCharacter() {

        const state =
            getPlayerState();


        return state?.character ||
            null;

    }


    // ============================================================
    // SETUP
    // ============================================================

    function configure(
        options = {}
    ) {

        if (
            options.gravity !==
            undefined
        ) {

            physicsState.gravity =
                Math.max(
                    0,
                    number(
                        options.gravity,
                        DEFAULT_GRAVITY
                    )
                );

        }


        if (
            options.stepHeight !==
            undefined
        ) {

            physicsState.stepHeight =
                Math.max(
                    0,
                    number(
                        options.stepHeight,
                        DEFAULT_STEP_HEIGHT
                    )
                );

        }


        if (
            options.floor !==
            undefined
        ) {

            physicsState.floor =
                number(
                    options.floor,
                    DEFAULT_FLOOR
                );

        }


        if (
            options.characterHeight !==
            undefined
        ) {

            physicsState.characterHeight =
                positive(
                    options.characterHeight,
                    DEFAULT_CHARACTER_HEIGHT
                );

        }


        if (
            options.characterWidth !==
            undefined
        ) {

            physicsState.characterWidth =
                positive(
                    options.characterWidth,
                    DEFAULT_CHARACTER_WIDTH
                );

        }


        if (
            options.characterDepth !==
            undefined
        ) {

            physicsState.characterDepth =
                positive(
                    options.characterDepth,
                    DEFAULT_CHARACTER_DEPTH
                );

        }


        return getState();

    }


    // ============================================================
    // LOAD RUNTIME OBJECTS
    // ============================================================

    function setObjects(
        objects = []
    ) {

        physicsState.objects =
            Array.isArray(objects)
                ? objects
                : [];


        return physicsState.objects;

    }


    // ============================================================
    // SET CHARACTER
    // ============================================================

    function setCharacter(
        character
    ) {

        physicsState.character =
            character ||
            null;


        if (
            character?.userData
        ) {

            physicsState.characterHeight =
                positive(
                    character.userData.height,
                    DEFAULT_CHARACTER_HEIGHT
                );


            physicsState.characterWidth =
                positive(
                    character.userData.width,
                    DEFAULT_CHARACTER_WIDTH
                );


            physicsState.characterDepth =
                positive(
                    character.userData.depth,
                    DEFAULT_CHARACTER_DEPTH
                );

        }


        return physicsState.character;

    }


    // ============================================================
    // CHARACTER BOX
    // ============================================================

    function getCharacterBox(
        position
    ) {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            return null;

        }


        const x =
            position?.x ??
            character.position.x;


        const y =
            position?.y ??
            character.position.y;


        const z =
            position?.z ??
            character.position.z;


        return {

            minX:
                x -
                physicsState.characterWidth /
                2,

            maxX:
                x +
                physicsState.characterWidth /
                2,

            minY:
                y,

            maxY:
                y +
                physicsState.characterHeight,

            minZ:
                z -
                physicsState.characterDepth /
                2,

            maxZ:
                z +
                physicsState.characterDepth /
                2

        };

    }


    // ============================================================
    // OBJECT POSITION
    // ============================================================

    function objectPosition(
        object
    ) {

        const source =
            object?.object ||
            object;


        const mesh =
            object?.mesh ||
            object?.runtimeMesh ||
            null;


        return {

            x:
                number(
                    mesh?.position?.x ??
                    source?.position?.x,
                    0
                ),

            y:
                number(
                    mesh?.position?.y ??
                    source?.position?.y,
                    0
                ),

            z:
                number(
                    mesh?.position?.z ??
                    source?.position?.z,
                    0
                )

        };

    }


    // ============================================================
    // OBJECT SIZE
    // ============================================================

    function objectSize(
        object
    ) {

        const source =
            object?.object ||
            object;


        const itemSize =
            object?.size;


        return {

            x:
                positive(
                    itemSize?.x ??
                    source?.size?.x,
                    1
                ),

            y:
                positive(
                    itemSize?.y ??
                    source?.size?.y,
                    1
                ),

            z:
                positive(
                    itemSize?.z ??
                    source?.size?.z,
                    1
                )

        };

    }


    // ============================================================
    // CAN COLLIDE
    // ============================================================

    function canCollide(
        object
    ) {

        const source =
            object?.object ||
            object;


        if (
            !source
        ) {

            return false;

        }


        if (
            source.canCollide ===
            false
        ) {

            return false;

        }


        if (
            source.CanCollide ===
            false
        ) {

            return false;

        }


        if (
            object?.mesh?.userData?.canCollide ===
            false
        ) {

            return false;

        }


        return true;

    }


    // ============================================================
    // ANCHORED
    // ============================================================

    function isAnchored(
        object
    ) {

        const source =
            object?.object ||
            object;


        if (
            !source
        ) {

            return true;

        }


        if (
            source.anchored ===
            false
        ) {

            return false;

        }


        if (
            source.Anchored ===
            false
        ) {

            return false;

        }


        return true;

    }


    // ============================================================
    // OBJECT BOX
    // ============================================================

    function getObjectBox(
        object
    ) {

        if (
            !object
        ) {

            return null;

        }


        const position =
            objectPosition(
                object
            );


        const size =
            objectSize(
                object
            );


        return {

            minX:
                position.x -
                size.x /
                2,

            maxX:
                position.x +
                size.x /
                2,

            minY:
                position.y -
                size.y /
                2,

            maxY:
                position.y +
                size.y /
                2,

            minZ:
                position.z -
                size.z /
                2,

            maxZ:
                position.z +
                size.z /
                2

        };

    }


    // ============================================================
    // BOX OVERLAP
    // ============================================================

    function overlaps(
        a,
        b
    ) {

        if (
            !a ||
            !b
        ) {

            return false;

        }


        return (

            a.minX <
            b.maxX &&

            a.maxX >
            b.minX &&

            a.minY <
            b.maxY &&

            a.maxY >
            b.minY &&

            a.minZ <
            b.maxZ &&

            a.maxZ >
            b.minZ

        );

    }


    // ============================================================
    // HORIZONTAL OVERLAP
    // ============================================================

    function overlapsHorizontal(
        a,
        b
    ) {

        if (
            !a ||
            !b
        ) {

            return false;

        }


        return (

            a.minX <
            b.maxX &&

            a.maxX >
            b.minX &&

            a.minZ <
            b.maxZ &&

            a.maxZ >
            b.minZ

        );

    }


    // ============================================================
    // GET COLLIDERS
    // ============================================================

    function getColliders() {

        return physicsState.objects.filter(
            object =>
                canCollide(
                    object
                )
        );

    }


    // ============================================================
    // FLOOR
    // ============================================================

    function getFloorAt(
        x,
        z,
        currentY
    ) {

        let floor =
            physicsState.floor;


        for (
            const object
            of getColliders()
        ) {

            const box =
                getObjectBox(
                    object
                );


            if (
                !box
            ) {

                continue;

            }


            if (
                x <
                box.minX ||
                x >
                box.maxX
            ) {

                continue;

            }


            if (
                z <
                box.minZ ||
                z >
                box.maxZ
            ) {

                continue;

            }


            /*
             * Do not use a platform far above the player as the
             * current floor.
             *
             * This keeps the character from snapping upward through
             * structures.
             */

            if (
                box.maxY <=
                currentY +
                physicsState.stepHeight +
                physicsState.characterHeight
            ) {

                floor =
                    Math.max(
                        floor,
                        box.maxY
                    );

            }

        }


        return floor;

    }


    // ============================================================
    // GROUND CHECK
    // ============================================================

    function checkGrounded() {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            physicsState.grounded =
                false;


            return false;

        }


        const x =
            character.position.x;


        const y =
            character.position.y;


        const z =
            character.position.z;


        const floor =
            getFloorAt(
                x,
                z,
                y
            );


        const touchingFloor =
            y <=
            floor +
            0.08;


        if (
            touchingFloor
        ) {

            physicsState.grounded =
                true;

            return true;

        }


        const characterBox =
            getCharacterBox(
                {
                    x,
                    y,
                    z
                }
            );


        for (
            const object
            of getColliders()
        ) {

            const box =
                getObjectBox(
                    object
                );


            if (
                !box
            ) {

                continue;

            }


            const verticalDistance =
                Math.abs(
                    characterBox.minY -
                    box.maxY
                );


            if (
                verticalDistance >
                0.1
            ) {

                continue;

            }


            if (
                overlapsHorizontal(
                    characterBox,
                    box
                )
            ) {

                physicsState.grounded =
                    true;

                return true;

            }

        }


        physicsState.grounded =
            false;


        return false;

    }


    // ============================================================
    // HORIZONTAL COLLISION TEST
    // ============================================================

    function checkHorizontalCollision(
        position
    ) {

        const testBox =
            getCharacterBox(
                position
            );


        if (
            !testBox
        ) {

            return {

                collision:
                    false,

                objects:
                    []

            };

        }


        const collisions =
            [];


        for (
            const object
            of getColliders()
        ) {

            const box =
                getObjectBox(
                    object
                );


            if (
                !box
            ) {

                continue;

            }


            if (
                overlaps(
                    testBox,
                    box
                )
            ) {

                collisions.push(
                    object
                );

            }

        }


        return {

            collision:
                collisions.length >
                0,

            objects:
                collisions

        };

    }


    // ============================================================
    // MOVE HORIZONTAL
    // ============================================================

    function moveHorizontal(
        dx,
        dz
    ) {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            return {

                x:
                    0,

                z:
                    0,

                collided:
                    false

            };

        }


        if (
            !physicsState.enabled
        ) {

            return {

                x:
                    dx,

                z:
                    dz,

                collided:
                    false

            };

        }


        const oldX =
            character.position.x;


        const oldZ =
            character.position.z;


        let finalX =
            oldX;


        let finalZ =
            oldZ;


        let collided =
            false;


        // --------------------------------------------------------
        // Try X independently.
        // --------------------------------------------------------

        if (
            Math.abs(dx) >
            EPSILON
        ) {

            const xTest =
                checkHorizontalCollision(
                    {
                        x:
                            oldX +
                            dx,

                        y:
                            character.position.y,

                        z:
                            oldZ

                    }
                );


            if (
                !xTest.collision
            ) {

                finalX =
                    oldX +
                    dx;

            } else {

                collided =
                    true;

            }

        }


        // --------------------------------------------------------
        // Try Z independently.
        // --------------------------------------------------------

        if (
            Math.abs(dz) >
            EPSILON
        ) {

            const zTest =
                checkHorizontalCollision(
                    {
                        x:
                            finalX,

                        y:
                            character.position.y,

                        z:
                            oldZ +
                            dz

                    }
                );


            if (
                !zTest.collision
            ) {

                finalZ =
                    oldZ +
                    dz;

            } else {

                collided =
                    true;

            }

        }


        // --------------------------------------------------------
        // Step-up support.
        //
        // Allows the player to move over a small ledge instead of
        // getting permanently stuck against every small part.
        // --------------------------------------------------------

        if (
            collided
        ) {

            const currentY =
                character.position.y;


            const raisedY =
                currentY +
                physicsState.stepHeight;


            const raisedTest =
                checkHorizontalCollision(
                    {
                        x:
                            oldX +
                            dx,

                        y:
                            raisedY,

                        z:
                            oldZ +
                            dz

                    }
                );


            if (
                !raisedTest.collision
            ) {

                character.position.y =
                    raisedY;


                finalX =
                    oldX +
                    dx;


                finalZ =
                    oldZ +
                    dz;


                physicsState.verticalVelocity =
                    0;

            }

        }


        character.position.x =
            finalX;


        character.position.z =
            finalZ;


        return {

            x:
                finalX -
                oldX,

            z:
                finalZ -
                oldZ,

            collided

        };

    }


    // ============================================================
    // MOVE VERTICAL
    // ============================================================

    function moveVertical(
        delta
    ) {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            return {

                moved:
                    0,

                grounded:
                    false

            };

        }


        const oldY =
            character.position.y;


        const oldVelocity =
            physicsState.verticalVelocity;


        physicsState.verticalVelocity =
            oldVelocity +
            (
                physicsState.gravity *
                -1 *
                delta
            );


        const desiredY =
            oldY +
            physicsState.verticalVelocity *
            delta;


        const oldBox =
            getCharacterBox(
                {
                    x:
                        character.position.x,

                    y:
                        oldY,

                    z:
                        character.position.z

                }
            );


        const newBox =
            getCharacterBox(
                {
                    x:
                        character.position.x,

                    y:
                        desiredY,

                    z:
                        character.position.z

                }
            );


        let finalY =
            desiredY;


        let grounded =
            false;


        for (
            const object
            of getColliders()
        ) {

            const box =
                getObjectBox(
                    object
                );


            if (
                !box ||
                !overlaps(
                    newBox,
                    box
                )
            ) {

                continue;

            }


            // ----------------------------------------------------
            // Falling onto a part.
            // ----------------------------------------------------

            if (
                physicsState.verticalVelocity <=
                    0 &&
                oldBox.minY >=
                    box.maxY -
                    0.1
            ) {

                finalY =
                    box.maxY;


                physicsState.verticalVelocity =
                    0;


                grounded =
                    true;


                continue;

            }


            // ----------------------------------------------------
            // Head collision.
            // ----------------------------------------------------

            if (
                physicsState.verticalVelocity >
                    0 &&
                oldBox.maxY <=
                    box.minY +
                    0.1
            ) {

                finalY =
                    box.minY -
                    physicsState.characterHeight;


                physicsState.verticalVelocity =
                    0;

            }

        }


        // --------------------------------------------------------
        // World floor.
        // --------------------------------------------------------

        const floor =
            getFloorAt(

                character.position.x,

                character.position.z,

                oldY

            );


        if (
            finalY <=
            floor
        ) {

            finalY =
                floor;


            physicsState.verticalVelocity =
                0;


            grounded =
                true;

        }


        character.position.y =
            finalY;


        physicsState.grounded =
            grounded;


        return {

            moved:
                finalY -
                oldY,

            grounded

        };

    }


    // ============================================================
    // JUMP
    // ============================================================

    function jump(
        power
    ) {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            return false;

        }


        checkGrounded();


        if (
            !physicsState.grounded
        ) {

            return false;

        }


        const value =
            Math.max(

                0,

                number(
                    power,
                    11
                )

            );


        physicsState.verticalVelocity =
            value;


        physicsState.grounded =
            false;


        const player =
            getPlayer();


        if (
            player?.state
        ) {

            player.state.velocity.y =
                value;

            player.state.grounded =
                false;

        }


        return true;

    }


    // ============================================================
    // APPLY DIRECTION
    // ============================================================

    function move(
        x,
        z,
        speed,
        delta
    ) {

        const actualSpeed =
            Math.max(
                0,
                number(
                    speed,
                    0
                )
            );


        const dt =
            clamp(
                number(
                    delta,
                    1 / 60
                ),
                0,
                0.1
            );


        const dx =
            number(x) *
            actualSpeed *
            dt;


        const dz =
            number(z) *
            actualSpeed *
            dt;


        return moveHorizontal(
            dx,
            dz
        );

    }


    // ============================================================
    // UPDATE
    // ============================================================

    function update(
        delta
    ) {

        const character =
            physicsState.character ||
            getCharacter();


        if (
            !character
        ) {

            return getState();

        }


        const dt =
            clamp(

                number(
                    delta,
                    1 / 60
                ),

                0,

                0.1

            );


        physicsState.lastDelta =
            dt;


        // --------------------------------------------------------
        // Player state takes priority for settings when available.
        // --------------------------------------------------------

        const player =
            getPlayer();


        if (
            player?.state
        ) {

            const settings =
                player.state.settings ||
                {};


            if (
                Number.isFinite(
                    Number(
                        settings.gravity
                    )
                )
            ) {

                physicsState.gravity =
                    Number(
                        settings.gravity
                    );

            }

        }


        // --------------------------------------------------------
        // Read controller movement.
        // --------------------------------------------------------

        const controller =
            getController();


        let axis = {

            x:
                0,

            z:
                0

        };


        if (
            controller?.getMovement
        ) {

            axis =
                controller.getMovement();

        } else if (
            player?.state
        ) {

            /*
             * Fallback for older player.js.
             *
             * This fallback is still WORLD-RELATIVE.
             */
            const keys =
                player.state.keys;


            if (
                keys?.has("a")
            ) {

                axis.x -=
                    1;

            }


            if (
                keys?.has("d")
            ) {

                axis.x +=
                    1;

            }


            if (
                keys?.has("w")
            ) {

                axis.z -=
                    1;

            }


            if (
                keys?.has("s")
            ) {

                axis.z +=
                    1;

            }


            const magnitude =
                Math.hypot(
                    axis.x,
                    axis.z
                );


            if (
                magnitude >
                0
            ) {

                axis.x /=
                    magnitude;

                axis.z /=
                    magnitude;

            }

        }


        // --------------------------------------------------------
        // Speed.
        // --------------------------------------------------------

        let walkSpeed =
            12;


        let runSpeed =
            16;


        if (
            player?.state?.settings
        ) {

            walkSpeed =
                Math.max(

                    0,

                    number(
                        player.state.settings.walkSpeed,
                        12
                    )

                );


            runSpeed =
                Math.max(

                    0,

                    number(
                        player.state.settings.runSpeed ||
                        player.state.settings.sprintSpeed,
                        16
                    )

                );

        }


        const sprinting =
            controller?.isSprinting
                ? controller.isSprinting()
                : false;


        const speed =
            sprinting
                ? runSpeed
                : walkSpeed;


        // --------------------------------------------------------
        // Horizontal physics.
        // --------------------------------------------------------

        move(
            axis.x,
            axis.z,
            speed,
            dt
        );


        // --------------------------------------------------------
        // Ground state before jumping.
        // --------------------------------------------------------

        checkGrounded();


        // --------------------------------------------------------
        // Jump.
        // --------------------------------------------------------

        const jumpHeld =
            controller?.isJumpHeld
                ? controller.isJumpHeld()
                : false;


        if (
            jumpHeld &&
            physicsState.grounded
        ) {

            /*
             * The controller only reports whether the button is held.
             * The player runtime also guards repeated jumps.
             */
            if (
                !physicsState.__jumpConsumed
            ) {

                const jumpPower =
                    number(

                        player?.state?.settings
                            ?.jumpPower,

                        11

                    );


                jump(
                    jumpPower
                );


                physicsState.__jumpConsumed =
                    true;

            }

        } else if (
            !jumpHeld
        ) {

            physicsState.__jumpConsumed =
                false;

        }


        // --------------------------------------------------------
        // Vertical physics.
        // --------------------------------------------------------

        moveVertical(
            dt
        );


        // --------------------------------------------------------
        // Sync back to Player.
        // --------------------------------------------------------

        syncToPlayer();


        return getState();

    }


    // ============================================================
    // SYNC TO PLAYER
    // ============================================================

    function syncToPlayer() {

        const player =
            getPlayer();


        if (
            !player?.state
        ) {

            return;

        }


        player.state.grounded =
            physicsState.grounded;


        player.state.velocity.y =
            physicsState.verticalVelocity;


        if (
            player.state.character
        ) {

            player.state.character.userData
                .runtime ||= {};


            player.state.character.userData.runtime.grounded =
                physicsState.grounded;


            player.state.character.userData.runtime.velocity =
                player.state.velocity;

        }

    }


    // ============================================================
    // RESET
    // ============================================================

    function reset() {

        physicsState.verticalVelocity =
            0;


        physicsState.grounded =
            false;


        physicsState.__jumpConsumed =
            false;


        physicsState.lastDelta =
            0;


        syncToPlayer();


        return getState();

    }


    // ============================================================
    // GET VELOCITY
    // ============================================================

    function getVelocity() {

        return {

            x:
                number(
                    getPlayer()?.state?.velocity?.x,
                    0
                ),

            y:
                physicsState.verticalVelocity,

            z:
                number(
                    getPlayer()?.state?.velocity?.z,
                    0
                )

        };

    }


    // ============================================================
    // GET STATE
    // ============================================================

    function getState() {

        return {

            enabled:
                physicsState.enabled,

            gravity:
                physicsState.gravity,

            grounded:
                physicsState.grounded,

            verticalVelocity:
                physicsState.verticalVelocity,

            velocity:
                getVelocity(),

            character:
                !!(
                    physicsState.character ||
                    getCharacter()
                ),

            characterHeight:
                physicsState.characterHeight,

            characterWidth:
                physicsState.characterWidth,

            characterDepth:
                physicsState.characterDepth,

            objectCount:
                physicsState.objects.length

        };

    }


    // ============================================================
    // ENABLE
    // ============================================================

    function enable() {

        physicsState.enabled =
            true;


        return true;

    }


    // ============================================================
    // DISABLE
    // ============================================================

    function disable() {

        physicsState.enabled =
            false;


        physicsState.grounded =
            false;


        physicsState.verticalVelocity =
            0;


        syncToPlayer();


        return true;

    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxPhysics = {

        __stage:
            "3A+",

        version:
            "3A.2",

        state:
            physicsState,

        configure,

        setObjects,

        setCharacter,

        getCharacterBox,

        getObjectBox,

        canCollide,

        isAnchored,

        overlaps,

        overlapsHorizontal,

        getFloorAt,

        checkGrounded,

        checkHorizontalCollision,

        moveHorizontal,

        moveVertical,

        move,

        jump,

        update,

        reset,

        enable,

        disable,

        getVelocity,

        getState

    };


    // ============================================================
    // READY
    // ============================================================

    console.log(
        "[WebBlox Physics] Physics system loaded."
    );


    console.log(
        "[WebBlox Physics] CanCollide is supported."
    );


    console.log(
        "[WebBlox Physics] Gravity and jumping are active."
    );


    console.log(
        "[WebBlox Physics] Physics is independent from camera controls."
    );

})();
