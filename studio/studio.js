

/*
 * WebBlox Studio
 * Stage 3A
 *
 * COMPLETE STUDIO CONTROLLER
 *
 * IMPORTANT:
 * - This file is safe to load on GitHub Pages.
 * - The Studio loading screen can NEVER remain stuck forever.
 * - Player runtime failure does NOT prevent Studio from opening.
 * - Player runtime is loaded only when Play is pressed.
 * - Uses a reliable path to /Player/player.js.
 *
 * Controls:
 * Q = Select
 * W = Move
 * E = Rotate
 * R = Scale
 * F = Focus
 *
 * RMB + WASD = Camera movement
 * RMB drag = Camera rotation
 * Mouse wheel = Zoom
 *
 * Ctrl+D = Duplicate
 * Delete = Delete
 * Ctrl+Z = Undo
 * Ctrl+Y / Ctrl+Shift+Z = Redo
 * Escape = Clear selection
 *
 * FILE:
 * studio/studio.js
 */

(() => {
    "use strict";

    console.log("[WebBlox Studio] Loading studio.js");

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
            saved: false,

            /*
             * Dev-configurable defaults applied to every
             * player when the game runs — edited via the
             * StarterPlayer node in the Explorer, read by
             * Player/player.js at Play/Publish time.
             */
            starterPlayer: {
                walkSpeed: 12,
                jumpPower: 11,
                firstPersonLocked: false,
                allowZoom: true,
                hotkeysEnabled: true,
                scriptable: true
            }
        },

        playing: false,

        studioReady: false,

        playerAvailable: false
    };


    // ============================================================
    // DOM HELPERS
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
    // GENERAL HELPERS
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


    function cloneObject(object) {
        return JSON.parse(
            JSON.stringify(object)
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


    function log(message, type = "info") {

        console.log(
            `[WebBlox Studio] ${message}`
        );

        if (!outputConsole) {
            return;
        }

        const line =
            document.createElement("div");

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

        const container =
            $("toastContainer");

        if (!container) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className = "toast";

        toast.textContent =
            message;

        container.appendChild(toast);

        setTimeout(() => {

            toast.classList.add(
                "toast-hide"
            );

            setTimeout(
                () => toast.remove(),
                250
            );

        }, 2500);
    }


    // ============================================================
    // LOADING SCREEN FAILSAFE
    // ============================================================

    let loadingScreenFinished = false;

    function finishLoadingScreen() {

        if (loadingScreenFinished) {
            return;
        }

        loadingScreenFinished = true;

        const loading =
            $("studioLoading");

        if (!loading) {
            return;
        }

        const progress =
            $("loadingProgress");

        if (progress) {
            progress.style.width =
                "100%";
        }

        loading.classList.add(
            "hidden"
        );

        /*
         * Extra protection in case CSS
         * does not contain .hidden.
         */

        setTimeout(() => {

            if (!loading) {
                return;
            }

            loading.style.display =
                "none";

            loading.style.visibility =
                "hidden";

            loading.style.pointerEvents =
                "none";

        }, 500);
    }


    /*
     * ABSOLUTE FAILSAFE.
     *
     * Even if something crashes before initialize()
     * finishes, Studio will not be permanently trapped
     * behind the loading screen.
     */

    setTimeout(() => {

        if (!loadingScreenFinished) {

            console.warn(
                "[WebBlox Studio] Loading timeout reached. Forcing editor open."
            );

            log(
                "Studio startup timeout. Opening editor in safe mode.",
                "error"
            );

            finishLoadingScreen();
        }

    }, 8000);


    // ============================================================
    // REMOVE OLD / FAKE VIEWPORT
    // ============================================================

    function removeOldViewport() {

        [
            $("world"),
            $("viewportWelcome"),
            $("defaultPart")
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
    // THREE.JS
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


    /*
     * Try several sources in order — a single CDN can be
     * blocked by an ad-blocker, a corporate proxy, or just
     * be temporarily down. Each one is a plain UMD build so
     * it always exposes window.THREE the same way.
     */
    const THREE_SOURCES = [
        "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
        "https://unpkg.com/three@0.160.0/build/three.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js",
        "https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"
    ];

    const THREE_LOAD_TIMEOUT_MS = 4000;


    function loadScriptOnce(url, timeoutMs) {

        return new Promise((resolve, reject) => {

            const script =
                document.createElement("script");

            script.src = url;

            let settled = false;

            const timer =
                setTimeout(
                    () => {

                        if (settled) {
                            return;
                        }

                        settled = true;

                        script.remove();

                        reject(
                            new Error(
                                `Timed out loading ${url}`
                            )
                        );
                    },
                    timeoutMs
                );

            script.onload = () => {

                if (settled) {
                    return;
                }

                settled = true;

                clearTimeout(timer);

                resolve();
            };

            script.onerror = () => {

                if (settled) {
                    return;
                }

                settled = true;

                clearTimeout(timer);

                script.remove();

                reject(
                    new Error(
                        `Failed to load ${url}`
                    )
                );
            };

            document.head.appendChild(
                script
            );
        });
    }


    async function loadThree() {

        if (window.THREE) {

            THREE =
                window.THREE;

            return THREE;
        }

        const existing =
            document.querySelector(
                "script[data-webblox-three]"
            );

        if (existing) {

            /*
             * Something already tried (maybe a previous
             * initialize() run). Wait on it rather than
             * starting a duplicate load.
             */

            if (
                existing.dataset.loaded === "true" &&
                window.THREE
            ) {

                THREE =
                    window.THREE;

                return THREE;
            }

            await new Promise((resolve, reject) => {

                existing.addEventListener(
                    "load",
                    resolve,
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
            });

            if (window.THREE) {

                THREE =
                    window.THREE;

                return THREE;
            }

            throw new Error(
                "Three.js loaded but window.THREE is unavailable."
            );
        }

        let lastError = null;

        for (
            const url
            of THREE_SOURCES
        ) {

            try {

                log(
                    `Loading Three.js from ${url}`
                );

                await loadScriptOnce(
                    url,
                    THREE_LOAD_TIMEOUT_MS
                );

                if (window.THREE) {

                    THREE =
                        window.THREE;

                    const marker =
                        document.createElement("script");

                    marker.dataset.webbloxThree =
                        "true";

                    marker.dataset.loaded =
                        "true";

                    document.head.appendChild(
                        marker
                    );

                    return THREE;
                }

                lastError =
                    new Error(
                        `${url} loaded but window.THREE was not created.`
                    );

            } catch (error) {

                lastError = error;

                log(
                    `Three.js source failed (${url}): ${error.message}`
                );
            }
        }

        throw (
            lastError ||
            new Error(
                "Unable to load Three.js from any source."
            )
        );
    }


    // ============================================================
    // PLAYER RUNTIME
    // ============================================================

    /*
     * IMPORTANT:
     *
     * We do NOT load Player during Studio startup.
     *
     * This was one of the main reasons Studio could become
     * trapped during loading.
     *
     * Player is loaded only when Play is pressed.
     */

    function getPlayerPath() {

        /*
         * studio.js is expected at:
         *
         * /WebBlox/studio/studio.js
         *
         * Player should be:
         *
         * /WebBlox/Player/player.js
         *
         * Therefore:
         *
         * ../Player/player.js
         *
         * is correct when studio.html is inside /studio/.
         */

        try {

            return new URL(
                "../Player/player.js",
                document.baseURI
            ).href;

        } catch {

            return "../Player/player.js";
        }
    }


    function loadPlayerRuntime() {

        return new Promise((resolve, reject) => {

            if (
                window.WebBloxPlayer &&
                typeof window.WebBloxPlayer.start ===
                    "function"
            ) {

                state.playerAvailable =
                    true;

                resolve(
                    window.WebBloxPlayer
                );

                return;
            }


            const playerPath =
                getPlayerPath();

            log(
                `Loading Player runtime: ${playerPath}`
            );


            const existing =
                document.querySelector(
                    "script[data-webblox-player]"
                );

            if (existing) {

                const finish =
                    () => {

                        if (
                            window.WebBloxPlayer &&
                            typeof window.WebBloxPlayer.start ===
                                "function"
                        ) {

                            state.playerAvailable =
                                true;

                            resolve(
                                window.WebBloxPlayer
                            );

                        } else {

                            reject(
                                new Error(
                                    "player.js loaded but WebBloxPlayer.start was not found."
                                )
                            );
                        }
                    };


                if (
                    existing.dataset.loaded ===
                    "true"
                ) {

                    finish();

                    return;
                }


                existing.addEventListener(
                    "load",
                    finish,
                    { once: true }
                );

                existing.addEventListener(
                    "error",
                    () => {

                        reject(
                            new Error(
                                "Player/player.js failed to load."
                            )
                        );

                    },
                    { once: true }
                );

                return;
            }


            const script =
                document.createElement("script");

            script.src =
                playerPath;

            script.dataset.webbloxPlayer =
                "true";

            script.async =
                false;


            script.onload = () => {

                script.dataset.loaded =
                    "true";

                if (
                    window.WebBloxPlayer &&
                    typeof window.WebBloxPlayer.start ===
                        "function"
                ) {

                    state.playerAvailable =
                        true;

                    log(
                        "Player runtime loaded."
                    );

                    resolve(
                        window.WebBloxPlayer
                    );

                } else {

                    reject(
                        new Error(
                            "player.js loaded but WebBloxPlayer.start was not created."
                        )
                    );
                }
            };


            script.onerror = () => {

                reject(
                    new Error(
                        `Could not load Player runtime: ${playerPath}`
                    )
                );
            };


            document.head.appendChild(
                script
            );
        });
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

                x:
                    Number(
                        data.position?.x ??
                        0
                    ),

                y:
                    Number(
                        data.position?.y ??
                        0
                    ),

                z:
                    Number(
                        data.position?.z ??
                        0
                    )
            },

            rotation: {

                x:
                    Number(
                        data.rotation?.x ??
                        0
                    ),

                y:
                    Number(
                        data.rotation?.y ??
                        0
                    ),

                z:
                    Number(
                        data.rotation?.z ??
                        0
                    )
            },

            size: {

                x:
                    Number(
                        data.size?.x ??
                        4
                    ),

                y:
                    Number(
                        data.size?.y ??
                        1
                    ),

                z:
                    Number(
                        data.size?.z ??
                        4
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
                data.script ||
                ""
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


        state.selectedId =
            null;
    }


    // ============================================================
    // MATERIALS
    // ============================================================

    function getMaterial(object) {

        const params = {

            color:
                new THREE.Color(
                    object.color ||
                    "#808080"
                ),

            roughness:
                0.8,

            metalness:
                0
        };


        switch (
            object.material
        ) {

            case "SmoothPlastic":

                params.roughness =
                    0.35;

                break;


            case "Metal":

                params.roughness =
                    0.25;

                params.metalness =
                    0.85;

                break;


            case "Glass":

                params.transparent =
                    true;

                params.opacity =
                    0.45;

                params.roughness =
                    0.1;

                break;


            case "Wood":

                params.roughness =
                    0.9;

                break;


            case "Concrete":

                params.roughness =
                    1;

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

                    Math.max(
                        0.01,
                        object.size.x
                    ),

                    Math.max(
                        0.01,
                        object.size.y
                    ),

                    Math.max(
                        0.01,
                        object.size.z
                    )
                );


            const material =
                getMaterial(
                    object
                );


            root =
                new THREE.Mesh(
                    geometry,
                    material
                );


            root.castShadow =
                object.castShadow;

            root.receiveShadow =
                true;


            if (
                object.type ===
                "SpawnLocation"
            ) {

                const arrowMaterial =
                    new THREE.MeshStandardMaterial({
                        color:
                            "#22c55e",

                        roughness:
                            0.45
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
                    object.size.y /
                        2 +
                    0.8;


                arrow.rotation.x =
                    Math.PI;


                root.add(
                    arrow
                );
            }
        }


        else if (
            object.type ===
            "Model"
        ) {

            root =
                new THREE.Group();


            const material =
                getMaterial(
                    object
                );


            const body =
                new THREE.Mesh(

                    new THREE.BoxGeometry(
                        2.5,
                        3,
                        1.5
                    ),

                    material
                );


            body.position.y =
                1.5;

            body.castShadow =
                true;


            root.add(
                body
            );


            const head =
                new THREE.Mesh(

                    new THREE.BoxGeometry(
                        1.7,
                        1.7,
                        1.7
                    ),

                    material
                );


            head.position.y =
                3.9;

            head.castShadow =
                true;


            root.add(
                head
            );
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
            object.type ===
            "Model"
        ) {

            root.scale.set(

                object.size.x /
                    4,

                object.size.y,

                object.size.z /
                    4
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


        mesh.traverse(
            child => {

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
    // RENDER OBJECT
    // ============================================================

    function renderObject(object) {

        if (!threeReady) {
            return;
        }


        const old =
            meshes.get(
                object.id
            );


        if (old) {

            if (old.parent) {

                old.parent.remove(
                    old
                );
            }

            disposeMesh(
                old
            );

            meshes.delete(
                object.id
            );
        }


        const mesh =
            createMeshForObject(
                object
            );


        if (!mesh) {
            return;
        }


        scene.add(
            mesh
        );


        meshes.set(
            object.id,
            mesh
        );


        updateMeshSelection(
            object
        );
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

                mesh.parent.remove(
                    mesh
                );
            }

            disposeMesh(
                mesh
            );
        }


        meshes.clear();


        for (
            const object
            of state.objects.values()
        ) {

            renderObject(
                object
            );
        }


        updateSelectionVisual();

        updateGrid();

        updateCameraStatus();
    }


    function updateMeshFromObject(object) {

        const mesh =
            meshes.get(
                object.id
            );


        if (!mesh) {

            renderObject(
                object
            );

            return;
        }


        if (
            object.type === "Part" ||
            object.type ===
                "SpawnLocation"
        ) {

            /*
             * Rebuild because size/material/color
             * may have changed.
             */

            renderObject(
                object
            );

            return;
        }


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


        if (
            object.type ===
            "Model"
        ) {

            mesh.scale.set(

                object.size.x /
                    4,

                object.size.y,

                object.size.z /
                    4
            );
        }


        updateMeshSelection(
            object
        );
    }


    // ============================================================
    // SELECTION
    // ============================================================

    function updateMeshSelection(object) {

        const mesh =
            meshes.get(
                object.id
            );


        if (!mesh) {
            return;
        }


        mesh.traverse(
            child => {

                if (
                    !child.isMesh ||
                    !child.material
                ) {
                    return;
                }


                const materials =
                    Array.isArray(
                        child.material
                    )
                        ? child.material
                        : [
                            child.material
                        ];


                materials.forEach(
                    material => {

                        if (
                            !material.emissive
                        ) {
                            return;
                        }


                        material.emissive =
                            new THREE.Color(
                                state.selectedId ===
                                    object.id
                                    ? "#3b82f6"
                                    : "#000000"
                            );


                        material.emissiveIntensity =
                            state.selectedId ===
                                object.id
                                ? 0.35
                                : 0;
                    }
                );
            }
        );
    }


    function updateSelectionVisual() {

        for (
            const object
            of state.objects.values()
        ) {

            updateMeshSelection(
                object
            );
        }
    }


    function selectObject(id) {

        const object =
            state.objects.get(
                id
            );


        if (!object) {
            return;
        }


        state.selectedId =
            id;


        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();

        updateGizmoVisibility();


        if (studioMessage) {

            studioMessage.textContent =
                `Selected ${object.name}`;
        }
    }


    function selectStarterPlayer() {

        state.selectedId =
            "starterPlayer";


        /*
         * StarterPlayer has no 3D mesh — clear any
         * viewport selection outline / gizmo, they'd
         * be pointing at nothing.
         */

        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();

        updateGizmoVisibility();


        if (studioMessage) {

            studioMessage.textContent =
                "Selected StarterPlayer";
        }
    }


    function clearSelection() {

        state.selectedId =
            null;


        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();

        updateGizmoVisibility();


        if (studioMessage) {

            studioMessage.textContent =
                "Nothing selected";
        }
    }


    // ============================================================
    // TRANSFORM GIZMO
    //
    // Visible arrow/scale/rotate handles shown on the selected
    // object whenever Move, Scale, or Rotate is active. Each
    // handle is tagged with the axis it controls so dragging it
    // moves/scales/rotates only along that one axis. Clicking
    // the object itself (not a handle) still falls back to the
    // old free-drag behavior.
    // ============================================================

    let gizmo = null;

    let gizmoGroups = {
        move: null,
        scale: null,
        rotate: null
    };

    const AXIS_COLORS = {
        x: 0xff4444,
        y: 0x44ff66,
        z: 0x4488ff
    };

    const AXIS_VECTORS = {
        x: { x: 1, y: 0, z: 0 },
        y: { x: 0, y: 1, z: 0 },
        z: { x: 0, y: 0, z: 1 }
    };

    const GIZMO_ARM_LENGTH = 3.4;


    function buildMoveHandle(axis) {

        const group =
            new THREE.Group();

        const color =
            AXIS_COLORS[axis];

        const shaft =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.06,
                    0.06,
                    GIZMO_ARM_LENGTH * 0.78,
                    8
                ),
                new THREE.MeshBasicMaterial({
                    color,
                    depthTest: false
                })
            );

        shaft.position.y =
            GIZMO_ARM_LENGTH * 0.39;

        const tip =
            new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.22,
                    0.55,
                    10
                ),
                new THREE.MeshBasicMaterial({
                    color,
                    depthTest: false
                })
            );

        tip.position.y =
            GIZMO_ARM_LENGTH * 0.78 +
            0.27;

        group.add(shaft);
        group.add(tip);

        group.renderOrder = 999;

        orientHandleGroup(
            group,
            axis
        );

        group.userData.gizmoAxis =
            axis;

        group.userData.gizmoMode =
            "move";

        group.userData.gizmoHitRadius =
            0.35;

        group.userData.gizmoLength =
            GIZMO_ARM_LENGTH;

        return group;
    }


    function buildScaleHandle(axis) {

        const group =
            new THREE.Group();

        const color =
            AXIS_COLORS[axis];

        const shaft =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.06,
                    0.06,
                    GIZMO_ARM_LENGTH * 0.78,
                    8
                ),
                new THREE.MeshBasicMaterial({
                    color,
                    depthTest: false
                })
            );

        shaft.position.y =
            GIZMO_ARM_LENGTH * 0.39;

        /*
         * Cube tip instead of a cone — this is what
         * visually tells Scale apart from Move.
         */

        const tip =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.36,
                    0.36,
                    0.36
                ),
                new THREE.MeshBasicMaterial({
                    color,
                    depthTest: false
                })
            );

        tip.position.y =
            GIZMO_ARM_LENGTH * 0.78 +
            0.18;

        group.add(shaft);
        group.add(tip);

        group.renderOrder = 999;

        orientHandleGroup(
            group,
            axis
        );

        group.userData.gizmoAxis =
            axis;

        group.userData.gizmoMode =
            "scale";

        group.userData.gizmoHitRadius =
            0.35;

        group.userData.gizmoLength =
            GIZMO_ARM_LENGTH;

        return group;
    }


    function buildRotateHandle(axis) {

        /*
         * Rotate handles are full rings around the axis,
         * not arrows — this is the "should look different"
         * requirement. A ring around the X axis lies in the
         * Y-Z plane, so we build it flat and then rotate the
         * whole ring to stand on the right plane.
         */

        const color =
            AXIS_COLORS[axis];

        const ring =
            new THREE.Mesh(
                new THREE.TorusGeometry(
                    GIZMO_ARM_LENGTH * 0.62,
                    0.05,
                    8,
                    48
                ),
                new THREE.MeshBasicMaterial({
                    color,
                    depthTest: false
                })
            );

        if (axis === "x") {

            ring.rotation.y =
                Math.PI / 2;

        } else if (axis === "y") {

            ring.rotation.x =
                Math.PI / 2;
        }

        /*
         * z ring needs no extra rotation — a torus is
         * already built flat in the X-Y plane, which is
         * exactly the ring a Z-axis rotation needs.
         */

        ring.renderOrder = 999;

        ring.userData.gizmoAxis =
            axis;

        ring.userData.gizmoMode =
            "rotate";

        ring.userData.gizmoHitRadius =
            0.4;

        ring.userData.gizmoLength =
            GIZMO_ARM_LENGTH * 0.62;

        return ring;
    }


    function orientHandleGroup(group, axis) {

        /*
         * Handles are authored pointing up the local
         * +Y axis. Rotate that into +X or +Z as needed.
         */

        if (axis === "x") {

            group.rotation.z =
                -Math.PI / 2;

        } else if (axis === "z") {

            group.rotation.x =
                Math.PI / 2;
        }
    }


    function createGizmo() {

        if (!THREE || !scene) {
            return;
        }

        gizmo =
            new THREE.Group();

        gizmo.name =
            "TransformGizmo";

        gizmo.visible =
            false;

        gizmo.renderOrder = 999;

        const moveGroup =
            new THREE.Group();

        const scaleGroup =
            new THREE.Group();

        const rotateGroup =
            new THREE.Group();

        ["x", "y", "z"].forEach(
            axis => {

                moveGroup.add(
                    buildMoveHandle(axis)
                );

                scaleGroup.add(
                    buildScaleHandle(axis)
                );

                rotateGroup.add(
                    buildRotateHandle(axis)
                );
            }
        );

        gizmo.add(moveGroup);
        gizmo.add(scaleGroup);
        gizmo.add(rotateGroup);

        gizmoGroups.move = moveGroup;
        gizmoGroups.scale = scaleGroup;
        gizmoGroups.rotate = rotateGroup;

        scene.add(gizmo);
    }


    function updateGizmoVisibility() {

        if (!gizmo) {
            return;
        }

        const object =
            state.selectedId
                ? state.objects.get(
                    state.selectedId
                )
                : null;

        const shouldShow =
            !!object &&
            (
                state.tool === "move" ||
                state.tool === "scale" ||
                state.tool === "rotate"
            );

        gizmo.visible =
            shouldShow;

        if (!shouldShow) {
            return;
        }

        gizmoGroups.move.visible =
            state.tool === "move";

        gizmoGroups.scale.visible =
            state.tool === "scale";

        gizmoGroups.rotate.visible =
            state.tool === "rotate";

        updateGizmoPosition();
    }


    function updateGizmoPosition() {

        if (
            !gizmo ||
            !gizmo.visible
        ) {
            return;
        }

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {
            return;
        }

        gizmo.position.set(
            object.position?.x || 0,
            object.position?.y || 0,
            object.position?.z || 0
        );

        /*
         * Keep the gizmo a roughly constant size on
         * screen no matter how far the editor camera is.
         */

        const distance =
            camera
                ? camera.position.distanceTo(
                    gizmo.position
                )
                : 24;

        const scale =
            clamp(
                distance / 24,
                0.4,
                3
            );

        gizmo.scale.set(
            scale,
            scale,
            scale
        );
    }


    function getGizmoHandleFromViewport(event) {

        if (
            !gizmo ||
            !gizmo.visible ||
            !raycaster ||
            !camera ||
            !canvas
        ) {
            return null;
        }

        const activeGroup =
            gizmoGroups[state.tool];

        if (!activeGroup) {
            return null;
        }

        const rect =
            canvas.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return null;
        }

        mouseVector.x =
            (
                (event.clientX - rect.left) /
                rect.width
            ) * 2 - 1;

        mouseVector.y =
            -(
                (event.clientY - rect.top) /
                rect.height
            ) * 2 + 1;

        raycaster.setFromCamera(
            mouseVector,
            camera
        );

        const hits =
            raycaster.intersectObjects(
                activeGroup.children,
                true
            );

        if (!hits.length) {
            return null;
        }

        let current =
            hits[0].object;

        while (current) {

            if (current.userData?.gizmoAxis) {

                return {
                    axis: current.userData.gizmoAxis,
                    mode: current.userData.gizmoMode
                };
            }

            current =
                current.parent;
        }

        return null;
    }


    function beginGizmoTransform(event, axis, mode) {

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

        state.mouse.gizmoAxis =
            axis;

        state.mouse.gizmoModeAtStart =
            mode;

        state.mouse.dragStartX =
            event.clientX;

        state.mouse.dragStartY =
            event.clientY;

        state.mouse.objectStart =
            cloneObject(
                object
            );

        /*
         * Project the axis into screen space once, at
         * drag start, so we can turn 2D mouse movement
         * into a single 1D "along this axis" amount.
         */

        const worldPos =
            new THREE.Vector3(
                object.position?.x || 0,
                object.position?.y || 0,
                object.position?.z || 0
            );

        const axisVec =
            AXIS_VECTORS[axis];

        const worldPosOffset =
            worldPos.clone().add(
                new THREE.Vector3(
                    axisVec.x,
                    axisVec.y,
                    axisVec.z
                )
            );

        const rect =
            canvas.getBoundingClientRect();

        const screenA =
            worldPos.clone().project(
                camera
            );

        const screenB =
            worldPosOffset.clone().project(
                camera
            );

        let screenDirX =
            (screenB.x - screenA.x) *
            rect.width;

        let screenDirY =
            -(screenB.y - screenA.y) *
            rect.height;

        const screenLength =
            Math.hypot(
                screenDirX,
                screenDirY
            );

        if (screenLength < 0.0001) {

            /*
             * Axis is pointing straight at/away from
             * the camera (edge-on) — fall back to a
             * vertical-drag convention so it still does
             * something reasonable instead of nothing.
             */

            screenDirX = 0;
            screenDirY = -1;

        } else {

            screenDirX /= screenLength;
            screenDirY /= screenLength;
        }

        state.mouse.gizmoScreenDir = {
            x: screenDirX,
            y: screenDirY
        };

        if (canvas) {

            canvas.style.cursor =
                "grabbing";
        }
    }


    function applyGizmoTransform(event) {

        const object =
            state.objects.get(
                state.selectedId
            );

        const start =
            state.mouse.objectStart;

        const axis =
            state.mouse.gizmoAxis;

        const screenDir =
            state.mouse.gizmoScreenDir;

        if (
            !object ||
            !start ||
            !axis ||
            !screenDir
        ) {
            return false;
        }

        const dx =
            event.clientX -
            state.mouse.dragStartX;

        const dy =
            event.clientY -
            state.mouse.dragStartY;

        const dragAmount =
            dx * screenDir.x +
            dy * screenDir.y;

        const distanceFactor =
            (state.camera.distance || 24) / 24;


        if (state.mouse.gizmoModeAtStart === "move") {

            const moved =
                dragAmount *
                0.04 *
                distanceFactor;

            object.position[axis] =
                start.position[axis] +
                moved;

            if (state.snapEnabled) {

                object.position[axis] =
                    snap(
                        object.position[axis]
                    );
            }

        } else if (state.mouse.gizmoModeAtStart === "scale") {

            const grown =
                dragAmount *
                0.03 *
                distanceFactor;

            object.size[axis] =
                Math.max(
                    0.1,
                    start.size[axis] +
                        grown
                );

            if (state.snapEnabled) {

                object.size[axis] =
                    Math.max(
                        0.1,
                        snap(
                            object.size[axis],
                            0.5
                        )
                    );
            }

        } else if (state.mouse.gizmoModeAtStart === "rotate") {

            const turned =
                dragAmount *
                0.5;

            object.rotation[axis] =
                start.rotation[axis] +
                turned;

            if (state.snapEnabled) {

                object.rotation[axis] =
                    snap(
                        object.rotation[axis],
                        15
                    );
            }
        }

        return true;
    }


    // ============================================================
    // GRID
    // ============================================================

    function createGrid() {

        if (!threeReady) {
            return;
        }


        if (gridHelper) {

            scene.remove(
                gridHelper
            );

            gridHelper =
                null;
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


        scene.add(
            gridHelper
        );


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
            Math.cos(
                pitch
            ) *
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


        state.camera.yaw =
            35;

        state.camera.pitch =
            -25;

        state.camera.distance =
            24;


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

            showToast(
                "Select an object first."
            );

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
                ) *
                    4
            );


        updateCamera();


        log(
            `Focused "${object.name}".`
        );
    }


    // ============================================================
    // CAMERA WASD
    // ============================================================

    function updateMovement(delta) {

        /*
         * Camera movement requires RMB.
         *
         * This is intentionally separated from
         * W/E/R studio shortcuts.
         */

        if (
            !state.mouse.down ||
            state.mouse.button !== 2
        ) {
            return;
        }


        const active =
            document.activeElement;


        if (
            active &&
            (
                active.tagName ===
                    "INPUT" ||
                active.tagName ===
                    "TEXTAREA" ||
                active.tagName ===
                    "SELECT"
            )
        ) {
            return;
        }


        let forward =
            0;

        let right =
            0;


        /*
         * Correct WASD:
         *
         * W = forward
         * S = backward
         * A = left
         * D = right
         */

        if (
            state.keys.has("w") ||
            state.keys.has("arrowup")
        ) {

            forward +=
                1;
        }


        if (
            state.keys.has("s") ||
            state.keys.has("arrowdown")
        ) {

            forward -=
                1;
        }


        if (
            state.keys.has("d") ||
            state.keys.has("arrowright")
        ) {

            right +=
                1;
        }


        if (
            state.keys.has("a") ||
            state.keys.has("arrowleft")
        ) {

            right -=
                1;
        }


        if (
            !forward &&
            !right
        ) {
            return;
        }


        const length =
            Math.hypot(
                forward,
                right
            );


        forward /=
            length;


        right /=
            length;


        const yaw =
            THREE.MathUtils.degToRad(
                state.camera.yaw
            );


        const speed =
            state.keys.has("shift")
                ? 40
                : 18;


        const amount =
            speed *
            delta;


        /*
         * Camera forward vector.
         *
         * W moves toward where camera faces.
         * S moves opposite.
         *
         * D moves right.
         * A moves left.
         */

        const forwardX =
            Math.sin(
                yaw
            );


        const forwardZ =
            Math.cos(
                yaw
            );


        const rightX =
            Math.cos(
                yaw
            );


        const rightZ =
            -Math.sin(
                yaw
            );


        /*
         * IMPORTANT: the camera sits at
         * target + offset(sin,cos)*distance,
         * so it looks in the OPPOSITE direction
         * from (sin,cos). Using +sin/+cos directly
         * as "forward" moves the target away from
         * where the camera is looking (backward).
         * Subtracting fixes it so W actually flies
         * into the view instead of out of it.
         */

        state.camera.target.x -=
            (
                forwardX *
                    forward +
                rightX *
                    right
            ) *
            amount;


        state.camera.target.z -=
            (
                forwardZ *
                    forward +
                rightZ *
                    right
            ) *
            amount;


        updateCamera();
    }


    // ============================================================
    // MOUSE CAMERA
    // ============================================================

    function onPointerDown(event) {

        if (
            event.button !== 0 &&
            event.button !== 1 &&
            event.button !== 2
        ) {
            return;
        }


        event.preventDefault();


        state.mouse.down =
            true;


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


        if (
            state.mouse.draggingObject
        ) {

            transformSelected(
                event
            );

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
         * RMB and middle mouse rotate camera.
         */

        if (
            state.mouse.button ===
                2 ||
            state.mouse.button ===
                1
        ) {

            state.camera.yaw -=
                dx *
                0.35;


            state.camera.pitch -=
                dy *
                0.25;


            state.camera.pitch =
                clamp(
                    state.camera.pitch,
                    -89,
                    89
                );


            updateCamera();
        }
    }


    function onPointerUp() {

        state.mouse.down =
            false;

        state.mouse.button =
            0;

        state.mouse.draggingObject =
            false;

        state.mouse.objectStart =
            null;

        state.mouse.gizmoAxis =
            null;

        state.mouse.gizmoModeAtStart =
            null;

        state.mouse.gizmoScreenDir =
            null;


        if (canvas) {

            canvas.style.cursor =
                state.tool === "select"
                    ? "default"
                    : "crosshair";
        }
    }


    function handleWheel(event) {

        event.preventDefault();


        state.camera.distance =
            clamp(

                state.camera.distance +
                    (
                        event.deltaY >
                            0
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


        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return null;
        }


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

                return current
                    .userData
                    .objectId;
            }


            current =
                current.parent;
        }


        return null;
    }


    function selectFromViewport(event) {

        if (
            event.button !== 0
        ) {
            return;
        }


        /*
         * Gizmo handles take priority over normal
         * object picking — if the click landed on a
         * visible Move/Scale/Rotate handle, drag that
         * axis instead of re-selecting or free-dragging.
         */

        if (
            state.selectedId &&
            (
                state.tool === "move" ||
                state.tool === "scale" ||
                state.tool === "rotate"
            )
        ) {

            const handle =
                getGizmoHandleFromViewport(
                    event
                );

            if (handle) {

                beginGizmoTransform(
                    event,
                    handle.axis,
                    handle.mode
                );

                return;
            }
        }


        const id =
            getObjectFromViewport(
                event
            );


        if (!id) {

            if (
                state.tool ===
                "select"
            ) {

                clearSelection();
            }

            return;
        }


        selectObject(
            id
        );


        if (
            state.tool !==
            "select"
        ) {

            beginTransform(
                event
            );
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
            cloneObject(
                object
            );


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


        /*
         * Dragging a gizmo handle uses its own
         * axis-constrained math instead of the free
         * screen-space drag below.
         */

        if (state.mouse.gizmoAxis) {

            const object =
                state.objects.get(
                    state.selectedId
                );

            if (!object) {
                return;
            }

            const applied =
                applyGizmoTransform(
                    event
                );

            if (applied) {

                updateMeshFromObject(
                    object
                );

                updateProperties();

                state.game.saved =
                    false;

                updateGameStatus();

                updateGizmoPosition();
            }

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
            state.tool ===
            "move"
        ) {

            const yaw =
                THREE.MathUtils.degToRad(
                    state.camera.yaw
                );


            object.position.x =
                start.position.x +
                (
                    Math.cos(yaw) *
                        dx -
                    Math.sin(yaw) *
                        dy
                ) *
                    amount;


            object.position.z =
                start.position.z +
                (
                    -Math.sin(yaw) *
                        dx -
                    Math.cos(yaw) *
                        dy
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
            state.tool ===
            "scale"
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
            state.tool ===
            "rotate"
        ) {

            object.rotation.y =
                start.rotation.y +
                dx *
                    0.5;


            object.rotation.x =
                start.rotation.x -
                dy *
                    0.25;


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

        updateGizmoPosition();
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

                if (
                    event.button ===
                    0
                ) {

                    selectFromViewport(
                        event
                    );
                }


                onPointerDown(
                    event
                );
            }
        );


        canvas.addEventListener(
            "pointermove",
            event => {

                onPointerMove(
                    event
                );
            }
        );


        window.addEventListener(
            "pointerup",
            () => {

                onPointerUp();
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
            event => {

                event.preventDefault();
            }
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


        lastFrame =
            now;


        updateMovement(
            delta
        );


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
            .forEach(
                item => {

                    item.classList.toggle(

                        "selected",

                        item.dataset.objectId ===
                            state.selectedId
                    );
                }
            );
    }


    function setupExplorer() {

        document
            .querySelectorAll(
                "#explorerTree .tree-item"
            )
            .forEach(
                item => {

                    const id =
                        item.dataset.objectId;


                    if (!id) {
                        return;
                    }


                    item.addEventListener(
                        "click",
                        () => {

                            if (
                                state.objects.has(
                                    id
                                )
                            ) {

                                selectObject(
                                    id
                                );

                            } else if (
                                id === "starterPlayer"
                            ) {

                                selectStarterPlayer();
                            }
                        }
                    );
                }
            );


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
                        .forEach(
                            item => {

                                item.style.display =
                                    !query ||
                                    item.textContent
                                        .toLowerCase()
                                        .includes(
                                            query
                                        )
                                        ? ""
                                        : "none";
                            }
                        );
                }
            );
    }


    // ============================================================
    // PROPERTIES
    // ============================================================

    function setInput(id, value) {

        const input =
            $(id);


        if (input) {
            input.value =
                value;
        }
    }


    function setChecked(id, value) {

        const input =
            $(id);


        if (input) {
            input.checked =
                Boolean(value);
        }
    }


    let starterPlayerInputsWired = false;


    function renderStarterPlayerProperties() {

        const sp =
            state.game.starterPlayer;


        noSelectionMessage
            ?.classList
            .add(
                "hidden"
            );

        document
            .querySelectorAll(
                "#propertiesContent [data-property-section]"
            )
            .forEach(
                section => {

                    section
                        .classList
                        .add(
                            "hidden"
                        );
                }
            );

        const starterPlayerSection =
            $("starterPlayerProperties");

        if (starterPlayerSection) {

            starterPlayerSection
                .classList
                .remove(
                    "hidden"
                );
        }


        if (selectedObjectName) {

            selectedObjectName.textContent =
                "StarterPlayer";
        }

        if (selectedObjectType) {

            selectedObjectType.textContent =
                "StarterPlayer";
        }

        if (selectedObjectIcon) {

            selectedObjectIcon.textContent =
                "☺";
        }


        setInput(
            "spWalkSpeed",
            sp.walkSpeed
        );

        setInput(
            "spJumpPower",
            sp.jumpPower
        );

        setChecked(
            "spFirstPersonLocked",
            sp.firstPersonLocked
        );

        setChecked(
            "spAllowZoom",
            sp.allowZoom
        );

        setChecked(
            "spHotkeysEnabled",
            sp.hotkeysEnabled
        );

        setChecked(
            "spScriptable",
            sp.scriptable
        );


        if (starterPlayerInputsWired) {
            return;
        }

        starterPlayerInputsWired =
            true;

        const bindNumber =
            (id, key) => {

                $(id)?.addEventListener(
                    "input",
                    event => {

                        const value =
                            parseFloat(
                                event.target.value
                            );

                        state.game.starterPlayer[key] =
                            Number.isFinite(value)
                                ? value
                                : 0;

                        state.game.saved =
                            false;

                        updateGameStatus();
                    }
                );
            };

        const bindCheckbox =
            (id, key) => {

                $(id)?.addEventListener(
                    "change",
                    event => {

                        state.game.starterPlayer[key] =
                            event.target.checked;

                        state.game.saved =
                            false;

                        updateGameStatus();
                    }
                );
            };

        bindNumber(
            "spWalkSpeed",
            "walkSpeed"
        );

        bindNumber(
            "spJumpPower",
            "jumpPower"
        );

        bindCheckbox(
            "spFirstPersonLocked",
            "firstPersonLocked"
        );

        bindCheckbox(
            "spAllowZoom",
            "allowZoom"
        );

        bindCheckbox(
            "spHotkeysEnabled",
            "hotkeysEnabled"
        );

        bindCheckbox(
            "spScriptable",
            "scriptable"
        );
    }


    function updateProperties() {

        if (
            state.selectedId ===
            "starterPlayer"
        ) {

            renderStarterPlayerProperties();

            return;
        }


        document
            .querySelectorAll(
                "#propertiesContent [data-property-section]"
            )
            .forEach(
                section => {

                    section
                        .classList
                        .remove(
                            "hidden"
                        );
                }
            );

        const starterPlayerSection =
            $("starterPlayerProperties");

        if (starterPlayerSection) {

            starterPlayerSection
                .classList
                .add(
                    "hidden"
                );
        }


        const object =
            state.objects.get(
                state.selectedId
            );


        if (!object) {

            noSelectionMessage
                ?.classList
                .remove(
                    "hidden"
                );


            if (
                selectedObjectName
            ) {

                selectedObjectName.textContent =
                    "Nothing selected";
            }


            if (
                selectedObjectType
            ) {

                selectedObjectType.textContent =
                    "Select an object";
            }


            return;
        }


        noSelectionMessage
            ?.classList
            .add(
                "hidden"
            );


        if (
            selectedObjectName
        ) {

            selectedObjectName.textContent =
                object.name;
        }


        if (
            selectedObjectType
        ) {

            selectedObjectType.textContent =
                object.type;
        }


        if (
            selectedObjectIcon
        ) {

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
            parts.length ===
            1
        ) {

            object[
                parts[0]
            ] =
                value;

            return;
        }


        if (
            !object[
                parts[0]
            ]
        ) {

            object[
                parts[0]
            ] = {};
        }


        object[
            parts[0]
        ][
            parts[1]
        ] =
            value;
    }


    function setupProperties() {

        document
            .querySelectorAll(
                "[data-property]"
            )
            .forEach(
                input => {

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
                                input.dataset
                                    .property;


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
                }
            );
    }


    // ============================================================
    // INSERT OBJECT
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
                            count *
                            2
                        ),

                    y:
                        type ===
                        "SpawnLocation"

                            ? 1
                            : 0,

                    z: 0
                },


                size:

                    type ===
                    "Model"

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
            type ===
            "Script"
        ) {

            object.script =
                "-- WebBlox Luau\n\n";
        }


        if (
            type ===
            "Folder"
        ) {

            object.size = {
                x: 1,
                y: 1,
                z: 1
            };
        }


        renderObject(
            object
        );


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
            meshes.get(
                object.id
            );


        if (mesh) {

            if (mesh.parent) {

                mesh.parent.remove(
                    mesh
                );
            }

            disposeMesh(
                mesh
            );

            meshes.delete(
                object.id
            );
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
            cloneObject(
                object
            );


        duplicate.id =
            makeId(
                object.type.toLowerCase()
            );


        duplicate.name =
            `${object.name} Copy`;


        duplicate.position.x +=
            2;


        duplicate.position.z +=
            2;


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
            newName ===
                null ||
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


    function restoreSnapshot(
        data
    ) {

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


        state.future =
            [];
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


        log(
            "Undo."
        );
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


        log(
            "Redo."
        );
    }


    // ============================================================
    // SAVE
    // ============================================================

    function getGameData() {

        return {

            version:
                3,

            game:
                cloneObject(
                    state.game
                ),

            objects:
                Array.from(
                    state.objects.values()
                ).map(
                    cloneObject
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


        link.href =
            url;


        link.download =
            `${
                (
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
                    )
            }.webblox.json`;


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


        persistActiveProject();
    }


    // ============================================================
    // PROJECT MANAGER INTEGRATION
    //
    // Bridges this editor to studio-projects.js. That file never
    // touches state.objects directly — it only tells us which
    // project was opened (via a custom event) and gives us a
    // place to write data back to (updateActiveProjectPlaceData).
    // ============================================================

    function persistActiveProject() {

        if (
            !window.WebBloxProjects ||
            typeof window.WebBloxProjects
                .updateActiveProjectPlaceData !==
                "function"
        ) {
            return;
        }

        window.WebBloxProjects.updateActiveProjectPlaceData(
            getGameData()
        );
    }


    function loadProjectIntoEditor(project) {

        const placeData =
            project?.placeData;

        const objects =
            Array.isArray(
                placeData?.objects
            )
                ? placeData.objects
                : null;

        saveHistory();

        state.objects.clear();

        if (objects && objects.length) {

            for (
                const object
                of objects
            ) {
                createObject(
                    object
                );
            }

        } else {

            createDefaultWorld();
        }

        /*
         * placeData can come from two different shapes:
         * - the "new project" template (flat: name/description
         *   directly on placeData)
         * - a real save from persistActiveProject(), which
         *   stores getGameData()'s output (name/description/
         *   starterPlayer nested under placeData.game)
         * Check both so neither path silently loses data.
         */

        state.game.name =
            placeData?.game?.name ||
            placeData?.name ||
            project?.title ||
            state.game.name;

        state.game.description =
            placeData?.game?.description ||
            placeData?.description ||
            project?.description ||
            state.game.description;

        const savedStarterPlayer =
            placeData?.game?.starterPlayer ||
            placeData?.starterPlayer;

        if (savedStarterPlayer) {

            state.game.starterPlayer = {

                ...state.game.starterPlayer,

                ...savedStarterPlayer
            };
        }

        state.game.saved =
            true;

        state.selectedId =
            null;

        renderWorld();

        updateExplorer();

        updateProperties();

        updateGameStatus();

        log(
            `Opened project: ${
                project?.title ||
                "Untitled"
            }`
        );
    }


    function setupProjectIntegration() {

        document.addEventListener(
            "webblox:project-opened",
            event => {

                loadProjectIntoEditor(
                    event.detail
                        ?.project
                );
            }
        );

        const brandButton =
            $("studioBrandButton");

        if (brandButton) {

            brandButton.addEventListener(
                "click",
                () => {

                    persistActiveProject();

                    if (
                        window.WebBloxProjects &&
                        typeof window.WebBloxProjects
                            .showProjectSelection ===
                            "function"
                    ) {
                        window.WebBloxProjects.showProjectSelection();
                    }
                }
            );
        }
    }


    // ============================================================
    // LOAD
    // ============================================================

    function loadGame() {

        const input =
            document.createElement(
                "input"
            );


        input.type =
            "file";


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


                    if (data.game) {

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
                        `Unable to load game: ${error.message}`,
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
    // NEW GAME
    // ============================================================

    function openModal(id) {

        $(id)
            ?.classList
            .remove(
                "hidden"
            );
    }


    function closeModal(id) {

        $(id)
            ?.classList
            .add(
                "hidden"
            );
    }


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
                state.game.name ||
                ""
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


        state.playing =
            true;


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
             * Player is loaded here instead of during
             * Studio startup.
             */

            const Player =
                await loadPlayerRuntime();


            if (
                !Player ||
                typeof Player.start !==
                    "function"
            ) {

                throw new Error(
                    "Player runtime does not expose start()."
                );
            }


            const runtimeData =
                getGameData();


            await Player.start({

                game:
                    runtimeData.game,

                objects:
                    runtimeData.objects,

                scene,

                camera,

                renderer,

                viewport,

                onLog:
                    message => {

                        log(
                            `[Player] ${message}`
                        );
                    }
            });


            log(
                "Player runtime started."
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
                `Player failed: ${error.message}`,
                "error"
            );


            showToast(
                "Player failed to start. Studio is still working."
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
                typeof window.WebBloxPlayer.stop ===
                    "function"
            ) {

                await window.WebBloxPlayer.stop();
            }

        } catch (error) {

            console.error(
                "[WebBlox] Player stop failed:",
                error
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


        Object.values(
            ids
        ).forEach(
            id => {

                $(id)
                    ?.classList
                    .remove(
                        "active"
                    );
            }
        );


        $(ids[tool])
            ?.classList
            .add(
                "active"
            );


        if (viewportMode) {

            viewportMode.textContent =
                tool
                    .charAt(0)
                    .toUpperCase() +
                tool.slice(1);
        }


        if (canvas) {

            canvas.style.cursor =
                tool ===
                    "select"
                    ? "default"
                    : "crosshair";
        }


        updateGizmoVisibility();
    }


    // ============================================================
    // KEYBOARD
    // ============================================================

    function setupKeyboard() {

        window.addEventListener(
            "keydown",
            event => {

                const key =
                    event.key.toLowerCase();


                /*
                 * Always track movement keys.
                 */

                state.keys.add(
                    key
                );


                const active =
                    document.activeElement;


                const typing =
                    active &&
                    (
                        active.tagName ===
                            "INPUT" ||
                        active.tagName ===
                            "TEXTAREA" ||
                        active.tagName ===
                            "SELECT"
                    );


                if (typing) {
                    return;
                }


                // CTRL + Z

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


                // CTRL + Y

                if (
                    event.ctrlKey &&
                    key === "y"
                ) {

                    event.preventDefault();

                    redo();

                    return;
                }


                // CTRL + D

                if (
                    event.ctrlKey &&
                    key === "d"
                ) {

                    event.preventDefault();

                    duplicateSelected();

                    return;
                }


                // DELETE

                if (
                    event.key ===
                    "Delete"
                ) {

                    event.preventDefault();

                    deleteSelected();

                    return;
                }


                // ESCAPE

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    clearSelection();

                    state.mouse.draggingObject =
                        false;

                    return;
                }


                /*
                 * W/E/R/Q are Studio tools ONLY when
                 * RMB camera mode is not being used.
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


        // Tools

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


        // Grid

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


        // Snap

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


        // Camera reset

        $("cameraReset")
            ?.addEventListener(
                "click",
                resetCamera
            );


        // Camera zoom in

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


        // Camera zoom out

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


        // Add object

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
            .forEach(
                button => {

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
                }
            );


        // Refresh Explorer

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


        // Welcome add part

        $("welcomeAddPart")
            ?.addEventListener(
                "click",
                () =>
                    insertObject(
                        "Part"
                    )
            );


        // Output

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


        // Modals

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            closeModal(
                                button.dataset
                                    .closeModal
                            )
                    );
                }
            );


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


        // Actions

        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                button => {

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
                }
            );


        // Property search

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
                        .forEach(
                            section => {

                                section.style.display =
                                    !query ||
                                    section.textContent
                                        .toLowerCase()
                                        .includes(
                                            query
                                        )
                                        ? ""
                                        : "none";
                            }
                        );
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

        const menu =
            $(id);


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
                    !state.objects.has(
                        id
                    )
                ) {
                    return;
                }


                event.preventDefault();


                selectObject(
                    id
                );


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
    // INITIALIZE THREE
    // ============================================================

    async function initialize3D() {

        if (!viewport) {

            throw new Error(
                "Viewport element #viewport was not found."
            );
        }


        /*
         * Give Three.js a maximum startup time.
         */

        let timeoutId;


        const timeoutPromise =
            new Promise(
                (_, reject) => {

                    timeoutId =
                        setTimeout(
                            () => {

                                reject(
                                    new Error(
                                        "Three.js startup timed out."
                                    )
                                );

                            },
                            18000
                        );
                }
            );


        try {

            await Promise.race(
                [
                    loadThree(),
                    timeoutPromise
                ]
            );

        } finally {

            clearTimeout(
                timeoutId
            );
        }


        if (!THREE) {

            throw new Error(
                "Three.js is unavailable."
            );
        }


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

                antialias:
                    true,

                alpha:
                    false
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


        if (
            "outputColorSpace"
            in renderer
        ) {

            renderer.outputColorSpace =
                THREE.SRGBColorSpace;
        }


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


        // Lighting

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


        // Raycaster

        raycaster =
            new THREE.Raycaster();


        mouseVector =
            new THREE.Vector2();


        threeReady =
            true;


        createGrid();


        createGizmo();


        setup3DInput();


        resizeRenderer();


        window.addEventListener(
            "resize",
            resizeRenderer
        );


        renderWorld();


        updateCamera();


        requestAnimationFrame(
            animate
        );


        log(
            "Real 3D WebGL viewport initialized."
        );


        log(
            "Q Select | W Move | E Rotate | R Scale | F Focus"
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
            width /
            height;


        camera.updateProjectionMatrix();
    }


    // ============================================================
    // INITIALIZE
    // ============================================================

    async function initialize() {

        console.log(
            "[WebBlox Studio] Starting initialization..."
        );


        /*
         * FIRST:
         * Remove fake/old viewport.
         */

        removeOldViewport();


        /*
         * SECOND:
         * Create world immediately.
         *
         * This means Explorer/Properties can work even
         * before WebGL finishes.
         */

        createDefaultWorld();


        /*
         * THIRD:
         * Setup all normal Studio UI immediately.
         */

        setupKeyboard();

        setupExplorer();

        setupProperties();

        setupButtons();

        setupMenuButtons();

        setupProjectIntegration();


        updateExplorer();

        updateProperties();

        updateGameStatus();


        setTool(
            "select"
        );


        if (viewportMode) {

            viewportMode.textContent =
                "Perspective";
        }


        log(
            "Studio interface loaded."
        );


        /*
         * FOURTH:
         * Initialize WebGL.
         *
         * Player is deliberately NOT loaded here.
         */

        try {

            await initialize3D();


            removeOldViewport();


            updateCamera();

            updateExplorer();

            updateProperties();


            state.studioReady =
                true;


            log(
                "WebBlox Studio ready."
            );


            console.log(
                "[WebBlox Studio] Ready."
            );

        } catch (error) {

            console.error(
                "[WebBlox Studio] 3D initialization failed:",
                error
            );


            log(
                `3D viewport failed: ${error.message}`,
                "error"
            );


            /*
             * DO NOT stop the Studio.
             *
             * The editor UI remains usable.
             */

            state.studioReady =
                true;


            if (viewportMode) {

                viewportMode.textContent =
                    "Safe Mode";
            }


            showToast(
                "3D viewport failed, but Studio opened in safe mode."
            );
        }


        /*
         * CRITICAL:
         *
         * Always finish the loading screen.
         */

        finishLoadingScreen();


        /*
         * Extra delayed failsafe.
         */

        setTimeout(
            finishLoadingScreen,
            100
        );
    }


    // ============================================================
    // GLOBAL ERROR PROTECTION
    // ============================================================

    window.addEventListener(
        "error",
        event => {

            console.error(
                "[WebBlox Studio] Global error:",
                event.error ||
                    event.message
            );


            /*
             * Never allow a JavaScript error to leave
             * the loading overlay covering the editor.
             */

            finishLoadingScreen();
        }
    );


    window.addEventListener(
        "unhandledrejection",
        event => {

            console.error(
                "[WebBlox Studio] Unhandled promise rejection:",
                event.reason
            );


            finishLoadingScreen();
        }
    );


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxStudio = {

        state,

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

        finishLoadingScreen
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


