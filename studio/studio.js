"use strict";

/* ============================================================
   WebBlox Studio
   Player <-> Studio bridge
   ============================================================ */

const PROJECT_KEY =
    "webblox_studio_project";


/* ============================================================
   DOM
   ============================================================ */

const viewport =
    document.getElementById(
        "viewport"
    );

const world =
    document.getElementById(
        "world"
    );

const explorer =
    document.getElementById(
        "explorer"
    );

const properties =
    document.getElementById(
        "properties"
    );

const output =
    document.getElementById(
        "output"
    );

const spawnPoint =
    document.getElementById(
        "spawnPoint"
    );


/* ============================================================
   BUTTONS
   ============================================================ */

const backToPlayer =
    document.getElementById(
        "backToPlayer"
    );

const newProjectButton =
    document.getElementById(
        "newProjectButton"
    );

const saveProjectButton =
    document.getElementById(
        "saveProjectButton"
    );

const playProjectButton =
    document.getElementById(
        "playProjectButton"
    );

const insertPartButton =
    document.getElementById(
        "insertPartButton"
    );

const insertSpawnButton =
    document.getElementById(
        "insertSpawnButton"
    );

const gridButton =
    document.getElementById(
        "gridButton"
    );

const topViewButton =
    document.getElementById(
        "topViewButton"
    );

const resetCameraButton =
    document.getElementById(
        "resetCameraButton"
    );


/* ============================================================
   STATE
   ============================================================ */

let project = {

    name:
        "My WebBlox Game",

    description:
        "Your WebBlox game",

    parts: []

};


let selectedObject =
    null;

let objectCounter =
    0;


/* ============================================================
   STORAGE
   ============================================================ */

function saveProject() {

    try {

        localStorage.setItem(
            PROJECT_KEY,
            JSON.stringify(
                project
            )
        );

        log(
            "Project saved."
        );

    } catch (error) {

        log(
            "Could not save project."
        );

        console.error(
            error
        );

    }

}


function loadProject() {

    try {

        const saved =
            localStorage.getItem(
                PROJECT_KEY
            );

        if (!saved) {

            saveProject();

            return;

        }

        const parsed =
            JSON.parse(
                saved
            );

        if (
            parsed &&
            typeof parsed === "object"
        ) {

            project = {

                name:
                    parsed.name ||
                    "My WebBlox Game",

                description:
                    parsed.description ||
                    "Your WebBlox game",

                parts:
                    Array.isArray(
                        parsed.parts
                    )
                        ? parsed.parts
                        : []

            };

        }

    } catch (error) {

        console.error(
            error
        );

        project = {

            name:
                "My WebBlox Game",

            description:
                "Your WebBlox game",

            parts: []

        };

    }

}


/* ============================================================
   OUTPUT
   ============================================================ */

function log(message) {

    const line =
        document.createElement(
            "div"
        );

    line.textContent =
        "[WebBlox] " +
        message;

    output.appendChild(
        line
    );

    output.scrollTop =
        output.scrollHeight;

}


/* ============================================================
   PARTS
   ============================================================ */

function createPartData(
    name = "Part"
) {

    objectCounter++;

    return {

        id:
            "part_" +
            Date.now() +
            "_" +
            objectCounter,

        name:
            name,

        type:
            "Part",

        x:
            0,

        y:
            0,

        z:
            0,

        sizeX:
            4,

        sizeY:
            1,

        sizeZ:
            4

    };

}


function addPart() {

    const part =
        createPartData(
            "Part"
        );

    project.parts.push(
        part
    );

    createPartElement(
        part
    );

    renderExplorer();

    selectObject(
        part
    );

    saveProject();

    log(
        "Inserted Part."
    );

}


function addSpawn() {

    const existing =
        project.parts.find(
            part =>
                part.type === "Spawn"
        );

    if (existing) {

        selectObject(
            existing
        );

        log(
            "A Spawn already exists."
        );

        return;

    }

    const spawn =
        createPartData(
            "Spawn"
        );

    spawn.type =
        "Spawn";

    spawn.sizeX =
        6;

    spawn.sizeY =
        1;

    spawn.sizeZ =
        6;

    project.parts.unshift(
        spawn
    );

    createPartElement(
        spawn
    );

    renderExplorer();

    selectObject(
        spawn
    );

    saveProject();

    log(
        "Inserted Spawn."
    );

}


