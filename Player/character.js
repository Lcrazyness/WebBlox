/*
 * WebBlox Player Character
 *
 * Stage 3C
 * CLASSIC BLOCKY CHARACTER
 *
 * - Classic blocky Roblox-style proportions
 * - No bacon hair
 * - No hat
 * - No accessories
 * - Proper connected body hierarchy
 * - Shoulder / elbow / wrist joints
 * - Hip / knee / ankle joints
 * - Humanoid-style runtime data
 * - Character spawning
 * - Character cleanup
 * - Body colors
 * - Simple classic face
 *
 * IMPORTANT:
 * This file exposes:
 *
 *     WebBloxPlayer.createCharacter()
 *     WebBloxPlayer.destroyCharacter()
 *
 * The current Player runtime also contains its own
 * character builder. If player.js is creating the
 * character instead of this module, the equivalent
 * blocky builder must be used there as well.
 */

(() => {
    "use strict";

    if (!window.WebBloxPlayer) {
        window.WebBloxPlayer = {};
    }

    const PlayerSystem =
        window.WebBloxPlayer;

    let THREE = null;

    /*
     * ============================================================
     * THREE
     * ============================================================
     */

    function getThree() {
        if (
            window.THREE &&
            typeof window.THREE.Group === "function"
        ) {
            THREE = window.THREE;
            return THREE;
        }

        return null;
    }

    /*
     * ============================================================
     * COLOR
     * ============================================================
     */

    function safeColor(
        color,
        fallback
    ) {
        const T = getThree();

        if (!T) {
            return null;
        }

        try {
            return new T.Color(
                color || fallback
            );
        } catch {
            return new T.Color(
                fallback
            );
        }
    }

    /*
     * ============================================================
     * MATERIAL
     * ============================================================
     */

    function makeMaterial(
        color,
        options = {}
    ) {
        const T = getThree();

        if (!T) {
            return null;
        }

        return new T.MeshStandardMaterial({
            color: safeColor(
                color,
                "#808080"
            ),

            roughness:
                options.roughness ??
                0.82,

            metalness:
                options.metalness ??
                0,

            transparent:
                options.transparent === true,

            opacity:
                options.opacity ??
                1
        });
    }

    /*
     * ============================================================
     * BLOCK
     * ============================================================
     */

    function createBlock(
        name,
        size,
        color,
        position,
        parent,
        options = {}
    ) {
        const T = getThree();

        if (!T) {
            return null;
        }

        const geometry =
            new T.BoxGeometry(
                size.x,
                size.y,
                size.z
            );

        const material =
            makeMaterial(
                color,
                options
            );

        const mesh =
            new T.Mesh(
                geometry,
                material
            );

        mesh.name =
            name;

        mesh.position.set(
            position.x || 0,
            position.y || 0,
            position.z || 0
        );

        mesh.castShadow =
            options.castShadow !== false;

        mesh.receiveShadow =
            options.receiveShadow !== false;

        mesh.userData.characterPart =
            true;

        mesh.userData.characterPartName =
            name;

        if (options.bodyPart) {
            mesh.userData.isBodyPart =
                true;
        }

        parent.add(mesh);

        return mesh;
    }

    /*
     * ============================================================
     * JOINT GROUP
     *
     * The important change here is that limbs are no longer
     * independent floating meshes.
     *
     * Each limb is attached through a joint group positioned
     * exactly at the connection point.
     * ============================================================
     */

    function createLimb(
        name,
        size,
        color,
        jointPosition,
        parent,
        options = {}
    ) {
        const T = getThree();

        if (!T) {
            return null;
        }

        const joint =
            new T.Group();

        joint.name =
            name;

        joint.position.set(
            jointPosition.x || 0,
            jointPosition.y || 0,
            jointPosition.z || 0
        );

        joint.userData.characterJoint =
            true;

        joint.userData.characterPartName =
            name;

        parent.add(joint);

        /*
         * BoxGeometry is centered.
         *
         * Put the box half its height below the joint so
         * the top of the limb starts exactly at the joint.
         */
        const mesh =
            createBlock(
                name + "Mesh",
                size,
                color,
                {
                    x: 0,
                    y: -size.y / 2,
                    z: 0
                },
                joint,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true,
                    roughness:
                        options.roughness ??
                        0.84
                }
            );

        joint.userData.mesh =
            mesh;

        joint.userData.characterPart =
            true;

        return joint;
    }

    /*
     * ============================================================
     * FACE
     * ============================================================
     */

    function createFace(
        head,
        headSize
    ) {
        const T = getThree();

        if (!T) {
            return null;
        }

        const face =
            new T.Group();

        face.name =
            "Face";

        /*
         * The face sits slightly in front of
         * the front (+Z) surface.
         */
        const frontZ =
            headSize.z / 2 +
            0.012;

        const eyeMaterial =
            makeMaterial(
                "#111111",
                {
                    roughness: 0.95
                }
            );

        /*
         * Classic rectangular eyes.
         */

        const eyeGeometry =
            new T.BoxGeometry(
                0.16,
                0.22,
                0.035
            );

        const leftEye =
            new T.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        leftEye.name =
            "LeftEye";

        leftEye.position.set(
            -0.30,
            0.18,
            frontZ
        );

        face.add(
            leftEye
        );

        const rightEye =
            new T.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        rightEye.name =
            "RightEye";

        rightEye.position.set(
            0.30,
            0.18,
            frontZ
        );

        face.add(
            rightEye
        );

        /*
         * Simple classic mouth.
         */

        const mouthGeometry =
            new T.BoxGeometry(
                0.42,
                0.055,
                0.035
            );

        const mouth =
            new T.Mesh(
                mouthGeometry,
                eyeMaterial
            );

        mouth.name =
            "Mouth";

        mouth.position.set(
            0,
            -0.18,
            frontZ
        );

        face.add(
            mouth
        );

        head.add(
            face
        );

        return face;
    }

    /*
     * ============================================================
     * CHARACTER
     * ============================================================
     */

    function createCharacter(
        options = {}
    ) {
        const T = getThree();

        if (!T) {
            console.error(
                "[WebBlox Player] Three.js is not loaded."
            );

            return null;
        }

        /*
         * --------------------------------------------------------
         * ROOT
         * --------------------------------------------------------
         */

        const character =
            new T.Group();

        character.name =
            options.name ||
            "Character";

        character.userData.isCharacter =
            true;

        character.userData.playerId =
            options.playerId ||
            null;

        character.userData.characterType =
            "Blocky";

        character.userData.rigType =
            "Blocky";

        /*
         * --------------------------------------------------------
         * HUMANOID
         * --------------------------------------------------------
         */

        const humanoid = {
            name: "Humanoid",

            rigType: "Blocky",

            health:
                Number(
                    options.health ??
                    100
                ),

            maxHealth:
                Number(
                    options.maxHealth ??
                    100
                ),

            walkSpeed:
                Number(
                    options.walkSpeed ??
                    16
                ),

            jumpPower:
                Number(
                    options.jumpPower ??
                    50
                ),

            jumpHeight:
                Number(
                    options.jumpHeight ??
                    7.2
                ),

            autoRotate:
                options.autoRotate !== false,

            state:
                "Idle",

            platformStand:
                false,

            sit:
                false,

            canJump:
                true
        };

        character.userData.humanoid =
            humanoid;

        /*
         * --------------------------------------------------------
         * COLORS
         * --------------------------------------------------------
         */

        const skinColor =
            options.skinColor ||
            options.bodyColor ||
            "#d7a77b";

        const shirtColor =
            options.shirtColor ||
            "#1769d1";

        const pantsColor =
            options.pantsColor ||
            "#202020";

        const shoeColor =
            options.shoeColor ||
            "#111111";

        /*
         * --------------------------------------------------------
         * DIMENSIONS
         *
         * Total character:
         *
         * feet     = 0
         * legs     = 2.2
         * torso    = 2.1
         * neck gap = 0.15
         * head     = 1.45
         *
         * ~= 5.9
         *
         * This is intentionally chunky and blocky.
         * --------------------------------------------------------
         */

        const dimensions = {

            head: {
                x: 1.55,
                y: 1.55,
                z: 1.55
            },

            torso: {
                x: 2.0,
                y: 2.05,
                z: 1.05
            },

            arm: {
                x: 0.62,
                y: 1.95,
                z: 0.62
            },

            hand: {
                x: 0.66,
                y: 0.38,
                z: 0.66
            },

            leg: {
                x: 0.82,
                y: 2.10,
                z: 0.82
            },

            foot: {
                x: 0.82,
                y: 0.42,
                z: 1.05
            }
        };

        /*
         * --------------------------------------------------------
         * BODY ROOT
         * --------------------------------------------------------
         */

        const body =
            new T.Group();

        body.name =
            "Body";

        character.add(
            body
        );

        /*
         * --------------------------------------------------------
         * ROOT PART
         * --------------------------------------------------------
         */

        const rootPart =
            new T.Object3D();

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
         * --------------------------------------------------------
         * TORSO
         * --------------------------------------------------------
         */

        const torso =
            createBlock(
                "Torso",
                dimensions.torso,
                shirtColor,
                {
                    x: 0,
                    y: 3.05,
                    z: 0
                },
                body,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        /*
         * Keep both names so existing code that expects
         * upperTorso/lowerTorso can continue to function.
         */

        torso.userData.bodyAlias =
            true;

        torso.userData.characterPartName =
            "Torso";

        const upperTorso =
            new T.Group();

        upperTorso.name =
            "UpperTorso";

        upperTorso.position.set(
            0,
            3.05,
            0
        );

        upperTorso.userData.characterPart =
            true;

        body.add(
            upperTorso
        );

        /*
         * We use a small invisible joint representation for
         * compatibility while keeping the visible torso as one
         * solid block.
         */

        upperTorso.userData.mesh =
            torso;

        /*
         * --------------------------------------------------------
         * HEAD
         * --------------------------------------------------------
         */

        const neck =
            new T.Group();

        neck.name =
            "Neck";

        neck.position.set(
            0,
            4.075,
            0
        );

        neck.userData.characterJoint =
            true;

        body.add(
            neck
        );

        const head =
            createBlock(
                "Head",
                dimensions.head,
                skinColor,
                {
                    x: 0,
                    y:
                        dimensions.head.y /
                        2 +
                        0.04,
                    z: 0
                },
                neck,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        head.userData.isHead =
            true;

        createFace(
            head,
            dimensions.head
        );

        /*
         * --------------------------------------------------------
         * ARMS
         *
         * Shoulder starts directly against torso.
         * Upper arm extends downward from shoulder.
         * Hand closes the small remaining gap.
         * --------------------------------------------------------
         */

        const shoulderY =
            3.80;

        const armX =
            dimensions.torso.x / 2 +
            dimensions.arm.x / 2 -
            0.015;

        const leftShoulder =
            createLimb(
                "LeftUpperArm",
                dimensions.arm,
                skinColor,
                {
                    x: -armX,
                    y: shoulderY,
                    z: 0
                },
                upperTorso
            );

        const rightShoulder =
            createLimb(
                "RightUpperArm",
                dimensions.arm,
                skinColor,
                {
                    x: armX,
                    y: shoulderY,
                    z: 0
                },
                upperTorso
            );

        /*
         * Hands attach to bottom of arm.
         */

        const leftHand =
            createBlock(
                "LeftHand",
                dimensions.hand,
                skinColor,
                {
                    x: 0,
                    y:
                        -dimensions.arm.y -
                        dimensions.hand.y / 2 +
                        0.015,
                    z: 0
                },
                leftShoulder,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        const rightHand =
            createBlock(
                "RightHand",
                dimensions.hand,
                skinColor,
                {
                    x: 0,
                    y:
                        -dimensions.arm.y -
                        dimensions.hand.y / 2 +
                        0.015,
                    z: 0
                },
                rightShoulder,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        /*
         * Compatibility aliases.
         */

        leftShoulder.userData.bodyAlias =
            "leftUpperArm";

        rightShoulder.userData.bodyAlias =
            "rightUpperArm";

        /*
         * --------------------------------------------------------
         * LEGS
         * --------------------------------------------------------
         */

        const hipY =
            2.025;

        const legX =
            0.50;

        const leftHip =
            createLimb(
                "LeftUpperLeg",
                dimensions.leg,
                pantsColor,
                {
                    x: -legX,
                    y: hipY,
                    z: 0
                },
                body
            );

        const rightHip =
            createLimb(
                "RightUpperLeg",
                dimensions.leg,
                pantsColor,
                {
                    x: legX,
                    y: hipY,
                    z: 0
                },
                body
            );

        /*
         * Feet.
         */

        const leftFoot =
            createBlock(
                "LeftFoot",
                dimensions.foot,
                shoeColor,
                {
                    x: 0,
                    y:
                        -dimensions.leg.y -
                        dimensions.foot.y / 2 +
                        0.015,
                    z: 0.08
                },
                leftHip,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        const rightFoot =
            createBlock(
                "RightFoot",
                dimensions.foot,
                shoeColor,
                {
                    x: 0,
                    y:
                        -dimensions.leg.y -
                        dimensions.foot.y / 2 +
                        0.015,
                    z: 0.08
                },
                rightHip,
                {
                    bodyPart: true,
                    castShadow: true,
                    receiveShadow: true
                }
            );

        /*
         * --------------------------------------------------------
         * BODY PART COMPATIBILITY
         *
         * animations.js expects these names.
         * --------------------------------------------------------
         */

        character.userData.bodyParts = {

            head,

            torso,

            upperTorso,

            lowerTorso:
                torso,

            leftUpperArm:
                leftShoulder,

            rightUpperArm:
                rightShoulder,

            leftLowerArm:
                leftShoulder,

            rightLowerArm:
                rightShoulder,

            leftHand,

            rightHand,

            leftUpperLeg:
                leftHip,

            rightUpperLeg:
                rightHip,

            leftLowerLeg:
                leftHip,

            rightLowerLeg:
                rightHip,

            leftFoot,

            rightFoot
        };

        /*
         * --------------------------------------------------------
         * JOINT DATA
         * --------------------------------------------------------
         */

        character.userData.joints = {

            neck: {
                parent: "UpperTorso",
                child: "Head"
            },

            leftShoulder: {
                parent: "UpperTorso",
                child: "LeftUpperArm"
            },

            rightShoulder: {
                parent: "UpperTorso",
                child: "RightUpperArm"
            },

            leftWrist: {
                parent: "LeftUpperArm",
                child: "LeftHand"
            },

            rightWrist: {
                parent: "RightUpperArm",
                child: "RightHand"
            },

            leftHip: {
                parent: "Torso",
                child: "LeftUpperLeg"
            },

            rightHip: {
                parent: "Torso",
                child: "RightUpperLeg"
            },

            leftAnkle: {
                parent: "LeftUpperLeg",
                child: "LeftFoot"
            },

            rightAnkle: {
                parent: "RightUpperLeg",
                child: "RightFoot"
            }
        };

        /*
         * --------------------------------------------------------
         * RUNTIME
         * --------------------------------------------------------
         */

        character.userData.runtime = {

            grounded:
                options.grounded ??
                false,

            velocity: {

                x: 0,

                y: 0,

                z: 0
            },

            spawnPosition: {

                x:
                    Number(
                        options.spawnPosition
                            ?.x ??
                        0
                    ),

                y:
                    Number(
                        options.spawnPosition
                            ?.y ??
                        0
                    ),

                z:
                    Number(
                        options.spawnPosition
                            ?.z ??
                        0
                    )
            },

            input: {

                moving: false,

                sprint: false,

                jump: false
            },

            alive: true
        };

        /*
         * --------------------------------------------------------
         * BOUNDS
         * --------------------------------------------------------
         */

        character.userData.height =
            5.95;

        character.userData.width =
            2.0;

        character.userData.depth =
            1.2;

        /*
         * --------------------------------------------------------
         * SPAWN POSITION
         * --------------------------------------------------------
         */

        character.position.set(

            Number(
                options.position?.x ??
                options.spawnPosition?.x ??
                0
            ),

            Number(
                options.position?.y ??
                options.spawnPosition?.y ??
                0
            ),

            Number(
                options.position?.z ??
                options.spawnPosition?.z ??
                0
            )
        );

        /*
         * --------------------------------------------------------
         * FINAL FLAGS
         * --------------------------------------------------------
         */

        character.userData.blocky =
            true;

        character.userData.accessories =
            [];

        character.userData.hair =
            null;

        character.userData.hat =
            null;

        return character;
    }

    /*
     * ============================================================
     * DESTROY
     * ============================================================
     */

    function destroyCharacter(
        character
    ) {
        if (!character) {
            return;
        }

        character.traverse(
            child => {

                if (
                    child.geometry &&
                    typeof child.geometry.dispose ===
                        "function"
                ) {
                    child.geometry.dispose();
                }

                if (
                    child.material
                ) {
                    if (
                        Array.isArray(
                            child.material
                        )
                    ) {

                        child.material.forEach(
                            material => {

                                if (
                                    material &&
                                    typeof material.dispose ===
                                        "function"
                                ) {
                                    material.dispose();
                                }

                            }
                        );

                    } else if (
                        typeof child.material.dispose ===
                            "function"
                    ) {

                        child.material.dispose();

                    }
                }
            }
        );

        if (
            character.parent
        ) {
            character.parent.remove(
                character
            );
        }
    }

    /*
     * ============================================================
     * PUBLIC API
     * ============================================================
     */

    PlayerSystem.createCharacter =
        createCharacter;

    PlayerSystem.destroyCharacter =
        destroyCharacter;

    PlayerSystem.characterBuilder =
        "blocky";

})();
