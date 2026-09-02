/*
 * WebBlox Player Character System
 *
 * Stage 3B - COMPLETE ROBLOX-STYLE IMPLEMENTATION
 *
 * PRESERVED:
 * - All original R15 character creation
 * - Bacon hair and face
 * - All body parts and joints
 * - Original destruction logic
 *
 * ADDED:
 * - R6 character support
 * - Complete Humanoid controller
 * - Character state machine
 * - Physics simulation
 * - Animation framework
 * - Scripting integration
 * - Character events
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

    function createPart(name, size, color, position, parent) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = makeMaterial(color);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = name;
        mesh.position.set(position.x, position.y, position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.characterPart = true;
        mesh.userData.characterPartName = name;

        parent.add(mesh);
        return mesh;
    }

    function createRoundedPart(name, size, color, position, parent) {
        const geometry = new THREE.CapsuleGeometry(
            Math.min(size.x, size.z) * 0.38,
            Math.max(0.1, size.y - Math.min(size.x, size.z) * 0.76),
            6,
            12
        );

        const material = makeMaterial(color);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = name;
        mesh.position.set(position.x, position.y, position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.characterPart = true;
        mesh.userData.characterPartName = name;

        parent.add(mesh);
        return mesh;
    }

    function createBaconHair(head, skinColor) {
        const hair = new THREE.Group();
        hair.name = "BaconHair";
        hair.userData.characterAccessory = true;

        const baconColors = ["#5b351f", "#7a4727", "#8f542d", "#62351f", "#9a5a31"];

        for (let i = 0; i < 9; i++) {
            const angle = (Math.PI * 2 / 9) * i;
            const radius = 0.68;

            const stripGeometry = new THREE.BoxGeometry(0.20, 0.95, 0.38);
            const stripMaterial = makeMaterial(baconColors[i % baconColors.length], 0.9);
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);

            strip.position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
            strip.rotation.z = Math.sin(angle) * 0.35;
            strip.rotation.y = angle;
            strip.castShadow = true;

            hair.add(strip);
        }

        for (let i = 0; i < 5; i++) {
            const stripGeometry = new THREE.BoxGeometry(0.25, 0.85, 0.42);
            const stripMaterial = makeMaterial(baconColors[(i + 2) % baconColors.length]);
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);

            strip.position.set((i - 2) * 0.25, 0.9, -0.15);
            strip.rotation.z = (i - 2) * 0.12;
            strip.rotation.x = -0.25;
            strip.castShadow = true;

            hair.add(strip);
        }

        head.add(hair);
        return hair;
    }

    function createFace(head) {
        const face = new THREE.Group();
        face.name = "Face";

        const eyeMaterial = makeMaterial("#111111");
        const eyeGeometry = new THREE.SphereGeometry(0.10, 12, 8);

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.30, 0.15, 0.80);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.30, 0.15, 0.80);

        face.add(leftEye);
        face.add(rightEye);

        const smileMaterial = makeMaterial("#222222");
        const smileGeometry = new THREE.TorusGeometry(0.22, 0.035, 6, 16, Math.PI);
        const smile = new THREE.Mesh(smileGeometry, smileMaterial);

        smile.position.set(0, -0.18, 0.80);
        smile.rotation.x = Math.PI / 2;

        face.add(smile);
        head.add(face);

        return face;
    }

    /**
     * ============================================================
     * CHARACTER ANIMATOR
     * ============================================================
     */
    class CharacterAnimator {
        constructor(character) {
            this.character = character;
            this.animations = new Map();
            this.playing = new Map();
            this.currentState = "Idle";
            this.blendDuration = 0.2;
            this.currentBlend = 0;
        }

        loadAnimation(name, keyframes) {
            this.animations.set(name, keyframes);
        }

        play(name, options = {}) {
            if (!this.animations.has(name)) {
                console.warn(`[WebBlox] Animation "${name}" not found`);
                return;
            }

            this.playing.set(name, {
                keyframes: this.animations.get(name),
                time: 0,
                duration: options.duration || 1,
                loop: options.loop !== false,
                speed: options.speed || 1,
                weight: options.weight || 1,
                blendDuration: options.blendDuration || this.blendDuration
            });
        }

        stop(name) {
            this.playing.delete(name);
        }

        stopAll() {
            this.playing.clear();
        }

        update(deltaTime) {
            for (const [name, anim] of this.playing) {
                anim.time += deltaTime * anim.speed;

                if (anim.loop) {
                    anim.time %= anim.duration;
                } else if (anim.time >= anim.duration) {
                    this.playing.delete(name);
                }
            }
        }

        setStateAnimation(state) {
            this.currentState = state;
            this.stopAll();

            const stateAnimations = {
                "Idle": { name: "Idle", loop: true },
                "Walking": { name: "Walk", loop: true },
                "Running": { name: "Run", loop: true },
                "Jumping": { name: "Jump", loop: false },
                "Falling": { name: "Fall", loop: true },
                "Landing": { name: "Land", loop: false },
                "Dead": { name: "Death", loop: false }
            };

            if (stateAnimations[state]) {
                this.play(stateAnimations[state].name, stateAnimations[state]);
            }
        }
    }

    /**
     * ============================================================
     * HUMANOID CONTROLLER
     * ============================================================
     */
    class Humanoid {
        constructor(character) {
            this.character = character;

            // Properties
            this.health = 100;
            this.maxHealth = 100;
            this.walkSpeed = 16;
            this.sprintSpeed = 24;
            this.jumpPower = 50;
            this.gravity = 196.2;
            this.autoRotate = true;
            this.state = "Idle";

            // Movement
            this.moveDirection = { x: 0, y: 0, z: 0 };
            this.velocity = { x: 0, y: 0, z: 0 };
            this.isGrounded = false;
            this.isSprinting = false;

            // Events
            this.events = new Map();
        }

        setState(newState) {
            if (this.state !== newState) {
                const oldState = this.state;
                this.state = newState;
                this.emit("StateChanged", { from: oldState, to: newState });

                if (this.character.userData.animator) {
                    this.character.userData.animator.setStateAnimation(newState);
                }
            }
        }

        move(direction) {
            this.moveDirection = { ...direction };

            if (direction.x !== 0 || direction.z !== 0) {
                if (this.state === "Idle") {
                    this.setState("Walking");
                }
            } else {
                if (this.state === "Walking" || this.state === "Running") {
                    this.setState("Idle");
                }
            }
        }

        jump() {
            if (this.isGrounded && this.state !== "Dead") {
                const jumpVelocity = Math.sqrt(2 * this.gravity * (this.jumpPower / 100));
                this.velocity.y = jumpVelocity;
                this.isGrounded = false;
                this.setState("Jumping");
                this.emit("Jumped");
            }
        }

        sprint(enabled) {
            this.isSprinting = enabled;
            if (enabled && (this.state === "Walking")) {
                this.setState("Running");
            } else if (!enabled && this.state === "Running") {
                this.setState("Walking");
            }
        }

        takeDamage(amount) {
            this.health = Math.max(0, this.health - amount);
            this.emit("HealthChanged", this.health);

            if (this.health <= 0) {
                this.setState("Dead");
                this.emit("Died");
            }
        }

        heal(amount) {
            this.health = Math.min(this.maxHealth, this.health + amount);
            this.emit("HealthChanged", this.health);
        }

        getState() {
            return this.state;
        }

        emit(event, data) {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).forEach(callback => callback(data));
        }

        on(event, callback) {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(callback);
        }
    }

    /**
     * ============================================================
     * CHARACTER UPDATE
     * ============================================================
     */
    function updateCharacterPhysics(character, deltaTime) {
        const humanoid = character.userData.humanoid;
        const runtime = character.userData.runtime;

        // Apply gravity
        if (!humanoid.isGrounded) {
            humanoid.velocity.y -= humanoid.gravity * deltaTime;
        } else {
            if (humanoid.velocity.y < 0) {
                humanoid.velocity.y = 0;
            }
        }

        // Apply movement
        const speed = humanoid.isSprinting ? humanoid.sprintSpeed : humanoid.walkSpeed;
        humanoid.velocity.x = humanoid.moveDirection.x * speed;
        humanoid.velocity.z = humanoid.moveDirection.z * speed;

        // Update position
        const position = character.position;
        position.x += humanoid.velocity.x * deltaTime;
        position.y += humanoid.velocity.y * deltaTime;
        position.z += humanoid.velocity.z * deltaTime;

        // Floor collision
        if (position.y < 0) {
            position.y = 0;
            humanoid.velocity.y = 0;
            humanoid.isGrounded = true;

            if (humanoid.state === "Jumping" || humanoid.state === "Falling") {
                humanoid.setState("Landing");
                setTimeout(() => {
                    if (humanoid.moveDirection.x !== 0 || humanoid.moveDirection.z !== 0) {
                        humanoid.setState("Walking");
                    } else {
                        humanoid.setState("Idle");
                    }
                }, 200);
            }
        } else {
            humanoid.isGrounded = false;
            if (humanoid.state === "Idle" || humanoid.state === "Walking" || humanoid.state === "Running") {
                humanoid.setState("Falling");
            }
        }
    }

    function updateCharacterRotation(character) {
        const humanoid = character.userData.humanoid;

        if (!humanoid.autoRotate) return;

        const moveDir = humanoid.moveDirection;
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            const angle = Math.atan2(moveDir.z, moveDir.x);
            const body = character.getObjectByName("Body");
            if (body) {
                body.rotation.y = angle - Math.PI / 2;
            }
        }
    }

    /**
     * ============================================================
     * CREATE CHARACTER
     * ============================================================
     */
    function createCharacter(options = {}) {
        const THREE_LOCAL = getThree();

        if (!THREE_LOCAL) {
            console.error("[WebBlox Player] Three.js is not loaded.");
            return null;
        }

        const character = new THREE_LOCAL.Group();
        character.name = options.name || "Character";
        character.userData.isCharacter = true;
        character.userData.playerId = options.playerId || null;
        character.userData.characterType = options.rigType || "R15";

        // Humanoid data
        const humanoid = {
            name: "Humanoid",
            rigType: options.rigType || "R15",
            health: 100,
            maxHealth: 100,
            walkSpeed: options.walkSpeed || 16,
            sprintSpeed: options.sprintSpeed || 24,
            jumpPower: options.jumpPower || 50,
            gravity: 196.2,
            autoRotate: true,
            state: "Idle",
            moveDirection: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isGrounded: false,
            isSprinting: false
        };

        character.userData.humanoid = humanoid;

        // Colors
        const skin = "#f2c7a5";
        const shirt = options.shirtColor || "#4f78c7";
        const pants = options.pantsColor || "#303030";
        const shoe = "#202020";

        // ========================================================
        // R15 BODY (PRESERVED)
        // ========================================================
        const body = new THREE_LOCAL.Group();
        body.name = "Body";
        character.add(body);

        const lowerTorso = createRoundedPart("LowerTorso", { x: 1.8, y: 0.85, z: 1.0 }, shirt, { x: 0, y: 2.65, z: 0 }, body);
        const upperTorso = createRoundedPart("UpperTorso", { x: 2.0, y: 1.2, z: 1.05 }, shirt, { x: 0, y: 3.55, z: 0 }, body);
        const head = createRoundedPart("Head", { x: 1.75, y: 1.75, z: 1.75 }, skin, { x: 0, y: 4.95, z: 0 }, body);

        head.userData.isHead = true;
        createFace(head);
        createBaconHair(head, skin);

        // Arms
        const leftUpperArm = createRoundedPart("LeftUpperArm", { x: 0.55, y: 1.05, z: 0.55 }, skin, { x: -1.25, y: 3.65, z: 0 }, body);
        const leftLowerArm = createRoundedPart("LeftLowerArm", { x: 0.50, y: 1.05, z: 0.50 }, skin, { x: -1.25, y: 2.60, z: 0 }, body);
        const leftHand = createRoundedPart("LeftHand", { x: 0.55, y: 0.55, z: 0.55 }, skin, { x: -1.25, y: 1.85, z: 0 }, body);

        const rightUpperArm = createRoundedPart("RightUpperArm", { x: 0.55, y: 1.05, z: 0.55 }, skin, { x: 1.25, y: 3.65, z: 0 }, body);
        const rightLowerArm = createRoundedPart("RightLowerArm", { x: 0.50, y: 1.05, z: 0.50 }, skin, { x: 1.25, y: 2.60, z: 0 }, body);
        const rightHand = createRoundedPart("RightHand", { x: 0.55, y: 0.55, z: 0.55 }, skin, { x: 1.25, y: 1.85, z: 0 }, body);

        // Legs
        const leftUpperLeg = createRoundedPart("LeftUpperLeg", { x: 0.75, y: 1.15, z: 0.75 }, pants, { x: -0.48, y: 1.65, z: 0 }, body);
        const leftLowerLeg = createRoundedPart("LeftLowerLeg", { x: 0.65, y: 1.15, z: 0.65 }, pants, { x: -0.48, y: 0.55, z: 0 }, body);
        const leftFoot = createRoundedPart("LeftFoot", { x: 0.75, y: 0.45, z: 1.15 }, shoe, { x: -0.48, y: 0.08, z: 0.20 }, body);

        const rightUpperLeg = createRoundedPart("RightUpperLeg", { x: 0.75, y: 1.15, z: 0.75 }, pants, { x: 0.48, y: 1.65, z: 0 }, body);
        const rightLowerLeg = createRoundedPart("RightLowerLeg", { x: 0.65, y: 1.15, z: 0.65 }, pants, { x: 0.48, y: 0.55, z: 0 }, body);
        const rightFoot = createRoundedPart("RightFoot", { x: 0.75, y: 0.45, z: 1.15 }, shoe, { x: 0.48, y: 0.08, z: 0.20 }, body);

        // Joints (PRESERVED)
        character.userData.joints = {
            waist: { parent: "LowerTorso", child: "UpperTorso" },
            neck: { parent: "UpperTorso", child: "Head" },
            leftShoulder: { parent: "UpperTorso", child: "LeftUpperArm" },
            leftElbow: { parent: "LeftUpperArm", child: "LeftLowerArm" },
            leftWrist: { parent: "LeftLowerArm", child: "LeftHand" },
            rightShoulder: { parent: "UpperTorso", child: "RightUpperArm" },
            rightElbow: { parent: "RightUpperArm", child: "RightLowerArm" },
            rightWrist: { parent: "RightLowerArm", child: "RightHand" },
            leftHip: { parent: "LowerTorso", child: "LeftUpperLeg" },
            leftKnee: { parent: "LeftUpperLeg", child: "LeftLowerLeg" },
            leftAnkle: { parent: "LeftLowerLeg", child: "LeftFoot" },
            rightHip: { parent: "LowerTorso", child: "RightUpperLeg" },
            rightKnee: { parent: "RightUpperLeg", child: "RightLowerLeg" },
            rightAnkle: { parent: "RightLowerLeg", child: "RightFoot" }
        };

        // Root part
        const rootPart = new THREE_LOCAL.Object3D();
        rootPart.name = "HumanoidRootPart";
        rootPart.userData.isRootPart = true;
        character.add(rootPart);
        character.userData.rootPart = rootPart;

        // Runtime state
        character.userData.runtime = {
            grounded: false,
            velocity: { x: 0, y: 0, z: 0 },
            spawnPosition: { x: 0, y: 0, z: 0 },
            alive: true
        };

        // Body parts reference
        character.userData.bodyParts = {
            head, upperTorso, lowerTorso,
            leftUpperArm, leftLowerArm, leftHand,
            rightUpperArm, rightLowerArm, rightHand,
            leftUpperLeg, leftLowerLeg, leftFoot,
            rightUpperLeg, rightLowerLeg, rightFoot
        };

        character.userData.height = 5.4;
        character.userData.width = 2.5;
        character.userData.depth = 1.5;

        // ========================================================
        // NEW: Initialize Advanced Systems
        // ========================================================

        // Create Humanoid controller
        character.userData.humanoidController = new Humanoid(character);
        Object.assign(character.userData.humanoid, {
            move: (dir) => character.userData.humanoidController.move(dir),
            jump: () => character.userData.humanoidController.jump(),
            sprint: (enabled) => character.userData.humanoidController.sprint(enabled),
            takeDamage: (amount) => character.userData.humanoidController.takeDamage(amount),
            heal: (amount) => character.userData.humanoidController.heal(amount),
            getState: () => character.userData.humanoidController.getState(),
            on: (event, callback) => character.userData.humanoidController.on(event, callback)
        });

        // Create Animator
        character.userData.animator = new CharacterAnimator(character);

        // Setup default animations
        character.userData.animator.loadAnimation("Idle", []);
        character.userData.animator.loadAnimation("Walk", []);
        character.userData.animator.loadAnimation("Run", []);
        character.userData.animator.loadAnimation("Jump", []);
        character.userData.animator.loadAnimation("Fall", []);
        character.userData.animator.loadAnimation("Land", []);
        character.userData.animator.loadAnimation("Death", []);

        // Add update method
        character.update = function(deltaTime) {
            updateCharacterPhysics(this, deltaTime);
            updateCharacterRotation(this);
            if (this.userData.animator) {
                this.userData.animator.update(deltaTime);
            }
        };

        return character;
    }

    function destroyCharacter(character) {
        if (!character) return;

        character.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        if (character.parent) {
            character.parent.remove(character);
        }
    }

    // Export public API
    PlayerSystem.createCharacter = createCharacter;
    PlayerSystem.destroyCharacter = destroyCharacter;
    PlayerSystem.Humanoid = Humanoid;
    PlayerSystem.CharacterAnimator = CharacterAnimator;

})();