/* ============================================================
   VIEWPORT
   ============================================================ */

function createPartElement(part) {

    const existing =
        document.querySelector(
            '[data-object-id="' +
            part.id +
            '"]'
        );

    if (existing) {

        existing.remove();

    }

    const element =
        document.createElement(
            "div"
        );

    element.className =
        "viewport-part";

    element.dataset.objectId =
        part.id;

    element.title =
        part.name;

    if (
        part.type === "Spawn"
    ) {

        element.classList.add(
            "spawn-object"
        );

    }

    element.style.setProperty(
        "--part-x",
        part.x
    );

    element.style.setProperty(
        "--part-y",
        part.y
    );

    element.style.setProperty(
        "--part-z",
        part.z
    );

    element.style.width =
        Math.max(
            35,
            part.sizeX * 22
        ) +
        "px";

    element.style.height =
        Math.max(
            20,
            part.sizeY * 22
        ) +
        "px";

    element.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            selectObject(
                part
            );

        }
    );

    world.appendChild(
        element
    );

}


function rebuildViewport() {

    document
        .querySelectorAll(
            ".viewport-part"
        )
        .forEach(
            element =>
                element.remove()
        );

    project.parts.forEach(
        part => {

            createPartElement(
                part
            );

        }
    );

}


/* ============================================================
   EXPLORER
   ============================================================ */

function renderExplorer() {

    explorer.innerHTML =
        "";

    const gameItem =
        document.createElement(
            "div"
        );

    gameItem.className =
        "explorer-item explorer-game";

    gameItem.innerHTML =
        "▾ <strong>" +
        escapeHTML(
            project.name
        ) +
        "</strong>";

    explorer.appendChild(
        gameItem
    );


    const workspace =
        document.createElement(
            "div"
        );

    workspace.className =
        "explorer-item explorer-folder";

    workspace.textContent =
        "▾ Workspace";

    explorer.appendChild(
        workspace
    );


    project.parts.forEach(
        part => {

            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";

            item.className =
                "explorer-object";

            item.textContent =
                (
                    part.type === "Spawn"
                        ? "◆ "
                        : "■ "
                ) +
                part.name;

            item.addEventListener(
                "click",
                function() {

                    selectObject(
                        part
                    );

                }
            );

            explorer.appendChild(
                item
            );

        }
    );

}


/* ============================================================
   PROPERTIES
   ============================================================ */

function selectObject(object) {

    selectedObject =
        object;

    renderProperties();

    document
        .querySelectorAll(
            ".viewport-part"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "selected",
                    element.dataset.objectId ===
                    object.id
                );

            }
        );

}


function renderProperties() {

    if (!selectedObject) {

        properties.innerHTML = `
            <div class="nothing-selected">
                <strong>Nothing selected</strong>
                <span>Select an object</span>
            </div>
        `;

        return;

    }

    const object =
        selectedObject;

    properties.innerHTML = `
        <div class="property-group">

            <label>Name</label>

            <input
                id="propertyName"
                type="text"
                value="${escapeHTML(object.name)}"
            >

        </div>

        <div class="property-group">

            <label>Type</label>

            <input
                type="text"
                value="${escapeHTML(object.type)}"
                disabled
            >

        </div>

        <div class="property-group">

            <label>Position</label>

            <div class="property-row">

                <input
                    id="propertyX"
                    type="number"
                    value="${object.x}"
                >

                <input
                    id="propertyY"
                    type="number"
                    value="${object.y}"
                >

                <input
                    id="propertyZ"
                    type="number"
                    value="${object.z}"
                >

            </div>

        </div>

        <div class="property-group">

            <label>Size</label>

            <div class="property-row">

                <input
                    id="propertySizeX"
                    type="number"
                    value="${object.sizeX}"
                >

                <input
                    id="propertySizeY"
                    type="number"
                    value="${object.sizeY}"
                >

                <input
                    id="propertySizeZ"
                    type="number"
                    value="${object.sizeZ}"
                >

            </div>

        </div>

        <button
            id="deleteObjectButton"
            class="delete-object"
            type="button"
        >
            Delete
        </button>
    `;


    document
        .getElementById(
            "propertyName"
        )
        .addEventListener(
            "input",
            function(event) {

                object.name =
                    event.target.value ||
                    "Part";

                renderExplorer();

                saveProject();

            }
        );


    [
        [
            "propertyX",
            "x"
        ],
        [
            "propertyY",
            "y"
        ],
        [
            "propertyZ",
            "z"
        ],
        [
            "propertySizeX",
            "sizeX"
        ],
        [
            "propertySizeY",
            "sizeY"
        ],
        [
            "propertySizeZ",
            "sizeZ"
        ]
    ].forEach(
        pair => {

            const input =
                document.getElementById(
                    pair[0]
                );

            input.addEventListener(
                "input",
                function(event) {

                    object[
                        pair[1]
                    ] =
                        Number(
                            event.target.value
                        ) || 0;

                    rebuildViewport();

                    saveProject();

                }
            );

        }
    );


    document
        .getElementById(
            "deleteObjectButton"
        )
        .addEventListener(
            "click",
            function() {

                deleteSelectedObject();

            }
        );

}


