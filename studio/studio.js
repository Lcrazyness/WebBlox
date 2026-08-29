/*
 * WebBlox Studio
 * Complete Studio controller
 *
 * Stage 2:
 * - Real 3D WebGL viewport
 * - Three.js renderer
 * - Real 3D Parts
 * - Real 3D SpawnLocation
 * - Basic 3D Models
 * - Perspective camera
 * - WASD movement
 * - Shift fast movement
 * - Mouse camera rotation
 * - Mouse wheel zoom
 * - Object selection
 * - Explorer selection
 * - Properties synchronization
 * - Move / Scale / Rotate tools
 * - Grid
 * - Snap
 * - Add Part / Spawn / Model / Folder / Script
 * - Duplicate
 * - Delete
 * - Undo / Redo
 * - New Game
 * - Save / Load
 * - Publish title validation
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
            position: {
                x: 14,
                y: 10,
                z: 20
            },

            target: {
                x: 0,
                y: 0,
                z: 0
            },

            yaw: 35,
            pitch: -20,

            distance: 24,

            minDistance: 3,
            maxDistance: 200
        },

        keys: new Set(),

        mouse: {
            down: false,
            button: 0,
            lastX: 0,
            lastY: 0
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

    const explorerTree = $("explorerTree");
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

    // Remove old fake viewport objects immediately.
    const oldWorld = $("world");
    if (oldWorld) {
        oldWorld.style.display = "none";
    }

    const oldWelcome = $("viewportWelcome");
    if (oldWelcome) {
        oldWelcome.style.display = "none";
    }

    const oldDefaultPart = $("defaultPart");
    if (oldDefaultPart) {
        oldDefaultPart.style.display = "none";
    }

    // ============================================================
    // THREE.JS
    // ============================================================

    let THREE = null;

    let renderer = null;
    let scene = null;
    let camera = null;

    let raycaster = null;
    let mouseVector = null;

    let canvas = null;

    let gridHelper = null;

    let ambientLight = null;
    let directionalLight = null;

    const meshes = new Map();

    let threeReady = false;


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
        return JSON.parse(
            JSON.stringify(object)
        );
    }


    function log(message, type = "info") {
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

        toast.textContent = message;

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
    // THREE.JS LOADER
    // ============================================================

    function loadThree() {
        return new Promise(
            (resolve, reject) => {

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
                    existing.addEventListener(
                        "load",
                        () => {
                            if (window.THREE) {
                                THREE = window.THREE;
                                resolve();
                            } else {
                                reject(
                                    new Error(
                                        "Three.js failed to load."
                                    )
                                );
                            }
                        }
                    );

                    existing.addEventListener(
                        "error",
                        () => {
                            reject(
                                new Error(
                                    "Three.js failed to load."
                                )
                            );
                        }
                    );

                    return;
                }

                const script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";

                script.dataset.webbloxThree =
                    "true";

                script.onload = () => {
                    if (!window.THREE) {
                        reject(
                            new Error(
                                "Three.js loaded but was unavailable."
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

                document.head.appendChild(
                    script
                );
            }
        );
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
                    data.type ===
                    "SpawnLocation"
                        ? "Spawn"
                        : data.type ===
                          "Model"
                            ? "Model"
                            : data.type ===
                              "Folder"
                                ? "Folder"
                                : data.type ===
                                  "Script"
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
                    data.type ===
                    "SpawnLocation"
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
                y: 0,
                z: 0
            },

            size: {
                x: 4,
                y: 1,
                z: 4
            },

            color: "#808080"
        });

        createObject({
            id: "spawn",
            name: "Spawn",
            type: "SpawnLocation",

            position: {
                x: 0,
                y: 1,
                z: 8
            },

            size: {
                x: 4,
                y: 1,
                z: 4
            },

            color: "#22c55e"
        });

        state.selectedId =
            null;
    }


    // ============================================================
    // MATERIAL
    // ============================================================

    function getMaterial(object) {

        const color =
            new THREE.Color(
                object.color ||
                "#808080"
            );

        let params = {
            color,
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
                params.metalness = 0;
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
    // CREATE 3D MESH
    // ============================================================

    function createMeshForObject(object) {

        if (!threeReady) {
            return null;
        }

        let root;

        // --------------------------------------------------------
        // PART
        // --------------------------------------------------------

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

            const mesh =
                new THREE.Mesh(
                    geometry,
                    material
                );

            mesh.castShadow =
                object.castShadow;

            mesh.receiveShadow = true;

            root = mesh;

            if (
                object.type ===
                "SpawnLocation"
            ) {

                const spawnMaterial =
                    new THREE.MeshStandardMaterial({
                        color: "#22c55e",
                        roughness: 0.45,
                        metalness: 0.05
                    });

                mesh.material =
                    spawnMaterial;

                const arrowGeometry =
                    new THREE.ConeGeometry(
                        0.45,
                        1.4,
                        4
                    );

                const arrow =
                    new THREE.Mesh(
                        arrowGeometry,
                        spawnMaterial
                    );

                arrow.position.y =
                    object.size.y / 2 +
                    0.8;

                arrow.rotation.x =
                    Math.PI;

                mesh.add(arrow);
            }
        }

        // --------------------------------------------------------
        // MODEL
        // --------------------------------------------------------

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

            body.position.y =
                1.5;

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

            head.position.y =
                3.9;

            head.castShadow = true;

            root.add(head);
        }

        // --------------------------------------------------------
        // FOLDER / SCRIPT
        // --------------------------------------------------------

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

            old.traverse(child => {

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
                            material =>
                                material.dispose()
                        );
                    } else {
                        child.material.dispose();
                    }
                }
            });

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

        scene.add(mesh);

        meshes.set(
            object.id,
            mesh
        );

        updateMeshSelection(
            object
        );
    }


    // ============================================================
    // RENDER ALL OBJECTS
    // ============================================================

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


    // ============================================================
    // UPDATE OBJECT MESH
    // ============================================================

    function updateMeshFromObject(
        object
    ) {

        const mesh =
            meshes.get(object.id);

        if (!mesh) {
            renderObject(object);
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
            object.type === "Model"
        ) {
            mesh.scale.set(
                object.size.x / 4,
                object.size.y,
                object.size.z / 4
            );
        }

        else if (
            object.type === "Part" ||
            object.type ===
                "SpawnLocation"
        ) {
            renderObject(object);
        }

        updateMeshSelection(
            object
        );
    }


    // ============================================================
    // SELECTION VISUAL
    // ============================================================

    function updateMeshSelection(
        object
    ) {

        const mesh =
            meshes.get(object.id);

        if (!mesh) {
            return;
        }

        mesh.traverse(child => {

            if (
                child.isMesh &&
                child.material
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
            updateMeshSelection(
                object
            );
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

        if (!gridHelper) {
            return;
        }

        gridHelper.visible =
            state.gridEnabled;
    }


    // ============================================================
    // THREE.JS INITIALIZATION
    // ============================================================

    async function initialize3D() {

        if (!viewport) {
            return;
        }

        try {

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

            camera.position.set(
                state.camera.position.x,
                state.camera.position.y,
                state.camera.position.z
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

            canvas.style.inset = "0";

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

            // Remove old fake viewport
            // layers from the screen.
            if (oldWorld) {
                oldWorld.style.display =
                    "none";
            }

            if (oldWelcome) {
                oldWelcome.style.display =
                    "none";
            }

            if (oldDefaultPart) {
                oldDefaultPart.style.display =
                    "none";
            }

            // ----------------------------------------------------
            // LIGHTING
            // ----------------------------------------------------

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

            // ----------------------------------------------------
            // RAYCASTING
            // ----------------------------------------------------

            raycaster =
                new THREE.Raycaster();

            mouseVector =
                new THREE.Vector2();

            // ----------------------------------------------------
            // GRID
            // ----------------------------------------------------

            createGrid();

            // ----------------------------------------------------
            // EVENTS
            // ----------------------------------------------------

            setup3DInput();

            resizeRenderer();

            window.addEventListener(
                "resize",
                resizeRenderer
            );

            threeReady = true;

            renderWorld();

            animate();

            log(
                "Real 3D WebGL viewport initialized."
            );

            log(
                "WASD camera controls enabled."
            );

            log(
                "Middle/right mouse rotates the camera."
            );

            log(
                "Mouse wheel controls zoom."
            );

            return true;

        } catch (error) {

            console.error(
                "[WebBlox] 3D initialization failed:",
                error
            );

            log(
                "3D renderer failed to initialize.",
                "error"
            );

            return false;
        }
    }


    // ============================================================
    // RESIZE
    // ============================================================

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
                : state.camera.position;

        viewportCoordinates.textContent =
            `X: ${Math.round(p.x)} ` +
            `Y: ${Math.round(p.y)} ` +
            `Z: ${Math.round(p.z)}`;
    }


    function resetCamera() {

        state.camera.target.x = 0;
        state.camera.target.y = 0;
        state.camera.target.z = 0;

        state.camera.yaw = 35;
        state.camera.pitch = -20;

        state.camera.distance = 24;

        updateCamera();

        log(
            "Camera reset."
        );
    }


    function setPerspective() {

        if (!camera) {
            return;
        }

        camera.fov = 60;

        camera.updateProjectionMatrix();

        if (viewportMode) {
            viewportMode.textContent =
                "Perspective";
        }

        log(
            "Perspective camera enabled."
        );
    }


    function setTopCamera() {

        state.camera.yaw = 0;
        state.camera.pitch = -89;
        state.camera.distance = 30;

        updateCamera();

        if (viewportMode) {
            viewportMode.textContent =
                "Top";
        }

        log(
            "Top camera enabled."
        );
    }


    // ============================================================
    // CAMERA MOVEMENT
    // ============================================================

    function updateMovement(delta) {

        if (!threeReady) {
            return;
        }

        if (
            document.activeElement &&
            (
                document.activeElement.tagName ===
                    "INPUT" ||
                document.activeElement.tagName ===
                    "TEXTAREA" ||
                document.activeElement.tagName ===
                    "SELECT"
            )
        ) {
            return;
        }

        if (
            state.mouse.down
        ) {
            return;
        }

        if (
            !state.keys.size
        ) {
            return;
        }

        const speed =
            state.keys.has("shift")
                ? 35
                : 16;

        const amount =
            speed * delta;

        const yaw =
            THREE.MathUtils.degToRad(
                state.camera.yaw
            );

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

        const length =
            Math.hypot(
                forward,
                right
            );

        if (!length) {
            return;
        }

        forward /= length;
        right /= length;

        state.camera.target.x +=
            (
                Math.sin(yaw) *
                    forward +
                Math.cos(yaw) *
                    right
            ) * amount;

        state.camera.target.z +=
            (
                Math.cos(yaw) *
                    forward -
                Math.sin(yaw) *
                    right
            ) * amount;

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

        if (!state.mouse.down) {
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

        state.mouse.down =
            false;

        if (canvas) {
            canvas.style.cursor =
                "default";
        }
    }


    function handleWheel(event) {

        event.preventDefault();

        const amount =
            event.deltaY > 0
                ? 2
                : -2;

        state.camera.distance =
            clamp(
                state.camera.distance +
                    amount,
                state.camera.minDistance,
                state.camera.maxDistance
            );

        updateCamera();
    }


    // ============================================================
    // 3D SELECTION
    // ============================================================

    function selectFromViewport(
        event
    ) {

        if (
            !raycaster ||
            !camera ||
            !canvas
        ) {
            return;
        }

        if (
            event.button !== 0
        ) {
            return;
        }

        if (
            state.tool !==
            "select"
        ) {
            return;
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
            ) * 2 - 1;

        mouseVector.y =
            -(
                (
                    event.clientY -
                    rect.top
                ) /
                    rect.height
            ) * 2 + 1;

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
            clearSelection();
            return;
        }

        let current =
            hits[0].object;

        let id = null;

        while (
            current
        ) {

            if (
                current.userData &&
                current.userData.objectId
            ) {
                id =
                    current.userData.objectId;

                break;
            }

            current =
                current.parent;
        }

        if (id) {
            selectObject(id);
        }
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
                    event.button === 0
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
            onPointerMove
        );

        window.addEventListener(
            "pointerup",
            onPointerUp
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
                (now - lastFrame) /
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
    // SELECTION
    // ============================================================

    function selectObject(id) {

        const object =
            state.objects.get(id);

        if (!object) {
            return;
        }

        state.selectedId =
            id;

        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();

        if (studioMessage) {
            studioMessage.textContent =
                `Selected ${object.name}`;
        }

        if (viewportMode) {
            viewportMode.textContent =
                "Select";
        }
    }


    function clearSelection() {

        state.selectedId =
            null;

        updateSelectionVisual();

        updateProperties();

        updateExplorerSelection();

        if (studioMessage) {
            studioMessage.textContent =
                "Nothing selected";
        }
    }


    // ============================================================
    // SELECTION BOX
    // ============================================================

    function updateSelectionBox() {

        if (!selectionBox) {
            return;
        }

        /*
         * The old HTML selection box belongs to
         * the fake CSS renderer.
         *
         * Real WebGL selection is handled by
         * emissive highlighting.
         */
        selectionBox.classList.add(
            "hidden"
        );
    }


    // ============================================================
    // EXPLORER ICONS
    // ============================================================

    function getObjectIcon(
        type
    ) {

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


    // ============================================================
    // EXPLORER
    // ============================================================

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
                    ${getObjectIcon(
                        object.type
                    )}
                </span>
                <span class="tree-name">
                    ${escapeHTML(
                        object.name
                    )}
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

                if (
                    !id ||
                    id === "workspace" ||
                    id === "camera" ||
                    id === "lighting" ||
                    id === "starterPlayer" ||
                    id === "starterGui"
                ) {
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

                            const name =
                                item.textContent
                                    .toLowerCase();

                            item.style.display =
                                !query ||
                                name.includes(
                                    query
                                )
                                    ? ""
                                    : "none";
                        });
                }
            );
    }


    // ============================================================
    // PROPERTIES
    // ============================================================

    function setInput(
        id,
        value
    ) {

        const input =
            $(id);

        if (!input) {
            return;
        }

        input.value =
            value;
    }


    function setChecked(
        id,
        value
    ) {

        const input =
            $(id);

        if (!input) {
            return;
        }

        input.checked =
            Boolean(value);
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
            .add("hidden");

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


    function setupProperties() {

        const propertyInputs =
            document.querySelectorAll(
                "[data-property]"
            );

        propertyInputs.forEach(
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

                        state.game.saved =
                            false;

                        updateMeshFromObject(
                            object
                        );

                        updateProperties();

                        updateExplorer();

                        updateGameStatus();
                    }
                );
            }
        );
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
            object[parts[0]] =
                {};
        }

        object[parts[0]][
            parts[1]
        ] = value;
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

                id:
                    makeId(
                        type.toLowerCase()
                    ),

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

        if (type === "Script") {
            object.script =
                "-- WebBlox Luau\n\n";
        }

        if (type === "Folder") {
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
            scene.remove(
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


    function restoreSnapshot(
        snapshot
    ) {

        state.objects.clear();

        for (
            const object
            of snapshot.objects
        ) {
            state.objects.set(
                object.id,
                object
            );
        }

        state.selectedId =
            snapshot.selectedId;

        state.game =
            snapshot.game;

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

        const previous =
            state.history.pop();

        restoreSnapshot(
            previous
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

        const next =
            state.future.pop();

        restoreSnapshot(
            next
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
            version: 2,

            game: state.game,

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
                        state.game =
                            {
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
    // NEW GAME
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
            state.game.name.trim() === "" ||
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

        /*
         * Icon and description are optional.
         * Title is mandatory.
         */

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


    // ============================================================
    // GAME STATUS
    // ============================================================

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

    function playGame() {

        if (state.playing) {
            return;
        }

        state.playing =
            true;

        $("playButton")
            ?.setAttribute(
                "disabled",
                ""
            );

        const stop =
            $("stopButton");

        if (stop) {
            stop.removeAttribute(
                "disabled"
            );
        }

        log(
            "Play mode started."
        );

        showToast(
            "Play mode started"
        );
    }


    function stopGame() {

        if (!state.playing) {
            return;
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
            "Play mode stopped."
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

        /*
         * Transform tools are intentionally
         * basic during Stage 2.
         *
         * Properties are already fully
         * editable and synchronized.
         */
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

                state.keys.add(
                    key
                );

                if (
                    event.ctrlKey &&
                    key === "z"
                ) {

                    event.preventDefault();

                    if (event.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }

                    return;
                }

                if (
                    event.ctrlKey &&
                    key === "y"
                ) {

                    event.preventDefault();

                    redo();

                    return;
                }

                if (
                    event.key ===
                    "Delete"
                ) {

                    if (
                        document.activeElement
                            ?.tagName ===
                            "INPUT"
                    ) {
                        return;
                    }

                    deleteSelected();
                }

                if (
                    event.key ===
                    "Escape"
                ) {
                    clearSelection();
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
            }
        );
    }


    // ============================================================
    // BUTTONS
    // ============================================================

    function setupButtons() {

        // --------------------------------------------------------
        // Main toolbar
        // --------------------------------------------------------

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
        // Tools
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
        // Grid
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
        // Snap
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
        // Camera
        // --------------------------------------------------------

        $("cameraPerspectiveButton")
            ?.addEventListener(
                "click",
                setPerspective
            );

        $("cameraTopButton")
            ?.addEventListener(
                "click",
                setTopCamera
            );

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
        // Add object
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
        // Refresh explorer
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
        // Welcome button
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
        // Output
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
        // Modals
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
        // Menu actions
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
        // Property search
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

        // --------------------------------------------------------
        // Property filter
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // Context menu
        // --------------------------------------------------------

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


    function toggleMenu(
        id
    ) {

        const menu =
            $(id);

        if (!menu) {
            return;
        }

        const wasHidden =
            menu.classList.contains(
                "hidden"
            );

        closeMenus();

        if (wasHidden) {
            menu.classList.remove(
                "hidden"
            );
        }
    }


    // ============================================================
    // ACTION HANDLER
    // ============================================================

    function handleAction(
        action
    ) {

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

                const objectElement =
                    event.target.closest(
                        ".tree-item"
                    );

                if (!objectElement) {
                    return;
                }

                const id =
                    objectElement.dataset
                        .objectId;

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

                    case "select":
                        break;

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
    // HIDE OLD WELCOME / CSS WORLD
    // ============================================================

    function removeOldViewport() {

        const elements = [
            $("viewportWelcome"),
            $("defaultPart"),
            $("world")
        ];

        elements.forEach(
            element => {

                if (!element) {
                    return;
                }

                element.style.display =
                    "none";

                element.style.visibility =
                    "hidden";

                element.style.pointerEvents =
                    "none";
            }
        );

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

        if (
            viewportMode
        ) {
            viewportMode.textContent =
                "Perspective";
        }

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

        setPerspective,

        setTopCamera,

        setTool,

        renderWorld,

        publishGame
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
