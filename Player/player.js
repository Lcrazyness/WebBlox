/*
 * WebBlox Player Runtime
 * Stage 3A
 *
 * COMPLETE REPLACEMENT
 *
 * IMPORTANT:
 * - This file is /Player/player.js
 * - Character runtime is built into this file.
 * - DOES NOT load ./Player/character.js
 * - DOES NOT load ../Player/character.js
 * - Works when launched from Studio.
 * - Provides WebBloxPlayer.start()
 * - Provides WebBloxPlayer.stop()
 * - WASD movement is WORLD-RELATIVE.
 * - Camera rotation does NOT change WASD direction.
 * - Space = jump.
 * - Shift = run.
 * - Editable hotkeys are supported.
 * - Basic part collision.
 * - CanCollide is respected.
 * - Anchored is preserved on runtime objects.
 * - Transparency is supported.
 * - Character is a classic connected blocky R6-style rig.
 * - No bacon hair.
 * - No capsule geometry.
 * - No rounded limbs.
 * - Third-person runtime camera.
 */

(() => {
    "use strict";


    // ============================================================
    // GLOBAL
    // ============================================================

    if (window.WebBloxPlayer) {

        console.warn(
            "[WebBlox Player] Runtime already exists."
        );

        return;
    }


    // ============================================================
    // STATE
    // ============================================================

    const state = {

        running: false,

        game: null,

        objects: [],

        scene: null,

        camera: null,

        renderer: null,

        viewport: null,

        character: null,

        characterParts: [],

        characterHeight: 5,

        spawn: {

            x: 0,

            y: 3,

            z: 0

        },

        velocity: {

            x: 0,

            y: 0,

            z: 0

        },

        grounded: false,

        keys: new Set(),

        hotkeys: {

            forward:
                "w",

            backward:
                "s",

            left:
                "a",

            right:
                "d",

            jump:
                " ",

            run:
                "shift"

        },

        mouse: {

            locked: false,

            yaw: 0,

            pitch: -12,

            lastX: 0,

            lastY: 0

        },

        camera: {

            distance: 10,

            height: 4,

            smoothing: 0.12

        },

        runtimeObjects: [],

        originalSceneChildren: [],

        onLog: null,

        animationFrame: null,

        lastTime: 0,

        listenersAttached: false,

        savedCamera: null,

        settings: {

            walkSpeed:
                9,

            runSpeed:
                16,

            jumpPower:
                11,

            gravity:
                30,

            cameraEnabled:
                true,

            mouseCamera:
                true,

            canJump:
                true,

            canMove:
                true,

            playerHotkeys:
                true,

            firstPersonLock:
                false,

            scriptableCamera:
                false

        }

    };


    // ============================================================
    // CONSTANTS
    // ============================================================

    const PLAYER_HEIGHT =
        5;

    const PLAYER_WIDTH =
        2;

    const PLAYER_DEPTH =
        1;

    const MOVE_SPEED =
        9;

    const RUN_SPEED =
        16;

    const JUMP_POWER =
        11;

    const GRAVITY =
        30;

    const CAMERA_SENSITIVITY =
        0.18;

    const MIN_PITCH =
        -75;

    const MAX_PITCH =
        35;


    // ============================================================
    // HOTKEY STORAGE
    // ============================================================

    const HOTKEY_STORAGE =
        "webblox_player_hotkeys";


    function loadHotkeys() {

        try {

            const raw =
                window.localStorage.getItem(
                    HOTKEY_STORAGE
                );

            if (!raw) {
                return;
            }

            const parsed =
                JSON.parse(raw);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                Object.assign(
                    state.hotkeys,
                    parsed
                );

            }

        } catch {

            // Ignore invalid saved hotkeys.

        }

    }


    function saveHotkeys() {

        try {

            window.localStorage.setItem(

                HOTKEY_STORAGE,

                JSON.stringify(
                    state.hotkeys
                )

            );

        } catch {

            // Ignore storage failures.

        }

    }


    loadHotkeys();


    // ============================================================
    // HELPERS
    // ============================================================

    function log(
        message
    ) {

        console.log(

            `[WebBlox Player] ${message}`

        );

        if (
            typeof state.onLog ===
            "function"
        ) {

            try {

                state.onLog(
                    message
                );

            } catch {

                // Ignore callback failures.

            }

        }

    }


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


    function degToRad(
        value
    ) {

        return (

            value *
            Math.PI /
            180

        );

    }


    function disposeObject(
        object
    ) {

        if (!object) {
            return;
        }


        object.traverse(
            child => {

                if (
                    child.geometry
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

    }


    // ============================================================
    // FIND THREE
    // ============================================================

    function getThree() {

        if (

            window.THREE &&

            typeof window.THREE.Scene ===
            "function"

        ) {

            return window.THREE;

        }


        throw new Error(
            "Three.js is not available."
        );

    }


    // ============================================================
    // COLOR
    // ============================================================

    function getColor(

        THREE,

        color,

        fallback = "#808080"

    ) {

        try {

            return new THREE.Color(

                color ||
                fallback

            );

        } catch {

            return new THREE.Color(
                fallback
            );

        }

    }


    // ============================================================
    // PLAYER MATERIAL
    // ============================================================

    function makePlayerMaterial(

        THREE,

        color

    ) {

        return new THREE.MeshStandardMaterial({

            color:

                getColor(

                    THREE,

                    color,

                    "#4b8df8"

                ),

            roughness:
                0.8,

            metalness:
                0

        });

    }


    // ============================================================
    // TRANSPARENCY
    // ============================================================

    function applyTransparency(
        mesh,
        transparency
    ) {

        if (!mesh) {
            return;
        }


        const value =
            clamp(

                Number(
                    transparency
                ) || 0,

                0,

                1

            );


        mesh.userData.transparency =
            value;


        const materials =
            Array.isArray(
                mesh.material
            )

                ? mesh.material

                : [mesh.material];


        materials.forEach(
            material => {

                if (!material) {
                    return;
                }


                material.transparent =
                    value > 0;


                material.opacity =
                    1 - value;


                material.depthWrite =
                    value < 1;

            }
        );

    }


    // ============================================================
    // CREATE BLOCK
    // ============================================================

    function createBlock(

        THREE,

        name,

        width,

        height,

        depth,

        material

    ) {

        const mesh =
            new THREE.Mesh(

                new THREE.BoxGeometry(

                    width,

                    height,

                    depth

                ),

                material

            );


        mesh.name =
            name;


        mesh.castShadow =
            true;


        mesh.receiveShadow =
            true;


        mesh.userData =
            mesh.userData ||
            {};


        mesh.userData.characterPart =
            true;


        mesh.userData.canCollide =
            false;


        mesh.userData.transparency =
            0;


        return mesh;

    }


    // ============================================================
    // CLASSIC BLOCKY CHARACTER
    // ============================================================
    //
    // The old character was six independent boxes floating around
    // the root. That made it look like a crude block/Minecraft body.
    //
    // This replacement uses proper pivot groups so the limbs connect
    // to the torso and rotate from their attachment points.
    //
    // All visible geometry is BoxGeometry.
    //
    // Layout:
    //
    //                  HEAD
    //              +----------+
    //
    //       ARM    |  TORSO   |    ARM
    //              |          |
    //              +----------+
    //
    //               LEG  LEG
    //
    // ============================================================

    function createCharacter() {

        const THREE =
            getThree();


        destroyCharacter();


        const root =
            new THREE.Group();


        root.name =
            "WebBloxCharacter";


        root.userData =
            root.userData ||
            {};


        root.userData.webbloxPlayer =
            true;


        root.userData.characterType =
            "R6";


        root.userData.isCharacter =
            true;


        root.position.set(

            state.spawn.x,

            state.spawn.y,

            state.spawn.z

        );


        // --------------------------------------------------------
        // Materials
        // --------------------------------------------------------

        const skinMaterial =
            makePlayerMaterial(

                THREE,

                "#F2C6A8"

            );


        const shirtMaterial =
            makePlayerMaterial(

                THREE,

                "#3B82F6"

            );


        const pantsMaterial =
            makePlayerMaterial(

                THREE,

                "#27364D"

            );


        const faceMaterial =
            new THREE.MeshBasicMaterial({

                color:
                    "#111111"

            });


        // --------------------------------------------------------
        // TORSO
        // --------------------------------------------------------

        const torso =
            createBlock(

                THREE,

                "Torso",

                2,

                2,

                1,

                shirtMaterial

            );


        torso.position.set(

            0,

            3,

            0

        );


        root.add(
            torso
        );


        // --------------------------------------------------------
        // NECK PIVOT
        // --------------------------------------------------------

        const neck =
            new THREE.Group();


        neck.name =
            "Neck";


        neck.position.set(

            0,

            4,

            0

        );


        root.add(
            neck
        );


        // --------------------------------------------------------
        // HEAD
        // --------------------------------------------------------

        const head =
            createBlock(

                THREE,

                "Head",

                1.8,

                1.0,

                1.8,

                skinMaterial

            );


        head.position.set(

            0,

            0.5,

            0

        );


        neck.add(
            head
        );


        // --------------------------------------------------------
        // LEFT SHOULDER PIVOT
        // --------------------------------------------------------

        const leftShoulder =
            new THREE.Group();


        leftShoulder.name =
            "LeftShoulder";


        leftShoulder.position.set(

            -1.4,

            3.75,

            0

        );


        root.add(
            leftShoulder
        );


        const leftArm =
            createBlock(

                THREE,

                "LeftArm",

                0.8,

                2,

                0.8,

                shirtMaterial

            );


        leftArm.position.set(

            -0.1,

            -1,

            0

        );


        leftShoulder.add(
            leftArm
        );


        // --------------------------------------------------------
        // RIGHT SHOULDER PIVOT
        // --------------------------------------------------------

        const rightShoulder =
            new THREE.Group();


        rightShoulder.name =
            "RightShoulder";


        rightShoulder.position.set(

            1.4,

            3.75,

            0

        );


        root.add(
            rightShoulder
        );


        const rightArm =
            createBlock(

                THREE,

                "RightArm",

                0.8,

                2,

                0.8,

                shirtMaterial

            );


        rightArm.position.set(

            0.1,

            -1,

            0

        );


        rightShoulder.add(
            rightArm
        );


        // --------------------------------------------------------
        // LEFT HIP PIVOT
        // --------------------------------------------------------

        const leftHip =
            new THREE.Group();


        leftHip.name =
            "LeftHip";


        leftHip.position.set(

            -0.5,

            2,

            0

        );


        root.add(
            leftHip
        );


        const leftLeg =
            createBlock(

                THREE,

                "LeftLeg",

                0.9,

                2,

                0.9,

                pantsMaterial

            );


        leftLeg.position.set(

            0,

            -1,

            0

        );


        leftHip.add(
            leftLeg
        );


        // --------------------------------------------------------
        // RIGHT HIP PIVOT
        // --------------------------------------------------------

        const rightHip =
            new THREE.Group();


        rightHip.name =
            "RightHip";


        rightHip.position.set(

            0.5,

            2,

            0

        );


        root.add(
            rightHip
        );


        const rightLeg =
            createBlock(

                THREE,

                "RightLeg",

                0.9,

                2,

                0.9,

                pantsMaterial

            );


        rightLeg.position.set(

            0,

            -1,

            0

        );


        rightHip.add(
            rightLeg
        );


        // --------------------------------------------------------
        // FACE
        // --------------------------------------------------------

        const eyeGeometry =
            new THREE.BoxGeometry(

                0.16,

                0.16,

                0.025

            );


        const leftEye =
            new THREE.Mesh(

                eyeGeometry,

                faceMaterial

            );


        leftEye.name =
            "LeftEye";


        leftEye.position.set(

            -0.32,

            0.59,

            0.91

        );


        head.add(
            leftEye
        );


        const rightEye =
            new THREE.Mesh(

                eyeGeometry.clone(),

                faceMaterial

            );


        rightEye.name =
            "RightEye";


        rightEye.position.set(

            0.32,

            0.59,

            0.91

        );


        head.add(
            rightEye
        );


        const mouth =
            new THREE.Mesh(

                new THREE.BoxGeometry(

                    0.45,

                    0.07,

                    0.025

                ),

                faceMaterial

            );


        mouth.name =
            "Mouth";


        mouth.position.set(

            0,

            0.30,

            0.91

        );


        head.add(
            mouth
        );


        // --------------------------------------------------------
        // HUMANOID ROOT PART
        // --------------------------------------------------------

        const humanoidRootPart =
            new THREE.Object3D();


        humanoidRootPart.name =
            "HumanoidRootPart";


        humanoidRootPart.visible =
            false;


        humanoidRootPart.userData =
            humanoidRootPart.userData ||
            {};


        humanoidRootPart.userData.isRootPart =
            true;


        humanoidRootPart.userData.characterPart =
            true;


        root.add(
            humanoidRootPart
        );


        root.userData.humanoidRootPart =
            humanoidRootPart;


        // --------------------------------------------------------
        // BODY PARTS
        // --------------------------------------------------------
        //
        // These aliases are intentionally preserved so the animation
        // system and other existing WebBlox code can still find the
        // body parts it expects.
        // --------------------------------------------------------

        root.userData.bodyParts = {

            head:
                head,

            torso:
                torso,

            upperTorso:
                torso,

            lowerTorso:
                torso,

            leftArm:
                leftArm,

            leftUpperArm:
                leftShoulder,

            leftLowerArm:
                leftShoulder,

            leftHand:
                leftShoulder,

            rightArm:
                rightArm,

            rightUpperArm:
                rightShoulder,

            rightLowerArm:
                rightShoulder,

            rightHand:
                rightShoulder,

            leftLeg:
                leftLeg,

            leftUpperLeg:
                leftHip,

            leftLowerLeg:
                leftHip,

            leftFoot:
                leftHip,

            rightLeg:
                rightLeg,

            rightUpperLeg:
                rightHip,

            rightLowerLeg:
                rightHip,

            rightFoot:
                rightHip

        };


        // --------------------------------------------------------
        // ANIMATION PIVOTS
        // --------------------------------------------------------

        root.userData.animationPivots = {

            neck:

                neck,

            leftShoulder:

                leftShoulder,

            rightShoulder:

                rightShoulder,

            leftHip:

                leftHip,

            rightHip:

                rightHip

        };


        // --------------------------------------------------------
        // JOINT MAP
        // --------------------------------------------------------

        root.userData.joints = {

            neck: {

                parent:
                    "Torso",

                child:
                    "Head"

            },

            leftShoulder: {

                parent:
                    "Torso",

                child:
                    "LeftArm"

            },

            rightShoulder: {

                parent:
                    "Torso",

                child:
                    "RightArm"

            },

            leftHip: {

                parent:
                    "Torso",

                child:
                    "LeftLeg"

            },

            rightHip: {

                parent:
                    "Torso",

                child:
                    "RightLeg"

            }

        };


        // --------------------------------------------------------
        // HUMANOID
        // --------------------------------------------------------

        root.userData.humanoid = {

            state:
                "Idle",

            walkSpeed:
                state.settings.walkSpeed,

            runSpeed:
                state.settings.runSpeed,

            jumpPower:
                state.settings.jumpPower,

            health:
                100,

            maxHealth:
                100,

            canJump:
                state.settings.canJump,

            canMove:
                state.settings.canMove

        };


        // --------------------------------------------------------
        // RUNTIME STATE
        // --------------------------------------------------------

        root.userData.runtime = {

            grounded:
                false,

            velocity:
                state.velocity,

            alive:
                true,

            position:
                root.position,

            spawnPosition: {

                x:
                    state.spawn.x,

                y:
                    state.spawn.y,

                z:
                    state.spawn.z

            }

        };


        // --------------------------------------------------------
        // CHARACTER SIZE
        // --------------------------------------------------------

        root.userData.height =
            PLAYER_HEIGHT;


        root.userData.width =
            PLAYER_WIDTH;


        root.userData.depth =
            PLAYER_DEPTH;


        // --------------------------------------------------------
        // CHARACTER ROOT
        // --------------------------------------------------------

        root.userData.rootPart =
            humanoidRootPart;


        // --------------------------------------------------------
        // STATE REFERENCES
        // --------------------------------------------------------

        state.character =
            root;


        state.characterParts =
            [];


        root.traverse(
            child => {

                if (

                    child.isMesh &&

                    child !== humanoidRootPart

                ) {

                    state.characterParts.push(
                        child
                    );

                }

            }
        );


        state.characterHeight =
            PLAYER_HEIGHT;


        // --------------------------------------------------------
        // ADD TO SCENE
        // --------------------------------------------------------

        state.scene.add(
            root
        );


        log(
            "Classic connected blocky R6 character created."
        );

    }


    // ============================================================
    // DESTROY CHARACTER
    // ============================================================

    function destroyCharacter() {

        if (
            !state.character
        ) {

            return;

        }


        if (
            state.character.parent
        ) {

            state.character.parent.remove(
                state.character
            );

        }


        disposeObject(
            state.character
        );


        state.character =
            null;


        state.characterParts =
            [];

    }


    // ============================================================
    // FIND SPAWN
    // ============================================================

    function findSpawn() {

        const spawn =
            state.objects.find(

                object =>

                    object &&

                    (

                        object.type ===
                            "SpawnLocation" ||

                        object.className ===
                            "SpawnLocation"

                    )

            );


        if (!spawn) {

            state.spawn = {

                x:
                    0,

                y:
                    3,

                z:
                    0

            };


            return;

        }


        state.spawn = {

            x:

                Number(

                    spawn.position?.x ||

                    0

                ),

            y:

                Number(

                    spawn.position?.y ||

                    0

                ) +

                2.5,

            z:

                Number(

                    spawn.position?.z ||

                    0

                )

        };


        log(

            `Spawn found at ${state.spawn.x}, ${state.spawn.y}, ${state.spawn.z}.`

        );

    }


    // ============================================================
    // CREATE RUNTIME WORLD
    // ============================================================

    function createRuntimeWorld() {

        const THREE =
            getThree();


        state.runtimeObjects =
            [];


        for (

            const object

            of state.objects

        ) {

            if (!object) {
                continue;
            }


            if (

                object.type !==
                    "Part" &&

                object.type !==
                    "SpawnLocation"

            ) {

                continue;

            }


            const size = {

                x:

                    Math.max(

                        0.1,

                        Number(

                            object.size?.x ||

                            1

                        )

                    ),

                y:

                    Math.max(

                        0.1,

                        Number(

                            object.size?.y ||

                            1

                        )

                    ),

                z:

                    Math.max(

                        0.1,

                        Number(

                            object.size?.z ||

                            1

                        )

                    )

            };


            const transparency =
                clamp(

                    Number(
                        object.transparency ||
                        0
                    ),

                    0,

                    1

                );


            const material =
                new THREE.MeshStandardMaterial({

                    color:

                        getColor(

                            THREE,

                            object.color,

                            object.type ===
                                "SpawnLocation"

                                ? "#22c55e"

                                : "#808080"

                        ),


                    roughness:

                        object.material ===
                        "SmoothPlastic"

                            ? 0.35

                            : object.material ===
                              "Metal"

                                ? 0.25

                                : object.material ===
                                  "Glass"

                                    ? 0.15

                                    : 0.8,


                    metalness:

                        object.material ===
                        "Metal"

                            ? 0.85

                            : 0,


                    transparent:

                        transparency > 0 ||
                        object.material ===
                            "Glass",


                    opacity:

                        object.material ===
                            "Glass"

                            ? Math.min(
                                0.45,
                                1 -
                                transparency
                            )

                            : 1 -
                              transparency,

                    depthWrite:
                        transparency < 1

                });


            const mesh =
                new THREE.Mesh(

                    new THREE.BoxGeometry(

                        size.x,

                        size.y,

                        size.z

                    ),

                    material

                );


            mesh.name =
                `Runtime_${object.name || "Part"}`;


            mesh.position.set(

                Number(

                    object.position?.x ||

                    0

                ),

                Number(

                    object.position?.y ||

                    0

                ),

                Number(

                    object.position?.z ||

                    0

                )

            );


            mesh.rotation.set(

                degToRad(

                    Number(

                        object.rotation?.x ||

                        0

                    )

                ),

                degToRad(

                    Number(

                        object.rotation?.y ||

                        0

                    )

                ),

                degToRad(

                    Number(

                        object.rotation?.z ||

                        0

                    )

                )

            );


            mesh.castShadow =
                object.castShadow !==
                false;


            mesh.receiveShadow =
                object.receiveShadow !==
                false;


            mesh.userData.webbloxObject =
                object;


            mesh.userData.canCollide =
                object.canCollide !==
                false;


            mesh.userData.anchored =
                object.anchored !==
                false;


            mesh.userData.transparency =
                transparency;


            state.scene.add(
                mesh
            );


            state.runtimeObjects.push({

                mesh,

                object,

                size

            });

        }


        log(

            `Runtime world loaded: ${state.runtimeObjects.length} physical parts.`

        );

    }


    // ============================================================
    // REMOVE RUNTIME WORLD
    // ============================================================

    function removeRuntimeWorld() {

        for (

            const item

            of state.runtimeObjects

        ) {

            if (

                item.mesh &&

                item.mesh.parent

            ) {

                item.mesh.parent.remove(
                    item.mesh
                );

            }


            disposeObject(
                item.mesh
            );

        }


        state.runtimeObjects =
            [];

    }


    // ============================================================
    // CHARACTER AABB
    // ============================================================

    function getCharacterBox(

        x,

        y,

        z

    ) {

        return {

            minX:

                x -
                PLAYER_WIDTH /
                2,

            maxX:

                x +
                PLAYER_WIDTH /
                2,

            minY:

                y,

            maxY:

                y +
                PLAYER_HEIGHT,

            minZ:

                z -
                PLAYER_DEPTH /
                2,

            maxZ:

                z +
                PLAYER_DEPTH /
                2

        };

    }


    // ============================================================
    // PART AABB
    // ============================================================

    function getPartBox(
        item
    ) {

        const mesh =
            item.mesh;

        const size =
            item.size;


        /*
         * Runtime collision currently uses
         * axis-aligned bounds.
         *
         * This is deliberately kept simple
         * so the WebBlox Stage 3A runtime stays
         * stable while still supporting
         * CanCollide correctly.
         */

        return {

            minX:

                mesh.position.x -
                size.x /
                2,

            maxX:

                mesh.position.x +
                size.x /
                2,

            minY:

                mesh.position.y -
                size.y /
                2,

            maxY:

                mesh.position.y +
                size.y /
                2,

            minZ:

                mesh.position.z -
                size.z /
                2,

            maxZ:

                mesh.position.z +
                size.z /
                2

        };

    }


    // ============================================================
    // OVERLAP
    // ============================================================

    function overlaps(
        a,
        b
    ) {

        return (

            a.minX < b.maxX &&

            a.maxX > b.minX &&

            a.minY < b.maxY &&

            a.maxY > b.minY &&

            a.minZ < b.maxZ &&

            a.maxZ > b.minZ

        );

    }


    // ============================================================
    // COLLISION
    // ============================================================

    function resolveHorizontalCollision(

        oldX,

        oldZ,

        newX,

        newZ

    ) {

        let resultX =
            newX;

        let resultZ =
            newZ;


        const currentY =
            state.character.position.y;


        const characterAtNew =
            getCharacterBox(

                newX,

                currentY,

                newZ

            );


        for (

            const item

            of state.runtimeObjects

        ) {

            if (

                !item.object ||

                item.object.canCollide ===
                    false

            ) {

                continue;

            }


            const partBox =
                getPartBox(
                    item
                );


            if (

                !overlaps(

                    characterAtNew,

                    partBox

                )

            ) {

                continue;

            }


            // ----------------------------------------------------
            // Try X only.
            // ----------------------------------------------------

            const testX =
                getCharacterBox(

                    newX,

                    currentY,

                    oldZ

                );


            if (

                !overlaps(

                    testX,

                    partBox

                )

            ) {

                resultZ =
                    oldZ;

                continue;

            }


            // ----------------------------------------------------
            // Try Z only.
            // ----------------------------------------------------

            const testZ =
                getCharacterBox(

                    oldX,

                    currentY,

                    newZ

                );


            if (

                !overlaps(

                    testZ,

                    partBox

                )

            ) {

                resultX =
                    oldX;

                continue;

            }


            // ----------------------------------------------------
            // Both blocked.
            // ----------------------------------------------------

            resultX =
                oldX;

            resultZ =
                oldZ;

        }


        return {

            x:
                resultX,

            z:
                resultZ

        };

    }
        const humanoidRootPart =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.5,
                    4.5,
                    0.9
                ),
                rootMaterial
            );

        humanoidRootPart.name =
            "HumanoidRootPart";

        humanoidRootPart.visible =
            false;

        humanoidRootPart.userData.characterPart =
            true;

        root.add(
            humanoidRootPart
        );

        root.userData.humanoidRootPart =
            humanoidRootPart;


        // --------------------------------------------------------
        // Spawn
        // --------------------------------------------------------

        root.position.set(
            state.spawn.x,
            state.spawn.y,
            state.spawn.z
        );


        state.character =
            root;

        state.characterParts =
            [];


        root.traverse(
            child => {

                if (
                    child.isMesh &&
                    child !== humanoidRootPart
                ) {

                    state.characterParts.push(
                        child
                    );

                }

            }
        );


        state.characterHeight =
            5;


        state.scene.add(
            root
        );


        log(
            "Classic blocky R6 character created."
        );

    }


    // ============================================================
    // DESTROY CHARACTER
    // ============================================================

    function destroyCharacter() {

        if (!state.character) {
            return;
        }


        if (
            state.character.parent
        ) {

            state.character.parent.remove(
                state.character
            );

        }


        disposeObject(
            state.character
        );


        state.character = null;

        state.characterParts = [];

    }


    // ============================================================
    // FIND SPAWN
    // ============================================================

    function findSpawn() {

        const spawn =
            state.objects.find(
                object =>
                    object &&
                    (
                        object.type ===
                            "SpawnLocation" ||

                        object.className ===
                            "SpawnLocation"
                    )
            );


        if (!spawn) {

            state.spawn = {

                x: 0,

                y: 3,

                z: 0

            };

            return;

        }


        state.spawn = {

            x:
                Number(
                    spawn.position?.x ||
                    0
                ),

            y:
                Number(
                    spawn.position?.y ||
                    0
                ) + 2.5,

            z:
                Number(
                    spawn.position?.z ||
                    0
                )

        };


        log(
            `Spawn found at ${state.spawn.x}, ${state.spawn.y}, ${state.spawn.z}.`
        );

    }


    // ============================================================
    // CREATE RUNTIME WORLD
    // ============================================================

    function createRuntimeWorld() {

        const THREE =
            getThree();


        state.runtimeObjects = [];


        for (
            const object
            of state.objects
        ) {

            if (!object) {
                continue;
            }


            // ----------------------------------------------------
            // Physical objects
            // ----------------------------------------------------

            if (
                object.type !== "Part" &&
                object.type !== "SpawnLocation"
            ) {

                continue;

            }


            const size = {

                x:
                    Math.max(
                        0.1,
                        Number(
                            object.size?.x ||
                            1
                        )
                    ),

                y:
                    Math.max(
                        0.1,
                        Number(
                            object.size?.y ||
                            1
                        )
                    ),

                z:
                    Math.max(
                        0.1,
                        Number(
                            object.size?.z ||
                            1
                        )
                    )

            };


            const transparency =
                clamp(
                    Number(
                        object.transparency ??
                        0
                    ),
                    0,
                    1
                );


            const isGlass =
                object.material ===
                "Glass";


            const material =
                new THREE.MeshStandardMaterial({

                    color:
                        getColor(
                            THREE,
                            object.color,
                            object.type ===
                                "SpawnLocation"
                                ? "#22c55e"
                                : "#808080"
                        ),

                    roughness:
                        object.material ===
                        "SmoothPlastic"
                            ? 0.35

                            : object.material ===
                              "Metal"

                                ? 0.25

                                : isGlass

                                    ? 0.12

                                    : 0.8,

                    metalness:
                        object.material ===
                        "Metal"
                            ? 0.85
                            : 0,

                    transparent:
                        isGlass ||
                        transparency > 0,

                    opacity:
                        isGlass
                            ? Math.min(
                                0.45,
                                1 - transparency
                            )
                            : 1 - transparency,

                    depthWrite:
                        transparency < 1

                });


            const mesh =
                new THREE.Mesh(

                    new THREE.BoxGeometry(

                        size.x,
                        size.y,
                        size.z

                    ),

                    material

                );


            mesh.name =
                `Runtime_${object.name || "Part"}`;


            mesh.position.set(

                Number(
                    object.position?.x ||
                    0
                ),

                Number(
                    object.position?.y ||
                    0
                ),

                Number(
                    object.position?.z ||
                    0
                )

            );


            mesh.rotation.set(

                degToRad(
                    Number(
                        object.rotation?.x ||
                        0
                    )
                ),

                degToRad(
                    Number(
                        object.rotation?.y ||
                        0
                    )
                ),

                degToRad(
                    Number(
                        object.rotation?.z ||
                        0
                    )
                )

            );


            mesh.castShadow =
                object.castShadow !==
                false;


            mesh.receiveShadow =
                object.receiveShadow !==
                false;


            mesh.userData =
                mesh.userData ||
                {};


            mesh.userData.webbloxObject =
                object;


            mesh.userData.source =
                object;


            mesh.userData.canCollide =
                object.canCollide !==
                false;


            mesh.userData.anchored =
                object.anchored !==
                false;


            mesh.userData.transparency =
                transparency;


            mesh.userData.runtimePart =
                true;


            state.scene.add(
                mesh
            );


            state.runtimeObjects.push({

                mesh,

                object,

                size

            });

        }


        log(
            `Runtime world loaded: ${state.runtimeObjects.length} physical parts.`
        );

    }


    // ============================================================
    // REMOVE RUNTIME WORLD
    // ============================================================

    function removeRuntimeWorld() {

        for (
            const item
            of state.runtimeObjects
        ) {

            if (
                item.mesh &&
                item.mesh.parent
            ) {

                item.mesh.parent.remove(
                    item.mesh
                );

            }


            disposeObject(
                item.mesh
            );

        }


        state.runtimeObjects =
            [];

    }


    // ============================================================
    // CHARACTER AABB
    // ============================================================

    function getCharacterBox(
        x,
        y,
        z
    ) {

        return {

            minX:
                x -
                PLAYER_WIDTH /
                2,

            maxX:
                x +
                PLAYER_WIDTH /
                2,

            minY:
                y,

            maxY:
                y +
                PLAYER_HEIGHT,

            minZ:
                z -
                PLAYER_DEPTH /
                2,

            maxZ:
                z +
                PLAYER_DEPTH /
                2

        };

    }


    // ============================================================
    // PART AABB
    // ============================================================

    function getPartBox(
        item
    ) {

        const mesh =
            item.mesh;

        const size =
            item.size;


        return {

            minX:
                mesh.position.x -
                size.x /
                2,

            maxX:
                mesh.position.x +
                size.x /
                2,

            minY:
                mesh.position.y -
                size.y /
                2,

            maxY:
                mesh.position.y +
                size.y /
                2,

            minZ:
                mesh.position.z -
                size.z /
                2,

            maxZ:
                mesh.position.z +
                size.z /
                2

        };

    }


    // ============================================================
    // OVERLAP
    // ============================================================

    function overlaps(
        a,
        b
    ) {

        return (

            a.minX < b.maxX &&
            a.maxX > b.minX &&

            a.minY < b.maxY &&
            a.maxY > b.minY &&

            a.minZ < b.maxZ &&
            a.maxZ > b.minZ

        );

    }


    // ============================================================
    // HORIZONTAL COLLISION
    // ============================================================

    function resolveHorizontalCollision(
        oldX,
        oldZ,
        newX,
        newZ
    ) {

        let resultX =
            newX;

        let resultZ =
            newZ;


        if (
            !state.settings.canMove ||
            !state.settings.collisions
        ) {

            return {

                x:
                    resultX,

                z:
                    resultZ

            };

        }


        const currentY =
            state.character.position.y;


        const targetBox =
            getCharacterBox(

                newX,

                currentY,

                newZ

            );


        for (
            const item
            of state.runtimeObjects
        ) {

            if (!item.object) {
                continue;
            }


            if (
                item.object.canCollide ===
                false
            ) {

                continue;

            }


            const partBox =
                getPartBox(
                    item
                );


            if (
                !overlaps(
                    targetBox,
                    partBox
                )
            ) {

                continue;

            }


            // ----------------------------------------------------
            // Try X movement only.
            // ----------------------------------------------------

            const xBox =
                getCharacterBox(

                    newX,

                    currentY,

                    oldZ

                );


            const blockedX =
                overlaps(
                    xBox,
                    partBox
                );


            // ----------------------------------------------------
            // Try Z movement only.
            // ----------------------------------------------------

            const zBox =
                getCharacterBox(

                    oldX,

                    currentY,

                    newZ

                );


            const blockedZ =
                overlaps(
                    zBox,
                    partBox
                );


            if (
                blockedX
            ) {

                resultX =
                    oldX;

            }


            if (
                blockedZ
            ) {

                resultZ =
                    oldZ;

            }


            if (
                blockedX &&
                blockedZ
            ) {

                resultX =
                    oldX;

                resultZ =
                    oldZ;

            }

        }


        return {

            x:
                resultX,

            z:
                resultZ

        };

    }


    // ============================================================
    // VERTICAL COLLISION
    // ============================================================

    function resolveVerticalCollision(
        oldY,
        newY
    ) {

        let resultY =
            newY;

        let grounded =
            false;


        if (
            !state.settings.collisions
        ) {

            return {

                y:
                    newY,

                grounded:
                    false

            };

        }


        const x =
            state.character.position.x;

        const z =
            state.character.position.z;


        const oldBox =
            getCharacterBox(

                x,

                oldY,

                z

            );


        const newBox =
            getCharacterBox(

                x,

                newY,

                z

            );


        for (
            const item
            of state.runtimeObjects
        ) {

            if (!item.object) {
                continue;
            }


            if (
                item.object.canCollide ===
                false
            ) {

                continue;

            }


            const partBox =
                getPartBox(
                    item
                );


            if (
                !overlaps(
                    newBox,
                    partBox
                )
            ) {

                continue;

            }


            // ----------------------------------------------------
            // Falling onto a surface.
            // ----------------------------------------------------

            if (
                state.velocity.y <= 0 &&
                oldBox.minY >=
                    partBox.maxY -
                    0.05
            ) {

                resultY =
                    partBox.maxY;

                state.velocity.y =
                    0;

                grounded =
                    true;

                continue;

            }


            // ----------------------------------------------------
            // Jumping into underside.
            // ----------------------------------------------------

            if (
                state.velocity.y > 0 &&
                oldBox.maxY <=
                    partBox.minY +
                    0.05
            ) {

                resultY =
                    partBox.minY -
                    PLAYER_HEIGHT;

                state.velocity.y =
                    0;

            }

        }


        return {

            y:
                resultY,

            grounded

        };

    }


    // ============================================================
    // FLOOR CHECK
    // ============================================================

    function findFloorY(
        x,
        z
    ) {

        let floor =
            -0.5;


        for (
            const item
            of state.runtimeObjects
        ) {

            if (
                !item.object ||
                item.object.canCollide ===
                    false
            ) {

                continue;

            }


            const mesh =
                item.mesh;

            const size =
                item.size;


            const insideX =
                x >=
                    mesh.position.x -
                    size.x /
                    2 &&

                x <=
                    mesh.position.x +
                    size.x /
                    2;


            const insideZ =
                z >=
                    mesh.position.z -
                    size.z /
                    2 &&

                z <=
                    mesh.position.z +
                    size.z /
                    2;


            if (
                !insideX ||
                !insideZ
            ) {

                continue;

            }


            const top =
                mesh.position.y +
                size.y /
                2;


            if (
                top >
                floor
            ) {

                floor =
                    top;

            }

        }


        return floor;

    }


    // ============================================================
    // MOVE PLAYER
    // ============================================================
    //
    // IMPORTANT:
    //
    // This function intentionally DOES NOT use camera yaw.
    //
    // W = -Z
    // S = +Z
    // A = -X
    // D = +X
    //
    // Camera rotation is completely separate from movement.
    //
    // This eliminates the old inverted camera-relative behavior.
    // ============================================================

    function updateMovement(
        delta
    ) {

        if (
            !state.character ||
            !state.settings.canMove
        ) {

            return;

        }


        const keys =
            state.keys;


        const forwardKey =
            state.hotkeys.forward;


        const backwardKey =
            state.hotkeys.backward;


        const leftKey =
            state.hotkeys.left;


        const rightKey =
            state.hotkeys.right;


        const jumpKey =
            state.hotkeys.jump;


        const runKey =
            state.hotkeys.run;


        const forward =
            keys.has(
                forwardKey
            );


        const backward =
            keys.has(
                backwardKey
            );


        const left =
            keys.has(
                leftKey
            );


        const right =
            keys.has(
                rightKey
            );


        const running =
            keys.has(
                runKey
            );


        let moveX =
            0;

        let moveZ =
            0;


        // --------------------------------------------------------
        // WORLD-RELATIVE MOVEMENT
        // --------------------------------------------------------

        if (
            forward
        ) {

            moveZ -=
                1;

        }


        if (
            backward
        ) {

            moveZ +=
                1;

        }


        if (
            left
        ) {

            moveX -=
                1;

        }


        if (
            right
        ) {

            moveX +=
                1;

        }


        const magnitude =
            Math.hypot(
                moveX,
                moveZ
            );


        state.moving =
            magnitude >
            0;


        state.sprinting =
            running &&
            state.moving;


        if (
            magnitude >
            0
        ) {

            moveX /=
                magnitude;

            moveZ /=
                magnitude;

        }


        const walkSpeed =
            Number(
                state.settings.walkSpeed
            ) ||
            MOVE_SPEED;


        const runSpeed =
            Number(
                state.settings.runSpeed ||
                RUN_SPEED
            );


        const speed =
            state.sprinting
                ? runSpeed
                : walkSpeed;


        const oldX =
            state.character.position.x;


        const oldZ =
            state.character.position.z;


        const desiredX =
            oldX +
            moveX *
            speed *
            delta;


        const desiredZ =
            oldZ +
            moveZ *
            speed *
            delta;


        const resolved =
            resolveHorizontalCollision(

                oldX,

                oldZ,

                desiredX,

                desiredZ

            );


        state.character.position.x =
            resolved.x;


        state.character.position.z =
            resolved.z;


        // --------------------------------------------------------
        // Jump
        // --------------------------------------------------------

        if (
            state.settings.canJump &&
            keys.has(
                jumpKey
            ) &&
            state.grounded
        ) {

            state.velocity.y =
                Number(
                    state.settings.jumpPower
                ) ||
                JUMP_POWER;


            state.grounded =
                false;

        }


        // --------------------------------------------------------
        // Gravity
        // --------------------------------------------------------

        state.velocity.y -=
            GRAVITY *
            delta;


        const oldY =
            state.character.position.y;


        const desiredY =
            oldY +
            state.velocity.y *
            delta;


        const vertical =
            resolveVerticalCollision(

                oldY,

                desiredY

            );


        state.character.position.y =
            vertical.y;


        state.grounded =
            vertical.grounded;


        // --------------------------------------------------------
        // Fallback floor.
        // --------------------------------------------------------

        const floorY =
            findFloorY(

                state.character.position.x,

                state.character.position.z

            );


        if (
            state.character.position.y <
            floorY
        ) {

            state.character.position.y =
                floorY;


            state.velocity.y =
                0;


            state.grounded =
                true;

        }


        // --------------------------------------------------------
        // Runtime information.
        // --------------------------------------------------------

        if (
            state.character.userData.runtime
        ) {

            state.character.userData.runtime.grounded =
                state.grounded;

            state.character.userData.runtime.velocity =
                state.velocity;

        }


        if (
            state.character.userData.humanoid
        ) {

            state.character.userData.humanoid.walkSpeed =
                walkSpeed;

            state.character.userData.humanoid.jumpPower =
                state.settings.jumpPower;

            state.character.userData.humanoid.state =
                state.grounded
                    ? (
                        state.moving
                            ? (
                                state.sprinting
                                    ? "Running"
                                    : "Walking"
                            )
                            : "Idle"
                    )
                    : (
                        state.velocity.y > 0
                            ? "Jumping"
                            : "Freefall"
                    );

        }

    }


    // ============================================================
    // CAMERA INPUT
    // ============================================================

    function updateCamera(
        delta
    ) {

        if (
            !state.camera ||
            !state.character ||
            !state.settings.cameraEnabled
        ) {

            return;

        }


        const character =
            state.character;


        // Camera target is above the feet.
        const target =
            new THREE.Vector3(

                character.position.x,

                character.position.y +
                state.cameraSettings.height,

                character.position.z

            );


        const yaw =
            degToRad(
                state.mouse.yaw
            );


        const pitch =
            degToRad(
                state.mouse.pitch
            );


        const distance =
            state.cameraSettings.distance;


        const horizontalDistance =
            Math.cos(
                pitch
            ) *
            distance;


        const offsetX =
            Math.sin(
                yaw
            ) *
            horizontalDistance;


        const offsetY =
            Math.sin(
                pitch
            ) *
            distance;


        const offsetZ =
            Math.cos(
                yaw
            ) *
            horizontalDistance;


        const desiredPosition =
            new THREE.Vector3(

                target.x +
                offsetX,

                target.y +
                offsetY,

                target.z +
                offsetZ

            );


        const smoothing =
            clamp(

                state.cameraSettings.smoothing,

                0.01,

                1

            );


        state.camera.position.lerp(

            desiredPosition,

            1 -
            Math.pow(
                1 - smoothing,
                delta *
                60
            )

        );


        state.camera.lookAt(
            target
        );


        // First-person state.
        const firstPerson =
            state.settings.firstPersonLocked ||
            distance <=
                FIRST_PERSON_DISTANCE;


        character.visible =
            !firstPerson;

    }


    // ============================================================
    // CHARACTER ANIMATION
    // ============================================================

    function updateCharacterAnimation(
        delta
    ) {

        if (
            !state.character
        ) {

            return;

        }


        const pivots =
            state.character.userData
                ?.animationPivots;


        if (!pivots) {

            return;

        }


        state.animationTime +=
            delta;


        const time =
            state.animationTime;


        const moving =
            state.moving;


        const sprinting =
            state.sprinting;


        const grounded =
            state.grounded;


        let targetArm =
            0;


        let targetLeg =
            0;


        if (
            moving &&
            grounded
        ) {

            const speed =
                sprinting
                    ? 12
                    : 8;


            const amount =
                sprinting
                    ? 0.7
                    : 0.48;


            const swing =
                Math.sin(
                    time *
                    speed
                ) *
                amount;


            targetArm =
                swing;

            targetLeg =
                swing;

        }


        if (
            pivots.leftShoulder
        ) {

            pivots.leftShoulder.rotation.x +=
                (
                    targetArm -
                    pivots.leftShoulder.rotation.x
                ) *
                Math.min(
                    1,
                    delta *
                    12
                );

        }


        if (
            pivots.rightShoulder
        ) {

            pivots.rightShoulder.rotation.x +=
                (
                    -targetArm -
                    pivots.rightShoulder.rotation.x
                ) *
                Math.min(
                    1,
                    delta *
                    12
                );

        }


        if (
            pivots.leftHip
        ) {

            pivots.leftHip.rotation.x +=
                (
                    -targetLeg -
                    pivots.leftHip.rotation.x
                ) *
                Math.min(
                    1,
                    delta *
                    12
                );

        }


        if (
            pivots.rightHip
        ) {

            pivots.rightHip.rotation.x +=
                (
                    targetLeg -
                    pivots.rightHip.rotation.x
                ) *
                Math.min(
                    1,
                    delta *
                    12
                );

        }


        if (
            !grounded
        ) {

            const jumpPose =
                state.velocity.y >
                0
                    ? -0.35
                    : -0.15;


            if (
                pivots.leftShoulder
            ) {

                pivots.leftShoulder.rotation.x +=
                    (
                        jumpPose -
                        pivots.leftShoulder.rotation.x
                    ) *
                    Math.min(
                        1,
                        delta *
                        8
                    );

            }


            if (
                pivots.rightShoulder
            ) {

                pivots.rightShoulder.rotation.x +=
                    (
                        jumpPose -
                        pivots.rightShoulder.rotation.x
                    ) *
                    Math.min(
                        1,
                        delta *
                        8
                    );

            }

        }


        // Tiny idle breathing movement.
        if (
            !moving &&
            grounded &&
            pivots.neck
        ) {

            pivots.neck.rotation.x =
                Math.sin(
                    time *
                    2
                ) *
                0.015;

        }

    }


    // ============================================================
    // KEY NORMALIZATION
    // ============================================================

    function normalizeKey(
        event
    ) {

        if (
            !event
        ) {

            return "";

        }


        if (
            event.code ===
            "Space"
        ) {

            return " ";

        }


        if (
            event.code ===
                "ShiftLeft" ||
            event.code ===
                "ShiftRight"
        ) {

            return "shift";

        }


        return String(
            event.key ||
            ""
        ).toLowerCase();

    }


    // ============================================================
    // KEY DOWN
    // ============================================================

    function keyDown(
        event
    ) {

        if (
            !state.running ||
            !state.settings.hotkeysEnabled
        ) {

            return;

        }


        const key =
            normalizeKey(
                event
            );


        if (!key) {
            return;
        }


        state.keys.add(
            key
        );


        if (
            [
                state.hotkeys.forward,
                state.hotkeys.backward,
                state.hotkeys.left,
                state.hotkeys.right,
                state.hotkeys.jump,
                state.hotkeys.run
            ].includes(
                key
            )
        ) {

            event.preventDefault();

        }

    }


    // ============================================================
    // KEY UP
    // ============================================================

    function keyUp(
        event
    ) {

        const key =
            normalizeKey(
                event
            );


        if (!key) {
            return;
        }


        state.keys.delete(
            key
        );

    }


    // ============================================================
    // MOUSE LOOK
    // ============================================================

    function mouseMove(
        event
    ) {

        if (
            !state.running ||
            !state.settings.mouseCamera ||
            state.settings.scriptable
        ) {

            return;

        }


        /*
         * Camera rotation is ONLY camera rotation.
         *
         * It never changes the movement axes.
         */

        const movementX =
            Number(
                event.movementX ||
                0
            );


        const movementY =
            Number(
                event.movementY ||
                0
            );


        const sensitivity =
            CAMERA_SENSITIVITY *
            Number(
                state.settings.sensitivity ||
                1
            );


        state.mouse.yaw -=
            movementX *
            sensitivity;


        state.mouse.pitch -=
            movementY *
            sensitivity;


        state.mouse.pitch =
            clamp(

                state.mouse.pitch,

                MIN_PITCH,

                MAX_PITCH

            );

    }


    // ============================================================
    // POINTER LOCK
    // ============================================================

    function pointerLockChange() {

        state.mouse.locked =
            document.pointerLockElement ===
            state.viewport;

    }


    // ============================================================
    // VIEWPORT CLICK
    // ============================================================
    //
    // Left click enters mouse-look mode.
    // Right click is NOT required.
    // ============================================================

    function viewportClick(
        event
    ) {

        if (
            !state.running ||
            !state.settings.mouseCamera ||
            state.settings.scriptable
        ) {

            return;

        }


        if (
            event.button !==
            0
        ) {

            return;

        }


        if (
            document.pointerLockElement !==
            state.viewport
        ) {

            try {

                state.viewport.requestPointerLock();

            } catch {

                // Pointer lock unavailable.

            }

        }

    }


    // ============================================================
    // RIGHT CLICK
    // ============================================================

    function viewportContextMenu(
        event
    ) {

        /*
         * Never allow the browser context menu to interrupt
         * gameplay.
         */

        event.preventDefault();

    }


    // ============================================================
    // WHEEL ZOOM
    // ============================================================

    function mouseWheel(
        event
    ) {

        if (
            !state.running
        ) {

            return;

        }


        if (
            state.settings.firstPersonLocked
        ) {

            event.preventDefault();

            return;

        }


        if (
            !state.settings.allowZoom
        ) {

            return;

        }


        event.preventDefault();


        state.cameraSettings.distance =
            clamp(

                state.cameraSettings.distance +
                event.deltaY *
                ZOOM_STEP *
                state.cameraSettings.distance,

                MIN_CAMERA_DISTANCE,

                MAX_CAMERA_DISTANCE

            );

    }


    // ============================================================
    // HOTKEY SETTER
    // ============================================================

    function setHotkey(
        action,
        key
    ) {

        const validActions = [
            "forward",
            "backward",
            "left",
            "right",
            "jump",
            "run"
        ];


        if (
            !validActions.includes(
                action
            )
        ) {

            return false;

        }


        const normalized =
            String(
                key ||
                ""
            ).toLowerCase();


        if (!normalized) {

            return false;

        }


        state.hotkeys[action] =
            normalized;


        saveHotkeys();


        log(
            `Hotkey changed: ${action} = ${normalized === " " ? "Space" : normalized}`
        );


        return true;

    }


    // ============================================================
    // RESET HOTKEYS
    // ============================================================

    function resetHotkeys() {

        state.hotkeys = {

            forward:
                "w",

            backward:
                "s",

            left:
                "a",

            right:
                "d",

            jump:
                " ",

            run:
                "shift"

        };


        saveHotkeys();


        log(
            "Player hotkeys reset."
        );

    }


    // ============================================================
    // SAVE HOTKEYS
    // ============================================================

    function saveHotkeys() {

        try {

            window.localStorage.setItem(

                "webblox_player_hotkeys",

                JSON.stringify(
                    state.hotkeys
                )

            );

        } catch {

            // Ignore unavailable storage.

        }

    }


    // ============================================================
    // SETTINGS MENU
    // ============================================================

    let settingsMenu =
        null;


    function createSettingsMenu() {

        if (
            settingsMenu
        ) {

            return;

        }


        settingsMenu =
            document.createElement(
                "div"
            );


        settingsMenu.id =
            "webbloxPlayerSettings";


        settingsMenu.innerHTML = `
            <div class="webblox-player-settings-backdrop">
                <div class="webblox-player-settings-panel">

                    <div class="webblox-player-settings-header">

                        <div>
                            <strong>WebBlox Player Settings</strong>
                            <small>Controls & camera</small>
                        </div>

                        <button
                            type="button"
                            id="webbloxPlayerSettingsClose"
                        >
                            ×
                        </button>

                    </div>


                    <div class="webblox-player-settings-body">

                        <label>
                            Camera Sensitivity
                            <input
                                type="range"
                                id="webbloxSensitivity"
                                min="0.1"
                                max="3"
                                step="0.05"
                            >
                        </label>


                        <label>
                            Camera Distance
                            <input
                                type="range"
                                id="webbloxCameraDistance"
                                min="0"
                                max="20"
                                step="0.1"
                            >
                        </label>


                        <label>
                            <input
                                type="checkbox"
                                id="webbloxAllowZoom"
                            >
                            Allow Camera Zoom
                        </label>


                        <label>
                            <input
                                type="checkbox"
                                id="webbloxFirstPerson"
                            >
                            First Person Lock
                        </label>


                        <hr>


                        <h3>Player Hotkeys</h3>


                        <div class="webblox-hotkey-row">
                            <span>Forward</span>
                            <button data-hotkey="forward">W</button>
                        </div>

                        <div class="webblox-hotkey-row">
                            <span>Backward</span>
                            <button data-hotkey="backward">S</button>
                        </div>

                        <div class="webblox-hotkey-row">
                            <span>Left</span>
                            <button data-hotkey="left">A</button>
                        </div>

                        <div class="webblox-hotkey-row">
                            <span>Right</span>
                            <button data-hotkey="right">D</button>
                        </div>

                        <div class="webblox-hotkey-row">
                            <span>Jump</span>
                            <button data-hotkey="jump">Space</button>
                        </div>

                        <div class="webblox-hotkey-row">
                            <span>Run</span>
                            <button data-hotkey="run">Shift</button>
                        </div>


                        <button
                            type="button"
                            id="webbloxResetHotkeys"
                            class="webblox-settings-secondary"
                        >
                            Reset Hotkeys
                        </button>

                    </div>

                </div>
            </div>
        `;


        document.body.appendChild(
            settingsMenu
        );


        bindSettingsMenu();

    }


    // ============================================================
    // BIND SETTINGS
    // ============================================================

    function bindSettingsMenu() {

        if (
            !settingsMenu
        ) {

            return;

        }


        const close =
            settingsMenu.querySelector(
                "#webbloxPlayerSettingsClose"
            );


        close?.addEventListener(
            "click",
            () => {

                settingsMenu.style.display =
                    "none";

                releasePointerLock();

            }
        );


        const sensitivity =
            settingsMenu.querySelector(
                "#webbloxSensitivity"
            );


        sensitivity?.addEventListener(
            "input",
            event => {

                state.settings.sensitivity =
                    Number(
                        event.target.value
                    );


                savePlayerPreferences();

            }
        );


        const distance =
            settingsMenu.querySelector(
                "#webbloxCameraDistance"
            );


        distance?.addEventListener(
            "input",
            event => {

                state.cameraSettings.distance =
                    Number(
                        event.target.value
                    );


                savePlayerPreferences();

            }
        );


        const zoom =
            settingsMenu.querySelector(
                "#webbloxAllowZoom"
            );


        zoom?.addEventListener(
            "change",
            event => {

                state.settings.allowZoom =
                    event.target.checked;

                savePlayerPreferences();

            }
        );


        const firstPerson =
            settingsMenu.querySelector(
                "#webbloxFirstPerson"
            );


        firstPerson?.addEventListener(
            "change",
            event => {

                state.settings.firstPersonLocked =
                    event.target.checked;

                savePlayerPreferences();

            }
        );


        settingsMenu
            .querySelectorAll(
                "[data-hotkey]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            beginHotkeyCapture(
                                button.dataset.hotkey,
                                button
                            );

                        }
                    );

                }
            );


        settingsMenu
            .querySelector(
                "#webbloxResetHotkeys"
            )
            ?.addEventListener(
                "click",
                () => {

                    resetHotkeys();

                    updateSettingsMenu();

                }
            );

    }


    // ============================================================
    // HOTKEY CAPTURE
    // ============================================================

    let hotkeyCapture =
        null;


    function beginHotkeyCapture(
        action,
        button
    ) {

        if (
            hotkeyCapture
        ) {

            return;

        }


        hotkeyCapture =
            action;


        button.textContent =
            "Press key";


        const listener =
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    finish();

                    return;

                }


                const key =
                    normalizeKey(
                        event
                    );


                if (!key) {
                    return;
                }


                setHotkey(
                    action,
                    key
                );


                finish();

            };


        function finish() {

            window.removeEventListener(
                "keydown",
                listener,
                true
            );


            hotkeyCapture =
                null;


            updateSettingsMenu();

        }


        window.addEventListener(
            "keydown",
            listener,
            true
        );

    }


    // ============================================================
    // UPDATE SETTINGS MENU
    // ============================================================

    function updateSettingsMenu() {

        if (
            !settingsMenu
        ) {

            return;

        }


        const sensitivity =
            settingsMenu.querySelector(
                "#webbloxSensitivity"
            );


        if (
            sensitivity
        ) {

            sensitivity.value =
                state.settings.sensitivity;

        }


        const distance =
            settingsMenu.querySelector(
                "#webbloxCameraDistance"
            );


        if (
            distance
        ) {

            distance.value =
                state.cameraSettings.distance;

        }


        const zoom =
            settingsMenu.querySelector(
                "#webbloxAllowZoom"
            );


        if (
            zoom
        ) {

            zoom.checked =
                state.settings.allowZoom;

        }


        const firstPerson =
            settingsMenu.querySelector(
                "#webbloxFirstPerson"
            );


        if (
            firstPerson
        ) {

            firstPerson.checked =
                state.settings.firstPersonLocked;

        }


        settingsMenu
            .querySelectorAll(
                "[data-hotkey]"
            )
            .forEach(
                button => {

                    const action =
                        button.dataset.hotkey;

                    const value =
                        state.hotkeys[action];


                    button.textContent =
                        value ===
                        " "
                            ? "Space"
                            : value;

                }
            );

    }


    // ============================================================
    // TOGGLE SETTINGS
    // ============================================================

    function toggleSettingsMenu() {

        createSettingsMenu();


        if (
            settingsMenu.style.display ===
            "flex"
        ) {

            settingsMenu.style.display =
                "none";

            releasePointerLock();

            return;

        }


        updateSettingsMenu();


        settingsMenu.style.display =
            "flex";


        releasePointerLock();

    }


    // ============================================================
    // RELEASE POINTER LOCK
    // ============================================================

    function releasePointerLock() {

        try {

            if (
                document.pointerLockElement
            ) {

                document.exitPointerLock();

            }

        } catch {

            // Ignore browser restrictions.

        }

    }


    // ============================================================
    // PLAYER PREFERENCES
    // ============================================================

    function savePlayerPreferences() {

        try {

            const data = {

                sensitivity:
                    state.settings.sensitivity,

                graphicsQuality:
                    state.settings.graphicsQuality,

                allowZoom:
                    state.settings.allowZoom,

                firstPersonLocked:
                    state.settings.firstPersonLocked,

                cameraDistance:
                    state.cameraSettings.distance

            };


            window.localStorage.setItem(

                "webblox_player_preferences",

                JSON.stringify(
                    data
                )

            );

        } catch {

            // Ignore unavailable storage.

        }

    }


    // ============================================================
    // LOAD PLAYER PREFERENCES
    // ============================================================

    function loadPlayerPreferences() {

        try {

            const raw =
                window.localStorage.getItem(
                    "webblox_player_preferences"
                );


            if (!raw) {

                return;

            }


            const data =
                JSON.parse(
                    raw
                );


            if (
                !data ||
                typeof data !== "object"
            ) {

                return;

            }


            if (
                Number.isFinite(
                    Number(
                        data.sensitivity
                    )
                )
            ) {

                state.settings.sensitivity =
                    clamp(
                        Number(
                            data.sensitivity
                        ),
                        0.1,
                        3
                    );

            }


            if (
                typeof data.graphicsQuality ===
                "string"
            ) {

                state.settings.graphicsQuality =
                    data.graphicsQuality;

            }


            if (
                typeof data.allowZoom ===
                "boolean"
            ) {

                state.settings.allowZoom =
                    data.allowZoom;

            }


            if (
                typeof data.firstPersonLocked ===
                "boolean"
            ) {

                state.settings.firstPersonLocked =
                    data.firstPersonLocked;

            }


            if (
                Number.isFinite(
                    Number(
                        data.cameraDistance
                    )
                )
            ) {

                state.cameraSettings.distance =
                    clamp(

                        Number(
                            data.cameraDistance
                        ),

                        MIN_CAMERA_DISTANCE,

                        MAX_CAMERA_DISTANCE

                    );

            }

        } catch {

            // Ignore invalid preferences.

        }

    }


    loadPlayerPreferences();


    // ============================================================
    // APPLY GAME SETTINGS
    // ============================================================

    function applyGameSettings(
        game
    ) {

        const starterPlayer =
            game?.starterPlayer ||
            game?.StarterPlayer ||
            {};


        state.settings.walkSpeed =
            Number(
                starterPlayer.walkSpeed ??
                starterPlayer.WalkSpeed ??
                state.settings.walkSpeed
            );


        state.settings.jumpPower =
            Number(
                starterPlayer.jumpPower ??
                starterPlayer.JumpPower ??
                state.settings.jumpPower
            );


        state.settings.firstPersonLocked =
            Boolean(
                starterPlayer.firstPersonLocked ??
                starterPlayer.CameraMode ===
                    "LockFirstPerson" ??
                state.settings.firstPersonLocked
            );


        state.settings.hotkeysEnabled =
            starterPlayer.hotkeysEnabled !==
            false;


        state.settings.scriptable =
            starterPlayer.scriptableCamera ===
            true ||
            starterPlayer.cameraType ===
                "Scriptable";


        state.settings.canJump =
            starterPlayer.canJump !==
            false;


        state.settings.canMove =
            starterPlayer.canMove !==
            false;


        state.cameraSettings.distance =
            state.settings.firstPersonLocked
                ? FIRST_PERSON_DISTANCE
                : clamp(

                    Number(
                        state.cameraSettings.distance
                    ) || 10,

                    MIN_CAMERA_DISTANCE,

                    MAX_CAMERA_DISTANCE

                );

    }


    // ============================================================
    // EVENT ATTACHMENT
    // ============================================================

    function attachEvents() {

        if (
            state.listenersAttached
        ) {

            return;

        }


        state.listenersAttached =
            true;


        window.addEventListener(
            "keydown",
            keyDown,
            true
        );


        window.addEventListener(
            "keyup",
            keyUp,
            true
        );


        window.addEventListener(
            "mousemove",
            mouseMove,
            true
        );


        document.addEventListener(
            "pointerlockchange",
            pointerLockChange
        );


        if (
            state.viewport
        ) {

            state.viewport.addEventListener(

                "click",

                viewportClick

            );


            state.viewport.addEventListener(

                "contextmenu",

                viewportContextMenu

            );


            state.viewport.addEventListener(

                "wheel",

                mouseWheel,

                {
                    passive:
                        false
                }

            );

        }

    }


    // ============================================================
    // EVENT DETACHMENT
    // ============================================================

    function detachEvents() {

        window.removeEventListener(
            "keydown",
            keyDown,
            true
        );


        window.removeEventListener(
            "keyup",
            keyUp,
            true
        );


        window.removeEventListener(
            "mousemove",
            mouseMove,
            true
        );


        document.removeEventListener(
            "pointerlockchange",
            pointerLockChange
        );


        if (
            state.viewport
        ) {

            state.viewport.removeEventListener(
                "click",
                viewportClick
            );


            state.viewport.removeEventListener(
                "contextmenu",
                viewportContextMenu
            );


            state.viewport.removeEventListener(
                "wheel",
                mouseWheel
            );

        }


        state.listenersAttached =
            false;


        state.keys.clear();


        releasePointerLock();

    }


    // ============================================================
    // RENDER LOOP
    // ============================================================

    function renderLoop(
        time
    ) {

        if (
            !state.running
        ) {

            return;

        }


        if (
            !state.lastTime
        ) {

            state.lastTime =
                time;

        }


        const delta =
            Math.min(

                0.05,

                (
                    time -
                    state.lastTime
                ) /
                1000

            );


        state.lastTime =
            time;


        updateMovement(
            delta
        );


        updateCharacterAnimation(
            delta
        );


        updateCamera(
            delta
        );


        if (
            state.renderer &&
            state.scene &&
            state.camera
        ) {

            state.renderer.render(
                state.scene,
                state.camera
            );

        }


        state.animationFrame =
            requestAnimationFrame(
                renderLoop
            );

    }


    // ============================================================
    // START
    // ============================================================

    function start(
        options = {}
    ) {

        if (
            state.running
        ) {

            log(
                "Player runtime is already running."
            );

            return state;

        }


        const THREE =
            getThree();


        /*
         * Studio passes these objects directly.
         *
         * We intentionally accept both the modern fields and the
         * older WebBlox naming used by previous Studio versions.
         */

        state.game =
            options.game ||
            null;


        state.objects =
            Array.isArray(
                options.objects
            )
                ? options.objects
                : [];


        state.scene =
            options.scene ||
            new THREE.Scene();


        state.camera =
            options.camera ||
            new THREE.PerspectiveCamera(

                70,

                1,

                0.1,

                1000

            );


        state.renderer =
            options.renderer ||
            null;


        state.viewport =
            options.viewport ||
            options.container ||
            document.querySelector(
                "#viewport"
            );


        state.onLog =
            options.onLog ||
            null;


        // --------------------------------------------------------
        // Apply developer settings.
        // --------------------------------------------------------

        applyGameSettings(
            state.game
        );


        // --------------------------------------------------------
        // Find spawn before character creation.
        // --------------------------------------------------------

        findSpawn();


        // --------------------------------------------------------
        // Build runtime world.
        // --------------------------------------------------------

        createRuntimeWorld();


        // --------------------------------------------------------
        // Create actual player.
        // --------------------------------------------------------

        createCharacter();


        // --------------------------------------------------------
        // Input.
        // --------------------------------------------------------

        attachEvents();


        // --------------------------------------------------------
        // Settings UI.
        // --------------------------------------------------------

        createSettingsMenu();


        // --------------------------------------------------------
        // Runtime state.
        // --------------------------------------------------------

        state.running =
            true;


        state.lastTime =
            performance.now();


        state.animationTime =
            0;


        state.velocity.x =
            0;

        state.velocity.y =
            0;

        state.velocity.z =
            0;


        state.grounded =
            false;


        // --------------------------------------------------------
        // Renderer sizing.
        // --------------------------------------------------------

        if (
            state.renderer &&
            state.viewport
        ) {

            const width =
                Math.max(

                    1,

                    state.viewport.clientWidth ||
                    800

                );


            const height =
                Math.max(

                    1,

                    state.viewport.clientHeight ||
                    600

                );


            state.renderer.setSize(
                width,
                height,
                false
            );


            if (
                state.camera.isPerspectiveCamera
            ) {

                state.camera.aspect =
                    width /
                    height;

                state.camera.updateProjectionMatrix();

            }

        }


        log(
            "Player runtime started."
        );


        log(
            `World-relative controls active: ${state.hotkeys.forward.toUpperCase()} / ${state.hotkeys.backward.toUpperCase()} / ${state.hotkeys.left.toUpperCase()} / ${state.hotkeys.right.toUpperCase()}.`
        );


        log(
            "Left-click enters camera look. Right-click is not required."
        );


        state.animationFrame =
            requestAnimationFrame(
                renderLoop
            );


        return state;

    }
    // ============================================================
    // CAMERA POSITION
    // ============================================================

    state.cameraObjectPosition =
        function(
            x,
            y,
            z,
            smoothing
        ) {

            if (!state.camera) {
                return;
            }


            state.camera.position.x +=
                (
                    x -
                    state.camera.position.x
                ) *
                smoothing;


            state.camera.position.y +=
                (
                    y -
                    state.camera.position.y
                ) *
                smoothing;


            state.camera.position.z +=
                (
                    z -
                    state.camera.position.z
                ) *
                smoothing;


            const targetY =
                state.character.position.y +
                2.5;


            state.camera.lookAt(
                state.character.position.x,
                targetY,
                state.character.position.z
            );

        };


    // ============================================================
    // FRAME
    // ============================================================

    function frame(
        now
    ) {

        if (
            !state.running
        ) {

            return;

        }


        state.animationFrame =
            requestAnimationFrame(
                frame
            );


        const delta =
            Math.min(

                Math.max(

                    (
                        now -
                        state.lastTime
                    ) /
                    1000,

                    0

                ),

                0.05

            );


        state.lastTime =
            now;


        updateMovement(
            delta
        );


        updateGravity(
            delta
        );


        updateCharacterAnimation(
            delta
        );


        updateCamera(
            delta
        );


        if (
            state.renderer &&
            state.scene &&
            state.camera
        ) {

            state.renderer.render(
                state.scene,
                state.camera
            );

        }

    }


    // ============================================================
    // SAVE CAMERA
    // ============================================================

    function saveCamera() {

        if (
            !state.camera
        ) {

            return;

        }


        state.savedCamera = {

            position: {

                x:
                    state.camera.position.x,

                y:
                    state.camera.position.y,

                z:
                    state.camera.position.z

            },

            rotation: {

                x:
                    state.camera.rotation.x,

                y:
                    state.camera.rotation.y,

                z:
                    state.camera.rotation.z

            }

        };

    }


    // ============================================================
    // RESTORE CAMERA
    // ============================================================

    function restoreCamera() {

        if (
            !state.camera ||
            !state.savedCamera
        ) {

            return;

        }


        state.camera.position.set(

            state.savedCamera.position.x,

            state.savedCamera.position.y,

            state.savedCamera.position.z

        );


        state.camera.rotation.set(

            state.savedCamera.rotation.x,

            state.savedCamera.rotation.y,

            state.savedCamera.rotation.z

        );


        state.camera.updateProjectionMatrix();

    }


    // ============================================================
    // START
    // ============================================================

    async function start(
        options = {}
    ) {

        if (
            state.running
        ) {

            log(
                "Player is already running."
            );

            return true;

        }


        const THREE =
            getThree();


        // --------------------------------------------------------
        // Studio must provide these.
        // --------------------------------------------------------

        if (
            !options.scene
        ) {

            throw new Error(

                "Player.start requires a Three.js scene."

            );

        }


        if (
            !options.camera
        ) {

            throw new Error(

                "Player.start requires a Three.js camera."

            );

        }


        if (
            !options.renderer
        ) {

            throw new Error(

                "Player.start requires a Three.js renderer."

            );

        }


        // --------------------------------------------------------
        // Game
        // --------------------------------------------------------

        state.game =
            options.game ||
            {};


        /*
         * Studio's StarterPlayer is the developer-controlled
         * player configuration.
         */
        const starterPlayer =
            state.game.starterPlayer ||
            state.game.StarterPlayer ||
            {};


        // --------------------------------------------------------
        // Saved player preferences.
        // --------------------------------------------------------

        const savedPrefs =
            loadLocalPreferences();


        // --------------------------------------------------------
        // Developer settings
        // --------------------------------------------------------

        state.settings = {

            walkSpeed:

                Number.isFinite(
                    Number(
                        starterPlayer.walkSpeed
                    )
                )

                    ? Number(
                        starterPlayer.walkSpeed
                    )

                    : 12,


            jumpPower:

                Number.isFinite(
                    Number(
                        starterPlayer.jumpPower
                    )
                )

                    ? Number(
                        starterPlayer.jumpPower
                    )

                    : 11,


            firstPersonLocked:

                starterPlayer.firstPersonLocked ===
                true,


            allowZoom:

                starterPlayer.allowZoom !==
                false,


            hotkeysEnabled:

                starterPlayer.hotkeysEnabled !==
                false,


            scriptable:

                starterPlayer.scriptable ===
                true,


            sensitivity:

                Number.isFinite(
                    Number(
                        savedPrefs.sensitivity
                    )
                )

                    ? Number(
                        savedPrefs.sensitivity
                    )

                    : 1,


            graphicsQuality:

                savedPrefs.graphicsQuality ||
                "high"

        };


        // --------------------------------------------------------
        // Developer can explicitly lock first person.
        // --------------------------------------------------------

        if (
            starterPlayer.cameraMode ===
            "LockFirstPerson"
        ) {

            state.settings.firstPersonLocked =
                true;

        }


        // --------------------------------------------------------
        // Developer can explicitly disable movement.
        // --------------------------------------------------------

        if (
            starterPlayer.canMove ===
            false
        ) {

            state.settings.canMove =
                false;

        } else {

            state.settings.canMove =
                true;

        }


        // --------------------------------------------------------
        // Developer can explicitly disable jumping.
        // --------------------------------------------------------

        if (
            starterPlayer.canJump ===
            false
        ) {

            state.settings.canJump =
                false;

        } else {

            state.settings.canJump =
                true;

        }


        // --------------------------------------------------------
        // Camera distance.
        // --------------------------------------------------------

        if (
            state.settings.firstPersonLocked
        ) {

            state.cameraSettings.distance =
                FIRST_PERSON_DISTANCE;

        }


        // --------------------------------------------------------
        // Objects.
        //
        // Copy them so runtime property changes cannot destroy the
        // original Studio project data.
        // --------------------------------------------------------

        state.objects =
            Array.isArray(
                options.objects
            )

                ? options.objects.map(
                    object => {

                        try {

                            return JSON.parse(
                                JSON.stringify(
                                    object
                                )
                            );

                        } catch {

                            return {
                                ...object
                            };

                        }

                    }
                )

                : [];


        // --------------------------------------------------------
        // Render objects.
        // --------------------------------------------------------

        state.scene =
            options.scene;


        state.camera =
            options.camera;


        state.renderer =
            options.renderer;


        /*
         * IMPORTANT:
         *
         * Prefer the explicit viewport from Studio.
         * Fall back to the renderer canvas.
         *
         * This fixes Player loading when Studio changes its
         * viewport container.
         */
        state.viewport =
            options.viewport ||
            options.container ||
            state.renderer.domElement;


        state.onLog =
            typeof options.onLog ===
            "function"

                ? options.onLog

                : null;


        // --------------------------------------------------------
        // Save editor camera.
        // --------------------------------------------------------

        saveCamera();


        // --------------------------------------------------------
        // Reset player state.
        // --------------------------------------------------------

        state.velocity.x =
            0;


        state.velocity.y =
            0;


        state.velocity.z =
            0;


        state.grounded =
            false;


        state.moving =
            false;


        state.sprinting =
            false;


        state.animationTime =
            0;


        state.keys.clear();


        // --------------------------------------------------------
        // Find spawn.
        // --------------------------------------------------------

        findSpawn();


        // --------------------------------------------------------
        // Build runtime world.
        // --------------------------------------------------------

        removeRuntimeWorld();

        createRuntimeWorld();


        // --------------------------------------------------------
        // Create character.
        // --------------------------------------------------------

        createCharacter();


        // --------------------------------------------------------
        // Camera starting orientation.
        // --------------------------------------------------------

        state.mouse.yaw =
            0;


        state.mouse.pitch =
            -12;


        if (
            state.camera
        ) {

            state.camera.position.set(

                state.character.position.x,

                state.character.position.y +
                5,

                state.character.position.z +
                10

            );

        }


        // --------------------------------------------------------
        // Input events.
        // --------------------------------------------------------

        attachInput();


        // --------------------------------------------------------
        // Settings UI.
        // --------------------------------------------------------

        createSettingsMenu();


        // --------------------------------------------------------
        // Renderer.
        // --------------------------------------------------------

        try {

            const width =
                Math.max(

                    1,

                    state.viewport?.clientWidth ||
                    state.renderer.domElement?.clientWidth ||
                    800

                );


            const height =
                Math.max(

                    1,

                    state.viewport?.clientHeight ||
                    state.renderer.domElement?.clientHeight ||
                    600

                );


            state.renderer.setSize(
                width,
                height,
                false
            );


            if (
                state.camera.isPerspectiveCamera
            ) {

                state.camera.aspect =
                    width /
                    height;


                state.camera.updateProjectionMatrix();

            }

        } catch (
            error
        ) {

            log(
                `Renderer sizing warning: ${error.message}`
            );

        }


        // --------------------------------------------------------
        // Mark running.
        // --------------------------------------------------------

        state.running =
            true;


        // --------------------------------------------------------
        // Graphics quality.
        // --------------------------------------------------------

        applyGraphicsQuality();


        // --------------------------------------------------------
        // Runtime information.
        // --------------------------------------------------------

        log(

            `Playing "${state.game.name || "Untitled Game"}".`

        );


        log(

            `Controls: ${state.hotkeys.forward.toUpperCase()} = forward, ${state.hotkeys.backward.toUpperCase()} = backward, ${state.hotkeys.left.toUpperCase()} = left, ${state.hotkeys.right.toUpperCase()} = right.`

        );


        log(
            `${state.hotkeys.jump === " " ? "Space" : state.hotkeys.jump} = jump | ${state.hotkeys.run} = run.`
        );


        log(
            "Camera control is independent from movement."
        );


        log(
            "Left-click enters camera look. Right-click is not required."
        );


        log(
            "Scroll wheel controls camera distance."
        );


        // --------------------------------------------------------
        // Start frame loop.
        // --------------------------------------------------------

        state.lastTime =
            performance.now();


        state.animationFrame =
            requestAnimationFrame(
                frame
            );


        // --------------------------------------------------------
        // Immediate render.
        // --------------------------------------------------------

        if (
            state.renderer &&
            state.scene &&
            state.camera
        ) {

            state.renderer.render(
                state.scene,
                state.camera
            );

        }


        // --------------------------------------------------------
        // Return success.
        // --------------------------------------------------------

        return true;

    }


    // ============================================================
    // STOP
    // ============================================================

    async function stop() {

        if (
            !state.running
        ) {

            return true;

        }


        state.running =
            false;


        if (
            state.animationFrame
        ) {

            cancelAnimationFrame(
                state.animationFrame
            );


            state.animationFrame =
                null;

        }


        detachInput();


        closeSettingsMenu();


        destroySettingsMenu();


        // --------------------------------------------------------
        // Release pointer lock.
        // --------------------------------------------------------

        if (
            document.pointerLockElement
        ) {

            try {

                document.exitPointerLock();

            } catch {

                // Ignore browser restrictions.

            }

        }


        // --------------------------------------------------------
        // Remove runtime player.
        // --------------------------------------------------------

        destroyCharacter();


        // --------------------------------------------------------
        // Remove generated world.
        // --------------------------------------------------------

        removeRuntimeWorld();


        // --------------------------------------------------------
        // Restore Studio camera.
        // --------------------------------------------------------

        restoreCamera();


        // --------------------------------------------------------
        // Reset movement.
        // --------------------------------------------------------

        state.velocity.x =
            0;


        state.velocity.y =
            0;


        state.velocity.z =
            0;


        state.grounded =
            false;


        state.moving =
            false;


        state.sprinting =
            false;


        state.keys.clear();


        log(
            "Player stopped."
        );


        return true;

    }


    // ============================================================
    // RESET CHARACTER
    // ============================================================

    function resetCharacter() {

        if (
            !state.character
        ) {

            return;

        }


        findSpawn();


        state.character.position.set(

            state.spawn.x,

            state.spawn.y,

            state.spawn.z

        );


        state.velocity.x =
            0;


        state.velocity.y =
            0;


        state.velocity.z =
            0;


        state.grounded =
            false;


        state.moving =
            false;


        state.sprinting =
            false;


        log(
            "Character respawned."
        );

    }


    // ============================================================
    // TELEPORT
    // ============================================================

    function teleport(
        x,
        y,
        z
    ) {

        if (
            !state.character
        ) {

            return;

        }


        state.character.position.set(

            Number(x) || 0,

            Number(y) || 0,

            Number(z) || 0

        );


        state.velocity.x =
            0;


        state.velocity.y =
            0;


        state.velocity.z =
            0;


        state.grounded =
            false;

    }


    // ============================================================
    // GET STATE
    // ============================================================

    function getState() {

        return {

            running:
                state.running,

            grounded:
                state.grounded,

            moving:
                state.moving,

            sprinting:
                state.sprinting,

            character:
                !!state.character,

            position:

                state.character

                    ? {

                        x:
                            state.character
                                .position.x,

                        y:
                            state.character
                                .position.y,

                        z:
                            state.character
                                .position.z

                    }

                    : null,

            velocity: {

                x:
                    state.velocity.x,

                y:
                    state.velocity.y,

                z:
                    state.velocity.z

            },

            settings:
                {
                    ...state.settings
                },

            hotkeys:
                {
                    ...state.hotkeys
                }

        };

    }


    // ============================================================
    // SETTING API
    // ============================================================

    function setSetting(
        name,
        value
    ) {

        if (
            !name
        ) {

            return false;

        }


        switch (
            String(name)
        ) {

            case "WalkSpeed":

            case "walkSpeed":

                state.settings.walkSpeed =
                    Math.max(
                        0,
                        Number(value)
                    );

                break;


            case "JumpPower":

            case "jumpPower":

                state.settings.jumpPower =
                    Math.max(
                        0,
                        Number(value)
                    );

                break;


            case "FirstPersonLock":

            case "firstPersonLocked":

                state.settings.firstPersonLocked =
                    Boolean(value);

                if (
                    state.settings.firstPersonLocked
                ) {

                    state.cameraSettings.distance =
                        FIRST_PERSON_DISTANCE;

                }

                break;


            case "AllowZoom":

            case "allowZoom":

                state.settings.allowZoom =
                    Boolean(value);

                break;


            case "HotkeysEnabled":

            case "hotkeysEnabled":

                state.settings.hotkeysEnabled =
                    Boolean(value);

                break;


            case "ScriptableCamera":

            case "scriptable":

                state.settings.scriptable =
                    Boolean(value);

                break;


            case "CanMove":

            case "canMove":

                state.settings.canMove =
                    Boolean(value);

                break;


            case "CanJump":

            case "canJump":

                state.settings.canJump =
                    Boolean(value);

                break;


            case "Sensitivity":

            case "sensitivity":

                state.settings.sensitivity =
                    clamp(
                        Number(value),
                        0.1,
                        3
                    );

                break;


            default:

                return false;

        }


        if (
            state.character?.userData?.humanoid
        ) {

            state.character.userData.humanoid.walkSpeed =
                state.settings.walkSpeed;


            state.character.userData.humanoid.jumpPower =
                state.settings.jumpPower;

        }


        savePlayerPreferences();


        return true;

    }


    // ============================================================
    // SET HOTKEY
    // ============================================================

    function setHotkey(
        action,
        key
    ) {

        const valid = [

            "forward",

            "backward",

            "left",

            "right",

            "jump",

            "run"

        ];


        if (
            !valid.includes(
                action
            )
        ) {

            return false;

        }


        let normalized =
            String(
                key ||
                ""
            ).toLowerCase();


        if (
            normalized ===
            "space"
        ) {

            normalized =
                " ";

        }


        if (!normalized) {

            return false;

        }


        state.hotkeys[action] =
            normalized;


        saveHotkeys();


        return true;

    }


    // ============================================================
    // HOTKEY API
    // ============================================================

    function getHotkeys() {

        return {
            ...state.hotkeys
        };

    }


    // ============================================================
    // SCRIPT API
    // ============================================================
    //
    // The Studio will use this bridge for Script objects.
    // The complete editor/runtime implementation is added in the
    // Studio script system, while this Player runtime provides the
    // safe entry point.
    // ============================================================

    function runScript(
        source,
        scriptObject = null
    ) {

        if (
            typeof source !==
            "string"
        ) {

            return {

                success:
                    false,

                error:
                    "Script source must be a string."

            };

        }


        /*
         * WebBlox Luau is intentionally sandboxed.
         *
         * Never execute arbitrary JavaScript supplied by a game.
         *
         * The full Studio scripting layer parses supported Luau
         * operations and calls this API.
         */

        const lines =
            source.split(
                /\r?\n/
            );


        for (
            const originalLine
            of lines
        ) {

            const line =
                originalLine.trim();


            if (
                !line ||
                line.startsWith("--")
            ) {

                continue;

            }


            const printMatch =
                line.match(
                    /^print\s*\((.*)\)\s*$/
                );


            if (
                printMatch
            ) {

                let value =
                    printMatch[1]
                        .trim();


                if (
                    (
                        value.startsWith(
                            '"'
                        ) &&
                        value.endsWith(
                            '"'
                        )
                    ) ||
                    (
                        value.startsWith(
                            "'"
                        ) &&
                        value.endsWith(
                            "'"
                        )
                    )
                ) {

                    value =
                        value.slice(
                            1,
                            -1
                        );

                }


                log(
                    `[Luau] ${value}`
                );


                continue;

            }


            /*
             * Basic workspace property syntax:
             *
             * workspace.Part.Transparency = 0.5
             * workspace.Part.CanCollide = false
             * workspace.Part.Anchored = true
             *
             * More scripting support is handled by Studio's
             * ScriptService in the next update.
             */

            const propertyMatch =
                line.match(

                    /^workspace\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*=\s*(.+)$/

                );


            if (
                propertyMatch
            ) {

                const objectName =
                    propertyMatch[1];


                const property =
                    propertyMatch[2];


                let value =
                    propertyMatch[3]
                        .trim();


                const object =
                    state.objects.find(
                        item =>
                            item &&
                            item.name ===
                            objectName
                    );


                if (!object) {

                    log(
                        `[Luau] Object not found: ${objectName}`
                    );

                    continue;

                }


                if (
                    value ===
                    "true"
                ) {

                    value =
                        true;

                } else if (
                    value ===
                    "false"
                ) {

                    value =
                        false;

                } else if (
                    (
                        value.startsWith(
                            '"'
                        ) &&
                        value.endsWith(
                            '"'
                        )
                    ) ||
                    (
                        value.startsWith(
                            "'"
                        ) &&
                        value.endsWith(
                            "'"
                        )
                    )
                ) {

                    value =
                        value.slice(
                            1,
                            -1
                        );

                } else if (
                    Number.isFinite(
                        Number(value)
                    )
                ) {

                    value =
                        Number(value);

                }


                const normalizedProperty =
                    property.charAt(0).toLowerCase() +
                    property.slice(1);


                object[
                    normalizedProperty
                ] =
                    value;


                log(
                    `[Luau] ${objectName}.${property} updated.`
                );

            }

        }


        return {

            success:
                true,

            script:
                scriptObject?.name ||
                "Script"

        };

    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxPlayer = {

        version:
            "3A.2",

        state,

        start,

        stop,

        resetCharacter,

        teleport,

        getState,

        setSetting,

        setHotkey,

        getHotkeys,

        runScript,

        isRunning() {

            return state.running;

        }

    };


    // ============================================================
    // READY
    // ============================================================

    console.log(
        "[WebBlox Player] Runtime loaded."
    );


    console.log(
        "[WebBlox Player] Classic blocky R6 character system loaded."
    );


    console.log(
        "[WebBlox Player] World-relative controls loaded."
    );


    console.log(
        "[WebBlox Player] Camera and movement systems are separated."
    );


    console.log(
        "[WebBlox Player] Runtime ready."
    );

})();