function deleteSelectedObject() {

    if (!selectedObject) {
        return;
    }

    const id =
        selectedObject.id;

    project.parts =
        project.parts.filter(
            part =>
                part.id !== id
        );

    selectedObject =
        null;

    rebuildViewport();

    renderExplorer();

    renderProperties();

    saveProject();

    log(
        "Object deleted."
    );

}


/* ============================================================
   NEW PROJECT
   ============================================================ */

function newProject() {

    const confirmed =
        window.confirm(
            "Create a new WebBlox project?"
        );

    if (!confirmed) {
        return;
    }

    project = {

        name:
            "My WebBlox Game",

        description:
            "Your WebBlox game",

        parts: []

    };

    selectedObject =
        null;

    rebuildViewport();

    renderExplorer();

    renderProperties();

    saveProject();

    log(
        "New project created."
    );

}


/* ============================================================
   PLAY
   ============================================================ */

function playProject() {

    saveProject();

    /*
       ../ means:

       /WebBlox/studio/
       ->
       /WebBlox/
    */

    const playerURL =
        new URL(
            "../",
            window.location.href
        );

    playerURL.searchParams.set(
        "play",
        "1"
    );

    window.location.href =
        playerURL.href;

}


/* ============================================================
   CAMERA
   ============================================================ */

function resetCamera() {

    viewport.style.setProperty(
        "--camera-x",
        "0deg"
    );

    viewport.style.setProperty(
        "--camera-y",
        "0deg"
    );

    viewport.style.setProperty(
        "--camera-z",
        "0deg"
    );

    viewport.style.setProperty(
        "--camera-scale",
        "1"
    );

    log(
        "Camera reset."
    );

}


function topView() {

    viewport.classList.toggle(
        "top-view"
    );

    log(
        "Top view toggled."
    );

}


function toggleGrid() {

    viewport.classList.toggle(
        "grid-hidden"
    );

}


/* ============================================================
   BACK TO PLAYER
   ============================================================ */

function goToPlayer() {

    window.location.href =
        new URL(
            "../",
            window.location.href
        ).href;

}


/* ============================================================
   ESCAPE
   ============================================================ */

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ============================================================
   EVENTS
   ============================================================ */

backToPlayer.addEventListener(
    "click",
    goToPlayer
);

newProjectButton.addEventListener(
    "click",
    newProject
);

saveProjectButton.addEventListener(
    "click",
    saveProject
);

playProjectButton.addEventListener(
    "click",
    playProject
);

insertPartButton.addEventListener(
    "click",
    addPart
);

insertSpawnButton.addEventListener(
    "click",
    addSpawn
);

gridButton.addEventListener(
    "click",
    toggleGrid
);

topViewButton.addEventListener(
    "click",
    topView
);

resetCameraButton.addEventListener(
    "click",
    resetCamera
);


/* ============================================================
   VIEWPORT CLICK
   ============================================================ */

viewport.addEventListener(
    "click",
    function() {

        selectedObject =
            null;

        renderProperties();

        document
            .querySelectorAll(
                ".viewport-part"
            )
            .forEach(
                element =>
                    element.classList.remove(
                        "selected"
                    )
            );

    }
);


/* ============================================================
   START
   ============================================================ */

loadProject();

rebuildViewport();

renderExplorer();

renderProperties();

log(
    "WebBlox Studio initialized."
);

log(
    "Player connection ready."
);
