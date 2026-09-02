/*
 * WebBlox Player Character
 *
 * Stage 3A
 * - R15-style character
 * - Bacon hair
 * - Body parts
 * - Humanoid-style runtime data
 * - Character spawning
 * - Character cleanup
 */

(() => {
    "use strict";

    if (!window.WebBloxPlayer) {
        window.WebBloxPlayer = {};
    }

    const PlayerSystem = window.WebBloxPlayer;

    let THREE = null;

    function getThree() {
        if (window.THREE) {
            THREE = window.THREE;
            return THREE;
        }

        return null;
    }

    function makeMaterial(color, roughness = 0.8) {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness,
            metalness: 0
        });
    }

    function createPart(
        name,
        size,
        color,
        position,
        parent
    ) {
        const geometry =
            new THREE.BoxGeometry(
                size.x,
                size.y,
                size.z
            );

        const material =
            makeMaterial(color);

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.name = name;

        mesh.position.set(
            position.x,
            position.y,
            position.z
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData.characterPart = true;
        mesh.userData.characterPartName = name;

        parent.add(mesh);

        return mesh;
    }

    function createRoundedPart(
        name,
        size,
        color,
        position,
        parent
    ) {
        const geometry =
            new THREE.CapsuleGeometry(
                Math.min(size.x, size.z) * 0.38,
                Math.max(
                    0.1,
                    size.y -
                    Math.min(size.x, size.z) * 0.76
                ),
                6,
                12
            );

        const material =
            makeMaterial(color);

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.name = name;

        mesh.position.set(
            position.x,
            position.y,
            position.z
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData.characterPart = true;
        mesh.userData.characterPartName = name;

        parent.add(mesh);

        return mesh;
    }

    function createBaconHair(head, skinColor) {
        const hair =
            new THREE.Group();

        hair.name = "BaconHair";

        hair.userData.characterAccessory = true;

        /*
         * Bacon-style hair:
         * several curved-looking strips surrounding
         * the top/back of the head.
         */

        const baconColors = [
            "#5b351f",
            "#7a4727",
            "#8f542d",
            "#62351f",
            "#9a5a31"
        ];

        for (let i = 0; i < 9; i++) {
            const angle =
                (Math.PI * 2 / 9) * i;

            const radius = 0.68;

            const stripGeometry =
                new THREE.BoxGeometry(
                    0.20,
                    0.95,
                    0.38
                );

            const stripMaterial =
                makeMaterial(
                    baconColors[
                        i %
                        baconColors.length
                    ],
                    0.9
                );

            const strip =
                new THREE.Mesh(
                    stripGeometry,
                    stripMaterial
                );

            strip.position.set(
                Math.cos(angle) * radius,
                0.58,
                Math.sin(angle) * radius
            );

            strip.rotation.z =
                Math.sin(angle) * 0.35;

            strip.rotation.y =
                angle;

            strip.castShadow = true;

            hair.add(strip);
        }

        /*
         * Top hair pieces.
         */

        for (let i = 0; i < 5; i++) {
            const stripGeometry =
                new THREE.BoxGeometry(
                    0.25,
                    0.85,
                    0.42
                );

            const stripMaterial =
                makeMaterial(
                    baconColors[
                        (i + 2) %
                        baconColors.length
                    ]
                );

            const strip =
                new THREE.Mesh(
                    stripGeometry,
                    stripMaterial
                );

            strip.position.set(
                (i - 2) * 0.25,
                0.9,
                -0.15
            );

            strip.rotation.z =
                (i - 2) * 0.12;

            strip.rotation.x =
                -0.25;

            strip.castShadow = true;

            hair.add(strip);
        }

        head.add(hair);

        return hair;
    }

    function createFace(head) {
        const face =
            new THREE.Group();

        face.name = "Face";

        /*
         * Eyes.
         */

        const eyeMaterial =
            makeMaterial("#111111");

        const eyeGeometry =
            new THREE.SphereGeometry(
                0.10,
                12,
                8
            );

        const leftEye =
            new THREE.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        leftEye.position.set(
            -0.30,
            0.15,
            0.80
        );

        const rightEye =
            new THREE.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        rightEye.position.set(
            0.30,
            0.15,
            0.80
        );

        face.add(leftEye);
        face.add(rightEye);

        /*
         * Simple smile.
         */

        const smileMaterial =
            makeMaterial("#222222");

        const smileGeometry =
            new THREE.TorusGeometry(
                0.22,
                0.035,
                6,
                16,
                Math.PI
            );

        const smile =
            new THREE.Mesh(
                smileGeometry,
                smileMaterial
            );

        smile.position.set(
            0,
            -0.18,
            0.80
        );

        smile.rotation.x =
            Math.PI / 2;

        face.add(smile);

        head.add(face);

        return face;
    }

    function createCharacter(options = {}) {
        const THREE_LOCAL =
            getThree();

        if (!THREE_LOCAL) {
            console.error(
                "[WebBlox Player] Three.js is not loaded."
            );

            return null;
        }

        /*
         * Root character.
         */

        const character =
            new THREE.Group();

        character.name =
            options.name ||
            "Character";

        character.userData.isCharacter =
            true;

        character.userData.playerId =
            options.playerId ||
            null;

        character.userData.characterType =
            "R15";

        /*
         * Humanoid-style runtime information.
         */

        const humanoid = {
            name: "Humanoid",

            rigType: "R15",

            health: 100,

            maxHealth: 100,

            walkSpeed: 16,

            jumpPower: 50,

            autoRotate: true,

            state: "Idle"
        };

        character.userData.humanoid =
            humanoid;

        /*
         * Body colors.
         */

        const skin =
            "#f2c7a5";

        const shirt =
            options.shirtColor ||
            "#4f78c7";

        const pants =
            options.pantsColor ||
            "#303030";

        const shoe =
            "#202020";

        /*
         * ========================================================
         * R15 BODY
         * ========================================================
         */

        const body =
            new THREE.Group();

        body.name =
            "Body";

        character.add(body);

        /*
         * Lower torso
         */

        const lowerTorso =
            createRoundedPart(
                "LowerTorso",
                {
                    x: 1.8,
                    y: 0.85,
                    z: 1.0
                },
                shirt,
                {
                    x: 0,
                    y: 2.65,
                    z: 0
                },
                body
            );

        /*
         * Upper torso
         */

        const upperTorso =
            createRoundedPart(
                "UpperTorso",
                {
                    x: 2.0,
                    y: 1.2,
                    z: 1.05
                },
                shirt,
                {
                    x: 0,
                    y: 3.55,
                    z: 0
                },
                body
            );

        /*
         * Head
         */

        const head =
            createRoundedPart(
                "Head",
                {
                    x: 1.75,
                    y: 1.75,
                    z: 1.75
                },
                skin,
                {
                    x: 0,
                    y: 4.95,
                    z: 0
                },
                body
            );

        head.userData.isHead =
            true;

        createFace(head);

        createBaconHair(
            head,
            skin
        );

        /*
         * ========================================================
         * LEFT ARM
         * ========================================================
         */

        const leftUpperArm =
            createRoundedPart(
                "LeftUpperArm",
                {
                    x: 0.55,
                    y: 1.05,
                    z: 0.55
                },
                skin,
                {
                    x: -1.25,
                    y: 3.65,
                    z: 0
                },
                body
            );

        const leftLowerArm =
            createRoundedPart(
                "LeftLowerArm",
                {
                    x: 0.50,
                    y: 1.05,
                    z: 0.50
                },
                skin,
                {
                    x: -1.25,
                    y: 2.60,
                    z: 0
                },
                body
            );

        const leftHand =
            createRoundedPart(
                "LeftHand",
                {
                    x: 0.55,
                    y: 0.55,
                    z: 0.55
                },
                skin,
                {
                    x: -1.25,
                    y: 1.85,
                    z: 0
                },
                body
            );

        /*
         * ========================================================
         * RIGHT ARM
         * ========================================================
         */

        const rightUpperArm =
            createRoundedPart(
                "RightUpperArm",
                {
                    x: 0.55,
                    y: 1.05,
                    z: 0.55
                },
                skin,
                {
                    x: 1.25,
                    y: 3.65,
                    z: 0
                },
                body
            );

        const rightLowerArm =
            createRoundedPart(
                "RightLowerArm",
                {
                    x: 0.50,
                    y: 1.05,
                    z: 0.50
                },
                skin,
                {
                    x: 1.25,
                    y: 2.60,
                    z: 0
                },
                body
            );

        const rightHand =
            createRoundedPart(
                "RightHand",
                {
                    x: 0.55,
                    y: 0.55,
                    z: 0.55
                },
                skin,
                {
                    x: 1.25,
                    y: 1.85,
                    z: 0
                },
                body
            );

        /*
         * ========================================================
         * LEFT LEG
         * ========================================================
         */

        const leftUpperLeg =
            createRoundedPart(
                "LeftUpperLeg",
                {
                    x: 0.75,
                    y: 1.15,
                    z: 0.75
                },
                pants,
                {
                    x: -0.48,
                    y: 1.65,
                    z: 0
                },
                body
            );

        const leftLowerLeg =
            createRoundedPart(
                "LeftLowerLeg",
                {
                    x: 0.65,
                    y: 1.15,
                    z: 0.65
                },
                pants,
                {
                    x: -0.48,
                    y: 0.55,
                    z: 0
                },
                body
            );

        const leftFoot =
            createRoundedPart(
                "LeftFoot",
                {
                    x: 0.75,
                    y: 0.45,
                    z: 1.15
                },
                shoe,
                {
                    x: -0.48,
                    y: 0.08,
                    z: 0.20
                },
                body
            );

        /*
         * ========================================================
         * RIGHT LEG
         * ========================================================
         */

        const rightUpperLeg =
            createRoundedPart(
                "RightUpperLeg",
                {
                    x: 0.75,
                    y: 1.15,
                    z: 0.75
                },
                pants,
                {
                    x: 0.48,
                    y: 1.65,
                    z: 0
                },
                body
            );

        const rightLowerLeg =
            createRoundedPart(
                "RightLowerLeg",
                {
                    x: 0.65,
                    y: 1.15,
                    z: 0.65
                },
                pants,
                {
                    x: 0.48,
                    y: 0.55,
                    z: 0
                },
                body
            );

        const rightFoot =
            createRoundedPart(
                "RightFoot",
                {
                    x: 0.75,
                    y: 0.45,
                    z: 1.15
                },
                shoe,
                {
                    x: 0.48,
                    y: 0.08,
                    z: 0.20
                },
                body
            );

        /*
         * ========================================================
         * R15 JOINT DATA
         * ========================================================
         */

        character.userData.joints = {
            waist: {
                parent: "LowerTorso",
                child: "UpperTorso"
            },

            neck: {
                parent: "UpperTorso",
                child: "Head"
            },

            leftShoulder: {
                parent: "UpperTorso",
                child: "LeftUpperArm"
            },

            leftElbow: {
                parent: "LeftUpperArm",
                child: "LeftLowerArm"
            },

            leftWrist: {
                parent: "LeftLowerArm",
                child: "LeftHand"
            },

            rightShoulder: {
                parent: "UpperTorso",
                child: "RightUpperArm"
            },

            rightElbow: {
                parent: "RightUpperArm",
                child: "RightLowerArm"
            },

            rightWrist: {
                parent: "RightLowerArm",
                child: "RightHand"
            },

            leftHip: {
                parent: "LowerTorso",
                child: "LeftUpperLeg"
            },

            leftKnee: {
                parent: "LeftUpperLeg",
                child: "LeftLowerLeg"
            },

            leftAnkle: {
                parent: "LeftLowerLeg",
                child: "LeftFoot"
            },

            rightHip: {
                parent: "LowerTorso",
                child: "RightUpperLeg"
            },

            rightKnee: {
                parent: "RightUpperLeg",
                child: "RightLowerLeg"
            },

            rightAnkle: {
                parent: "RightLowerLeg",
                child: "RightFoot"
            }
        };

        /*
         * ========================================================
         * ROOT
         * ========================================================
         */

        const rootPart =
            new THREE.Object3D();

        rootPart.name =
            "HumanoidRootPart";

        rootPart.userData.isRootPart =
            true;

        rootPart.position.set(
            0,
            0,
            0
        );

        character.add(
            rootPart
        );

        character.userData.rootPart =
            rootPart;

        /*
         * Character runtime state.
         */

        character.userData.runtime = {
            grounded: false,

            velocity: {
                x: 0,
                y: 0,
                z: 0
            },

            spawnPosition: {
                x: 0,
                y: 0,
                z: 0
            },

            alive: true
        };

        /*
         * Keep references to important body parts.
         */

        character.userData.bodyParts = {
            head,

            upperTorso,
            lowerTorso,

            leftUpperArm,
            leftLowerArm,
            leftHand,

            rightUpperArm,
            rightLowerArm,
            rightHand,

            leftUpperLeg,
            leftLowerLeg,
            leftFoot,

            rightUpperLeg,
            rightLowerLeg,
            rightFoot
        };

        /*
         * Calculate character bounds.
         */

        character.userData.height =
            5.4;

        character.userData.width =
            2.5;

        character.userData.depth =
            1.5;

        return character;
    }

    function destroyCharacter(character) {
        if (!character) {
            return;
        }

        character.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(
                        material => {
                            material.dispose();
                        }
                    );
                } else {
                    child.material.dispose();
                }
            }
        });

        if (character.parent) {
            character.parent.remove(
                characterQSA
            );
        }
    }

    PlayerSystem.createCharacter =
        createCharacter;

    PlayerSystem.destroyCharacter =
        destroyCharacter;

})();
