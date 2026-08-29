/*
 * ============================================================
 * WebBlox Studio - Stage 2
 * REAL 3D VIEWPORT
 * ============================================================
 *
 * Adds:
 *
 * - Real WebGL 3D viewport
 * - Perspective camera
 * - Orthographic top camera
 * - Grid
 * - Lighting
 * - 3D parts
 * - 3D spawn locations
 * - Raycast selection
 * - Move tool
 * - Scale tool
 * - Rotate tool
 * - WASD movement
 * - Shift fast movement
 * - Right/middle mouse camera control
 * - Mouse wheel zoom
 * - Smooth camera movement
 * - Object synchronization with WebBloxStudio.state
 * - Explorer synchronization
 * - Properties synchronization
 *
 * Existing Studio systems remain the source of truth.
 */

(() => {
    "use strict";

    // ============================================================
    // CONFIG
    // ============================================================

    const THREE_URL =
        "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

    const ORBIT_URL =
        "https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/controls/OrbitControls.js";

    const TRANSFORM_URL =
        "https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/controls/TransformControls.js";

    const THREE_IMPORT_TIMEOUT = 15000;

    // ============================================================
    // STATE
    // ============================================================

    let THREE = null;
    let OrbitControls = null;
    let TransformControls = null;

    let scene = null;
    let renderer = null;

    let camera = null;
    let topCamera = null;

    let orbit = null;
    let transform = null;

    let viewport = null;
    let canvas = null;

    let gridHelper = null;
    let ground = null;

    let initialized = false;
    let loadingThree = false;

    let objectMeshes = new Map();

    let selectedMesh = null;

    let resizeObserver = null;

    let lastSync = 0;

    let cameraMode = "perspective";

    let keys = new Set();

    let manualCameraMode = false;

    // ============================================================
    // HELPERS
    // ============================================================

    function $(id) {
        return document.getElementById(id);
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function getStudio() {
        return window.WebBloxStudio || null;
    }

    function getState() {
        const studio =
            getStudio();

        return studio?.state || null;
    }

    function getObject(id) {
        const state =
            getState();

        if (!state?.objects) {
            return null;
        }

        return state.objects.get(id) || null;
    }

    function log(message) {
        const consoleElement =
            $("outputConsole");

        if (!consoleElement) {
            return;
        }

        const line =
            document.createElement("div");

        line.className =
            "console-line console-info";

        line.innerHTML = `
            <span class="console-time">
                [Stage 2]
            </span>

            <span>
                ${escapeHTML(message)}
            </span>
        `;

        consoleElement.appendChild(
            line
        );

        consoleElement.scrollTop =
            consoleElement.scrollHeight;
    }

    function escapeHTML(value) {
        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    // ============================================================
    // LOAD THREE.JS
    // ============================================================

    async function loadThree() {
        if (THREE) {
            return;
        }

        if (loadingThree) {
            while (
                loadingThree &&
                !THREE
            ) {
                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            50
                        )
                );
            }

            return;
        }

        loadingThree = true;

        const timeout =
            new Promise(
                (_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    "Three.js timed out."
                                )
                            ),
                        THREE_IMPORT_TIMEOUT
                    )
            );

        try {
            const modules =
                await Promise.race([
                    Promise.all([
                        import(
                            THREE_URL
                        ),
                        import(
                            ORBIT_URL
                        ),
                        import(
                            TRANSFORM_URL
                        )
                    ]),
                    timeout
                ]);

            THREE =
                modules[0];

            OrbitControls =
                modules[1]
                    .OrbitControls;

            TransformControls =
                modules[2]
                    .TransformControls;

            log(
                "Three.js 3D engine loaded."
            );

        } catch (error) {
            console.error(
                "[WebBlox Studio Stage 2]",
                error
            );

            show3DError(
                "Unable to load the 3D engine."
            );

            throw error;

        } finally {
            loadingThree = false;
        }
    }

    // ============================================================
    // ERROR
    // ============================================================

    function show3DError(message) {
        if (!viewport) {
            return;
        }

        let error =
            document.getElementById(
                "webbloxStage2Error"
            );

        if (!error) {
            error =
                document.createElement(
                    "div"
                );

            error.id =
                "webbloxStage2Error";

            error.style.position =
                "absolute";

            error.style.inset =
                "0";

            error.style.zIndex =
                "9999";

            error.style.display =
                "flex";

            error.style.alignItems =
                "center";

            error.style.justifyContent =
                "center";

            error.style.flexDirection =
                "column";

            error.style.gap =
                "10px";

            error.style.background =
                "#111";

            error.style.color =
                "#fff";

            error.style.fontFamily =
                "Arial, sans-serif";

            viewport.appendChild(
                error
            );
        }

        error.innerHTML = `
            <strong>
                WebBlox 3D Engine Error
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

            <button
                type="button"
                id="webbloxStage2Retry"
                style="
                    padding:8px 14px;
                    border:1px solid #555;
                    border-radius:6px;
                    background:#222;
                    color:white;
                    cursor:pointer;
                "
            >
                Retry
            </button>
        `;

        document
            .getElementById(
                "webbloxStage2Retry"
            )
            ?.addEventListener(
                "click",
                () => {
                    error.remove();

                    initialize();
                }
            );
    }

    // ============================================================
    // CREATE SCENE
    // ============================================================

    function createScene() {
        scene =
            new THREE.Scene();

        scene.background =
            new THREE.Color(
                0x101010
            );

        scene.fog =
            new THREE.Fog(
                0x101010,
                150,
                500
            );

        // --------------------------------------------------------
        // Perspective camera
        // --------------------------------------------------------

        camera =
            new THREE.PerspectiveCamera(
                65,
                1,
                0.05,
                2000
            );

        camera.position.set(
            0,
            8,
            18
        );

        camera.lookAt(
            0,
            0,
            0
        );

        // --------------------------------------------------------
        // Top camera
        // --------------------------------------------------------

        topCamera =
            new THREE.OrthographicCamera(
                -20,
                20,
                20,
                -20,
                0.1,
                2000
            );

        topCamera.position.set(
            0,
            40,
            0
        );

        topCamera.lookAt(
            0,
            0,
            0
        );

        // --------------------------------------------------------
        // Renderer
        // --------------------------------------------------------

        renderer =
            new THREE.WebGLRenderer({
                antialias: true,
                alpha: false,
                powerPreference:
                    "high-performance"
            });

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );

        renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        renderer.shadowMap.enabled =
            true;

        renderer.shadowMap.type =
            THREE.PCFSoftShadowMap;

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
            "2";

        canvas.style.cursor =
            "default";

        viewport.appendChild(
            canvas
        );

        // --------------------------------------------------------
        // Lighting
        // --------------------------------------------------------

        const ambient =
            new THREE.HemisphereLight(
                0xffffff,
                0x303030,
                2.0
            );

        scene.add(
            ambient
        );

        const sun =
            new THREE.DirectionalLight(
                0xffffff,
                3
            );

        sun.position.set(
            30,
            60,
            20
        );

        sun.castShadow =
            true;

        sun.shadow.mapSize.width =
            2048;

        sun.shadow.mapSize.height =
            2048;

        sun.shadow.camera.left =
            -100;

        sun.shadow.camera.right =
            100;

        sun.shadow.camera.top =
            100;

        sun.shadow.camera.bottom =
            -100;

        scene.add(
            sun
        );

        // --------------------------------------------------------
        // Ground
        // --------------------------------------------------------

        const groundGeometry =
            new THREE.PlaneGeometry(
                1000,
                1000
            );

        const groundMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x171717,
                roughness: 0.9,
                metalness: 0
            });

        ground =
            new THREE.Mesh(
                groundGeometry,
                groundMaterial
            );

        ground.rotation.x =
            -Math.PI / 2;

        ground.position.y =
            -0.51;

        ground.receiveShadow =
            true;

        ground.name =
            "__WebBloxGround";

        scene.add(
            ground
        );

        // --------------------------------------------------------
        // Grid
        // --------------------------------------------------------

        gridHelper =
            new THREE.GridHelper(
                500,
                500,
                0x555555,
                0x292929
            );

        gridHelper.position.y =
            -0.49;

        scene.add(
            gridHelper
        );

        // --------------------------------------------------------
        // Axes
        // --------------------------------------------------------

        const axes =
            new THREE.AxesHelper(
                5
            );

        axes.name =
            "__WebBloxAxes";

        scene.add(
            axes
        );
    }

    // ============================================================
    // CONTROLS
    // ============================================================

    function createControls() {
        orbit =
            new OrbitControls(
                camera,
                canvas
            );

        orbit.enableDamping =
            true;

        orbit.dampingFactor =
            0.075;

        orbit.enablePan =
            true;

        orbit.panSpeed =
            1.2;

        orbit.rotateSpeed =
            0.55;

        orbit.zoomSpeed =
            1.5;

        orbit.minDistance =
            1;

        orbit.maxDistance =
            500;

        orbit.maxPolarAngle =
            Math.PI * 0.495;

        orbit.target.set(
            0,
            0,
            0
        );

        orbit.update();

        transform =
            new TransformControls(
                camera,
                canvas
            );

        transform.setMode(
            "translate"
        );

        transform.setSpace(
            "world"
        );

        transform.setSize(
            0.9
        );

        transform.addEventListener(
            "dragging-changed",
            event => {
                orbit.enabled =
                    !event.value;
            }
        );

        transform.addEventListener(
            "change",
            () => {
                if (
                    !selectedMesh
                ) {
                    return;
                }

                syncMeshToStudio(
                    selectedMesh
                );
            }
        );

        transform.addEventListener(
            "mouseDown",
            () => {
                const studio =
                    getStudio();

                if (
                    studio?.state
                ) {
                    studio.state.game.saved =
                        false;
                }
            }
        );

        scene.add(
            transform
        );

        // --------------------------------------------------------
        // Camera controls
        // --------------------------------------------------------

        orbit.addEventListener(
            "change",
            updateCameraStatus
        );
    }

    // ============================================================
    // RESIZE
    // ============================================================

    function resize() {
        if (
            !viewport ||
            !renderer
        ) {
            return;
        }

        const width =
            Math.max(
                viewport.clientWidth,
                1
            );

        const height =
            Math.max(
                viewport.clientHeight,
                1
            );

        renderer.setSize(
            width,
            height,
            false
        );

        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();

        const aspect =
            width / height;

        const size =
            30;

        topCamera.left =
            -size * aspect;

        topCamera.right =
            size * aspect;

        topCamera.top =
            size;

        topCamera.bottom =
            -size;

        topCamera.updateProjectionMatrix();
    }

    // ============================================================
    // MATERIAL
    // ============================================================

    function createMaterial(
        object
    ) {
        let color =
            object.color ||
            "#808080";

        if (
            typeof color !==
            "string"
        ) {
            color =
                "#808080";
        }

        const material =
            new THREE.MeshStandardMaterial({
                color,
                roughness:
                    materialRoughness(
                        object.material
                    ),
                metalness:
                    materialMetalness(
                        object.material
                    ),
                transparent:
                    object.material ===
                    "Glass",
                opacity:
                    object.material ===
                    "Glass"
                        ? 0.55
                        : 1
            });

        return material;
    }

    function materialRoughness(
        material
    ) {
        switch (
            material
        ) {
            case "SmoothPlastic":
                return 0.35;

            case "Metal":
                return 0.22;

            case "Glass":
                return 0.08;

            case "Wood":
                return 0.75;

            case "Concrete":
                return 0.95;

            default:
                return 0.7;
        }
    }

    function materialMetalness(
        material
    ) {
        return material ===
            "Metal"
            ? 0.8
            : 0;
    }

    // ============================================================
    // CREATE 3D OBJECT
    // ============================================================

    function createMeshForObject(
        object
    ) {
        if (!object) {
            return null;
        }

        const size =
            object.size || {
                x: 4,
                y: 1,
                z: 4
            };

        const sx =
            Math.max(
                Number(size.x) || 1,
                0.05
            );

        const sy =
            Math.max(
                Number(size.y) || 1,
                0.05
            );

        const sz =
            Math.max(
                Number(size.z) || 1,
                0.05
            );

        let geometry;

        if (
            object.type ===
            "SpawnLocation"
        ) {
            geometry =
                new THREE.CylinderGeometry(
                    Math.min(
                        sx,
                        sz
                    ) * 0.45,
                    Math.min(
                        sx,
                        sz
                    ) * 0.45,
                    Math.max(
                        sy,
                        0.25
                    ),
                    32
                );
        } else if (
            object.type ===
            "Model"
        ) {
            geometry =
                new THREE.BoxGeometry(
                    sx,
                    sy,
                    sz
                );
        } else {
            geometry =
                new THREE.BoxGeometry(
                    sx,
                    sy,
                    sz
                );
        }

        const material =
            createMaterial(
                object
            );

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.name =
            object.name ||
            object.type ||
            "Part";

        mesh.userData.webbloxId =
            object.id;

        mesh.userData.webbloxType =
            object.type;

        mesh.castShadow =
            object.castShadow !==
            false;

        mesh.receiveShadow =
            true;

        if (
            object.type ===
            "SpawnLocation"
        ) {
            mesh.material.color.set(
                0x4caf50
            );
        }

        updateMeshTransform(
            mesh,
            object
        );

        return mesh;
    }

    // ============================================================
    // UPDATE TRANSFORM
    // ============================================================

    function updateMeshTransform(
        mesh,
        object
    ) {
        const position =
            object.position || {};

        const rotation =
            object.rotation || {};

        const size =
            object.size || {};

        mesh.position.set(
            Number(position.x) || 0,
            Number(position.y) || 0,
            Number(position.z) || 0
        );

        mesh.rotation.set(
            THREE.MathUtils.degToRad(
                Number(rotation.x) || 0
            ),
            THREE.MathUtils.degToRad(
                Number(rotation.y) || 0
            ),
            THREE.MathUtils.degToRad(
                Number(rotation.z) || 0
            )
        );

        mesh.scale.set(
            Math.max(
                Number(size.x) || 1,
                0.05
            ) /
                mesh.geometry.parameters
                    ?.width ||
                1,

            Math.max(
                Number(size.y) || 1,
                0.05
            ) /
                mesh.geometry.parameters
                    ?.height ||
                1,

            Math.max(
                Number(size.z) || 1,
                0.05
            ) /
                mesh.geometry.parameters
                    ?.depth ||
                1
        );

        /*
         * The scale calculation above is unreliable for
         * cylinders. For normal parts, recreate geometry
         * when dimensions change.
         */
        if (
            object.type !==
            "SpawnLocation"
        ) {
            const currentSize =
                mesh.userData.currentSize;

            const changed =
                !currentSize ||
                currentSize.x !==
                    Number(size.x) ||
                currentSize.y !==
                    Number(size.y) ||
                currentSize.z !==
                    Number(size.z);

            if (changed) {
                const geometry =
                    new THREE.BoxGeometry(
                        Math.max(
                            Number(size.x) || 1,
                            0.05
                        ),
                        Math.max(
                            Number(size.y) || 1,
                            0.05
                        ),
                        Math.max(
                            Number(size.z) || 1,
                            0.05
                        )
                    );

                mesh.geometry.dispose();

                mesh.geometry =
                    geometry;

                mesh.scale.set(
                    1,
                    1,
                    1
                );

                mesh.userData.currentSize = {
                    x:
                        Number(size.x) || 1,
                    y:
                        Number(size.y) || 1,
                    z:
                        Number(size.z) || 1
                };
            }
        }
    }

    // ============================================================
    // SYNC STUDIO → THREE
    // ============================================================

    function syncScene() {
        const state =
            getState();

        if (
            !state?.objects ||
            !scene
        ) {
            return;
        }

        const activeIds =
            new Set();

        for (
            const object
            of state.objects.values()
        ) {
            /*
             * Only render actual 3D world
             * objects.
             */
            if (
                object.type ===
                    "Folder" ||
                object.type ===
                    "Script" ||
                object.type ===
                    "Camera" ||
                object.type ===
                    "Lighting" ||
                object.type ===
                    "StarterPlayer" ||
                object.type ===
                    "StarterGui" ||
                object.type ===
                    "Workspace"
            ) {
                continue;
            }

            activeIds.add(
                object.id
            );

            let mesh =
                objectMeshes.get(
                    object.id
                );

            if (!mesh) {
                mesh =
                    createMeshForObject(
                        object
                    );

                if (!mesh) {
                    continue;
                }

                scene.add(
                    mesh
                );

                objectMeshes.set(
                    object.id,
                    mesh
                );
            }

            updateMeshTransform(
                mesh,
                object
            );

            mesh.visible =
                true;

            mesh.name =
                object.name;

            mesh.userData.webbloxId =
                object.id;

            updateMaterial(
                mesh,
                object
            );
        }

        // --------------------------------------------------------
        // Remove deleted objects
        // --------------------------------------------------------

        for (
            const [
                id,
                mesh
            ]
            of objectMeshes
        ) {
            if (
                !activeIds.has(id)
            ) {
                if (
                    selectedMesh ===
                    mesh
                ) {
                    clearThreeSelection();
                }

                scene.remove(
                    mesh
                );

                disposeMesh(
                    mesh
                );

                objectMeshes.delete(
                    id
                );
            }
        }

        // --------------------------------------------------------
        // Selection
        // --------------------------------------------------------

        const selectedId =
            state.selectedId;

        if (
            selectedId &&
            objectMeshes.has(
                selectedId
            )
        ) {
            const mesh =
                objectMeshes.get(
                    selectedId
                );

            if (
                selectedMesh !==
                mesh
            ) {
                selectThreeMesh(
                    mesh,
                    false
                );
            }
        } else if (
            !selectedId
        ) {
            clearThreeSelection();
        }
    }

    function updateMaterial(
        mesh,
        object
    ) {
        if (
            !mesh.material
        ) {
            return;
        }

        const material =
            mesh.material;

        if (
            object.type ===
            "SpawnLocation"
        ) {
            material.color.set(
                0x4caf50
            );
        } else {
            material.color.set(
                object.color ||
                    "#808080"
            );
        }

        material.roughness =
            materialRoughness(
                object.material
            );

        material.metalness =
            materialMetalness(
                object.material
            );

        material.transparent =
            object.material ===
            "Glass";

        material.opacity =
            object.material ===
            "Glass"
                ? 0.55
                : 1;
    }

    function disposeMesh(
        mesh
    ) {
        if (
            mesh.geometry
        ) {
            mesh.geometry.dispose();
        }

        if (
            mesh.material
        ) {
            if (
                Array.isArray(
                    mesh.material
                )
            ) {
                mesh.material.forEach(
                    material =>
                        material.dispose()
                );
            } else {
                mesh.material.dispose();
            }
        }
    }

    // ============================================================
    // SELECTION
    // ============================================================

    const raycaster =
        {
            current: null
        };

    let mouseNDC = null;

    function setupSelection() {
        raycaster.current =
            new THREE.Raycaster();

        mouseNDC =
            new THREE.Vector2();

        canvas.addEventListener(
            "pointerdown",
            event => {
                if (
                    event.button !==
                    0
                ) {
                    return;
                }

                /*
                 * Don't select while a
                 * transform control is active.
                 */
                if (
                    transform?.dragging
                ) {
                    return;
                }

                const rect =
                    canvas.getBoundingClientRect();

                mouseNDC.x =
                    (
                        (
                            event.clientX -
                            rect.left
                        ) /
                            rect.width
                    ) *
                        2 -
                    1;

                mouseNDC.y =
                    -(
                        (
                            event.clientY -
                            rect.top
                        ) /
                            rect.height
                    ) *
                        2 +
                    1;

                const activeCamera =
                    getActiveCamera();

                raycaster.current.setFromCamera(
                    mouseNDC,
                    activeCamera
                );

                const meshes =
                    [...objectMeshes.values()];

                const hits =
                    raycaster.current.intersectObjects(
                        meshes,
                        false
                    );

                if (
                    !hits.length
                ) {
                    clearThreeSelection();

                    const studio =
                        getStudio();

                    studio?.clearSelection?.();

                    return;
                }

                const mesh =
                    hits[0].object;

                selectThreeMesh(
                    mesh,
                    true
                );
            }
        );
    }

    function selectThreeMesh(
        mesh,
        updateStudio
    ) {
        if (
            !mesh
        ) {
            return;
        }

        selectedMesh =
            mesh;

        if (
            transform
        ) {
            transform.attach(
                mesh
            );

            applyToolMode();
        }

        if (
            updateStudio
        ) {
            const id =
                mesh.userData
                    .webbloxId;

            const studio =
                getStudio();

            studio?.selectObject?.(
                id
            );
        }

        highlightMesh(
            mesh
        );
    }

    function highlightMesh(
        mesh
    ) {
        for (
            const other
            of objectMeshes.values()
        ) {
            if (
                other.material?.emissive
            ) {
                other.material.emissive.set(
                    0x000000
                );
            }
        }

        if (
            mesh.material?.emissive
        ) {
            mesh.material.emissive.set(
                0x333333
            );
        }
    }

    function clearThreeSelection() {
        selectedMesh =
            null;

        if (
            transform
        ) {
            transform.detach();
        }

        for (
            const mesh
            of objectMeshes.values()
        ) {
            if (
                mesh.material?.emissive
            ) {
                mesh.material.emissive.set(
                    0x000000
                );
            }
        }
    }

    // ============================================================
    // TRANSFORM TOOLS
    // ============================================================

    function setupTools() {
        const tools = [
            [
                "selectTool",
                "select"
            ],
            [
                "moveTool",
                "translate"
            ],
            [
                "scaleTool",
                "scale"
            ],
            [
                "rotateTool",
                "rotate"
            ]
        ];

        tools.forEach(
            ([id, mode]) => {
                $(id)?.addEventListener(
                    "click",
                    () => {
                        setTool(
                            mode
                        );
                    }
                );
            }
        );

        /*
         * Existing Studio uses:
         *
         * select
         * move
         * scale
         * rotate
         */
    }

    function setTool(
        mode
    ) {
        const studio =
            getStudio();

        if (
            mode ===
            "select"
        ) {
            studio?.setTool?.(
                "select"
            );
        } else {
            studio?.setTool?.(
                mode ===
                    "translate"
                    ? "move"
                    : mode
            );
        }

        applyToolMode();
    }

    function applyToolMode() {
        if (
            !transform
        ) {
            return;
        }

        const state =
            getState();

        const tool =
            state?.tool ||
            "select";

        if (
            tool ===
            "move"
        ) {
            transform.setMode(
                "translate"
            );

            transform.enabled =
                true;
        } else if (
            tool ===
            "scale"
        ) {
            transform.setMode(
                "scale"
            );

            transform.enabled =
                true;
        } else if (
            tool ===
            "rotate"
        ) {
            transform.setMode(
                "rotate"
            );

            transform.enabled =
                true;
        } else {
            transform.enabled =
                false;
        }

        if (
            selectedMesh &&
            transform.enabled
        ) {
            transform.attach(
                selectedMesh
            );
        }
    }

    // ============================================================
    // THREE → STUDIO
    // ============================================================

    function syncMeshToStudio(
        mesh
    ) {
        if (
            !mesh
        ) {
            return;
        }

        const studio =
            getStudio();

        const state =
            getState();

        if (
            !studio ||
            !state
        ) {
            return;
        }

        const id =
            mesh.userData
                .webbloxId;

        const object =
            state.objects.get(
                id
            );

        if (
            !object
        ) {
            return;
        }

        object.position.x =
            snapValue(
                mesh.position.x
            );

        object.position.y =
            snapValue(
                mesh.position.y
            );

        object.position.z =
            snapValue(
                mesh.position.z
            );

        object.rotation.x =
            snapRotation(
                mesh.rotation.x
            );

        object.rotation.y =
            snapRotation(
                mesh.rotation.y
            );

        object.rotation.z =
            snapRotation(
                mesh.rotation.z
            );

        if (
            object.type !==
            "SpawnLocation"
        ) {
            const width =
                mesh.geometry
                    ?.parameters
                    ?.width;

            const height =
                mesh.geometry
                    ?.parameters
                    ?.height;

            const depth =
                mesh.geometry
                    ?.parameters
                    ?.depth;

            if (
                width
            ) {
                object.size.x =
                    snapValue(
                        width
                    );
            }

            if (
                height
            ) {
                object.size.y =
                    snapValue(
                        height
                    );
            }

            if (
                depth
            ) {
                object.size.z =
                    snapValue(
                        depth
                    );
            }
        }

        state.game.saved =
            false;

        updateProperties();

        updateExplorer();

        updateCameraStatus();
    }

    function snapValue(
        value
    ) {
        const state =
            getState();

        if (
            !state?.snapEnabled
        ) {
            return Number(
                value.toFixed(3)
            );
        }

        return Math.round(
            value
        );
    }

    function snapRotation(
        radians
    ) {
        const degrees =
            THREE.MathUtils.radToDeg(
                radians
            );

        const state =
            getState();

        if (
            !state?.snapEnabled
        ) {
            return Number(
                degrees.toFixed(2)
            );
        }

        return Math.round(
            degrees / 15
        ) * 15;
    }

    // ============================================================
    // PROPERTY SYNC
    // ============================================================

    function updateProperties() {
        const studio =
            getStudio();

        const state =
            getState();

        if (
            !studio ||
            !state
        ) {
            return;
        }

        /*
         * Let the original Studio update
         * its own Properties panel.
         *
         * We only make sure the mesh follows
         * the changed values.
         */
        const selectedId =
            state.selectedId;

        if (
            selectedId &&
            objectMeshes.has(
                selectedId
            )
        ) {
            const mesh =
                objectMeshes.get(
                    selectedId
                );

            const object =
                state.objects.get(
                    selectedId
                );

            if (
                object
            ) {
                updateMeshTransform(
                    mesh,
                    object
                );

                updateMaterial(
                    mesh,
                    object
                );
            }
        }
    }

    // ============================================================
    // EXISTING STUDIO EVENTS
    // ============================================================

    function hookStudioEvents() {
        document.addEventListener(
            "click",
            event => {
                const treeItem =
                    event.target.closest(
                        ".tree-item[data-object-id]"
                    );

                if (
                    !treeItem
                ) {
                    return;
                }

                const id =
                    treeItem.dataset
                        .objectId;

                setTimeout(
                    () => {
                        const state =
                            getState();

                        if (
                            state?.selectedId ===
                            id
                        ) {
                            const mesh =
                                objectMeshes.get(
                                    id
                                );

                            if (
                                mesh
                            ) {
                                selectThreeMesh(
                                    mesh,
                                    false
                                );
                            }
                        }
                    },
                    0
                );
            }
        );

        /*
         * Property fields can change the Studio
         * state. Wait one frame and sync the
         * corresponding mesh.
         */
        document.addEventListener(
            "input",
            event => {
                if (
                    !event.target.closest(
                        "#propertiesPanel"
                    )
                ) {
                    return;
                }

                requestAnimationFrame(
                    () => {
                        syncScene();
                    }
                );
            }
        );

        document.addEventListener(
            "change",
            event => {
                if (
                    !event.target.closest(
                        "#propertiesPanel"
                    )
                ) {
                    return;
                }

                requestAnimationFrame(
                    () => {
                        syncScene();
                    }
                );
            }
        );

        /*
         * Studio's own object creation/deletion
         * happens through its public state.
         * The render loop picks those changes up.
         */
    }

    // ============================================================
    // CAMERA
    // ============================================================

    function getActiveCamera() {
        return cameraMode ===
            "top"
            ? topCamera
            : camera;
    }

    function setupCameraButtons() {
        $(
            "cameraPerspectiveButton"
        )?.addEventListener(
            "click",
            () => {
                setPerspective();
            }
        );

        $(
            "cameraTopButton"
        )?.addEventListener(
            "click",
            () => {
                setTop();
            }
        );

        $(
            "cameraReset"
        )?.addEventListener(
            "click",
            () => {
                resetCamera();
            }
        );

        $(
            "cameraZoomIn"
        )?.addEventListener(
            "click",
            () => {
                zoomCamera(
                    -2
                );
            }
        );

        $(
            "cameraZoomOut"
        )?.addEventListener(
            "click",
            () => {
                zoomCamera(
                    2
                );
            }
        );
    }

    function setPerspective() {
        cameraMode =
            "perspective";

        if (
            orbit
        ) {
            orbit.enabled =
                true;
        }

        updateCameraButtons();

        log(
            "Perspective camera enabled."
        );
    }

    function setTop() {
        cameraMode =
            "top";

        if (
            orbit
        ) {
            orbit.enabled =
                false;
        }

        topCamera.position.set(
            0,
            40,
            0
        );

        topCamera.lookAt(
            0,
            0,
            0
        );

        updateCameraButtons();

        log(
            "Top camera enabled."
        );
    }

    function resetCamera() {
        cameraMode =
            "perspective";

        camera.position.set(
            0,
            8,
            18
        );

        camera.lookAt(
            0,
            0,
            0
        );

        orbit.target.set(
            0,
            0,
            0
        );

        orbit.update();

        updateCameraButtons();

        log(
            "3D camera reset."
        );
    }

    function zoomCamera(
        amount
    ) {
        if (
            cameraMode ===
            "top"
        ) {
            const scale =
                clamp(
                    1 +
                        amount *
                        0.04,
                    0.15,
                    4
                );

            const width =
                viewport.clientWidth ||
                1;

            const height =
                viewport.clientHeight ||
                1;

            const aspect =
                width /
                height;

            const base =
                30 *
                scale;

            topCamera.left =
                -base *
                aspect;

            topCamera.right =
                base *
                aspect;

            topCamera.top =
                base;

            topCamera.bottom =
                -base;

            topCamera.updateProjectionMatrix();

            return;
        }

        const direction =
            new THREE.Vector3();

        camera.getWorldDirection(
            direction
        );

        camera.position.addScaledVector(
            direction,
            amount
        );

        orbit.update();
    }

    function updateCameraButtons() {
        $(
            "cameraPerspectiveButton"
        )?.classList.toggle(
            "active",
            cameraMode ===
                "perspective"
        );

        $(
            "cameraTopButton"
        )?.classList.toggle(
            "active",
            cameraMode ===
                "top"
        );
    }

    function updateCameraStatus() {
        const state =
            getState();

        const status =
            $("viewportCoordinates");

        if (
            !status ||
            !camera
        ) {
            return;
        }

        const active =
            getActiveCamera();

        status.textContent =
            `X: ${Math.round(
                active.position.x
            )} ` +
            `Y: ${Math.round(
                active.position.y
            )} ` +
            `Z: ${Math.round(
                active.position.z
            )}`;
    }

    // ============================================================
    // FAST WASD MOVEMENT
    // ============================================================

    function setupKeyboard() {
        window.addEventListener(
            "keydown",
            event => {
                if (
                    isTyping()
                ) {
                    return;
                }

                const key =
                    event.key.toLowerCase();

                if (
                    [
                        "w",
                        "a",
                        "s",
                        "d",
                        "q",
                        "e",
                        "shift"
                    ].includes(
                        key
                    )
                ) {
                    keys.add(
                        key
                    );

                    if (
                        key !==
                        "shift"
                    ) {
                        event.preventDefault();
                    }
                }
            }
        );

        window.addEventListener(
            "keyup",
            event => {
                keys.delete(
                    event.key.toLowerCase()
                );
            }
        );

        window.addEventListener(
            "blur",
            () => {
                keys.clear();
            }
        );
    }

    function isTyping() {
        const active =
            document.activeElement;

        if (
            !active
        ) {
            return false;
        }

        return [
            "INPUT",
            "TEXTAREA",
            "SELECT"
        ].includes(
            active.tagName
        );
    }

    function updateWASD(
        delta
    ) {
        if (
            !camera ||
            cameraMode !==
                "perspective"
        ) {
            return;
        }

        if (
            !keys.size
        ) {
            return;
        }

        /*
         * Faster than the old editor.
         */
        const baseSpeed =
            keys.has("shift")
                ? 65
                : 28;

        const speed =
            baseSpeed *
            delta;

        const forward =
            new THREE.Vector3();

        camera.getWorldDirection(
            forward
        );

        forward.y = 0;

        if (
            forward.lengthSq() >
            0
        ) {
            forward.normalize();
        }

        const right =
            new THREE.Vector3();

        right.crossVectors(
            forward,
            new THREE.Vector3(
                0,
                1,
                0
            )
        );

        right.normalize();

        const movement =
            new THREE.Vector3();

        if (
            keys.has("w")
        ) {
            movement.add(
                forward
            );
        }

        if (
            keys.has("s")
        ) {
            movement.sub(
                forward
            );
        }

        if (
            keys.has("d")
        ) {
            movement.add(
                right
            );
        }

        if (
            keys.has("a")
        ) {
            movement.sub(
                right
            );
        }

        if (
            keys.has("e")
        ) {
            movement.y += 1;
        }

        if (
            keys.has("q")
        ) {
            movement.y -= 1;
        }

        if (
            movement.lengthSq() ===
            0
        ) {
            return;
        }

        movement.normalize();

        camera.position.addScaledVector(
            movement,
            speed
        );

        orbit.target.addScaledVector(
            movement,
            speed
        );

        orbit.update();

        updateCameraStatus();
    }

    // ============================================================
    // MOUSE CAMERA
    // ============================================================

    function setupMouseCamera() {
        /*
         * OrbitControls handles:
         *
         * Left mouse:
         * rotate
         *
         * Middle mouse:
         * pan
         *
         * Right mouse:
         * rotate
         *
         * Wheel:
         * zoom
         *
         * This is much smoother than the old
         * manual CSS camera.
         */

        canvas.addEventListener(
            "contextmenu",
            event =>
                event.preventDefault()
        );

        canvas.addEventListener(
            "wheel",
            event => {
                if (
                    cameraMode !==
                    "perspective"
                ) {
                    return;
                }

                /*
                 * OrbitControls already handles
                 * wheel zoom. This prevents the
                 * browser from scrolling the page.
                 */
                event.preventDefault();
            },
            {
                passive: false
            }
        );
    }

    // ============================================================
    // HIDE OLD WORLD
    // ============================================================

    function hideOldViewport() {
        const oldWorld =
            $("world");

        const oldGrid =
            $("viewportGrid");

        const oldSelection =
            $("selectionBox");

        const oldCrosshair =
            $("viewportCrosshair");

        const oldCameraControls =
            document.querySelector(
                ".viewport-camera-controls"
            );

        /*
         * Hide the fake CSS world.
         */
        if (
            oldWorld
        ) {
            oldWorld.style.display =
                "none";
        }

        if (
            oldGrid
        ) {
            oldGrid.style.display =
                "none";
        }

        if (
            oldSelection
        ) {
            oldSelection.style.display =
                "none";
        }

        if (
            oldCrosshair
        ) {
            oldCrosshair.style.display =
                "none";
        }

        /*
         * Keep the existing viewport
         * status visible.
         */
        viewport.style.position =
            "relative";

        viewport.style.overflow =
            "hidden";

        viewport.style.background =
            "#101010";

        /*
         * The old welcome message should
         * not sit on top of the actual
         * editor.
         */
        const welcome =
            $("viewportWelcome");

        if (
            welcome
        ) {
            welcome.style.display =
                "none";
        }
    }

    // ============================================================
    // OBJECT ICONS
    // ============================================================

    function updateObjectIcons() {
        const icons = {
            Part: "▣",
            SpawnLocation: "◆",
            Model: "◇",
            Folder: "▱",
            Script: "⌘",
            Camera: "◉",
            Lighting: "☀",
            StarterPlayer: "●",
            StarterGui: "▤",
            Workspace: "◈"
        };

        document
            .querySelectorAll(
                ".tree-item[data-object-type]"
            )
            .forEach(
                item => {
                    const type =
                        item.dataset
                            .objectType;

                    const icon =
                        item.querySelector(
                            ".tree-icon"
                        );

                    if (
                        !icon
                    ) {
                        return;
                    }

                    icon.textContent =
                        icons[type] ||
                        "●";

                    icon.dataset.objectType =
                        type;
                }
            );
    }

    // ============================================================
    // RENDER LOOP
    // ============================================================

    let previousTime =
        performance.now();

    function renderLoop(
        now
    ) {
        requestAnimationFrame(
            renderLoop
        );

        const delta =
            Math.min(
                (
                    now -
                    previousTime
                ) /
                    1000,
                0.1
            );

        previousTime =
            now;

        updateWASD(
            delta
        );

        if (
            orbit &&
            cameraMode ===
                "perspective"
        ) {
            orbit.update();
        }

        /*
         * Synchronize at ~30 times/sec
         * instead of rebuilding every frame.
         */
        if (
            now -
                lastSync >
            33
        ) {
            lastSync =
                now;

            syncScene();

            updateObjectIcons();

            applyToolMode();
        }

        const activeCamera =
            getActiveCamera();

        renderer.render(
            scene,
            activeCamera
        );
    }

    // ============================================================
    // INITIALIZE
    // ============================================================

    async function initialize() {
        if (
            initialized
        ) {
            return;
        }

        /*
         * Wait for the original Studio.
         */
        if (
            !window.WebBloxStudio
        ) {
            setTimeout(
                initialize,
                100
            );

            return;
        }

        viewport =
            $("viewport");

        if (
            !viewport
        ) {
            setTimeout(
                initialize,
                100
            );

            return;
        }

        try {
            await loadThree();

            hideOldViewport();

            createScene();

            createControls();

            setupSelection();

            setupTools();

            setupCameraButtons();

            setupKeyboard();

            setupMouseCamera();

            setupTools();

            hookStudioEvents();

            syncScene();

            updateObjectIcons();

            resize();

            resizeObserver =
                new ResizeObserver(
                    resize
                );

            resizeObserver.observe(
                viewport
            );

            window.addEventListener(
                "resize",
                resize
            );

            initialized =
                true;

            log(
                "Real WebGL 3D viewport initialized."
            );

            log(
                "WASD movement speed increased."
            );

            log(
                "Shift enables fast camera movement."
            );

            log(
                "3D transform tools enabled."
            );

            log(
                "3D object selection enabled."
            );

            requestAnimationFrame(
                renderLoop
            );

        } catch (error) {
            console.error(
                "[WebBlox Stage 2]",
                error
            );
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxStudio3D = {
        initialize,

        getScene() {
            return scene;
        },

        getRenderer() {
            return renderer;
        },

        getCamera() {
            return getActiveCamera();
        },

        getSelectedMesh() {
            return selectedMesh;
        },

        syncScene,

        selectMesh:
            selectThreeMesh,

        clearSelection:
            clearThreeSelection,

        setPerspective,

        setTop,

        resetCamera,

        setTool,

        resize
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
            () => {
                setTimeout(
                    initialize,
                    100
                );
            },
            {
                once: true
            }
        );
    } else {
        setTimeout(
            initialize,
            100
        );
    }

})();
