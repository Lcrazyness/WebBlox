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

    /*
     * Never allow a stale/incomplete WebBloxPlayer object to
     * prevent this runtime from initializing.
     *
     * Studio checks for WebBloxPlayer.start immediately after
     * loading this file, so the runtime must always publish
     * a complete API from this execution.
     */
    if (
        window.WebBloxPlayer &&
        typeof window.WebBloxPlayer.start === "function"
    ) {
        console.warn(
            "[WebBlox Player] Runtime already exists."
        );

        return;
    }

    if (window.WebBloxPlayer) {
        console.warn(
            "[WebBlox Player] Replacing stale WebBloxPlayer object."
        );

        try {
            delete window.WebBloxPlayer;
        } catch {
            window.WebBloxPlayer = undefined;
        }
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
    pants,
            { x: 0, y: -lowerLegLen / 2, z: 0 },
            leftKnee
        );

        createRoundedPart(
            THREE,
            "LeftFoot",
            { x: 0.75, y: footHeight, z: 1.15 },
            shoe,
            { x: 0, y: -lowerLegLen - footHeight / 2, z: 0.20 },
            leftKnee
        );


        // --------------------------------------------------------
        // Right leg
        // --------------------------------------------------------

        const rightHip =
            createPivot(
                "RightHip",
                { x: hipX, y: hipY, z: 0 },
                root
            );

        createRoundedPart(
            THREE,
            "RightUpperLeg",
            { x: 0.75, y: upperLegLen, z: 0.75 },
            pants,
            { x: 0, y: -upperLegLen / 2, z: 0 },
            rightHip
        );

        const rightKnee =
            createPivot(
                "RightKnee",
                { x: 0, y: -upperLegLen, z: 0 },
                rightHip
            );

        createRoundedPart(
            THREE,
            "RightLowerLeg",
            { x: 0.65, y: lowerLegLen, z: 0.65 },
            pants,
            { x: 0, y: -lowerLegLen / 2, z: 0 },
            rightKnee
        );

        createRoundedPart(
            THREE,
            "RightFoot",
            { x: 0.75, y: footHeight, z: 1.15 },
            shoe,
            { x: 0, y: -lowerLegLen - footHeight / 2, z: 0.20 },
            rightKnee
        );


        // --------------------------------------------------------
        // Put at spawn
        // --------------------------------------------------------

        root.position.set(
            state.spawn.x,
            state.spawn.y,
            state.spawn.z
        );


        state.character =
            root;

        state.characterParts = [];

        root.traverse(child => {
            if (child.isMesh) {
                state.characterParts.push(child);
            }
        });

        /*
         * Named references, used by
         * updateCharacterAnimation() for
         * walk / idle / jump limb swing.
         *
         * These now point at the *pivot groups*
         * (shoulder / elbow / hip / knee), not the
         * meshes themselves, so rotating them swings
         * the limb from its joint like a real rig.
         */

        root.userData.bodyParts = {
            upperTorso,
            leftUpperArm: leftShoulder,
            rightUpperArm: rightShoulder,
            leftLowerArm: leftElbow,
            rightLowerArm: rightElbow,
            leftUpperLeg: leftHip,
            rightUpperLeg: rightHip,
            leftLowerLeg: leftKnee,
            rightLowerLeg: rightKnee
        };

        root.userData.head = head;

        root.userData.height = upperTorsoTop + 1.75;

        state.scene.add(root);

        log("Character created.");
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

        const THREE = getThree();

        state.runtimeObjects = [];


        for (
            const object
            of state.objects
        ) {

            if (!object) {
                continue;
            }

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
                                : 0.8,

                    metalness:
                        object.material ===
                        "Metal"
                            ? 0.85
                            : 0,

                    transparent:
                        object.material ===
                        "Glass",

                    opacity:
                        object.material ===
                        "Glass"
                            ? 0.45
                            : 1
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

            mesh.receiveShadow = true;


            mesh.userData.webbloxObject =
                object;

            mesh.userData.canCollide =
                object.canCollide !==
                false;

            mesh.userData.anchored =
                object.anchored !==
                false;


            state.scene.add(mesh);

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

        state.runtimeObjects = [];
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
                PLAYER_WIDTH / 2,

            maxX:
                x +
                PLAYER_WIDTH / 2,

            minY:
                y,

            maxY:
                y +
                PLAYER_HEIGHT,

            minZ:
                z -
                PLAYER_DEPTH / 2,

            maxZ:
                z +
                PLAYER_DEPTH / 2
        };
    }


    // ============================================================
    // PART AABB
    // ============================================================

    function getPartBox(item) {

        const mesh =
            item.mesh;

        const size =
            item.size;


        /*
         * Runtime collision currently uses
         * axis-aligned bounds.
         *
         * This is intentionally simple and
         * reliable for Stage 3A.
         */

        return {

            minX:
                mesh.position.x -
                size.x / 2,

            maxX:
                mesh.position.x +
                size.x / 2,

            minY:
                mesh.position.y -
                size.y / 2,

            maxY:
                mesh.position.y +
                size.y / 2,

            minZ:
                mesh.position.z -
                size.z / 2,

            maxZ:
                mesh.position.z +
                size.z / 2
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
                getPartBox(item);


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
            x: resultX,
            z: resultZ
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

            if (
                !item.object ||
                item.object.canCollide ===
                    false
            ) {
                continue;
            }


            const partBox =
                getPartBox(item);


            if (
                !overlaps(
                    newBox,
                    partBox
                )
            ) {
                continue;
            }


            // ----------------------------------------------------
            // Falling onto part.
            // ----------------------------------------------------

            if (
                state.velocity.y <= 0 &&
                oldBox.minY >=
                    partBox.maxY - 0.05
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
            // Hitting underside.
            // ----------------------------------------------------

            if (
                state.velocity.y > 0 &&
                oldBox.maxY <=
                    partBox.minY + 0.05
            ) {

                resultY =
                    partBox.minY -
                    PLAYER_HEIGHT;

                state.velocity.y =
                    0;
            }
        }


        return {
            y: resultY,
            grounded
        };
    }


    // ============================================================
    // FALLBACK GROUND
    // ============================================================

    function applyFallbackGround() {

        const floorY =
            -0.5;


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
    }


    // ============================================================
    // INPUT
    // ============================================================

    function keyDown(event) {

        if (!state.running) {
            return;
        }

        const target = event.target;
        const tagName = target && target.tagName
            ? String(target.tagName).toLowerCase()
            : "";

        if (
            tagName === "input" ||
            tagName === "textarea" ||
            tagName === "select" ||
            target?.isContentEditable
        ) {
            return;
        }

        const key =
            String(
                event.key
            ).toLowerCase();


        state.keys.add(key);


        const hotkeys = state.settings.hotkeys || {};
        const jumpKey = hotkeys.jump || " ";
        const settingsKey = hotkeys.settings || "p";

        if (
            [
                hotkeys.forward || "w",
                hotkeys.backward || "s",
                hotkeys.left || "a",
                hotkeys.right || "d",
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                jumpKey
            ].includes(key)
        ) {
            event.preventDefault();
        }


        if (
            key === jumpKey &&
            state.grounded
        ) {

            state.velocity.y =
                state.settings.jumpPower;

            state.grounded =
                false;

            log("Jump.");
        }


        if (
            key === "p" &&
            state.settings.hotkeysEnabled
        ) {

            toggleSettingsMenu();
        }
    }


    function keyUp(event) {

        state.keys.delete(
            String(
                event.key
            ).toLowerCase()
        );
    }


    // ============================================================
    // MOUSE
    // ============================================================

    function pointerLockChange() {

        state.mouse.locked =
            document.pointerLockElement ===
 state.viewport;
    }


    function mouseMove(event) {

        if (
            !state.running ||
            !state.mouse.locked
        ) {
            return;
        }


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
            state.settings.sensitivity;

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


    function viewportClick() {

        if (!state.running) {
            return;
        }


        if (
            document.pointerLockElement !==
            state.viewport
        ) {

            try {

                state.viewport.requestPointerLock();

            } catch {
                // Pointer lock may be unavailable.
            }
        }
    }


    // ============================================================
    // ZOOM (scroll wheel) — first/third person, like Roblox
    // ============================================================

    function mouseWheel(event) {

        if (!state.running) {
            return;
        }

        if (
            !state.settings.allowZoom ||
            state.settings.firstPersonLocked
        ) {

            /*
             * Still preventDefault so the page
             * itself doesn't scroll while playing.
             */
            event.preventDefault();

            return;
        }

        event.preventDefault();

        state.cameraSettings.distance =
            clamp(
                state.cameraSettings.distance +
                (event.deltaY * ZOOM_STEP * state.cameraSettings.distance) +
                (event.deltaY * ZOOM_STEP * 2),
                MIN_CAMERA_DISTANCE,
                MAX_CAMERA_DISTANCE
            );
    }


    // ============================================================
    // SETTINGS MENU (press P)
    //
    // Self-contained HTML/CSS overlay — sensitivity, graphics
    // quality, and a read-only hotkey reference. Built at
    // runtime so no separate CSS/HTML file is needed.
    // ============================================================

    let settingsMenuEl = null;


    function buildSettingsMenu() {

        if (settingsMenuEl) {
            return settingsMenuEl;
        }

        const overlay =
            document.createElement("div");

        overlay.id =
            "webbloxSettingsMenu";

        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.55);
            z-index: 999999;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        const panel =
            document.createElement("div");

        panel.style.cssText = `
            width: 340px;
            max-width: 90vw;
            background: #1c1c1f;
            border: 1px solid #333;
            border-radius: 10px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            color: #eee;
            overflow: hidden;
        `;

        panel.innerHTML = `
            <div style="
                padding: 14px 16px;
                border-bottom: 1px solid #2c2c2f;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <strong style="font-size: 14px;">Settings</strong>
                <button id="webbloxSettingsClose" style="
                    background: none; border: none; color: #999;
                    font-size: 18px; cursor: pointer; line-height: 1;
                ">&times;</button>
            </div>

            <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 16px;">

                <div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; color:#ccc; margin-bottom:6px;">
                        <span>Mouse Sensitivity</span>
                        <span id="webbloxSensitivityValue">1.0x</span>
                    </div>
                    <input id="webbloxSensitivitySlider" type="range" min="0.2" max="3" step="0.05" value="1"
                        style="width: 100%;">
                </div>

                <div>
                    <div style="font-size:12px; color:#ccc; margin-bottom:6px;">Graphics Quality</div>
                    <select id="webbloxGraphicsSelect" style="
                        width: 100%; padding: 6px 8px; background:#111; color:#eee;
                        border: 1px solid #333; border-radius: 6px; font-size: 12px;
                    ">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                <div>
                    <div style="font-size:12px; color:#ccc; margin-bottom:6px;">Hotkeys</div>
                    <div id="webbloxHotkeyList" style="
                        font-size: 11.5px; color: #999; line-height: 1.9;
                        background: #141416; border: 1px solid #2a2a2d;
                        border-radius: 6px; padding: 8px 10px;
                    "></div>
                </div>

            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        overlay.addEventListener(
            "click",
            event => {

                if (event.target === overlay) {
                    closeSettingsMenu();
                }
            }
        );

        overlay.querySelector(
            "#webbloxSettingsClose"
        ).addEventListener(
            "click",
            closeSettingsMenu
        );

        const slider =
            overlay.querySelector(
                "#webbloxSensitivitySlider"
            );

        const sensitivityLabel =
            overlay.querySelector(
                "#webbloxSensitivityValue"
            );

        slider.addEventListener(
            "input",
            () => {

                const value =
                    parseFloat(
                        slider.value
                    );

                state.settings.sensitivity =
                    value;

                sensitivityLabel.textContent =
                    `${value.toFixed(2)}x`;

                persistPreferences();
            }
        );

        const graphicsSelect =
            overlay.querySelector(
                "#webbloxGraphicsSelect"
            );

        graphicsSelect.addEventListener(
            "change",
            () => {

                state.settings.graphicsQuality =
                    graphicsSelect.value;

                applyGraphicsQuality();

                persistPreferences();
            }
        );

        settingsMenuEl =
            overlay;

        return overlay;
    }


    function persistPreferences() {

        saveLocalPreferences({

            sensitivity:
                state.settings.sensitivity,

            graphicsQuality:
                state.settings.graphicsQuality
        });
    }


    function applyGraphicsQuality() {

        if (!state.renderer) {
            return;
        }

        const quality =
            state.settings.graphicsQuality;

        if (quality === "low") {

            state.renderer.shadowMap.enabled = false;

            state.renderer.setPixelRatio(1);

        } else if (quality === "medium") {

            state.renderer.shadowMap.enabled = true;

            state.renderer.setPixelRatio(
                Math.min(1.5, window.devicePixelRatio || 1)
            );

        } else {

            state.renderer.shadowMap.enabled = true;

            state.renderer.setPixelRatio(
                Math.min(2, window.devicePixelRatio || 1)
            );
        }
    }


    function toggleSettingsMenu() {

        const overlay =
            buildSettingsMenu();

        const isOpen =
            overlay.style.display === "flex";

        if (isOpen) {

            closeSettingsMenu();

        } else {

            openSettingsMenu();
        }
    }


    function openSettingsMenu() {

        const overlay =
            buildSettingsMenu();

        overlay.querySelector(
            "#webbloxSensitivitySlider"
        ).value =
            state.settings.sensitivity;

        overlay.querySelector(
            "#webbloxSensitivityValue"
        ).textContent =
            `${state.settings.sensitivity.toFixed(2)}x`;

        overlay.querySelector(
            "#webbloxGraphicsSelect"
        ).value =
            state.settings.graphicsQuality;

        const hotkeyList =
            overlay.querySelector(
                "#webbloxHotkeyList"
            );

        const hotkeys = [
            ["W A S D", "Move"],
            ["Space", "Jump"],
            ["Scroll", state.settings.allowZoom ? "Zoom / first person" : "Disabled by this game"],
            ["P", "Settings"]
        ];

        hotkeyList.innerHTML =
            hotkeys.map(
                ([key, action]) =>
                    `<div style="display:flex; justify-content:space-between;">
                        <span>${key}</span><span>${action}</span>
                    </div>`
            ).join("");

        overlay.style.display =
            "flex";

        if (document.pointerLockElement) {

            try {
                document.exitPointerLock();
            } catch {
                // Ignore.
            }
        }
    }


    function closeSettingsMenu() {

        if (!settingsMenuEl) {
            return;
        }

        settingsMenuEl.style.display =
            "none";
    }


    function destroySettingsMenu() {

        if (settingsMenuEl) {

            settingsMenuEl.remove();

            settingsMenuEl =
                null;
        }
    }


    // ============================================================
    // SETUP INPUT
    // ============================================================

    function attachInput() {

        if (
            state.listenersAttached
        ) {
            return;
        }


        window.addEventListener(
            "keydown",
            keyDown
        );


        window.addEventListener(
            "keyup",
            keyUp
        );


        window.addEventListener(
            "mousemove",
            mouseMove
        );


        document.addEventListener(
            "pointerlockchange",
            pointerLockChange
        );


        if (state.viewport) {

            state.viewport.addEventListener(
                "click",
                viewportClick
            );

            state.viewport.addEventListener(
                "wheel",
                mouseWheel,
                { passive: false }
            );
        }


        state.listenersAttached =
            true;
    }


    // ============================================================
    // REMOVE INPUT
    // ============================================================

    function detachInput() {

        window.removeEventListener(
            "keydown",
            keyDown
        );

        window.removeEventListener(
            "keyup",
            keyUp
        );

        window.removeEventListener(
            "mousemove",
            mouseMove
        );

        document.removeEventListener(
            "pointerlockchange",
            pointerLockChange
        );


        if (state.viewport) {

            state.viewport.removeEventListener(
                "click",
                viewportClick
            );

            state.viewport.removeEventListener(
                "wheel",
                mouseWheel
            );
        }


        state.keys.clear();

        state.listenersAttached =
            false;
    }


    // ============================================================
    // MOVEMENT
    // ============================================================

    function updateMovement(delta) {

        if (
            !state.character
        ) {
            return;
        }


        let forward =
            0;

        let right =
            0;


        /*
         * Reset per-frame animation flags.
         * Set to true below only if the
         * character actually has input.
         */

        state.moving =
            false;


        /*
         * IMPORTANT:
         *
         * W = forward
         * S = backward
         * A = left
         * D = right
         *
         * This is deliberately written
         * explicitly so the old inverted
         * WASD behavior cannot return.
         */

        const hotkeys = state.settings.hotkeys || {};

        if (
            state.keys.has(hotkeys.forward || "w") ||
            state.keys.has("arrowup")
        ) {
            forward += 1;
        }

        if (
            state.keys.has(hotkeys.backward || "s") ||
            state.keys.has("arrowdown")
        ) {
            forward -= 1;
        }

        if (
            state.keys.has(hotkeys.right || "d") ||
            state.keys.has("arrowright")
        ) {
            right += 1;
        }

        if (
            state.keys.has(hotkeys.left || "a") ||
            state.keys.has("arrowleft")
        ) {
            right -= 1;
        }


        let moveX =
            0;

        let moveZ =
            0;


        if (
            forward !== 0 ||
            right !== 0
        ) {

            state.moving =
                true;


            const length =
                Math.hypot(
                    forward,
                    right
                );


            forward /=
                length;

            right /=
                length;


            /* World-relative movement: camera rotation does not change WASD.
               W=-Z, S=+Z, A=-X, D=+X. */
            moveX = right;
            moveZ = -forward;
        }


        const sprintKey =
            (state.settings.hotkeys && state.settings.hotkeys.sprint) ||
            "shift";

        state.sprinting =
            state.settings.hotkeysEnabled &&
            state.keys.has(sprintKey);

        const speed =
            state.sprinting
                ? state.settings.walkSpeed * 1.5
                : state.settings.walkSpeed;


        const oldX =
            state.character.position.x;


        const oldZ =
            state.character.position.z;


        const newX =
            oldX +
            moveX *
            speed *
            delta;


        const newZ =
            oldZ +
            moveZ *
            speed *
            delta;


        const resolved =
            resolveHorizontalCollision(
                oldX,
                oldZ,
                newX,
                newZ
            );


        state.character.position.x =
            resolved.x;


        state.character.position.z =
            resolved.z;


        /*
         * Rotate character toward movement.
         */

        if (
            Math.abs(moveX) >
                0.001 ||
            Math.abs(moveZ) >
                0.001
        ) {

            const targetRotation =
                Math.atan2(
                    moveX,
                    moveZ
                );


            let difference =
                targetRotation -
                state.character.rotation.y;


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


            state.character.rotation.y +=
                difference *
                Math.min(
                    1,
                    delta * 12
                );
        }
    }


    // ============================================================
    // GRAVITY
    // ============================================================

    function updateGravity(delta) {

        if (
            !state.character
        ) {
            return;
        }


        const oldY =
            state.character.position.y;


        state.velocity.y -=
            GRAVITY *
            delta;


        const newY =
            oldY +
            state.velocity.y *
            delta;


        const result =
            resolveVerticalCollision(
                oldY,
                newY
            );


        state.character.position.y =
            result.y;


        state.grounded =
            result.grounded;


        applyFallbackGround();
    }


    // ============================================================
    // ANIMATION (walk / idle / jump limb swing)
    //
    // Merged from the old Player/animations.js module and
    // adapted to read directly from this file's own `state`
    // instead of a separate PlayerSystem namespace.
    // ============================================================

    function resetPartRotation(part) {

        if (!part) {
            return;
        }

        part.rotation.x = 0;
        part.rotation.y = 0;
        part.rotation.z = 0;
    }


    function updateCharacterAnimation(delta) {

        const character =
            state.character;

        if (
            !character ||
            !character.userData.bodyParts
        ) {
            return;
        }

        state.animationTime +=
            delta;

        const parts =
            character.userData.bodyParts;

        let animState =
            "Idle";

        if (!state.grounded) {

            animState =
                state.velocity.y > 1
                    ? "Jumping"
                    : "Freefall";

        } else if (state.moving) {

            animState =
                "Walking";
        }


        Object.values(parts)
            .forEach(
                resetPartRotation
            );


        const speed =
            8;

        const swing =
            Math.sin(
                state.animationTime *
                speed
            );

        const walkAmount =
            0.45;


        if (
            animState === "Walking"
        ) {

            if (parts.leftUpperArm) {
                parts.leftUpperArm.rotation.x =
                    swing * walkAmount;
            }

            if (parts.rightUpperArm) {
                parts.rightUpperArm.rotation.x =
                    -swing * walkAmount;
            }

            if (parts.leftLowerArm) {
                parts.leftLowerArm.rotation.x =
                    swing * 0.18;
            }

            if (parts.rightLowerArm) {
                parts.rightLowerArm.rotation.x =
                    -swing * 0.18;
            }

            if (parts.leftUpperLeg) {
                parts.leftUpperLeg.rotation.x =
                    -swing * walkAmount;
            }

            if (parts.rightUpperLeg) {
                parts.rightUpperLeg.rotation.x =
                    swing * walkAmount;
            }
               if (parts.leftLowerLeg) {
                parts.leftLowerLeg.rotation.x =
                    Math.max(0, swing) * 0.18;
            }

            if (parts.rightLowerLeg) {
                parts.rightLowerLeg.rotation.x =
                    Math.max(0, -swing) * 0.18;
            }
        }

        else if (animState === "Idle") {

            const breathing =
                Math.sin(
                    state.animationTime * 2
                ) * 0.025;

            if (parts.upperTorso) {
                parts.upperTorso.rotation.x =
                    breathing;
            }

            if (parts.leftUpperArm) {
                parts.leftUpperArm.rotation.z =
                    0.03;
            }

            if (parts.rightUpperArm) {
                parts.rightUpperArm.rotation.z =
                    -0.03;
            }
        }

        else if (animState === "Jumping") {

            if (parts.leftUpperArm) {
                parts.leftUpperArm.rotation.x =
                    -0.8;
            }

            if (parts.rightUpperArm) {
                parts.rightUpperArm.rotation.x =
                    -0.8;
            }

            if (parts.leftUpperLeg) {
                parts.leftUpperLeg.rotation.x =
                    0.25;
            }

            if (parts.rightUpperLeg) {
                parts.rightUpperLeg.rotation.x =
                    0.25;
            }
        }

        else if (animState === "Freefall") {

            if (parts.leftUpperArm) {
                parts.leftUpperArm.rotation.x =
                    -0.35;
            }

            if (parts.rightUpperArm) {
                parts.rightUpperArm.rotation.x =
                    -0.35;
            }

            if (parts.leftUpperLeg) {
                parts.leftUpperLeg.rotation.x =
                    -0.15;
            }

            if (parts.rightUpperLeg) {
                parts.rightUpperLeg.rotation.x =
                    -0.15;
            }
        }
    }


    // ============================================================
    // CAMERA
    // ============================================================

    function updateCamera(delta) {

        if (
            !state.character ||
            !state.camera
        ) {
            return;
        }


        const yaw =
            degToRad(
                state.mouse.yaw
            );


        const pitch =
            degToRad(
                state.mouse.pitch
            );


        const isFirstPerson =
            state.cameraSettings.distance <=
            FIRST_PERSON_DISTANCE;


        if (state.character) {
            state.character.visible =
                !isFirstPerson;
        }


        if (isFirstPerson) {

            const headHeight =
                state.character.userData.height
                    ? state.character.userData.height - 0.9
                    : 4.8;

            const eyeX =
                state.character.position.x;

            const eyeY =
                state.character.position.y +
                headHeight;

            const eyeZ =
                state.character.position.z;

            state.camera.position.set(
                eyeX,
                eyeY,
                eyeZ
            );

            const lookX =
                eyeX -
                Math.sin(yaw) *
                Math.cos(pitch);

            const lookY =
                eyeY +
                Math.sin(pitch);

            const lookZ =
                eyeZ -
                Math.cos(yaw) *
                Math.cos(pitch);

            state.camera.lookAt(
                lookX,
                lookY,
                lookZ
            );

            return;
        }


        const horizontal =
            Math.cos(pitch) *
            state.cameraSettings.distance;


        const desiredX =
            state.character.position.x -
            Math.sin(yaw) *
            horizontal;


        const desiredY =
            state.character.position.y +
            state.cameraSettings.height +
            (
                Math.sin(pitch) *
                state.cameraSettings.distance
            );


        const desiredZ =
            state.character.position.z -
            Math.cos(yaw) *
            horizontal;


        const smoothing =
            1 -
            Math.pow(
                0.0001,
                delta
            );


        state.cameraObjectPosition(
            desiredX,
            desiredY,
            desiredZ,
            smoothing
        );
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

    function frame(now) {

        if (!state.running) {
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
                    ) / 1000,
                    0
                ),
                0.05
            );


        state.lastTime =
            now;


        updateMovement(delta);

        updateGravity(delta);

        updateCharacterAnimation(delta);

        updateCamera(delta);


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

        if (!state.camera) {
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

    async function start(options = {}) {

        if (state.running) {

            log(
                "Player is already running."
            );

            return true;
        }


        const THREE =
            getThree();


        if (!options.scene) {

            throw new Error(
                "Player.start requires a Three.js scene."
            );
        }


        if (!options.camera) {

            throw new Error(
                "Player.start requires a Three.js camera."
            );
        }


        if (!options.renderer) {

            throw new Error(
                "Player.start requires a Three.js renderer."
            );
        }


        state.game =
            options.game ||
            {};


        /*
         * Merge dev-set StarterPlayer defaults over our
         * built-in defaults. A locally saved sensitivity/
         * graphics preference (if the settings menu has
         * been opened before) still wins for those two
         * user-facing fields, since those are the
         * player's own choice, not the developer's.
         */

        const starterPlayer =
            state.game.starterPlayer ||
            {};

        const savedPrefs =
            loadLocalPreferences();

        state.settings = {

            walkSpeed:
                Number.isFinite(starterPlayer.walkSpeed)
                    ? starterPlayer.walkSpeed
                    : state.settings.walkSpeed,

            jumpPower:
                Number.isFinite(starterPlayer.jumpPower)
                    ? starterPlayer.jumpPower
                    : state.settings.jumpPower,

            firstPersonLocked:
                starterPlayer.firstPersonLocked === true,

            allowZoom:
                starterPlayer.allowZoom !== false,

            hotkeysEnabled:
                starterPlayer.hotkeysEnabled !== false,

            scriptable:
                starterPlayer.scriptable !== false,

            sensitivity:
                savedPrefs.sensitivity ??
                state.settings.sensitivity,

            graphicsQuality:
                savedPrefs.graphicsQuality ??
                state.settings.graphicsQuality
        };

        if (
            state.settings.firstPersonLocked
        ) {

            state.cameraSettings.distance =
                FIRST_PERSON_DISTANCE;
        }


        state.objects =
            Array.isArray(
                options.objects
            )
                ? options.objects.map(
                    object =>
                        JSON.parse(
                            JSON.stringify(
                                object
                            )
                        )
                )
                : [];


        state.scene =
            options.scene;


        state.camera =
            options.camera;


        state.renderer =
            options.renderer;


        state.viewport =
            options.viewport ||
            state.renderer.domElement;


        state.onLog =
            typeof options.onLog ===
            "function"
                ? options.onLog
                : null;


        /*
         * Keep a copy of the camera
         * before Player takes control.
         */

        saveCamera();


        /*
         * Find spawn before creating
         * the character.
         */

        findSpawn();


        /*
         * Build physical runtime world.
         */

        createRuntimeWorld();


        /*
         * Build character.
         */

        createCharacter();


        /*
         * Reset movement state.
         */

        state.velocity.x = 0;

        state.velocity.y = 0;

        state.velocity.z = 0;

        state.grounded = false;


        /*
         * Reset camera rotation.
         */

        state.mouse.yaw = 0;

        state.mouse.pitch = -12;


        /*
         * Start.
         */

        state.running = true;

        attachInput();

        applyGraphicsQuality();


        log(
            `Playing "${state.game.name || "Untitled Game"}".`
        );


        log(
            "WASD = move | Space = jump | Scroll = zoom | P = settings"
        );


        log(
            "Click the game viewport to control the camera."
        );


        state.lastTime =
            performance.now();


        state.animationFrame =
            requestAnimationFrame(
                frame
            );


        /*
         * Render once immediately.
         */

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


        return true;
    }


    // ============================================================
    // STOP
    // ============================================================

    async function stop() {

        if (!state.running) {
            return true;
        }


        state.running = false;


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


        /*
         * Release pointer lock.
         */

        if (
            document.pointerLockElement
        ) {

            try {

                document.exitPointerLock();

            } catch {
                // Ignore.
            }
        }


        destroyCharacter();

        removeRuntimeWorld();

        restoreCamera();


        state.velocity.x = 0;

        state.velocity.y = 0;

        state.velocity.z = 0;

        state.grounded = false;


        log(
            "Player stopped."
        );


        return true;
    }


    // ============================================================
    // RESET CHARACTER
    // ============================================================

    function resetCharacter() {

        if (!state.character) {
            return;
        }


        state.character.position.set(

            state.spawn.x,

            state.spawn.y,

            state.spawn.z
        );


        state.velocity.x = 0;

        state.velocity.y = 0;

        state.velocity.z = 0;

        state.grounded = false;


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

        if (!state.character) {
            return;
        }


        state.character.position.set(

            Number(x) || 0,

            Number(y) || 0,

            Number(z) || 0
        );


        state.velocity.x = 0;

        state.velocity.y = 0;

        state.velocity.z = 0;
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
            }
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
        "[WebBlox Player] Character system is built in."
    );

    console.log(
        "[WebBlox Player] No character.js dependency."
    );

})();
