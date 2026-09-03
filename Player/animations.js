/*
 * WebBlox Character Animation System
 *
 * Existing-file replacement:
 * /Player/animations.js
 *
 * Designed for the built-in WebBlox R6 character created by
 * Player/player.js.
 *
 * States:
 * - Idle
 * - Walking
 * - Running
 * - Jumping
 * - Freefall
 * - Landing
 *
 * The animation system uses the character's existing pivot groups.
 */

(() => {
    "use strict";


    // ============================================================
    // GLOBAL
    // ============================================================

    const AnimationSystem = {

        version:
            "1.0.0",

        active:
            false,

        character:
            null,

        state:
            "Idle",

        time:
            0,

        previousGrounded:
            false,

        speedMultiplier:
            1

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


    function lerp(
        a,
        b,
        alpha
    ) {

        return (
            a +
            (
                b -
                a
            ) *
            alpha
        );

    }


    function approach(
        current,
        target,
        amount
    ) {

        return lerp(
            current,
            target,
            clamp(
                amount,
                0,
                1
            )
        );

    }


    // ============================================================
    // GET PLAYER
    // ============================================================

    function getPlayer() {

        if (
            window.WebBloxPlayer
        ) {

            return window.WebBloxPlayer;

        }


        return null;

    }


    // ============================================================
    // GET CHARACTER
    // ============================================================

    function getCharacter() {

        const player =
            getPlayer();


        if (
            player?.state?.character
        ) {

            return player.state.character;

        }


        return null;

    }


    // ============================================================
    // GET PIVOTS
    // ============================================================

    function getPivots(
        character
    ) {

        if (
            !character
        ) {

            return null;

        }


        return character.userData?.animationPivots ||
               null;

    }


    // ============================================================
    // RESET POSE
    // ============================================================

    function resetPose(
        character
    ) {

        const pivots =
            getPivots(
                character
            );


        if (
            !pivots
        ) {

            return;

        }


        Object.values(
            pivots
        )
            .forEach(
                pivot => {

                    if (
                        !pivot?.rotation
                    ) {

                        return;

                    }


                    pivot.rotation.x =
                        0;

                    pivot.rotation.y =
                        0;

                    pivot.rotation.z =
                        0;

                }
            );

    }


    // ============================================================
    // APPLY POSE
    // ============================================================

    function applyPose(
        character,
        targets,
        delta
    ) {

        const pivots =
            getPivots(
                character
            );


        if (
            !pivots
        ) {

            return;

        }


        const alpha =
            clamp(
                delta * 14,
                0,
                1
            );


        for (
            const name of Object.keys(
                targets
            )
        ) {

            const pivot =
                pivots[name];


            if (
                !pivot
            ) {

                continue;

            }


            const target =
                targets[name];


            pivot.rotation.x =
                approach(
                    pivot.rotation.x,
                    target.x ?? 0,
                    alpha
                );


            pivot.rotation.y =
                approach(
                    pivot.rotation.y,
                    target.y ?? 0,
                    alpha
                );


            pivot.rotation.z =
                approach(
                    pivot.rotation.z,
                    target.z ?? 0,
                    alpha
                );

        }

    }


    // ============================================================
    // IDLE
    // ============================================================

    function idlePose(
        character,
        delta
    ) {

        const breathing =
            Math.sin(
                AnimationSystem.time *
                1.8
            ) *
            0.015;


        const slight =
            Math.sin(
                AnimationSystem.time *
                0.9
            ) *
            0.01;


        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        breathing,

                    y:
                        0,

                    z:
                        0.025

                },

                rightShoulder: {

                    x:
                        -breathing,

                    y:
                        0,

                    z:
                        -0.025

                },

                leftHip: {

                    x:
                        slight,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        -slight,

                    y:
                        0,

                    z:
                        0

                },

                neck: {

                    x:
                        breathing,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // WALK
    // ============================================================

    function walkPose(
        character,
        delta
    ) {

        const swing =
            Math.sin(
                AnimationSystem.time *
                8 *
                AnimationSystem.speedMultiplier
            ) *
            0.5;


        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        swing,

                    y:
                        0,

                    z:
                        0

                },

                rightShoulder: {

                    x:
                        -swing,

                    y:
                        0,

                    z:
                        0

                },

                leftHip: {

                    x:
                        -swing,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        swing,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // RUN
    // ============================================================

    function runPose(
        character,
        delta
    ) {

        const swing =
            Math.sin(
                AnimationSystem.time *
                11 *
                AnimationSystem.speedMultiplier
            ) *
            0.72;


        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        swing,

                    y:
                        0,

                    z:
                        0

                },

                rightShoulder: {

                    x:
                        -swing,

                    y:
                        0,

                    z:
                        0

                },

                leftHip: {

                    x:
                        -swing,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        swing,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // JUMP
    // ============================================================

    function jumpPose(
        character,
        delta
    ) {

        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        -0.55,

                    y:
                        0,

                    z:
                        0

                },

                rightShoulder: {

                    x:
                        -0.55,

                    y:
                        0,

                    z:
                        0

                },

                leftHip: {

                    x:
                        0.20,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        0.20,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // FREEFALL
    // ============================================================

    function freefallPose(
        character,
        delta
    ) {

        const float =
            Math.sin(
                AnimationSystem.time *
                3
            ) *
            0.04;


        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        -0.35 +
                        float,

                    y:
                        0,

                    z:
                        0

                },

                rightShoulder: {

                    x:
                        -0.35 -
                        float,

                    y:
                        0,

                    z:
                        0

                },

                leftHip: {

                    x:
                        -0.15,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        -0.15,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // LAND
    // ============================================================

    function landingPose(
        character,
        delta
    ) {

        /*
         * Small squash-like pose created using the existing
         * block rig only.
         */

        const squash =
            Math.sin(
                clamp(
                    AnimationSystem.time *
                    12,

                    0,

                    Math.PI
                )
            ) *
            0.12;


        applyPose(

            character,

            {

                leftShoulder: {

                    x:
                        squash,

                    y:
                        0,

                    z:
                        0

                },

                rightShoulder: {

                    x:
                        -squash,

                    y:
                        0,

                    z:
                        0

                },

                leftHip: {

                    x:
                        -squash,

                    y:
                        0,

                    z:
                        0

                },

                rightHip: {

                    x:
                        squash,

                    y:
                        0,

                    z:
                        0

                }

            },

            delta

        );

    }


    // ============================================================
    // GET STATE
    // ============================================================

    function determineState() {

        const player =
            getPlayer();


        if (
            !player?.state
        ) {

            return "Idle";

        }


        const state =
            player.state;


        if (
            !state.character
        ) {

            return "Idle";

        }


        if (
            !state.grounded
        ) {

            return (
                state.velocity.y >
                0
            )

                ? "Jumping"

                : "Freefall";

        }


        if (
            state.sprinting
        ) {

            return "Running";

        }


        if (
            state.moving
        ) {

            return "Walking";

        }


        return "Idle";

    }


    // ============================================================
    // UPDATE
    // ============================================================

    function update(
        delta
    ) {

        const character =
            getCharacter();


        if (
            !character
        ) {

            AnimationSystem.active =
                false;

            AnimationSystem.character =
                null;

            return;

        }


        AnimationSystem.active =
            true;


        AnimationSystem.character =
            character;


        AnimationSystem.time +=
            delta;


        const nextState =
            determineState();


        if (
            nextState !==
            AnimationSystem.state
        ) {

            AnimationSystem.state =
                nextState;

        }


        switch (
            AnimationSystem.state
        ) {

            case "Walking":

                walkPose(
                    character,
                    delta
                );

                break;


            case "Running":

                runPose(
                    character,
                    delta
                );

                break;


            case "Jumping":

                jumpPose(
                    character,
                    delta
                );

                break;


            case "Freefall":

                freefallPose(
                    character,
                    delta
                );

                break;


            case "Landing":

                landingPose(
                    character,
                    delta
                );

                break;


            case "Idle":

            default:

                idlePose(
                    character,
                    delta
                );

                break;

        }


        AnimationSystem.previousGrounded =
            !!state?.grounded;

    }


    // ============================================================
    // START
    // ============================================================

    function start() {

        AnimationSystem.active =
            true;

        AnimationSystem.time =
            0;

        AnimationSystem.state =
            "Idle";

    }


    // ============================================================
    // STOP
    // ============================================================

    function stop() {

        AnimationSystem.active =
            false;


        if (
            AnimationSystem.character
        ) {

            resetPose(
                AnimationSystem.character
            );

        }

    }


    // ============================================================
    // FORCE STATE
    // ============================================================

    function play(
        animationName
    ) {

        const valid = [

            "Idle",

            "Walking",

            "Running",

            "Jumping",

            "Freefall",

            "Landing"

        ];


        if (
            !valid.includes(
                animationName
            )
        ) {

            return false;

        }


        AnimationSystem.state =
            animationName;


        AnimationSystem.time =
            0;


        return true;

    }


    // ============================================================
    // SPEED
    // ============================================================

    function setSpeed(
        multiplier
    ) {

        AnimationSystem.speedMultiplier =
            clamp(
                Number(
                    multiplier
                ) || 1,
                0.1,
                3
            );

    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxAnimations =
        {

            version:
                AnimationSystem.version,

            state:
                AnimationSystem,

            start,

            stop,

            update,

            play,

            setSpeed,

            resetPose() {

                resetPose(
                    getCharacter()
                );

            }

        };


    // ============================================================
    // INTERNAL LOOP
    // ============================================================
    //
    // player.js already owns the main render loop. This file does
    // not create another requestAnimationFrame loop because two
    // independent loops cause animation jitter and duplicated work.
    //
    // player.js can call WebBloxAnimations.update(delta).
    // ============================================================

    console.log(
        "[WebBlox Animations] R6 animation system loaded."
    );

})();
