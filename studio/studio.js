```javascript
/*
 * WebBlox Studio
 * Stage 3A
 *
 * COMPLETE STUDIO CONTROLLER
 *
 * Includes:
 * - Real Three.js viewport
 * - Real WebBlox Player runtime integration
 * - Player dependency loading
 * - Player start/stop
 * - Correct WASD camera movement
 * - RMB camera rotation
 * - Mouse-wheel zoom
 * - Q = Select
 * - W = Move
 * - E = Rotate
 * - R = Scale
 * - F = Focus
 * - Ctrl+D = Duplicate
 * - Delete = Delete
 * - Ctrl+Z = Undo
 * - Ctrl+Y = Redo
 * - Ctrl+Shift+Z = Redo
 * - Escape = Clear selection
 * - Grid
 * - Snap
 * - Explorer
 * - Properties
 * - Object insertion
 * - Save/load
 * - New game
 * - Publish validation
 *
 * FILE:
 * studio/studio.js
 */

(() => {
    "use strict";

    // ============================================================
    // STATE
    // ============================================================

    const state = {
        objects: new Map(),

        selectedId: null,

        tool: "select",

        gridEnabled: true,
        snapEnabled: true,

        camera: {
            yaw: 35,
            pitch: -25,
            distance: 24,

            target: {
                x: 0,
                y: 0,
                z: 0
            },

            minDistance: 3,
            maxDistance: 200
        },

        keys: new Set(),

        mouse: {
            down: false,
            button: 0,

            lastX: 0,
            lastY: 0,

            draggingObject: false,

            dragStartX: 0,
            dragStartY: 0,

            objectStart: null
        },

        history: [],
        future: [],

        game: {
            name: "Untitled Game",
            description: "",
            icon: "",
            saved: false
        },

        playing: false
    };


    // ============================================================
    // DOM
    // ============================================================

    const $ = id => document.getElementById(id);

    const viewport = $("viewport");

    const explorerPanel = $("explorerPanel");
    const propertiesPanel = $("propertiesPanel");

    const workspaceChildren = $("workspaceChildren");

    const outputConsole = $("outputConsole");

    const studioMessage = $("studioMessage");
    const gameStatus = $("gameStatus");

    const viewportMode = $("viewportMode");
    const viewportCoordinates = $("viewportCoordinates");

    const noSelectionMessage = $("noSelectionMessage");
    const selectedObjectName = $("selectedObjectName");
    const selectedObjectType = $("selectedObjectType");
    const selectedObjectIcon = $("selectedObjectIcon");

    const selectionBox = $("selectionBox");


    // ============================================================
    // THREE
    // ============================================================

    let THREE = null;

    let renderer = null;
    let scene = null;
    let camera = null;
    let canvas = null;

    let raycaster = null;
    let mouseVector = null;

    let gridHelper = null;

    let ambientLight = null;
    let directionalLight = null;

    let threeReady = false;

    const meshes = new Map();


    // ============================================================
    // HELPERS
    // ============================================================

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }


    function snap(value, amount = 1) {
        if (!state.snapEnabled) {
            return value;
        }

        return Math.round(value / amount) * amount;
    }


    function makeId(prefix = "object") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function cloneObject(object) {
        return JSON.parse(JSON.stringify(object));
    }


    function log(message, type = "info") {
        console.log(`[WebBlox Studio] ${message}`);

        if (!outputConsole) {
            return;
        }

        const line = document.createElement("div");

        line.className =
            `console-line console-${type}`;

        line.innerHTML = `
            <span class="console-time">
                [WebBlox]
            </span>
            <span>
                ${escapeHTML(message)}
            </span>
        `;

        outputConsole.appendChild(line);

        outputConsole.scrollTop =
            outputConsole.scrollHeight;
    }


    function showToast(message) {
        const container = $("toastContainer");

        if (!container) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className = "toast";
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("toast-hide");

            setTimeout(
                () => toast.remove(),
                250
            );
        }, 2500);
    }


    // ============================================================
    // THREE LOADER
    // ============================================================

    function loadThree() {
        return new Promise((resolve, reject) => {

            if (window.THREE) {
                THREE = window.THREE;
                resolve();
                return;
            }

            const existing =
                document.querySelector(
                    "script[data-webblox-three]"
                );

            if (existing) {

                const finish = () => {

                    if (window.THREE) {
                        THREE = window.THREE;
                        resolve();
                    } else {
                        reject(
                            new Error(
                                "Three.js loaded but window.THREE is unavailable."
                            )
                        );
                    }
                };

                existing.addEventListener(
                    "load",
                    finish,
                    { once: true }
                );

                existing.addEventListener(
                    "error",
                    () => reject(
                        new Error(
                            "Three.js failed to load."
                        )
                    ),
                    { once: true }
                );

                return;
            }

            const script =
                document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";

            script.dataset.webbloxThree = "true";

            script.onload = () => {

                if (!window.THREE) {
                    reject(
                        new Error(
                            "Three.js loaded but window.THREE is unavailable."
                        )
                    );

                    return;
                }

                THREE = window.THREE;
                resolve();
            };

            script.onerror = () => {
                reject(
                    new Error(
                        "Unable to load Three.js."
                    )
                );
            };

            document.head.appendChild(script);
        });
    }


    // ============================================================
    // PLAYER RUNTIME LOADER
    // ============================================================

    /*
     * IMPORTANT:
     *
     * Player/player.js depends on character.js.
     *
     * character.js creates window.WebBloxPlayer.createCharacter.
     *
     * Therefore player.js CANNOT be loaded by itself.
     *
     * The actual Player folder currently contains:
     *
     * animations.js
     * camera.js
     * character.js
     * controller.js
     * physics.js
     * player.js
     *
     * We load character.js before player.js.
     */

    const PLAYER_FILES = [
        "physics.js",
        "controller.js",
        "camera.js",
        "animations.js",
        "character.js",
        "player.js"
    ];


    function getPlayerBasePath() {

        /*
         * studio/studio.js
         *
         * ../Player/
         */

        return "../Player/";
    }


    function normalizePath(path) {

        try {
            return new URL(
                path,
                document.baseURI
            ).href;
        } catch {
            return path;
        }
    }


    function playerScriptAlreadyLoaded(path) {

        const target =
            normalizePath(path);

        return Array.from(
            document.scripts
        ).some(script => {

            if (!script.src) {
                return false;
            }

            return normalizePath(
                script.src
            ) === target;
        });
    }


    function loadPlayerScript(path) {

        return new Promise(
            (resolve, reject) => {

                if (
                    playerScriptAlreadyLoaded(path)
                ) {
                    resolve();
                    return;
                }

                const script =
                    document.createElement("script");

                script.src = path;

                /*
                 * Do NOT use async.
                 *
                 * Dependency order matters.
                 */

                script.async = false;

                script.dataset.webbloxPlayer =
                    "true";

                script.onload = () => {
                    resolve();
                };

                script.onerror = () => {
                    reject(
                        new Error(
                            `Player file failed to load: ${path}`
                        )
                    );
                };

                document.head.appendChild(script);
            }
        );
    }


    async function loadPlayerRuntime() {

        /*
         * Three.js MUST exist before character.js.
         */

        if (!window.THREE) {
            throw new Error(
                "Three.js must load before the Player runtime."
            );
        }

        const base =
            getPlayerBasePath();

        log(
            "Loading Player runtime..."
        );

        /*
         * Load each dependency in order.
         */

        for (
            const file
            of PLAYER_FILES
        ) {

            const path =
                base + file;

            log(
                `Loading Player/${file}...`
            );

            await loadPlayerScript(path);
        }

        /*
         * player.js should now have created
         * window.WebBloxPlayer.
         */

        if (
            !window.WebBloxPlayer
        ) {
            throw new Error(
                "Player runtime did not create window.WebBloxPlayer."
            );
        }

        if (
            typeof window.WebBloxPlayer.start !==
            "function"
        ) {
            throw new Error(
                "Player runtime loaded but Player.start is unavailable."
            );
        }

        if (
            typeof window.WebBloxPlayer.getCharacter !==
            "function"
        ) {
            throw new Error(
                "Player runtime loaded but getCharacter is unavailable."
            );
        }

        log(
            "Player runtime loaded successfully."
        );

        return window.WebBloxPlayer;
    }


    // ============================================================
    // OBJECT SYSTEM
    // ============================================================

    function createObject(data = {}) {

        const object = {

            id:
                data.id ||
                makeId("object"),

            name:
                data.name ||
                (
                    data.type === "SpawnLocation"
                        ? "Spawn"
                        : data.type === "Model"
                            ? "Model"
                            : data.type === "Folder"
                                ? "Folder"
                                : data.type === "Script"
                                    ? "Script"
                                    : "Part"
                ),

            className:
                data.className ||
                data.type ||
                "Part",

            type:
                data.type ||
                data.className ||
                "Part",

            position: {
                x: Number(
                    data.position?.x ?? 0
                ),

                y: Number(
                    data.position?.y ?? 0
                ),

                z: Number(
                    data.position?.z ?? 0
                )
            },

            rotation: {
                x: Number(
                    data.rotation?.x ?? 0
                ),

                y: Number(
                    data.rotation?.y ?? 0
                ),

                z: Number(
                    data.rotation?.z ?? 0
                )
            },

            size: {
                x: Number(
                    data.size?.x ?? 4
                ),

                y: Number(
                    data.size?.y ?? 1
                ),

                z: Number(
                    data.size?.z ?? 4
                )
            },

            color:
                data.color ||
                (
                    data.type === "SpawnLocation"
                        ? "#22c55e"
                        : "#808080"
                ),

            material:
                data.material ||
                "Plastic",

            anchored:
                data.anchored !== false,

            canCollide:
                data.canCollide !== false,

            castShadow:
                data.castShadow !== false,

            script:
                data.script || ""
        };

        state.objects.set(
            object.id,
            object
        );

        return object;
    }


    // ============================================================
    // DEFAULT WORLD
    // ============================================================

    function createDefaultWorld() {

        state.objects.clear();

        createObject({
            id: "defaultPart",

            name: "Part",

            type: "Part",

            position: {
                x: 0,
                y: -1,
                z: 0
            },

            size: {
                x: 20,
                y: 1,
                z: 20
            },

            color: "#808080",

            anchored: true,

            canCollide: true
        });


        createObject({
            id: "spawn",

            name: "Spawn",

            type: "SpawnLocation",

            position: {
                x: 0,
                y: 0,
                z: 0
            },

            size: {
                x: 4,
                y: 1,
                z: 4
            },

            color: "#22c55e",

            anchored: true,

            canCollide: true
        });


        state.selectedId = null;
    }


    // ============================================================
    // MATERIAL
    // ============================================================

    function getMaterial(object) {

        const params = {

            color:
                new THREE.Color(
                    object.color || "#808080"
                ),

            roughness: 0.8,

            metalness: 0
        };


        switch (object.material) {

            case "SmoothPlastic":

                params.roughness = 0.35;

                break;


            case "Metal":

                params.roughness = 0.25;

                params.metalness = 0.85;

                break;


            case "Glass":

                params.transparent = true;

                params.opacity = 0.45;

                params.roughness = 0.1;

                break;


            case "Wood":

                params.roughness = 0.9;

                break;


            case "Concrete":

                params.roughness = 1;

                break;
        }


        return new THREE.MeshStandardMaterial(
            params
        );
    }


    // ============================================================
    // CREATE MESH
    // ============================================================

    function createMeshForObject(object) {

        if (!threeReady) {
            return null;
        }

        let root;


        if (
            object.type === "Part" ||
            object.type === "SpawnLocation"
        ) {

            const geometry =
                new THREE.BoxGeometry(
                    object.size.x,
                    object.size.y,
                    object.size.z
                );

            const material =
                getMaterial(object);

            root =
                new THREE.Mesh(
                    geometry,
                    material
                );

            root.castShadow =
                object.castShadow;

            root.receiveShadow = true;


            if (
                object.type === "SpawnLocation"
            ) {

                const arrowMaterial =
                    new THREE.MeshStandardMaterial({
                        color: "#22c55e",
                        roughness: 0.45
                    });

                root.material =
                    arrowMaterial;


                const arrow =
                    new THREE.Mesh(
                        new THREE.ConeGeometry(
                            0.45,
                            1.4,
                            4
                        ),
                        arrowMaterial
                    );


                arrow.position.y =
                    object.size.y / 2 + 0.8;


                arrow.rotation.x =
                    Math.PI;


                root.add(arrow);
            }
        }


        else if (
            object.type === "Model"
        ) {

            root =
                new THREE.Group();


            const material =
                getMaterial(object);


            const body =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        2.5,
                        3,
                        1.5
                    ),
                    material
                );


            body.position.y = 1.5;

            body.castShadow = true;

            root.add(body);


            const head =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        1.7,
                        1.7,
                        1.7
                    ),
                    material
                );


            head.position.y = 3.9;

            head.castShadow = true;

            root.add(head);
        }


        else {

            root =
                new THREE.Group();
        }


        root.userData.objectId =
            object.id;


        root.position.set(
            object.position.x,
            object.position.y,
            object.position.z
        );


        root.rotation.set(
            THREE.MathUtils.degToRad(
                object.rotation.x
            ),

            THREE.MathUtils.degToRad(
                object.rotation.y
            ),

            THREE.MathUtils.degToRad(
                object.rotation.z
            )
        );


        if (
            object.type === "Model"
        ) {

            root.scale.set(
                object.size.x / 4,
                object.size.y,
                object.size.z / 4
            );
        }


        return root;
    }


    // ============================================================
    // DISPOSE MESH
    // ============================================================

    function disposeMesh(mesh) {

        if (!mesh) {
            return;
        }

        mesh.traverse(child => {

            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {

                if (
                    Array.isArray(
                        child.material
                    )
                ) {

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
    }


    // ============================================================
    // RENDER OBJECT
    // ============================================================

    function renderObject(object) {

        if (!threeReady) {
            return;
        }


        const old =
            meshes.get(object.id);


        if (old) {

            if (old.parent) {
                old.parent.remove(old);
            }

            disposeMesh(old);

            meshes.delete(object.id);
        }


        const mesh =
            createMeshForObject(object);


        if (!mesh) {
            return;
        }


        scene.add(mesh);


        meshes.set(
            object.id,
            mesh
        );


        updateMeshSelection(object);
    }


    function renderWorld() {

        if (!threeReady) {
            return;
        }


        for (
            const mesh
            of meshes.values()
        ) {

            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }

            disposeMesh(mesh);
        }


        meshes.clear();


        for (
            const object
            of state.objects.values()
        ) {

            renderObject(object);
        }


        updateSelectionVisual();

        updateGrid();

        updateCameraStatus();
    }


    function updateMeshFromObject(object) {

        const mesh =
            meshes.get(object.id);


        if (!mesh) {

            renderObject(object);

            return;
        }


        /*
         * Models can update without recreation.
         */

        if (
            object.type === "Model"
        ) {

            mesh.position.set(
                object.position.x,
                object.position.y,
                object.position.z
            );

            mesh.rotation.set(
                THREE.MathUtils.degToRad(
                    object.rotation.x
                ),

                THREE.MathUtils.degToRad(
                    object.rotation.y
                ),

                THREE.MathUtils.degToRad(
                    object.rotation.z
                )
            );

            mesh.scale.set(
                object.size.x / 4,
                object.size.y,
                object.size.z / 4
            );

        } else {

            /*
             * Parts need recreation because
             * size/material/color can change.
             */

            renderObject(object);
        }


        updateMeshSelection(object);
    }


    // ============================================================
    // SELECTION
    // ============================================================

    function updateMeshSelection(object) {

        const mesh =
            meshes.get(object.id);


        if (!mesh) {
            return;
        }


        mesh.traverse(child => {

            if (
                !child.isMesh ||
                !child.material
            ) {
                return;
            }


            /*
             * Do not permanently replace
             * material objects.
             */

            if (
                child.material.emissive
            ) {

                child.material.emissive =
                    new THREE.Color(
                        state.selectedId ===
                        object.id
                            ? "#3b82f6"
                            : "#000000"
                    );

                child.material.emissiveIntensity =
                    state.selectedId ===
                    object.id
                        ? 0.35
                        : 0;
            }
        });
    }


    function updateSelectionVisual() {

        for (
            const object
            of state.objects.values()
        ) {

            updateMeshSelection(object);
        }
    }


    function selectObject(id) {

        const object =
            state.objects.get(id);


        if (!object) {
            return;
        }


        state.selectedId = id;


        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();


        if (studioMessage) {

            studioMessage.textContent =
                `Selected ${object.name}`;
        }
    }


    function clearSelection() {

        state.selectedId = null;


        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();


        if (studioMessage) {

            studioMessage.textContent =
                "Nothing selected";
        }
    }


    // ============================================================
    // GRID
    // ============================================================

    function createGrid() {

        if (!threeReady) {
            return;
        }


        if (gridHelper) {
            scene.remove(gridHelper);

            disposeMesh(gridHelper);

            gridHelper = null;
        }


        gridHelper =
            new THREE.GridHelper(
                200,
                200,
                0x555555,
                0x252525
            );


        gridHelper.position.y =
            -0.51;


        scene.add(gridHelper);


        updateGrid();
    }


    function updateGrid() {

        if (gridHelper) {

            gridHelper.visible =
                state.gridEnabled;
        }
    }


    // ============================================================
    // CAMERA
    // ============================================================

    function updateCamera() {

        if (
            !camera ||
            !threeReady
        ) {
            return;
        }


        const yaw =
            THREE.MathUtils.degToRad(
                state.camera.yaw
            );


        const pitch =
            THREE.MathUtils.degToRad(
                state.camera.pitch
            );


        const distance =
            state.camera.distance;


        const target =
            state.camera.target;


        const horizontal =
            Math.cos(pitch) *
            distance;


        camera.position.set(

            target.x +
            Math.sin(yaw) *
            horizontal,

            target.y -
            Math.sin(pitch) *
            distance,

            target.z +
            Math.cos(yaw) *
            horizontal
        );


        camera.lookAt(
            target.x,
            target.y,
            target.z
        );


        updateCameraStatus();
    }


    function updateCameraStatus() {

        if (!viewportCoordinates) {
            return;
        }


        const p =
            camera
                ? camera.position
                : state.camera.target;


        viewportCoordinates.textContent =
            `X: ${Math.round(p.x)} ` +
            `Y: ${Math.round(p.y)} ` +
            `Z: ${Math.round(p.z)}`;
    }


    function resetCamera() {

        state.camera.target = {
            x: 0,
            y: 0,
            z: 0
        };


        state.camera.yaw = 35;

        state.camera.pitch = -25;

        state.camera.distance = 24;


        updateCamera();


        log(
            "Camera reset."
        );
    }


    function focusSelected() {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {
            return;
        }


        state.camera.target.x =
            object.position.x;

        state.camera.target.y =
            object.position.y;

        state.camera.target.z =
            object.position.z;


        state.camera.distance =
            Math.max(
                8,

                Math.max(
                    object.size.x,
                    object.size.y,
                    object.size.z
                ) * 4
            );


        updateCamera();


        log(
            `Focused "${object.name}".`
        );
    }


    // ============================================================
    // CAMERA MOVEMENT
    // ============================================================

    function updateMovement(delta) {

        /*
         * CAMERA CONTROLS
         *
         * Only active while RMB is held.
         *
         * W = forward
         * S = backward
         * A = left
         * D = right
         *
         * This is intentionally separated from
         * the W/E/R Studio tool shortcuts.
         */

        if (
            state.mouse.button !== 2 ||
            !state.mouse.down
        ) {
            return;
        }


        const active =
            document.activeElement;


        if (
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.tagName === "SELECT"
            )
        ) {
            return;
        }


        const speed =
            state.keys.has("shift")
                ? 40
                : 18;


        let forward = 0;

        let right = 0;


        if (
            state.keys.has("w") ||
            state.keys.has("arrowup")
        ) {

            forward += 1;
        }


        if (
            state.keys.has("s") ||
            state.keys.has("arrowdown")
        ) {

            forward -= 1;
        }


        if (
            state.keys.has("d") ||
            state.keys.has("arrowright")
        ) {

            right += 1;
        }


        if (
            state.keys.has("a") ||
            state.keys.has("arrowleft")
        ) {

            right -= 1;
        }


        if (
            forward === 0 &&
            right === 0
        ) {
            return;
        }


        const length =
            Math.hypot(
                forward,
                right
            );


        forward /= length;

        right /= length;


        const yaw =
            THREE.MathUtils.degToRad(
                state.camera.yaw
            );


        const amount =
            speed * delta;


        /*
         * IMPORTANT:
         *
         * updateCamera() defines camera
         * forward as:
         *
         * X = sin(yaw)
         * Z = cos(yaw)
         *
         * Therefore W uses the SAME vector.
         *
         * This fixes the old inverted movement.
         */

        const forwardX =
            Math.sin(yaw);

        const forwardZ =
            Math.cos(yaw);


        /*
         * Right vector is perpendicular
         * to the forward vector.
         */

        const rightX =
            Math.cos(yaw);

        const rightZ =
            -Math.sin(yaw);


        state.camera.target.x +=
            (
                forwardX * forward +
                rightX * right
            ) *
            amount;


        state.camera.target.z +=
            (
                forwardZ * forward +
                rightZ * right
            ) *
            amount;


        updateCamera();
    }


    // ============================================================
    // MOUSE CAMERA
    // ============================================================

    function onPointerDown(event) {

        if (
            event.button !== 1 &&
            event.button !== 2
        ) {
            return;
        }


        event.preventDefault();


        state.mouse.down = true;

        state.mouse.button =
            event.button;


        state.mouse.lastX =
            event.clientX;

        state.mouse.lastY =
            event.clientY;


        if (canvas) {

            canvas.style.cursor =
                "grabbing";
        }
    }


    function onPointerMove(event) {

        if (
            !state.mouse.down
        ) {
            return;
        }


        const dx =
            event.clientX -
            state.mouse.lastX;


        const dy =
            event.clientY -
            state.mouse.lastY;


        state.mouse.lastX =
            event.clientX;

        state.mouse.lastY =
            event.clientY;


        /*
         * Do not rotate the camera while
         * transforming an object.
         */

        if (
            state.mouse.draggingObject
        ) {
            return;
        }


        /*
         * RMB or middle mouse rotates.
         */

        state.camera.yaw -=
            dx * 0.35;


        state.camera.pitch -=
            dy * 0.25;


        state.camera.pitch =
            clamp(
                state.camera.pitch,
                -89,
                89
            );


        updateCamera();
    }


    function onPointerUp() {

        state.mouse.down = false;

        state.mouse.button = 0;


        state.mouse.draggingObject =
            false;

        state.mouse.objectStart =
            null;


        if (canvas) {

            canvas.style.cursor =
                "default";
        }
    }


    function handleWheel(event) {

        event.preventDefault();


        state.camera.distance =
            clamp(
                state.camera.distance +
                (
                    event.deltaY > 0
                        ? 2
                        : -2
                ),

                state.camera.minDistance,

                state.camera.maxDistance
            );


        updateCamera();
    }


    // ============================================================
    // VIEWPORT RAYCASTING
    // ============================================================

    function getObjectFromViewport(event) {

        if (
            !raycaster ||
            !camera ||
            !canvas
        ) {
            return null;
        }


        const rect =
            canvas.getBoundingClientRect();


        mouseVector.x =
            (
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width
            ) *
            2 -
            1;


        mouseVector.y =
            -(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height
            ) *
            2 +
            1;


        raycaster.setFromCamera(
            mouseVector,
            camera
        );


        const roots =
            Array.from(
                meshes.values()
            );


        const hits =
            raycaster.intersectObjects(
                roots,
                true
            );


        if (!hits.length) {
            return null;
        }


        let current =
            hits[0].object;


        while (current) {

            if (
                current.userData &&
                current.userData.objectId
            ) {

                return current.userData.objectId;
            }


            current =
                current.parent;
        }


        return null;
    }


    function selectFromViewport(event) {

        if (
            state.tool !== "select" &&
            state.tool !== "move" &&
            state.tool !== "scale" &&
            state.tool !== "rotate"
        ) {
            return;
        }


        if (
            event.button !== 0
        ) {
            return;
        }


        const id =
            getObjectFromViewport(event);


        if (!id) {

            if (
                state.tool === "select"
            ) {

                clearSelection();
            }

            return;
        }


        selectObject(id);


        if (
            state.tool !== "select"
        ) {

            beginTransform(event);
        }
    }


    // ============================================================
    // TRANSFORM
    // ============================================================

    function beginTransform(event) {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {
            return;
        }


        saveHistory();


        state.mouse.draggingObject =
            true;


        state.mouse.dragStartX =
            event.clientX;


        state.mouse.dragStartY =
            event.clientY;


        state.mouse.objectStart =
            cloneObject(object);


        if (canvas) {

            canvas.style.cursor =
                "grabbing";
        }
    }


    function transformSelected(event) {

        if (
            !state.mouse.draggingObject
        ) {
            return;
        }


        const object =
            state.objects.get(
                state.selectedId
            );


        const start =
            state.mouse.objectStart;


        if (
            !object ||
            !start
        ) {
            return;
        }


        const dx =
            event.clientX -
            state.mouse.dragStartX;


        const dy =
            event.clientY -
            state.mouse.dragStartY;


        const amount =
            0.025 *
            (
                state.camera.distance /
                10
            );


        if (
            state.tool === "move"
        ) {

            const yaw =
                THREE.MathUtils.degToRad(
                    state.camera.yaw
                );


            /*
             * Screen horizontal = camera right.
             * Screen vertical = world Y.
             *
             * Horizontal object movement uses
             * camera-relative X/Z.
             */

            const rightX =
                Math.cos(yaw);

            const rightZ =
                -Math.sin(yaw);


            const forwardX =
                Math.sin(yaw);

            const forwardZ =
                Math.cos(yaw);


            object.position.x =
                start.position.x +
                (
                    rightX * dx -
                    forwardX * dy
                ) *
                amount;


            object.position.z =
                start.position.z +
                (
                    rightZ * dx -
                    forwardZ * dy
                ) *
                amount;


            if (
                state.snapEnabled
            ) {

                object.position.x =
                    snap(
                        object.position.x
                    );


                object.position.z =
                    snap(
                        object.position.z
                    );
            }
        }


        else if (
            state.tool === "scale"
        ) {

            const change =
                (
                    dx -
                    dy
                ) *
                0.02;


            object.size.x =
                Math.max(
                    0.1,
                    start.size.x +
                    change
                );


            object.size.y =
                Math.max(
                    0.1,
                    start.size.y +
                    change
                );


            object.size.z =
                Math.max(
                    0.1,
                    start.size.z +
                    change
                );


            if (
                state.snapEnabled
            ) {

                object.size.x =
                    Math.max(
                        0.1,
                        snap(
                            object.size.x,
                            0.5
                        )
                    );


                object.size.y =
                    Math.max(
                        0.1,
                        snap(
                            object.size.y,
                            0.5
                        )
                    );


                object.size.z =
                    Math.max(
                        0.1,
                        snap(
                            object.size.z,
                            0.5
                        )
                    );
            }
        }


        else if (
            state.tool === "rotate"
        ) {

            object.rotation.y =
                start.rotation.y +
                dx * 0.5;


            object.rotation.x =
                start.rotation.x -
                dy * 0.25;


            if (
                state.snapEnabled
            ) {

                object.rotation.y =
                    snap(
                        object.rotation.y,
                        15
                    );


                object.rotation.x =
                    snap(
                        object.rotation.x,
                        15
                    );
            }
        }


        updateMeshFromObject(
            object
        );


        updateProperties();


        state.game.saved =
            false;


        updateGameStatus();
    }


    // ============================================================
    // 3D INPUT
    // ============================================================

    function setup3DInput() {

        if (!canvas) {
            return;
        }


        canvas.addEventListener(
            "pointerdown",
            event => {

                /*
                 * Left click selects.
                 */

                if (
                    event.button === 0
                ) {

                    selectFromViewport(
                        event
                    );
                }


                /*
                 * RMB/middle mouse controls
                 * the camera.
                 */

                onPointerDown(event);
            }
        );


        canvas.addEventListener(
            "pointermove",
            event => {

                if (
                    state.mouse.draggingObject
                ) {

                    transformSelected(
                        event
                    );

                    return;
                }


                onPointerMove(event);
            }
        );


        window.addEventListener(
            "pointerup",
            event => {

                if (
                    state.mouse.draggingObject
                ) {

                    state.mouse.draggingObject =
                        false;

                    state.mouse.objectStart =
                        null;
                }


                onPointerUp(event);
            }
        );


        canvas.addEventListener(
            "wheel",
            handleWheel,
            {
                passive: false
            }
        );


        canvas.addEventListener(
            "contextmenu",
            event =>
                event.preventDefault()
        );
    }


    // ============================================================
    // ANIMATION
    // ============================================================

    let lastFrame =
        performance.now();


    function animate(now) {

        requestAnimationFrame(
            animate
        );


        const delta =
            Math.min(
                (
                    now -
                    lastFrame
                ) /
                1000,
                0.1
            );


        lastFrame = now;


        updateMovement(delta);


        if (
            renderer &&
            scene &&
            camera
        ) {

            renderer.render(
                scene,
                camera
            );
        }
    }


    // ============================================================
    // EXPLORER
    // ============================================================

    function getObjectIcon(type) {

        switch (type) {

            case "Part":
                return "■";

            case "SpawnLocation":
                return "◆";

            case "Model":
                return "◇";

            case "Folder":
                return "□";

            case "Script":
                return "⌘";

            default:
                return "■";
        }
    }


    function updateExplorer() {

        if (!workspaceChildren) {
            return;
        }


        workspaceChildren
            .querySelectorAll(
                "[data-generated-object]"
            )
            .forEach(
                element =>
                    element.remove()
            );


        for (
            const object
            of state.objects.values()
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "tree-item";


            item.dataset.objectId =
                object.id;


            item.dataset.objectType =
                object.type;


            item.dataset.generatedObject =
                "true";


            item.innerHTML = `
                <span class="tree-spacer"></span>

                <span class="tree-icon">
                    ${getObjectIcon(object.type)}
                </span>

                <span class="tree-name">
                    ${escapeHTML(object.name)}
                </span>
            `;


            item.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    selectObject(
                        object.id
                    );
                }
            );


            workspaceChildren.appendChild(
                item
            );
        }


        updateExplorerSelection();
    }


    function updateExplorerSelection() {

        document
            .querySelectorAll(
                "#workspaceChildren .tree-item"
            )
            .forEach(item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.objectId ===
                        state.selectedId
                );
            });
    }


    function setupExplorer() {

        document
            .querySelectorAll(
                "#explorerTree .tree-item"
            )
            .forEach(item => {

                const id =
                    item.dataset.objectId;


                if (!id) {
                    return;
                }


                item.addEventListener(
                    "click",
                    () => {

                        if (
                            state.objects.has(id)
                        ) {

                            selectObject(id);
                        }
                    }
                );
            });


        $("explorerSearch")
            ?.addEventListener(
                "input",
                event => {

                    const query =
                        event.target.value
                            .trim()
                            .toLowerCase();


                    document
                        .querySelectorAll(
                            "#workspaceChildren .tree-item"
                        )
                        .forEach(item => {

                            item.style.display =
                                !query ||
                                item.textContent
                                    .toLowerCase()
                                    .includes(query)
                                    ? ""
                                    : "none";
                        });
                }
            );
    }


    // ============================================================
    // PROPERTIES
    // ============================================================

    function setInput(id, value) {

        const input = $(id);


        if (input) {
            input.value = value;
        }
    }


    function setChecked(id, value) {

        const input = $(id);


        if (input) {
            input.checked =
                Boolean(value);
        }
    }


    function updateProperties() {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {

            noSelectionMessage
                ?.classList
                .remove("hidden");


            if (selectedObjectName) {

                selectedObjectName.textContent =
                    "Nothing selected";
            }


            if (selectedObjectType) {

                selectedObjectType.textContent =
                    "Select an object";
            }


            return;
        }


        noSelectionMessage
            ?.classList
            .add("hidden");


        if (selectedObjectName) {

            selectedObjectName.textContent =
                object.name;
        }


        if (selectedObjectType) {

            selectedObjectType.textContent =
                object.type;
        }


        if (selectedObjectIcon) {

            selectedObjectIcon.textContent =
                getObjectIcon(
                    object.type
                );
        }


        setInput(
            "positionX",
            object.position.x
        );


        setInput(
            "positionY",
            object.position.y
        );


        setInput(
            "positionZ",
            object.position.z
        );


        setInput(
            "rotationX",
            object.rotation.x
        );


        setInput(
            "rotationY",
            object.rotation.y
        );


        setInput(
            "rotationZ",
            object.rotation.z
        );


        setInput(
            "sizeX",
            object.size.x
        );


        setInput(
            "sizeY",
            object.size.y
        );


        setInput(
            "sizeZ",
            object.size.z
        );


        setInput(
            "objectColor",
            object.color
        );


        setInput(
            "objectMaterial",
            object.material
        );


        setChecked(
            "objectAnchored",
            object.anchored
        );


        setChecked(
            "objectCanCollide",
            object.canCollide
        );


        setChecked(
            "objectCastShadow",
            object.castShadow
        );


        const colorValue =
            $("objectColorValue");


        if (colorValue) {

            colorValue.textContent =
                object.color;
        }
    }


    function setObjectProperty(
        object,
        property,
        value
    ) {

        const parts =
            property.split(".");


        if (
            parts.length === 1
        ) {

            object[parts[0]] =
                value;

            return;
        }


        if (
            !object[parts[0]]
        ) {

            object[parts[0]] = {};
        }


        object[parts[0]][parts[1]] =
            value;
    }


    function setupProperties() {

        document
            .querySelectorAll(
                "[data-property]"
            )
            .forEach(input => {

                input.addEventListener(
                    "change",
                    () => {

                        const object =
                            state.objects.get(
                                state.selectedId
                            );


                        if (!object) {
                            return;
                        }


                        saveHistory();


                        const property =
                            input.dataset.property;


                        const value =
                            input.type ===
                            "checkbox"

                                ? input.checked

                                : input.type ===
                                  "number"

                                    ? Number(
                                        input.value
                                    )

                                    : input.value;


                        setObjectProperty(
                            object,
                            property,
                            value
                        );


                        updateMeshFromObject(
                            object
                        );


                        updateProperties();

                        updateExplorer();


                        state.game.saved =
                            false;


                        updateGameStatus();
                    }
                );
            });
    }


    // ============================================================
    // INSERT
    // ============================================================

    function insertObject(
        type = "Part"
    ) {

        saveHistory();


        const count =
            state.objects.size;


        const object =
            createObject({

                type,

                name:
                    type ===
                    "SpawnLocation"

                        ? "SpawnLocation"

                        : type,


                position: {

                    x:
                        snap(
                            count * 2
                        ),

                    y:
                        type ===
                        "SpawnLocation"
                            ? 1
                            : 0,

                    z: 0
                },


                size:
                    type === "Model"

                        ? {
                            x: 4,
                            y: 1,
                            z: 4
                        }

                        : {
                            x: 4,

                            y:
                                type ===
                                "SpawnLocation"
                                    ? 1
                                    : 1,

                            z: 4
                        },


                color:
                    type ===
                    "SpawnLocation"

                        ? "#22c55e"

                        : "#808080"
            });


        if (
            type === "Script"
        ) {

            object.script =
                "-- WebBlox Luau\n\n";
        }


        if (
            type === "Folder"
        ) {

            object.size = {
                x: 1,
                y: 1,
                z: 1
            };
        }


        renderObject(object);


        selectObject(
            object.id
        );


        updateExplorer();


        state.game.saved =
            false;


        updateGameStatus();


        log(
            `Created ${type} "${object.name}".`
        );


        return object;
    }


    // ============================================================
    // DELETE
    // ============================================================

    function deleteSelected() {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {
            return;
        }


        saveHistory();


        const mesh =
            meshes.get(object.id);


        if (mesh) {

            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }

            disposeMesh(mesh);

            meshes.delete(object.id);
        }


        state.objects.delete(
            object.id
        );


        state.selectedId =
            null;


        updateExplorer();

        updateProperties();


        state.game.saved =
            false;


        updateGameStatus();


        log(
            `Deleted "${object.name}".`
        );
    }


    // ============================================================
    // DUPLICATE
    // ============================================================

    function duplicateSelected() {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {
            return;
        }


        saveHistory();


        const duplicate =
            cloneObject(object);


        duplicate.id =
            makeId(
                object.type.toLowerCase()
            );


        duplicate.name =
            `${object.name} Copy`;


        duplicate.position.x += 2;

        duplicate.position.z += 2;


        state.objects.set(
            duplicate.id,
            duplicate
        );


        renderObject(
            duplicate
        );


        selectObject(
            duplicate.id
        );


        updateExplorer();


        state.game.saved =
            false;


        updateGameStatus();


        log(
            `Duplicated "${object.name}".`
        );
    }


    // ============================================================
    // RENAME
    // ============================================================

    function renameSelected() {

        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {
            return;
        }


        const newName =
            prompt(
                "Rename object:",
                object.name
            );


        if (
            newName === null ||
            !newName.trim()
        ) {
            return;
        }


        saveHistory();


        object.name =
            newName.trim();


        state.game.saved =
            false;


        updateExplorer();

        updateProperties();

        updateGameStatus();
    }


    // ============================================================
    // HISTORY
    // ============================================================

    function snapshot() {

        return {

            objects:
                Array.from(
                    state.objects.values()
                ).map(
                    cloneObject
                ),

            selectedId:
                state.selectedId,

            game:
                cloneObject(
                    state.game
                )
        };
    }


    function restoreSnapshot(data) {

        state.objects.clear();


        for (
            const object
            of data.objects
        ) {

            state.objects.set(
                object.id,
                object
            );
        }


        state.selectedId =
            data.selectedId;


        state.game =
            data.game;


        renderWorld();

        updateExplorer();

        updateProperties();

        updateGameStatus();
    }


    function saveHistory() {

        state.history.push(
            snapshot()
        );


        if (
            state.history.length >
            50
        ) {

            state.history.shift();
        }


        state.future = [];
    }


    function undo() {

        if (
            !state.history.length
        ) {
            return;
        }


        state.future.push(
            snapshot()
        );


        restoreSnapshot(
            state.history.pop()
        );


        log("Undo.");
    }


    function redo() {

        if (
            !state.future.length
        ) {
            return;
        }


        state.history.push(
            snapshot()
        );


        restoreSnapshot(
            state.future.pop()
        );


        log("Redo.");
    }


    // ============================================================
    // SAVE
    // ============================================================

    function getGameData() {

        return {

            version: 3,

            game:
                state.game,

            objects:
                Array.from(
                    state.objects.values()
                )
        };
    }


    function saveGame() {

        const data =
            getGameData();


        const blob =
            new Blob(
                [
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href = url;


        link.download =
            `${(
                state.game.name ||
                "WebBloxGame"
            )
                .replace(
                    /[^a-z0-9-_ ]/gi,
                    ""
                )
                .trim()
                .replace(
                    /\s+/g,
                    "_"
                )}.webblox.json`;


        document.body.appendChild(
            link
        );


        link.click();

        link.remove();


        URL.revokeObjectURL(
            url
        );


        state.game.saved =
            true;


        updateGameStatus();


        log(
            "Game saved."
        );


        showToast(
            "Game saved"
        );
    }


    // ============================================================
    // LOAD
    // ============================================================

    function loadGame() {

        const input =
            document.createElement(
                "input"
            );


        input.type = "file";


        input.accept =
            ".json,.webblox.json";


        input.addEventListener(
            "change",
            async () => {

                const file =
                    input.files?.[0];


                if (!file) {
                    return;
                }


                try {

                    const text =
                        await file.text();


                    const data =
                        JSON.parse(
                            text
                        );


                    if (
                        !Array.isArray(
                            data.objects
                        )
                    ) {

                        throw new Error(
                            "Invalid WebBlox game."
                        );
                    }


                    saveHistory();


                    state.objects.clear();


                    for (
                        const object
                        of data.objects
                    ) {

                        createObject(
                            object
                        );
                    }


                    if (
                        data.game
                    ) {

                        state.game = {
                            ...state.game,
                            ...data.game
                        };
                    }


                    state.selectedId =
                        null;


                    renderWorld();

                    updateExplorer();

                    updateProperties();

                    updateGameStatus();


                    log(
                        `Loaded ${file.name}.`
                    );


                    showToast(
                        "Game loaded"
                    );

                } catch (error) {

                    console.error(
                        error
                    );


                    log(
                        "Unable to load game file.",
                        "error"
                    );


                    showToast(
                        "Invalid game file"
                    );
                }
            }
        );


        input.click();
    }


    // ============================================================
    // MODALS
    // ============================================================

    function openModal(id) {

        $(id)
            ?.classList
            .remove("hidden");
    }


    function closeModal(id) {

        $(id)
            ?.classList
            .add("hidden");
    }


    // ============================================================
    // NEW GAME
    // ============================================================

    function createNewGame() {

        const nameInput =
            $("newGameName");


        const descriptionInput =
            $("newGameDescription");


        const name =
            nameInput?.value.trim();


        if (!name) {

            nameInput?.focus();


            showToast(
                "Game title is required."
            );


            return;
        }


        saveHistory();


        state.game = {

            name,

            description:
                descriptionInput?.value.trim() ||
                "",

            icon: "",

            saved: false
        };


        createDefaultWorld();


        renderWorld();

        updateExplorer();

        updateProperties();

        updateGameStatus();


        closeModal(
            "newGameModal"
        );


        log(
            `Created new game "${name}".`
        );


        showToast(
            "New game created"
        );
    }


    // ============================================================
    // PUBLISH
    // ============================================================

    function openPublishModal() {

        if (
            !state.game.name ||
            !state.game.name.trim() ||
            state.game.name ===
                "Untitled Game"
        ) {

            showToast(
                "Your game needs a title before it can be published."
            );


            openModal(
                "newGameModal"
            );


            $("newGameName")
                ?.focus();


            return;
        }


        const name =
            $("publishGameName");


        const description =
            $("publishGameDescription");


        if (name) {

            name.textContent =
                state.game.name;
        }


        if (description) {

            description.textContent =
                state.game.description ||
                "No description";
        }


        openModal(
            "publishModal"
        );
    }


    function publishGame() {

        const title =
            String(
                state.game.name || ""
            ).trim();


        if (!title) {

            closeModal(
                "publishModal"
            );


            showToast(
                "A game title is required."
            );


            return;
        }


        const gameData =
            getGameData();


        console.log(
            "[WebBlox] Publish payload:",
            gameData
        );


        state.game.saved =
            true;


        updateGameStatus();


        closeModal(
            "publishModal"
        );


        log(
            `Game "${title}" passed publish validation.`
        );


        log(
            "Online publishing connection will be added to the WebBlox backend."
        );


        showToast(
            "Game ready to publish"
        );
    }


    function updateGameStatus() {

        if (!gameStatus) {
            return;
        }


        gameStatus.textContent =
            state.game.saved
                ? "Saved"
                : "Unsaved";
    }


    // ============================================================
    // PLAY
    // ============================================================

    async function playGame() {

        if (
            state.playing
        ) {
            return;
        }


        if (
            !state.game.name ||
            state.game.name ===
                "Untitled Game"
        ) {

            showToast(
                "Create a game with a title first."
            );


            openModal(
                "newGameModal"
            );


            return;
        }


        state.playing = true;


        $("playButton")
            ?.setAttribute(
                "disabled",
                ""
            );


        $("stopButton")
            ?.removeAttribute(
                "disabled"
            );


        log(
            "Starting WebBlox Player runtime..."
        );


        try {

            /*
             * Load every Player dependency.
             */

            const Player =
                await loadPlayerRuntime();


            if (!Player) {

                throw new Error(
                    "Player runtime unavailable."
                );
            }


            /*
             * The actual WebBlox Player API
             * expects the THREE.Scene directly.
             *
             * NOT:
             *
             * Player.start({
             *     scene,
             *     camera,
             *     ...
             * })
             *
             * It expects:
             *
             * Player.start(scene)
             */

            if (!scene) {

                throw new Error(
                    "Studio scene is unavailable."
                );
            }


            log(
                "Starting Player with Studio scene..."
            );


            const result =
                Player.start(
                    scene
                );


            /*
             * Player.start is currently
             * synchronous, but support a
             * Promise if the runtime becomes
             * asynchronous later.
             */

            if (
                result &&
                typeof result.then ===
                    "function"
            ) {

                await result;
            }


            /*
             * Verify that the runtime really
             * started and a character exists.
             */

            if (
                typeof Player.isRunning ===
                    "function" &&
                !Player.isRunning()
            ) {

                throw new Error(
                    "Player runtime did not enter the running state."
                );
            }


            const character =
                typeof Player.getCharacter ===
                    "function"

                    ? Player.getCharacter()

                    : null;


            if (!character) {

                throw new Error(
                    "Player runtime started but did not create a character. Check character.js loading."
                );
            }


            /*
             * Make sure the character is actually
             * in Studio's scene.
             */

            if (
                character.parent !==
                scene
            ) {

                scene.add(
                    character
                );
            }


            log(
                "Player runtime started."
            );


            log(
                "Player character spawned."
            );


            log(
                "R15 character initialized."
            );


            log(
                "Bacon hair initialized."
            );


            showToast(
                "Play mode started"
            );

        } catch (error) {

            console.error(
                "[WebBlox] Player startup failed:",
                error
            );


            state.playing =
                false;


            $("playButton")
                ?.removeAttribute(
                    "disabled"
                );


            $("stopButton")
                ?.setAttribute(
                    "disabled",
                    ""
                );


            log(
                `Player system failed to load: ${error.message}`,
                "error"
            );


            showToast(
                "Player system failed to load"
            );
        }
    }


    async function stopGame() {

        if (
            !state.playing
        ) {
            return;
        }


        try {

            if (
                window.WebBloxPlayer &&
                typeof
                    window.WebBloxPlayer.stop ===
                    "function"
            ) {

                const result =
                    window.WebBloxPlayer.stop();


                if (
                    result &&
                    typeof result.then ===
                        "function"
                ) {

                    await result;
                }
            }

        } catch (error) {

            console.error(
                "[WebBlox] Player stop failed:",
                error
            );


            log(
                `Player stop error: ${error.message}`,
                "error"
            );
        }


        state.playing =
            false;


        $("playButton")
            ?.removeAttribute(
                "disabled"
            );


        $("stopButton")
            ?.setAttribute(
                "disabled",
                ""
            );


        log(
            "Player runtime stopped."
        );


        showToast(
            "Play mode stopped"
        );
    }


    // ============================================================
    // TOOLS
    // ============================================================

    function setTool(tool) {

        state.tool =
            tool;


        const ids = {

            select:
                "selectTool",

            move:
                "moveTool",

            scale:
                "scaleTool",

            rotate:
                "rotateTool"
        };


        Object.values(ids)
            .forEach(id => {

                $(id)
                    ?.classList
                    .remove(
                        "active"
                    );
            });


        $(ids[tool])
            ?.classList
            .add("active");


        if (viewportMode) {

            viewportMode.textContent =
                tool
                    .charAt(0)
                    .toUpperCase() +
                tool.slice(1);
        }


        if (canvas) {

            canvas.style.cursor =
                tool === "select"
                    ? "default"
                    : "crosshair";
        }
    }


    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================

    function setupKeyboard() {

        window.addEventListener(
            "keydown",
            event => {

                const key =
                    event.key.toLowerCase();


                const typing =
                    document.activeElement &&
                    (
                        document.activeElement.tagName ===
                            "INPUT" ||

                        document.activeElement.tagName ===
                            "TEXTAREA" ||

                        document.activeElement.tagName ===
                            "SELECT"
                    );


                /*
                 * Always remember keys.
                 *
                 * This allows RMB + WASD to work.
                 */

                state.keys.add(key);


                /*
                 * Never use Studio shortcuts while
                 * typing into a field.
                 */

                if (typing) {
                    return;
                }


                // ------------------------------------------------
                // CTRL + Z
                // ------------------------------------------------

                if (
                    event.ctrlKey &&
                    key === "z"
                ) {

                    event.preventDefault();


                    if (
                        event.shiftKey
                    ) {

                        redo();

                    } else {

                        undo();
                    }


                    return;
                }


                // ------------------------------------------------
                // CTRL + Y
                // ------------------------------------------------

                if (
                    event.ctrlKey &&
                    key === "y"
                ) {

                    event.preventDefault();

                    redo();

                    return;
                }


                // ------------------------------------------------
                // CTRL + D
                // ------------------------------------------------

                if (
                    event.ctrlKey &&
                    key === "d"
                ) {

                    event.preventDefault();

                    duplicateSelected();

                    return;
                }


                // ------------------------------------------------
                // DELETE
                // ------------------------------------------------

                if (
                    event.key === "Delete"
                ) {

                    event.preventDefault();

                    deleteSelected();

                    return;
                }


                // ------------------------------------------------
                // ESCAPE
                // ------------------------------------------------

                if (
                    event.key === "Escape"
                ) {

                    event.preventDefault();

                    clearSelection();


                    state.mouse.draggingObject =
                        false;


                    return;
                }


                /*
                 * Q/W/E/R are Studio tools.
                 *
                 * They only switch tools when
                 * RMB is NOT currently held.
                 *
                 * This prevents W from fighting
                 * with RMB + W camera movement.
                 */

                if (
                    !state.mouse.down
                ) {

                    if (
                        key === "q"
                    ) {

                        setTool(
                            "select"
                        );

                        return;
                    }


                    if (
                        key === "w"
                    ) {

                        setTool(
                            "move"
                        );

                        return;
                    }


                    if (
                        key === "e"
                    ) {

                        setTool(
                            "rotate"
                        );

                        return;
                    }


                    if (
                        key === "r"
                    ) {

                        setTool(
                            "scale"
                        );

                        return;
                    }


                    if (
                        key === "f"
                    ) {

                        event.preventDefault();

                        focusSelected();

                        return;
                    }
                }
            }
        );


        window.addEventListener(
            "keyup",
            event => {

                state.keys.delete(
                    event.key.toLowerCase()
                );
            }
        );


        window.addEventListener(
            "blur",
            () => {

                state.keys.clear();

                state.mouse.down =
                    false;

                state.mouse.button =
                    0;

                state.mouse.draggingObject =
                    false;
            }
        );
    }


    // ============================================================
    // BUTTONS
    // ============================================================

    function setupButtons() {

        $("newGameButton")
            ?.addEventListener(
                "click",
                () =>
                    openModal(
                        "newGameModal"
                    )
            );


        $("openGameButton")
            ?.addEventListener(
                "click",
                loadGame
            );


        $("saveGameButton")
            ?.addEventListener(
                "click",
                saveGame
            );


        $("undoButton")
            ?.addEventListener(
                "click",
                undo
            );


        $("redoButton")
            ?.addEventListener(
                "click",
                redo
            );


        $("playButton")
            ?.addEventListener(
                "click",
                playGame
            );


        $("stopButton")
            ?.addEventListener(
                "click",
                stopGame
            );


        // --------------------------------------------------------
        // TOOLS
        // --------------------------------------------------------

        $("selectTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool(
                        "select"
                    )
            );


        $("moveTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool(
                        "move"
                    )
            );


        $("scaleTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool(
                        "scale"
                    )
            );


        $("rotateTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool(
                        "rotate"
                    )
            );


        // --------------------------------------------------------
        // GRID
        // --------------------------------------------------------

        $("gridButton")
            ?.addEventListener(
                "click",
                () => {

                    state.gridEnabled =
                        !state.gridEnabled;


                    $("gridButton")
                        ?.classList
                        .toggle(
                            "active",
                            state.gridEnabled
                        );


                    updateGrid();
                }
            );


        // --------------------------------------------------------
        // SNAP
        // --------------------------------------------------------

        $("snapButton")
            ?.addEventListener(
                "click",
                () => {

                    state.snapEnabled =
                        !state.snapEnabled;


                    $("snapButton")
                        ?.classList
                        .toggle(
                            "active",
                            state.snapEnabled
                        );
                }
            );


        // --------------------------------------------------------
        // CAMERA
        // --------------------------------------------------------

        $("cameraReset")
            ?.addEventListener(
                "click",
                resetCamera
            );


        $("cameraZoomIn")
            ?.addEventListener(
                "click",
                () => {

                    state.camera.distance =
                        clamp(
                            state.camera.distance -
                                2,

                            state.camera.minDistance,

                            state.camera.maxDistance
                        );


                    updateCamera();
                }
            );


        $("cameraZoomOut")
            ?.addEventListener(
                "click",
                () => {

                    state.camera.distance =
                        clamp(
                            state.camera.distance +
                                2,

                            state.camera.minDistance,

                            state.camera.maxDistance
                        );


                    updateCamera();
                }
            );


        // --------------------------------------------------------
        // ADD OBJECT
        // --------------------------------------------------------

        $("addObjectButton")
            ?.addEventListener(
                "click",
                () => {

                    $("addObjectMenu")
                        ?.classList
                        .toggle(
                            "hidden"
                        );
                }
            );


        document
            .querySelectorAll(
                "[data-create-object]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        insertObject(
                            button.dataset
                                .createObject
                        );


                        $("addObjectMenu")
                            ?.classList
                            .add(
                                "hidden"
                            );
                    }
                );
            });


        // --------------------------------------------------------
        // REFRESH EXPLORER
        // --------------------------------------------------------

        $("refreshExplorerButton")
            ?.addEventListener(
                "click",
                () => {

                    updateExplorer();


                    showToast(
                        "Explorer refreshed"
                    );
                }
            );


        // --------------------------------------------------------
        // WELCOME ADD PART
        // --------------------------------------------------------

        $("welcomeAddPart")
            ?.addEventListener(
                "click",
                () =>
                    insertObject(
                        "Part"
                    )
            );


        // --------------------------------------------------------
        // OUTPUT
        // --------------------------------------------------------

        $("clearOutputButton")
            ?.addEventListener(
                "click",
                () => {

                    if (
                        outputConsole
                    ) {

                        outputConsole.innerHTML =
                            "";
                    }
                }
            );


        $("toggleOutputButton")
            ?.addEventListener(
                "click",
                () => {

                    $("outputPanel")
                        ?.classList
                        .toggle(
                            "collapsed"
                        );
                }
            );


        // --------------------------------------------------------
        // MODALS
        // --------------------------------------------------------

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            button.dataset
                                .closeModal
                        )
                );
            });


        $("createGameConfirm")
            ?.addEventListener(
                "click",
                createNewGame
            );


        $("publishConfirmButton")
            ?.addEventListener(
                "click",
                publishGame
            );


        // --------------------------------------------------------
        // ACTIONS
        // --------------------------------------------------------

        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        handleAction(
                            button.dataset
                                .action
                        );


                        closeMenus();
                    }
                );
            });


        // --------------------------------------------------------
        // PROPERTY SEARCH
        // --------------------------------------------------------

        $("propertySearchButton")
            ?.addEventListener(
                "click",
                () => {

                    $("propertySearch")
                        ?.classList
                        .toggle(
                            "hidden"
                        );
                }
            );


        $("propertySearchInput")
            ?.addEventListener(
                "input",
                event => {

                    const query =
                        event.target.value
                            .trim()
                            .toLowerCase();


                    document
                        .querySelectorAll(
                            "[data-property-section]"
                        )
                        .forEach(section => {

                            section.style.display =
                                !query ||
                                section.textContent
                                    .toLowerCase()
                                    .includes(
                                        query
                                    )
                                    ? ""
                                    : "none";
                        });
                }
            );


        setupContextMenu();
    }


    // ============================================================
    // MENUS
    // ============================================================

    function closeMenus() {

        document
            .querySelectorAll(
                ".dropdown-menu, .floating-menu"
            )
            .forEach(
                menu =>
                    menu.classList.add(
                        "hidden"
                    )
            );
    }


    function toggleMenu(id) {

        const menu = $(id);


        if (!menu) {
            return;
        }


        const hidden =
            menu.classList.contains(
                "hidden"
            );


        closeMenus();


        if (hidden) {

            menu.classList.remove(
                "hidden"
            );
        }
    }


    // ============================================================
    // ACTION HANDLER
    // ============================================================

    function handleAction(action) {

        switch (action) {

            case "new":

                openModal(
                    "newGameModal"
                );

                break;


            case "open":

                loadGame();

                break;


            case "save":

                saveGame();

                break;


            case "publish":

                openPublishModal();

                break;


            case "undo":

                undo();

                break;


            case "redo":

                redo();

                break;


            case "duplicate":

                duplicateSelected();

                break;


            case "delete":

                deleteSelected();

                break;


            case "toggleExplorer":

                explorerPanel
                    ?.classList
                    .toggle(
                        "hidden"
                    );

                break;


            case "toggleProperties":

                propertiesPanel
                    ?.classList
                    .toggle(
                        "hidden"
                    );

                break;


            case "toggleOutput":

                $("outputPanel")
                    ?.classList
                    .toggle(
                        "collapsed"
                    );

                break;


            case "insertPart":

                insertObject(
                    "Part"
                );

                break;


            case "insertSpawn":

                insertObject(
                    "SpawnLocation"
                );

                break;


            case "insertModel":

                insertObject(
                    "Model"
                );

                break;


            case "play":

                playGame();

                break;


            case "stop":

                stopGame();

                break;


            case "testHere":

                playGame();

                break;
        }
    }


    // ============================================================
    // CONTEXT MENU
    // ============================================================

    function setupContextMenu() {

        const menu =
            $("contextMenu");


        if (!menu) {
            return;
        }


        document.addEventListener(
            "contextmenu",
            event => {

                const element =
                    event.target.closest(
                        ".tree-item"
                    );


                if (!element) {
                    return;
                }


                const id =
                    element.dataset.objectId;


                if (
                    !state.objects.has(id)
                ) {
                    return;
                }


                event.preventDefault();


                selectObject(id);


                menu.classList.remove(
                    "hidden"
                );


                menu.style.left =
                    `${event.clientX}px`;


                menu.style.top =
                    `${event.clientY}px`;
            }
        );


        document.addEventListener(
            "click",
            () => {

                menu.classList.add(
                    "hidden"
                );
            }
        );


        menu.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                const button =
                    event.target.closest(
                        "[data-context-action]"
                    );


                if (!button) {
                    return;
                }


                switch (
                    button.dataset
                        .contextAction
                ) {

                    case "duplicate":

                        duplicateSelected();

                        break;


                    case "rename":

                        renameSelected();

                        break;


                    case "delete":

                        deleteSelected();

                        break;
                }


                menu.classList.add(
                    "hidden"
                );
            }
        );
    }


    // ============================================================
    // MENU BUTTONS
    // ============================================================

    function setupMenuButtons() {

        $("fileMenuButton")
            ?.addEventListener(
                "click",
                () =>
                    toggleMenu(
                        "fileMenu"
                    )
            );


        $("editMenuButton")
            ?.addEventListener(
                "click",
                () =>
                    toggleMenu(
                        "editMenu"
                    )
            );


        $("viewMenuButton")
            ?.addEventListener(
                "click",
                () =>
                    toggleMenu(
                        "viewMenu"
                    )
            );


        $("modelMenuButton")
            ?.addEventListener(
                "click",
                () =>
                    toggleMenu(
                        "modelMenu"
                    )
            );


        $("testMenuButton")
            ?.addEventListener(
                "click",
                () =>
                    toggleMenu(
                        "testMenu"
                    )
            );
    }


    // ============================================================
    // INITIALIZE 3D
    // ============================================================

    async function initialize3D() {

        if (!viewport) {

            throw new Error(
                "Viewport element not found."
            );
        }


        await loadThree();


        scene =
            new THREE.Scene();


        scene.background =
            new THREE.Color(
                "#171717"
            );


        camera =
            new THREE.PerspectiveCamera(
                60,
                1,
                0.1,
                2000
            );


        renderer =
            new THREE.WebGLRenderer({
                antialias: true,
                alpha: false
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio ||
                    1,

                2
            )
        );


        renderer.shadowMap.enabled =
            true;


        renderer.shadowMap.type =
            THREE.PCFSoftShadowMap;


        renderer.outputColorSpace =
            THREE.SRGBColorSpace;


        canvas =
            renderer.domElement;


        canvas.id =
            "webblox3DCanvas";


        canvas.style.position =
            "absolute";


        canvas.style.inset =
            "0";


        canvas.style.width =
            "100%";


        canvas.style.height =
            "100%";


        canvas.style.display =
            "block";


        canvas.style.zIndex =
            "20";


        viewport.appendChild(
            canvas
        );


        // --------------------------------------------------------
        // LIGHTING
        // --------------------------------------------------------

        ambientLight =
            new THREE.HemisphereLight(
                0xffffff,
                0x333333,
                1.8
            );


        scene.add(
            ambientLight
        );


        directionalLight =
            new THREE.DirectionalLight(
                0xffffff,
                2.5
            );


        directionalLight.position.set(
            25,
            40,
            20
        );


        directionalLight.castShadow =
            true;


        directionalLight.shadow.mapSize.width =
            2048;


        directionalLight.shadow.mapSize.height =
            2048;


        scene.add(
            directionalLight
        );


        // --------------------------------------------------------
        // RAYCASTING
        // --------------------------------------------------------

        raycaster =
            new THREE.Raycaster();


        mouseVector =
            new THREE.Vector2();


        threeReady =
            true;


        createGrid();


        setup3DInput();


        resizeRenderer();


        window.addEventListener(
            "resize",
            resizeRenderer
        );


        renderWorld();


        updateCamera();


        animate(
            performance.now()
        );


        log(
            "Real 3D WebGL viewport initialized."
        );


        log(
            "Q = Select | W = Move | E = Rotate | R = Scale"
        );


        log(
            "F = Focus selected object."
        );


        log(
            "RMB + WASD = camera movement."
        );


        log(
            "RMB drag = camera rotation."
        );


        log(
            "Mouse wheel = zoom."
        );
    }


    function resizeRenderer() {

        if (
            !renderer ||
            !camera ||
            !viewport
        ) {
            return;
        }


        const width =
            viewport.clientWidth;


        const height =
            viewport.clientHeight;


        if (
            width <= 0 ||
            height <= 0
        ) {
            return;
        }


        renderer.setSize(
            width,
            height,
            false
        );


        camera.aspect =
            width / height;


        camera.updateProjectionMatrix();
    }


    // ============================================================
    // REMOVE OLD VIEWPORT
    // ============================================================

    function removeOldViewport() {

        [
            $("viewportWelcome"),
            $("defaultPart"),
            $("world")
        ].forEach(element => {

            if (!element) {
                return;
            }


            element.style.display =
                "none";


            element.style.visibility =
                "hidden";


            element.style.pointerEvents =
                "none";
        });


        if (selectionBox) {

            selectionBox.style.display =
                "none";
        }


        const crosshair =
            $("viewportCrosshair");


        if (crosshair) {

            crosshair.style.zIndex =
                "30";


            crosshair.style.pointerEvents =
                "none";
        }
    }


    // ============================================================
    // INITIALIZE
    // ============================================================

    async function initialize() {

        console.log(
            "[WebBlox Studio] Starting..."
        );


        removeOldViewport();


        createDefaultWorld();


        setupKeyboard();

        setupExplorer();

        setupProperties();

        setupButtons();

        setupMenuButtons();


        updateExplorer();

        updateProperties();

        updateGameStatus();


        if (viewportMode) {

            viewportMode.textContent =
                "Perspective";
        }


        try {

            await initialize3D();


            removeOldViewport();


            updateCamera();


            updateExplorer();

            updateProperties();


            log(
                "WebBlox Studio ready."
            );


            console.log(
                "[WebBlox Studio] Ready."
            );

        } catch (error) {

            console.error(
                "[WebBlox Studio] Initialization failed:",
                error
            );


            log(
                `Studio initialization failed: ${error.message}`,
                "error"
            );
        }


        const loading =
            $("studioLoading");


        if (loading) {

            const progress =
                $("loadingProgress");


            if (progress) {

                progress.style.width =
                    "100%";
            }


            setTimeout(
                () => {

                    loading.classList.add(
                        "hidden"
                    );

                },
                350
            );
        }
    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    /*
     * Player/player.js can access:
     *
     * window.WebBloxStudio.state
     *
     * The getters below also expose the real
     * Three.js runtime objects.
     */

    window.WebBloxStudio = {

        state,

        get scene() {
            return scene;
        },

        get camera() {
            return camera;
        },

        get renderer() {
            return renderer;
        },

        get canvas() {
            return canvas;
        },

        createObject,

        insertObject,

        selectObject,

        clearSelection,

        deleteSelected,

        duplicateSelected,

        renameSelected,

        undo,

        redo,

        saveGame,

        loadGame,

        playGame,

        stopGame,

        resetCamera,

        focusSelected,

        setTool,

        renderWorld,

        publishGame,

        getGameData
    };


    // ============================================================
    // START
    // ============================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();
```
