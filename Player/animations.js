/*
 * WebBlox Player Animations
 *
 * Stage 3C
 * CLASSIC BLOCKY ANIMATION SYSTEM
 *
 * States:
 *
 * Idle
 * Walking
 * Running
 * Jumping
 * Freefall
 *
 * Designed for the WebBlox blocky character hierarchy.
 */

(() => {

    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    const Animations = {};

    let time = 0;

    let previousState =
        "Idle";

    /*
     * ============================================================
     * SETUP
     * ============================================================
     */

    function setup() {

        time = 0;

        previousState =
            "Idle";

    }

    /*
     * ============================================================
     * FIND PART
     * ============================================================
     */

    function findPart(
        character,
        name
    ) {

        if (!character) {
            return null;
        }

        const bodyParts =
            character.userData
                ?.bodyParts;

        if (
            bodyParts &&
            bodyParts[name]
        ) {
            return bodyParts[name];
        }

        return character.getObjectByName(
            name
        );
    }

    /*
     * ============================================================
     * ROTATION RESET
     *
     * Only reset animation joints.
     * ============================================================
     */

    function resetPart(
        part
    ) {

        if (!part) {
            return;
        }

        part.rotation.x = 0;

        part.rotation.y = 0;

        part.rotation.z = 0;
    }

    /*
     * ============================================================
     * SAFE LERP
     * ============================================================
     */

    function smooth(
        current,
        target,
        amount
    ) {

        return (
            current +
            (
                target -
                current
            ) *
            amount
        );

    }

    /*
     * ============================================================
     * UPDATE
     * ============================================================
     */

    function update(
        delta
    ) {

        const character =
            PlayerSystem.character;

        if (!character) {
            return;
        }

        const runtime =
            character.userData
                ?.runtime;

        const humanoid =
            character.userData
                ?.humanoid;

        const parts =
            character.userData
                ?.bodyParts;

        if (
            !runtime ||
            !parts
        ) {
            return;
        }

        delta =
            Math.max(
                0,
                Math.min(
                    delta || 0,
                    0.1
                )
            );

        time += delta;

        /*
         * --------------------------------------------------------
         * INPUT
         * --------------------------------------------------------
         */

        const input =
            runtime.input ||
            {};

        const moving =
            input.moving === true;

        const sprinting =
            input.sprint === true;

        /*
         * --------------------------------------------------------
         * VELOCITY
         * --------------------------------------------------------
         */

        const velocity =
            runtime.velocity ||
            {};

        const velocityY =
            Number(
                velocity.y || 0
            );

        /*
         * --------------------------------------------------------
         * STATE
         * --------------------------------------------------------
         */

        let state =
            "Idle";

        if (
            runtime.grounded !== true
        ) {

            if (
                velocityY > 1
            ) {

                state =
                    "Jumping";

            } else {

                state =
                    "Freefall";

            }

        } else if (
            moving
        ) {

            state =
                sprinting
                    ? "Running"
                    : "Walking";

        }

        if (humanoid) {

            humanoid.state =
                state;

        }

        /*
         * --------------------------------------------------------
         * JOINTS
         * --------------------------------------------------------
         */

        const leftArm =
            findPart(
                character,
                "LeftUpperArm"
            ) ||
            parts.leftUpperArm;

        const rightArm =
            findPart(
                character,
                "RightUpperArm"
            ) ||
            parts.rightUpperArm;

        const leftLeg =
            findPart(
                character,
                "LeftUpperLeg"
            ) ||
            parts.leftUpperLeg;

        const rightLeg =
            findPart(
                character,
                "RightUpperLeg"
            ) ||
            parts.rightUpperLeg;

        const upperTorso =
            findPart(
                character,
                "UpperTorso"
            ) ||
            parts.upperTorso;

        const neck =
            findPart(
                character,
                "Neck"
            );

        /*
         * --------------------------------------------------------
         * RESET
         * --------------------------------------------------------
         */

        resetPart(
            leftArm
        );

        resetPart(
            rightArm
        );

        resetPart(
            leftLeg
        );

        resetPart(
            rightLeg
        );

        resetPart(
            upperTorso
        );

        resetPart(
            neck
        );

        /*
         * --------------------------------------------------------
         * IDLE
         * --------------------------------------------------------
         *
         * Very small breathing movement.
         */

        if (
            state === "Idle"
        ) {

            const breathing =
                Math.sin(
                    time * 2.0
                ) *
                0.018;

            const armSway =
                Math.sin(
                    time * 1.7
                ) *
                0.012;

            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    breathing;

            }

            if (
                leftArm
            ) {

                leftArm.rotation.z =
                    0.025 +
                    armSway;

            }

            if (
                rightArm
            ) {

                rightArm.rotation.z =
                    -0.025 -
                    armSway;

            }

            previousState =
                state;

            return;
        }

        /*
         * --------------------------------------------------------
         * WALK / RUN
         * --------------------------------------------------------
         */

        if (
            state === "Walking" ||
            state === "Running"
        ) {

            const animationSpeed =
                state === "Running"
                    ? 11
                    : 8.5;

            const amount =
                state === "Running"
                    ? 0.72
                    : 0.48;

            const wave =
                Math.sin(
                    time *
                    animationSpeed
                );

            const oppositeWave =
                Math.sin(
                    time *
                    animationSpeed +
                    Math.PI
                );

            /*
             * Arms.
             */

            if (
                leftArm
            ) {

                leftArm.rotation.x =
                    wave *
                    amount;

            }

            if (
                rightArm
            ) {

                rightArm.rotation.x =
                    oppositeWave *
                    amount;

            }

            /*
             * Legs.
             */

            if (
                leftLeg
            ) {

                leftLeg.rotation.x =
                    oppositeWave *
                    amount;

            }

            if (
                rightLeg
            ) {

                rightLeg.rotation.x =
                    wave *
                    amount;

            }

            /*
             * Small torso movement.
             */

            if (
                upperTorso
            ) {

                upperTorso.rotation.y =
                    wave *
                    0.025;

                upperTorso.rotation.x =
                    Math.abs(
                        wave
                    ) *
                    0.018;

            }

            /*
             * Running has a slightly stronger
             * body bounce.
             */

            if (
                state === "Running" &&
                upperTorso
            ) {

                upperTorso.position.y =
                    Math.abs(
                        Math.sin(
                            time * 11
                        )
                    ) *
                    0.035;

            }

            previousState =
                state;

            return;
        }

        /*
         * --------------------------------------------------------
         * JUMP
         * --------------------------------------------------------
         */

        if (
            state === "Jumping"
        ) {

            if (
                leftArm
            ) {

                leftArm.rotation.x =
                    -0.85;

                leftArm.rotation.z =
                    0.04;

            }

            if (
                rightArm
            ) {

                rightArm.rotation.x =
                    -0.85;

                rightArm.rotation.z =
                    -0.04;

            }

            if (
                leftLeg
            ) {

                leftLeg.rotation.x =
                    0.18;

            }

            if (
                rightLeg
            ) {

                rightLeg.rotation.x =
                    0.18;

            }

            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    -0.035;

            }

            previousState =
                state;

            return;
        }

        /*
         * --------------------------------------------------------
         * FREEFALL
         * --------------------------------------------------------
         */

        if (
            state === "Freefall"
        ) {

            if (
                leftArm
            ) {

                leftArm.rotation.x =
                    -0.38;

                leftArm.rotation.z =
                    0.06;

            }

            if (
                rightArm
            ) {

                rightArm.rotation.x =
                    -0.38;

                rightArm.rotation.z =
                    -0.06;

            }

            if (
                leftLeg
            ) {

                leftLeg.rotation.x =
                    -0.15;

            }

            if (
                rightLeg
            ) {

                rightLeg.rotation.x =
                    -0.15;

            }

            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    -0.05;

            }

            previousState =
                state;

            return;
        }

        previousState =
            state;

    }

    /*
     * ============================================================
     * STATE
     * ============================================================
     */

    function getState(
        character
    ) {

        return (
            character
                ?.userData
                ?.humanoid
                ?.state ||
            "Idle"
        );

    }

    /*
     * ============================================================
     * RESET
     * ============================================================
     */

    function reset(
        character
    ) {

        if (!character) {
            return;
        }

        const parts =
            character.userData
                ?.bodyParts;

        if (!parts) {
            return;
        }

        Object.values(parts)
            .forEach(
                part => {

                    if (
                        part &&
                        part.isObject3D
                    ) {

                        part.rotation.set(
                            0,
                            0,
                            0
                        );

                    }

                }
            );

        time = 0;

        previousState =
            "Idle";

    }

    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    Animations.setup =
        setup;

    Animations.update =
        update;

    Animations.reset =
        reset;

    Animations.getState =
        getState;

    Animations.getPreviousState =
        () => previousState;

    Animations.getTime =
        () => time;

    PlayerSystem.animations =
        Animations;

})();
