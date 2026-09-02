/*
 * ============================================================
 * WebBlox Player Animations
 * Stage 3C
 *
 * Blocky Roblox-style animations
 *
 * States:
 * - Idle
 * - Walking
 * - Running
 * - Jumping
 * - Falling
 * - Landing
 * - Death
 * ============================================================
 */

(() => {

    "use strict";


    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};


    const Animations = {};


    let time = 0;

    let lastState =
        "Idle";


    /* ============================================================
       SETUP
       ============================================================ */

    function setup() {

        time = 0;

        lastState =
            "Idle";
    }


    /* ============================================================
       FIND PART
       ============================================================ */

    function findPart(
        character,
        name
    ) {

        if (
            character?.userData
                ?.bodyParts?.[name]
        ) {

            return character
                .userData
                .bodyParts[name];
        }

        return character?.getObjectByName(
            name
        );
    }


    /* ============================================================
       RESET
       ============================================================ */

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


    /* ============================================================
       SMOOTH VALUE
       ============================================================ */

    function smooth(
        current,
        target,
        speed
    ) {

        return (
            current +
            (
                target -
                current
            ) *
            Math.min(
                1,
                speed
            )
        );
    }


    /* ============================================================
       UPDATE
       ============================================================ */

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
            !humanoid ||
            !parts
        ) {
            return;
        }


        delta =
            Math.min(
                Math.max(
                    Number(delta) || 0,
                    0
                ),
                0.05
            );


        time += delta;


        /* ========================================================
           INPUT
           ======================================================== */

        const moving =
            Boolean(
                runtime.input
                    ?.moving
            );


        const sprinting =
            Boolean(
                runtime.input
                    ?.sprint
            );


        const velocityY =
            Number(
                runtime.velocity
                    ?.y
            ) || 0;


        /* ========================================================
           STATE
           ======================================================== */

        let state =
            "Idle";


        if (
            !runtime.grounded
        ) {

            if (
                velocityY > 1
            ) {

                state =
                    "Jumping";

            } else {

                state =
                    "Falling";
            }

        } else if (
            moving
        ) {

            state =
                sprinting
                    ? "Running"
                    : "Walking";
        }


        if (
            humanoid.state !==
            state
        ) {

            humanoid.state =
                state;
        }


        /* ========================================================
           PARTS
           ======================================================== */

        const upperTorso =
            findPart(
                character,
                "upperTorso"
            );


        const lowerTorso =
            findPart(
                character,
                "lowerTorso"
            );


        const head =
            findPart(
                character,
                "head"
            );


        const leftUpperArm =
            findPart(
                character,
                "leftUpperArm"
            );


        const rightUpperArm =
            findPart(
                character,
                "rightUpperArm"
            );


        const leftLowerArm =
            findPart(
                character,
                "leftLowerArm"
            );


        const rightLowerArm =
            findPart(
                character,
                "rightLowerArm"
            );


        const leftUpperLeg =
            findPart(
                character,
                "leftUpperLeg"
            );


        const rightUpperLeg =
            findPart(
                character,
                "rightUpperLeg"
            );


        const leftLowerLeg =
            findPart(
                character,
                "leftLowerLeg"
            );


        const rightLowerLeg =
            findPart(
                character,
                "rightLowerLeg"
            );


        /* ========================================================
           RESET
           ======================================================== */

        [
            upperTorso,
            lowerTorso,
            head,
            leftUpperArm,
            rightUpperArm,
            leftLowerArm,
            rightLowerArm,
            leftUpperLeg,
            rightUpperLeg,
            leftLowerLeg,
            rightLowerLeg
        ].forEach(
            resetPart
        );


        /* ========================================================
           IDLE
           ======================================================== */

        if (
            state === "Idle"
        ) {

            const breathe =
                Math.sin(
                    time * 2.0
                ) *
                0.018;


            const headBob =
                Math.sin(
                    time * 2.0
                ) *
                0.008;


            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    breathe;
            }


            if (
                lowerTorso
            ) {

                lowerTorso.rotation.x =
                    breathe * 0.5;
            }


            if (
                head
            ) {

                head.rotation.x =
                    headBob;
            }


            if (
                leftUpperArm
            ) {

                leftUpperArm.rotation.z =
                    0.025;
            }


            if (
                rightUpperArm
            ) {

                rightUpperArm.rotation.z =
                    -0.025;
            }


            return;
        }


        /* ========================================================
           WALK / RUN
           ======================================================== */

        if (
            state === "Walking" ||
            state === "Running"
        ) {

            const frequency =
                state === "Running"
                    ? 11
                    : 8;


            const amount =
                state === "Running"
                    ? 0.72
                    : 0.48;


            const swing =
                Math.sin(
                    time *
                    frequency
                );


            const oppositeSwing =
                Math.sin(
                    time *
                    frequency +
                    Math.PI
                );


            /*
             * Arms
             */

            if (
                leftUpperArm
            ) {

                leftUpperArm.rotation.x =
                    swing *
                    amount;
            }


            if (
                rightUpperArm
            ) {

                rightUpperArm.rotation.x =
                    oppositeSwing *
                    amount;
            }


            /*
             * Lower arms follow
             * the upper arm.
             */

            if (
                leftLowerArm
            ) {

                leftLowerArm.rotation.x =
                    Math.max(
                        0,
                        swing
                    ) *
                    0.16;
            }


            if (
                rightLowerArm
            ) {

                rightLowerArm.rotation.x =
                    Math.max(
                        0,
                        oppositeSwing
                    ) *
                    0.16;
            }


            /*
             * Legs
             */

            if (
                leftUpperLeg
            ) {

                leftUpperLeg.rotation.x =
                    -swing *
                    amount;
            }


            if (
                rightUpperLeg
            ) {

                rightUpperLeg.rotation.x =
                    -oppositeSwing *
                    amount;
            }


            /*
             * Knees.
             */

            if (
                leftLowerLeg
            ) {

                leftLowerLeg.rotation.x =
                    Math.max(
                        0,
                        swing
                    ) *
                    0.25;
            }


            if (
                rightLowerLeg
            ) {

                rightLowerLeg.rotation.x =
                    Math.max(
                        0,
                        oppositeSwing
                    ) *
                    0.25;
            }


            /*
             * Torso movement.
             */

            if (
                upperTorso
            ) {

                upperTorso.rotation.y =
                    swing *
                    0.035;

                upperTorso.rotation.x =
                    0.025;
            }


            /*
             * Head stays mostly
             * stable.
             */

            if (
                head
            ) {

                head.rotation.y =
                    swing *
                    0.018;
            }


            return;
        }


        /* ========================================================
           JUMP
           ======================================================== */

        if (
            state === "Jumping"
        ) {

            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    -0.08;
            }


            if (
                leftUpperArm
            ) {

                leftUpperArm.rotation.x =
                    -0.85;
            }


            if (
                rightUpperArm
            ) {

                rightUpperArm.rotation.x =
                    -0.85;
            }


            if (
                leftLowerArm
            ) {

                leftLowerArm.rotation.x =
                    -0.12;
            }


            if (
                rightLowerArm
            ) {

                rightLowerArm.rotation.x =
                    -0.12;
            }


            if (
                leftUpperLeg
            ) {

                leftUpperLeg.rotation.x =
                    0.22;
            }


            if (
                rightUpperLeg
            ) {

                rightUpperLeg.rotation.x =
                    0.22;
            }


            if (
                leftLowerLeg
            ) {

                leftLowerLeg.rotation.x =
                    -0.10;
            }


            if (
                rightLowerLeg
            ) {

                rightLowerLeg.rotation.x =
                    -0.10;
            }


            return;
        }


        /* ========================================================
           FALL
           ======================================================== */

        if (
            state === "Falling"
        ) {

            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    0.12;
            }


            if (
                leftUpperArm
            ) {

                leftUpperArm.rotation.x =
                    -0.48;
            }


            if (
                rightUpperArm
            ) {

                rightUpperArm.rotation.x =
                    -0.48;
            }


            if (
                leftLowerArm
            ) {

                leftLowerArm.rotation.x =
                    0.08;
            }


            if (
                rightLowerArm
            ) {

                rightLowerArm.rotation.x =
                    0.08;
            }


            if (
                leftUpperLeg
            ) {

                leftUpperLeg.rotation.x =
                    -0.18;
            }


            if (
                rightUpperLeg
            ) {

                rightUpperLeg.rotation.x =
                    -0.18;
            }


            return;
        }


        /* ========================================================
           LANDING
           ======================================================== */

        if (
            state === "Landing"
        ) {

            const landing =
                Math.min(
                    1,
                    Math.max(
                        0,
                        Math.sin(
                            time * 24
                        )
                    )
                );


            if (
                upperTorso
            ) {

                upperTorso.rotation.x =
                    landing *
                    0.12;
            }


            if (
                leftUpperLeg
            ) {

                leftUpperLeg.rotation.x =
                    landing *
                    -0.10;
            }


            if (
                rightUpperLeg
            ) {

                rightUpperLeg.rotation.x =
                    landing *
                    -0.10;
            }


            return;
        }


        /* ========================================================
           DEATH
           ======================================================== */

        if (
            state === "Dead"
        ) {

            if (
                upperTorso
            ) {

                upperTorso.rotation.z =
                    -1.25;
            }


            if (
                head
            ) {

                head.rotation.z =
                    -0.25;
            }


            if (
                leftUpperArm
            ) {

                leftUpperArm.rotation.z =
                    -0.75;
            }


            if (
                rightUpperArm
            ) {

                rightUpperArm.rotation.z =
                    0.75;
            }


            if (
                leftUpperLeg
            ) {

                leftUpperLeg.rotation.z =
                    -0.25;
            }


            if (
                rightUpperLeg
            ) {

                rightUpperLeg.rotation.z =
                    0.25;
            }
        }


        lastState =
            state;
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    Animations.setup =
        setup;

    Animations.update =
        update;

    Animations.getState =
        character => {

            return (
                character
                    ?.userData
                    ?.humanoid
                    ?.state ||
                "Idle"
            );
        };


    PlayerSystem.animations =
        Animations;


    /*
     * Automatically initialize.
     */

    setup();


    console.log(
        "[WebBlox Player] Blocky animations loaded."
    );

})();
