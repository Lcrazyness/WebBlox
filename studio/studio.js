/*
 * WebBlox Studio - studio.js
 * Complete Studio controller + 3D viewport
 *
 * Keeps the existing studio.html interface.
 * Adds:
 * - 3D perspective viewport
 * - WASD camera movement
 * - Mouse-look camera
 * - Mouse wheel zoom
 * - Camera reset
 * - Top camera
 * - Grid
 * - Object selection
 * - Move / Scale / Rotate tools
 * - Explorer selection
 * - Properties synchronization
 * - Add Part / Spawn / Model / Folder / Script
 * - Duplicate / Delete
 * - Undo / Redo
 * - New Game
 * - Save / Publish foundations
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
            x: 0,
            y: 8,
            z: 18,

            yaw: 0,
            pitch: -12,

            zoom: 1,

            perspective: true
        },

        keys: new Set(),

        mouse: {
            down: false,
            lastX: 0,
            lastY: 0
        },

        cameraDragging: false,

        history: [],
        future: [],

        game: {
            name: "Untitled Game",
            description: "",
            saved: false
        },

        playing: false
    };


    // ============================================================
    // DOM HELPERS
    // ============================================================

    const $ = id => document.getElementById(id);

    const viewport = $("viewport");
    const world = $("world");
    const grid = $("viewportGrid");

    const selectionBox = $("selectionBox");

    const explorerTree = $("explorerTree");
    const workspaceChildren = $("workspaceChildren");

    const outputConsole = $("outputConsole");

    const studioMessage = $("studioMessage");
    const gameStatus = $("gameStatus");

    const viewportMode = $("viewportMode");
    const viewportCoordinates = $("viewportCoordinates");

    const propertiesPanel = $("propertiesPanel");
    const explorerPanel = $("explorerPanel");

    const noSelectionMessage = $("noSelectionMessage");

    const selectedObjectName = $("selectedObjectName");
    const selectedObjectType = $("selectedObjectType");
    const selectedObjectIcon = $("selectedObjectIcon");


    // ============================================================
    // UTILS
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
            Math.random().toString(36).slice(2, 7)
        );
    }

    function cloneObject(object) {
        return JSON.parse(JSON.stringify(object));
    }

    function log(message, type = "info") {
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

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ============================================================
    // GAME OBJECT SYSTEM
    // ============================================================

    function createObject(data = {}) {
        const object = {
            id: data.id || makeId("part"),

            name:
                data.name ||
                "Part",

            className:
                data.className ||
                data.type ||
                "Part",

            type:
                data.type ||
                data.className ||
                "Part",

            position: {
                x: Number(data.position?.x ?? 0),
                y: Number(data.position?.y ?? 0),
                z: Number(data.position?.z ?? 0)
            },

            rotation: {
                x: Number(data.rotation?.x ?? 0),
                y: Number(data.rotation?.y ?? 0),
                z: Number(data.rotation?.z ?? 0)
            },

            size: {
                x: Number(data.size?.x ?? 4),
                y: Number(data.size?.y ?? 1),
                z: Number(data.size?.z ?? 4)
            },

            color:
                data.color ||
                "#808080",

            material:
                data.material ||
                "Plastic",

            anchored:
                data.anchored !== false,

            canCollide:
                data.canCollide !== false,

            castShadow:
                data.castShadow !== false
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
                y: 0,
                z: 8
            },

            size: {
                x: 4,
                y: 1,
                z: 4
            },

            color: "#22c55e"
        });

        state.selectedId = null;
    }


    // ============================================================
    // VIEWPORT CAMERA
    // ============================================================

    function updateCamera() {

        if (!viewport || !world) {
            return;
        }

        const camera = state.camera;

        const scale =
            camera.perspective
                ? camera.zoom
                : camera.zoom * 0.85;

        world.style.transform = `
            translate3d(
                ${-camera.x * scale}px,
                ${camera.y * scale}px,
                0
            )
            rotateX(${camera.pitch}deg)
            rotateY(${camera.yaw}deg)
            scale(${scale})
        `;

        updateCameraStatus();
    }


    function updateCameraStatus() {

        if (!viewportCoordinates) {
            return;
        }

        const camera = state.camera;

        viewportCoordinates.textContent =
            `X: ${Math.round(camera.x)} ` +
            `Y: ${Math.round(camera.y)} ` +
            `Z: ${Math.round(camera.z)}`;
    }


    function resetCamera() {

        state.camera.x = 0;
        state.camera.y = 8;
        state.camera.z = 18;

        state.camera.yaw = 0;
        state.camera.pitch = -12;

        state.camera.zoom = 1;

        state.camera.perspective = true;

        updateCamera();

        setCameraButtonState();

        log("Camera reset.");
    }


    function setPerspective() {

        state.camera.perspective = true;

        updateCamera();

        setCameraButtonState();

        log("Perspective camera enabled.");
    }


    function setTopCamera() {

        state.camera.perspective = false;

        state.camera.pitch = -90;
        state.camera.yaw = 0;

        updateCamera();

        setCameraButtonState();

        log("Top camera enabled.");
    }


    function setCameraButtonState() {

        const perspective =
            $("cameraPerspectiveButton");

        const top =
            $("cameraTopButton");

        if (perspective) {
            perspective.classList.toggle(
                "active",
                state.camera.perspective
            );
        }

        if (top) {
            top.classList.toggle(
                "active",
                !state.camera.perspective
            );
        }
    }


    // ============================================================
    // WASD CAMERA MOVEMENT
    // ============================================================

    function updateMovement(delta) {

        if (!viewport) {
            return;
        }

        if (
            document.activeElement &&
            (
                document.activeElement.tagName === "INPUT" ||
                document.activeElement.tagName === "TEXTAREA" ||
                document.activeElement.tagName === "SELECT"
            )
        ) {
            return;
        }

        if (!state.keys.size) {
            return;
        }

        const speed =
            state.keys.has("shift")
                ? 30
                : 12;

        const amount =
            speed * delta;

        const yaw =
            state.camera.yaw *
            Math.PI /
            180;

        let dx = 0;
        let dz = 0;

        if (
            state.keys.has("w") ||
            state.keys.has("arrowup")
        ) {
            dz -= 1;
        }

        if (
            state.keys.has("s") ||
            state.keys.has("arrowdown")
        ) {
            dz += 1;
        }

        if (
            state.keys.has("a") ||
            state.keys.has("arrowleft")
        ) {
            dx -= 1;
        }

        if (
            state.keys.has("d") ||
            state.keys.has("arrowright")
        ) {
            dx += 1;
        }

        const length =
            Math.hypot(dx, dz);

        if (!length) {
            return;
        }

        dx /= length;
        dz /= length;

        const worldX =
            dx * Math.cos(yaw) -
            dz * Math.sin(yaw);

        const worldZ =
            dx * Math.sin(yaw) +
            dz * Math.cos(yaw);

        state.camera.x +=
            worldX * amount;

        state.camera.z +=
            worldZ * amount;

        updateCamera();
    }


    let lastFrame = performance.now();

    function cameraLoop(now) {

        const delta =
            Math.min(
                (now - lastFrame) / 1000,
                0.1
            );

        lastFrame = now;

        updateMovement(delta);

        requestAnimationFrame(
            cameraLoop
        );
    }


    // ============================================================
    // MOUSE CAMERA
    // ============================================================

    function startCameraDrag(event) {

        if (!viewport) {
            return;
        }

        /*
         * Middle mouse = camera movement.
         * Right mouse = camera movement.
         */

        if (
            event.button !== 1 &&
            event.button !== 2
        ) {
            return;
        }

        event.preventDefault();

        state.mouse.down = true;

        state.mouse.lastX =
            event.clientX;

        state.mouse.lastY =
            event.clientY;

        state.cameraDragging = true;

        viewport.classList.add(
            "camera-dragging"
        );
    }


    function moveCamera(event) {

        if (
            !state.mouse.down ||
            !state.cameraDragging
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

        state.camera.yaw +=
            dx * 0.35;

        state.camera.pitch +=
            dy * 0.25;

        state.camera.pitch =
            clamp(
                state.camera.pitch,
                -89,
                89
            );

        updateCamera();
    }


    function stopCameraDrag() {

        state.mouse.down = false;
        state.cameraDragging = false;

        if (viewport) {
            viewport.classList.remove(
                "camera-dragging"
            );
        }
    }


    function handleWheel(event) {

        if (!viewport) {
            return;
        }

        event.preventDefault();

        const direction =
            event.deltaY > 0
                ? -1
                : 1;

        state.camera.zoom +=
            direction * 0.1;

        state.camera.zoom =
            clamp(
                state.camera.zoom,
                0.25,
                3
            );

        updateCamera();
    }


    // ============================================================
    // 3D OBJECT VISUALS
    // ============================================================

    function ensureWorldObject(object) {

        let element =
            document.querySelector(
                `[data-object-id="${CSS.escape(object.id)}"]`
            );

        if (!element) {

            element =
                document.createElement("div");

            element.className =
                "world-object generated-world-object";

            element.dataset.objectId =
                object.id;

            element.dataset.objectType =
                object.type;

            world.appendChild(
                element
            );
        }

        if (
            object.type ===
            "Part"
        ) {

            element.classList.add(
                "part-object"
            );

            element.innerHTML = `
                <div class="part-face part-top"></div>
                <div class="part-face part-front"></div>
                <div class="part-face part-side"></div>
            `;
        }

        if (
            object.type ===
            "SpawnLocation"
        ) {

            element.classList.add(
                "spawn-object"
            );

            element.innerHTML = `
                <div class="spawn-platform"></div>
                <div class="spawn-arrow">↑</div>
                <span>${escapeHTML(object.name)}</span>
            `;
        }

        if (
            object.type ===
            "Model"
        ) {

            element.classList.add(
                "model-object"
            );

            element.innerHTML = `
                <div class="model-body">
                    ◇
                </div>
                <span>${escapeHTML(object.name)}</span>
            `;
        }

        applyObjectTransform(
            object,
            element
        );

        return element;
    }


    function applyObjectTransform(
        object,
        element
    ) {

        if (!element) {
            return;
        }

        const x =
            object.position.x * 30;

        const y =
            -object.position.y * 30;

        const z =
            object.position.z * 30;

        const sx =
            Math.max(
                0.15,
                object.size.x / 4
            );

        const sy =
            Math.max(
                0.15,
                object.size.y / 1
            );

        const sz =
            Math.max(
                0.15,
                object.size.z / 4
            );

        element.style.setProperty(
            "--object-x",
            `${x}px`
        );

        element.style.setProperty(
            "--object-y",
            `${y}px`
        );

        element.style.setProperty(
            "--object-z",
            `${z}px`
        );

        element.style.setProperty(
            "--object-sx",
            sx
        );

        element.style.setProperty(
            "--object-sy",
            sy
        );

        element.style.setProperty(
            "--object-sz",
            sz
        );

        element.style.setProperty(
            "--object-rotation-x",
            `${object.rotation.x}deg`
        );

        element.style.setProperty(
            "--object-rotation-y",
            `${object.rotation.y}deg`
        );

        element.style.setProperty(
            "--object-rotation-z",
            `${object.rotation.z}deg`
        );

        if (object.color) {
            element.style.setProperty(
                "--object-color",
                object.color
            );
        }

        element.style.transform = `
            translate3d(
                var(--object-x),
                var(--object-y),
                var(--object-z)
            )
            rotateX(var(--object-rotation-x))
            rotateY(var(--object-rotation-y))
            rotateZ(var(--object-rotation-z))
            scale3d(
                var(--object-sx),
                var(--object-sy),
                var(--object-sz)
            )
        `;

        element.classList.toggle(
            "selected",
            state.selectedId === object.id
        );
    }


    function renderWorld() {

        if (!world) {
            return;
        }

        for (
            const object
            of state.objects.values()
        ) {

            const element =
                ensureWorldObject(
                    object
                );

            applyObjectTransform(
                object,
                element
            );
        }

        updateSelectionBox();
    }


    // ============================================================
    // SELECTION
    // ============================================================

    function selectObject(id) {

        if (!id) {
            clearSelection();
            return;
        }

        const object =
            state.objects.get(id);

        if (!object) {
            return;
        }

        state.selectedId =
            id;

        updateSelectionBox();

        updateProperties();

        updateExplorerSelection();

        if (studioMessage) {
            studioMessage.textContent =
                `Selected ${object.name}`;
        }
    }


    function clearSelection() {

        state.selectedId = null;

        updateSelectionBox();

        updateProperties();

        updateExplorerSelection();

        if (studioMessage) {
            studioMessage.textContent =
                "Nothing selected";
        }
    }


    function updateSelectionBox() {

        if (!selectionBox) {
            return;
        }

        if (!state.selectedId) {

            selectionBox.classList.add(
                "hidden"
            );

            return;
        }

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {
            selectionBox.classList.add(
                "hidden"
            );

            return;
        }

        const element =
            document.querySelector(
                `[data-object-id="${CSS.escape(object.id)}"]`
            );

        if (!element) {
            selectionBox.classList.add(
                "hidden"
            );

            return;
        }

        selectionBox.classList.remove(
            "hidden"
        );

        /*
         * Let CSS place the selection around
         * the generated world object.
         */

        selectionBox.style.transform =
            element.style.transform;

        selectionBox.style.width =
            `${Math.max(30, object.size.x * 30)}px`;

        selectionBox.style.height =
            `${Math.max(30, object.size.y * 30)}px`;
    }


    // ============================================================
    // PROPERTIES
    // ============================================================

    function updateProperties() {

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {

            if (noSelectionMessage) {
                noSelectionMessage.classList.remove(
                    "hidden"
                );
            }

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

        if (noSelectionMessage) {
            noSelectionMessage.classList.add(
                "hidden"
            );
        }

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
                object.type === "SpawnLocation"
                    ? "◆"
                    : object.type === "Model"
                        ? "◇"
                        : "■";
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

        setInput(
            "objectName",
            object.name
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


    function setInput(id, value) {

        const input = $(id);

        if (!input) {
            return;
        }

        input.value =
            value ?? "";
    }


    function setChecked(id, value) {

        const input = $(id);

        if (!input) {
            return;
        }

        input.checked =
            Boolean(value);
    }


    function updateObjectProperty(
        property,
        value
    ) {

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {
            return;
        }

        saveHistory();

        const parts =
            property.split(".");

        if (parts.length === 2) {

            const group =
                parts[0];

            const key =
                parts[1];

            if (
                object[group] &&
                typeof object[group] === "object"
            ) {
                object[group][key] =
                    Number(value) || 0;
            }

        } else {

            if (
                property ===
                "anchored"
            ) {
                object.anchored =
                    Boolean(value);
            } else if (
                property ===
                "canCollide"
            ) {
                object.canCollide =
                    Boolean(value);
            } else if (
                property ===
                "castShadow"
            ) {
                object.castShadow =
                    Boolean(value);
            } else if (
                property ===
                "color"
            ) {
                object.color =
                    value;
            } else if (
                property ===
                "material"
            ) {
                object.material =
                    value;
            } else if (
                property ===
                "name"
            ) {
                object.name =
                    String(value || "Part");
            }
        }

        state.game.saved = false;

        updateGameStatus();

        renderWorld();

        updateExplorer();

        updateProperties();
    }


    // ============================================================
    // EXPLORER
    // ============================================================

    function updateExplorer() {

        if (!workspaceChildren) {
            return;
        }

        workspaceChildren.innerHTML = "";

        for (
            const object
            of state.objects.values()
        ) {

            const item =
                document.createElement("div");

            item.className =
                "tree-item";

            item.dataset.objectId =
                object.id;

            item.dataset.objectType =
                object.type;

            item.innerHTML = `
                <span class="tree-spacer"></span>

                <span class="tree-icon">
                    ${
                        object.type === "SpawnLocation"
                            ? "◆"
                            : object.type === "Model"
                                ? "◇"
                                : "■"
                    }
                </span>

                <span class="tree-name">
                    ${escapeHTML(object.name)}
                </span>
            `;

            workspaceChildren.appendChild(
                item
            );
        }

        updateExplorerSelection();
    }


    function updateExplorerSelection() {

        document
            .querySelectorAll(
                ".tree-item"
            )
            .forEach(item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.objectId ===
                    state.selectedId
                );
            });
    }


    // ============================================================
    // INSERT OBJECTS
    // ============================================================

    function insertObject(type) {

        saveHistory();

        const names = {
            Part: "Part",
            SpawnLocation: "SpawnLocation",
            Model: "Model",
            Folder: "Folder",
            Script: "Script"
        };

        const object =
            createObject({

                id: makeId(
                    type.toLowerCase()
                ),

                name:
                    names[type] ||
                    type,

                type,

                position: {
                    x: snap(
                        Math.round(
                            state.camera.x
                        )
                    ),

                    y: 1,

                    z: snap(
                        Math.round(
                            state.camera.z
                        )
                    )
                },

                size:
                    type === "Part"
                        ? {
                            x: 4,
                            y: 1,
                            z: 4
                        }
                        : {
                            x: 4,
                            y: 1,
                            z: 4
                        }
            });

        state.game.saved = false;

        renderWorld();

        updateExplorer();

        selectObject(
            object.id
        );

        closeFloatingMenus();

        log(
            `Created ${object.type} "${object.name}".`
        );

        updateGameStatus();
    }


    // ============================================================
    // DELETE
    // ============================================================

    function deleteSelected() {

        if (!state.selectedId) {
            return;
        }

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {
            return;
        }

        saveHistory();

        state.objects.delete(
            state.selectedId
        );

        const element =
            document.querySelector(
                `[data-object-id="${CSS.escape(object.id)}"]`
            );

        if (element) {
            element.remove();
        }

        log(
            `Deleted ${object.name}.`
        );

        state.selectedId =
            null;

        state.game.saved =
            false;

        updateExplorer();

        updateProperties();

        updateSelectionBox();

        updateGameStatus();
    }


    // ============================================================
    // DUPLICATE
    // ============================================================

    function duplicateSelected() {

        if (!state.selectedId) {
            return;
        }

        const object =
            state.objects.get(
                state.selectedId
            );

        if (!object) {
            return;
        }

        saveHistory();

        const copy =
            cloneObject(object);

        copy.id =
            makeId(
                object.type.toLowerCase()
            );

        copy.name =
            `${object.name} Copy`;

        copy.position.x +=
            state.snapEnabled
                ? 2
                : 1;

        copy.position.z +=
            state.snapEnabled
                ? 2
                : 1;

        state.objects.set(
            copy.id,
            copy
        );

        state.game.saved =
            false;

        renderWorld();

        updateExplorer();

        selectObject(
            copy.id
        );

        log(
            `Duplicated ${object.name}.`
        );

        updateGameStatus();
    }


    // ============================================================
    // HISTORY
    // ============================================================

    function getSnapshot() {

        return JSON.stringify(
            [...state.objects.values()]
        );
    }


    function restoreSnapshot(snapshot) {

        const objects =
            JSON.parse(snapshot);

        state.objects.clear();

        for (
            const object
            of objects
        ) {
            state.objects.set(
                object.id,
                object
            );
        }

        state.selectedId =
            null;

        renderWorld();

        updateExplorer();

        updateProperties();
    }


    function saveHistory() {

        state.history.push(
            getSnapshot()
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

        if (!state.history.length) {
            log(
                "Nothing to undo.",
                "warn"
            );

            return;
        }

        state.future.push(
            getSnapshot()
        );

        const snapshot =
            state.history.pop();

        restoreSnapshot(
            snapshot
        );

        log("Undo.");
    }


    function redo() {

        if (!state.future.length) {
            log(
                "Nothing to redo.",
                "warn"
            );

            return;
        }

        state.history.push(
            getSnapshot()
        );

        const snapshot =
            state.future.pop();

        restoreSnapshot(
            snapshot
        );

        log("Redo.");
    }


    // ============================================================
    // TOOLS
    // ============================================================

    function setTool(tool) {

        state.tool =
            tool;

        const buttons = [
            ["selectTool", "select"],
            ["moveTool", "move"],
            ["scaleTool", "scale"],
            ["rotateTool", "rotate"]
        ];

        for (
            const [id, value]
            of buttons
        ) {

            const button = $(id);

            if (button) {
                button.classList.toggle(
                    "active",
                    value === tool
                );
            }
        }

        if (viewportMode) {
            viewportMode.textContent =
                tool.charAt(0).toUpperCase() +
                tool.slice(1);
        }

        log(
            `${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected.`
        );
    }


    // ============================================================
    // OBJECT DRAGGING
    // ============================================================

    let objectDrag = null;

    function startObjectDrag(
        event,
        object
    ) {

        if (
            state.tool === "select"
        ) {
            selectObject(
                object.id
            );

            return;
        }

        if (
            state.cameraDragging
        ) {
            return;
        }

        selectObject(
            object.id
        );

        saveHistory();

        objectDrag = {
            id: object.id,

            startX:
                event.clientX,

            startY:
                event.clientY,

            position: {
                ...object.position
            },

            size: {
                ...object.size
            },

            rotation: {
                ...object.rotation
            }
        };

        event.preventDefault();
    }


    function moveObject(
        event
    ) {

        if (!objectDrag) {
            return;
        }

        const object =
            state.objects.get(
                objectDrag.id
            );

        if (!object) {
            return;
        }

        const dx =
            (event.clientX -
                objectDrag.startX) /
            30;

        const dy =
            (event.clientY -
                objectDrag.startY) /
            30;

        if (
            state.tool ===
            "move"
        ) {

            object.position.x =
                snap(
                    objectDrag.position.x +
                    dx
                );

            object.position.y =
                snap(
                    objectDrag.position.y -
                    dy
                );
        }

        if (
            state.tool ===
            "scale"
        ) {

            object.size.x =
                Math.max(
                    0.1,
                    snap(
                        objectDrag.size.x +
                        dx
                    )
                );

            object.size.y =
                Math.max(
                    0.1,
                    snap(
                        objectDrag.size.y -
                        dy
                    )
                );
        }

        if (
            state.tool ===
            "rotate"
        ) {

            object.rotation.y =
                snap(
                    objectDrag.rotation.y +
                    dx * 15,
                    15
                );
        }

        state.game.saved =
            false;

        renderWorld();

        updateProperties();

        updateGameStatus();
    }


    function stopObjectDrag() {
        objectDrag = null;
    }


    // ============================================================
    // OUTPUT / STATUS
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
    // MENUS
    // ============================================================

    const menuMap = {
        fileMenuButton: "fileMenu",
        editMenuButton: "editMenu",
        viewMenuButton: "viewMenu",
        modelMenuButton: "modelMenu",
        testMenuButton: "testMenu"
    };


    function closeMenus() {

        document
            .querySelectorAll(
                ".dropdown-menu"
            )
            .forEach(menu => {

                menu.classList.add(
                    "hidden"
                );
            });
    }


    function closeFloatingMenus() {

        const menu =
            $("addObjectMenu");

        if (menu) {
            menu.classList.add(
                "hidden"
            );
        }
    }


    function toggleMenu(id) {

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
    // NEW GAME
    // ============================================================

    function openModal(id) {

        const modal =
            $(id);

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "hidden"
        );
    }


    function closeModal(id) {

        const modal =
            $(id);

        if (!modal) {
            return;
        }

        modal.classList.add(
            "hidden"
        );
    }


    function createNewGame() {

        const nameInput =
            $("newGameName");

        const descriptionInput =
            $("newGameDescription");

        const name =
            nameInput?.value.trim() ||
            "Untitled Game";

        const description =
            descriptionInput?.value.trim() ||
            "";

        state.game.name =
            name;

        state.game.description =
            description;

        state.game.saved =
            false;

        createDefaultWorld();

        state.history = [];
        state.future = [];

        renderWorld();

        updateExplorer();

        clearSelection();

        resetCamera();

        closeModal(
            "newGameModal"
        );

        updateGameStatus();

        log(
            `Created new game "${name}".`
        );

        showToast(
            `Created "${name}"`
        );
    }


    // ============================================================
    // SAVE
    // ============================================================

    function saveGame() {

        const data = {
            version: "0.1.0",

            name:
                state.game.name,

            description:
                state.game.description,

            objects:
                [...state.objects.values()],

            camera:
                state.camera
        };

        try {

            localStorage.setItem(
                "webblox_studio_project",
                JSON.stringify(data)
            );

            state.game.saved =
                true;

            updateGameStatus();

            log("Game saved locally.");

            showToast(
                "Game saved"
            );

        } catch (error) {

            console.error(error);

            log(
                "Could not save game.",
                "error"
            );
        }
    }


    // ============================================================
    // LOAD
    // ============================================================

    function loadGame() {

        try {

            const raw =
                localStorage.getItem(
                    "webblox_studio_project"
                );

            if (!raw) {
                log(
                    "No saved WebBlox project found.",
                    "warn"
                );

                return;
            }

            const data =
                JSON.parse(raw);

            state.game.name =
                data.name ||
                "Untitled Game";

            state.game.description =
                data.description ||
                "";

            state.objects.clear();

            for (
                const object
                of data.objects || []
            ) {

                state.objects.set(
                    object.id,
                    object
                );
            }

            if (data.camera) {
                Object.assign(
                    state.camera,
                    data.camera
                );
            }

            state.game.saved =
                true;

            renderWorld();

            updateExplorer();

            clearSelection();

            updateCamera();

            updateGameStatus();

            log(
                `Loaded "${state.game.name}".`
            );

        } catch (error) {

            console.error(error);

            log(
                "Could not load saved project.",
                "error"
            );
        }
    }


    // ============================================================
    // PLAY MODE
    // ============================================================

    function playGame() {

        if (state.playing) {
            return;
        }

        state.playing =
            true;

        const play =
            $("playButton");

        const stop =
            $("stopButton");

        if (play) {
            play.disabled = true;
        }

        if (stop) {
            stop.disabled = false;
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

        const play =
            $("playButton");

        const stop =
            $("stopButton");

        if (play) {
            play.disabled = false;
        }

        if (stop) {
            stop.disabled = true;
        }

        log(
            "Play mode stopped."
        );
    }


    // ============================================================
    // VIEWPORT EVENTS
    // ============================================================

    function setupViewport() {

        if (!viewport) {
            console.warn(
                "[WebBlox] Viewport not found."
            );

            return;
        }

        viewport.addEventListener(
            "contextmenu",
            event => {
                event.preventDefault();
            }
        );

        viewport.addEventListener(
            "mousedown",
            event => {

                /*
                 * Middle/right click = camera.
                 */

                if (
                    event.button === 1 ||
                    event.button === 2
                ) {

                    startCameraDrag(
                        event
                    );

                    return;
                }

                /*
                 * Left click on empty viewport
                 * clears selection.
                 */

                if (
                    event.button === 0 &&
                    event.target === viewport
                ) {
                    clearSelection();
                }
            }
        );

        viewport.addEventListener(
            "mousemove",
            moveCamera
        );

        viewport.addEventListener(
            "mouseup",
            stopCameraDrag
        );

        viewport.addEventListener(
            "mouseleave",
            stopCameraDrag
        );

        viewport.addEventListener(
            "wheel",
            handleWheel,
            {
                passive: false
            }
        );


        document.addEventListener(
            "mousedown",
            event => {

                const target =
                    event.target.closest(
                        ".world-object"
                    );

                if (!target) {
                    return;
                }

                if (
                    event.button !== 0
                ) {
                    return;
                }

                const id =
                    target.dataset.objectId;

                const object =
                    state.objects.get(id);

                if (!object) {
                    return;
                }

                startObjectDrag(
                    event,
                    object
                );
            }
        );


        document.addEventListener(
            "mousemove",
            moveObject
        );

        document.addEventListener(
            "mouseup",
            stopObjectDrag
        );
    }


    // ============================================================
    // KEYBOARD
    // ============================================================

    function setupKeyboard() {

        document.addEventListener(
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
                    undo();
                }

                if (
                    event.ctrlKey &&
                    key === "y"
                ) {
                    event.preventDefault();
                    redo();
                }

                if (
                    event.key ===
                    "Delete"
                ) {

                    const active =
                        document.activeElement;

                    const typing =
                        active &&
                        (
                            active.tagName ===
                                "INPUT" ||
                            active.tagName ===
                                "TEXTAREA"
                        );

                    if (!typing) {
                        deleteSelected();
                    }
                }

                if (
                    event.ctrlKey &&
                    key === "s"
                ) {
                    event.preventDefault();
                    saveGame();
                }

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeMenus();

                    closeFloatingMenus();

                    document
                        .querySelectorAll(
                            ".modal"
                        )
                        .forEach(
                            modal =>
                                modal.classList.add(
                                    "hidden"
                                )
                        );
                }
            }
        );

        document.addEventListener(
            "keyup",
            event => {

                state.keys.delete(
                    event.key.toLowerCase()
                );
            }
        );
    }


    // ============================================================
    // EXPLORER EVENTS
    // ============================================================

    function setupExplorer() {

        if (!explorerTree) {
            return;
        }

        explorerTree.addEventListener(
            "click",
            event => {

                const item =
                    event.target.closest(
                        ".tree-item"
                    );

                if (!item) {
                    return;
                }

                const id =
                    item.dataset.objectId;

                if (
                    id === "workspace" ||
                    id === "lighting" ||
                    id === "starterPlayer" ||
                    id === "starterGui"
                ) {
                    return;
                }

                selectObject(id);
            }
        );


        const search =
            $("explorerSearch");

        if (search) {

            search.addEventListener(
                "input",
                () => {

                    const query =
                        search.value
                            .trim()
                            .toLowerCase();

                    document
                        .querySelectorAll(
                            "#workspaceChildren .tree-item"
                        )
                        .forEach(item => {

                            const name =
                                item
                                    .querySelector(
                                        ".tree-name"
                                    )
                                    ?.textContent
                                    .toLowerCase() ||
                                "";

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
    }


    // ============================================================
    // PROPERTY EVENTS
    // ============================================================

    function setupProperties() {

        document
            .querySelectorAll(
                "[data-property]"
            )
            .forEach(input => {

                input.addEventListener(
                    "change",
                    () => {

                        const property =
                            input.dataset.property;

                        if (
                            input.type ===
                            "checkbox"
                        ) {

                            updateObjectProperty(
                                property,
                                input.checked
                            );

                        } else {

                            updateObjectProperty(
                                property,
                                input.value
                            );
                        }
                    }
                );
            });
    }


    // ============================================================
    // BUTTON EVENTS
    // ============================================================

    function setupButtons() {

        // Menus

        for (
            const [
                buttonId,
                menuId
            ]
            of Object.entries(menuMap)
        ) {

            const button =
                $(buttonId);

            if (button) {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        toggleMenu(
                            menuId
                        );
                    }
                );
            }
        }


        document.addEventListener(
            "click",
            event => {

                if (
                    !event.target.closest(
                        ".dropdown-menu"
                    ) &&
                    !event.target.closest(
                        ".menu-button"
                    )
                ) {
                    closeMenus();
                }
            }
        );


        // New

        $("newGameButton")
            ?.addEventListener(
                "click",
                () =>
                    openModal(
                        "newGameModal"
                    )
            );


        // Open

        $("openGameButton")
            ?.addEventListener(
                "click",
                loadGame
            );


        // Save

        $("saveGameButton")
            ?.addEventListener(
                "click",
                saveGame
            );


        // Undo

        $("undoButton")
            ?.addEventListener(
                "click",
                undo
            );


        // Redo

        $("redoButton")
            ?.addEventListener(
                "click",
                redo
            );


        // Play

        $("playButton")
            ?.addEventListener(
                "click",
                playGame
            );


        // Stop

        $("stopButton")
            ?.addEventListener(
                "click",
                stopGame
            );


        // Add object

        $("addObjectButton")
            ?.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const menu =
                        $("addObjectMenu");

                    if (menu) {

                        menu.classList.toggle(
                            "hidden"
                        );
                    }
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
                            button.dataset.createObject
                        );
                    }
                );
            });


        // Refresh Explorer

        $("refreshExplorerButton")
            ?.addEventListener(
                "click",
                () => {

                    updateExplorer();

                    log(
                        "Explorer refreshed."
                    );
                }
            );


        // Viewport tools

        $("selectTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool("select")
            );

        $("moveTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool("move")
            );

        $("scaleTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool("scale")
            );

        $("rotateTool")
            ?.addEventListener(
                "click",
                () =>
                    setTool("rotate")
            );


        // Grid

        $("gridButton")
            ?.addEventListener(
                "click",
                () => {

                    state.gridEnabled =
                        !state.gridEnabled;

                    $("gridButton")
                        ?.classList.toggle(
                            "active",
                            state.gridEnabled
                        );

                    if (grid) {
                        grid.style.display =
                            state.gridEnabled
                                ? ""
                                : "none";
                    }
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
                        ?.classList.toggle(
                            "active",
                            state.snapEnabled
                        );
                }
            );


        // Camera

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

                    state.camera.zoom =
                        clamp(
                            state.camera.zoom +
                                0.1,
                            0.25,
                            3
                        );

                    updateCamera();
                }
            );

        $("cameraZoomOut")
            ?.addEventListener(
                "click",
                () => {

                    state.camera.zoom =
                        clamp(
                            state.camera.zoom -
                                0.1,
                            0.25,
                            3
                        );

                    updateCamera();
                }
            );


        // Welcome Add Part

        $("welcomeAddPart")
            ?.addEventListener(
                "click",
                () =>
                    insertObject("Part")
            );


        // Output

        $("clearOutputButton")
            ?.addEventListener(
                "click",
                () => {

                    if (outputConsole) {
                        outputConsole.innerHTML =
                            "";
                    }
                }
            );


        $("toggleOutputButton")
            ?.addEventListener(
                "click",
                () => {

                    const panel =
                        $("outputPanel");

                    if (!panel) {
                        return;
                    }

                    panel.classList.toggle(
                        "collapsed"
                    );
                }
            );


        // View panel actions

        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset.action;

                        handleAction(
                            action
                        );

                        closeMenus();
                    }
                );
            });


        // Modal close

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.closeModal
                        );
                    }
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


        // Property search

        $("propertySearchButton")
            ?.addEventListener(
                "click",
                () => {

                    $("propertySearch")
                        ?.classList.toggle(
                            "hidden"
                        );
                }
            );


        // Context menu

        setupContextMenu();
    }


    // ============================================================
    // ACTION HANDLER
    // ============================================================

    function handleAction(action) {

        switch (action) {

            case "new":
                openModal("newGameModal");
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
                    ?.classList.toggle(
                        "hidden"
                    );
                break;

            case "toggleProperties":
                propertiesPanel
                    ?.classList.toggle(
                        "hidden"
                    );
                break;

            case "toggleOutput":
                $("outputPanel")
                    ?.classList.toggle(
                        "collapsed"
                    );
                break;

            case "insertPart":
                insertObject("Part");
                break;

            case "insertSpawn":
                insertObject("SpawnLocation");
                break;

            case "insertModel":
                insertObject("Model");
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
    // PUBLISH
    // ============================================================

    function openPublishModal() {

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
                "Your WebBlox game";
        }

        openModal(
            "publishModal"
        );
    }


    function publishGame() {

        closeModal(
            "publishModal"
        );

        state.game.saved =
            true;

        updateGameStatus();

        log(
            "Publish system ready. Online publishing will be connected to the WebBlox backend next."
        );

        showToast(
            "Publish system ready"
        );
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
                        ".world-object"
                    );

                if (!objectElement) {
                    return;
                }

                event.preventDefault();

                const id =
                    objectElement.dataset.objectId;

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

                const action =
                    button.dataset.contextAction;

                switch (action) {

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

        renderWorld();

        updateExplorer();

        updateProperties();

        updateGameStatus();
    }


    // ============================================================
    // TOAST
    // ============================================================

    function showToast(message) {

        const container =
            $("toastContainer");

        if (!container) {
            return;
        }

        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            "toast";

        toast.textContent =
            message;

        container.appendChild(
            toast
        );

        setTimeout(
            () => {

                toast.classList.add(
                    "toast-hide"
                );

                setTimeout(
                    () =>
                        toast.remove(),
                    250
                );

            },
            2500
        );
    }


    // ============================================================
    // INITIALIZE
    // ============================================================

    function initialize() {

        console.log(
            "[WebBlox Studio] Starting..."
        );

        createDefaultWorld();

        setupViewport();

        setupKeyboard();

        setupExplorer();

        setupProperties();

        setupButtons();

        renderWorld();

        updateExplorer();

        updateProperties();

        updateCamera();

        setCameraButtonState();

        updateGameStatus();

        requestAnimationFrame(
            cameraLoop
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

        log(
            "3D viewport initialized."
        );

        log(
            "WASD camera controls enabled."
        );

        log(
            "Middle/right mouse rotates the camera."
        );

        log(
            "Scroll wheel controls zoom."
        );

        console.log(
            "[WebBlox Studio] Ready."
        );
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

        renderWorld
    };


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
