"use strict";

/*
============================================================
 WebBlox Studio
============================================================

 First Studio system:

 - Explorer
 - Object selection
 - Properties
 - Viewport
 - Parts
 - Move / Rotate / Scale modes
 - Insert objects
 - Delete objects
 - Rename objects
 - Duplicate objects
 - Basic project state
 - Save project locally
 - Load project locally
 - Play / Stop preview
 - Keyboard shortcuts

 This is the foundation for the WebBlox game editor.
============================================================
*/

(() => {

    /*
    ========================================================
     CONFIG
    ========================================================
    */

    const STORAGE_KEY = "webblox-studio-project";

    /*
    ========================================================
     STATE
    ========================================================
    */

    const state = {

        projectName:
            "Untitled WebBlox Game",

        selectedId:
            null,

        tool:
            "select",

        playing:
            false,

        nextId:
            1,

        objects: []

    };


    /*
    ========================================================
     OBJECT TYPES
    ========================================================
    */

    const OBJECT_TYPES = {

        Part: {
            icon: "🧱",
            name: "Part"
        },

        SpawnLocation: {
            icon: "🟢",
            name: "SpawnLocation"
        },

        Model: {
            icon: "📦",
            name: "Model"
        },

        Folder: {
            icon: "📁",
            name: "Folder"
        },

        PointLight: {
            icon: "💡",
            name: "PointLight"
        },

        Camera: {
            icon: "📷",
            name: "Camera"
        }

    };


    /*
    ========================================================
     DOM HELPERS
    ========================================================
    */

    function $(selector) {

        return document.querySelector(
            selector
        );

    }


    function $all(selector) {

        return Array.from(
            document.querySelectorAll(
                selector
            )
        );

    }


    function findAny(...selectors) {

        for (
            const selector
            of selectors
        ) {

            const element =
                $(selector);

            if (element) {

                return element;

            }

        }

        return null;

    }


    /*
    ========================================================
     ID GENERATOR
    ========================================================
    */

    function createId() {

        const id =
            `object_${state.nextId}`;

        state.nextId++;

        return id;

    }


    /*
    ========================================================
     DEFAULT OBJECT
    ========================================================
    */

    function createObject(
        type = "Part",
        name = null
    ) {

        const id =
            createId();

        const object = {

            id,

            type,

            name:
                name ||
                `${type}${state.nextId - 1}`,

            position: {

                x: 0,
                y: 0,
                z: 0

            },

            rotation: {

                x: 0,
                y: 0,
                z: 0

            },

            size: {

                x: 4,
                y: 1,
                z: 4

            },

            color:
                "#888888",

            anchored:
                true,

            visible:
                true,

            transparency:
                0,

            parent:
                null

        };

        return object;

    }


    /*
    ========================================================
     FIND OBJECT
    ========================================================
    */

    function getObject(id) {

        return state.objects.find(
            object =>
                object.id === id
        );

    }


    /*
    ========================================================
     ADD OBJECT
    ========================================================
    */

    function addObject(
        type = "Part"
    ) {

        const object =
            createObject(
                type
            );

        /*
         * Place new parts near the currently
         * selected object when possible.
         */

        const selected =
            getObject(
                state.selectedId
            );

        if (selected) {

            object.position.x =
                selected.position.x + 5;

            object.position.y =
                selected.position.y;

            object.position.z =
                selected.position.z;

        }

        state.objects.push(
            object
        );

        selectObject(
            object.id
        );

        renderAll();

        saveProject();

        return object;

    }


    /*
    ========================================================
     DELETE OBJECT
    ========================================================
    */

    function deleteSelected() {

        if (!state.selectedId) {

            return;

        }

        const index =
            state.objects.findIndex(
                object =>
                    object.id ===
                    state.selectedId
            );

        if (index === -1) {

            return;

        }

        state.objects.splice(
            index,
            1
        );

        state.selectedId =
            null;

        renderAll();

        saveProject();

    }


    /*
    ========================================================
     DUPLICATE OBJECT
    ========================================================
    */

    function duplicateSelected() {

        const original =
            getObject(
                state.selectedId
            );

        if (!original) {

            return;

        }

        const copy =
            JSON.parse(
                JSON.stringify(
                    original
                )
            );

        copy.id =
            createId();

        copy.name =
            `${original.name} Copy`;

        copy.position.x += 2;
        copy.position.z += 2;

        state.objects.push(
            copy
        );

        selectObject(
            copy.id
        );

        renderAll();

        saveProject();

    }


    /*
    ========================================================
     SELECT OBJECT
    ========================================================
    */

    function selectObject(id) {

        state.selectedId =
            id || null;

        renderExplorer();
        renderProperties();
        renderViewport();

        /*
         * Tell other WebBlox systems that the
         * Studio selection changed.
         */

        window.dispatchEvent(
            new CustomEvent(
                "webblox:studio-selection",
                {
                    detail: {
                        object:
                            getObject(
                                id
                            )
                    }
                }
            )
        );

    }


    /*
    ========================================================
     RENAME OBJECT
    ========================================================
    */

    function renameSelected(
        name
    ) {

        const object =
            getObject(
                state.selectedId
            );

        if (!object) {

            return;

        }

        name =
            String(
                name || ""
            ).trim();

        if (!name) {

            return;

        }

        object.name =
            name;

        renderExplorer();
        renderProperties();

        saveProject();

    }


    /*
    ========================================================
     PROPERTY EDITING
    ========================================================
    */

    function updateProperty(
        property,
        value
    ) {

        const object =
            getObject(
                state.selectedId
            );

        if (!object) {

            return;

        }

        if (
            property === "position.x" ||
            property === "position.y" ||
            property === "position.z"
        ) {

            const axis =
                property.split(".")[1];

            object.position[axis] =
                Number(value) || 0;

        }

        else if (
            property === "rotation.x" ||
            property === "rotation.y" ||
            property === "rotation.z"
        ) {

            const axis =
                property.split(".")[1];

            object.rotation[axis] =
                Number(value) || 0;

        }

        else if (
            property === "size.x" ||
            property === "size.y" ||
            property === "size.z"
        ) {

            const axis =
                property.split(".")[1];

            object.size[axis] =
                Math.max(
                    0.1,
                    Number(value) || 0.1
                );

        }

        else if (
            property === "color"
        ) {

            object.color =
                value;

        }

        else if (
            property === "anchored"
        ) {

            object.anchored =
                Boolean(value);

        }

        else if (
            property === "visible"
        ) {

            object.visible =
                Boolean(value);

        }

        else if (
            property === "transparency"
        ) {

            object.transparency =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(value) || 0
                    )
                );

        }

        else if (
            property === "name"
        ) {

            object.name =
                String(value);

        }

        renderExplorer();
        renderProperties();
        renderViewport();

        saveProject();

    }


    /*
    ========================================================
     EXPLORER
    ========================================================
    */

    function getExplorerContainer() {

        return findAny(

            "#explorer",
            "#explorerPanel",
            "#explorerTree",
            ".explorer-tree",
            ".explorer-content",
            "[data-explorer]"

        );

    }


    function renderExplorer() {

        const container =
            getExplorerContainer();

        if (!container) {

            return;

        }

        if (!state.objects.length) {

            container.innerHTML = `

                <div class="studio-empty">

                    <div>
                        🌎
                    </div>

                    <span>
                        Workspace is empty
                    </span>

                    <small>
                        Insert a Part to begin
                    </small>

                </div>

            `;

            return;

        }

        container.innerHTML = "";

        /*
         * Workspace root
         */

        const root =
            document.createElement(
                "div"
            );

        root.className =
            "explorer-root";

        root.innerHTML = `
            <span class="explorer-arrow">
                ▾
            </span>

            <span class="explorer-icon">
                🌎
            </span>

            <span class="explorer-name">
                Workspace
            </span>
        `;

        container.appendChild(
            root
        );


        /*
         * Objects
         */

        for (
            const object
            of state.objects
        ) {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "explorer-item";

            if (
                object.id ===
                state.selectedId
            ) {

                row.classList.add(
                    "selected"
                );

            }

            row.dataset.objectId =
                object.id;

            const type =
                OBJECT_TYPES[
                    object.type
                ] ||
                OBJECT_TYPES.Part;

            row.innerHTML = `

                <span class="explorer-indent">
                </span>

                <span class="explorer-arrow">
                    ${object.type === "Model"
                        ? "▸"
                        : ""}
                </span>

                <span class="explorer-icon">
                    ${type.icon}
                </span>

                <span class="explorer-name">
                    ${escapeHTML(
                        object.name
                    )}
                </span>

            `;

            row.addEventListener(
                "click",
                () => {

                    selectObject(
                        object.id
                    );

                }
            );

            container.appendChild(
                row
            );

        }

    }


    /*
    ========================================================
     ESCAPE HTML
    ========================================================
    */

    function escapeHTML(
        value
    ) {

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


    /*
    ========================================================
     PROPERTIES
    ========================================================
    */

    function getPropertiesContainer() {

        return findAny(

            "#properties",
            "#propertiesPanel",
            "#propertiesContent",
            ".properties-content",
            ".properties-panel",
            "[data-properties]"

        );

    }


    function propertyNumber(
        label,
        property,
        value
    ) {

        return `

            <label class="property-row">

                <span>
                    ${label}
                </span>

                <input
                    type="number"
                    step="0.1"
                    data-property="${property}"
                    value="${value}"
                >

            </label>

        `;

    }


    function renderProperties() {

        const container =
            getPropertiesContainer();

        if (!container) {

            return;

        }

        const object =
            getObject(
                state.selectedId
            );

        if (!object) {

            container.innerHTML = `

                <div class="properties-empty">

                    <div>
                        ⚙️
                    </div>

                    <strong>
                        No Selection
                    </strong>

                    <span>
                        Select an object to edit
                        its properties.
                    </span>

                </div>

            `;

            return;

        }

        container.innerHTML = `

            <div class="properties-header">

                <span class="properties-icon">
                    ${
                        OBJECT_TYPES[
                            object.type
                        ]?.icon || "🧱"
                    }
                </span>

                <div>

                    <strong>
                        ${escapeHTML(
                            object.name
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            object.type
                        )}
                    </small>

                </div>

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Identity
                </div>

                <label class="property-row">

                    <span>
                        Name
                    </span>

                    <input
                        type="text"
                        data-property="name"
                        value="${escapeHTML(
                            object.name
                        )}"
                    >

                </label>

                <label class="property-row">

                    <span>
                        Type
                    </span>

                    <input
                        type="text"
                        value="${escapeHTML(
                            object.type
                        )}"
                        disabled
                    >

                </label>

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Position
                </div>

                ${propertyNumber(
                    "X",
                    "position.x",
                    object.position.x
                )}

                ${propertyNumber(
                    "Y",
                    "position.y",
                    object.position.y
                )}

                ${propertyNumber(
                    "Z",
                    "position.z",
                    object.position.z
                )}

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Rotation
                </div>

                ${propertyNumber(
                    "X",
                    "rotation.x",
                    object.rotation.x
                )}

                ${propertyNumber(
                    "Y",
                    "rotation.y",
                    object.rotation.y
                )}

                ${propertyNumber(
                    "Z",
                    "rotation.z",
                    object.rotation.z
                )}

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Size
                </div>

                ${propertyNumber(
                    "X",
                    "size.x",
                    object.size.x
                )}

                ${propertyNumber(
                    "Y",
                    "size.y",
                    object.size.y
                )}

                ${propertyNumber(
                    "Z",
                    "size.z",
                    object.size.z
                )}

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Appearance
                </div>

                <label class="property-row">

                    <span>
                        Color
                    </span>

                    <input
                        type="color"
                        data-property="color"
                        value="${escapeHTML(
                            object.color
                        )}"
                    >

                </label>

                <label class="property-row">

                    <span>
                        Transparency
                    </span>

                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        data-property="transparency"
                        value="${object.transparency}"
                    >

                </label>

            </div>


            <div class="property-section">

                <div class="property-section-title">
                    Behavior
                </div>

                <label class="property-checkbox">

                    <input
                        type="checkbox"
                        data-property="anchored"
                        ${
                            object.anchored
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Anchored
                    </span>

                </label>


                <label class="property-checkbox">

                    <input
                        type="checkbox"
                        data-property="visible"
                        ${
                            object.visible
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Visible
                    </span>

                </label>

            </div>

        `;


        /*
         * Property listeners
         */

        container
            .querySelectorAll(
                "[data-property]"
            )
            .forEach(
                input => {

                    input.addEventListener(
                        "change",
                        () => {

                            const property =
                                input.dataset.property;

                            if (
                                input.type ===
                                "checkbox"
                            ) {

                                updateProperty(
                                    property,
                                    input.checked
                                );

                            } else {

                                updateProperty(
                                    property,
                                    input.value
                                );

                            }

                        }
                    );

                }
            );

    }


    /*
    ========================================================
     VIEWPORT
    ========================================================
    */

    function getViewport() {

        return findAny(

            "#viewport",
            "#gameViewport",
            "#studioViewport",
            ".studio-viewport",
            ".viewport",
            "[data-viewport]"

        );

    }


    function renderViewport() {

        const viewport =
            getViewport();

        if (!viewport) {

            return;

        }

        /*
         * Do not destroy custom Studio UI
         * that does not belong to our renderer.
         */

        let world =
            viewport.querySelector(
                ".webblox-world"
            );

        if (!world) {

            world =
                document.createElement(
                    "div"
                );

            world.className =
                "webblox-world";

            viewport.appendChild(
                world
            );

        }

        world.innerHTML = "";


        /*
         * Basic browser 3D-style representation.
         *
         * This is intentionally lightweight.
         * The real WebBlox renderer can later replace
         * this with WebGL / Three.js.
         */

        for (
            const object
            of state.objects
        ) {

            if (
                !object.visible
            ) {

                continue;

            }

            if (
                object.type !== "Part" &&
                object.type !== "SpawnLocation"
            ) {

                continue;

            }

            const part =
                document.createElement(
                    "div"
                );

            part.className =
                "webblox-part";

            if (
                object.id ===
                state.selectedId
            ) {

                part.classList.add(
                    "selected"
                );

            }

            /*
             * Simple perspective mapping.
             */

            const x =
                50 +
                object.position.x * 3;

            const y =
                50 -
                object.position.y * 3;

            const width =
                Math.max(
                    12,
                    object.size.x * 8
                );

            const height =
                Math.max(
                    8,
                    object.size.y * 8
                );

            part.style.left =
                `${x}%`;

            part.style.top =
                `${y}%`;

            part.style.width =
                `${width}px`;

            part.style.height =
                `${height}px`;

            part.style.background =
                object.color;

            part.style.opacity =
                String(
                    1 -
                    object.transparency
                );

            part.style.transform =
                `translate(-50%, -50%) rotate(${object.rotation.z}deg)`;

            part.dataset.objectId =
                object.id;

            part.title =
                object.name;

            part.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    selectObject(
                        object.id
                    );

                }
            );

            world.appendChild(
                part
            );

        }

    }


    /*
    ========================================================
     TOOLBAR
    ========================================================
    */

    function setTool(
        tool
    ) {

        const validTools = [

            "select",
            "move",
            "rotate",
            "scale"

        ];

        if (
            !validTools.includes(
                tool
            )
        ) {

            return;

        }

        state.tool =
            tool;

        $all(
            "[data-studio-tool]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.studioTool ===
                    tool
                );

            }
        );

        document.body.dataset.studioTool =
            tool;

    }


    function setupTools() {

        $all(
            "[data-studio-tool]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        setTool(
                            button.dataset.studioTool
                        );

                    }
                );

            }
        );

    }


    /*
    ========================================================
     INSERT MENU
    ========================================================
    */

    function setupInsertButtons() {

        $all(
            "[data-insert-object]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const type =
                            button.dataset.insertObject ||
                            "Part";

                        addObject(
                            type
                        );

                    }
                );

            }
        );

    }


    /*
    ========================================================
     BUTTON DISCOVERY
    ========================================================
    */

    function setupCommonButtons() {

        /*
         * Delete
         */

        $all(
            [
                "#deleteButton",
                "#deleteObject",
                "[data-studio-action='delete']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    deleteSelected
                );

            }
        );


        /*
         * Duplicate
         */

        $all(
            [
                "#duplicateButton",
                "#duplicateObject",
                "[data-studio-action='duplicate']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    duplicateSelected
                );

            }
        );


        /*
         * Add Part
         */

        $all(
            [
                "#addPartButton",
                "#insertPart",
                "[data-studio-action='add-part']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        addObject(
                            "Part"
                        );

                    }
                );

            }
        );


        /*
         * Play
         */

        $all(
            [
                "#playButton",
                "#studioPlay",
                "[data-studio-action='play']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    playGame
                );

            }
        );


        /*
         * Stop
         */

        $all(
            [
                "#stopButton",
                "#studioStop",
                "[data-studio-action='stop']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    stopGame
                );

            }
        );


        /*
         * Save
         */

        $all(
            [
                "#saveButton",
                "#studioSave",
                "[data-studio-action='save']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        saveProject();

                        notify(
                            "Project saved."
                        );

                    }
                );

            }
        );

    }


    /*
    ========================================================
     VIEWPORT CLICK
    ========================================================
    */

    function setupViewport() {

        const viewport =
            getViewport();

        if (!viewport) {

            return;

        }

        viewport.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    viewport ||
                    event.target.classList.contains(
                        "webblox-world"
                    )
                ) {

                    selectObject(
                        null
                    );

                }

            }
        );

    }


    /*
    ========================================================
     PROJECT SAVE
    ========================================================
    */

    function saveProject() {

        const project = {

            version:
                1,

            projectName:
                state.projectName,

            nextId:
                state.nextId,

            objects:
                state.objects

        };

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    project
                )
            );

        } catch (
            error
        ) {

            console.warn(
                "[WebBlox Studio] Could not save project:",
                error
            );

        }

        window.dispatchEvent(
            new CustomEvent(
                "webblox:studio-saved",
                {
                    detail:
                        project
                }
            )
        );

    }


    /*
    ========================================================
     PROJECT LOAD
    ========================================================
    */

    function loadProject() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {

                createDefaultProject();

                return;

            }

            const project =
                JSON.parse(
                    raw
                );

            state.projectName =
                project.projectName ||
                "Untitled WebBlox Game";

            state.nextId =
                Number(
                    project.nextId
                ) || 1;

            state.objects =
                Array.isArray(
                    project.objects
                )
                    ? project.objects
                    : [];

            state.selectedId =
                null;

            renderAll();

            console.log(
                "[WebBlox Studio] Project loaded."
            );

        } catch (
            error
        ) {

            console.warn(
                "[WebBlox Studio] Project load failed:",
                error
            );

            createDefaultProject();

        }

    }


    /*
    ========================================================
     DEFAULT PROJECT
    ========================================================
    */

    function createDefaultProject() {

        state.objects = [];

        state.nextId = 1;

        state.selectedId =
            null;

        /*
         * Base platform
         */

        const base =
            createObject(
                "Part",
                "Baseplate"
            );

        base.position.y =
            -2;

        base.size.x =
            40;

        base.size.y =
            1;

        base.size.z =
            40;

        base.color =
            "#555555";

        base.anchored =
            true;

        state.objects.push(
            base
        );


        /*
         * Spawn
         */

        const spawn =
            createObject(
                "SpawnLocation",
                "SpawnLocation"
            );

        spawn.position.y =
            0;

        spawn.size.x =
            4;

        spawn.size.y =
            1;

        spawn.size.z =
            4;

        spawn.color =
            "#00aa55";

        state.objects.push(
            spawn
        );


        /*
         * Example block
         */

        const part =
            createObject(
                "Part",
                "Part"
            );

        part.position.x =
            6;

        part.position.y =
            2;

        part.size.x =
            4;

        part.size.y =
            4;

        part.size.z =
            4;

        part.color =
            "#888888";

        state.objects.push(
            part
        );


        saveProject();

        renderAll();

    }


    /*
    ========================================================
     PLAY MODE
    ========================================================
    */

    function playGame() {

        if (
            state.playing
        ) {

            return;

        }

        state.playing =
            true;

        document.body.classList.add(
            "studio-playing"
        );

        updatePlayButtons();

        notify(
            "Play mode started."
        );

        window.dispatchEvent(
            new CustomEvent(
                "webblox:studio-play",
                {
                    detail: {
                        project:
                            getProject()
                    }
                }
            )
        );

    }


    /*
    ========================================================
     STOP MODE
    ========================================================
    */

    function stopGame() {

        if (
            !state.playing
        ) {

            return;

        }

        state.playing =
            false;

        document.body.classList.remove(
            "studio-playing"
        );

        updatePlayButtons();

        notify(
            "Play mode stopped."
        );

        window.dispatchEvent(
            new CustomEvent(
                "webblox:studio-stop"
            )
        );

    }


    function updatePlayButtons() {

        $all(
            [
                "#playButton",
                "#studioPlay",
                "[data-studio-action='play']"
            ].join(",")
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "playing",
                    state.playing
                );

                if (
                    state.playing
                ) {

                    button.textContent =
                        "▶ Playing";

                } else {

                    button.textContent =
                        "▶ Play";

                }

            }
        );

    }


    /*
    ========================================================
     NOTIFICATION
    ========================================================
    */

    function notify(
        message
    ) {

        let notification =
            document.querySelector(
                ".studio-notification"
            );

        if (!notification) {

            notification =
                document.createElement(
                    "div"
                );

            notification.className =
                "studio-notification";

            document.body.appendChild(
                notification
            );

        }

        notification.textContent =
            message;

        notification.classList.add(
            "visible"
        );

        clearTimeout(
            notification._timer
        );

        notification._timer =
            setTimeout(
                () => {

                    notification.classList.remove(
                        "visible"
                    );

                },
                2200
            );

    }


    /*
    ========================================================
     KEYBOARD SHORTCUTS
    ========================================================
    */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                const target =
                    event.target;

                const typing =
                    target instanceof
                        HTMLInputElement ||
                    target instanceof
                        HTMLTextAreaElement ||
                    target.isContentEditable;

                if (
                    typing
                ) {

                    /*
                     * Allow Ctrl+S while typing.
                     */

                    if (
                        !(
                            event.ctrlKey &&
                            event.key.toLowerCase() ===
                            "s"
                        )
                    ) {

                        return;

                    }

                }


                /*
                 * Delete
                 */

                if (
                    event.key ===
                    "Delete"
                ) {

                    deleteSelected();

                    return;

                }


                /*
                 * Duplicate
                 */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    "d"
                ) {

                    event.preventDefault();

                    duplicateSelected();

                    return;

                }


                /*
                 * Save
                 */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    "s"
                ) {

                    event.preventDefault();

                    saveProject();

                    notify(
                        "Project saved."
                    );

                    return;

                }


                /*
                 * Play
                 */

                if (
                    event.key ===
                    "F5"
                ) {

                    event.preventDefault();

                    if (
                        state.playing
                    ) {

                        stopGame();

                    } else {

                        playGame();

                    }

                    return;

                }


                /*
                 * Tools
                 */

                if (
                    event.key ===
                    "q"
                ) {

                    setTool(
                        "select"
                    );

                }

                if (
                    event.key ===
                    "w"
                ) {

                    setTool(
                        "move"
                    );

                }

                if (
                    event.key ===
                    "e"
                ) {

                    setTool(
                        "rotate"
                    );

                }

                if (
                    event.key ===
                    "r"
                ) {

                    setTool(
                        "scale"
                    );

                }

            }
        );

    }


    /*
    ========================================================
     PROJECT API
    ========================================================
    */

    function getProject() {

        return {

            version:
                1,

            projectName:
                state.projectName,

            objects:
                JSON.parse(
                    JSON.stringify(
                        state.objects
                    )
                )

        };

    }


    function setProject(
        project
    ) {

        if (
            !project ||
            typeof project !==
                "object"
        ) {

            return false;

        }

        state.projectName =
            project.projectName ||
            "Untitled WebBlox Game";

        state.objects =
            Array.isArray(
                project.objects
            )
                ? project.objects
                : [];

        /*
         * Recalculate ID counter.
         */

        let highest =
            0;

        for (
            const object
            of state.objects
        ) {

            const match =
                String(
                    object.id || ""
                )
                .match(
                    /(\d+)$/
                );

            if (match) {

                highest =
                    Math.max(
                        highest,
                        Number(
                            match[1]
                        )
                    );

            }

        }

        state.nextId =
            highest + 1;

        state.selectedId =
            null;

        renderAll();

        saveProject();

        return true;

    }


    /*
    ========================================================
     RENDER EVERYTHING
    ========================================================
    */

    function renderAll() {

        renderExplorer();

        renderProperties();

        renderViewport();

        updatePlayButtons();

    }


    /*
    ========================================================
     PUBLIC WEBBLOX STUDIO API
    ========================================================
    */

    window.WebBloxStudio = {

        state,

        addObject,

        createObject,

        deleteSelected,

        duplicateSelected,

        selectObject,

        getObject,

        renameSelected,

        updateProperty,

        setTool,

        playGame,

        stopGame,

        saveProject,

        loadProject,

        getProject,

        setProject,

        renderAll,

        renderExplorer,

        renderProperties,

        renderViewport,

        notify

    };


    /*
    ========================================================
     INITIALIZATION
    ========================================================
    */

    function init() {

        console.log(
            "===================================="
        );

        console.log(
            "[WebBlox Studio] Initializing..."
        );

        console.log(
            "[WebBlox Studio] Editor systems loading."
        );


        setupTools();

        setupInsertButtons();

        setupCommonButtons();

        setupViewport();

        setupKeyboard();


        /*
         * Load existing project.
         * If there isn't one, create a starter map.
         */

        loadProject();


        /*
         * If there was no saved project and
         * loadProject didn't create anything,
         * make sure something exists.
         */

        if (
            !state.objects.length
        ) {

            createDefaultProject();

        }


        renderAll();


        console.log(
            "[WebBlox Studio] Ready."
        );

        console.log(
            "===================================="
        );

    }


    /*
    ========================================================
     START
    ========================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
