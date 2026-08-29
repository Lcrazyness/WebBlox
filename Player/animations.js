/*
 * WebBlox Player Animations
 * Stage 3A
 *
 * Idle
 * Walk
 * Run
 * Jump
 * Fall
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    const Animations = {};

    let time = 0;

    function setup() {
        time = 0;
    }

    function findPart(
        character,
        name
    ) {
        return (
            character.userData
                ?.bodyParts?.[name] ||
            character.getObjectByName(
                name
            )
        );
    }

    function resetPart(part) {
        if (!part) {
            return;
        }

        part.rotation.x = 0;
        part.rotation.y = 0;
        part.rotation.z = 0;
    }

    function update(delta) {
        const character =
            PlayerSystem.character;

        if (!character) {
            return;
        }

        const runtime =
            character.userData.runtime;

        const humanoid =
            character.userData.humanoid;

        if (!runtime) {
            return;
        }

        time += delta;

        const parts =
            character.userData.bodyParts;

        if (!parts) {
            return;
        }

        const moving =
            runtime.input?.moving === true;

        const sprinting =
            runtime.input?.sprint === true;

        const velocityY =
            runtime.velocity?.y || 0;

        let state = "Idle";

        if (!runtime.grounded) {
            if (velocityY > 1) {
                state = "Jumping";
            } else {
                state = "Freefall";
            }
        } else if (moving) {
            state =
                sprinting
                    ? "Running"
                    : "Walking";
        }

        if (humanoid) {
            humanoid.state =
                state;
        }

        Object.values(parts)
            .forEach(resetPart);

        const upperTorso =
            findPart(
                character,
                "upperTorso"
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

        const speed =
            sprinting
                ? 11
                : 8;

        const swing =
            Math.sin(
                time * speed
            );

        const walkAmount =
            moving
                ? sprinting
                    ? 0.65
                    : 0.45
                : 0;

        if (
            state === "Walking" ||
            state === "Running"
        ) {
            if (leftUpperArm) {
                leftUpperArm.rotation.x =
                    swing *
                    walkAmount;
            }

            if (rightUpperArm) {
                rightUpperArm.rotation.x =
                    -swing *
                    walkAmount;
            }

            if (leftLowerArm) {
                leftLowerArm.rotation.x =
                    swing *
                    0.18;
            }

            if (rightLowerArm) {
                rightLowerArm.rotation.x =
                    -swing *
                    0.18;
            }

            if (leftUpperLeg) {
                leftUpperLeg.rotation.x =
                    -swing *
                    walkAmount;
            }

            if (rightUpperLeg) {
                rightUpperLeg.rotation.x =
                    swing *
                    walkAmount;
            }

            if (leftLowerLeg) {
                leftLowerLeg.rotation.x =
                    Math.max(
                        0,
                        swing
                    ) *
                    0.18;
            }

            if (rightLowerLeg) {
                rightLowerLeg.rotation.x =
                    Math.max(
                        0,
                        -swing
                    ) *
                    0.18;
            }
        }

        if (state === "Idle") {
            const breathing =
                Math.sin(
                    time * 2
                ) *
                0.025;

            if (upperTorso) {
                upperTorso.rotation.x =
                    breathing;
            }

            if (leftUpperArm) {
                leftUpperArm.rotation.z =
                    0.03;
            }

            if (rightUpperArm) {
                rightUpperArm.rotation.z =
                    -0.03;
            }
        }

        if (
            state === "Jumping"
        ) {
            if (leftUpperArm) {
                leftUpperArm.rotation.x =
                    -0.8;
            }

            if (rightUpperArm) {
                rightUpperArm.rotation.x =
                    -0.8;
            }

            if (leftUpperLeg) {
                leftUpperLeg.rotation.x =
                    0.25;
            }

            if (rightUpperLeg) {
                rightUpperLeg.rotation.x =
                    0.25;
            }
        }

        if (
            state === "Freefall"
        ) {
            if (leftUpperArm) {
                leftUpperArm.rotation.x =
                    -0.35;
            }

            if (rightUpperArm) {
                rightUpperArm.rotation.x =
                    -0.35;
            }

            if (leftUpperLeg) {
                leftUpperLeg.rotation.x =
                    -0.15;
            }

            if (rightUpperLeg) {
                rightUpperLeg.rotation.x =
                    -0.15;
            }
        }
    }

    Animations.setup =
        setup;

    Animations.update =
        update;

    Animations.getState =
        character => {
            return (
                character?.userData
                    ?.humanoid
                    ?.state ||
                "Idle"
            );
        };

    PlayerSystem.animations =
        Animations;

})();
