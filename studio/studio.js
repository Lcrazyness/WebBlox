"use strict";

/*
============================================================
 WebBlox Studio
============================================================

 First Studio system:
 - Explorer
 - Properties
 - Scene / viewport
 - Part creation
 - Object selection
 - Object deletion
 - Object duplication
 - Rename objects
 - Position / rotation / size editing
 - Basic camera controls
 - Play / Stop
 - Save project locally
 - Load project locally
 - New project
 - WebBlox project structure

============================================================
*/

(() => {

    /*
    ============================================================
     CONFIG
    ============================================================
    */

    const API_BASE =
        "https://webblox-backend.onrender.com";


    /*
    ============================================================
     STATE
    ============================================================
    */

    const state = {

        project: {

            name:
                "Untitled WebBlox Game",

            version:
                "1.0",

            objects: []

        },

        selectedObjectId:
            null,

        playing:
            false,

        camera: {

            x: 0,

            y: 8,

            z: 18,

            zoom: 1

        },

        nextObjectId:
            1

    };


    /*
    ============================================================
     DOM HELPERS
    ============================================================
    */

    function $(selector) {

        return document.querySelector(
            selector
        );

    }


    function $all(selector) {

        return [
            ...document.querySelectorAll(
                selector
            )
        ];

    }


    /*
    ============================================================
     OBJECT IDS
    ============================================================
    */

    function createId() {

        const id =
            `object_${state.nextObjectId}`;

        state.nextObjectId++;

        return id;

    }


    /*
    ============================================================
     OBJECT CREATION
    ============================================================
    */

    function createPart(
        type = "Part"
    ) {

        const object = {

            id:
                createId(),

            name:
                type,

            type,

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
                "#808080",

            anchored:
                true,

            collidable:
                true,

            visible:
                true

        };


        state.project.objects.push(
            object
        );


        selectObject(
            object.id
        );


        renderScene();

        renderExplorer();


        return object;

    }


    /*
    ============================================================
     GET SELECTED OBJECT
    ============================================================
    */

    function getSelectedObject() {

        return state.project.objects.find(
            object =>
                object.id ===
                state.selectedObjectId
        ) || null;

    }


    /*
    ============================================================
     SELECT OBJECT
    ============================================================
    */

    function selectObject(id) {

        state.selectedObjectId =
            id;


        renderExplorer();

        renderProperties();

        highlightSceneObject();

    }


    /*
    ============================================================
     DELETE OBJECT
    ============================================================
    */

    function deleteSelectedObject() {

        if (
            !state.selectedObjectId
        ) {

            return;

        }


        const index =
            state.project.objects.findIndex(
                object =>
                    object.id ===
                    state.selectedObjectId
            );


        if (
            index === -1
        ) {

            return;

        }


        state.project.objects.splice(
            index,
            1
        );


        state.selectedObjectId =
            null;


        renderScene();

        renderExplorer();

        renderProperties();

    }


    /*
    ============================================================
     DUPLICATE OBJECT
    ============================================================
    */

    function duplicateSelectedObject() {

        const original =
            getSelectedObject();


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


        state.project.objects.push(
            copy
        );


        selectObject(
            copy.id
        );


        renderScene();

        renderExplorer();

    }


    /*
    ============================================================
     RENAME OBJECT
    ============================================================
    */

    function renameSelectedObject() {

        const object =
            getSelectedObject();


        if (!object) {

            return;

        }


        const name =
            prompt(
                "Rename object:",
                object.name
            );


        if (
            name === null
        ) {

            return;

        }


        const trimmed =
            name.trim();


        if (!trimmed) {

            return;

        }


        object.name =
            trimmed;


        renderExplorer();

        renderProperties();

    }


    /*
    ============================================================
     SCENE
    ============================================================
    */

    function findViewport() {

        return (
            $(
                "#studioViewport"
            ) ||
            $(
                "#viewport"
            ) ||
            $(
                ".studio-viewport"
            ) ||
            $(
                ".viewport"
            ) ||
            $(
                "[data-studio-viewport]"
            )
        );

    }


    function renderScene() {

        const viewport =
            findViewport();


        if (!viewport) {

            return;

        }


        let scene =
            viewport.querySelector(
                ".webblox-scene"
            );


        if (!scene) {

            scene =
                document.createElement(
                    "div"
                );

            scene.className =
                "webblox-scene";


            viewport.appendChild(
                scene
            );

        }


        scene.innerHTML =
            "";


        for (
            const object
            of state.project.objects
        ) {

            if (
                object.visible === false
            ) {

                continue;

            }


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "studio-part";


            element.dataset.objectId =
                object.id;


            const x =
                object.position.x *
                20;


            const y =
                object.position.y *
                -20;


            const width =
                Math.max(
                    20,
                    object.size.x *
                    20
                );


            const height =
                Math.max(
                    20,
                    object.size.y *
                    20
                );


            element.style.position =
                "absolute";


            element.style.left =
                `calc(50% + ${x}px)`;


            element.style.top =
                `calc(50% + ${y}px)`;


            element.style.width =
                `${width}px`;


            element.style.height =
                `${height}px`;


            element.style.background =
                object.color;


            element.style.transform =
                `translate(-50%, -50%) rotate(${object.rotation.z}deg)`;


            element.style.border =
                "1px solid rgba(255,255,255,.25)";


            element.style.boxSizing =
                "border-box";


            element.title =
                object.name;


            if (
                object.id ===
                state.selectedObjectId
            ) {

                element.classList.add(
                    "selected"
                );

            }


            element.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    selectObject(
                        object.id
                    );

                }
            );


            scene.appendChild(
                element
            );

        }

    }


    /*
    ============================================================
     SCENE HIGHLIGHT
    ============================================================
    */

    function highlightSceneObject() {

        $all(
            ".studio-part"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "selected",
                    element.dataset.objectId ===
                    state.selectedObjectId
                );

            }
        );

    }


    /*
    ============================================================
     EXPLORER
    ============================================================
    */

    function findExplorer() {

        return (
            $(
                "#explorer"
            ) ||
            $(
                "#explorerPanel"
            ) ||
            $(
                ".explorer"
            ) ||
            $(
                ".explorer-panel"
            ) ||
            $(
                "[data-studio-explorer]"
            )
        );

    }


    function renderExplorer() {

        const explorer =
            findExplorer();


        if (!explorer) {

            return;

        }


        explorer.innerHTML =
            "";


        const title =
            document.createElement(
                "div"
            );


        title.className =
            "explorer-title";


        title.textContent =
            "Workspace";


        explorer.appendChild(
            title
        );


        /*
         * Camera
         */

        const camera =
            document.createElement(
                "div"
            );


        camera.className =
            "explorer-item";


        camera.textContent =
            "📷 Camera";


        explorer.appendChild(
            camera
        );


        /*
         * Objects
         */

        for (
            const object
            of state.project.objects
        ) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "explorer-item";


            row.dataset.objectId =
                object.id;


            if (
                object.id ===
                state.selectedObjectId
            ) {

                row.classList.add(
                    "selected"
                );

            }


            row.innerHTML = `
                <span class="explorer-icon">▰</span>
                <span class="explorer-name">
                    ${escapeHTML(object.name)}
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


            explorer.appendChild(
                row
            );

        }

    }


    /*
    ============================================================
     PROPERTIES
    ============================================================
    */

    function findProperties() {

        return (
            $(
                "#properties"
            ) ||
            $(
                "#propertiesPanel"
            ) ||
            $(
                ".properties"
            ) ||
            $(
                ".properties-panel"
            ) ||
            $(
                "[data-studio-properties]"
            )
        );

    }


    function renderProperties() {

        const properties =
            findProperties();


        if (!properties) {

            return;

        }


        properties.innerHTML =
            "";


        const object =
            getSelectedObject();


        if (!object) {

            properties.innerHTML = `
                <div class="properties-empty">
                    Select an object to view
                    its properties.
                </div>
            `;

            return;

        }


        properties.innerHTML = `
            <div class="properties-title">
                Properties
            </div>

            <div class="property-section">

                <div class="property-section-title">
                    ${escapeHTML(object.name)}
                </div>

                <label>
                    Name

                    <input
                        data-property="name"
                        value="${escapeHTML(object.name)}"
                    >
                </label>

                <label>
                    Type

                    <input
                        value="${escapeHTML(object.type)}"
                        disabled
                    >
                </label>

            </div>

            <div class="property-section">

                <div class="property-section-title">
                    Transform
                </div>

                <div class="property-group-title">
                    Position
                </div>

                ${numberInput("x", object.position.x, "position")}
                ${numberInput("y", object.position.y, "position")}
                ${numberInput("z", object.position.z, "position")}

                <div class="property-group-title">
                    Rotation
                </div>

                ${numberInput("x", object.rotation.x, "rotation")}
                ${numberInput("y", object.rotation.y, "rotation")}
                ${numberInput("z", object.rotation.z, "rotation")}

                <div class="property-group-title">
                    Size
                </div>

                ${numberInput("x", object.size.x, "size")}
                ${numberInput("y", object.size.y, "size")}
                ${numberInput("z", object.size.z, "size")}

            </div>

            <div class="property-section">

                <div class="property-section-title">
                    Appearance
                </div>

                <label>
                    Color

                    <input
                        type="color"
                        data-property="color"
                        value="${escapeHTML(object.color)}"
                    >
                </label>

            </div>

            <div class="property-section">

                <div class="property-section-title">
                    Physics
                </div>

                <label class="checkbox-property">

                    <input
                        type="checkbox"
                        data-property="anchored"
                        ${object.anchored ? "checked" : ""}
                    >

                    Anchored

                </label>

                <label class="checkbox-property">

                    <input
                        type="checkbox"
                        data-property="collidable"
                        ${object.collidable ? "checked" : ""}
                    >

                    Can Collide

                </label>

            </div>
        `;


        bindPropertyInputs();

    }


    function numberInput(
        axis,
        value,
        group
    ) {

        return `
            <label>

                ${group} ${axis.toUpperCase()}

                <input
                    type="number"
                    step="0.1"
                    data-property-group="${group}"
                    data-axis="${axis}"
                    value="${Number(value) || 0}"
                >

            </label>
        `;

    }


    /*
    ============================================================
     PROPERTY INPUTS
    ============================================================
    */

    function bindPropertyInputs() {

        const object =
            getSelectedObject();


        if (!object) {

            return;

        }


        $all(
            "[data-property]"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    () => {

                        const property =
                            input.dataset.property;


                        if (
                            property ===
                            "name"
                        ) {

                            object.name =
                                input.value ||
                                "Part";

                        }


                        if (
                            property ===
                            "color"
                        ) {

                            object.color =
                                input.value;

                        }


                        if (
                            property ===
                            "anchored"
                        ) {

                            object.anchored =
                                input.checked;

                        }


                        if (
                            property ===
                            "collidable"
                        ) {

                            object.collidable =
                                input.checked;

                        }


                        renderExplorer();

                        renderScene();

                    }
                );

            }
        );


        $all(
            "[data-property-group]"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    () => {

                        const group =
                            input.dataset.propertyGroup;


                        const axis =
                            input.dataset.axis;


                        object[group][axis] =
                            Number(
                                input.value
                            ) || 0;


                        renderScene();

                    }
                );

            }
        );

    }


    /*
    ============================================================
     BUTTON SYSTEM
    ============================================================
    */

    function setupButtons() {

        /*
         * Add Part
         */

        $all(
            [
                "#addPart",
                "#insertPart",
                "[data-action='add-part']",
                "[data-studio-add='part']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        createPart(
                            "Part"
                        );

                    }
                );

            }
        );


        /*
         * Add Spawn
         */

        $all(
            [
                "#addSpawn",
                "[data-action='add-spawn']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const spawn =
                            createPart(
                                "SpawnLocation"
                            );


                        spawn.color =
                            "#4CAF50";


                        spawn.size = {

                            x: 6,

                            y: 1,

                            z: 6

                        };


                        renderScene();

                        renderProperties();

                    }
                );

            }
        );


        /*
         * Delete
         */

        $all(
            [
                "#deleteObject",
                "#deleteButton",
                "[data-action='delete']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    deleteSelectedObject
                );

            }
        );


        /*
         * Duplicate
         */

        $all(
            [
                "#duplicateObject",
                "#duplicateButton",
                "[data-action='duplicate']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    duplicateSelectedObject
                );

            }
        );


        /*
         * Rename
         */

        $all(
            [
                "#renameObject",
                "#renameButton",
                "[data-action='rename']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    renameSelectedObject
                );

            }
        );


        /*
         * Play
         */

        $all(
            [
                "#playButton",
                "#playGame",
                "[data-action='play']"
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
                "#stopGame",
                "[data-action='stop']"
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
         * New project
         */

        $all(
            [
                "#newProject",
                "[data-action='new-project']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    newProject
                );

            }
        );


        /*
         * Save
         */

        $all(
            [
                "#saveProject",
                "#saveButton",
                "[data-action='save']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    saveProject
                );

            }
        );


        /*
         * Load
         */

        $all(
            [
                "#loadProject",
                "#loadButton",
                "[data-action='load']"
            ].join(",")
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    loadProject
                );

            }
        );

    }


    /*
    ============================================================
     PLAY MODE
    ============================================================
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


        console.log(
            "[WebBlox Studio] Play mode started."
        );


        updatePlayButtons();

    }


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


        console.log(
            "[WebBlox Studio] Play mode stopped."
        );


        updatePlayButtons();

    }


    function updatePlayButtons() {

        $all(
            [
                "#playButton",
                "#playGame"
            ].join(",")
        )
        .forEach(
            button => {

                button.disabled =
                    state.playing;

            }
        );


        $all(
            [
                "#stopButton",
                "#stopGame"
            ].join(",")
        )
        .forEach(
            button => {

                button.disabled =
                    !state.playing;

            }
        );

    }


    /*
    ============================================================
     PROJECT SYSTEM
    ============================================================
    */

    function newProject() {

        const confirmed =
            confirm(
                "Create a new WebBlox project? Unsaved changes will be lost."
            );


        if (!confirmed) {

            return;

        }


        state.project = {

            name:
                "Untitled WebBlox Game",

            version:
                "1.0",

            objects: []

        };


        state.selectedObjectId =
            null;


        state.nextObjectId =
            1;


        stopGame();


        renderAll();

    }


    function saveProject() {

        const project =
            JSON.stringify(
                state.project,
                null,
                2
            );


        localStorage.setItem(
            "webblox-studio-project",
            project
        );


        /*
         * Also download a project file.
         */

        const blob =
            new Blob(
                [project],
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
            `${safeFilename(
                state.project.name
            )}.webblox.json`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        console.log(
            "[WebBlox Studio] Project saved."
        );

    }


    function loadProject() {

        const stored =
            localStorage.getItem(
                "webblox-studio-project"
            );


        if (!stored) {

            alert(
                "No WebBlox Studio project has been saved yet."
            );

            return;

        }


        try {

            const project =
                JSON.parse(
                    stored
                );


            if (
                !project ||
                !Array.isArray(
                    project.objects
                )
            ) {

                throw new Error(
                    "Invalid project."
                );

            }


            state.project =
                project;


            state.selectedObjectId =
                null;


            state.nextObjectId =
                state.project.objects.length +
                1;


            renderAll();


            console.log(
                "[WebBlox Studio] Project loaded."
            );

        } catch (
            error
        ) {

            console.error(
                error
            );


            alert(
                "The saved WebBlox project could not be loaded."
            );

        }

    }


    /*
    ============================================================
     EXPORT PROJECT
    ============================================================
    */

    function exportProject() {

        return JSON.parse(
            JSON.stringify(
                state.project
            )
        );

    }


    /*
    ============================================================
     IMPORT PROJECT
    ============================================================
    */

    function importProject(project) {

        if (
            !project ||
            !Array.isArray(
                project.objects
            )
        ) {

            throw new Error(
                "Invalid WebBlox project."
            );

        }


        state.project =
            JSON.parse(
                JSON.stringify(
                    project
                )
            );


        state.selectedObjectId =
            null;


        state.nextObjectId =
            state.project.objects.length +
            1;


        renderAll();

    }


    /*
    ============================================================
     KEYBOARD SHORTCUTS
    ============================================================
    */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                /*
                 * Do not intercept typing.
                 */

                const tag =
                    event.target?.tagName;


                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT"
                ) {

                    return;

                }


                /*
                 * Delete
                 */

                if (
                    event.key ===
                    "Delete"
                ) {

                    deleteSelectedObject();

                }


                /*
                 * Ctrl + D
                 */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    "d"
                ) {

                    event.preventDefault();

                    duplicateSelectedObject();

                }


                /*
                 * Ctrl + S
                 */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    "s"
                ) {

                    event.preventDefault();

                    saveProject();

                }


                /*
                 * F2
                 */

                if (
                    event.key ===
                    "F2"
                ) {

                    event.preventDefault();

                    renameSelectedObject();

                }

            }
        );

    }


    /*
    ============================================================
     VIEWPORT CLICK
    ============================================================
    */

    function setupViewport() {

        const viewport =
            findViewport();


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
                        "webblox-scene"
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
    ============================================================
     CAMERA CONTROLS
    ============================================================
    */

    function setupCameraControls() {

        const viewport =
            findViewport();


        if (!viewport) {

            return;

        }


        viewport.addEventListener(
            "wheel",
            event => {

                event.preventDefault();


                state.camera.zoom +=
                    event.deltaY > 0
                        ? -0.1
                        : 0.1;


                state.camera.zoom =
                    Math.max(
                        0.25,
                        Math.min(
                            3,
                            state.camera.zoom
                        )
                    );


                const scene =
                    viewport.querySelector(
                        ".webblox-scene"
                    );


                if (scene) {

                    scene.style.transform =
                        `scale(${state.camera.zoom})`;

                }

            },
            {
                passive: false
            }
        );

    }


    /*
    ============================================================
     RENDER ALL
    ============================================================
    */

    function renderAll() {

        renderScene();

        renderExplorer();

        renderProperties();

        updatePlayButtons();

    }


    /*
    ============================================================
     HTML ESCAPING
    ============================================================
    */

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


    /*
    ============================================================
     SAFE FILENAME
    ============================================================
    */

    function safeFilename(name) {

        return String(
            name || "webblox-game"
        )
        .replace(
            /[^a-z0-9-_ ]/gi,
            ""
        )
        .trim()
        .replace(
            /\s+/g,
            "-"
        )
        .toLowerCase() ||
        "webblox-game";

    }


    /*
    ============================================================
     PUBLIC API
    ============================================================
    */

    window.WebBloxStudio = {

        state,

        createPart,

        selectObject,

        deleteSelectedObject,

        duplicateSelectedObject,

        renameSelectedObject,

        playGame,

        stopGame,

        saveProject,

        loadProject,

        exportProject,

        importProject,

        renderAll

    };


    /*
    ============================================================
     INITIALIZATION
    ============================================================
    */

    function init() {

        console.log(
            "===================================="
        );

        console.log(
            "[WebBlox Studio] Starting..."
        );


        setupButtons();

        setupKeyboard();

        setupViewport();

        setupCameraControls();

        renderAll();


        /*
         * Give every new Studio project
         * a basic baseplate.
         */

        if (
            state.project.objects.length ===
            0
        ) {

            const baseplate =
                createPart(
                    "Baseplate"
                );


            baseplate.position = {

                x: 0,

                y: -1,

                z: 0

            };


            baseplate.size = {

                x: 32,

                y: 1,

                z: 32

            };


            baseplate.color =
                "#5f6368";


            state.selectedObjectId =
                null;


            renderAll();

        }


        console.log(
            "[WebBlox Studio] Ready."
        );

    }


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
