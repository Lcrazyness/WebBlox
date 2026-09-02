/*
 * ============================================================
 * WebBlox Player Character System
 * Stage 3C
 *
 * BLOCKY CHARACTER EDITION
 *
 * Features:
 * - Classic Roblox-style blocky body
 * - No Bacon Hair
 * - No hat
 * - Connected limbs
 * - Proper limb pivot hierarchy
 * - R15-compatible body part names
 * - Humanoid
 * - Movement
 * - Jumping
 * - Sprinting
 * - Falling
 * - Character states
 * - Animation compatibility
 * - Runtime data
 * - Character events
 * - Custom colors
 * ============================================================
 */

(() => {
    "use strict";

    window.WebBloxPlayer =
        window.WebBloxPlayer || {};

    const PlayerSystem =
        window.WebBloxPlayer;

    let THREE = null;


    /* ============================================================
       THREE
       ============================================================ */

    function getThree() {

        if (window.THREE) {
            THREE = window.THREE;
            return THREE;
        }

        return null;
    }


    /* ============================================================
       MATERIAL
       ============================================================ */

    function makeMaterial(
        color,
        roughness = 0.78
    ) {

        return new THREE.MeshStandardMaterial({

            color:
                new THREE.Color(color),

            roughness,

            metalness: 0

        });

    }


    /* ============================================================
       BLOCK
       ============================================================ */

    function createBlock(
        name,
        size,
        color,
        position,
        parent,
        options = {}
    ) {

        const geometry =
            new THREE.BoxGeometry(
                size.x,
                size.y,
                size.z
            );

        const material =
            makeMaterial(
                color,
                options.roughness || 0.78
            );

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.name = name;

        mesh.position.set(
            position.x || 0,
            position.y || 0,
            position.z || 0
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData.characterPart = true;

        mesh.userData.characterPartName =
            name;

        if (options.renderOrder !== undefined) {
            mesh.renderOrder =
                options.renderOrder;
        }

        parent.add(mesh);

        return mesh;
    }


    /* ============================================================
       PIVOT
       ============================================================ */

    function createPivot(
        name,
        position,
        parent
    ) {

        const pivot =
            new THREE.Group();

        pivot.name = name;

        pivot.position.set(
            position.x || 0,
            position.y || 0,
            position.z || 0
        );

        pivot.userData.characterPart = true;

        pivot.userData.characterPartName =
            name;

        parent.add(pivot);

        return pivot;
    }


    /* ============================================================
       FACE
       ============================================================ */

    function createFace(
        head,
        skinColor
    ) {

        const face =
            new THREE.Group();

        face.name = "Face";

        face.userData.characterAccessory =
            false;

        /*
         * Face is slightly in front
         * of the head.
         */

        const eyeMaterial =
            makeMaterial(
                "#111111",
                0.9
            );

        const eyeGeometry =
            new THREE.BoxGeometry(
                0.14,
                0.14,
                0.035
            );


        const leftEye =
            new THREE.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        leftEye.name =
            "LeftEye";

        leftEye.position.set(
            -0.28,
            0.12,
            0.515
        );


        const rightEye =
            new THREE.Mesh(
                eyeGeometry,
                eyeMaterial
            );

        rightEye.name =
            "RightEye";

        rightEye.position.set(
            0.28,
            0.12,
            0.515
        );


        /*
         * Simple classic Roblox-style
         * smile made from a thin box.
         */

        const mouthGeometry =
            new THREE.BoxGeometry(
                0.30,
                0.045,
                0.035
            );

        const mouthMaterial =
            makeMaterial(
                "#111111",
                0.9
            );

        const mouth =
            new THREE.Mesh(
                mouthGeometry,
                mouthMaterial
            );

        mouth.name =
            "Smile";

        mouth.position.set(
            0,
            -0.18,
            0.515
        );


        face.add(leftEye);
        face.add(rightEye);
        face.add(mouth);

        head.add(face);

        return face;
    }


    /* ============================================================
       HUMANOID
       ============================================================ */

    class Humanoid {

        constructor(character) {

            this.character =
                character;

            this.health = 100;

            this.maxHealth = 100;

            this.walkSpeed = 16;

            this.sprintSpeed = 24;

            this.jumpPower = 50;

            this.gravity = 196.2;

            this.autoRotate = true;

            this.state = "Idle";

            this.moveDirection = {
                x: 0,
                y: 0,
                z: 0
            };

            this.velocity = {
                x: 0,
                y: 0,
                z: 0
            };

            this.isGrounded = false;

            this.isSprinting = false;

            this.events =
                new Map();
        }


        setState(newState) {

            if (
                this.state ===
                newState
            ) {
                return;
            }

            const oldState =
                this.state;

            this.state =
                newState;

            this.emit(
                "StateChanged",
                {
                    from:
                        oldState,

                    to:
                        newState
                }
            );

            if (
                this.character
                    .userData
                    .animator
            ) {

                this.character
                    .userData
                    .animator
                    .setStateAnimation(
                        newState
                    );
            }
        }


        move(direction) {

            const x =
                Number(
                    direction?.x
                ) || 0;

            const y =
                Number(
                    direction?.y
                ) || 0;

            const z =
                Number(
                    direction?.z
                ) || 0;

            this.moveDirection = {
                x,
                y,
                z
            };

            const moving =
                Math.abs(x) > 0.001 ||
                Math.abs(z) > 0.001;

            if (!moving) {

                if (
                    this.state ===
                        "Walking" ||
                    this.state ===
                        "Running"
                ) {

                    this.setState(
                        "Idle"
                    );
                }

                return;
            }

            if (
                this.isSprinting
            ) {

                this.setState(
                    "Running"
                );

            } else {

                this.setState(
                    "Walking"
                );
            }
        }


        jump() {

            if (
                !this.isGrounded
            ) {
                return;
            }

            if (
                this.state ===
                "Dead"
            ) {
                return;
            }

            const jumpVelocity =
                Math.sqrt(
                    2 *
                    this.gravity *
                    (
                        this.jumpPower /
                        100
                    )
                );

            this.velocity.y =
                jumpVelocity;

            this.isGrounded =
                false;

            this.setState(
                "Jumping"
            );

            this.emit(
                "Jumped"
            );
        }


        sprint(enabled) {

            this.isSprinting =
                Boolean(
                    enabled
                );

            const moving =
                Math.abs(
                    this.moveDirection.x
                ) > 0.001 ||
                Math.abs(
                    this.moveDirection.z
                ) > 0.001;

            if (!moving) {

                this.setState(
                    "Idle"
                );

                return;
            }

            this.setState(
                this.isSprinting
                    ? "Running"
                    : "Walking"
            );
        }


        takeDamage(amount) {

            amount =
                Number(amount) || 0;

            this.health =
                Math.max(
                    0,
                    this.health -
                    amount
                );

            this.emit(
                "HealthChanged",
                this.health
            );

            if (
                this.health <= 0
            ) {

                this.setState(
                    "Dead"
                );

                this.emit(
                    "Died"
                );
            }
        }


        heal(amount) {

            amount =
                Number(amount) || 0;

            this.health =
                Math.min(
                    this.maxHealth,
                    this.health +
                    amount
                );

            this.emit(
                "HealthChanged",
                this.health
            );
        }


        getState() {

            return this.state;
        }


        emit(
            event,
            data
        ) {

            if (
                !this.events.has(
                    event
                )
            ) {

                this.events.set(
                    event,
                    []
                );
            }

            const listeners =
                this.events.get(
                    event
                );

            listeners.forEach(
                callback => {

                    try {

                        callback(
                            data
                        );

                    } catch (
                        error
                    ) {

                        console.error(
                            "[WebBlox Player] Event error:",
                            error
                        );
                    }
                }
            );
        }


        on(
            event,
            callback
        ) {

            if (
                typeof callback !==
                "function"
            ) {
                return;
            }

            if (
                !this.events.has(
                    event
                )
            ) {

                this.events.set(
                    event,
                    []
                );
            }

            this.events
                .get(event)
                .push(callback);
        }
    }


    /* ============================================================
       ANIMATOR
       ============================================================ */

    class CharacterAnimator {

        constructor(
            character
        ) {

            this.character =
                character;

            this.animations =
                new Map();

            this.playing =
                new Map();

            this.currentState =
                "Idle";

            this.blendDuration =
                0.15;

            this.currentAnimation =
                null;
        }


        loadAnimation(
            name,
            keyframes
        ) {

            this.animations.set(
                name,
                Array.isArray(
                    keyframes
                )
                    ? keyframes
                    : []
            );
        }


        play(
            name,
            options = {}
        ) {

            if (
                !this.animations.has(
                    name
                )
            ) {

                console.warn(
                    `[WebBlox] Animation "${name}" not found`
                );

                return;
            }

            this.stopAll();

            this.currentAnimation =
                name;

            this.playing.set(
                name,
                {

                    keyframes:
                        this.animations.get(
                            name
                        ),

                    time: 0,

                    duration:
                        options.duration ||
                        1,

                    loop:
                        options.loop !==
                        false,

                    speed:
                        options.speed ||
                        1,

                    weight:
                        options.weight ||
                        1
                }
            );
        }


        stop(
            name
        ) {

            this.playing.delete(
                name
            );

            if (
                this.currentAnimation ===
                name
            ) {

                this.currentAnimation =
                    null;
            }
        }


        stopAll() {

            this.playing.clear();

            this.currentAnimation =
                null;
        }


        update(
            deltaTime
        ) {

            for (
                const [
                    name,
                    animation
                ]
                of this.playing
            ) {

                animation.time +=
                    deltaTime *
                    animation.speed;

                if (
                    animation.loop
                ) {

                    animation.time %=
                        animation.duration;

                } else if (
                    animation.time >=
                    animation.duration
                ) {

                    this.playing.delete(
                        name
                    );

                    if (
                        this.currentAnimation ===
                        name
                    ) {

                        this.currentAnimation =
                            null;
                    }
                }
            }
        }


        setStateAnimation(
            state
        ) {

            this.currentState =
                state;

            const animations = {

                Idle: {
                    name: "Idle",
                    loop: true,
                    speed: 1
                },

                Walking: {
                    name: "Walk",
                    loop: true,
                    speed: 1
                },

                Running: {
                    name: "Run",
                    loop: true,
                    speed: 1
                },

                Jumping: {
                    name: "Jump",
                    loop: false,
                    speed: 1
                },

                Freefall: {
                    name: "Fall",
                    loop: true,
                    speed: 1
                },

                Falling: {
                    name: "Fall",
                    loop: true,
                    speed: 1
                },

                Landing: {
                    name: "Land",
                    loop: false,
                    speed: 1
                },

                Dead: {
                    name: "Death",
                    loop: false,
                    speed: 1
                }
            };

            const animation =
                animations[state];

            if (
                !animation
            ) {
                return;
            }

            if (
                this.animations.has(
                    animation.name
                )
            ) {

                this.play(
                    animation.name,
                    animation
                );
            }
        }
    }


    /* ============================================================
       PHYSICS
       ============================================================ */

    function updateCharacterPhysics(
        character,
        deltaTime
    ) {

        const humanoid =
            character
                .userData
                .humanoid;

        if (!humanoid) {
            return;
        }

        deltaTime =
            Math.min(
                Math.max(
                    Number(
                        deltaTime
                    ) || 0,
                    0
                ),
                0.05
            );


        /*
         * Gravity
         */

        if (
            !humanoid.isGrounded
        ) {

            humanoid.velocity.y -=
                humanoid.gravity *
                deltaTime;

        } else {

            if (
                humanoid.velocity.y <
                0
            ) {

                humanoid.velocity.y =
                    0;
            }
        }


        /*
         * Movement
         */

        let moveX =
            humanoid
                .moveDirection
                .x;

        let moveZ =
            humanoid
                .moveDirection
                .z;


        const magnitude =
            Math.sqrt(
                moveX * moveX +
                moveZ * moveZ
            );


        if (
            magnitude > 1
        ) {

            moveX /=
                magnitude;

            moveZ /=
                magnitude;
        }


        const speed =
            humanoid
                .isSprinting
                ? humanoid.sprintSpeed
                : humanoid.walkSpeed;


        humanoid.velocity.x =
            moveX * speed;

        humanoid.velocity.z =
            moveZ * speed;


        /*
         * Position
         */

        character.position.x +=
            humanoid.velocity.x *
            deltaTime;

        character.position.y +=
            humanoid.velocity.y *
            deltaTime;

        character.position.z +=
            humanoid.velocity.z *
            deltaTime;


        /*
         * Floor
         */

        if (
            character.position.y <=
            0
        ) {

            character.position.y =
                0;

            humanoid.velocity.y =
                0;

            const wasGrounded =
                humanoid.isGrounded;

            humanoid.isGrounded =
                true;


            if (
                !wasGrounded &&
                (
                    humanoid.state ===
                        "Jumping" ||
                    humanoid.state ===
                        "Falling" ||
                    humanoid.state ===
                        "Freefall"
                )
            ) {

                humanoid.setState(
                    "Landing"
                );

                setTimeout(
                    () => {

                        if (
                            !character
                                .userData
                                .runtime
                                ?.alive
                        ) {
                            return;
                        }

                        const moving =
                            Math.abs(
                                humanoid
                                    .moveDirection
                                    .x
                            ) > 0.001 ||
                            Math.abs(
                                humanoid
                                    .moveDirection
                                    .z
                            ) > 0.001;

                        humanoid.setState(
                            moving
                                ? (
                                    humanoid.isSprinting
                                        ? "Running"
                                        : "Walking"
                                )
                                : "Idle"
                        );

                    },
                    120
                );
            }

        } else {

            humanoid.isGrounded =
                false;

            if (
                humanoid.velocity.y <
                -0.5
            ) {

                if (
                    humanoid.state !==
                    "Falling"
                ) {

                    humanoid.setState(
                        "Falling"
                    );
                }

            } else if (
                humanoid.velocity.y >
                0
            ) {

                if (
                    humanoid.state !==
                    "Jumping"
                ) {

                    humanoid.setState(
                        "Jumping"
                    );
                }
            }
        }
    }


    /* ============================================================
       CHARACTER ROTATION
       ============================================================ */

    function updateCharacterRotation(
        character
    ) {

        const humanoid =
            character
                .userData
                .humanoid;

        if (
            !humanoid ||
            !humanoid.autoRotate
        ) {
            return;
        }

        const x =
            humanoid
                .moveDirection
                .x;

        const z =
            humanoid
                .moveDirection
                .z;

        if (
            Math.abs(x) <
                0.001 &&
            Math.abs(z) <
                0.001
        ) {
            return;
        }

        const body =
            character.getObjectByName(
                "Body"
            );

        if (!body) {
            return;
        }

        const angle =
            Math.atan2(
                x,
                z
            );

        body.rotation.y =
            angle;
    }


    /* ============================================================
       CREATE CHARACTER
       ============================================================ */

    function createCharacter(
        options = {}
    ) {

        const THREE_LOCAL =
            getThree();

        if (
            !THREE_LOCAL
        ) {

            console.error(
                "[WebBlox Player] Three.js is not loaded."
            );

            return null;
        }


        /*
         * Character root
         */

        const character =
            new THREE_LOCAL.Group();

        character.name =
            options.name ||
            "Character";

        character.userData.isCharacter =
            true;

        character.userData.playerId =
            options.playerId ||
            null;

        character.userData.characterType =
            options.rigType ||
            "R15";


        /*
         * Colors
         */

        const skin =
            options.skinColor ||
            "#d9a679";

        const shirt =
            options.shirtColor ||
            "#3f78c5";

        const pants =
            options.pantsColor ||
            "#285080";

        const shoe =
            options.shoeColor ||
            "#202020";


        /*
         * Humanoid
         */

        const humanoid =
            new Humanoid(
                character
            );

        humanoid.walkSpeed =
            Number(
                options.walkSpeed ??
                16
            );

        humanoid.sprintSpeed =
            Number(
                options.sprintSpeed ??
                24
            );

        humanoid.jumpPower =
            Number(
                options.jumpPower ??
                50
            );

        humanoid.gravity =
            Number(
                options.gravity ??
                196.2
            );

        humanoid.autoRotate =
            options.autoRotate !==
            false;

        character.userData.humanoid =
            humanoid;


        /*
         * Body container
         */

        const body =
            new THREE_LOCAL.Group();

        body.name =
            "Body";

        character.add(
            body
        );


        /* ========================================================
           TORSO
           ======================================================== */

        const lowerTorso =
            createBlock(
                "LowerTorso",

                {
                    x: 1.95,
                    y: 0.75,
                    z: 1.05
                },

                shirt,

                {
                    x: 0,
                    y: 2.35,
                    z: 0
                },

                body
            );


        const upperTorso =
            createBlock(
                "UpperTorso",

                {
                    x: 2.05,
                    y: 1.25,
                    z: 1.08
                },

                shirt,

                {
                    x: 0,
                    y: 3.35,
                    z: 0
                },

                body
            );


        /*
         * Tiny overlap between torso
         * sections prevents visible gaps.
         */

        lowerTorso.position.y =
            2.32;

        upperTorso.position.y =
            3.34;


        /* ========================================================
           HEAD
           ======================================================== */

        const head =
            createBlock(
                "Head",

                {
                    x: 1.72,
                    y: 1.72,
                    z: 1.72
                },

                skin,

                {
                    x: 0,
                    y: 4.93,
                    z: 0
                },

                body
            );

        head.userData.isHead =
            true;

        createFace(
            head,
            skin
        );


        /*
         * NO BACON HAIR.
         * NO HAT.
         */


        /* ========================================================
           ARMS
           ======================================================== */

        /*
         * Each limb gets a pivot.
         *
         * The pivot is placed at the joint.
         * The actual block extends downward.
         *
         * This makes animations rotate from
         * shoulders/elbows instead of from
         * the center of each mesh.
         */

        const leftShoulder =
            createPivot(
                "LeftUpperArm",

                {
                    x: -1.05,
                    y: 3.82,
                    z: 0
                },

                body
            );


        const leftUpperArm =
            createBlock(
                "LeftUpperArmMesh",

                {
                    x: 0.62,
                    y: 1.12,
                    z: 0.72
                },

                skin,

                {
                    x: 0,
                    y: -0.56,
                    z: 0
                },

                leftShoulder
            );


        const leftElbow =
            createPivot(
                "LeftLowerArm",

                {
                    x: 0,
                    y: -1.10,
                    z: 0
                },

                leftShoulder
            );


        const leftLowerArm =
            createBlock(
                "LeftLowerArmMesh",

                {
                    x: 0.62,
                    y: 1.08,
                    z: 0.72
                },

                skin,

                {
                    x: 0,
                    y: -0.54,
                    z: 0
                },

                leftElbow
            );


        const leftHand =
            createBlock(
                "LeftHand",

                {
                    x: 0.66,
                    y: 0.42,
                    z: 0.76
                },

                skin,

                {
                    x: 0,
                    y: -1.05,
                    z: 0
                },

                leftElbow
            );


        /*
         * RIGHT ARM
         */

        const rightShoulder =
            createPivot(
                "RightUpperArm",

                {
                    x: 1.05,
                    y: 3.82,
                    z: 0
                },

                body
            );


        const rightUpperArm =
            createBlock(
                "RightUpperArmMesh",

                {
                    x: 0.62,
                    y: 1.12,
                    z: 0.72
                },

                skin,

                {
                    x: 0,
                    y: -0.56,
                    z: 0
                },

                rightShoulder
            );


        const rightElbow =
            createPivot(
                "RightLowerArm",

                {
                    x: 0,
                    y: -1.10,
                    z: 0
                },

                rightShoulder
            );


        const rightLowerArm =
            createBlock(
                "RightLowerArmMesh",

                {
                    x: 0.62,
                    y: 1.08,
                    z: 0.72
                },

                skin,

                {
                    x: 0,
                    y: -0.54,
                    z: 0
                },

                rightElbow
            );


        const rightHand =
            createBlock(
                "RightHand",

                {
                    x: 0.66,
                    y: 0.42,
                    z: 0.76
                },

                skin,

                {
                    x: 0,
                    y: -1.05,
                    z: 0
                },

                rightElbow
            );


        /* ========================================================
           LEGS
           ======================================================== */

        const leftHip =
            createPivot(
                "LeftUpperLeg",

                {
                    x: -0.50,
                    y: 1.96,
                    z: 0
                },

                body
            );


        const leftUpperLeg =
            createBlock(
                "LeftUpperLegMesh",

                {
                    x: 0.86,
                    y: 1.05,
                    z: 0.92
                },

                pants,

                {
                    x: 0,
                    y: -0.525,
                    z: 0
                },

                leftHip
            );


        const leftKnee =
            createPivot(
                "LeftLowerLeg",

                {
                    x: 0,
                    y: -1.02,
                    z: 0
                },

                leftHip
            );


        const leftLowerLeg =
            createBlock(
                "LeftLowerLegMesh",

                {
                    x: 0.86,
                    y: 1.05,
                    z: 0.92
                },

                pants,

                {
                    x: 0,
                    y: -0.525,
                    z: 0
                },

                leftKnee
            );


        const leftFoot =
            createBlock(
                "LeftFoot",

                {
                    x: 0.88,
                    y: 0.38,
                    z: 1.18
                },

                shoe,

                {
                    x: 0,
                    y: -1.08,
                    z: 0.10
                },

                leftKnee
            );


        /*
         * RIGHT LEG
         */

        const rightHip =
            createPivot(
                "RightUpperLeg",

                {
                    x: 0.50,
                    y: 1.96,
                    z: 0
                },

                body
            );


        const rightUpperLeg =
            createBlock(
                "RightUpperLegMesh",

                {
                    x: 0.86,
                    y: 1.05,
                    z: 0.92
                },

                pants,

                {
                    x: 0,
                    y: -0.525,
                    z: 0
                },

                rightHip
            );


        const rightKnee =
            createPivot(
                "RightLowerLeg",

                {
                    x: 0,
                    y: -1.02,
                    z: 0
                },

                rightHip
            );


        const rightLowerLeg =
            createBlock(
                "RightLowerLegMesh",

                {
                    x: 0.86,
                    y: 1.05,
                    z: 0.92
                },

                pants,

                {
                    x: 0,
                    y: -0.525,
                    z: 0
                },

                rightKnee
            );


        const rightFoot =
            createBlock(
                "RightFoot",

                {
                    x: 0.88,
                    y: 0.38,
                    z: 1.18
                },

                shoe,

                {
                    x: 0,
                    y: -1.08,
                    z: 0.10
                },

                rightKnee
            );


        /* ========================================================
           BODY PART REFERENCES
           ======================================================== */

        character.userData.bodyParts = {

            head,

            upperTorso,

            lowerTorso,

            leftUpperArm:
                leftShoulder,

            leftLowerArm:
                leftElbow,

            leftHand,

            rightUpperArm:
                rightShoulder,

            rightLowerArm:
                rightElbow,

            rightHand,

            leftUpperLeg:
                leftHip,

            leftLowerLeg:
                leftKnee,

            leftFoot,

            rightUpperLeg:
                rightHip,

            rightLowerLeg:
                rightKnee,

            rightFoot
        };


        /*
         * Direct mesh references are also stored.
         * Useful for future editor/player systems.
         */

        character.userData.bodyMeshes = {

            head,

            upperTorso,

            lowerTorso,

            leftUpperArm:
                leftUpperArm,

            leftLowerArm:
                leftLowerArm,

            leftHand,

            rightUpperArm:
                rightUpperArm,

            rightLowerArm:
                rightLowerArm,

            rightHand,

            leftUpperLeg:
                leftUpperLeg,

            leftLowerLeg:
                leftLowerLeg,

            leftFoot,

            rightUpperLeg:
                rightUpperLeg,

            rightLowerLeg:
                rightLowerLeg,

            rightFoot
        };


        /* ========================================================
           JOINT MAP
           ======================================================== */

        character.userData.joints = {

            waist: {
                parent:
                    "LowerTorso",
                child:
                    "UpperTorso"
            },

            neck: {
                parent:
                    "UpperTorso",
                child:
                    "Head"
            },

            leftShoulder: {
                parent:
                    "UpperTorso",
                child:
                    "LeftUpperArm"
            },

            leftElbow: {
                parent:
                    "LeftUpperArm",
                child:
                    "LeftLowerArm"
            },

            leftWrist: {
                parent:
                    "LeftLowerArm",
                child:
                    "LeftHand"
            },

            rightShoulder: {
                parent:
                    "UpperTorso",
                child:
                    "RightUpperArm"
            },

            rightElbow: {
                parent:
                    "RightUpperArm",
                child:
                    "RightLowerArm"
            },

            rightWrist: {
                parent:
                    "RightLowerArm",
                child:
                    "RightHand"
            },

            leftHip: {
                parent:
                    "LowerTorso",
                child:
                    "LeftUpperLeg"
            },

            leftKnee: {
                parent:
                    "LeftUpperLeg",
                child:
                    "LeftLowerLeg"
            },

            leftAnkle: {
                parent:
                    "LeftLowerLeg",
                child:
                    "LeftFoot"
            },

            rightHip: {
                parent:
                    "LowerTorso",
                child:
                    "RightUpperLeg"
            },

            rightKnee: {
                parent:
                    "RightUpperLeg",
                child:
                    "RightLowerLeg"
            },

            rightAnkle: {
                parent:
                    "RightLowerLeg",
                child:
                    "RightFoot"
            }
        };


        /* ========================================================
           ROOT
           ======================================================== */

        const rootPart =
            new THREE_LOCAL.Object3D();

        rootPart.name =
            "HumanoidRootPart";

        rootPart.userData.isRootPart =
            true;

        character.add(
            rootPart
        );

        character.userData.rootPart =
            rootPart;


        /* ========================================================
           RUNTIME
           ======================================================== */

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

            alive: true,

            input: {
                moving: false,
                sprint: false
            }
        };


        /*
         * Dimensions.
         */

        character.userData.height =
            5.7;

        character.userData.width =
            2.65;

        character.userData.depth =
            1.75;


        /* ========================================================
           CONTROLLERS
           ======================================================== */

        character.userData.humanoidController =
            humanoid;


        /*
         * Keep the old public-style methods.
         */

        humanoid.move =
            humanoid.move.bind(
                humanoid
            );

        humanoid.jump =
            humanoid.jump.bind(
                humanoid
            );

        humanoid.sprint =
            humanoid.sprint.bind(
                humanoid
            );


        /* ========================================================
           ANIMATOR
           ======================================================== */

        const animator =
            new CharacterAnimator(
                character
            );

        character.userData.animator =
            animator;


        /*
         * These are registered so the
         * external animations.js can
         * control the actual joint groups.
         */

        animator.loadAnimation(
            "Idle",
            []
        );

        animator.loadAnimation(
            "Walk",
            []
        );

        animator.loadAnimation(
            "Run",
            []
        );

        animator.loadAnimation(
            "Jump",
            []
        );

        animator.loadAnimation(
            "Fall",
            []
        );

        animator.loadAnimation(
            "Land",
            []
        );

        animator.loadAnimation(
            "Death",
            []
        );


        /* ========================================================
           UPDATE
           ======================================================== */

        character.update =
            function(deltaTime) {

                if (
                    !this.userData
                        .runtime
                        .alive
                ) {
                    return;
                }

                updateCharacterPhysics(
                    this,
                    deltaTime
                );

                updateCharacterRotation(
                    this
                );

                if (
                    this.userData
                        .animator
                ) {

                    this.userData
                        .animator
                        .update(
                            deltaTime
                        );
                }

                const runtime =
                    this.userData
                        .runtime;

                runtime.grounded =
                    this.userData
                        .humanoid
                        .isGrounded;

                runtime.velocity = {
                    x:
                        this.userData
                            .humanoid
                            .velocity
                            .x,

                    y:
                        this.userData
                            .humanoid
                            .velocity
                            .y,

                    z:
                        this.userData
                            .humanoid
                            .velocity
                            .z
                };

                runtime.input.moving =
                    Math.abs(
                        this.userData
                            .humanoid
                            .moveDirection
                            .x
                    ) > 0.001 ||
                    Math.abs(
                        this.userData
                            .humanoid
                            .moveDirection
                            .z
                    ) > 0.001;

                runtime.input.sprint =
                    this.userData
                        .humanoid
                        .isSprinting;
            };


        /*
         * Start grounded.
         */

        humanoid.isGrounded =
            true;

        character.position.y =
            Number(
                options.spawnY ??
                0
            );

        character.userData.runtime
            .grounded =
            true;


        return character;
    }


    /* ============================================================
       DESTROY
       ============================================================ */

    function destroyCharacter(
        character
    ) {

        if (!character) {
            return;
        }

        if (
            character.userData &&
            character.userData.runtime
        ) {

            character.userData.runtime
                .alive = false;
        }

        character.traverse(
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
                                    material.dispose
                                ) {

                                    material.dispose();
                                }
                            }
                        );

                    } else if (
                        child.material.dispose
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


    /* ============================================================
       PUBLIC API
       ============================================================ */

    PlayerSystem.createCharacter =
        createCharacter;

    PlayerSystem.destroyCharacter =
        destroyCharacter;

    PlayerSystem.Humanoid =
        Humanoid;

    PlayerSystem.CharacterAnimator =
        CharacterAnimator;


    console.log(
        "[WebBlox Player] Blocky character system loaded."
    );

})();
